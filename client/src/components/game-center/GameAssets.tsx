import * as React from "react";
import type { CSSProperties, ReactNode } from "react";
import "./GameAssets.css";

export type CardSuit = "spades" | "hearts" | "diamonds" | "clubs";
export type CardRank =
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "A"
  | "2"
  | "3"
  | "4"
  | "5";
export interface PlayingCardProps {
  card: { rank: CardRank | string; suit: CardSuit };
  faceDown?: boolean;
  size?: "small" | "medium" | "large";
  dealIndex?: number;
  cardWidth?: number;
  skin?: "standard" | "durak-reference";
}
const suitGlyph: Record<CardSuit, string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
};
export const cardSuitGlyph = suitGlyph;
export function displayCardRank(value: number | string) {
  const rawRank = String(value).toUpperCase();
  return ({ "11": "J", "12": "Q", "13": "K", "14": "A" } as Record<string, string>)[rawRank] || rawRank;
}
export function displayCardName(value: number | string) {
  const rank = displayCardRank(value);
  return ({ J: "Валет", Q: "Дама", K: "Король", A: "Туз" } as Record<string, string>)[rank] || rank;
}
const suitName: Record<CardSuit, string> = {
  spades: "піка",
  hearts: "чирва",
  diamonds: "бубна",
  clubs: "трефа",
};
const redSuits = new Set<CardSuit>(["hearts", "diamonds"]);
const pipPositions: Record<number, [number, number][]> = {
  2: [
    [50, 20],
    [50, 80],
  ],
  3: [
    [50, 17],
    [50, 50],
    [50, 83],
  ],
  4: [
    [30, 20],
    [70, 20],
    [30, 80],
    [70, 80],
  ],
  5: [
    [30, 20],
    [70, 20],
    [50, 50],
    [30, 80],
    [70, 80],
  ],
  6: [
    [30, 18],
    [70, 18],
    [30, 50],
    [70, 50],
    [30, 82],
    [70, 82],
  ],
  7: [
    [30, 16],
    [70, 16],
    [50, 34],
    [30, 50],
    [70, 50],
    [30, 84],
    [70, 84],
  ],
  8: [
    [30, 15],
    [70, 15],
    [50, 33],
    [30, 50],
    [70, 50],
    [50, 67],
    [30, 85],
    [70, 85],
  ],
  9: [
    [30, 14],
    [70, 14],
    [30, 32],
    [70, 32],
    [50, 50],
    [30, 68],
    [70, 68],
    [30, 86],
    [70, 86],
  ],
  10: [
    [30, 12],
    [70, 12],
    [50, 28],
    [30, 35],
    [70, 35],
    [30, 65],
    [70, 65],
    [50, 72],
    [30, 88],
    [70, 88],
  ],
};
function CardBackArt() {
  return (
    <svg className="gc-card-back-art" viewBox="0 0 100 140" aria-hidden="true">
      <rect x="5" y="5" width="90" height="130" rx="9" fill="url(#cardBack)" />
      <defs>
        <linearGradient id="cardBack" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#252b2e" />
          <stop offset="1" stopColor="#111619" />
        </linearGradient>
        <pattern
          id="cardWeave"
          width="10"
          height="10"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <path
            d="M0 0V10M5 0V10"
            stroke="#f04452"
            strokeOpacity=".32"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect
        x="10"
        y="10"
        width="80"
        height="120"
        rx="6"
        fill="url(#cardWeave)"
        stroke="#f04452"
        strokeOpacity=".66"
      />
      <path
        d="M50 27 73 70 50 113 27 70Z"
        fill="none"
        stroke="#d4ad65"
        strokeOpacity=".8"
      />
      <path
        d="M50 42 65 70 50 98 35 70Z"
        fill="#f04452"
        fillOpacity=".19"
        stroke="#f04452"
      />
      <circle cx="50" cy="70" r="4" fill="#d4ad65" />
    </svg>
  );
}
function DurakReferenceCardBack() {
  return (
    <svg
      className="gc-card-back-art gc-card-back-art--durak-reference"
      viewBox="0 0 100 140"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="94" height="134" rx="8" fill="#111214" stroke="#d84b59" strokeWidth="2" />
      <rect x="9" y="9" width="82" height="122" rx="5" fill="none" stroke="#7b2c38" />
      <path d="M10 14 88 92M10 34 88 112M10 54 78 122M22 10 90 78M42 10 90 58M12 126 90 48M10 106 90 26M22 130 90 62" fill="none" stroke="#bd3c4b" strokeOpacity=".42" strokeWidth="1" />
      <path d="M50 25 75 70 50 115 25 70Z" fill="#171719" stroke="#e04f5f" strokeWidth="2" />
      <path d="M50 41 66 70 50 99 34 70Z" fill="#e04f5f" fillOpacity=".24" stroke="#c83d4d" />
      <circle cx="50" cy="70" r="3.5" fill="#e04f5f" />
    </svg>
  );
}
function CourtArt({ rank, color }: { rank: string; color: string }) {
  const sources: Record<string, string> = {
    J: "/manus-storage/async-images/2RY8yCCXiyHVTZOKqDIOGU/image-1.webp",
    Q: "/manus-storage/async-images/2RY8yCCXiyHVTZOKqDIOGU/image-2.webp",
    K: "/manus-storage/async-images/2RY8yCCXiyHVTZOKqDIOGU/image-3.webp",
  };
  return (
    <div
      className={`gc-court-art gc-court-${rank.toLowerCase()}`}
      style={{ "--suit-accent": color } as CSSProperties}
      aria-hidden="true"
    >
      <img src={sources[rank]} alt="" loading="lazy" decoding="async" />
    </div>
  );
}
export function PlayingCard({
  card,
  faceDown = false,
  size = "medium",
  dealIndex = 0,
  cardWidth,
  skin = "standard",
}: PlayingCardProps) {
  const rank = displayCardRank(card.rank);
  const isDurakReference = skin === "durak-reference";
  const label = faceDown
    ? "Закрита карта"
    : `${displayCardName(card.rank)}, ${suitName[card.suit] ?? "масть"}`;
  const pipCount = Number(rank);
  const court = ["J", "Q", "K"].includes(rank);
  return (
    <div
      className={`gc-playing-card gc-card-${size}${faceDown ? " is-face-down" : ""}${isDurakReference ? " gc-playing-card--durak-reference" : ""}`}
      role="img"
      aria-label={label}
      style={{
        "--deal-index": dealIndex,
        ...(cardWidth ? { width: `${cardWidth}px` } : {}),
      } as CSSProperties}
    >
      {faceDown ? (
        isDurakReference ? <DurakReferenceCardBack /> : <CardBackArt />
      ) : (
        <>
          <div
            className={`gc-card-corner ${redSuits.has(card.suit) ? "is-red" : ""}`}
          >
            <b>{rank}</b>
            <span>{suitGlyph[card.suit]}</span>
          </div>
          {isDurakReference ? (
            ["J", "Q", "K", "A"].includes(rank) ? (
              <div className={`gc-durak-large-suit${redSuits.has(card.suit) ? " is-red" : ""}`}>
                {suitGlyph[card.suit]}
              </div>
            ) : (
              <div
                className={`gc-pips${redSuits.has(card.suit) ? " is-red" : ""}`}
              >
                {(pipPositions[pipCount] ?? []).map(([x, y], i) => (
                  <span key={i} style={{ left: `${x}%`, top: `${y}%` }}>
                    {suitGlyph[card.suit]}
                  </span>
                ))}
              </div>
            )
          ) : court ? (
            <div className="gc-court-frame">
              <CourtArt
                rank={rank}
                color={redSuits.has(card.suit) ? "#f04452" : "#91d6c0"}
              />
              <span className="gc-court-name">
                {displayCardName(card.rank).toLocaleUpperCase("uk")}
              </span>
            </div>
          ) : rank === "A" ? (
            <div
              className={`gc-ace ${redSuits.has(card.suit) ? "is-red" : ""}`}
            >
              {suitGlyph[card.suit]}
              <span className="gc-ace-name">ТУЗ</span>
            </div>
          ) : (
            <div
              className={`gc-pips ${redSuits.has(card.suit) ? "is-red" : ""}`}
            >
              {(pipPositions[pipCount] ?? []).map(([x, y], i) => (
                <span key={i} style={{ left: `${x}%`, top: `${y}%` }}>
                  {suitGlyph[card.suit]}
                </span>
              ))}
            </div>
          )}
          <div
            className={`gc-card-corner gc-card-corner-bottom ${redSuits.has(card.suit) ? "is-red" : ""}`}
          >
            <b>{rank}</b>
            <span>{suitGlyph[card.suit]}</span>
          </div>
        </>
      )}
    </div>
  );
}

