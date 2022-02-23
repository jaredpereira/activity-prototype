import { useRouter } from "next/router";
import React, { useRef } from "react";
import { useSubscribe } from "replicache-react";
import { ulid } from "src/ulid";
import { clientGetSchema } from "backend/mutations";
import { generateKeyBetween } from "src/fractional-indexing";
import { useFact, useReplicache } from "src/useReplicache";
import { Card } from "src/components/Card";
import { sortByPosition } from "src/utils";

export const Section = (props: { entityID: string; section: string }) => {
  let rep = useReplicache();
  let schema = useSubscribe(
    rep,
    async (tx) => {
      return (await clientGetSchema(tx, props.section)) || null;
    },
    null,
    []
  );

  if (schema?.type === "reference")
    return (
      <MultipleCardSection entityID={props.entityID} section={props.section} />
    );

  return <SingleTextSection {...props} />;
};

const SingleTextSection = (props: { entityID: string; section: string }) => {
  let rep = useReplicache();
  let fact = useFact("eav", `${props.entityID}-${props.section}`)[0];
  let inputEl = useRef<HTMLInputElement | null>(null);

  console.log(fact);

  return (
    <div>
      <h3 className="text-xl"> {props.section} </h3>
      <input
        ref={inputEl}
        className="w-full"
        value={fact?.value.value as string}
        onChange={async (e) => {
          let start = e.currentTarget.selectionStart,
            end = e.currentTarget.selectionEnd;
          await rep.mutate.assertFact({
            entity: props.entityID,
            attribute: props.section,
            value: { type: "string", value: e.currentTarget.value },
            positions: fact?.positions || {},
          });
          inputEl.current?.setSelectionRange(start, end);
        }}
      />
    </div>
  );
};

const MultipleCardSection = (props: { entityID: string; section: string }) => {
  let rep = useReplicache();
  let router = useRouter();
  let facts = useFact("eav", `${props.entityID}-${props.section}`).sort(
    sortByPosition("eav")
  );

  console.log(facts.map((f) => f.positions));

  const addCard = async () => {
    let newCard = ulid();
    await rep.mutate.addCardToSection({
      newCard,
      entity: props.entityID,
      section: props.section,
      position: generateKeyBetween(
        facts[facts.length - 1].positions.eav || null,
        null
      ),
    });
    router.push(`/c/${newCard}`);
  };
  return (
    <div>
      <h3 className="text-xl"> {props.section} </h3>
      <div className="flex flex-row gap-x-4 flex-wrap">
        {facts.map((m) => (
          <Card entityID={m.value.value as string} />
        ))}
        <button onClick={() => addCard()}> add </button>
      </div>
    </div>
  );
};