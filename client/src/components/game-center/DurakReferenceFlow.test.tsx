import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { GameTable } from "./gameCenterApi";
import { DurakCreateWizard, DurakResult, getDurakPresetStakes } from "./DurakReferenceFlow";

const noop = () => {};

describe("Durak screenshot-aligned flow", () => {
  it("uses at most four allowed 10–200 coin presets and never exposes 500", () => {
    expect(getDurakPresetStakes([10, 20, 30, 40, 50, 75, 100, 150, 200, 500])).toEqual([
      10,
      50,
      100,
      200,
    ]);
    expect(getDurakPresetStakes([20, 30, 40, 500])).toEqual([20, 30, 40]);
    expect(getDurakPresetStakes([500])).toEqual([]);
  });

  it("renders exactly four stake radio controls from the live configuration", () => {
    const html = renderToStaticMarkup(
      <DurakCreateWizard
        step={3}
        form={{ name: "Дурень", stake: 10, players: 2, visibility: "public", rule: "throw_in", deckSize: 36 }}
        balance={463}
        stakeOptions={[10, 20, 30, 40, 50, 75, 100, 150, 200, 500]}
        playerOptions={[2, 3, 4, 5, 6]}
        busy={false}
        error=""
        offline={false}
        showBackFallback={false}
        onChange={noop}
        onBack={noop}
        onNext={noop}
        onCreate={noop}
      />
    );

    expect((html.match(/role="radio"/g) || []).length).toBe(4);
    expect(html).toContain("aria-label=\"Крок 3 з 3\"");
    expect(html).toContain(">200</button>");
    expect(html).not.toContain(">500</button>");
    expect(html).not.toContain("Перевідний");
  });

  it("offers real 36- and 52-card deck choices in the rules step", () => {
    const html = renderToStaticMarkup(
      <DurakCreateWizard
        step={1}
        form={{ name: "Дурень", stake: 10, players: 2, visibility: "public", rule: "throw_in", deckSize: 52 }}
        balance={100}
        stakeOptions={[10, 50, 100, 200]}
        playerOptions={[2, 3, 4, 5, 6]}
        busy={false}
        error=""
        offline={false}
        showBackFallback={false}
        onChange={noop}
        onBack={noop}
        onNext={noop}
        onCreate={noop}
      />
    );
    expect(html).toContain("36 карт");
    expect(html).toContain("52 карти");
    expect(html).toContain('aria-checked="true" class="is-selected">52 карти');
    expect(html).not.toContain("disabled=\"\"");
  });

  it("does not infer the viewer’s result from another player’s loss", () => {
    const table = {
      id: "table-result",
      gameId: "durak",
      stake: 10,
      minPlayers: 2,
      maxPlayers: 2,
      visibility: "public",
      status: "finished",
      ownerId: "winner",
      myPlayerId: "not-in-this-result",
      players: [
        { id: "winner", name: "Winner", nick: "Winner" },
        { id: "loser", name: "Loser", nick: "Loser" },
      ],
      result: { payouts: [{ playerId: "winner", amount: 19 }, { playerId: "loser", amount: 0 }] },
    } satisfies GameTable;
    const html = renderToStaticMarkup(<DurakResult table={table} onAgain={noop} />);

    expect(html).toContain('id="gc-durak-result-title">Партію завершено</h1>');
    expect(html).toContain("<strong><span>—</span>");
  });
});
