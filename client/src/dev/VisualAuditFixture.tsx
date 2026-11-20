import * as React from "react";
import CommandsScreen from "../components/CommandsScreen";
import {
  PlayingCard,
  type CardRank,
  type CardSuit,
} from "../components/game-center/GameAssets";

type AuditMode = "commands" | "cards";

const sampleCards: Array<{ rank: CardRank; suit: CardSuit; label: string }> = [
  { rank: "J", suit: "hearts", label: "Валет · чирва" },
  { rank: "Q", suit: "diamonds", label: "Дама · бубна" },
  { rank: "K", suit: "spades", label: "Король · піка" },
];

export default function VisualAuditFixture({ mode }: { mode: AuditMode }) {
  if (mode === "commands") {
    return (
      <div className="app-shell visual-audit-shell">
        <main className="main-content">
          <CommandsScreen onOpenProfile={() => undefined} />
        </main>
      </div>
    );
  }

  return (
    <main className="visual-card-audit">
      <style>{`
        .visual-card-audit { min-height: 100dvh; padding: 16px 12px 30px; background: radial-gradient(ellipse at 50% 5%, #301116, #0b0d10 52%, #080a0c); color: #eef0ed; font-family: system-ui, sans-serif; }
        .visual-card-audit h1 { margin: 0 0 5px; font-size: 21px; }
        .visual-card-audit p { margin: 0 0 16px; color: #9ea5a4; font-size: 12px; line-height: 1.5; }
        .visual-card-audit h2 { margin: 18px 0 8px; color: #d4ad65; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; }
        .visual-card-audit-row { display: flex; justify-content: space-between; gap: 6px; max-width: 440px; margin: 0 auto; }
        .visual-card-audit-item { display: grid; justify-items: center; gap: 6px; min-width: 0; }
        .visual-card-audit-item span { color: #a8b0ae; font-size: 9px; text-align: center; }
        .visual-card-audit-back { display: flex; justify-content: center; gap: 10px; }
      `}</style>
      <h1>Durak · оригінальна колода</h1>
      <p>Перевірка трьох ілюстрованих court-карт та стандартного малюнка сорочки у справжньому компоненті гри.</p>
      <div className="visual-card-audit-row">
        {sampleCards.map(card => (
          <figure className="visual-card-audit-item" key={card.rank}>
            <PlayingCard card={{ rank: card.rank, suit: card.suit }} size="large" cardWidth={88} />
            <span>{card.label}</span>
          </figure>
        ))}
      </div>
      <h2>Тест сорочки / прихованої карти</h2>
      <div className="visual-card-audit-back">
        <PlayingCard card={{ rank: "A", suit: "spades" }} faceDown size="large" cardWidth={88} />
      </div>
    </main>
  );
}
