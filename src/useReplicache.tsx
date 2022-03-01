import { createContext, useContext, useEffect, useState } from "react";
import { Replicache, WriteTransaction } from "replicache";
import { useSubscribe } from "replicache-react";
import { Fact, MyPullResponse } from "../backend";
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
    console.log({ activity: props.activity, msg: "init replicache" });
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
      {!rep ? "loading" : props.children}
    </ReplicacheContext.Provider>
  );
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
      if (!prefix) return [] as Fact[];
      return tx.scan({ indexName: index, prefix }).values().toArray();
    },
    [],
    [index, prefix]
  ) as Fact[];
};
