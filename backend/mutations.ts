type AssertFact = (args: {
  entity: string;
  attribute: string;
  value: string;
}) => Promise<void>;

export const Mutations = {
  createNewCard,
};

async function createNewCard(
  assert: AssertFact,
  args: { title: string; entity: string }
) {
  await assert({
    entity: args.entity,
    attribute: "title",
    value: args.title,
  });
}
