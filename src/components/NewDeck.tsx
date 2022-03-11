import { useState } from "react";
import { NewDeck as NewDeckIcon } from "src/Icons";
import { ulid } from "src/ulid";
import { useReplicache } from "src/useReplicache";

export const NewDeck = (props: { position: string }) => {
  let [state, setState] = useState({ open: false, name: "" });
  let rep = useReplicache();
  if (!state.open)
    return (
      <button
        onClick={() => setState({ ...state, open: true })}
        className="text-accent-blue  border-2 border-accent-blue grid justify-items-center rounded-md py-3 w-full"
      >
        <div className="justify-self-center grid grid-flow-col gap-2 ">
          <NewDeckIcon height="22" /> <span>New Deck</span>
        </div>
      </button>
    );

  const create = () => {
    let newDeck = ulid();
    rep.mutate.addNewDeck({
      name: state.name,
      id: newDeck,
      position: props.position,
    });
    setState({ open: false, name: "" });
  };
  return (
    <div>
      <input
        value={state.name}
        onChange={(e) => setState({ ...state, name: e.currentTarget.value })}
      />
      <button
        onClick={() => {
          create();
        }}
      >
        create
      </button>
    </div>
  );
};
