import type { NextPage } from "next";
import { useRef, useState } from "react";
import { useSubscribe } from "replicache-react";
import { ulid } from "ulid";
import { Fact } from "../backend";
import { generateKeyBetween } from "../src/fractional-indexing";
import { useReplicache } from "../src/useReplicache";
import { sortByPosition } from "../src/utils";

const Home: NextPage = () => {
  return (
    <div className="text-center m-auto max-w-screen-md justify-items-center">
      <CardList />
    </div>
  );
};

function CardList() {
  let rep = useReplicache();
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
  ).sort(sortByPosition("aev"));

  return (
    <ul className="grid gap-4 justify-items-center">
      <NewCard firstEntity={entities[0]?.positions.aev} />
      {entities.map((e) => {
        return <Card key={e.entity} entityID={e.entity} />;
      })}
    </ul>
  );
}

function Card(props: { entityID: string }) {
  let rep = useReplicache();

  return (
    <div className="grid max-w-sm gap-4 p-4 border-2 border-black rounded-md">
      <div>
        <button
          className="border-2 w-min px-2"
          onClick={() => rep.mutate.deleteCard({ cardID: props.entityID })}
        >
          del
        </button>
      </div>
      <Title entityID={props.entityID} />
      <CardTextContent entityID={props.entityID} />
    </div>
  );
}

function CardTextContent(props: { entityID: string }) {
  let textarea = useRef<HTMLTextAreaElement | null>(null);
  let rep = useReplicache();
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
    <textarea
      className="border-2 p-2"
      ref={textarea}
      value={(content?.value.value as string) || ""}
      onChange={async (e) => {
        let start = e.currentTarget.selectionStart,
          end = e.currentTarget.selectionEnd;
        await rep.mutate.assertFact({
          entity: props.entityID,
          attribute: "textContent",
          value: { type: "string", value: e.currentTarget.value },
          positions: content?.positions || {},
        });

        textarea.current?.setSelectionRange(start, end);
      }}
    />
  );
}

function Title(props: { entityID: string }) {
  let input = useRef<HTMLInputElement | null>(null);
  let rep = useReplicache();
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
  return (
    <input
      ref={input}
      className="text-xl border-2 p-2"
      spellCheck={false}
      value={(title?.value.value as string) || ""}
      onChange={(e) => {
        let start = e.currentTarget.selectionStart,
          end = e.currentTarget.selectionEnd;
        rep.mutate.assertFact({
          entity: props.entityID,
          attribute: "title",
          value: { type: "string", value: e.currentTarget.value },
          positions: title?.positions || {},
        });
        input.current?.setSelectionRange(start, end);
      }}
    />
  );
}

function NewCard(props: { firstEntity: string | undefined }) {
  let rep = useReplicache();
  let [newTitle, setNewTitle] = useState("");
  return (
    <div>
      <input
        value={newTitle}
        onChange={(e) => {
          setNewTitle(e.currentTarget.value);
        }}
      />
      <button
        className="text-4xl justify-self-center"
        onClick={async () => {
          try {
            let newPosition = generateKeyBetween(
              null,
              props.firstEntity || null
            );
            console.log(
              await rep.mutate.createNewCard({
                title: newTitle,
                entity: ulid(),
                position: newPosition,
              })
            );
          } catch (e) {
            console.log(e);
          }
        }}
      >
        +
      </button>
    </div>
  );
}

export default Home;
