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
  let indexes: { eav: string; ave?: string; vae?: string } = {
    eav: `${f.entity}-${f.attribute}`,
  };
  indexes.ave = `${f.attribute}-${f.value}`;
  indexes.vae = "";
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
        key: `ea-${fact.entity}-${fact.attribute}`,
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

rep.createIndex({ name: `aev`, jsonPointer: `/indexes/aev` });

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
  let test = useSubscribe<ReadonlyJSONValue>(
    rep,
    async (tx) => {
      let test = await tx.scan().entries().toArray();
      return test;
    },
    []
  );

  return (
    <div>
      <NewFact />
      <pre>{JSON.stringify(test, null, "  ")}</pre>
    </div>
  );
};

function NewFact() {
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
        mutate!
      </button>
    </div>
  );
}

export default Home;
