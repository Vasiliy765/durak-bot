import { useEffect, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { TableScreen } from "./GameCenterScreen";
import type { GameTable } from "./gameCenterApi";

const suits = ["spades", "hearts", "diamonds", "clubs"] as const;
const ranks = [6, 7, 8, 9, 10, 11, 12, 13, 14];
type Suit = (typeof suits)[number];
type AuditCard = { id: string; rank: number; suit: Suit };

export default function DurakAuditFixture() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const requestedCount = Number(params.get("hand") || 12);
  const handCount = Number.isSafeInteger(requestedCount)
    ? Math.max(1, Math.min(36, requestedCount))
    : 12;
  const phase = params.get("phase") === "beat" ? "beat" : "throw";
  const deck: AuditCard[] = suits.flatMap(suit =>
    ranks.map(rank => ({ id: `${rank}-${suit}`, rank, suit }))
  );
  const firstCard = deck.find(card => card.rank === 8 && card.suit === "hearts")!;
  const hand = [firstCard, ...deck.filter(card => card.id !== firstCard.id)].slice(0, handCount);
  const legalActions = phase === "beat"
    ? [{ type: "done" }]
    : [{ type: "throw_in", cardId: firstCard.id }];
  const table: GameTable = {
    id: "read-only-durak-preview",
    gameId: "durak",
    name: "Дурень",
    stake: 10,
    minPlayers: 2,
    maxPlayers: 2,
    visibility: "public",
    status: "playing",
    ownerId: "audit-me",
    myPlayerId: "audit-me",
    isOwner: false,
    bank: 20,
    turnEndsAt: Date.now() + 45_000,
    players: [
      { id: "audit-me", name: "Ваш акаунт", nick: "Ви", handCount },
      { id: "audit-opponent", name: "Суперник", nick: "Superstar", handCount: 4 },
    ],
    projection: {
      bank: 20,
      mode: "simple",
      deckCount: 24,
      turn: phase === "beat" ? "audit-me" : "audit-opponent",
      isYourTurn: phase === "beat",
      turnPlayerName: phase === "beat" ? "Ви" : "Superstar",
      trump: { card: { rank: 14, suit: "diamonds" } },
      table: [{ attack: { rank: 8, suit: "hearts" }, defense: null }],
      players: [
        { id: "audit-me", hand, cardCount: handCount },
        { id: "audit-opponent", cardCount: 4 },
      ],
      legalActions,
      events: ["Гравці сіли за стіл", "Атака: 8 ♥"],
    },
    events: ["Гравці сіли за стіл", "Атака: 8 ♥"],
  };

  useEffect(() => {
    if (params.get("tools") === "open") {
      document.querySelector<HTMLDetailsElement>(".gc-live-tools")?.setAttribute("open", "");
    }
  }, [params]);

  return (
    <section className="gc-screen gc-screen--durak-live">
      <header className="gc-head">
        <button className="gc-back" type="button" aria-label="Назад">
          <ArrowLeft size={17} /> Назад
        </button>
      </header>
      <TableScreen
        table={table}
        busy={false}
        inviteToken=""
        onReady={() => undefined}
        onStart={() => undefined}
        onLeave={() => undefined}
        onCancel={() => undefined}
        onKick={() => undefined}
        onAction={() => undefined}
        onRefresh={() => undefined}
        onCopy={() => undefined}
        onShare={() => undefined}
        onDispute={() => undefined}
        onAgain={() => undefined}
      />
    </section>
  );
}
