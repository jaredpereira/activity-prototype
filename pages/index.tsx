import type { NextPage } from "next";
import { useFact } from "../src/useReplicache";
import Link from "next/link";
import { sortByPosition } from "../src/utils";
import React from "react";
import { Card } from "../src/components/Card";

const Home: NextPage = () => {
  return (
    <div className="text-center m-auto max-w-screen-md justify-items-center">
      <DeckList />
    </div>
  );
};

function DeckList() {
  let entities = useFact("aev", "deck").sort(sortByPosition("aev"));
  return (
    <ul className="grid gap-4 justify-items-center">
      {entities.map((e) => {
        return <Deck key={e.id} entityID={e.entity} />;
      })}
    </ul>
  );
}

const Deck = (props: { entityID: string }) => {
  let name = useFact("eav", `${props.entityID}-name`);
  let cards = useFact("eav", `${props.entityID}-contains`);
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

export default Home;
