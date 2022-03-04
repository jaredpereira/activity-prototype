import { generateNKeysBetween } from "../src/fractional-indexing";
import { ulid } from "../src/ulid";
import { serverAssertFact } from "./writes";

const Sections = {
  section: {
    type: "string",
    unique: false,
    cardinality: "many",
  },
  contains: {
    type: "reference",
    unique: false,
    cardinality: "many",
  },
  deck: {
    type: "flag",
    unique: false,
    cardinality: "one",
  },
  author: {
    type: "string",
    unique: false,
    cardinality: "one",
  },
  notes: {
    type: "string",
    unique: false,
    cardinality: "one",
  },
  quotes: {
    type: "reference",
    unique: false,
    cardinality: "many",
  },
  textContent: {
    type: "string",
    unique: false,
    cardinality: "one",
  },
  activity: {
    type: "string",
    unique: true,
    cardinality: "one",
  },
  external: {
    type: "boolean",
    unique: false,
    cardinality: "one",
  },
  "activity/member": {
    type: "string",
    unique: false,
    cardinality: "one",
  },
  "activity/name": {
    type: "string",
    unique: false,
    cardinality: "one",
  },
};

export const init = async (tx: DurableObjectStorage) => {
  await Promise.all(
    Object.keys(Sections).map(async (s) => {
      let section = Sections[s as keyof typeof Sections];
      let entity = ulid();
      await Promise.all([
        serverAssertFact(tx, {
          entity,
          positions: {},
          attribute: "type",
          value: { type: "union", value: section.type },
        }),

        !section.unique
          ? null
          : serverAssertFact(tx, {
            entity,
            positions: {},
            attribute: "unique",
            value: { type: "boolean", value: section.unique },
          }),

        serverAssertFact(tx, {
          entity,
          positions: {},
          attribute: "name",
          value: { type: "string", value: s },
        }),

        serverAssertFact(tx, {
          entity,
          attribute: "cardinality",
          value: { type: "union", value: section.cardinality },
          positions: {},
        }),
      ]);
    })
  );
};
