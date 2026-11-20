import { describe, expect, it } from "vitest";
import { layoutDurakHand } from "./durakHandLayout";

describe("Durak responsive hand layout", () => {
  it("centers one card without adding a horizontal scroller", () => {
    const rows = layoutDurakHand(1, 360);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.cards).toHaveLength(1);
    expect(rows[0]!.cards[0]!.index).toBe(0);
    expect(rows[0]!.cards[0]!.left).toBeGreaterThan(0);
  });

  it("keeps the usual nine-card hand fully visible on a 360px phone", () => {
    const rows = layoutDurakHand(9, 360);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.cards.map(card => card.index)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8,
    ]);
    expect(rows[0]!.cardWidth).toBeGreaterThanOrEqual(50);
    expect(
      rows[0]!.cards.every(card => card.left >= 0 && card.left + rows[0]!.cardWidth <= 360)
    ).toBe(true);
  });

  it("balances larger hands over visible rows and never omits a card", () => {
    for (const count of [10, 16, 24, 36]) {
      const rows = layoutDurakHand(count, 320);
      const slots = rows.flatMap(row => row.cards);
      expect(slots.map(slot => slot.index).sort((a, b) => a - b)).toEqual(
        Array.from({ length: count }, (_, i) => i)
      );
      expect(rows.every(row => row.cards.length <= 9)).toBe(true);
      expect(
        rows.every(row =>
          row.cards.every(card => card.left >= 0 && card.left + row.cardWidth <= 320)
        )
      ).toBe(true);
    }
  });

  it("fits a 12-card hand and the full 36-card deck into compact mobile rows", () => {
    const twelve = layoutDurakHand(12, 320, 58);
    const thirtySix = layoutDurakHand(36, 320, 40);

    expect(twelve).toHaveLength(2);
    expect(twelve.reduce((height, row) => height + row.height, 0)).toBeLessThan(190);
    expect(thirtySix).toHaveLength(4);
    expect(thirtySix.every(row => row.cards.length <= 9)).toBe(true);
    expect(thirtySix.reduce((height, row) => height + row.height, 0)).toBeLessThan(260);
    expect(thirtySix.flatMap(row => row.cards).map(card => card.index).sort((a, b) => a - b))
      .toEqual(Array.from({ length: 36 }, (_, i) => i));
  });

  it("returns an empty layout for empty or invalid counts", () => {
    expect(layoutDurakHand(0, 360)).toEqual([]);
    expect(layoutDurakHand(-1, 360)).toEqual([]);
    expect(layoutDurakHand(1.5, 360)).toEqual([]);
  });
});
