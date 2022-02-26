import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import { generateKeyBetween } from "src/fractional-indexing";
import { useReplicache, useFact } from "src/useReplicache";
import { sortByPosition } from "src/utils";
import { Card } from "./Card";
import { AddSection } from "./NewSection";
import { Section } from "./Section";

export function CardView(props: {
  entityID: string;
  selectedCard?: string;
  onSelect?: (e: HTMLDivElement) => void;
}) {
  let ref = useRef<HTMLDivElement>(null);
  let router = useRouter();
  useEffect(() => {
    if (
      props.selectedCard === props.entityID &&
      ref.current &&
      props.onSelect
    ) {
      props.onSelect(ref.current);
    }
  }, [props.entityID, props.selectedCard]);
  useEffect(() => {
    let observer = new IntersectionObserver(
      (e) => {
        if (e[0]?.isIntersecting) {
          let route = new URL(window.location.href);
          route.searchParams.set("position", props.entityID);
          router.replace(route, undefined, { shallow: true });
        }
      },
      { root: null, rootMargin: "0px", threshold: 1.0 }
    );
    setTimeout(() => {
      if (ref.current) observer.observe(ref.current);
    }, 500);
    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, [ref]);
  return (
    <div
      id={props.entityID}
      ref={ref}
      style={{
        height: "100%",
        width: "calc(100vw - 1rem)",
        overflowY: "scroll",
      }}
      className="grid gap-4 px-4 snap-center no-scrollbar"
    >
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
  if (references.length === 0) return null;
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
