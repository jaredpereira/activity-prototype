import { generateNKeysBetween } from "../src/fractional-indexing";
import { ulid } from "../src/ulid";
import { serverAssertFact } from "./writes";

const Sections = {
  section: {
    type: "string",
    cardinality: "many",
  },
  contains: {
    type: "reference",
    cardinality: "many",
  },
  deck: {
    type: "flag",
    cardinality: "one",
  },
  author: {
    type: "string",
    cardinality: "one",
  },
  notes: {
    type: "string",
    cardinality: "one",
  },
  quotes: {
    type: "reference",
    cardinality: "many",
  },
  textContent: {
    type: "string",
    cardinality: "one",
  },
};

let Decks = {
  Books: [
    {
      name: "Six Memos for the Next Millenium",
      author: "Italo Calvino",
      notes:
        "It's incredible to me how much meaning Calvino pulls from these few tiny words",
      quotes: [
        {
          textContent:
            "If I had to choose an auspicous sign for the approach of the new millenium I would choose this: the sudden nimble leap of the poet/philosopher who lifts himself against the weight of the world, proving that its heaviness contains the secret of lightness, while what many bleief to be the life)orce of the times - loud and aggressive, roaring and rumbling - belongs to the realm of death, like a graveyard of rusted automobiles.",
        },
      ],
    },
  ],
};

export const init = async (tx: DurableObjectStorage) => {
  await Promise.all(
    Object.keys(Sections).map(async (s) => {
      let section = Sections[s as keyof typeof Sections];
      let entity = ulid();
      console.log(
        s,
        section.type,
        await serverAssertFact(tx, {
          entity,
          positions: {},
          attribute: "type",
          value: { type: "union", value: section.type },
        })
      );
      await Promise.all([
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

  await Promise.all(
    Object.keys(Decks).map(async (d) => {
      let deckEntity = ulid();
      let deck = Decks[d as keyof typeof Decks];
      await serverAssertFact(tx, {
        entity: deckEntity,
        attribute: "name",
        value: { type: "string", value: d },
        positions: {},
      });
      await serverAssertFact(tx, {
        entity: deckEntity,
        positions: {},
        attribute: "deck",
        value: { type: "flag", value: null },
      });
      let positions = generateNKeysBetween(null, null, deck.length);
      await Promise.all([
        ...deck.map(async (card, index) => {
          let cardEntity = ulid();
          await serverAssertFact(tx, {
            entity: deckEntity,
            attribute: "contains",
            value: { type: "reference", value: cardEntity },
            positions: { eav: positions[index] },
          });

          let attributes = Object.keys(card);
          let sectionPositions = generateNKeysBetween(
            null,
            null,
            attributes.length
          );
          return Promise.all(
            attributes.map(async (a, attributeIndex) => {
              let value = card[a as keyof typeof card];
              if (a !== "name") {
                await serverAssertFact(tx, {
                  entity: cardEntity,
                  attribute: "section",
                  value: {
                    type: "string",
                    value: a,
                  },
                  positions: { eav: sectionPositions[attributeIndex] },
                });
              }
              if (typeof value === "string")
                return serverAssertFact(tx, {
                  entity: cardEntity,
                  attribute: a,
                  positions: {},
                  value: { type: "string", value },
                });
              else
                return Promise.all(
                  value.map(async (relatedCard) => {
                    let relatedCardEntity = ulid();
                    return Promise.all([
                      serverAssertFact(tx, {
                        entity: cardEntity,
                        attribute: a,
                        value: {
                          type: "reference",
                          value: relatedCardEntity,
                        },
                        positions: {},
                      }),
                      serverAssertFact(tx, {
                        entity: relatedCardEntity,
                        attribute: "textContent",
                        value: {
                          type: "string",
                          value: relatedCard.textContent,
                        },
                        positions: {},
                      }),
                    ]);
                  })
                );
            })
          );
        }),
      ]);
    })
  );
};
