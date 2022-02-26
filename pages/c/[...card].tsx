import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useFact } from "src/useReplicache";
import { sortByPosition } from "src/utils";
import { CardView } from "src/components/CardView";

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
    <div className="h-full grid grid-rows-[auto,1fr,auto]">
      <h3 className="text-4xl">{`${Name?.value.value}${props.section ? `/${props.section}` : ""
        }`}</h3>

      <div
        className={`border-2 overflow-x-scroll grid grid-flow-col snap-x snap-mandatory h-full pb-8`}
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
    <div
      style={{ bottom: "32px" }}
      className="grid grid-flow-col gap-1 w-fit fixed bg-gray-200"
    >
      <button
        onClick={() => {
          if (props.position > 0) props.setPosition(props.position - 1);
        }}
      >
        prev
      </button>
      <div className="border-2 p-1">{`${props.position + 1} / ${props.length
        }`}</div>
      <button
        onClick={() => {
          if (props.position < props.length - 1)
            props.setPosition(props.position + 1);
        }}
      >
        next
      </button>
    </div>
  );
};
