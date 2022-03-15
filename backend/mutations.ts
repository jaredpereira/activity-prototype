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
import { AttributeName } from "./query";

type Mutation<T> = (args: T) => {
  client: (tx: WriteTransaction) => Promise<any>;
  server: (tx: DurableObjectStorage) => Promise<any>;
};

export function processFact<A extends AttributeName>(
  id: string,
  f: FactInput<A> | Fact<A>,
  schema: Schema
) {
  let indexes: { eav: string; ave?: string; vae?: string; aev: string } = {
    eav: `${f.entity}-${f.attribute}-${id}`,
    aev: `${f.attribute}-${f.entity}-${id}`,
    ave: schema.unique ? `${f.attribute}-${f.value.value}` : "",
    vae: schema.type === `reference` ? `${f.value.value}-${f.attribute}` : "",
  };
  return { ...f, indexes };
}

export const clientGetSchema = async (
  tx: ReadTransaction,
  attributeName: string
) => {
  let attribute = (
    await tx
      .scan({ indexName: "ave", prefix: `name-${attributeName}` })
      .values()
      .toArray()
  )[0] as Fact<AttributeName>;
  if (!attribute) return;

  let attributeFacts = (await tx
    .scan({ indexName: "eav", prefix: `${attribute.entity}` })
    .values()
    .toArray()) as Fact<AttributeName>[];

  let schema: Schema = {
    type:
      (attributeFacts.find((f) => f.attribute === "type")?.value
        .value as Fact<"type">["value"]["type"]) || "string",
    unique: !!attributeFacts.find((f) => f.attribute === "unique")?.value
      .value as boolean,
    cardinality:
      (attributeFacts.find((f) => f.attribute === "cardinality")?.value
        .value as "one" | "many") || "one",
  };
  return schema;
};

async function clientAssert<A extends AttributeName>(
  tx: WriteTransaction,
  f: FactInput<A>
) {
  let schema = await clientGetSchema(tx, f.attribute);
  if (!schema) throw new Error(`no attribute ${f.attribute} found`);

  let newID = ulid();
  if (schema.cardinality === "one") {
    let existingFact = (await tx
      .scan({ indexName: `eav`, prefix: `${f.entity}-${f.attribute}` })
      .entries()
      .toArray()) as [[string, string], Fact<A>][];

    if (existingFact[0]) {
      newID = existingFact[0][1].id;
    }
  }

  let data = processFact(newID, f, schema);
  return tx.put(newID, { ...data, id: newID });
}

const clientRetract = async (tx: WriteTransaction, factID: string) => {
  tx.del(factID);
};

const createNewCard: Mutation<{
  title: string;
  entity: string;
  position: string;
}> = (args) => {
  let fact: FactInput<"title"> = {
    positions: { aev: args.position },
    entity: args.entity,
    attribute: "title",
    value: { type: "string", value: args.title },
  };
  return {
    client: async (tx) => {
      return clientAssert(tx, fact);
    },
    server: async (tx) => {
      await serverAssertFact(tx, fact);
    },
  };
};

const assertFact: Mutation<FactInput<AttributeName>> = (args) => {
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
      let fact = (await tx.get(args.factID)) as Fact<AttributeName> | undefined;
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
      let allFacts = await tx.list<Fact<AttributeName>>({
        prefix: `ea-${args.cardID}`,
      });
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
  let fact = {
    entity: args.entity,
    attribute: args.section as "arbitrarySectionReferenceType",
    value: { type: "reference", value: args.newCard },
    positions: { eav: args.position },
  } as const;
  return {
    client: async (tx) => {
      return clientAssert(tx, fact);
    },
    server: async (tx) => {
      return serverAssertFact(tx, fact);
    },
  };
};

const addNewSection: Mutation<{
  newEntity: string;
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
        await Promise.all([
          clientAssert(tx, {
            entity: args.newEntity,
            attribute: "name",
            value: { type: "string", value: args.name },
            positions: {},
          }),
          clientAssert(tx, {
            entity: args.newEntity,
            attribute: "type",
            value: {
              type: "union",
              value: args.type === "cards" ? "reference" : "string",
            },
            positions: {},
          }),
          clientAssert(tx, {
            entity: args.newEntity,
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
        attribute: args.name as
          | "arbitrarySectionReferenceType"
          | "arbitrarySectionStringType",
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
        await Promise.all([
          serverAssertFact(tx, {
            entity: args.newEntity,
            attribute: "name",
            value: { type: "string", value: args.name },
            positions: {},
          }),
          serverAssertFact(tx, {
            entity: args.newEntity,
            attribute: "type",
            value: {
              type: "union",
              value: args.type === "cards" ? "reference" : "string",
            },
            positions: {},
          }),
          serverAssertFact(tx, {
            entity: args.newEntity,
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
        attribute: args.name as
          | "arbitrarySectionReferenceType"
          | "arbitrarySectionStringType",
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

const joinActivity: Mutation<{ user: string; newEntity: string }> = (args) => {
  return {
    client: async (tx) => {
      return clientAssert(tx, {
        entity: args.newEntity,
        attribute: "activity/member",
        positions: {},
        value: {
          type: "string",
          value: args.user,
        },
      });
    },
    server: async (tx) => {
      return serverAssertFact(tx, {
        entity: args.newEntity,
        attribute: "activity/member",
        positions: {},
        value: {
          type: "string",
          value: args.user,
        },
      });
    },
  };
};

export const Mutations = {
  createNewCard,
  addNewDeck,
  addNewSection,
  addCardToSection,
  joinActivity,
  assertFact,
  deleteCard,
  updatePosition,
};
