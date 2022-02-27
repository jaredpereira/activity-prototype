import type { NextPage } from "next";
import { useFact } from "../src/useReplicache";
import { sortByPosition } from "../src/utils";
import React, { useState } from "react";
import { Card } from "../src/components/Card";
import { generateKeyBetween } from "src/fractional-indexing";
import { NewDeck } from "src/components/NewDeck";
import { AddCardButton } from "src/components/AddCard";

const Home: NextPage = () => {
  return (
    <div className="h-full w-full">
      <DeckList />
    </div>
  );
};

export default Home;

function DeckList() {
  let entities = useFact("aev", "deck").sort(sortByPosition("aev"));
  return (
    <div className="flex flex-col gap-4 p-5">
      <NewDeck
        position={generateKeyBetween(
          entities[entities.length - 1]?.positions.aev || null,
          null
        )}
      />
      {entities.map((e) => {
        return <Deck key={e.id} entityID={e.entity} />;
      })}
    </div>
  );
}

const Deck = (props: { entityID: string }) => {
  const [open, setOpen] = useState(false);
  let name = useFact("eav", `${props.entityID}-name`);
  let cards = useFact("eav", `${props.entityID}-contains`);

  if (!name[0]) return <div>no name</div>;
  return (
    <div className="w-full">
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        <h3 className="text-2xl">{name[0].value.value}</h3>
      </div>
      {!open ? null : (
        <div
          style={{
            width: `100vw`,
            marginLeft: "-20px",
          }}
          className="bg-lightBG shadow-inner p-8 pb-4"
        >
          <div
            style={{
              width: `100vw`,
              marginLeft: "-32px",
              paddingLeft: "32px",
              paddingRight: "32px",
            }}
            className="flex flex-row gap-4 bg-slate-100 overflow-x-scroll "
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
          <div className="justify-items-end grid pt-2">
            <AddCardButton
              entityID={props.entityID}
              position={generateKeyBetween(
                cards[cards.length - 1]?.positions.eav || null,
                null
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
};
