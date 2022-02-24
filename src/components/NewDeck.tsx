import { useState } from "react";
import { ulid } from "src/ulid";
import { useReplicache } from "src/useReplicache";
export const NewDeck = (props: { position: string }) => {
  let [state, setState] = useState({ open: false, name: "" });
  let rep = useReplicache();
  if (!state.open) return <button onClick={() => setState({ ...state, open: true })}>new deck</button>;

  const create = () => {
    let newDeck = ulid()
    rep.mutate.addNewDeck({ name: state.name, id: newDeck, position: props.position })
    setState({ open: false, name: '' })

  }
  return (
    <div>
      <input
        value={state.name}
        onChange={(e) => setState({ ...state, name: e.currentTarget.value })}
      />
      <button onClick={() => {
        create()
      }}> create</button>
    </div>
  );
};
