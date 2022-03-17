import { PullRequest, PullResponse, PushRequest } from "replicache";
import { ulid } from "src/ulid";
import { generateShareCode } from "src/utils";
import { getToken } from "./auth";
import { Bindings } from "./bindings";
import { Mutations } from "./mutations";
import { init } from "./populate";
import { q, Fact, AttributeName } from "./query";
import { indexes, Schema, serverAssertFact } from "./writes";

type Cookie = {
  lastUpdated: string;
  version?: number;
};

export type { Fact, FactInput } from "./query";

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

export type MyPullResponse = Omit<PullResponse, "patch"> & {
  cookie?: Cookie;
  data: (Fact<AttributeName> & { meta: { schema: Schema } })[];
  clear?: boolean;
};

export type InitMessage = {
  creatorID: string;
  name: string;
  creatorName: string;
};

// Durable Object
export class ActivityDurableObject implements DurableObject {
  version = 31;
  query: ReturnType<typeof q>;

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Bindings
  ) {
    this.query = q(this.state.storage);
    this.state.blockConcurrencyWhile(async () => {
      let lastVersion =
        (await this.state.storage.get<number>("meta-lastVersion")) || 0;
      let shareLink = await this.state.storage.get("meta-shareLink");
      console.log(shareLink);
      if (!shareLink) shareLink = generateShareCode();
      console.log(shareLink);
      if (lastVersion >= this.version) return;
      await this.state.storage.deleteAll();
      this.state.storage.put("meta-lastVersion", this.version);
      this.state.storage.put("meta-shareLink", shareLink);
      try {
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
    let path = url.pathname.split("/");
    switch (path[1]) {
      case "init": {
        return this.init(request);
      }
      case "dump": {
        return new Response(
          JSON.stringify([...(await this.state.storage.list())]),
          {}
        );
      }
      case "join": {
        let data: { code: string } = await request.json()
        let user = getToken(request)
        if (!user) return new Response(JSON.stringify({ errors: ["No user logged in"] }), { status: 401 })
        let code = await this.state.storage.get<string>("meta-shareLink");
        if (!code) return new Response(JSON.stringify({ errors: ['no saved code'] }), { status: 500 })
        if (data.code = code) {
          this.addMember({ id: user.studio, name: user.username })
          this.sendPoke()
          return new Response(JSON.stringify({}))
        }
        return new Response(JSON.stringify({ errors: ['invalid code'] }), { status: 401 })

      }

      case "share": {
        if (!(await this.isAuthorized(request)))
          return new Response(JSON.stringify({}), { status: 400 });
        let code = await this.state.storage.get<string>("meta-shareLink");
        return new Response(JSON.stringify({ code: code }), { status: 200 });
      }

      case "activity": {
        switch (request.method) {
          case "GET": {
            return this.getActitivy(decodeURI(path[2]));
          }
          case "POST": {
            return this.createActivity(request);
          }
        }
        return new Response(
          JSON.stringify({ errors: ["Only POST and GET supported"] }),
          { status: 401 }
        );
      }
      case "pull":
        return this.pull(request);
      case "push":
        return this.push(request);
      case "poke":
        return this.pokeEndpoint(request);
      default:
        return new Response("Not found", {
          status: 404,
        });
    }
  }

  async init(request: Request) {
    let creator = await this.state.storage.get("meta-creator");
    if (creator)
      return new Response(JSON.stringify({ errors: ["already initialized"] }), {
        status: 401,
      });
    let data: InitMessage = await request.json();
    await Promise.all([
      this.addMember({ id: data.creatorID, name: data.creatorName }),
      serverAssertFact(this.state.storage, {
        entity: ulid(),
        attribute: "activity/name",
        positions: { aev: "a0" },
        value: {
          type: "string",
          value: data.name,
        },
      }),
    ])
    await this.state.storage.put("meta-creator", data.creatorID);
    return new Response(JSON.stringify([]), { status: 200 });
  }

  async addMember(member: { id: string, name: string }) {
    let existingMember = await this.query.attribute('activity/member').find(member.id)
    if (existingMember) return
    let memberEntity = ulid();
    await Promise.all([
      serverAssertFact(this.state.storage, {
        attribute: "member/name",
        value: { type: "string", value: member.name },
        entity: memberEntity,
        positions: { aev: "a0" },
      }),
      serverAssertFact(this.state.storage, {
        entity: memberEntity,
        attribute: "activity/member",
        positions: { aev: "a0" },
        value: {
          type: "string",
          value: member.id,
        },
      }),
    ]);
  }

  async getActitivy(name: string) {
    let entity = await this.query.attribute("name").find(name);
    if (!entity) return new Response(JSON.stringify({}), { status: 404 });
    let activity = await this.query.entity(entity.entity).get("activity");
    if (!activity) return new Response(JSON.stringify({}), { status: 404 });
    return new Response(activity.value.value, {
      status: 200,
    });
  }
  async createActivity(request: Request) {
    let { name }: { name: string } = await request.json();
    let creator = await this.state.storage.get<string>("meta-creator");
    if (!creator)
      return new Response(
        JSON.stringify({ errors: ["Activity not initialized"] }),
        { status: 400 }
      );

    let user = getToken(request);
    console.log(user);
    if (!(await this.isAuthorized(request)) || !user)
      return new Response(JSON.stringify({ errors: ["unauthorized"] }), {
        status: 400,
      });
    let existingActivity = await this.query.attribute("name").find(name);
    if (existingActivity) {
      return new Response(
        JSON.stringify({ errors: ["Activity already exists"] }),
        { status: 401 }
      );
    }
    let newEntity = ulid();
    let newActivity = this.env.ACTIVITY.newUniqueId();
    let initMessage: InitMessage = {
      name: name,
      creatorID: creator,
      creatorName: user.username,
    };
    await this.env.ACTIVITY.get(newActivity).fetch("http://internal/init", {
      method: "POST",
      body: JSON.stringify(initMessage),
    });
    await Promise.all([
      serverAssertFact(this.state.storage, {
        entity: newEntity,
        attribute: "name",
        positions: {},
        value: { type: "string", value: name },
      }),
      serverAssertFact(this.state.storage, {
        entity: newEntity,
        attribute: "activity",
        value: { type: "string", value: newActivity.toString() },
        positions: {},
      }),
    ]);
    return new Response(JSON.stringify({}), { status: 200 });
  }

  async isAuthorized(request: Request) {
    let user = getToken(request);
    if (!user) return false;

    let userIsMember = await this.query
      .attribute("activity/member")
      .find(user.studio);
    if (!userIsMember) return false;
    return true
  }

  async pull(request: Request): Promise<Response> {
    try {
      let data: PullRequest = await request.json();
      let cookie = data.cookie as Cookie | null;
      let lastMutationID =
        (await this.state.storage.get<number>(
          `lastMutationID-${data.clientID}`
        )) || 0;

      let lastUpdated = cookie?.lastUpdated || "";
      let version = cookie?.version || 0;
      if (version < this.version) lastUpdated = "";
      let map = await this.state.storage.list<
        Fact<AttributeName> & { meta: { schema: Schema } }
      >({
        prefix: `ti`,
        start: `ti-${lastUpdated}`,
      });
      let updates = [...map.values()].filter(
        (f) => !lastUpdated || f.lastUpdated > lastUpdated
      );

      let lastKey = updates[updates.length - 1];
      let newCookie: Cookie = {
        version: this.version,
        lastUpdated:
          lastUpdated || lastKey?.lastUpdated || Date.now().toString(),
      };

      let response: MyPullResponse = {
        cookie: newCookie,
        clear: version < this.version,
        lastMutationID,
        data: updates,
      };
      return new Response(JSON.stringify(response), {});
    } catch (e) {
      console.log(e);
      new Response(JSON.stringify(e), {
        status: 400,
      });
    }
    return new Response(JSON.stringify({ msg: "shouldn't reach here" }), {});
  }

  async push(request: Request) {
    let data: PushRequest = await request.json();
    let lastMutationID =
      (await this.state.storage.get<number>(
        `lastMutationID-${data.clientID}`
      )) || 0;

    let isAuthorized = await this.isAuthorized(request);
    if (!isAuthorized) {
      this.state.storage.put<number>(
        `lastMutationID-${data.clientID}`,
        data.mutations[data.mutations.length - 1].id
      );
      return new Response(
        JSON.stringify({ errors: ["no activity member found"] }),
        {
          status: 400,
        }
      );
    }

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
    return new Response(JSON.stringify({}), {
      status: 200,
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
