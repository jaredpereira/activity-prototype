import { Fact, FactInput, indexes } from "./";
import { ulid } from "../src/ulid";
type Result =
  | { error: false; result: Fact }
  | { error: true; message: string; data?: any };

export type Schema = {
  cardinality: "one" | "many";
  unique: boolean;
  type: Fact["value"]["type"];
};
async function getAttributeSchema(
  tx: DurableObjectStorage,
  attribute: string
): Promise<Schema | undefined> {
  let attributeFact = await tx.get<Fact>(`av-name-${attribute}`);
  if (!attributeFact) return;

  let attributeData = [
    ...(
      await tx.list<Fact>({
        prefix: `ea-${attributeFact.entity}`,
      })
    ).values(),
  ];
  let cardinality: "one" | "many" = "one";
  let unique: boolean = false;
  let type: Fact["value"]["type"] = "string";
  let cardinalityFact = attributeData.find(
    (f) => f.attribute === "cardinality"
  );
  if (cardinalityFact)
    cardinality = cardinalityFact.value.value as "one" | "many";
  let uniqueFact = attributeData.find((f) => f.attribute === "unique");
  if (uniqueFact) unique = uniqueFact.value.value as boolean;
  let typeFact = attributeData.find((f) => f.attribute === "type");
  if (typeFact) type = typeFact.value.value as Fact["value"]["type"];

  return {
    cardinality,
    unique,
    type,
  };
}

export async function serverAssertFact(
  tx: DurableObjectStorage,
  factInput: FactInput
): Promise<Result> {
  let schema = await getAttributeSchema(tx, factInput.attribute);
  if (!schema)
    return {
      error: true,
      message: `Attribute ${factInput.attribute} does not exist`,
    };

  let id: string = ulid();
  if (schema.cardinality === "one") {
    let existingFact = [
      ...(await tx.list<Fact>({
        prefix: `ea-${factInput.entity}-${factInput.attribute}`,
      })),
    ][0]?.[1];
    if (existingFact) {
      console.log("found existing fact", { existingFact });
      id = existingFact.id;
    }
  }

  if (schema.unique) {
    if (factInput.value.type !== "string")
      return {
        error: true,
        message: "Cannot have unique index on non string type",
      };
    let existingValue = await tx.get<Fact>(
      indexes.av(factInput.attribute, factInput.value.value)
    );
    if (existingValue && !existingValue.retracted)
      return {
        error: true,
        message: "fact already exists with that attribute and value",
        data: existingValue,
      };
  }
  if (schema.type !== factInput.value.type)
    return {
      error: true,
      message: `provided type ${factInput.value.type} does not match attribute type ${schema.type}`,
    };

  let fact = { ...factInput, id, lastUpdated: Date.now().toString() };
  writeFactToStorage(tx, fact, {
    unique: schema.unique,
    cardinality: schema.cardinality,
  });
  return { error: false, result: fact };
}

export async function serverUpdateFact(
  tx: DurableObjectStorage,
  fact: string,
  data: Partial<Pick<Fact, "positions" | "retracted">>
): Promise<Result> {
  let existingFact = await tx.get<Fact>(`factID-${fact}`);
  if (!existingFact)
    return { error: true, message: `No fact with id ${fact} exists` };

  let schema = await getAttributeSchema(tx, existingFact.attribute);
  if (!schema)
    return {
      error: true,
      message: `Fact exists but with a no longer valid attribute: ${existingFact.attribute}`,
    };

  let lastUpdated = Date.now().toString();
  let newFact: Fact = {
    ...existingFact,
    ...data,
    positions: { ...existingFact.positions, ...data.positions },
    lastUpdated,
  };
  writeFactToStorage(tx, newFact, {
    unique: schema.unique,
    cardinality: schema.cardinality,
  });

  return { error: false, result: newFact };
}

// This should only be called with already validated data, basically you are
// just telling it what indexes need to be updated
// This data is critical for pull, it's annoying its in this random file
export async function writeFactToStorage(
  tx: DurableObjectStorage,
  f: Fact,
  schema: { unique: boolean; cardinality: "many" | "one" }
) {
  let existingFact = await tx.get<Fact>(indexes.factID(f.id));
  if (existingFact) {
    tx.delete(indexes.factID(f.id));
    tx.delete(indexes.ea(existingFact.entity, existingFact.attribute, f.id));
    tx.delete(indexes.ti(existingFact.lastUpdated, f.id));
    if (schema.unique)
      tx.delete(
        indexes.av(existingFact.attribute, existingFact.value.value as string)
      );
  }

  tx.put(indexes.factID(f.id), f);
  tx.put(indexes.ea(f.entity, f.attribute, f.id), f);
  tx.put(indexes.ti(f.lastUpdated, f.id), { ...f, meta: { schema } });
  if (schema.unique)
    tx.put(indexes.av(f.attribute, f.value.value as string), f);
}
