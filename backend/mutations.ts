import { WriteTransaction } from "replicache";
import { FactInput, Fact } from ".";
import { ulid } from "../src/ulid";

type Mutation<T> = (args: T) => {
  client: (tx: WriteTransaction) => Promise<void>;
  server: (tx: DurableObjectStorage) => Promise<void>;
};

export const processFact = (f: FactInput | Fact) => {
  let indexes: { eav: string; ave?: string; vae?: string; aev: string } = {
    eav: `${f.entity}-${f.attribute}`,
    aev: `${f.attribute}-${f.entity}`,
  };
  return { ...f, indexes };
};

const clientAssert = async (tx: WriteTransaction, f: FactInput) => {
  let existingFact = (await tx
    .scan({ indexName: `eav`, prefix: `${f.entity}-${f.attribute}` })
    .entries()
    .toArray()) as [[string, string], Fact][];

  if (!existingFact[0]) await tx.put(ulid(), processFact(f));
  else {
    await tx.put(existingFact[0][0][1], {
      ...existingFact[0][1],
      ...processFact(f),
    });
  }
};

const clientRetract = async (tx: WriteTransaction, factID: string) => {
  tx.del(factID);
};

async function serverAssert(tx: DurableObjectStorage, fact: FactInput) {
  let lastUpdated = Date.now().toString();
  let existingFact = await tx.get<Fact>(`ea-${fact.entity}-${fact.attribute}`);
  let newData: Fact = {
    ...fact,
    // If we don't have an existing value generate a new unique id for this
    // fact. When we have cardinality many attributes this will need to be
    // handled differently
    id: existingFact?.id || ulid(),
    lastUpdated,
  };
  tx.put(`ea-${newData.entity}-${newData.attribute}`, newData);
  tx.put(`ti-${lastUpdated}-${newData.id}`, newData);
  tx.put(`factID-${newData.id}`, newData);
  // this case happens often as multiple assertions to the same fact are
  // executed in the same tick
  if (existingFact && existingFact.lastUpdated !== lastUpdated) {
    // We don't technically need to delete this but might as well!
    tx.delete(`ti-${existingFact.lastUpdated}-${existingFact.id}`);
  }
}

async function serverRetract(tx: DurableObjectStorage, factID: string) {
  let lastUpdated = Date.now().toString();
  let existingFact = await tx.get<Fact>(`factID-${factID}`);
  if (!existingFact) return;
  let newData: Fact = {
    ...existingFact,
    retracted: true,
    lastUpdated,
  };
  tx.put(`ea-${newData.entity}-${newData.attribute}`, newData);
  tx.put(`ti-${lastUpdated}-${newData.id}`, newData);
  tx.put(`factID-${newData.id}`, newData);
  // We don't technically need to delete this but might as well!
  if (existingFact.lastUpdated !== lastUpdated) {
    tx.delete(`ti-${existingFact.lastUpdated}-${existingFact.id}`);
  }
}

async function serverUpdateFact(
  tx: DurableObjectStorage,
  id: string,
  f: Partial<Fact>
) {
  let lastUpdated = Date.now().toString();
  let existingFact = await tx.get<Fact>(`factID-${id}`);
  if (!existingFact) return;
  let newData: Fact = {
    ...existingFact,
    ...f,
    lastUpdated,
  };
  tx.put(`ea-${newData.entity}-${newData.attribute}`, newData);
  tx.put(`ti-${lastUpdated}-${newData.id}`, newData);
  tx.put(`factID-${newData.id}`, newData);
  // We don't technically need to delete this but might as well!
  if (existingFact.lastUpdated !== lastUpdated) {
    tx.delete(`ti-${existingFact.lastUpdated}-${existingFact.id}`);
  }
}

const createNewCard: Mutation<{
  title: string;
  entity: string;
  position: string;
}> = (args) => {
  let fact = {
    position: args.position,
    entity: args.entity,
    attribute: "title",
    value: args.title,
  };
  return {
    client: async (tx) => clientAssert(tx, fact),
    server: async (tx) => serverAssert(tx, fact),
  };
};

const assertFact: Mutation<{
  entity: string;
  position: string;
  attribute: string;
  value: string;
}> = (args) => {
  return {
    client: async (tx) => clientAssert(tx, args),
    server: async (tx) => serverAssert(tx, args),
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
        serverRetract(tx, f.id);
      });
    },
  };
};

export const Mutations = {
  createNewCard,
  assertFact,
  deleteCard,
  updatePosition,
};
