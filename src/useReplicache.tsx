import { createContext, useContext, useEffect, useState } from "react";
import { Replicache, WriteTransaction } from "replicache";
import { MyPullResponse } from "../backend";
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

const workerURLS = {
  production: "https://activity-prototype.awarm.workers.dev",
  local: "http://localhost:8787",
};
export const ReplicacheProvider: React.FC = (props) => {
  let [rep, setRep] = useState<Replicache<ReplicacheMutators> | null>(null);
  useEffect(() => {
    const rep = new Replicache({
      name: "test-db2",
      schemaVersion: `27`,
      pushDelay: 500,
      pullURL: `${workerURLS.local}/pull`,
      pushURL: `${workerURLS.local}/push`,
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
            patch: ops,
          },
        };
      },
      mutators,
    });

    rep.createIndex({ name: "eav", jsonPointer: "/indexes/eav" });
    rep.createIndex({ name: "aev", jsonPointer: "/indexes/aev" });
    rep.createIndex({ name: "ave", jsonPointer: "/indexes/ave" });
    setRep(rep);
  }, []);

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
