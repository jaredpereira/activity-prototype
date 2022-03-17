import type { NextPage } from "next";
import React, { useState } from "react";

import { Transition } from "@headlessui/react";
import { Disclosure } from "@headlessui/react";

import { useActivityURL, useFact } from "src/useReplicache";
import { sortByPosition } from "src/utils";
import { generateKeyBetween } from "src/fractional-indexing";

import { Card } from "src/components/Card";
import { NewDeck } from "src/components/NewDeck";
import { AddCardButton } from "src/components/AddCard";
import { useRouter } from "next/router";
import { useAuthentication } from "backend/auth";

const Home: NextPage = () => {
  return (
    <div className="h-full w-full">
      <div className="px-5">
        <Title />
        <Members />
      </div>
      <DeckList />
    </div>
  );
};

export default Home;

function Title() {
  let name = useFact<"this/name">("aev", "this/name")[0];
  return <h1 className="text-3xl font-bold pt-2">{name?.value.value}</h1>;
}

function Members() {
  let members = useFact<"activity/member">("aev", "activity/member");
  let { data: auth } = useAuthentication();
  let isMember = !!useFact(
    "ave",
    auth && auth.loggedIn ? `activity/member-${auth.token.studio}` : ""
  )[0];
  let activityURL = useActivityURL();
  return (
    <Disclosure>
      <Disclosure.Button>Members ({members.length})</Disclosure.Button>
      <Disclosure.Panel>
        {members.map((m) => (
          <Member key={m.entity} entityID={m.entity} />
        ))}
        {!isMember ? null : (
          <button
            onClick={async () => {
              let res = await fetch(`${activityURL}/share`, {
                credentials: "include",
              });
              if (res.status === 200) {
                let data: { code: string } = await res.json();
                await navigator.clipboard.writeText(
                  `${document.location.href}/join?code=${data.code}`
                );
              }
            }}
          >
            add member
          </button>
        )}
      </Disclosure.Panel>
    </Disclosure>
  );
}

function Member(props: { entityID: string }) {
  let name = useFact("eav", `${props.entityID}-member/name`)[0];
  return <div>{name?.value.value}</div>;
}

function DeckList() {
  let entities = useFact("aev", "deck").sort(sortByPosition("aev"));
  return (
    <div className="flex flex-col gap-4">
      <div className="p-5">
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
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        <h3 className="text-2xl px-5">{name[0].value.value}</h3>
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
            width: `100%`,
          }}
          className="bg-lightBG shadow-inner py-8 pb-2 max-h overflow-hidden"
        >
          <div
            style={{
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
