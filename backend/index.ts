import { PullRequest, PullResponse, PushRequest } from "replicache";
import { ulid } from "../src/ulid";
import { Mutations } from "./mutations";

export default {
  fetch: handleRequest,
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
  "Access-Control-Max-Age": "86400",
};

async function handleRequest(request: Request, env: Bindings) {
  let id = env.COUNTER.idFromName("A");
  let obj = env.COUNTER.get(id);
  if (request.method === "OPTIONS") return handleOptions(request);
  let resp = await obj.fetch(request);
  return resp;
}

function handleOptions(request: Request) {
  // Make sure the necessary headers are present
  // for this to be a valid pre-flight request
  let headers = request.headers;
  if (
    headers.get("Origin") !== null &&
    headers.get("Access-Control-Request-Method") !== null &&
    headers.get("Access-Control-Request-Headers") !== null
  ) {
    let respHeaders = {
      ...corsHeaders,
      "Access-Control-Allow-Headers":
        request.headers.get("Access-Control-Request-Headers") || "",
    };

    return new Response(null, {
      headers: respHeaders,
    });
  } else {
    // Handle standard OPTIONS request.
    // If you want to allow other HTTP Methods, you can do that here.
    return new Response(null, {
      headers: {
        Allow: "GET, HEAD, POST, OPTIONS",
      },
    });
  }
}

type Cookie = {
  lastUpdated: string;
};

export type Fact = {
  id: string;
  lastUpdated: string;
  entity: string;
  attribute: string;
  value: string;
};

type FactInput = Omit<Fact, "lastUpdated" | "id">;

export type MyPullResponse = Omit<PullResponse, "patch"> & {
  cookie?: Cookie;
  data: Fact[];
};

// Durable Object
export class Counter implements DurableObject {
  version = 3;
  constructor(private readonly state: DurableObjectState) {
    this.state.blockConcurrencyWhile(async () => {
      let lastVersion = (await this.state.storage.get("meta-lastVersion")) || 0;
      if (lastVersion < this.version) {
        await this.state.storage.deleteAll();
        await this.state.storage.put("meta-lastVersion", this.version);
      }
    });
  }

  // Handle HTTP requests from clients.
  async fetch(request: Request) {
    // Apply requested action.
    let url = new URL(request.url);
    switch (url.pathname) {
      case "/pull":
        return this.pull(request);
      case "/push":
        return this.push(request);
      case "/poke":
        console.log("poke websocket connecting");
        return this.pokeEndpoint(request);
      default:
        return new Response("Not found", {
          status: 404,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
            "content-type": "application/json;charset=UTF-8",
          },
        });
    }
  }

  async pull(request: Request) {
    let data: PullRequest = await request.json();
    let cookie = data.cookie as Cookie | null;
    let lastMutationID =
      (await this.state.storage.get<number>(
        `lastMutationID-${data.clientID}`
      )) || 0;

    let map = await this.state.storage.list<Fact>({
      start: `tea-${cookie?.lastUpdated || ""}`,
    });
    let updates = [...map.values()].slice(-1);

    let lastKey = updates[updates.length - 1];
    let newCookie: Cookie | undefined = !lastKey
      ? undefined
      : { lastUpdated: lastKey.lastUpdated };
    let response: MyPullResponse = {
      cookie: newCookie,
      lastMutationID,
      data: updates,
    };
    return new Response(JSON.stringify(response), {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "content-type": "application/json;charset=UTF-8",
      },
    });
  }

  async assertFact(fact: FactInput) {
    let lastUpdated = Date.now().toString();
    let existingValue = await this.state.storage.get<Fact & { time: string }>(
      `ea-${fact.entity}-${fact.attribute}`
    );
    let newData: Fact = {
      ...fact,
      // If we don't have an existing value generate a new unique id for this
      // fact. When we have cardinality many attributes this will need to be
      // handled differently
      id: existingValue?.id || ulid(),
      lastUpdated,
    };
    this.state.storage.put(
      `ea-${newData.entity}-${newData.attribute}`,
      newData
    );
    this.state.storage.put(`ti-${lastUpdated}-${newData.id}`, newData);
    if (existingValue) {
      // We don't technically need to delete this but might as well!
      this.state.storage.delete(
        `tea-${existingValue.time}-${existingValue.id}`
      );
    }
  }

  async push(request: Request) {
    let data: PushRequest = await request.json();
    let lastMutationID =
      (await this.state.storage.get<number>(
        `lastMutationID-${data.clientID}`
      )) || 0;
    for (let i = 0; i < data.mutations.length; i++) {
      let m = data.mutations[i];
      if (m.id !== lastMutationID + 1) continue;

      let name = m.name as keyof typeof Mutations;

      if (!Mutations[name]) {
        console.log(`Unknown mutation: ${name}`);
        return new Response(`Unknown mutation: ${name}`, { status: 400 });
      }

      try {
        await Mutations[name](this.assertFact.bind(this), m.args as any);
        this.state.storage.put<number>(`lastMutationID-${data.clientID}`, m.id);
        lastMutationID = m.id;
      } catch (e) {
        console.log(
          `Error occured while running mutation: ${name}`,
          JSON.stringify(e)
        );
        return new Response(`Error occured while running mutation: ${name}`, {
          status: 400,
        });
      }
    }

    this.sendPoke();
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "content-type": "application/json;charset=UTF-8",
      },
    });
  }

  // Poke Stuff

  sockets: Array<{ socket: WebSocket; id: number }> = [];
  nextID: number = 0;

  throttled: boolean = false;
  async pokeEndpoint(request: Request) {
    const upgradeHeader = request.headers.get("Upgrade");
    if (!upgradeHeader || upgradeHeader !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    let id = this.nextID;
    const webSocketPair = new WebSocketPair();
    const client = webSocketPair[0],
      server = webSocketPair[1];

    //@ts-ignore
    server.accept();
    server.addEventListener("close", () => {
      server.close();
      this.sockets = this.sockets.filter((s) => s.id !== id);
    });

    this.sockets.push({
      id,
      socket: server,
    });

    this.nextID = this.nextID + 1;

    return new Response(null, {
      status: 101,
      //@ts-ignore
      webSocket: client,
    });
  }

  async sendPoke() {
    if (this.throttled) {
      return;
    }

    this.throttled = true;
    setTimeout(() => {
      this.sockets.forEach((socket) => {
        socket.socket.send(JSON.stringify({ type: "poke" }));
      });
      this.throttled = false;
    }, 50);
  }
}
