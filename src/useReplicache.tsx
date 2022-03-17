import { Session, Token, useAuthentication } from "backend/auth";
import { AttributeName } from "backend/query";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Replicache, WriteTransaction } from "replicache";
import { useSubscribe } from "replicache-react";
import { Fact, MyPullResponse } from "../backend/ActivityDurableObject";
import { Mutations, processFact } from "../backend/mutations";
import useSWR from "swr";

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

let ReplicacheContext = createContext<{
  rep: Replicache<ReplicacheMutators> | null;
  activityURL: string;
} | null>(null);

const NEXT_PUBLIC_WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL;

const useSetupReplicache = (activity: string | null) => {
  let [rep, setRep] = useState<Replicache<ReplicacheMutators> | null>(null);
  let activityURL = `${NEXT_PUBLIC_WORKER_URL}/v0/activity/${activity}`;
  useEffect(() => {
    if (!activity) return;
    const rep = new Replicache({
      name: `activity-${activity}`,
      schemaVersion: `27`,
      pushDelay: 500,
      pullURL: `${activityURL}/pull`,
      pushURL: `${activityURL}/push`,
      pusher: async (req) => {
        let res = await fetch(req, {
          credentials: "include",
        });
        return { httpStatusCode: res.status, errorMessage: "" };
      },
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
  }, [activity]);
  return { rep, activityURL };
};

let HomeStudioContext = createContext<
  | {
    loggedIn: true;
    rep: Replicache<ReplicacheMutators>;
    token: Token;
    activityURL: string;
  }
  | { loggedIn: false }
>({ loggedIn: false });

export const HomeStudioProvider: React.FC<{}> = (props) => {
  let { data: auth } = useSWR<Session>("/v0/auth/session", async (key) => {
    let res = await fetch(process.env.NEXT_PUBLIC_WORKER_URL + key, {
      credentials: "include",
    });
    let result = await res.json();
    return result as Session;
  });
  let data = useSetupReplicache(auth?.loggedIn ? auth.token.studio : null);
  return (
    <HomeStudioContext.Provider
      value={
        !auth?.loggedIn || !data.rep
          ? { loggedIn: false }
          : {
            loggedIn: true,
            rep: data.rep,
            token: auth.token,
            activityURL: data.activityURL,
          }
      }
    >
      {!data.rep || !auth?.loggedIn ? null : <Socket id={auth.token.studio} rep={data.rep} />}
      {props.children}
    </HomeStudioContext.Provider>
  );
};
export const useHomeStudio = () => {
  return useContext(HomeStudioContext);
};

export const ReplicacheProvider: React.FC<{ activity: string | null }> = (
  props
) => {
  let data = useSetupReplicache(props.activity);
  return (
    <ReplicacheContext.Provider value={data}>
      {!data.rep ? null : <Socket id={props.activity} rep={data.rep} />}
      {!data.rep ? "loading" : props.children}
    </ReplicacheContext.Provider>
  );
};

const Socket = (props: { id: string | null, rep: Replicache }) => {
  let socket = useRef<WebSocket>();
  useEffect(() => {
    if (!props.id) return;
    socket.current = new WebSocket(
      `${process.env.NEXT_PUBLIC_WORKER_SOCKET}/v0/activity/${props.id}/poke`
    );
    socket.current.addEventListener("message", () => {
      props.rep.pull();
    });
    return () => {
      socket.current?.close();
    };
  }, [props.id]);
  return null;
};

export const useReplicache = () => {
  const c = useContext(ReplicacheContext);
  if (c === null || c.rep === null)
    throw new Error("useCtx must be inside a Provider with a value");
  return c.rep;
};

export const useActivityURL = () => {
  const c = useContext(ReplicacheContext);
  if (c === null || c.rep === null)
    throw new Error("useCtx must be inside a Provider with a value");
  return c.activityURL;
};

export function useFact<A extends AttributeName = AttributeName>(
  index: string,
  prefix: string
) {
  let rep = useReplicache();
  return useSubscribe(
    rep,
    async (tx) => {
      if (!prefix) return [] as Fact<A>[];
      return tx.scan({ indexName: index, prefix }).values().toArray();
    },
    [],
    [index, prefix]
  ) as Fact<AttributeName>[];
}

export function useMutation() {
  let { data: user } = useAuthentication();
  let rep = useReplicache();
  let auth = useSubscribe(
    rep,
    async (tx) => {
      if (!user || !user.loggedIn) return false;
      let fact = (await tx
        .scan({
          indexName: "ave",
          prefix: `activity/member-${user.token.studio}`,
        })
        .values()
        .toArray()) as Fact<"activity/member">[];
      if (!fact[0]) return false;
      return true;
    },
    false,
    [user]
  );

  return {
    authorized: auth,
    mutate<T extends keyof typeof Mutations>(
      mutation: T,
      args: Parameters<typeof Mutations[T]>[0]
    ) {
      if (!user || !auth) return;
      //@ts-ignore
      return rep.mutate[mutation](args);
    },
  };
}
