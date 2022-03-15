import { Value } from "./ActivityDurableObject";
import { Attributes } from "./populate";
import { indexes } from "./writes";

type Attributes = typeof Attributes;

type Fact<A extends keyof Attributes> = {
  attribute: A;
  value: Extract<Value, { type: Attributes[A]["type"] }>;
  entity: string;
};

type AttributeQuery<T extends keyof Attributes> = {
  get: () => Fact<T>[];
  find: Attributes[T]["unique"] extends true
    ? (v: string) => Promise<Fact<T> | undefined>
    : undefined;
};

type GetResult<T extends keyof Attributes> =
  Attributes[T]["cardinality"] extends "one" ? Fact<T> : Fact<T>[];

export const q = (tx: DurableObjectStorage) => {
  function attribute<T extends keyof Attributes>(attr: T): AttributeQuery<T> {
    return {
      async find(v: string) {
        if (Attributes[attr].unique) {
          return tx.get<Fact<T>>(indexes.av(attr, v));
        }
      },
    } as AttributeQuery<T>;
  }

  function entity(entity: string) {
    return {
      async get<T extends keyof Attributes>(attr: T): Promise<GetResult<T>> {
        let facts = [
          ...(
            await tx.list<Fact<T>>({ prefix: `ea-${entity}-${attr}` })
          ).values(),
        ];
        if (Attributes[attr].cardinality === "one")
          return facts[0] as GetResult<T>;
        return facts as GetResult<T>;
      },
    };
  }
  return { attribute, entity };
};
