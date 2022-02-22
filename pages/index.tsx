import type { NextPage } from "next";
import { useRef } from "react";
import { useSubscribe } from "replicache-react";
import { Fact } from "../backend";
import { useReplicache } from "../src/useReplicache";
import Link from "next/link";
import { sortByPosition } from "../src/utils";

const Home: NextPage = () => {
  return (
    <div className="text-center m-auto max-w-screen-md justify-items-center">
      <DeckList />
    </div>
  );
};

function DeckList() {
  let rep = useReplicache();
  let entities = useSubscribe<Fact[]>(
    rep,
    async (tx) => {
      let entities = (await tx
        .scan({ indexName: `aev`, prefix: "deck" })
        .values()
        .toArray()) as Fact[];

      return entities;
    },
    []
  ).sort(sortByPosition("aev"));

  let names = useSubscribe<Fact[]>(
    rep,
    async (tx) => {
      let entities = (await tx
        .scan({ indexName: `ave`, prefix: "name" })
        .values()
        .toArray()) as Fact[];

      return entities;
    },
    []
  ).sort(sortByPosition("aev"));
  console.log(
    names.map((f) => {
      return {
        name: f.value.value,
        entity: f.entity,
      };
    })
  );

  return (
    <ul className="grid gap-4 justify-items-center">
      {entities.map((e) => {
        return <Deck key={e.id} entityID={e.entity} />;
      })}
    </ul>
  );
}

const Deck = (props: { entityID: string }) => {
  let rep = useReplicache();
  let name = useSubscribe(
    rep,
    async (tx) => {
      return tx
        .scan({ indexName: "eav", prefix: `${props.entityID}-name` })
        .values()
        .toArray();
    },
    [],
    []
  ) as Fact[];

  let cards = useSubscribe(
    rep,
    async (tx) => {
      return tx
        .scan({ indexName: "eav", prefix: `${props.entityID}-contains` })
        .values()
        .toArray();
    },
    [],
    []
  ) as Fact[];

  if (!name[0]) return <div>no name</div>;
  return (
    <div>
      <h3 className="text-xl">{name[0].value.value}</h3>
      <ul>
        {cards.map((c) => {
          return <Card key={c.id} entityID={c.value.value as string} />;
        })}
      </ul>
    </div>
  );
};

function Card(props: { entityID: string }) {
  let rep = useReplicache();
  console.log(props.entityID);
  let title = useSubscribe(
    rep,
    async (tx) => {
      let fact = (await tx
        .scan({ indexName: "eav", prefix: `${props.entityID}-name` })
        .values()
        .toArray()) as Fact[];
      console.log(fact);
      if (fact[0]) return fact[0].value.value as string;
      return "";
    },
    "",
    []
  );
  return (
    <Link href={`/c/${props.entityID}`}>
      <a>
        <div className="border-2 rounded-md p-4"> {title}</div>
      </a>
    </Link>
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

export default Home;
