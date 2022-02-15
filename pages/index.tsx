import type { NextPage } from "next";
import { useEffect, useRef } from "react";
import { Replicache, WriteTransaction } from "replicache";
import { useSubscribe } from "replicache-react";
import { MyPullResponse } from "../backend";
import { Mutations, processFact } from "../backend/mutations";
import { ulid } from "ulid";
import { Fact } from "../backend";
import { generateKeyBetween } from "../src/fractional-indexing";

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
  schemaVersion: `10`,
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
      <CardList />
    </div>
  );
};

function CardList() {
  let entities = useSubscribe<Fact[]>(
    rep,
    async (tx) => {
      let entities = (await tx
        .scan({ indexName: `aev`, prefix: "title" })
        .values()
        .toArray()) as Fact[];

      return entities;
    },
    []
  ).sort((a, b) => {
    if (a.position === b.position) return a.id > b.id ? -1 : 1;
    return a.position > b.position ? -1 : 1;
  });

  return (
    <ul className="grid gap-4 justify-items-center">
      <NewCard firstEntity={entities[0]?.position} />
      {entities.map((e) => {
        return (
          <Card key={e.entity} entityID={e.entity} position={e.position} />
        );
      })}
    </ul>
  );
}

function Card(props: { entityID: string; position: string }) {
  let textarea = useRef<HTMLTextAreaElement | null>(null);
  let title = useSubscribe<Fact | null>(
    rep,
    async (tx) => {
      let title = (await tx
        .scan({ indexName: `eav`, prefix: `${props.entityID}-title` })
        .values()
        .toArray()) as Fact[];
      return title[0] || "";
    },
    null,
    []
  );

  let content = useSubscribe<Fact | null>(
    rep,
    async (tx) => {
      let title = (await tx
        .scan({ indexName: `eav`, prefix: `${props.entityID}-textContent` })
        .values()
        .toArray()) as Fact[];
      return title[0] || null;
    },
    null,
    []
  );

  return (
    <div className="grid max-w-sm gap-4 p-4 border-2 border-black rounded-md">
      <div>
        <button
          className="border-2 w-min px-2"
          onClick={() => rep.mutate.deleteCard({ cardID: props.entityID })}
        >
          del
        </button>
        <button
          className="border-2 w-min px-2"
          onClick={() => {
            rep.query(async (tx) => {
              let titles = (
                (await tx
                  .scan({ indexName: `aev`, prefix: `title` })
                  .values()
                  .toArray()) as Fact[]
              ).sort((a, b) => {
                if (a.position === b.position) return a.id > b.id ? 1 : -1;
                return a.position > b.position ? 1 : -1;
              });
              let index = titles.findIndex((f) => f.entity === props.entityID);
              if (index === -1) throw new Error(`cant find index of card`);
              if (!titles[index - 1]) return;
              let newPosition = generateKeyBetween(
                titles[index - 2]?.position || null,
                titles[index - 1]?.position || null
              );
              rep.mutate.updatePosition({
                factID: titles[index].id,
                position: newPosition,
              });
            });
          }}
        >
          down
        </button>
        <button
          className="border-2 w-min px-2"
          onClick={() => {
            rep.query(async (tx) => {
              let titles = (
                (await tx
                  .scan({ indexName: `aev`, prefix: `title` })
                  .values()
                  .toArray()) as Fact[]
              ).sort((a, b) => {
                if (a.position === b.position) return a.id > b.id ? 1 : -1;
                return a.position > b.position ? 1 : -1;
              });
              let index = titles.findIndex((f) => f.entity === props.entityID);
              if (index === -1) throw new Error(`cant find index of card`);
              if (!titles[index + 1]) return;
              let newPosition = generateKeyBetween(
                titles[index + 1]?.position || null,
                titles[index + 2]?.position || null
              );
              rep.mutate.updatePosition({
                factID: titles[index].id,
                position: newPosition,
              });
            });
          }}
        >
          up
        </button>
      </div>
      <input
        className="text-xl border-2 p-2"
        spellCheck={false}
        value={title?.value || ""}
        onChange={(e) => {
          rep.mutate.assertFact({
            entity: props.entityID,
            attribute: "title",
            value: e.currentTarget.value,
            position: title?.position || "a0",
          });
        }}
      />
      <textarea
        className="border-2 p-2"
        ref={textarea}
        value={content?.value || ""}
        onChange={async (e) => {
          let start = e.currentTarget.selectionStart,
            end = e.currentTarget.selectionEnd;
          await rep.mutate.assertFact({
            entity: props.entityID,
            attribute: "textContent",
            value: e.currentTarget.value,
            position: content?.position || "a0",
          });

          textarea.current?.setSelectionRange(start, end);
        }}
      />
    </div>
  );
}

function NewCard(props: { firstEntity: string }) {
  return (
    <button
      className="text-4xl justify-self-center"
      onClick={() => {
        try {
          let newPosition = generateKeyBetween(null, props.firstEntity || null);
          console.log(newPosition);
          rep.mutate.createNewCard({
            title: ``,
            entity: ulid(),
            position: newPosition,
          });
        } catch (e) {
          console.log(e);
        }
      }}
    >
      +
    </button>
  );
}

export default Home;