export type BattleshipCellState =
  | "water"
  | "ship"
  | "miss"
  | "hit"
  | "sunk"
  | "targetable";
export interface BattleshipBoardProps {
  size?: number;
  cells: readonly (
    | BattleshipCellState
    | { state: BattleshipCellState; label?: string }
  )[];
  onCellClick?: (row: number, column: number) => void;
  disabled?: boolean;
  onCellDrop?: (row: number, column: number, shipIndex?: number) => void;
}
export function ShipSprite({
  length,
  orientation = "horizontal",
  damaged = false,
}: {
  length: 1 | 2 | 3 | 4;
  orientation?: "horizontal" | "vertical";
  damaged?: boolean;
}) {
  return (
    <svg
      className={`gc-ship gc-ship-${orientation}${damaged ? " is-damaged" : ""}`}
      viewBox={`0 0 ${length * 54} 48`}
      role="img"
      aria-label={`${length}-палубний корабель${damaged ? ", пошкоджений" : ""}`}
    >
      {Array.from({ length }, (_, i) => (
        <g key={i} transform={`translate(${i * 54},0)`}>
          <path
            d="M7 24 14 13h27l7 11-7 11H14Z"
            fill="#273438"
            stroke={damaged ? "#f04452" : "#91d6c0"}
            strokeWidth="1.8"
          />
          <path d="M18 24h18M27 16v16" stroke="#91d6c0" strokeOpacity=".65" />
          <path d="M22 20h10v8H22z" fill="#d4ad65" fillOpacity=".66" />
          <circle cx="13" cy="24" r="1.5" fill="#f04452" />
        </g>
      ))}
      {damaged && (
        <path
          d={`M${length * 27 - 8} 5l-8 14 8 4-7 18`}
          fill="none"
          stroke="#f04452"
          strokeWidth="2.5"
        />
      )}
    </svg>
  );
}
function CellArt({ state }: { state: BattleshipCellState }): ReactNode {
  if (state === "miss")
    return (
      <>
        <circle className="gc-miss-ring" cx="50" cy="50" r="16" />
        <circle cx="50" cy="50" r="3" fill="#91d6c0" />
      </>
    );
  if (state === "hit" || state === "sunk")
    return (
      <>
        <circle className="gc-hit-burst" cx="50" cy="50" r="29" />
        <path
          d="M34 34l32 32m0-32L34 66"
          stroke="#f04452"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <circle cx="50" cy="50" r="4" fill="#ffe3c0" />
      </>
    );
  if (state === "ship")
    return (
      <>
        <rect
          x="13"
          y="24"
          width="74"
          height="52"
          rx="14"
          fill="#273438"
          stroke="#91d6c0"
          strokeWidth="5"
        />
        <path
          d="M28 50h44M50 31v38"
          stroke="#91d6c0"
          strokeOpacity=".65"
          strokeWidth="3"
        />
        <path d="M37 42h26v16H37z" fill="#d4ad65" fillOpacity=".65" />
      </>
    );
  return <circle className="gc-water-dot" cx="50" cy="50" r="4" />;
}
export function BattleshipBoard({
  size = 10,
  cells,
  onCellClick,
  disabled = false,
  onCellDrop,
}: BattleshipBoardProps) {
  const count = Math.max(1, Math.floor(size));
  return (
    <div
      className="gc-battleship-wrap"
      role="grid"
      aria-label={`Поле морського бою ${count} на ${count}`}
      style={{ "--grid-size": count } as CSSProperties}
    >
      <span className="gc-board-corner" aria-hidden="true">↘</span>
      {Array.from({ length: count }, (_, column) => (
        <span
          className="gc-board-col-label"
          key={`col-${column}`}
          style={{ gridColumn: column + 2, gridRow: 1 }}
          aria-hidden="true"
        >
          {String.fromCharCode(65 + column)}
        </span>
      ))}
      {Array.from({ length: count }, (_, row) => (
        <span
          className="gc-board-row-label"
          key={`row-${row}`}
          style={{ gridColumn: 1, gridRow: row + 2 }}
          aria-hidden="true"
        >
          {row + 1}
        </span>
      ))}
      {Array.from({ length: count * count }, (_, index) => {
        const row = Math.floor(index / count),
          column = index % count;
        const value = cells[index] ?? "water";
        const state = typeof value === "string" ? value : value.state;
        const label = typeof value === "string" ? undefined : value.label;
        const interactive =
          Boolean(onCellClick) &&
          !disabled &&
          ["targetable", "water"].includes(state);
        return (
          <button
            key={index}
            type="button"
            role="gridcell"
            className={`gc-battle-cell gc-cell-${state}`}
            data-battle-row={row}
            data-battle-column={column}
            style={{ gridColumn: column + 2, gridRow: row + 2 }}
            onClick={() => interactive && onCellClick?.(row, column)}
            onDragOver={event => {
              if (onCellDrop && interactive) event.preventDefault();
            }}
            onDrop={event => {
              if (!onCellDrop || !interactive) return;
              event.preventDefault();
              const rawIndex = event.dataTransfer.getData("text/plain");
              const draggedIndex = Number(rawIndex);
              onCellDrop(
                row,
                column,
                rawIndex && Number.isSafeInteger(draggedIndex) && draggedIndex >= 0
                  ? draggedIndex
                  : undefined
              );
            }}
            disabled={!interactive}
            aria-label={
              label ?? `${String.fromCharCode(65 + column)}${row + 1}: ${state}`
            }
            tabIndex={interactive ? 0 : -1}
          >
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <CellArt state={state} />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

export type TicTacToeCell = "X" | "O" | "x" | "o" | null | undefined;
export interface TicTacToeBoardProps {
  cells: readonly TicTacToeCell[];
  winningLine?: readonly number[];
  onCellClick?: (index: number) => void;
  disabled?: boolean;
}
export function TicTacToeBoard({
  cells,
  winningLine = [],
  onCellClick,
  disabled = false,
}: TicTacToeBoardProps) {
  const winner = new Set(winningLine);
  return (
    <div className="gc-ttt-board" role="grid" aria-label="Поле хрестики-нулики">
      {Array.from({ length: 9 }, (_, index) => {
        const value = cells[index]?.toUpperCase() as "X" | "O" | undefined;
        const active = !disabled && !value && Boolean(onCellClick);
        return (
          <button
            key={index}
            type="button"
            role="gridcell"
            className={`gc-ttt-cell${winner.has(index) ? " is-winning" : ""}`}
            onClick={() => active && onCellClick?.(index)}
            disabled={!active}
            aria-label={`Клітинка ${index + 1}${value ? `, ${value}` : ", порожня"}`}
          >
            {value && (
              <svg
                className={`gc-ttt-mark gc-mark-${value.toLowerCase()}`}
                viewBox="0 0 100 100"
                aria-hidden="true"
                key={`${value}-${index}`}
              >
                {value === "X" ? (
                  <>
                    <path className="gc-mark-stroke" d="M27 27 73 73" />
                    <path
                      className="gc-mark-stroke gc-stroke-second"
                      d="M73 27 27 73"
                    />
                  </>
                ) : (
                  <circle
                    className="gc-mark-stroke gc-mark-circle"
                    cx="50"
                    cy="50"
                    r="29"
                  />
                )}
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}
