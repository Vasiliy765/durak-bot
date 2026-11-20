import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import {
  cardSuitGlyph,
  displayCardName,
  displayCardRank,
  PlayingCard,
  type CardSuit,
} from "./GameAssets";

describe("Durak card face labels", () => {
  it("maps engine court ranks to standard J/Q/K/A without displaying raw 11–14", () => {
    expect([11, 12, 13, 14].map(displayCardRank)).toEqual(["J", "Q", "K", "A"]);
    expect([11, 12, 13, 14].map(displayCardName)).toEqual([
      "Валет",
      "Дама",
      "Король",
      "Туз",
    ]);
  });

  it("renders all 36 Durak rank/suit combinations with unique face and suit marks", () => {
    const ranks = [6, 7, 8, 9, 10, 11, 12, 13, 14];
    const suits: CardSuit[] = ["spades", "hearts", "diamonds", "clubs"];
    const faces = suits.flatMap(suit =>
      ranks.map(rank => ({ rank: displayCardRank(rank), suit, glyph: cardSuitGlyph[suit] }))
    );
    expect(faces).toHaveLength(36);
    expect(new Set(faces.map(card => `${card.rank}-${card.suit}`)).size).toBe(36);
    expect(new Set(suits.map(suit => cardSuitGlyph[suit])).size).toBe(4);
    expect(faces.filter(card => ["J", "Q", "K", "A"].includes(card.rank))).toHaveLength(16);
    expect(faces.map(card => card.rank)).not.toContain("11");
    expect(faces.map(card => card.rank)).not.toContain("12");
    expect(faces.map(card => card.rank)).not.toContain("13");
    expect(faces.map(card => card.rank)).not.toContain("14");
  });

  it("renders the illustrated court portraits into real cards and hides face data on backs", () => {
    const portraits = [
      ["J", "image-1.webp"],
      ["Q", "image-2.webp"],
      ["K", "image-3.webp"],
    ] as const;
    for (const [rank, image] of portraits) {
      const html = renderToStaticMarkup(
        <PlayingCard card={{ rank, suit: "hearts" }} />
      );
      expect(html).toContain(`/manus-storage/async-images/2RY8yCCXiyHVTZOKqDIOGU/${image}`);
      expect(html).toContain(`aria-label="${displayCardName(rank)}, чирва"`);
    }

    const back = renderToStaticMarkup(
      <PlayingCard card={{ rank: "K", suit: "hearts" }} faceDown />
    );
    expect(back).toContain('aria-label="Закрита карта"');
    expect(back).not.toContain("Король");
    expect(back).not.toContain("gc-court-k");
  });

  it("renders reference-style flat Durak faces and the dark-red card back", () => {
    const queen = renderToStaticMarkup(
      <PlayingCard
        card={{ rank: "Q", suit: "clubs" }}
        skin="durak-reference"
      />
    );
    expect(queen).toContain("gc-playing-card--durak-reference");
    expect(queen).toContain("gc-durak-large-suit");
    expect(queen).toContain("♣");
    expect(queen).not.toContain("gc-court-art");
    expect(queen).not.toContain("/manus-storage/");

    const back = renderToStaticMarkup(
      <PlayingCard
        card={{ rank: "K", suit: "hearts" }}
        faceDown
        skin="durak-reference"
      />
    );
    expect(back).toContain("gc-card-back-art--durak-reference");
    expect(back).toContain('aria-label="Закрита карта"');
    expect(back).not.toContain("Король");
  });
});
