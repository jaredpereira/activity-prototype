import { PullRequest, PullResponse, PushRequest } from "replicache";
import { Mutations } from "./mutations";
import { ulid } from "../src/ulid";
import { Schema, writeFactToStorage } from "./writes";
import { init } from "./populate";

export default {
  fetch: handleRequest,
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// https://URL/v1/${entityID}/operation
async function handleRequest(request: Request, env: Bindings) {
  let url = new URL(request.url);
  let path = url.pathname.split("/");

  if (request.method === "OPTIONS") return handleOptions(request);
  switch (path[2]) {
    case "create": {
      let newActivity = env.COUNTER.newUniqueId();
      console.log(newActivity);

      return new Response(JSON.stringify({}), {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
          "Content-Type": "application/json;charset=UTF-8",
        },
      });
    }
    case "activity": {
      let id = env.COUNTER.idFromString(path[3]);
      let newUrl = new URL(request.url);
      newUrl.pathname = "/" + path.slice(4).join("/");

      let obj = env.COUNTER.get(id);
      return obj.fetch(new Request(newUrl.toString(), new Request(request)));
    }
    default: {
      return new Response("Not found", {
        status: 404,
      });
    }
  }
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
  retracted?: boolean;
  positions: { [k: string]: string | undefined };
  entity: string;
  attribute: string;
  value: Value;
};

export type Value =
  | { type: "flag"; value: null }
  | { type: "reference"; value: string }
  | { type: "union"; value: string }
  | {
      type: "string";
      value: string;
    }
  | {
      type: "boolean";
      value: boolean;
    };

export type FactInput = Omit<Fact, "lastUpdated" | "id">;

export type MyPullResponse = Omit<PullResponse, "patch"> & {
  cookie?: Cookie;
  data: (Fact & { meta: { schema: Schema } })[];
};

// Durable Object
export class Counter implements DurableObject {
  version = 29;

  constructor(private readonly state: DurableObjectState) {
    this.state.blockConcurrencyWhile(async () => {
      let lastVersion =
        (await this.state.storage.get<number>("meta-lastVersion")) || 0;
      if (lastVersion >= this.version) return;
      await this.state.storage.deleteAll();
      await this.state.storage.put("meta-lastVersion", this.version);

      try {
        let e = {
          name: ulid(),
          unique: ulid(),
          type: ulid(),
          "union/value": ulid(),
          cardinatlity: ulid(),
          title: ulid(),
          textContent: ulid(),
        };
        const initialFacts = [
          { entity: e.name, attribute: "name", value: "name" },
          { entity: e.name, attribute: "unique", value: true },
          { entity: e.name, attribute: "type", value: "string" },

          { entity: e.unique, attribute: "name", value: "unique" },
          { entity: e.unique, attribute: "type", value: "boolean" },

          { entity: e.type, attribute: "name", value: "type" },
          { entity: e.type, attribute: "type", value: "union" },
          { entity: e.type, attribute: `union/value`, value: `string` },
          { entity: e.type, attribute: `union/value`, value: `union` },
          { entity: e.type, attribute: `union/value`, value: `reference` },
          { entity: e.type, attribute: `union/value`, value: `boolean` },

          { entity: e["union/value"], attribute: "name", value: `union/value` },
          { entity: e["union/value"], attribute: "type", value: `string` },
          { entity: e["union/value"], attribute: "cardinality", value: `many` },

          { entity: e.cardinatlity, attribute: "name", value: "cardinality" },
          { entity: e.cardinatlity, attribute: "type", value: "union" },
          { entity: e.cardinatlity, attribute: "union/value", value: "many" },
          { entity: e.cardinatlity, attribute: "union/value", value: "one" },
        ];

        let lastUpdated = Date.now().toString();
        await Promise.all(
          initialFacts.map(async (f) => {
            let attribute = initialFacts.find(
              (initialFact) =>
                initialFact.attribute === "name" &&
                initialFact.value === f.attribute
            );
            if (!attribute)
              throw new Error(
                "tried to initialize with uninitialized attribute!"
              );
            let value: Value =
              f.attribute === "cardinality"
                ? { type: "union", value: f.value as string }
                : typeof f.value === `string`
                ? { type: "string", value: f.value }
                : { type: "boolean", value: f.value };
            let newData: Fact = {
              ...f,
              value,
              id: ulid(),
              positions: {},
              lastUpdated,
            };
            await writeFactToStorage(this.state.storage, newData, {
              type:
                (initialFacts.find(
                  (f) =>
                    f.entity === e[newData.attribute as keyof typeof e] &&
                    f.attribute === "type"
                )?.value as Schema["type"]) || "string",
              cardinality:
                (initialFacts.find(
                  (f) =>
                    f.entity === e[newData.attribute as keyof typeof e] &&
                    f.attribute === "cardinality"
                )?.value as "one" | "many") || "one",
              unique: !!initialFacts.find(
                (f) =>
                  f.entity === e[newData.attribute as keyof typeof e] &&
                  f.attribute === "unique" &&
                  f.value === true
              ),
            });
          })
        );
        await init(this.state.storage);
      } catch (e) {
        console.log("CONSTRUCTOR ERROR", e);
      }
    });
  }

  // Handle HTTP requests from clients.
  async fetch(request: Request) {
    // Apply requested action.
    let url = new URL(request.url);
    switch (url.pathname) {
      case "/dump": {
        return new Response(
          JSON.stringify([...(await this.state.storage.list())]),
          {
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
              "Content-Type": "application/json;charset=UTF-8",
            },
          }
        );
      }
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
            "Content-Type": "application/json;charset=UTF-8",
          },
        });
    }
  }

  async pull(request: Request): Promise<Response> {
    try {
      let data: PullRequest = await request.json();
      let cookie = data.cookie as Cookie | null;
      let lastMutationID =
        (await this.state.storage.get<number>(
          `lastMutationID-${data.clientID}`
        )) || 0;

      let map = await this.state.storage.list<
        Fact & { meta: { schema: Schema } }
      >({
        prefix: `ti`,
        start: `ti-${cookie?.lastUpdated || ""}`,
      });
      let updates = [...map.values()].filter(
        (f) => !cookie?.lastUpdated || f.lastUpdated > cookie.lastUpdated
      );

      let lastKey = updates[updates.length - 1];
      let newCookie: Cookie | undefined = !lastKey
        ? cookie?.lastUpdated
          ? { lastUpdated: cookie.lastUpdated }
          : undefined
        : { lastUpdated: lastKey.lastUpdated };
      let response: MyPullResponse = {
        cookie: newCookie,
        lastMutationID,
        data: updates,
      };
      return new Response(JSON.stringify(response), {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json;charset=UTF-8",
        },
      });
    } catch (e) {
      console.log(e);
      new Response(JSON.stringify(e), {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json;charset=UTF-8",
        },
      });
    }
    return new Response(JSON.stringify({ msg: "shouldn't reach here" }), {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json;charset=UTF-8",
      },
    });
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
        await Mutations[name](m.args as any).server(this.state.storage);
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
        "Content-Type": "application/json;charset=UTF-8",
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
