import { WriteTransaction } from "replicache";
export const assertFact = async (
  tx: WriteTransaction,
  args: { entity: string; attribute: string; value: string; retraction?: true }
) => {
  let index: number = ((await tx.get(`meta-counter`)) as number) || 0;
  let txID = index + 1;
  let value = { ...args, txID };

  let previousValue = await tx.get(`eav-${args.entity}-${args.attribute}`);
  if (previousValue) {
    await tx.del(`log-${txID}`);
    if (args.retraction) await tx.del(`eav-${args.entity}-${args.attribute}`);
  }
  await Promise.all([
    args.retraction
      ? undefined
      : tx.put(`eav-${args.entity}-${args.attribute}`, value),
    tx.put(`log-${txID}`, value),
    tx.put(`meta-counter`, txID),
  ]);
};
