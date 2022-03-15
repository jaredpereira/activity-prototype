import { Value } from "./ActivityDurableObject";
import { Attributes } from "./populate";
import { indexes } from "./writes";

type Attributes = typeof Attributes;
export type AttributeName = keyof Attributes;

export type Fact<A extends AttributeName> = {
  attribute: A;
  value: Extract<Value, { type: Attributes[A]["type"] }>;
  entity: string;
  id: string;
  lastUpdated: string;
  retracted?: boolean;
  positions: { [k: string]: string | undefined };
};

export type FactInput<A extends AttributeName> = Omit<
  Fact<A>,
  "lastUpdated" | "id"
>;

type AttributeQuery<T extends AttributeName> = {
  get: () => Fact<T>[];
  find: Attributes[T]["unique"] extends true
    ? (v: string) => Promise<Fact<T> | undefined>
    : undefined;
};

type GetResult<T extends AttributeName> =
  Attributes[T]["cardinality"] extends "one" ? Fact<T> : Fact<T>[];

export const q = (tx: DurableObjectStorage) => {
  function attribute<T extends AttributeName>(attr: T): AttributeQuery<T> {
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
      async get<T extends AttributeName>(attr: T): Promise<GetResult<T>> {
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
