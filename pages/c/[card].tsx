import { useRouter } from "next/router";
import React, { useRef, useState } from "react";
import { useFact, useReplicache } from "../../src/useReplicache";
import { sortByPosition } from "../../src/utils";
import { Section } from "../../src/components/Section";
import { AddSection } from "src/components/NewSection";
import { generateKeyBetween } from "src/fractional-indexing";

export default function CardPage() {
  let router = useRouter();
  let entityID = router.query.card as string;
  return (
    <div className="grid gap-4">
      <Title entityID={entityID} />
      <TextContent entityID={entityID} />
      <Sections entityID={entityID} />
    </div>
  );
}

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
