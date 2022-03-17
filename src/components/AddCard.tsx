import { useRouter } from "next/router";
import React from "react";
import { NewCard } from "src/Icons";
import { ulid } from "src/ulid";
import { useMutation, useReplicache } from "src/useReplicache";

export const AddCardButton = (props: {
  entityID: string;
  position: string;
}) => {
  let router = useRouter();
  let { mutate, authorized } = useMutation();
  const addCard = async () => {
    let newCard = ulid();
    await mutate("addCardToSection", {
      newCard,
      entity: props.entityID,
      section: "contains",
      position: props.position,
    });
    router.push(
      `/s/${router.query.studio}/a/${router.query.activity}/c/${props.entityID}?position=${newCard}`
    );
  };
  return (
    <button
      disabled={!authorized}
      onClick={() => addCard()}
      className="text-accent-blue w-fit font-bold grid items-center grid-flow-col gap-1"
    >
      <NewCard className="inline" /> Add Card!
    </button>
  );
};
