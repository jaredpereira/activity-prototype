import { ulid } from "../src/ulid";
import { Value } from "./ActivityDurableObject";
import { Schema, serverAssertFact, writeFactToStorage } from "./writes";

export const BaseAttributes = {
  name: {
    unique: true,
    cardinality: "one",
    type: "string",
  },
  unique: {
    cardinality: "one",
    unique: false,
    type: "boolean",
  },
  type: {
    type: "union",
    unique: false,
    cardinality: "one",
    "union/value": ["string", "union", "reference", "boolean", "flag"],
  },
  "union/value": {
    unique: false,
    type: "string",
    cardinality: "many",
  },
  cardinality: {
    unique: false,
    type: "union",
    cardinality: "one",
    "union/value": ["many", "one"],
  },
} as const;

const DefaultAttributes = {
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
    unique: true,
    cardinality: "one",
  },
} as const;

export const Attributes = { ...DefaultAttributes, ...BaseAttributes };
type Attributes = typeof Attributes;

export async function init(tx: DurableObjectStorage) {
  let lastUpdated = Date.now().toString();
  await Promise.all(
    Object.keys(BaseAttributes).map(async (attributeName) => {
      let entity = ulid();
      const write = (attribute: string, value: any, schema: Schema) => {
        return writeFactToStorage(
          tx,
          {
            id: ulid(),
            lastUpdated,
            positions: {},
            entity,
            attribute,
            value: { type: schema.type, value: value } as Value,
          },
          schema
        );
      };
      let attribute =
        BaseAttributes[attributeName as keyof typeof BaseAttributes];
      await Promise.all([
        write("name", attributeName, BaseAttributes.name),
        write("unique", attribute.unique, BaseAttributes.unique),
        write("cardinality", attribute.cardinality, BaseAttributes.cardinality),
        write("type", attribute.type, BaseAttributes.type),
        attribute.type === "union"
          ? Promise.all(
              attribute["union/value"].map((v) =>
                write("union/value", v, BaseAttributes["union/value"])
              )
            )
          : null,
      ]);
    })
  );
  await Promise.all(
    Object.keys(DefaultAttributes).map(async (s) => {
      let section = DefaultAttributes[s as keyof typeof DefaultAttributes];
      let entity = ulid();
      await Promise.all([
        serverAssertFact(tx, {
          entity,
          positions: {},
          attribute: "type",
          value: { type: "union", value: section.type },
        }),

        serverAssertFact(tx, {
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
}
