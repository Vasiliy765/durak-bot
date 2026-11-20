import * as React from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Coins,
  RefreshCw,
  Trophy,
  Users,
} from "lucide-react";
import type { GameTable } from "./gameCenterApi";
import { PlayingCard } from "./GameAssets";
import "./DurakReference.css";

export type DurakCreateForm = {
  name: string;
  stake: number;
  players: number;
  visibility: "public" | "private";
  rule: string;
  deckSize: 36 | 52;
};

export function getDurakPresetStakes(stakeOptions: number[]) {
  const allowed = [...new Set(stakeOptions.filter(value => value >= 10 && value <= 200))].sort((a, b) => a - b);
  const preferred = [10, 50, 100, 200].filter(value => allowed.includes(value));
  return [...preferred, ...allowed.filter(value => !preferred.includes(value))].slice(0, 4);
}

export function DurakLobby({
  form,
  balance,
  tables,
  mine,
  pendingJoin,
  inviteToken,
  loading,
  busy,
  offline,
  error,
  notice,
  showBackFallback,
  onBack,
  onCreate,
  onQuickJoin,
  onRefresh,
  onOpenTable,
  onResumeTable,
  onConfirmJoin,
  onCancelJoin,
}: {
  form: DurakCreateForm;
  balance: number | null;
  tables: GameTable[];
  mine: GameTable[];
  pendingJoin: GameTable | null;
  inviteToken: string;
  loading: boolean;
  busy: boolean;
  offline: boolean;
  error: string;
  notice: string;
  showBackFallback: boolean;
  onBack: () => void;
  onCreate: () => void;
  onQuickJoin: () => void;
  onRefresh: () => void;
  onOpenTable: (table: GameTable) => void;
  onResumeTable: (table: GameTable) => void;
  onConfirmJoin: (table: GameTable, token?: string) => void;
  onCancelJoin: () => void;
}) {
  const myIds = new Set(mine.map(table => table.id));
  const modeName = "Підкидний";
  const availableTables = tables.filter(
    table => table.gameId === "durak" && table.visibility === "public"
  );

  return (
    <main className="gc-durak-lobby">
      <header className="gc-durak-lobby-head">
        {showBackFallback && (
          <button
            className="gc-durak-back-fallback"
            type="button"
            onClick={onBack}
            aria-label="Назад до ігор"
          >
            <ArrowLeft size={21} />
          </button>
        )}
        <h1>Дурак</h1>
        <span className="gc-durak-balance-chip" aria-label={`Баланс: ${balance ?? "невідомо"} монет`}>
          <Coins size={20} fill="currentColor" aria-hidden="true" />
          <b>{balance === null ? "—" : balance.toLocaleString("uk-UA")}</b>
        </span>
      </header>

      {offline && <div className="gc-durak-message" role="status">З’єднання втрачено. Повторно підключаємося…</div>}
      {error && <div className="gc-durak-message is-error" role="alert">{error}</div>}
      {notice && <div className="gc-durak-message" role="status">{notice}</div>}

      <section className="gc-durak-launch-card" aria-label="Створення або швидкий вступ у гру">
        <div className="gc-durak-launch-actions">
          <button type="button" className="gc-durak-launch-primary" onClick={onCreate} disabled={busy}>
            Створити
          </button>
          <button type="button" className="gc-durak-launch-secondary" onClick={onQuickJoin} disabled={busy || loading}>
            Швидка гра
          </button>
        </div>
        <div className="gc-durak-launch-meta">
          <span>{modeName}</span>
          <i aria-hidden="true">·</i>
          <span>{form.deckSize}</span>
          <Users size={17} fill="currentColor" aria-hidden="true" />
          <span>{form.players}</span>
          <Coins size={17} fill="currentColor" aria-hidden="true" />
          <span>{form.stake}</span>
        </div>
      </section>

      <div className="gc-durak-rooms-heading">
        <h2>ВІДКРИТІ КІМНАТИ</h2>
        <button type="button" onClick={onRefresh} disabled={loading}>
          <RefreshCw size={15} className={loading ? "is-spinning" : ""} />
          Оновити
        </button>
      </div>

      <section className="gc-durak-room-list" aria-label="Відкриті кімнати Дурня">
        {loading ? (
          <p className="gc-durak-room-status" role="status">Завантажуємо кімнати…</p>
        ) : availableTables.length ? (
          availableTables.map(table => {
            const mineAlready = myIds.has(table.id);
            const mode = "Підкидний";
            const deckSize = table.options?.deckSize === 52 ? 52 : 36;
            return (
              <button
                className="gc-durak-room-row"
                type="button"
                key={table.id}
                onClick={() => mineAlready ? onResumeTable(table) : onOpenTable(table)}
                disabled={busy}
              >
                <span className="gc-durak-room-icon" aria-hidden="true">
                  {mineAlready ? <Check size={18} /> : <Users size={18} />}
                </span>
            <span className="gc-durak-room-copy">
              <b>{table.name || "Дурень"}</b>
              <small>{mode} · {deckSize} · {table.players.length}/{table.maxPlayers} гравців</small>
            </span>
                <strong><Coins size={16} fill="currentColor" />{table.stake}</strong>
                <ChevronDown size={16} className="gc-durak-room-chevron" aria-hidden="true" />
              </button>
            );
          })
        ) : (
          <div className="gc-durak-empty-state">
            <span className="gc-durak-empty-card" aria-hidden="true">
              <PlayingCard card={{ rank: "A", suit: "spades" }} faceDown size="small" cardWidth={43} skin="durak-reference" />
            </span>
            <b>Відкритих кімнат поки немає</b>
            <p>Створи свою або спробуй швидку гру.</p>
          </div>
        )}
      </section>

      {mine.length > 0 && (
        <details className="gc-durak-my-tables">
          <summary>Мої столи <b>{mine.length}</b><ChevronDown size={16} aria-hidden="true" /></summary>
          <div className="gc-durak-my-table-list">
            {mine.map(table => (
              <button type="button" key={table.id} onClick={() => onResumeTable(table)} disabled={busy}>
                <span>{table.name || "Дурень"}</span>
                <small>{table.status === "playing" || table.status === "started" ? "У грі" : "Очікування"} · {table.players.length}/{table.maxPlayers}</small>
                <strong><Coins size={15} fill="currentColor" />{table.stake}</strong>
              </button>
            ))}
          </div>
        </details>
      )}

      {pendingJoin && (
        <div className="gc-durak-sheet-backdrop gc-durak-join-backdrop">
          <section className="gc-durak-sheet gc-durak-join-sheet" role="dialog" aria-modal="true" aria-labelledby="gc-durak-join-title">
            <span className="gc-durak-sheet-handle" aria-hidden="true" />
            <div className="gc-durak-sheet-heading">
              <div>
                <h2 id="gc-durak-join-title">Приєднатися до гри</h2>
                <p>{pendingJoin.name || "Дурень"}</p>
              </div>
              <span className="gc-durak-balance-chip"><Coins size={18} fill="currentColor" /><b>{balance === null ? "—" : balance.toLocaleString("uk-UA")}</b></span>
            </div>
            <div className="gc-durak-join-facts">
              <span>Підкидний · {pendingJoin.options?.deckSize === 52 ? 52 : 36} карт</span>
              <span>{pendingJoin.players.length}/{pendingJoin.maxPlayers} гравців</span>
              <b><Coins size={17} fill="currentColor" />{pendingJoin.stake} з кожного</b>
            </div>
            <p className="gc-durak-sheet-note">
              Ставка резервується сервером за чинними правилами столу. Перед вступом перевір учасників і розмір ставки.
            </p>
            <div className="gc-durak-sheet-actions">
              <button className="gc-durak-primary-button" type="button" disabled={busy} onClick={() => onConfirmJoin(pendingJoin, inviteToken || undefined)}>
                {busy ? "Приєднуємо…" : "Підтвердити вступ"}
              </button>
              <button className="gc-durak-secondary-button" type="button" disabled={busy} onClick={onCancelJoin}>Не зараз</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export function DurakCreateWizard({
  step,
  form,
  balance,
  stakeOptions,
  playerOptions,
  busy,
  error,
  offline,
  showBackFallback,
  onChange,
  onBack,
  onNext,
  onCreate,
}: {
  step: 1 | 2 | 3;
  form: DurakCreateForm;
  balance: number | null;
  stakeOptions: number[];
  playerOptions: number[];
  busy: boolean;
  error: string;
  offline: boolean;
  showBackFallback: boolean;
  onChange: (patch: Partial<DurakCreateForm>) => void;
  onBack: () => void;
  onNext: () => void;
  onCreate: () => void;
}) {
  const visibleStakes = getDurakPresetStakes(stakeOptions);
  const normalizedPlayers = playerOptions.length ? playerOptions : [2];
  const projectedBank = form.stake * form.players;
  const canCreate = !busy && visibleStakes.includes(form.stake) && normalizedPlayers.includes(form.players);

  return (
    <div className="gc-durak-sheet-backdrop gc-durak-create-backdrop">
      <section className={`gc-durak-sheet gc-durak-create-sheet step-${step}${showBackFallback ? " has-back-fallback" : ""}`} role="dialog" aria-modal="true" aria-labelledby="gc-durak-create-title">
        <span className="gc-durak-sheet-handle" aria-hidden="true" />
        {showBackFallback && (
          <button className="gc-durak-sheet-back-fallback" type="button" onClick={onBack} aria-label={step > 1 ? "Попередній крок" : "Закрити створення"}>
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="gc-durak-sheet-heading">
          <div>
            <h2 id="gc-durak-create-title">Нова гра</h2>
          </div>
          <span className="gc-durak-balance-chip" aria-label={`Баланс: ${balance ?? "невідомо"} монет`}>
            <Coins size={19} fill="currentColor" aria-hidden="true" />
            <b>{balance === null ? "—" : balance.toLocaleString("uk-UA")}</b>
          </span>
        </div>

        <div className="gc-durak-progress" aria-label={`Крок ${step} з 3`}>
          {[1, 2, 3].map(value => <span key={value} className={value === step ? "is-active" : value < step ? "is-complete" : ""} />)}
        </div>

        <div className="gc-durak-step-content">
          {step === 1 && (
            <>
              <fieldset className="gc-durak-fieldset">
                <legend>ПРАВИЛА</legend>
                <div className="gc-durak-segmented"><span className="is-selected" aria-current="true">Підкидний дурень</span></div>
                <p className="gc-durak-field-hint">Відбивайся або забирай карти; підкидання — за рангом атак.</p>
              </fieldset>
              <fieldset className="gc-durak-fieldset gc-durak-deck-fieldset">
                <legend>КОЛОДА</legend>
                <div className="gc-durak-segmented" role="radiogroup" aria-label="Розмір колоди">
                  <button type="button" role="radio" aria-checked={form.deckSize === 36} className={form.deckSize === 36 ? "is-selected" : ""} onClick={() => onChange({ deckSize: 36 })}>36 карт</button>
                  <button type="button" role="radio" aria-checked={form.deckSize === 52} className={form.deckSize === 52 ? "is-selected" : ""} onClick={() => onChange({ deckSize: 52 })}>52 карти</button>
                </div>
                <p className="gc-durak-field-hint">У колоді 36 карт — від шісток, у 52 — від двійок.</p>
              </fieldset>
            </>
          )}

          {step === 2 && (
            <>
              <fieldset className="gc-durak-fieldset">
                <legend>ГРАВЦІ</legend>
                <div className="gc-durak-player-counts" role="radiogroup" aria-label="Кількість гравців за столом">
                  {normalizedPlayers.map(count => {
                    const selected = form.players === count;
                    return <button key={count} type="button" role="radio" aria-checked={selected} className={selected ? "is-selected" : ""} onClick={() => onChange({ players: count })}>{count}</button>;
                  })}
                </div>
                <p className="gc-durak-field-hint">Господар починає гру, коли всі гості натиснуть «Готовий».</p>
              </fieldset>
              <fieldset className="gc-durak-fieldset">
                <legend>КІМНАТА</legend>
                <div className="gc-durak-segmented" role="radiogroup" aria-label="Видимість кімнати">
                  <button type="button" role="radio" aria-checked={form.visibility === "public"} className={form.visibility === "public" ? "is-selected" : ""} onClick={() => onChange({ visibility: "public" })}>Відкрита</button>
                  <button type="button" role="radio" aria-checked={form.visibility === "private"} className={form.visibility === "private" ? "is-selected" : ""} onClick={() => onChange({ visibility: "private" })}>Закрита</button>
                </div>
                <p className="gc-durak-field-hint">{form.visibility === "public" ? "Видна в загальному списку — приєднатися може будь-хто." : "До столу можна потрапити лише за персональним посиланням."}</p>
              </fieldset>
            </>
          )}

          {step === 3 && (
            <fieldset className="gc-durak-fieldset gc-durak-stake-fieldset">
              <legend>СТАВКА</legend>
              <div className="gc-durak-stake-value"><Coins size={26} fill="currentColor" aria-hidden="true" /><b>{form.stake}</b></div>
              <div className="gc-durak-stake-options" role="radiogroup" aria-label="Ставка в монетах">
                {visibleStakes.map(value => {
                  const selected = form.stake === value;
                  return <button key={value} type="button" role="radio" aria-checked={selected} className={selected ? "is-selected" : ""} onClick={() => onChange({ stake: value })}><Coins size={18} fill="currentColor" aria-hidden="true" />{value}</button>;
                })}
              </div>
              <p className="gc-durak-bank-estimate"><Coins size={16} fill="currentColor" aria-hidden="true" /> {form.stake} з кожного · банк {projectedBank}</p>
            </fieldset>
          )}
        </div>

        {(offline || error) && <div className="gc-durak-message is-error" role={error ? "alert" : "status"}>{error || "З’єднання втрачено. Повторно підключаємося…"}</div>}

        <div className="gc-durak-sheet-actions">
          {step < 3 ? (
            <button className="gc-durak-primary-button" type="button" onClick={onNext} disabled={busy || (step === 2 && !normalizedPlayers.includes(form.players))}>Далі</button>
          ) : (
            <button className="gc-durak-primary-button" type="button" onClick={onCreate} disabled={!canCreate}>{busy ? "Створюємо…" : "Створити стіл"}</button>
          )}
        </div>
      </section>
    </div>
  );
}

export function DurakResult({ table, onAgain }: { table: GameTable; onAgain: () => void }) {
  const result = table.result && typeof table.result === "object" ? table.result as Record<string, unknown> : {};
  const payouts = Array.isArray(result.payouts) ? result.payouts as Array<Record<string, unknown>> : [];
  const rows = table.players.map(player => {
    const payout = payouts.find(item => String(item.playerId) === player.id);
    const returned = typeof payout?.amount === "number" ? payout.amount : null;
    const net = returned === null ? null : returned - table.stake;
    return {
      player,
      net,
      kind: net === null ? "unknown" : net > 0 ? "winner" : net < 0 ? "loser" : "draw",
    } as const;
  }).sort((a, b) => (b.net ?? Number.NEGATIVE_INFINITY) - (a.net ?? Number.NEGATIVE_INFINITY));
  const isDraw = result.draw === true;
  const signed = (value: number | null) => value === null ? "—" : value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : "0";
  const myRow = rows.find(row => row.player.id === table.myPlayerId);
  const myNet = myRow?.net ?? null;
  const title = isDraw || myRow?.kind === "draw" ? "Нічия" : myRow?.kind === "loser" ? "Дурень" : myRow?.kind === "winner" ? "Перемога" : "Партію завершено";

  return (
    <section className="gc-durak-result" aria-labelledby="gc-durak-result-title">
      <header className="gc-durak-result-hero">
        <h1 id="gc-durak-result-title">{title}</h1>
        {isDraw && <p>Ставки повернено за результатом гри.</p>}
        <strong><span>{signed(myNet)}</span><Coins size={21} fill="currentColor" aria-hidden="true" /></strong>
      </header>
      <div className="gc-durak-result-players" aria-label="Результати гравців">
        {rows.map((row, index) => {
          const name = row.player.nick || row.player.name || "Гравець";
          return (
            <article className={`gc-durak-result-player is-${row.kind}`} key={row.player.id}>
              <span className="gc-durak-result-rank" aria-label={`Місце ${index + 1}`}>
                {row.kind === "winner" ? <Trophy size={18} /> : index + 1}
              </span>
              <span className="gc-durak-result-avatar">
                {row.player.avatarUrl ? <img src={row.player.avatarUrl} alt="" /> : name.slice(0, 1)}
              </span>
              <span className="gc-durak-result-name">
                <b>{name}{row.player.vip && <span title="VIP"> 👑</span>}</b>
                <small>{row.kind === "loser" ? "дурень" : row.kind === "winner" ? "переможець" : row.kind === "draw" ? "нічия" : "результат недоступний"}</small>
              </span>
              <strong>{row.net === null ? "—" : <><span>{signed(row.net)}</span><Coins size={17} fill="currentColor" aria-hidden="true" /></>}</strong>
            </article>
          );
        })}
      </div>
      <div className="gc-durak-result-actions">
        <button className="gc-durak-rematch-disabled" type="button" disabled aria-disabled="true" title="Окрему дію реваншу сервер не підтримує">Реванш</button>
        <button className="gc-durak-primary-button" type="button" onClick={onAgain}>Новий стіл</button>
      </div>
    </section>
  );
}
