import { AttributeName } from "backend/query";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Replicache, WriteTransaction } from "replicache";
import { useSubscribe } from "replicache-react";
import { Fact, MyPullResponse } from "../backend/ActivityDurableObject";
import { Mutations, processFact } from "../backend/mutations";

type ReplicacheMutators = {
  [k in keyof typeof Mutations]: (
    tx: WriteTransaction,
    args: Parameters<typeof Mutations[k]>[0]
  ) => Promise<void>;
};

let mutators: ReplicacheMutators = Object.keys(Mutations).reduce((acc, k) => {
  acc[k] = async (tx: WriteTransaction, args: any) =>
    Mutations[k as keyof typeof Mutations](args).client(tx);
  return acc;
}, {} as any);

let ReplicacheContext = createContext<Replicache<ReplicacheMutators> | null>(
  null
);

const NEXT_PUBLIC_WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL;
export const ReplicacheProvider: React.FC<{ activity: string | null }> = (
  props
) => {
  let [rep, setRep] = useState<Replicache<ReplicacheMutators> | null>(null);
  useEffect(() => {
    if (!props.activity) return;
    const rep = new Replicache({
      name: `activity-${props.activity}`,
      schemaVersion: `27`,
      pushDelay: 500,
      pullURL: `${NEXT_PUBLIC_WORKER_URL}/v0/activity/${props.activity}/pull`,
      pushURL: `${NEXT_PUBLIC_WORKER_URL}/v0/activity/${props.activity}/push`,
      puller: async (req) => {
        let res = await fetch(req);
        let data: MyPullResponse = await res.json();
        let ops = data.data.map((fact) => {
          if (fact.retracted)
            return {
              op: "del",
              key: fact.id,
            } as const;
          return {
            op: "put",
            key: fact.id,
            value: processFact(fact.id, fact, fact.meta.schema),
          } as const;
        });
        return {
          httpRequestInfo: { httpStatusCode: 200, errorMessage: "" },
          response: {
            lastMutationID: data.lastMutationID,
            cookie: data.cookie,
            patch: data.clear ? [{ op: "clear" }, ...ops] : ops,
          },
        };
      },
      mutators,
    });

    rep.createIndex({ name: "eav", jsonPointer: "/indexes/eav" });
    rep.createIndex({ name: "aev", jsonPointer: "/indexes/aev" });
    rep.createIndex({ name: "ave", jsonPointer: "/indexes/ave" });
    rep.createIndex({ name: "vae", jsonPointer: "/indexes/vae" });
    setRep(rep);
    return () => {
      rep.close();
      setRep(null);
    };
  }, [props.activity]);

  return (
    <ReplicacheContext.Provider value={rep}>
      {!rep ? null : <Socket id={props.activity} />}
      {!rep ? "loading" : props.children}
    </ReplicacheContext.Provider>
  );
};

const Socket = (props: { id: string | null }) => {
  let socket = useRef<WebSocket>();
  let rep = useReplicache();
  useEffect(() => {
    if (!props.id) return;
    socket.current = new WebSocket(
      `${process.env.NEXT_PUBLIC_WORKER_SOCKET}/v0/activity/${props.id}/poke`
    );
    socket.current.addEventListener("message", () => {
      rep.pull();
    });
    return () => {
      socket.current?.close();
    };
  }, [props.id]);
  return null;
};

export const useReplicache = () => {
  const c = useContext(ReplicacheContext);
  if (c === null)
    throw new Error("useCtx must be inside a Provider with a value");
  return c;
};

export const useFact = (index: string, prefix: string) => {
  let rep = useReplicache();
  return useSubscribe(
    rep,
    async (tx) => {
      if (!prefix) return [] as Fact<AttributeName>[];
      return tx.scan({ indexName: index, prefix }).values().toArray();
    },
    [],
    [index, prefix]
  ) as Fact<AttributeName>[];
};
