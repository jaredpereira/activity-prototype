import type { NextPage } from "next";
import { useEffect, useRef, useState } from "react";
import { ReadonlyJSONValue, Replicache } from "replicache";
import { useSubscribe } from "replicache-react";
import { MyPullResponse } from "../backend";

type Fact = {
  entity: string;
  attribute: string;
  value: string;
};

const rep = new Replicache({
  name: "test-db1",
  schemaVersion: `0`,
  pushDelay: 500,
  pullURL: "https://activity-prototype.awarm.workers.dev/pull",
  pushURL: "https://activity-prototype.awarm.workers.dev/push",
  puller: async (req) => {
    let res = await fetch(req);
    let data: MyPullResponse = await res.json();
    console.log("what is happening here? ", data);
    let ops = data.data.map((f) => {
      let fact = f[1];
      return {
        op: "put",
        key: `ea-${fact.entity}-${fact.attribute}`,
        value: fact.value,
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
  mutators: {
    assertFact: async (tx, args: Fact) => {
      await tx.put(`ea-${args.entity}-${args.attribute}`, args.value);
    },
  },
});

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
  let [state, setState] = useState({ entity: "", attribute: "", value: "" });
  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: "min-content auto" }}
    >
      entity:{" "}
      <input
        value={state.entity}
        onChange={(e) => setState({ ...state, entity: e.currentTarget.value })}
      />
      attribute:{" "}
      <input
        value={state.attribute}
        onChange={(e) =>
          setState({ ...state, attribute: e.currentTarget.value })
        }
      />
      value:{" "}
      <input
        value={state.value}
        onChange={(e) => setState({ ...state, value: e.currentTarget.value })}
      />
      <button
        onClick={() => {
          rep.mutate.assertFact(state);
        }}
      >
        mutate!
      </button>
    </div>
  );
}

export default Home;
