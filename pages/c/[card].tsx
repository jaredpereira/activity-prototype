import { useRouter } from "next/router";
import { useRef } from "react";
import { useSubscribe } from "replicache-react";
import { clientGetSchema } from "../../backend/mutations";
import { useFact, useReplicache } from "../../src/useReplicache";
import { sortByPosition } from "../../src/utils";
import { Card } from "../../src/components/Card";

export default function CardPage() {
  let router = useRouter();
  let entityID = router.query.card as string;
  return (
    <div>
      <Title entityID={entityID} />
      <TextContent entityID={entityID} />
      <Sections entityID={entityID} />
    </div>
  );
}

const Title = (props: { entityID: string }) => {
  let title = useFact("eav", `${props.entityID}-name`)[0];
  return <h3 className="text-2xl">{title?.value.value || "Untitled"}</h3>;
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
    </ul>
  );
};

const Section = (props: { entityID: string; section: string }) => {
  let rep = useReplicache();
  let facts = useFact("eav", `${props.entityID}-${props.section}`);
  let schema = useSubscribe(
    rep,
    async (tx) => {
      return (await clientGetSchema(tx, props.section)) || null;
    },
    null,
    []
  );

  return (
    <div>
      <h3 className="text-xl">{props.section}</h3>
      {schema?.type === "reference"
        ? facts.map((m) => <Card entityID={m.value.value as string} />)
        : facts.map((m) => <div>{m.value.value}</div>)}
    </div>
  );
};
