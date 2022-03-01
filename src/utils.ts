import { Fact } from "backend/ActivityDurableObject";

export const sortByPosition =
  (key: string) =>
  (a: Pick<Fact, "positions" | "id">, b: Pick<Fact, "positions" | "id">) => {
    let aPosition = a.positions[key],
      bPosition = b.positions[key];
    if (!aPosition) {
      if (bPosition) return -1;
      return a.id > b.id ? 1 : -1;
    }
    if (!bPosition) return -1;
    if (aPosition === bPosition) return a.id > b.id ? 1 : -1;
    return aPosition > bPosition ? 1 : -1;
  };
