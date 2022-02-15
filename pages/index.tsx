import type { NextPage } from "next";
import { useEffect, useRef } from "react";
import { Replicache, WriteTransaction } from "replicache";
import { useSubscribe } from "replicache-react";
import { MyPullResponse } from "../backend";
import { Mutations, processFact } from "../backend/mutations";
import { ulid } from "ulid";
import { Fact } from "../backend";

type ReplicacheMutators = {
  [k in keyof typeof Mutations]: (
    tx: WriteTransaction,
    args: Parameters<typeof Mutations[k]>[0]
  ) => Promise<void>;
};

let mutators: ReplicacheMutators = Object.keys(Mutations).reduce((acc, k) => {
  acc[k] = (tx: WriteTransaction, args: any) =>
    Mutations[k as keyof typeof Mutations](args).client(tx);
  return acc;
}, {} as any);

const rep = new Replicache({
  name: "test-db1",
  schemaVersion: `6`,
  pushDelay: 500,
  pullURL: "https://activity-prototype.awarm.workers.dev/pull",
  pushURL: "https://activity-prototype.awarm.workers.dev/push",
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
    <div className="text-center m-auto max-w-screen-md justify-items-center">
      <NewCard />
      <CardList />
    </div>
  );
};

function CardList() {
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
    <ul className="grid gap-4 justify-items-center">
      {entities.map((e) => {
        return <Card key={e} entityID={e} />;
      })}
    </ul>
  );
}

function Card(props: { entityID: string }) {
  let textarea = useRef<HTMLTextAreaElement | null>(null);
  let title = useSubscribe<string>(
    rep,
    async (tx) => {
      let title = (await tx
        .scan({ indexName: `eav`, prefix: `${props.entityID}-title` })
        .values()
        .toArray()) as Fact[];
      return title[0]?.value || "";
    },
    ``,
    []
  );

  let content = useSubscribe<string>(
    rep,
    async (tx) => {
      let title = (await tx
        .scan({ indexName: `eav`, prefix: `${props.entityID}-textContent` })
        .values()
        .toArray()) as Fact[];
      return title[0]?.value || "";
    },
    "",
    []
  );

  if (!title) return null;
  return (
    <div className="grid max-w-sm gap-4 p-4 border-2 border-black">
      <button onClick={() => rep.mutate.deleteCard({ cardID: props.entityID })}>
        del
      </button>
      <input
        className="text-xl border-2 p-2"
        spellCheck={false}
        value={title}
        onChange={(e) => {
          rep.mutate.updateCardTitle({
            cardID: props.entityID,
            newTitle: e.currentTarget.value,
          });
        }}
      />
      <textarea
        className="border-2 p-2"
        ref={textarea}
        value={content}
        onChange={async (e) => {
          let start = e.currentTarget.selectionStart,
            end = e.currentTarget.selectionEnd;
          await rep.mutate.updateCardContent({
            cardID: props.entityID,
            newContent: e.currentTarget.value,
          });

          textarea.current?.setSelectionRange(start, end);
        }}
      />
    </div>
  );
}

function NewCard() {
  return (
    <button
      className="text-4xl justify-self-center"
      onClick={() => {
        rep.mutate.createNewCard({ title: ``, entity: ulid() });
      }}
    >
      +
    </button>
  );
}

export default Home;
