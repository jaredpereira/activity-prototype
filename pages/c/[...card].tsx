import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import { useFact, useReplicache } from "src/useReplicache";
import { sortByPosition } from "src/utils";
import { Section } from "src/components/Section";
import { AddSection } from "src/components/NewSection";
import { generateKeyBetween } from "src/fractional-indexing";
import { Card } from "src/components/Card";
import { DeckFrame } from "src/components/DeckFrame";

export default function DeckPage() {
  let router = useRouter();
  console.log(router.query)
  let path = router.query.card as string[];
  if (!path) return <div>loading</div>
  return <Deck entityID={path[0]} section={path[1]} />

}

const Deck = (props: { entityID: string, section?: string }) => {
  let [position, setPosition] = useState(0);
  let router = useRouter();
  let Name = useFact("eav", `${props.entityID}-name`)[0];
  let queryPosition = router.query.position as string;
  let Cards = useFact("eav", `${props.entityID}-contains`).sort(
    sortByPosition("eav")
  );

  let deck = !!useFact("eav", `${props.entityID}-deck`)[0]
  useEffect(() => {
    let index = Cards.findIndex((c) => c.value.value === queryPosition);
    if (index !== -1) setPosition(index);
  }, [Cards, queryPosition]);

  if (!deck) return <CardPage entityID={props.entityID} />

  return (
    <div>
      <h3 className="text-4xl">{Name?.value.value}</h3>
      <DeckFrame
        position={position}
        length={Cards.length}
        setPosition={(pos) => {
          let route = new URL(window.location.href);
          let card = Cards[pos];
          route.searchParams.set("position", card.value.value as string);
          router.replace(route, undefined, { shallow: true });
        }}
      >
        {!!Cards[position] ? (
          <CardPage entityID={Cards[position].value.value as string} />
        ) : (
          ""
        )}
      </DeckFrame>
    </div>
  );
}

function CardPage(props: { entityID: string }) {
  return (
    <div className="grid gap-4">
      <Title entityID={props.entityID} />
      <TextContent entityID={props.entityID} />
      <Sections entityID={props.entityID} />
      <References entityID={props.entityID} />
    </div>
  );
}


const References = (props: { entityID: string }) => {
  const references = useFact("vae", props.entityID).filter(
    (f) => f.attribute !== "contains"
  );
  return (
    <div>
      <hr />
      <h2 className="text-2xl">References</h2>
      {references.map((f) => (
        <div key={f.id}>
          <h3>{f.attribute}</h3>
          <Card href={`/c/${f.entity}`} entityID={f.entity} />
        </div>
      ))}
    </div>
  );
};

const Title = (props: { entityID: string }) => {
  let title = useFact("eav", `${props.entityID}-name`)[0];
  let inputEl = useRef<null | HTMLInputElement>(null);
  let rep = useReplicache();
  return (
    <input
      ref={inputEl}
      className="text-2xl"
      value={(title?.value.value as string) || ""}
      placeholder="Untitled"
      onChange={async (e) => {
        let start = e.currentTarget.selectionStart,
          end = e.currentTarget.selectionEnd;
        await rep.mutate.assertFact({
          entity: props.entityID,
          attribute: "name",
          value: { type: "string", value: e.currentTarget.value },
          positions: title?.positions || {},
        });
        inputEl.current?.setSelectionRange(start, end);
      }}
    />
  );
};

const TextContent = (props: { entityID: string }) => {
  let rep = useReplicache();
  let textarea = useRef<HTMLTextAreaElement | null>(null);
  let content = useFact("eav", `${props.entityID}-textContent`)[0];

  return (
    <textarea
      ref={textarea}
      className="text-xl border-2 p-2"
      spellCheck={false}
      value={(content?.value.value as string) || ""}
      onChange={async (e) => {
        let start = e.currentTarget.selectionStart,
          end = e.currentTarget.selectionEnd;
        await rep.mutate.assertFact({
          entity: props.entityID,
          attribute: "textContent",
          value: { type: "string", value: e.currentTarget.value },
          positions: content?.positions || {},
        });
        textarea.current?.setSelectionRange(start, end);
      }}
    />
  );
};

const Sections = (props: { entityID: string }) => {
  let [newSection, setNewSection] = useState("");
  let rep = useReplicache();
  let sections = useFact("eav", `${props.entityID}-section`).sort(
    sortByPosition("eav")
  );

  return (
    <div className="grid gap-4">
      {sections.map((section) => (
        <Section
          new={newSection === section.value.value}
          key={section.id}
          entityID={props.entityID}
          section={section.value.value as string}
        />
      ))}
      <AddSection
        createNewSection={async (args) => {
          setNewSection(args.name);
          await rep.mutate.addNewSection({
            name: args.name,
            type: args.type,
            firstValue: args.initialValue,
            cardEntity: props.entityID,
            position: generateKeyBetween(
              sections[sections.length - 1]?.positions.eav || null,
              null
            ),
          });
        }}
      />
    </div>
  );
};
