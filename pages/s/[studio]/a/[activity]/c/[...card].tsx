import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useFact } from "src/useReplicache";
import { sortByPosition } from "src/utils";
import { CardView } from "src/components/CardView";
import { Arrow, Cross, Shuffle } from "src/Icons";
import Link from "next/link";
import { AddCardButton } from "src/components/AddCard";

export default function DeckPage() {
  let router = useRouter();
  let path = router.query.card as string[];
  if (!path) return <div>loading</div>;
  return <Deck entityID={path[0]} section={path[1]} />;
}

let smooth = false;

const Deck = (props: { entityID: string; section?: string }) => {
  let [position, setPosition] = useState(0);
  let router = useRouter();
  let Name = useFact("eav", `${props.entityID}-name`)[0];
  let queryPosition = router.query.position as string;

  let Cards = useFact(
    "eav",
    props.section
      ? `${props.entityID}-${props.section}`
      : `${props.entityID}-contains`
  ).sort(sortByPosition("eav"));

  let deck = !!useFact("eav", `${props.entityID}-deck`)[0];
  useEffect(() => {
    let index = Cards.findIndex((c) => c.value.value === queryPosition);
    if (index !== -1) setPosition(index);
  }, [Cards, queryPosition]);

  return (
    <div className="h-full flex flex-col items-stretch relative pt-8">
      <div className="px-4 grid grid-flow-col items-center w-full pr-10 pb-2">
        <h4 className="uppercase text-accent-blue font-bold">{`${
          Name?.value.value
        }${props.section ? `/${props.section}` : ""}`}</h4>
        <Link href={`/s/${router.query.studio}/a/${router.query.activity}`}>
          <a className="text-grey-15 justify-self-end">
            <Cross />
          </a>
        </Link>
      </div>
      {!deck && !props.section ? (
        <div className="h-full flex flex-col items-stretch relative p-2">
          <CardView entityID={props.entityID} />
        </div>
      ) : (
        <>
          <div
            style={{ gridAutoColumns: "calc(100vw - 3rem)" }}
            className={`overflow-x-scroll grid grid-flow-col snap-x snap-mandatory h-full gap-4 px-4 no-scrollbar`}
          >
            {Cards.map((c) => {
              return (
                <CardView
                  key={c.value.value as string}
                  entityID={c.value.value as string}
                  onSelect={(ref: HTMLDivElement) => {
                    ref.scrollIntoView({
                      behavior: smooth ? "smooth" : "auto",
                    });
                    smooth = false;
                  }}
                  selectedCard={queryPosition}
                />
              );
            })}
          </div>
          <div className="grid grid-flow-col gap-1 pb-3 pt-2 px-5">
            <CardCounter
              position={position}
              length={Cards.length}
              setPosition={(pos) => {
                let route = new URL(window.location.href);
                let card = Cards[pos];
                smooth = true;
                route.searchParams.set("position", card.value.value as string);
                router.replace(route, undefined, { shallow: true });
              }}
            />
            <div className="justify-items-end grid pt-2">
              <AddCardButton entityID={props.entityID} position="" />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const CardCounter = (props: {
  position: number;
  length: number;
  setPosition: (n: number) => void;
}) => {
  return (
    <div className="w-fit grid grid-flow-col gap-2">
      <button
        onClick={() => {
          if (props.position > 0) props.setPosition(props.position - 1);
        }}
      >
        <Arrow left className="text-accent-blue" />
      </button>
      <div className="text-grey-35 font-bold grid content-center">{`${
        props.position + 1
      } / ${props.length}`}</div>
      <button
        onClick={() => {
          if (props.position < props.length - 1)
            props.setPosition(props.position + 1);
        }}
      >
        <Arrow right className="text-accent-blue" />
      </button>
      <button
        onClick={() => {
          props.setPosition(Math.floor(Math.random() * props.length));
        }}
        className="text-accent-blue content-center grid w-min"
      >
        <Shuffle />
      </button>
    </div>
  );
};
