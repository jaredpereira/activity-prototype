export const DeckFrame: React.FC<{
  position: number;
  length: number;
  setPosition: (n: number) => void;
}> = (props) => {
  return (
    <div>
      <div
        className="border-2 overflow-scroll"
        style={{ height: "80vh", width: `100%` }}
      >
        {props.children}
      </div>
      <CardCounter
        position={props.position}
        length={props.length}
        setPosition={props.setPosition}
      />
    </div>
  );
};

const CardCounter = (props: {
  position: number;
  length: number;
  setPosition: (n: number) => void;
}) => {
  return (
    <div className="grid grid-flow-col gap-1 w-fit">
      <button
        onClick={() => {
          if (props.position > 0) props.setPosition(props.position - 1);
        }}
      >
        prev
      </button>
      <div className="border-2 p-1">{`${props.position + 1} / ${
        props.length
      }`}</div>
      <button
        onClick={() => {
          if (props.position < props.length - 1)
            props.setPosition(props.position + 1);
        }}
      >
        next
      </button>
    </div>
  );
};
