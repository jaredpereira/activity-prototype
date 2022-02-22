export const sortByPosition = (
  a: { position: string; id: string },
  b: { position: string; id: string }
) => {
  if (a.position === b.position) return a.id > b.id ? -1 : 1;
  return a.position > b.position ? -1 : 1;
};
