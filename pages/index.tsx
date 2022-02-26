import type { NextPage } from "next";
import { useFact, useReplicache } from "../src/useReplicache";
import { sortByPosition } from "../src/utils";
import React, { useState } from "react";
import { Card } from "../src/components/Card";
import { generateKeyBetween } from "src/fractional-indexing";
import { ulid } from "src/ulid";
import { useRouter } from "next/router";
import { NewDeck } from "src/components/NewDeck";

const Home: NextPage = () => {
  return <DeckList />;
};

function DeckList() {
  let entities = useFact("aev", "deck").sort(sortByPosition("aev"));
  return (
    <div className="grid gap-4">
      {entities.map((e) => {
        return <Deck key={e.id} entityID={e.entity} />;
      })}
      <NewDeck
        position={generateKeyBetween(
          entities[entities.length - 1]?.positions.aev || null,
          null
        )}
      />
    </div>
  );
}

const Deck = (props: { entityID: string }) => {
  const [open, setOpen] = useState(false);
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
        cards[cards.length - 1]?.positions.eav || null,
        null
      ),
    });
    router.push(`/c/${newCard}`);
    router.push(`/c/${props.entityID}?position=${newCard}`);
  };

  if (!name[0]) return <div>no name</div>;
  return (
    <div>
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        <h3 className="text-2xl">{name[0].value.value}</h3>
      </div>
      {!open ? null : (
        <div>
          <div
            style={{ width: "100vw" }}
            className="flex flex-row gap-4 bg-slate-100 overflow-x-scroll"
          >
            {cards.map((c) => {
              return (
                <Card
                  key={c.id}
                  href={`/c/${props.entityID}?position=${c.value.value}`}
                  entityID={c.value.value as string}
                />
              );
            })}
          </div>
          <button onClick={() => addCard()}>add</button>
        </div>
      )}
    </div>
  );
};

export default Home;
