import { ReadTransaction, WriteTransaction } from "replicache";
import { generateKeyBetween } from "src/fractional-indexing";
import { FactInput, Fact } from "backend/ActivityDurableObject";
import { ulid } from "../src/ulid";
import {
  Schema,
  serverAssertFact,
  serverGetSchema,
  serverUpdateFact,
} from "./writes";

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
    vae: schema.type === "reference" ? `${f.value.value}-${f.attribute}` : "",
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

const addNewSection: Mutation<{
  cardEntity: string;
  position: string;
  name: string;
  type: "cards" | "text";
  firstValue: string;
}> = (args) => {
  return {
    client: async (tx) => {
      let schema = await clientGetSchema(tx, args.name);
      if (!schema) {
        let newEntity = ulid();
        await Promise.all([
          clientAssert(tx, {
            entity: newEntity,
            attribute: "name",
            value: { type: "string", value: args.name },
            positions: {},
          }),
          clientAssert(tx, {
            entity: newEntity,
            attribute: "type",
            value: {
              type: "union",
              value: args.type === "cards" ? "reference" : "string",
            },
            positions: {},
          }),
          clientAssert(tx, {
            entity: newEntity,
            attribute: "cardinality",
            value: {
              type: "union",
              value: args.type === "cards" ? "many" : "one",
            },
            positions: {},
          }),
        ]);
      }
      await clientAssert(tx, {
        entity: args.cardEntity,
        attribute: "section",
        value: {
          type: "string",
          value: args.name,
        },
        positions: { eav: args.position },
      });

      await clientAssert(tx, {
        entity: args.cardEntity,
        attribute: args.name,
        value: {
          type: args.type === "cards" ? "reference" : "string",
          value: args.firstValue,
        },
        positions:
          args.type === "cards"
            ? {
              eav: generateKeyBetween(null, null),
            }
            : {},
      });
    },
    server: async (tx) => {
      let schema = await serverGetSchema(tx, args.name);
      if (!schema) {
        let newEntity = ulid();
        await Promise.all([
          serverAssertFact(tx, {
            entity: newEntity,
            attribute: "name",
            value: { type: "string", value: args.name },
            positions: {},
          }),
          serverAssertFact(tx, {
            entity: newEntity,
            attribute: "type",
            value: {
              type: "union",
              value: args.type === "cards" ? "reference" : "string",
            },
            positions: {},
          }),
          serverAssertFact(tx, {
            entity: newEntity,
            attribute: "cardinality",
            value: {
              type: "union",
              value: args.type === "cards" ? "many" : "one",
            },
            positions: {},
          }),
        ]);
      }
      await serverAssertFact(tx, {
        entity: args.cardEntity,
        attribute: "section",
        value: {
          type: "string",
          value: args.name,
        },
        positions: { eav: args.position },
      });

      await serverAssertFact(tx, {
        entity: args.cardEntity,
        attribute: args.name,
        value: {
          type: args.type === "cards" ? "reference" : "string",
          value: args.firstValue,
        },
        positions:
          args.type === "cards"
            ? {
              eav: generateKeyBetween(null, null),
            }
            : {},
      });
    },
  };
};

const addNewDeck: Mutation<{ name: string; id: string; position: string }> = (
  args
) => {
  return {
    client: (tx) =>
      Promise.all([
        clientAssert(tx, {
          entity: args.id,
          attribute: "deck",
          value: { type: "flag", value: null },
          positions: { aev: args.position },
        }),
        clientAssert(tx, {
          entity: args.id,
          attribute: "name",
          value: { type: "string", value: args.name },
          positions: {},
        }),
      ]),
    server: (tx) => {
      return Promise.all([
        serverAssertFact(tx, {
          entity: args.id,
          attribute: "deck",
          value: { type: "flag", value: null },
          positions: { aev: args.position },
        }),
        serverAssertFact(tx, {
          entity: args.id,
          attribute: "name",
          value: { type: "string", value: args.name },
          positions: {},
        }),
      ]);
    },
  };
};

export const Mutations = {
  createNewCard,
  addNewDeck,
  addNewSection,
  addCardToSection,
  assertFact,
  deleteCard,
  updatePosition,
};
