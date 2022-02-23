import { ReadTransaction, WriteTransaction } from "replicache";
import { FactInput, Fact } from ".";
import { ulid } from "../src/ulid";
import { Schema, serverAssertFact, serverUpdateFact } from "./writes";

type Mutation<T> = (args: T) => {
  client: (tx: WriteTransaction) => Promise<any>;
  server: (tx: DurableObjectStorage) => Promise<any>;
};

export const processFact = (
  id: string,
  f: FactInput | Fact,
  schema: Schema
) => {
  let indexes: { eav: string; ave?: string; vae?: string; aev: string } = {
    eav: `${f.entity}-${f.attribute}-${id}`,
    aev: `${f.attribute}-${f.entity}-${id}`,
    ave: schema.unique ? `${f.attribute}-${f.value.value}` : "",
  };

  return { ...f, indexes };
};

export const clientGetSchema = async (
  tx: ReadTransaction,
  attributeName: string
) => {
  let attribute = (
    await tx
      .scan({ indexName: "ave", prefix: `name-${attributeName}` })
      .values()
      .toArray()
  )[0] as Fact;
  if (!attribute) return;

  let attributeFacts = (await tx
    .scan({ indexName: "eav", prefix: `${attribute.entity}` })
    .values()
    .toArray()) as Fact[];

  let schema: Schema = {
    type:
      (attributeFacts.find((f) => f.attribute === "type")?.value
        .value as Fact["value"]["type"]) || "string",
    unique: !!attributeFacts.find((f) => f.attribute === "unique")?.value
      .value as boolean,
    cardinality:
      (attributeFacts.find((f) => f.attribute === "cardinality")?.value
        .value as "one" | "many") || "one",
  };
  return schema;
};

const clientAssert = async (tx: WriteTransaction, f: FactInput) => {
  let schema = await clientGetSchema(tx, f.attribute);
  if (!schema) throw new Error(`no attribute ${f.attribute} found`);

  let newID = ulid();
  if (schema.cardinality === "one") {
    let existingFact = (await tx
      .scan({ indexName: `eav`, prefix: `${f.entity}-${f.attribute}` })
      .entries()
      .toArray()) as [[string, string], Fact][];

    if (existingFact[0]) {
      newID = existingFact[0][1].id;
    }
  }

  let data = processFact(newID, f, schema);
  return tx.put(newID, { ...data, id: newID });
};

const clientRetract = async (tx: WriteTransaction, factID: string) => {
  tx.del(factID);
};

const createNewCard: Mutation<{
  title: string;
  entity: string;
  position: string;
}> = (args) => {
  let fact = {
    positions: { aev: args.position },
    entity: args.entity,
    attribute: "title",
    value: { type: "string", value: args.title },
  } as const;
  return {
    client: async (tx) => {
      return clientAssert(tx, fact);
    },
    server: async (tx) => {
      await serverAssertFact(tx, fact);
    },
  };
};

const assertFact: Mutation<FactInput> = (args) => {
  return {
    client: async (tx) => clientAssert(tx, args),
    server: async (tx) => {
      await serverAssertFact(tx, args);
    },
  };
};

const updatePosition: Mutation<{
  factID: string;
  positions: { [k: string]: string };
}> = (args) => {
  return {
    client: async (tx) => {
      let fact = (await tx.get(args.factID)) as Fact | undefined;
      if (!fact) return;
      tx.put(args.factID, {
        ...fact,
        positions: { ...fact.positions, ...args.positions },
      });
    },
    server: async (tx) => {
      serverUpdateFact(tx, args.factID, { positions: args.positions });
    },
  };
};

const deleteCard: Mutation<{ cardID: string }> = (args) => {
  return {
    client: async (tx) => {
      let allFacts = await tx
        .scan({ indexName: `eav`, prefix: args.cardID })
        .keys()
        .toArray();
      allFacts.forEach((k) => {
        clientRetract(tx, k[1]);
      });
    },
    server: async (tx) => {
      let allFacts = await tx.list<Fact>({ prefix: `ea-${args.cardID}` });
      allFacts.forEach((f) => {
        serverUpdateFact(tx, f.id, { retracted: true });
      });
    },
  };
};

const addCardToSection: Mutation<{
  entity: string;
  section: string;
  position: string;
  newCard: string;
}> = (args) => {
  return {
    client: async (tx) => {
      return clientAssert(tx, {
        entity: args.entity,
        attribute: args.section,
        value: { type: "reference", value: args.newCard },
        positions: { eav: args.position },
      });
    },
    server: async (tx) => {
      return serverAssertFact(tx, {
        entity: args.entity,
        attribute: args.section,
        value: { type: "reference", value: args.newCard },
        positions: { eav: args.position },
      });
    },
  };
};

export const Mutations = {
  createNewCard,
  addCardToSection,
  assertFact,
  deleteCard,
  updatePosition,
};
