import type { NextPage } from "next";
import React, { useState } from "react";

import { Transition } from "@headlessui/react";

import { useFact } from "src/useReplicache";
import { sortByPosition } from "src/utils";
import { generateKeyBetween } from "src/fractional-indexing";

import { Card } from "src/components/Card";
import { NewDeck } from "src/components/NewDeck";
import { AddCardButton } from "src/components/AddCard";
import { useRouter } from "next/router";

const Home: NextPage = () => {
  return (
    <div className="h-full w-full">
      <Title />
      <DeckList />
    </div>
  );
};

export default Home;

function Title() {
  let name = useFact("aev", "activity/name")[0]
  return <h1 className='text-3xl font-bold px-5 pt-2'>{name?.value.value}</h1>

}

function DeckList() {
  let entities = useFact("aev", "deck").sort(sortByPosition("aev"));
  return (
    <div className="flex flex-col gap-4">
      <div className="p-5 w-full">
        <NewDeck
          position={generateKeyBetween(
            entities[entities.length - 1]?.positions.aev || null,
            null
          )}
        />
      </div>
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
  let router = useRouter();

  if (!name[0]) return <div>no name</div>;
  return (
    <div className="w-full">
      <div onClick={() => setOpen(!open)} className="cursor-pointer px-5">
        <h3 className="text-2xl">{name[0].value.value}</h3>
      </div>
      <Transition
        show={open}
        enter="transition-[max-height] duration-500 ease-out"
        enterFrom="max-h-2 overflow-hidden"
        enterTo="max-h-96 overflow-hidden"
        leave="transition-[max-height] duration-500 ease-out"
        leaveFrom="max-h-96 overflow-hidden"
        leaveTo="max-h-2 overflow-hidden"
      >
        <div
          style={{
            width: `100vw`,
          }}
          className="bg-lightBG shadow-inner py-8 pb-2 max-h overflow-hidden"
        >
          <div
            style={{
              width: `100vw`,
            }}
            className="flex flex-row gap-4 bg-slate-100 overflow-x-scroll no-scrollbar px-8 py-1"
          >
            {cards.map((c) => {
              return (
                <Card
                  key={c.id}
                  href={`/s/${router.query.studio}/a/${router.query.activity}/c/${props.entityID}?position=${c.value.value}`}
                  entityID={c.value.value as string}
                />
              );
            })}
          </div>
          <div className="justify-items-end grid pt-2 pr-8">
            <AddCardButton
              entityID={props.entityID}
              position={generateKeyBetween(
                cards[cards.length - 1]?.positions.eav || null,
                null
              )}
            />
          </div>
        </div>
      </Transition>
    </div>
  );
};