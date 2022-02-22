import { useState } from "react";
import { useSubscribe } from "replicache-react";
import { Fact } from "../backend";
import { generateKeyBetween } from "../src/fractional-indexing";
import { useReplicache } from "../src/useReplicache";
import { sortByPosition } from "../src/utils";

export default () => {
  let rep = useReplicache();
  let sections = useSubscribe<Fact[]>(
    rep,
    async (tx) => {
      return tx
        .scan({ indexName: "ave", prefix: "name" })
        .values()
        .toArray() as Promise<Fact[]>;
    },
    [],
    []
  );
  return (
    <div className="grid gap-2">
      <NewSectionForm
        lastSection={
          sections.sort(sortByPosition)[sections.length - 1]?.position || ""
        }
      />
      <h3>Sections!</h3>
      {sections.map((s) => (
        <Section key={s.id} entityID={s.entity} />
      ))}
    </div>
  );
};

const Section = (props: { entityID: string }) => {
  let rep = useReplicache();
  let data = useSubscribe(
    rep,
    async (tx) => {
      return tx
        .scan({ indexName: "eav", prefix: `${props.entityID}` })
        .values()
        .toArray() as Promise<Fact[]>;
    },
    [],
    []
  );
  return (
    <div className="p-2 border-2 w-64">
      <h4 className="text-xl">
        {data.find((f) => f.attribute === "name")?.value.value}
      </h4>
      cardinality:{" "}
      {data.find((f) => f.attribute === "cardinality")?.value.value || "one"}
      <br />
      type: {data.find((f) => f.attribute === "type")?.value.value}
    </div>
  );
};

const NewSectionForm = (props: { lastSection: string }) => {
  let rep = useReplicache();
  let [data, setData] = useState({
    name: "",
    cardinality: "one" as "one" | "many",
    unique: false,
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    rep.mutate.createNewSection({
      ...data,
      position: generateKeyBetween(props.lastSection, null),
    });
  };

  return (
    <form className="border-2 p-2" onSubmit={onSubmit}>
      <h3 className="text-xl">New Section Type </h3>
      Name:{" "}
      <input
        className="border-2"
        value={data.name}
        onChange={(e) => setData({ ...data, name: e.currentTarget.value })}
      />
      <br />
      Many?{" "}
      <input
        type="checkbox"
        checked={data.cardinality === "many"}
        onChange={(e) =>
          setData({
            ...data,
            cardinality: e.currentTarget.checked ? "many" : "one",
          })
        }
      />
      <br />
      Unique?{" "}
      <input
        type="checkbox"
        checked={data.unique}
        onChange={(e) => setData({ ...data, unique: e.currentTarget.checked })}
      />
      <br />
      <button type="submit">submit</button>
    </form>
  );
};
