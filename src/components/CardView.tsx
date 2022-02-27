import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import { generateKeyBetween } from "src/fractional-indexing";
import { useReplicache, useFact } from "src/useReplicache";
import { sortByPosition } from "src/utils";
import Textarea from "./AutosizeTextarea";
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
    let timeout: number | undefined = undefined;
    let observer = new IntersectionObserver(
      (e) => {
        if (!e[0]?.isIntersecting && timeout) {
          clearTimeout(timeout);
          timeout = undefined;
        }
        if (e[0]?.isIntersecting) {
          timeout = window.setTimeout(() => {
            let route = new URL(window.location.href);
            if (route.searchParams.get("position") !== props.entityID) {
              route.searchParams.set("position", props.entityID);
              router.replace(route, undefined, { shallow: true });
            }
            timeout = undefined;
          }, 750);
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
        height: "calc(100% - 8px)",
        marginTop: "3px",
        width: "100%",
        overflowY: "scroll",
      }}
      className="grid auto-rows-max gap-4 p-3 snap-center no-scrollbar bg-white border-[1] border-grey-90 rounded-md shadow-drop"
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
  let inputEl = useRef<null | HTMLTextAreaElement>(null);
  let rep = useReplicache();
  return (
    <Textarea
      ref={inputEl}
      className="text-xl text-grey-15 font-bold"
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
    <Textarea
      ref={textarea}
      className="placeholder:italic"
      placeholder="write something..."
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
    <>
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
    </>
  );
};
