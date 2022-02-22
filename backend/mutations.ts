import { WriteTransaction } from "replicache";
import { FactInput, Fact } from ".";
import { generateKeyBetween } from "../src/fractional-indexing";
import { ulid } from "../src/ulid";
import { serverAssertFact, serverUpdateFact } from "./writes";

type Mutation<T> = (args: T) => {
  client: (tx: WriteTransaction) => Promise<void>;
  server: (tx: DurableObjectStorage) => Promise<void>;
};

type Schema = {
  unique: boolean;
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

const clientAssert = async (tx: WriteTransaction, f: FactInput) => {
  let attribute = (
    await tx
      .scan({ indexName: "ave", prefix: `name-${f.attribute}` })
      .values()
      .toArray()
  )[0] as Fact | undefined;
  if (!attribute) throw new Error(`no attribute ${f.attribute} found`);

  let attributeFacts = (await tx
    .scan({ indexName: "eav", prefix: `${attribute.entity}-unique` })
    .values()
    .toArray()) as Fact[];

  let schema = {
    unique: !!attributeFacts.find((f) => f.attribute === "unique")?.value
      .value as boolean,
    cardinality:
      (attributeFacts.find((f) => f.attribute === "cardinality")?.value
        .value as "one" | "many") || "one",
  };

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
    position: args.position,
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

const updatePosition: Mutation<{ factID: string; position: string }> = (
  args
) => {
  return {
    client: async (tx) => {
      let fact = (await tx.get(args.factID)) as Fact | undefined;
      if (!fact) return;
      tx.put(args.factID, {
        ...fact,
        position: args.position,
      });
    },
    server: async (tx) => {
      serverUpdateFact(tx, args.factID, { position: args.position });
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

const createNewSection: Mutation<{
  unique: boolean;
  position: string;
  cardinality: "one" | "many";
  name: string;
}> = (args) => {
  return {
    client: async (tx) => {
      let entity = ulid();
      await Promise.all([
        clientAssert(tx, {
          position: args.position,
          entity,
          attribute: "name",
          value: { type: "string", value: args.name },
        }),
        clientAssert(tx, {
          entity,
          position: "a",
          attribute: "unique",
          value: { type: "boolean", value: args.unique },
        }),
        clientAssert(tx, {
          entity,
          position: "c",
          attribute: "cardinality",
          value: { type: "string", value: args.cardinality },
        }),
      ]);
    },
    server: async (tx) => {
      let entity = ulid();
      await Promise.all([
        serverAssertFact(tx, {
          position: args.position,
          entity,
          attribute: "name",
          value: { type: "string", value: args.name },
        }),
        serverAssertFact(tx, {
          entity,
          position: generateKeyBetween(null, null),
          attribute: "unique",
          value: { type: "boolean", value: args.unique },
        }),
        console.log(
          serverAssertFact(tx, {
            entity,
            position: generateKeyBetween(null, null),
            attribute: "cardinality",
            value: { type: "union", value: args.cardinality },
          })
        ),
      ]);
    },
  };
};

export const Mutations = {
  createNewCard,
  assertFact,
  deleteCard,
  updatePosition,
  createNewSection,
};
