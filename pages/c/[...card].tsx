import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useFact } from "src/useReplicache";
import { sortByPosition } from "src/utils";
import { CardView } from "src/components/CardView";
import { Arrow, Cross, NewCard } from "src/Icons";
import Link from "next/link";

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

  if (!deck && !props.section) return <CardView entityID={props.entityID} />;

  return (
    <div className="h-full flex flex-col items-stretch relative pt-8">
      <div className="px-4 grid grid-flow-col items-center w-full pr-10 pb-2">
        <h4 className="uppercase text-accent-blue font-bold">{`${Name?.value.value
          }${props.section ? `/${props.section}` : ""}`}</h4>
        <Link href="/">
          <a className="text-grey-15 justify-self-end">
            <Cross />
          </a>
        </Link>
      </div>
      <div
        style={{ gridAutoColumns: "calc(100vw - 3rem)" }}
        className={`overflow-x-scroll grid grid-flow-col snap-x snap-mandatory h-full gap-4 px-4 no-scrollbar`}
      >
        {Cards.map((c) => {
          return (
            <CardView
              entityID={c.value.value as string}
              onSelect={(ref: HTMLDivElement) => {
                ref.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
                smooth = false;
              }}
              selectedCard={queryPosition}
            />
          );
        })}
      </div>
      <CardCounter
        position={position}
        length={Cards.length}
        setPosition={(pos) => {
          let route = new URL(window.location.href);
          let card = Cards[pos];
          smooth = true;
          route.searchParams.set("position", card.value.value as string);
          console.log(document.getElementById(card.value.value as string));
          document
            .getElementById(card.value.value as string)
            ?.scrollIntoView({ behavior: "smooth" });
          router.replace(route, undefined, { shallow: true });
        }}
      />
    </div>
  );
};

const CardCounter = (props: {
  position: number;
  length: number;
  setPosition: (n: number) => void;
}) => {
  return (
    <div className="grid grid-flow-col gap-1 bg-background pb-3 w-full pt-2 px-5">
      <div className="w-fit grid grid-flow-col gap-2">
        <button
          onClick={() => {
            if (props.position > 0) props.setPosition(props.position - 1);
          }}
        >
          <Arrow left className="text-accent-blue" />
        </button>
        <div className="text-grey-35 font-bold grid content-center">{`${props.position + 1
          } / ${props.length}`}</div>
        <button
          onClick={() => {
            if (props.position < props.length - 1)
              props.setPosition(props.position + 1);
          }}
        >
          <Arrow right className="text-accent-blue" />
        </button>
      </div>
      <div className="justify-self-end text-accent-blue w-fit font-bold grid items-center grid-flow-col gap-1">
        <NewCard className="inline" /> Add Card!
      </div>
    </div>
  );
};
