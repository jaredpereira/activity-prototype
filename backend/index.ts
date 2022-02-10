import { PullRequest, PullResponse, PushRequest } from "replicache";

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
  time: string;
};

export type Fact = {
  entity: string;
  attribute: string;
  value: string;
};

export type MyPullResponse = Omit<PullResponse, "patch"> & {
  data: [string, Fact][];
};

// Durable Object
export class Counter implements DurableObject {
  version = 1;
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
      start: `tea-${cookie?.time || ""}`,
    });
    let updates = [...map];

    let lastKey = updates[updates.length - 1]?.[0];
    let newCookie = !lastKey
      ? undefined
      : { time: lastKey.slice(4, 4 + lastKey.slice(4).indexOf("-")) };
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

  async push(request: Request) {
    let data: PushRequest = await request.json();
    this.state.storage.transaction(async (tx) => {
      let lastMutationID =
        (await tx.get<number>(`lastMutationID-${data.clientID}`)) || 0;
      for (let i = 0; i < data.mutations.length; i++) {
        let time = Date.now();
        let m = data.mutations[i];
        if (m.id !== lastMutationID + 1) return;
        switch (m.name) {
          case "assertFact": {
            let fact = m.args as Fact;
            let existingValue = await this.state.storage.get<
              Fact & { time: string }
            >(`ea-${fact.entity}-${fact.attribute}`);
            await tx.put(`ea-${fact.entity}-${fact.attribute}`, {
              ...fact,
              time,
            });
            await tx.put(`tea-${time}-${fact.entity}-${fact.attribute}`, fact);
            if (existingValue) {
              await tx.delete(
                `tea-${existingValue.time}-${fact.entity}-${fact.attribute}`
              );
            }
            break;
          }
          default: {
            return new Response("Unknown mutation type", { status: 400 });
          }
        }
        lastMutationID = m.id;
      }
      tx.put<number>(`lastMutationID-${data.clientID}`, lastMutationID);
    });

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
