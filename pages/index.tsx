import type { NextPage } from "next";
import { useEffect, useRef, useState } from "react";
import { ReadonlyJSONValue, Replicache, WriteTransaction } from "replicache";
import { useSubscribe } from "replicache-react";
import { MyPullResponse } from "../backend";
import { Mutations } from "../backend/mutations";
import { ulid } from "ulid";

type Fact = {
  entity: string;
  attribute: string;
  value: string;
};

const processFact = (f: Fact) => {
  let indexes: { eav: string; ave?: string; vae?: string; aev: string } = {
    eav: `${f.entity}-${f.attribute}`,
    aev: `${f.attribute}-${f.entity}`,
  };
  return { ...f, indexes };
};

type ReplicacheMutators = {
  [k in keyof typeof Mutations]: (
    tx: WriteTransaction,
    args: Parameters<typeof Mutations[k]>[1]
  ) => Promise<void>;
};

let mutators: ReplicacheMutators = Object.keys(Mutations).reduce((acc, k) => {
  acc[k] = (tx: WriteTransaction, args: any) =>
    Mutations[k as keyof typeof Mutations](async (f: Fact) => {
      await tx.put(`ea-${f.entity}-${f.attribute}`, processFact(f));
    }, args);

  return acc;
}, {} as any);

const rep = new Replicache({
  name: "test-db1",
  schemaVersion: `2`,
  pushDelay: 500,
  pullURL: "https://activity-prototype.awarm.workers.dev/pull",
  pushURL: "https://activity-prototype.awarm.workers.dev/push",
  puller: async (req) => {
    let res = await fetch(req);
    let data: MyPullResponse = await res.json();
    let ops = data.data.map((fact) => {
      return {
        op: "put",
        key: `${fact.id}`,
        value: processFact(fact),
      } as const;
    });
    return {
      httpRequestInfo: { httpStatusCode: 200, errorMessage: "" },
      response: {
        lastMutationID: data.lastMutationID,
        cookie: data.cookie,
        patch: ops,
      },
    };
  },
  mutators,
});
rep.createIndex({ name: "eav", jsonPointer: "/indexes/eav" });
rep.createIndex({ name: "aev", jsonPointer: "/indexes/aev" });

const Home: NextPage = () => {
  let socket = useRef<WebSocket>();
  useEffect(() => {
    socket.current = new WebSocket(
      `wss://activity-prototype.awarm.workers.dev/poke`
    );
    socket.current.addEventListener("message", () => {
      rep.pull();
    });
  }, []);

  return (
    <div>
      <NewEntity />
      <Entities />
    </div>
  );
};

function Entities() {
  let entities = useSubscribe<string[]>(
    rep,
    async (tx) => {
      let keys = await tx
        .scan({ indexName: `aev`, prefix: "title" })
        .keys()
        .toArray();
      return keys.map((k) => k[0].slice(6));
    },
    []
  );
  return (
    <ul>
      {entities.map((e) => {
        return <Entity key={e} entityID={e} />;
      })}
    </ul>
  );
}

function Entity(props: { entityID: string }) {
  let title = useSubscribe<string>(
    rep,
    async (tx) => {
      let title = await tx
        .scan({ indexName: `eav`, prefix: `${props.entityID}-title` })
        .values()
        .next();
      console.log(title);
      return title.value.value;
    },
    ``,
    []
  );
  if (!title) return null;
  return <h3>{title}</h3>;
}

function NewEntity() {
  let [state, setState] = useState({ title: "" });
  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: "min-content auto" }}
    >
      {"title: "}
      <input
        value={state.title}
        onChange={(e) => setState({ ...state, title: e.currentTarget.value })}
      />
      <button
        onClick={() => {
          rep.mutate.createNewCard({ title: state.title, entity: ulid() });
        }}
      >
        create!
      </button>
    </div>
  );
}

export default Home;
