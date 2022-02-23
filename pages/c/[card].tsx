import { useRouter } from "next/router";
import React, { useRef, useState } from "react";
import { useFact, useReplicache } from "../../src/useReplicache";
import { sortByPosition } from "../../src/utils";
import { Section } from "../../src/components/Section";

export default function CardPage() {
  let router = useRouter();
  let entityID = router.query.card as string;
  return (
    <div className="grid">
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
  let sections = useFact("eav", `${props.entityID}-section`).sort(
    sortByPosition("eav")
  );
  return (
    <ul>
      {sections.map((section) => (
        <Section
          key={section.id}
          entityID={props.entityID}
          section={section.value.value as string}
        />
      ))}
      <AddSection entityID={props.entityID} />
    </ul>
  );
};

const AddSection = (props: { entityID: string }) => {
  let [state, setState] = useState({
    open: false,
    type: "text" as "text" | "cards",
  });
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(props);
  };

  if (!state.open)
    return (
      <button onClick={() => setState({ ...state, open: true })}>
        add section
      </button>
    );

  return (
    <form onSubmit={onSubmit}>
      name: <input />
      <br />
      type: <input />
      <button type="submit"> add</button>
      <button onClick={() => setState({ ...state, open: false })}>
        {" "}
        cancel
      </button>
    </form>
  );
};
