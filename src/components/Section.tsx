import { useRouter } from "next/router";
import React, { useRef } from "react";
import { useSubscribe } from "replicache-react";
import { ulid } from "src/ulid";
import { clientGetSchema } from "backend/mutations";
import { generateKeyBetween } from "src/fractional-indexing";
import { useFact, useReplicache } from "src/useReplicache";
import { Card } from "src/components/Card";
import { sortByPosition } from "src/utils";
import Textarea from "./AutosizeTextarea";
import { More } from "src/Icons";
import { Menu } from "@headlessui/react";

export const Section = (props: {
  entityID: string;
  section: string;
  new?: boolean;
}) => {
  let rep = useReplicache();
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
      <div className="grid grid-flow-col items-center">
        <h3 className="text-xl"> {props.section} </h3>
        <Options />
      </div>
      {schema?.type === "reference" ? (
        <MultipleCardSection
          entityID={props.entityID}
          section={props.section}
        />
      ) : (
        <SingleTextSection {...props} />
      )}
    </div>
  );
};

const Options = () => {
  return (
    <Menu as="div" className="text-right">
      <Menu.Button>
        <More className="justify-self-end" />
      </Menu.Button>
      <Menu.Items className="absolute w-52 right-12 divide-y divide-grey-80 border-[1px] p-4 border-grey-80 bg-white rounded-md shadow-lg focus:outline-none z-10 text-right">
        <Menu.Item>
          {({ active }) => (
            <div className={`p-3 text-grey-35 ${active && "bg-blue-500 p-3"}`}>
              Remove from Deck
            </div>
          )}
        </Menu.Item>
        <Menu.Item>
          {({ active }) => (
            <div className={`p-3 text-accent-red ${active && "bg-blue-500"}`}>
              Delete Forever
            </div>
          )}
        </Menu.Item>
      </Menu.Items>
    </Menu>
  );
};

const SingleTextSection = (props: {
  entityID: string;
  section: string;
  new?: boolean;
}) => {
  let rep = useReplicache();
  let fact = useFact("eav", `${props.entityID}-${props.section}`)[0];
  let inputEl = useRef<HTMLTextAreaElement | null>(null);

  return (
    <Textarea
      autoFocus={props.new}
      ref={inputEl}
      className="w-full"
      value={(fact?.value.value as string) || ""}
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
  );
};

const MultipleCardSection = (props: { entityID: string; section: string }) => {
  let rep = useReplicache();
  let router = useRouter();
  let facts = useFact("eav", `${props.entityID}-${props.section}`).sort(
    sortByPosition("eav")
  );

  const onAdd = async (id: string) => {
    await rep.mutate.addCardToSection({
      newCard: id,
      entity: props.entityID,
      section: props.section,
      position: generateKeyBetween(
        facts[facts.length - 1]?.positions.eav || null,
        null
      ),
    });
    router.push(`/c/${props.entityID}/${props.section}?position=${id}`);
  };
  return (
    <div className="flex flex-row gap-2 flex-wrap">
      {facts.map((m) => (
        <Card
          key={m.id}
          href={`/c/${props.entityID}/${props.section}?position=${m.value.value}`}
          entityID={m.value.value as string}
        />
      ))}
      <AddCardButton onAdd={onAdd} />
    </div>
  );
};

export const AddCardButton = (props: { onAdd: (id: string) => void }) => {
  return (
    <button
      className="text-8xl"
      onClick={() => {
        let newCard = ulid();
        props.onAdd(newCard);
      }}
    >
      {" "}
      +{" "}
    </button>
  );
};
