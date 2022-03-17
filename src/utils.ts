import { Fact } from "backend/ActivityDurableObject";
import { AttributeName } from "backend/query";

export const sortByPosition =
  (key: string) =>
    (
      a: Pick<Fact<AttributeName>, "positions" | "id">,
      b: Pick<Fact<AttributeName>, "positions" | "id">
    ) => {
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
const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford's Base32

export const generateShareCode = () => {
  let randomValues = new Uint8Array(8);
  crypto.getRandomValues(randomValues);
  let result = "";
  randomValues.forEach((v) => {
    let rand = Math.floor((v / 0xff) * ENCODING.length);
    if (rand === ENCODING.length) {
      rand = ENCODING.length - 1;
    }
    result = result + ENCODING.charAt(rand);
  });
  return result;
};
