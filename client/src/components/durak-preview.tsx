import { GameProjection } from "./game-center/GameCenterScreen";
import type { GameTable } from "./game-center/gameCenterApi";

const hand = [
  ["h11", "11", "spades"], ["h6c", "6", "clubs"], ["h7c", "7", "clubs"],
  ["h12c", "12", "clubs"], ["h6d", "6", "diamonds"], ["h7d", "7", "diamonds"],
  ["h8d", "8", "diamonds"], ["h9c", "9", "clubs"], ["h8h", "8", "hearts"],
  ["h13d", "13", "diamonds"], ["h14h", "14", "hearts"], ["h10s", "10", "spades"],
].map(([id, rank, suit]) => ({ id, rank, suit }));

const projection = {
  players: [
    { id: "me", hand, cardCount: hand.length },
    { id: "opponent", cardCount: 5 },
  ],
  turn: "opponent",
  table: [
    { attack: { rank: "8", suit: "hearts" }, defense: { rank: "9", suit: "hearts" } },
    { attack: { rank: "8", suit: "spades" }, defense: null },
  ],
  trump: { card: { rank: "6", suit: "hearts" }, suit: "hearts" },
  deckCount: 23,
  mode: "simple",
  bank: 20,
};

const players = [
  { id: "me", nick: "Василь", handCount: hand.length },
  { id: "opponent", nick: "Гравець", handCount: 5 },
] as unknown as GameTable["players"];
const legal = [{ type: "throw_in", cardId: "h8d" }];

export default function DurakPreview() {
  return (
    <section className="gc-screen gc-screen--durak-live">
      <header className="gc-head">
        <button type="button" className="gc-back" aria-label="Назад">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </header>
      <div className="gc-table-screen gc-table-screen--durak-live">
        <div className="gc-table-meta" />
        <div className="gc-game-state">
          <h2>Дурень</h2>
          <div className="gc-turn-banner" />
          <div className="gc-live-seats" />
          <div className="gc-projection">
            <GameProjection
              game="durak"
              projection={projection}
              legal={legal}
              busy={false}
              onAction={() => undefined}
              players={players}
              myPlayerId="me"
              bank={20}
              stake={10}
              turnSeconds={52}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
