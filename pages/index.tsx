import type { NextPage } from "next";
import { useFact, useReplicache } from "../src/useReplicache";
import Link from "next/link";
import { sortByPosition } from "../src/utils";
import React from "react";
import { Card } from "../src/components/Card";
import { generateKeyBetween } from "src/fractional-indexing";
import { ulid } from "src/ulid";
import { useRouter } from "next/router";

const Home: NextPage = () => {
  return (
    <div className="text-center m-auto max-w-screen-md justify-items-center">
      <DeckList />
    </div>
  );
};

function DeckList() {
  let entities = useFact("aev", "deck").sort(sortByPosition("aev"));
  console.log(entities);
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
  let name = useFact("eav", `${props.entityID}-name`);
  let cards = useFact("eav", `${props.entityID}-contains`);
  let router = useRouter();

  const addCard = async () => {
    let newCard = ulid();
    await rep.mutate.addCardToSection({
      newCard,
      entity: props.entityID,
      section: "contains",
      position: generateKeyBetween(
        cards[cards.length - 1].positions.eav || null,
        null
      ),
    });
    router.push(`/c/${newCard}`);
  };

  if (!name[0]) return <div>no name</div>;
  return (
    <div>
      <h3 className="text-xl">{name[0].value.value}</h3>
      <div className="flex flex-row flex-wrap gap-4">
        {cards.map((c) => {
          return <Card key={c.id} entityID={c.value.value as string} />;
        })}
        <button onClick={() => addCard()}>add</button>
      </div>
    </div>
  );
};

export default Home;
