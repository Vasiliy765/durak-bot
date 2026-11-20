import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Copy,
  Coins,
  Crown,
  Grid3X3,
  Layers,
  LockKeyhole,
  MoreHorizontal,
  RefreshCw,
  Smile,
  ShieldAlert,
  Ship,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  GameCenterApiError,
  gameCenterApi,
  type ArcadeGameId,
  type GameCenterConfig,
  type GameTable,
} from "./gameCenterApi";
import {
  BattleshipBoard,
  PlayingCard,
  ShipSprite,
  TicTacToeBoard,
  type BattleshipCellState,
} from "./GameAssets";
import { BATTLESHIP_FLEET_LENGTHS, isFleetPlacementValid, nextFleetShipIndex, previewBattleshipCells } from "./battleshipPlacement";
import { layoutDurakHand } from "./durakHandLayout";
import "./GameCenterScreen.css";
import { gameApi } from "../../lib/gameApi";
import { getTelegramWebApp } from "../../lib/telegram";
import {
  DurakCreateWizard,
  DurakLobby,
  DurakResult,
  getDurakPresetStakes,
  type DurakCreateForm,
} from "./DurakReferenceFlow";

/* Integration: Home.tsx should mount <GameCenterScreen onBack={...} initialInviteToken={...}/> for the new arcade route; this component deliberately does not replace legacy Spyfall rooms. The server must expose the /api/game-center endpoints, per-viewer isOwner/myPlayerId, redacted projection, legalActions, and signed inviteLink described in gameCenterApi.ts. */
type Props = { onBack: () => void; initialInviteToken?: string | null; soundOn: boolean; onToggleSound: () => void };
const titles: Record<ArcadeGameId, string> = {
  battleship: "Морський бій",
  durak: "Дурень",
  tic_tac_toe: "Хрестики-нулики",
};
const catalogOrder: Record<ArcadeGameId, number> = {
  battleship: 0,
  durak: 1,
  tic_tac_toe: 2,
};
const descriptions: Record<ArcadeGameId, string> = {
  battleship: "Тактична дуель на прихованих флотах.",
  durak: "Карткова гра на 2–6 учасників.",
  tic_tac_toe: "Швидка дуель на полі 3×3.",
};
const uid = () => crypto.randomUUID();
const str = (v: unknown, fallback = "") =>
  typeof v === "string" ? v : fallback;
const num = (v: unknown, fallback = 0) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;
const rec = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
function optionChoices(
  game: ArcadeGameId,
  options: Record<string, unknown> = {}
) {
  if (game === "durak")
    return arr(options.modes).map(value => ({
      value: String(value),
      label: "Підкидний",
    }));
  if (game === "battleship")
    return arr(options.extraShotOnHit).map(value => ({
      value: String(value),
      label: value
        ? "Додатковий постріл після влучання"
        : "Без додаткового пострілу",
    }));
  return [];
}

export default function GameCenterScreen({
  onBack,
  initialInviteToken,
  soundOn,
  onToggleSound,
}: Props) {
  const [config, setConfig] = useState<GameCenterConfig | null>(null);
  const [game, setGame] = useState<ArcadeGameId>("battleship");
  const [tables, setTables] = useState<GameTable[]>([]);
  const [mine, setMine] = useState<GameTable[]>([]);
  const [table, setTable] = useState<GameTable | null>(null);
  const currentTableRef = useRef<GameTable | null>(null);
  currentTableRef.current = table;
  const [inviteToken, setInviteToken] = useState(initialInviteToken || "");
  const [stakeFilter, setStakeFilter] = useState("");
  const [view, setView] = useState<"catalog" | "durak-home" | "create" | "table">("catalog");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingJoin, setPendingJoin] = useState<GameTable | null>(null);
  const [durakWizardStep, setDurakWizardStep] = useState<1 | 2 | 3>(1);
  const [balance, setBalance] = useState<number | null>(null);
  const [hasTelegramBackButton, setHasTelegramBackButton] = useState(false);
  const [form, setForm] = useState<DurakCreateForm>({
    name: "",
    stake: 10,
    players: 2,
    visibility: "public" as "public" | "private",
    rule: "",
    deckSize: 36,
  });
  const enabled = useMemo(
    () =>
      (config?.games || [])
        .filter(g => g.enabled)
        .sort((a, b) => catalogOrder[a.id] - catalogOrder[b.id]),
    [config]
  );
  const myGameTables = useMemo(
    () => mine.filter(t => t.gameId === game),
    [mine, game]
  );
  const selectedGame = config?.games.find(g => g.id === game);
  const isOwner = table?.isOwner === true;
  const myPlayer = table?.players.find(p => p.id === table.myPlayerId);
  const myReady = Boolean(myPlayer?.ready);
  const gameName = (id: string) => titles[id as ArcadeGameId] || "Гра";

  const loadConfig = useCallback(async () => {
    const result = await gameCenterApi.config();
    setConfig(result);
    const first = result.games.find(x => x.enabled)?.id;
    if (first)
      setGame(current =>
        result.games.some(x => x.id === current && x.enabled) ? current : first
      );
    setForm(f => ({ ...f, stake: result.stakeOptions?.[0] ?? 10 }));
  }, []);
  const refreshTables = useCallback(async () => {
    const [pub, mineRes] = await Promise.all([
      gameCenterApi.publicTables(
        game,
        stakeFilter ? Number(stakeFilter) : undefined
      ),
      gameCenterApi.mine(),
    ]);
    setTables(pub.tables || []);
    setMine(mineRes.tables || []);
    setOffline(false);
  }, [game, stakeFilter]);
  const refreshTable = useCallback(async (id: string) => {
    const result = await gameCenterApi.table(id);
    setTable(result.table);
    setOffline(false);
    return result.table;
  }, []);
  const refreshBalance = useCallback(async () => {
    try {
      const overview = await gameApi.economyOverview();
      setBalance(overview.balance);
    } catch {
      // A wallet read failure must not block the actual game flow.
    }
  }, []);
  useEffect(() => {
    void loadConfig()
      .then(refreshTables)
      .catch(e => setError(message(e)))
      .finally(() => setLoading(false));
  }, [loadConfig, refreshTables]);
  useEffect(() => {
    if (!config) return;
    void refreshTables().catch(e => setError(message(e)));
  }, [config, refreshTables]);
  useEffect(() => {
    void refreshBalance();
    setHasTelegramBackButton(Boolean(getTelegramWebApp()?.BackButton));
  }, [refreshBalance]);
  useEffect(() => {
    if (table?.gameId === "durak" && ["finished", "complete"].includes(table.status))
      void refreshBalance();
  }, [table?.gameId, table?.status, refreshBalance]);
  useEffect(() => {
    if (!initialInviteToken) return;
    setInviteToken(initialInviteToken);
    setLoading(true);
    void gameCenterApi
      .invite(initialInviteToken)
      .then(({ table: t }) => {
        setPendingJoin(t);
        setGame(t.gameId);
        if (t.gameId === "durak") setView("durak-home");
      })
      .catch(e => setError(message(e)))
      .finally(() => setLoading(false));
  }, [initialInviteToken]);
  useEffect(() => {
    if (
      !table ||
      ![
        "waiting",
        "lobby",
        "playing",
        "started",
        "finished",
        "complete",
      ].includes(table.status)
    )
      return;
    const timer = window.setInterval(() => {
      void refreshTable(table.id).catch(error => {
        if (error instanceof GameCenterApiError && [403, 404].includes(error.status)) {
          setTable(null);
          setView(table.gameId === "durak" ? "durak-home" : "catalog");
          setNotice("Стіл завершено, скасовано або ви вже вийшли. Можна створити новий.");
          setOffline(false);
          void refreshTables().catch(() => setOffline(true));
        } else setOffline(true);
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [table?.id, table?.status, table?.gameId, refreshTable, refreshTables]);
  useEffect(() => {
    if (!table?.myPlayerId || table.gameId !== "durak" || table.status !== "playing") return;
    let disposed = false;
    let socket: WebSocket | undefined;
    void gameCenterApi.reactionSocketTicket(table.id).then(({ ticket }) => {
      if (disposed) return;
      socket = gameCenterApi.openReactionSocket(ticket);
      socket.addEventListener("message", messageEvent => {
        try {
          const event = JSON.parse(String(messageEvent.data)) as Record<string, unknown>;
          if (event.type !== "reaction" || typeof event.playerId !== "string" || !["😂", "🤦", "🤬", "😏", "😭", "🤩", "😉"].includes(String(event.emoji))) return;
          setTable(current => {
            if (!current || current.id !== table.id) return current;
            const events = Array.isArray(current.events) ? current.events : [];
            const duplicate = events.some(item => {
              const saved = rec(item);
              return saved.type === "reaction" && saved.playerId === event.playerId && saved.emoji === event.emoji && new Date(String(saved.at)).getTime() === new Date(String(event.at)).getTime();
            });
            return duplicate ? current : { ...current, events: [...events, event] };
          });
        } catch { /* polling remains the durable fallback */ }
      });
    }).catch(() => { /* polling remains the durable fallback */ });
    return () => {
      disposed = true;
      socket?.close();
    };
  }, [table?.id, table?.gameId, table?.status, table?.myPlayerId]);
  useEffect(() => {
    if (!table?.myPlayerId || !["lobby", "playing"].includes(table.status))
      return;
    const heartbeat = () =>
      void gameCenterApi.heartbeat(table.id).catch(() => setOffline(true));
    heartbeat();
    const timer = window.setInterval(heartbeat, 30_000);
    return () => window.clearInterval(timer);
  }, [table?.id, table?.status, table?.myPlayerId]);
  function message(e: unknown) {
    return e instanceof Error
      ? e.message
      : "Не вдалося зв’язатися із сервером.";
  }
  async function perform(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await fn();
      return result;
    } catch (e) {
      setError(message(e));
      if (table?.id) {
        try {
          await refreshTable(table.id);
        } catch {
          setOffline(true);
        }
      }
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function openTable(t: GameTable) {
    setTable(t);
    setGame(t.gameId);
    setView("table");
    setInviteToken(t.inviteToken || "");
    await perform(() => refreshTable(t.id));
  }
  async function createTable() {
    if (!config || !selectedGame) return;
    const id = uid();
    const supported = selectedGame.playerCounts || [];
    const count = supported.length
      ? form.players
      : num(selectedGame.maxPlayers, 2);
    const result = await perform(() =>
      gameCenterApi.create({
        gameId: game,
        name: form.name.trim() || titles[game],
        stake: form.stake,
        minPlayers: num(selectedGame.minPlayers, 2),
        maxPlayers: count,
        visibility: form.visibility,
        options:
          game === "durak"
            ? { deckSize: form.deckSize }
            : form.rule === ""
              ? {}
              : game === "battleship"
                ? { extraShotOnHit: form.rule === "true" }
                : { mode: form.rule },
        requestId: id,
      })
    );
    if (result && typeof result === "object" && "table" in result) {
      const t = (result as { table: GameTable }).table;
      setTable(t);
      setView("table");
      setInviteToken(t.inviteToken || "");
    }
  }
  async function confirmJoin(t: GameTable, token?: string) {
    const result = await perform(() => gameCenterApi.join(t.id, token));
    if (result && typeof result === "object" && "table" in result) {
      setTable((result as { table: GameTable }).table);
      setView("table");
      setPendingJoin(null);
    }
  }
  function chooseGame(id: ArcadeGameId) {
    setGame(id);
    if (id !== "durak") return;
    const durak = config?.games.find(item => item.id === "durak");
    const modes = optionChoices("durak", durak?.options);
    const players = durak?.playerCounts || [num(durak?.maxPlayers, 2)];
    setForm(current => ({
      ...current,
      name: titles.durak,
      players: players.includes(current.players) ? current.players : players[0] || 2,
      rule: modes.some(mode => mode.value === current.rule) ? current.rule : modes[0]?.value || "throw_in",
    }));
    setDurakWizardStep(1);
    setPendingJoin(null);
    setError("");
    setNotice("");
    setView("durak-home");
  }
  function openDurakCreate() {
    const modes = optionChoices("durak", selectedGame?.options);
    const players = selectedGame?.playerCounts || [num(selectedGame?.maxPlayers, 2)];
    const visibleStakes = getDurakPresetStakes(config?.stakeOptions || []);
    setForm(current => ({
      ...current,
      name: titles.durak,
      stake: visibleStakes.includes(current.stake) ? current.stake : visibleStakes[0] || 10,
      players: players.includes(current.players) ? current.players : players[0] || 2,
      visibility: "public",
      rule: modes.some(mode => mode.value === current.rule) ? current.rule : modes[0]?.value || "throw_in",
    }));
    setDurakWizardStep(1);
    setPendingJoin(null);
    setError("");
    setNotice("");
    setView("create");
  }
  async function quickJoinDurak() {
    const current = await perform(() => gameCenterApi.active());
    const active = current && typeof current === "object" && "table" in current
      ? (current as { table: GameTable | null }).table
      : null;
    if (active) {
      setNotice(active.gameId === "durak" ? "Повертаємо вас до активного столу." : `Спочатку відкриваємо ваш активний стіл «${gameName(active.gameId)}».`);
      await openTable(active);
      return;
    }
    const candidates = tables.filter(item =>
      item.gameId === "durak" &&
      item.visibility === "public" &&
      ["waiting", "lobby"].includes(item.status) &&
      item.players.length < item.maxPlayers &&
      item.stake === form.stake
    );
    const candidate = candidates.find(item => mine.some(own => own.id === item.id)) || candidates[0];
    if (!candidate) {
      setNotice("Відкритого столу немає — створюємо новий.");
      void createTable();
      return;
    }
    setError("");
    if (mine.some(item => item.id === candidate.id)) void openTable(candidate);
    else void confirmJoin(candidate);
  }
  async function update(promise: Promise<{ table: GameTable }>) {
    const result = await perform(() => promise);
    if (result && "table" in (result as object))
      setTable((result as { table: GameTable }).table);
  }
  const copyInvite = async () => {
    const link = table?.inviteLink || "";
    if (!link) {
      setError("Сервер ще не надав посилання-запрошення.");
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      setNotice("Посилання скопійовано.");
    } catch {
      setNotice(`Скопіюйте посилання вручну: ${link}`);
    }
  };
  const shareInvite = () => {
    const link = table?.inviteLink || "";
    if (!link) {
      setError("Посилання-запрошення недоступне.");
      return;
    }
    const tg = (
      window as Window & {
        Telegram?: { WebApp?: { openTelegramLink?: (url: string) => void } };
      }
    ).Telegram?.WebApp;
    const share = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(`Приєднуйся до гри: ${table?.name || gameName(table?.gameId || game)}`)}`;
    if (tg?.openTelegramLink) tg.openTelegramLink(share);
    else window.open(share, "_blank", "noopener,noreferrer");
  };

  const exitTable = useCallback(async (target: GameTable) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (["lobby", "waiting", "playing", "started"].includes(target.status)) {
        if (target.isOwner && ["lobby", "waiting"].includes(target.status))
          await gameCenterApi.cancel(target.id);
        else await gameCenterApi.leave(target.id);
      }
      setTable(null);
      setView(target.gameId === "durak" ? "durak-home" : "catalog");
      await refreshTables();
    } catch (error) {
      setError(message(error));
      try { await refreshTable(target.id); } catch { setOffline(true); }
    } finally {
      setBusy(false);
    }
  }, [refreshTable, refreshTables]);

  const pageBack = useCallback(() => {
    if (game === "durak") {
      if (pendingJoin) {
        setPendingJoin(null);
        return;
      }
      if (view === "create") {
        if (durakWizardStep > 1) {
          setDurakWizardStep(step => (step > 1 ? (step - 1) as 1 | 2 | 3 : 1));
        } else {
          setView("durak-home");
        }
        return;
      }
      if (view === "table") {
        const current = currentTableRef.current;
        if (current) void exitTable(current);
        return;
      }
      if (view === "durak-home") {
        setView("catalog");
        return;
      }
    }
    if (view === "table") {
      const current = currentTableRef.current;
      if (current) void exitTable(current);
      return;
    }
    if (view !== "catalog") {
      setView("catalog");
      return;
    }
    onBack();
  }, [durakWizardStep, exitTable, game, onBack, pendingJoin, view]);
  const isDurakJourney = game === "durak" && view !== "catalog";
  useEffect(() => {
    const backButton = getTelegramWebApp()?.BackButton;
    if (!isDurakJourney || !backButton) return;
    backButton.show();
    backButton.onClick(pageBack);
    return () => {
      backButton.offClick(pageBack);
      backButton.hide();
    };
  }, [isDurakJourney, pageBack]);
  useEffect(() => {
    const webApp = getTelegramWebApp();
    const color = isDurakJourney ? "#101011" : "#16181D";
    webApp?.setHeaderColor?.(color);
    webApp?.setBackgroundColor?.(color);
  }, [isDurakJourney]);
  if (loading)
    return (
      <section className="gc-screen">
        <p role="status">Завантажуємо ігровий центр…</p>
      </section>
    );
  const immersiveDurak =
    view === "table" &&
    table?.gameId === "durak" &&
    ["playing", "started"].includes(table.status);
  return (
      <section className={`gc-screen${isDurakJourney ? " gc-screen--durak-reference" : ""}${isDurakJourney && !hasTelegramBackButton ? " gc-screen--durak-reference--fallback" : ""}${immersiveDurak ? " gc-screen--durak-live" : ""}${view === "catalog" && !pendingJoin ? " gc-screen--catalog" : ""}`}>
      <header className="gc-head">
        <button className="gc-back" onClick={pageBack}>
          <ArrowLeft size={17} /> Назад
        </button>
        <span className="gc-overline">ОПЕРАТИВНИЙ ЦЕНТР · АРКАДА</span>
        <h1>
          {view === "table"
            ? table?.name || gameName(table?.gameId || game)
            : view === "create"
              ? "Новий стіл"
              : view === "catalog"
                ? "ІГРОВИЙ ЦЕНТР"
                : "Новий стіл"}
        </h1>
        <p>{view === "catalog" ? "Оберіть гру та створіть стіл." : "Ставка — звичайні монети. Результат і виплати визначає сервер."}</p>
      </header>
      {offline && !isDurakJourney && (
        <div className="gc-alert" role="status">
          З’єднання втрачено. Повторно підключаємося…
        </div>
      )}
      {error && !isDurakJourney && (
        <div className="gc-alert" role="alert">
          <ShieldAlert size={16} />
          {error}
          <button
            onClick={() => setError("")}
            aria-label="Закрити повідомлення"
          >
            ×
          </button>
        </div>
      )}
      {notice && !isDurakJourney && (
        <div className="gc-note" role="status">
          {notice}
        </div>
      )}
      {isDurakJourney && view === "table" && (offline || error || notice) && (
        <div className={`gc-durak-message gc-durak-table-message${error ? " is-error" : ""}`} role={error ? "alert" : "status"}>
          {error || notice || "З’єднання втрачено. Повторно підключаємося…"}
        </div>
      )}
      {pendingJoin && !isDurakJourney && (
        <section className="gc-card gc-confirm">
          <span className="gc-overline">
            ЗАПРОШЕННЯ ·{" "}
            {pendingJoin.visibility === "private"
              ? "ПРИВАТНИЙ СТІЛ"
              : "ПУБЛІЧНИЙ СТІЛ"}
          </span>
          <h2>{pendingJoin.name || gameName(pendingJoin.gameId)}</h2>
          <p>
            Ставка: <b>{pendingJoin.stake} монет</b> · учасники:{" "}
            {pendingJoin.players.length}/{pendingJoin.maxPlayers}
          </p>
          <Rules game={pendingJoin.gameId} options={pendingJoin.options} />
          <p className="gc-rules">
            Ставка стягується лише після старту. До старту можна вийти, а
            скасоване лобі повертає резерв. Під час партії тайм-аут/відключення
            обробляються за правилами сервера. Перемога ділить фактичний банк;
            нічия повертає ставку.
          </p>
          <div className="gc-actions">
            <button
              className="gc-button"
              disabled={busy}
              onClick={() => void confirmJoin(pendingJoin, inviteToken)}
            >
              Підтвердити вступ
            </button>
            <button
              className="gc-button gc-quiet"
              onClick={() => setPendingJoin(null)}
            >
              Не зараз
            </button>
          </div>
        </section>
      )}
      {isDurakJourney && (view === "durak-home" || view === "create") && (
        <DurakLobby
          form={form}
          balance={balance}
          tables={tables}
          mine={myGameTables}
          pendingJoin={pendingJoin}
          inviteToken={inviteToken}
          loading={loading}
          busy={busy}
          offline={offline}
          error={error}
          notice={notice}
          showBackFallback={!hasTelegramBackButton}
          onBack={pageBack}
          onCreate={openDurakCreate}
          onQuickJoin={quickJoinDurak}
          onRefresh={() => void refreshTables().catch(e => setError(message(e)))}
          onOpenTable={item => setPendingJoin(item)}
          onResumeTable={item => void openTable(item)}
          onConfirmJoin={(item, token) => void confirmJoin(item, token)}
          onCancelJoin={() => setPendingJoin(null)}
        />
      )}
      {isDurakJourney && view === "create" && (
        <DurakCreateWizard
          step={durakWizardStep}
          form={form}
          balance={balance}
          stakeOptions={config?.stakeOptions || []}
          playerOptions={selectedGame?.playerCounts || [num(selectedGame?.maxPlayers, 2)]}
          busy={busy}
          error={error}
          offline={offline}
          showBackFallback={!hasTelegramBackButton}
          onChange={patch => setForm(current => ({ ...current, ...patch }))}
          onBack={pageBack}
          onNext={() => setDurakWizardStep(step => (step < 3 ? (step + 1) as 1 | 2 | 3 : 3))}
          onCreate={() => void createTable()}
        />
      )}
      {view === "catalog" && !pendingJoin && (
        <>
          <nav className="gc-games" aria-label="Вибір гри">
            {enabled.map(item => {
              const Icon =
                item.id === "battleship"
                  ? Ship
                  : item.id === "durak"
                    ? Layers
                    : Grid3X3;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`gc-game-option gc-game-option--${item.id} ${game === item.id ? "selected" : ""}`}
                  aria-pressed={game === item.id}
                  onClick={() => chooseGame(item.id)}
                >
                  <span className="gc-game-icon" aria-hidden="true">
                    <Icon size={22} strokeWidth={1.9} />
                  </span>
                  <span className="gc-game-copy">
                    <b>{item.name || titles[item.id]}</b>
                    <small>{descriptions[item.id]}</small>
                  </span>
                </button>
              );
            })}
          </nav>
          <div className="gc-toolbar gc-toolbar--catalog">
            <label className="gc-stake-control">
              <span>Ставка</span>
              <select
                aria-label="Ставка нового столу"
                value={form.stake}
                onChange={e =>
                  setForm({ ...form, stake: Number(e.target.value) })
                }
              >
                {(config?.stakeOptions || [10, 25, 50, 100, 200]).map(n => (
                  <option key={n} value={n}>
                    {n} 🪙
                  </option>
                ))}
              </select>
            </label>
            <button
              className="gc-button gc-button--create"
              onClick={() => {
                if (game === "durak") {
                  openDurakCreate();
                  return;
                }
                setForm(f => ({ ...f, name: titles[game], rule: "" }));
                setView("create");
              }}
            >
              Створити стіл
            </button>
          </div>
          <details className="gc-table-disclosure">
            <summary>
              <span>Мої столи</span>
              <b>{myGameTables.length}</b>
              <ChevronDown size={16} aria-hidden="true" />
            </summary>
            <section className="gc-section gc-section--disclosure">
              <div className="gc-section-title">
                <h2>Мої столи</h2>
                <button
                  className="gc-icon"
                  onClick={() => void refreshTables()}
                  aria-label="Оновити столи"
                >
                  <RefreshCw size={15} />
                </button>
              </div>
              {myGameTables.length ? (
                myGameTables.map(t => (
                  <TableRow
                    key={t.id}
                    table={t}
                    onOpen={() => void openTable(t)}
                  />
                ))
              ) : (
                <p className="gc-empty">Ваших столів цієї гри поки немає.</p>
              )}
            </section>
          </details>
          <details className="gc-table-disclosure">
            <summary>
              <span>Відкриті столи</span>
              <b>{tables.length}</b>
              <ChevronDown size={16} aria-hidden="true" />
            </summary>
            <section className="gc-section gc-section--disclosure">
              <div className="gc-section-title">
                <h2>Відкриті столи</h2>
                <label className="gc-table-filter">
                  Ставка
                  <select
                    aria-label="Фільтр відкритих столів за ставкою"
                    value={stakeFilter}
                    onChange={e => setStakeFilter(e.target.value)}
                  >
                    <option value="">Будь-яка</option>
                    {(config?.stakeOptions || []).map(n => (
                      <option key={n} value={n}>
                        {n} монет
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {tables.length ? (
                tables.map(t => (
                  <TableRow
                    key={t.id}
                    table={t}
                    onOpen={() => setPendingJoin(t)}
                  />
                ))
              ) : (
                <p className="gc-empty">
                  Немає доступних столів. Створіть свій або спробуйте іншу ставку.
                </p>
              )}
            </section>
          </details>
        </>
      )}
      {view === "create" && game !== "durak" && (
        <section className="gc-card">
          <label className="gc-label">
            Назва столу
            <input
              value={form.name}
              maxLength={60}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <div className="gc-fields">
            <label className="gc-label">
              Ставка
              <select
                value={form.stake}
                onChange={e =>
                  setForm({ ...form, stake: Number(e.target.value) })
                }
              >
                {(config?.stakeOptions || [])
                  .filter(n => n >= 10 && n <= 200)
                  .map(n => (
                    <option key={n} value={n}>
                      {n} монет
                    </option>
                  ))}
              </select>
            </label>
            <label className="gc-label">
              Місць
              <select
                value={form.players}
                onChange={e =>
                  setForm({ ...form, players: Number(e.target.value) })
                }
              >
                {(
                  selectedGame?.playerCounts || [
                    num(selectedGame?.maxPlayers, 2),
                  ]
                ).map(n => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {selectedGame?.options &&
            optionChoices(game, selectedGame.options).length > 0 && (
              <label className="gc-label">
                Режим гри
                <select
                  value={form.rule}
                  onChange={e => setForm({ ...form, rule: e.target.value })}
                >
                  <option value="">Стандартні правила</option>
                  {optionChoices(game, selectedGame.options).map(choice => (
                    <option key={choice.value} value={choice.value}>
                      {choice.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          <fieldset className="gc-visibility">
            <legend>Доступ до столу</legend>
            <label>
              <input
                type="radio"
                checked={form.visibility === "public"}
                onChange={() => setForm({ ...form, visibility: "public" })}
              />{" "}
              Публічний
            </label>
            <label>
              <input
                type="radio"
                checked={form.visibility === "private"}
                onChange={() => setForm({ ...form, visibility: "private" })}
              />{" "}
              Приватний
            </label>
          </fieldset>
          <Rules game={game} />
          <p className="gc-rules">
            Перед стартом кожен учасник має повністю покрити ставку. До старту
            вихід повертає внесок; після старту тайм-аут або відключення мають
            наслідки за правилами столу. Нічия повертає ставки, переможці
            отримують частку лише з наявного банку. Ставка не змінюється після
            вступу.
          </p>
          <div className="gc-actions">
            <button
              className="gc-button"
              disabled={busy || !config?.stakeOptions.includes(form.stake)}
              onClick={() => void createTable()}
            >
              {busy ? "Створюємо…" : "Створити стіл"}
            </button>
            <button
              className="gc-button gc-quiet"
              onClick={() => setView("catalog")}
            >
              Скасувати
            </button>
          </div>
        </section>
      )}
      {view === "table" && table && (
        isDurakJourney && !hasTelegramBackButton && (
          <button className="gc-durak-live-back-fallback" type="button" onClick={pageBack} aria-label="Назад до кімнат">
            <ArrowLeft size={20} />
          </button>
        )
      )}
      {view === "table" && table && (
        <TableScreen
          table={table}
          busy={busy}
          inviteToken={inviteToken}
          onReady={v => void update(gameCenterApi.ready(table.id, v))}
          onStart={() => void update(gameCenterApi.start(table.id))}
          onLeave={() =>
            void exitTable(table)
          }
          onCancel={() =>
            void perform(async () => {
              await gameCenterApi.cancel(table.id);
              setTable(null);
              setView(table.gameId === "durak" ? "durak-home" : "catalog");
              await refreshTables();
            })
          }
          onKick={id => void update(gameCenterApi.kick(table.id, id))}
          onAction={a => void update(gameCenterApi.action(table.id, uid(), a))}
          onReact={emoji => void update(gameCenterApi.reaction(table.id, emoji))}
          onRefresh={() => void refreshTable(table.id)}
          onCopy={() => void copyInvite()}
          onShare={shareInvite}
          onDispute={details =>
            void perform(() => gameCenterApi.dispute(table.id, details))
          }
          onAgain={() => {
            setTable(null);
            setGame(table.gameId);
            setForm(f => ({
              ...f,
              name: table.name || titles[table.gameId],
              stake: table.stake,
              rule:
                typeof table.options?.mode === "string"
                  ? table.options.mode
                  : typeof table.options?.extraShotOnHit === "boolean"
                    ? String(table.options.extraShotOnHit)
                      : typeof table.options?.doubleAllowed === "boolean"
                        ? String(table.options.doubleAllowed)
                        : "",
            }));
            if (table.gameId === "durak") setDurakWizardStep(1);
            setView("create");
          }}
        />
      )}
      {view === "table" && table && table.gameId === "durak" && ["playing", "started"].includes(table.status) && (
        <button
          className="gc-durak-sound-toggle"
          type="button"
          onClick={onToggleSound}
          aria-label={soundOn ? "Вимкнути звук" : "Увімкнути звук"}
          aria-pressed={soundOn}
          title={soundOn ? "Вимкнути звук" : "Увімкнути звук"}
        >
          {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      )}

    </section>
  );
}
function tableResultReason(game: ArcadeGameId, reason: string) {
  if (game === "durak" && reason === "timeout_forfeit")
    return "Час на хід вичерпано — партію завершено за тайм-аутом.";
  return reason || "Партію завершено.";
}
function safeSummary(value: unknown) {
  const v = rec(value);
  return (
    [
      str(v.name, str(v.nick, "Гравець")),
      v.gamesPlayed !== undefined ? `Партій: ${v.gamesPlayed}` : "",
      v.wins !== undefined ? `Перемог: ${v.wins}` : "",
      v.result !== undefined ? `Результат: ${String(v.result)}` : "",
      v.payout !== undefined ? `Виплата: ${v.payout} монет` : "",
    ]
      .filter(Boolean)
      .join(" · ") || "Дані отримано від сервера"
  );
}
function Rules({
  game,
  options = {},
}: {
  game: string;
  options?: Record<string, unknown>;
}) {
  const text: Record<string, string> = {
    tic_tac_toe:
      "Двоє гравців ходять по черзі; три символи в ряд перемагають, заповнене поле означає нічию.",
    battleship:
      "Два гравці розміщують флоти. Координати та приховані кораблі визначає і показує лише сервер.",
    durak: "2–6 гравців; карти, козир і допустимі ходи задаються сервером.",
  };
  const mode =
    game === "durak"
      ? "Підкидний дурень"
      : game === "battleship" && typeof options.extraShotOnHit === "boolean"
        ? options.extraShotOnHit
          ? "Додатковий постріл після влучання"
          : "Без додаткового пострілу після влучання"
        : "Стандартний режим";
  return (
    <p className="gc-rules">
      <b>Правила:</b> {text[game] || "Сервер перевіряє всі ходи."} <b>Режим:</b>{" "}
      {mode}.
    </p>
  );
}

function TableRow({ table, onOpen }: { table: GameTable; onOpen: () => void }) {
  return (
    <article className="gc-table-row">
      <div className="gc-table-copy">
        <b>{table.name || titles[table.gameId]}</b>
        <small>
          {table.visibility === "private" ? "Приватний" : "Публічний"} ·{" "}
          {table.players?.length || 0}/{table.maxPlayers} гравців
        </small>
      </div>
      <strong>
        {table.stake} <small>монет</small>
      </strong>
      <button className="gc-button gc-small" onClick={onOpen}>
        {table.visibility === "private" ? "Запрошення" : "Переглянути"}
      </button>
    </article>
  );
}
function GameProjection({
  game,
  projection,
  legal,
  busy,
  onAction,
  players,
  myPlayerId,
  bank,
  stake,
  turnSeconds,
  events,
}: {
  game: ArcadeGameId;
  projection: Record<string, unknown>;
  legal: unknown[];
  busy: boolean;
  onAction: (a: unknown) => void;
  players: GameTable["players"];
  myPlayerId?: string;
  bank?: number;
  stake?: number;
  turnSeconds?: number | null;
  events: unknown[];
}) {
  const [placements, setPlacements] = useState<
    Array<{
      x: number;
      y: number;
      length: number;
      orientation: "horizontal" | "vertical";
    }>
  >([]);
  const [shipIndex, setShipIndex] = useState(0);
  const [touchDragShip, setTouchDragShip] = useState<number | null>(null);
  const [vertical, setVertical] = useState(false);
  const [target, setTarget] = useState(-1);
  const [warning, setWarning] = useState("");
  const handRef = useRef<HTMLDivElement>(null);
  const [handWidth, setHandWidth] = useState(0);
  useEffect(() => {
    const node = handRef.current;
    if (!node) return;
    const measure = () => setHandWidth(node.getBoundingClientRect().width);
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const action = (type: string, props: Record<string, unknown> = {}) =>
    legal.find(v => {
      const a = rec(v);
      return (
        a.type === type &&
        Object.entries(props).every(
          ([k, val]) => a[k] === val || rec(a.payload)[k] === val
        )
      );
    });
  const act = (type: string, props: Record<string, unknown> = {}) => {
    const a = action(type, props);
    if (a) onAction(a);
  };
  const lengthList = BATTLESHIP_FLEET_LENGTHS;
  if (game === "tic_tac_toe") {
    const board = arr(projection.board),
      line = arr(projection.winningLine).map(Number);
    return (
      <>
        <p className="gc-turn-state">
          {projection.status === "won"
            ? "Перемога"
            : projection.status === "draw"
              ? "Нічия"
              : projection.status === "forfeit"
                ? "Поразка за тайм-аутом"
                : projection.isYourTurn
                  ? "Ваш хід"
                  : "Хід суперника"}
        </p>
        <TicTacToeBoard
          cells={board.map(v => (v === "X" || v === "O" ? v : null))}
          winningLine={line}
          disabled={busy || !legal.length}
          onCellClick={i => {
            const a = legal.find(v => num(rec(v).cell, -1) === i);
            if (a) onAction(a);
          }}
        />
      </>
    );
  }
  if (game === "battleship") {
    const own = rec(projection.ownBoard),
      ships = arr(own.ships).map(rec),
      incoming = arr(own.shotsReceived).map(rec),
      opp = rec(projection.opponent),
      outgoing = arr(opp.shots).map(rec);
    const phase = str(projection.phase);
    const enemyShips = arr(opp.ships).map(rec);
    const ownSunkShips = ships.filter(ship => arr(ship.cells).length > 0 && arr(ship.hits).length >= arr(ship.cells).length).length;
    const ownRemainingShips = Math.max(0, ships.length - ownSunkShips);
    const ownRemainingSegments = ships.reduce((total, ship) => total + Math.max(0, arr(ship.cells).length - arr(ship.hits).length), 0);
    const enemySunkShips = outgoing.filter(shot => str(shot.result) === "sunk").length;
    const enemyRemainingShips = Math.max(0, 10 - enemySunkShips);
    const preview = previewBattleshipCells;
    const occupied = (x: number, y: number) =>
      placements.some(p =>
        preview(p.x, p.y, p.length, p.orientation === "vertical").some(
          cell => cell.x === x && cell.y === y
        )
      );
    const valid = (x: number, y: number, len: number, vert: boolean) =>
      isFleetPlacementValid(placements, x, y, len, vert);
    const fleet = [...placements];
    const placedCount = Math.max(placements.length, ships.length);
    const placeShipAt = (x: number, y: number, selectedIndex = shipIndex) => {
      const len = lengthList[selectedIndex];
      if (phase !== "placing" || projection.ready || !len) return;
      if (placements.filter(p => p.length === len).length >= lengthList.filter(value => value === len).length) return;
      if (!valid(x, y, len, vertical)) {
        setWarning("Тут корабель виходить за поле або торкається іншого.");
        return;
      }
      setWarning("");
      const next = [
        ...placements,
        {
          x,
          y,
          length: len,
          orientation: vertical
            ? ("vertical" as const)
            : ("horizontal" as const),
        },
      ];
      setPlacements(next);
      setShipIndex(nextFleetShipIndex(lengthList, next));
    };
    const boardFor = (ownSide: boolean) =>
      Array.from({ length: 100 }, (_, i) => {
        const x = i % 10,
          y = Math.floor(i / 10);
        if (ownSide) {
          const damaged = incoming.find(
            q => num(q.x, -1) === x && num(q.y, -1) === y
          );
          if (damaged)
            return str(damaged.result) === "miss"
              ? "miss"
              : str(damaged.result) === "sunk"
                ? "sunk"
                : "hit";
          if (
            ships.some(s =>
              arr(s.cells).some(
                v => num(rec(v).x, -1) === x && num(rec(v).y, -1) === y
              )
            )
          )
            return "ship";
          if (occupied(x, y)) return "ship";
          if (
            fleet.some(p =>
              preview(p.x, p.y, p.length, p.orientation === "vertical").some(
                c => c.x === x && c.y === y
              )
            )
          )
            return "ship";
          return "water";
        }
        const shot = outgoing.find(
          q => num(q.x, -1) === x && num(q.y, -1) === y
        );
        if (shot)
          return str(shot.result) === "sunk"
            ? "sunk"
            : str(shot.result) === "hit"
              ? "hit"
              : "miss";
        if (phase === "finished" && enemyShips.some(ship => arr(ship.cells).some(cell => num(rec(cell).x, -1) === x && num(rec(cell).y, -1) === y)))
          return "ship";
        return legal.some(q => num(rec(q).x, -1) === x && num(rec(q).y, -1) === y)
          ? "targetable"
          : "water";
      }) as BattleshipCellState[];
    return (
      <div
        className="gc-battleship-game"
        onTouchEnd={event => {
          if (touchDragShip === null) return;
          const touch = event.changedTouches[0];
          const cell =
            touch &&
            document
              .elementFromPoint(touch.clientX, touch.clientY)
              ?.closest<HTMLElement>("[data-battle-row][data-battle-column]");
          const row = Number(cell?.dataset.battleRow);
          const column = Number(cell?.dataset.battleColumn);
          if (cell && Number.isInteger(row) && Number.isInteger(column)) {
            placeShipAt(column, row, touchDragShip);
          }
          setTouchDragShip(null);
        }}
        onTouchCancel={() => setTouchDragShip(null)}
      >
        <p className="gc-turn-state">
          {phase === "placing"
            ? `Розміщення флоту · ${projection.ready ? "готові — очікуємо суперника" : "розташуйте всі 10 кораблів"}`
            : projection.isYourTurn
              ? "Ваш хід — оберіть ціль"
              : "Хід суперника"}{" "}
          · у суперника залишилось {num(opp.remainingSegments, 20)} палуб
        </p>
        {phase !== "placing" && (
          <div className="gc-fleet-health" aria-live="polite">
            <span>Ваш флот: {ownSunkShips} знищено · залишилося {ownRemainingShips}/10 кораблів · {ownRemainingSegments}/20 палуб</span>
            <span>Флот суперника: {enemySunkShips} знищено · залишилося {enemyRemainingShips}/10 кораблів · {num(opp.remainingSegments, 20)}/20 палуб</span>
          </div>
        )}
        {phase === "placing" && (
          <div className="gc-placement-tools">
            <div className="gc-fleet-tray" aria-label="Флот для розміщення">
              <strong>Флот · {placedCount}/10 розміщено</strong>
              <div>
                {lengthList.map((length, i) => (
                  <button
                    type="button"
                    key={i}
                    draggable
                    onDragStart={event => {
                      setShipIndex(i);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", String(i));
                    }}
                    onTouchStart={() => {
                      setShipIndex(i);
                      setTouchDragShip(i);
                    }}
                    className={i === shipIndex ? "is-selected" : ""}
                    disabled={
                      placements.filter(p => p.length === length).length >=
                      lengthList.slice(0, i + 1).filter(n => n === length)
                        .length
                    }
                    onClick={() => setShipIndex(i)}
                    aria-label={`${length} палуб · корабель ${i + 1}`}
                  >
                    <span className={`gc-fleet-token length-${length}${vertical ? " is-vertical" : ""}`}>
                      <ShipSprite length={length} orientation={vertical ? "vertical" : "horizontal"} />
                    </span>
                    <small>{length}</small>
                  </button>
                ))}
              </div>
            </div>
            <label>
              Корабель{" "}
              <select
                value={shipIndex}
                onChange={e => setShipIndex(Number(e.target.value))}
              >
                {lengthList.map((n, i) => (
                  <option
                    key={i}
                    value={i}
                    disabled={
                      placements.some(p => p.length === n) &&
                      lengthList.slice(0, i).filter(x => x === n).length >=
                        placements.filter(p => p.length === n).length
                    }
                  >
                    {n} палуб · #{i + 1}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="gc-button gc-quiet"
              onClick={() => setVertical(v => !v)}
              aria-pressed={vertical}
            >
              Орієнтація: {vertical ? "вертикально" : "горизонтально"}
            </button>
            <button
              className="gc-button gc-quiet"
              disabled={
                busy || placements.length !== 10 || Boolean(projection.ready)
              }
              onClick={() => onAction({ type: "place", ships: placements })}
            >
              Надіслати розміщення
            </button>
            <button
              className="gc-button gc-quiet"
              disabled={busy || Boolean(projection.ready)}
              onClick={() => {
                setWarning("");
                setPlacements([]);
                setShipIndex(0);
                onAction({ type: "auto_place" });
              }}
            >
              Авто-розміщення сервером
            </button>
            <button
              className="gc-button"
              disabled={
                busy || placedCount !== 10 || Boolean(projection.ready)
              }
              onClick={() => onAction({ type: "ready" })}
            >
              Готовий до бою
            </button>
            <small>
              Перетягніть корабель пальцем на поле або виберіть корабель і
              торкніться клітинки. Кораблі не можуть перекриватися або
              торкатися; сервер остаточно перевірить флот.
            </small>
            {warning && <small role="alert">{warning}</small>}
          </div>
        )}
        <div className="gc-fleet-boards">
          <div>
            <h3>Ваш флот</h3>
            <BattleshipBoard
              cells={boardFor(true)}
              disabled={
                phase !== "placing" ||
                busy ||
                Boolean(projection.ready) ||
                placedCount >= 10 ||
                shipIndex >= lengthList.length
              }
              onCellClick={(y, x) => placeShipAt(x, y)}
              onCellDrop={(y, x, index) => placeShipAt(x, y, index ?? shipIndex)}
            />
          </div>
          {phase !== "placing" && (
            <div>
              <h3>Цільове поле</h3>
              <BattleshipBoard
                cells={boardFor(false)}
                disabled={phase !== "playing" || busy || !legal.length}
                onCellClick={(y, x) => {
                  const a = legal.find(
                    v => num(rec(v).x, -1) === x && num(rec(v).y, -1) === y
                  );
                  if (a) onAction(a);
                }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }
  if (game === "durak") {
    const myView =
      arr(projection.players)
        .map(rec)
        .find(p => p.id === myPlayerId) ?? {};
    const hand = arr(myView.hand).map(rec);
    const table = arr(projection.table).map(rec);
    const trump = rec(rec(projection.trump).card);
    const projectedTrumpSuit = str(
      trump.suit,
      str(rec(projection.trump).suit, "")
    );
    const hasTrumpCard = Number.isFinite(Number(trump.rank)) &&
      ["spades", "hearts", "diamonds", "clubs"].includes(projectedTrumpSuit);
    const trumpSuit = (
      hasTrumpCard ? projectedTrumpSuit : "spades"
    ) as "spades" | "hearts" | "diamonds" | "clubs";
    const suitName: Record<string, string> = {
      spades: "піка",
      hearts: "чирва",
      diamonds: "бубна",
      clubs: "трефа",
    };
    const deckCount = Math.max(0, num(projection.deckCount));
    const handCardMaxWidth = hand.length > 30 ? 40 : hand.length > 18 ? 48 : hand.length > 9 ? 58 : 82;
    const handRows = layoutDurakHand(hand.length, handWidth || 340, handCardMaxWidth);
    const canThrowIn = legal.some(v => str(rec(v).type) === "throw_in");
    const isMyTurn = projection.turn === myPlayerId;
    const activeTurnPlayer = players.find(player => player.id === projection.turn);
    const activeTurnName = activeTurnPlayer?.nick || activeTurnPlayer?.name || "Гравець";
    const ownPlayer = players.find(player => player.id === myPlayerId);
    const ownPlayerName = ownPlayer?.nick || ownPlayer?.name || "Ви";
    const ownReaction = [...events].reverse().map(rec).find(event => event.type === "reaction" && event.playerId === myPlayerId && Date.now() - new Date(String(event.at || "")).getTime() < 4000);
    const turnLabel = isMyTurn ? "Ваш хід" : `Ходить ♥ ${activeTurnName}`;
    const turnMessage = isMyTurn
      ? "Ваш хід · зіграйте карту або виконайте дію"
      : canThrowIn
        ? "Можна підкинути карту такого самого номіналу"
        : "Суперник ходить · підготуйте захист";
    const selectedCard = target >= 0 ? hand[target] : undefined;
    const suitGlyph: Record<string, string> = {
      spades: "♠",
      hearts: "♥",
      diamonds: "♦",
      clubs: "♣",
    };
    const opponentCardWidth = players.length > 4 ? 28 : players.length > 3 ? 36 : 44;
    const opponents = players
      .filter(p => p.id !== myPlayerId)
      .map(p => {
        const otherView = arr(projection.players)
          .map(rec)
          .find(x => x.id === p.id);
        const cardCount = Math.max(0, num(otherView?.cardCount, p.handCount || 0));
        const reaction = [...events].reverse().map(rec).find(event => event.type === "reaction" && event.playerId === p.id && Date.now() - new Date(String(event.at || "")).getTime() < 4000);
        return (
          <article
            className={`gc-hand-count${p.id === projection.turn ? " is-current" : ""}`}
            key={p.id}
          >
            <div className="gc-opponent-heading">
              <div className="gc-opponent-avatar-wrap">
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt="" />
                ) : (
                  <i>{(p.nick || p.name || "Г").slice(0, 1)}</i>
                )}
                {reaction && <span className="gc-reaction-bubble" key={str(reaction.at, String(reaction.emoji))}>{str(reaction.emoji)}</span>}
              </div>
              <span>
                <b>{p.nick || p.name || "Гравець"}{p.vip && <span title="VIP"> 👑</span>}</b>
                <small>{cardCount} карт</small>
              </span>
            </div>
            <div className="gc-opponent-cardbacks" aria-label={`${cardCount} закритих карт`}>
              {Array.from({ length: Math.min(6, cardCount) }, (_, i) => (
                <span
                  className="gc-opponent-back"
                  key={i}
                  style={{
                    zIndex: i + 1,
                    width: `${opponentCardWidth}px`,
                    height: `${opponentCardWidth * 1.42}px`,
                    marginLeft: i ? `-${Math.round(opponentCardWidth * 0.4)}px` : 0,
                    transform: `rotate(${(i - Math.min(5, cardCount - 1) / 2) * 3}deg)`,
                  }}
                >
                  <PlayingCard
                    card={{ rank: "A", suit: "spades" }}
                    faceDown
                    size="small"
                    cardWidth={opponentCardWidth}
                    skin="durak-reference"
                  />
                </span>
              ))}
            </div>
          </article>
        );
      });
    return (
      <div className={`gc-card-game gc-durak-game${hand.length > 18 ? " has-large-hand" : ""}`}>
        <div className="gc-durak-topbar">
          <span className="gc-durak-chip gc-durak-bank" aria-label={`Банк ${num(bank, num(projection.bank, (stake || 0) * players.length))} монет`}>
            <b>Банк</b>
            <Coins size={14} aria-hidden="true" />
            <b>{num(bank, num(projection.bank, (stake || 0) * players.length))}</b>
          </span>
          <span className="gc-durak-chip gc-durak-trump-chip" aria-label={hasTrumpCard ? `Козир ${suitName[trumpSuit]}` : "Козир не завантажено"}>
            <b className={hasTrumpCard && (trumpSuit === "hearts" || trumpSuit === "diamonds") ? "is-red" : ""}>
              {hasTrumpCard ? `Козир ${suitGlyph[trumpSuit]}` : "Козир —"}
            </b>
          </span>
          <span className="gc-durak-chip gc-durak-rule-chip" aria-label={`Підкидний дурень, колода ${num(projection.deckSize, 36)} карт`}>
            <b>{`Підкидний · ${num(projection.deckSize, 36)}`}</b>
          </span>
        </div>
        <div className="gc-opponents" aria-label="Суперники">
          {opponents.length ? opponents : <span className="gc-empty">Суперник очікується</span>}
        </div>
        <div className="gc-durak-resource-row">
          <div className="gc-draw-pile" aria-label={`Колода: ${deckCount} карт`}>
            <div className="gc-stock-stack" aria-hidden="true">
              {Array.from({ length: Math.min(3, deckCount) }, (_, i) => (
                <span key={i} style={{ zIndex: i + 1, transform: `translate(${i * 4}px, ${-i * 2}px)` }}>
                  <PlayingCard
                    card={{ rank: "A", suit: "spades" }}
                    faceDown
                    size="small"
                    cardWidth={46}
                    skin="durak-reference"
                  />
                </span>
              ))}
              {!deckCount && <small>Колода порожня</small>}
            </div>
            <b>{deckCount}</b>
          </div>
          <div className="gc-trump">
            {hasTrumpCard && deckCount > 0 ? (
              <>
                <span>Козир</span>
                <PlayingCard
                  card={{ rank: String(trump.rank), suit: trumpSuit }}
                  size="small"
                  cardWidth={52}
                  skin="durak-reference"
                />
                <small>{suitName[trumpSuit]}</small>
              </>
            ) : null}
          </div>
        </div>
        <div className="gc-durak-table" aria-label="Карти на столі">
          {table.length ? table.map((pair, i) => (
            <div className="gc-card-pair" key={i}>
              <PlayingCard
                card={{
                  rank: String(rec(pair.attack).rank),
                  suit: str(rec(pair.attack).suit, "spades") as
                    | "spades"
                    | "hearts"
                    | "diamonds"
                    | "clubs",
                }}
                size="small"
                skin="durak-reference"
              />
              <span aria-label={pair.defense ? "Покрито" : "Не покрито"}>
                {pair.defense ? (
                  <PlayingCard
                    card={{
                      rank: String(rec(pair.defense).rank),
                      suit: str(rec(pair.defense).suit, "spades") as
                        | "spades"
                        | "hearts"
                        | "diamonds"
                        | "clubs",
                    }}
                    size="small"
                    skin="durak-reference"
                  />
                ) : (
                  <span className="gc-card-uncovered">Не покрито</span>
                )}
              </span>
            </div>
          )) : (
            <p className="gc-empty-table">Стіл вільний · очікуємо перший хід</p>
          )}
        </div>
        <div
          className={`gc-durak-turn-note${typeof turnSeconds === "number" && turnSeconds <= 10 ? " is-urgent" : ""}${canThrowIn ? " can-throw-in" : ""}`}
          aria-live="polite"
        >
          <span>{turnLabel}</span>
          <b>{turnSeconds === null || turnSeconds === undefined ? "Очікування" : `${turnSeconds} с`}</b>
          <small>{turnMessage}</small>
        </div>
        {ownReaction && <div className="gc-own-reaction" aria-live="polite" key={str(ownReaction.at, String(ownReaction.emoji))}>
          {ownPlayer?.avatarUrl ? <img src={ownPlayer.avatarUrl} alt="" /> : <i>{ownPlayerName.slice(0, 1)}</i>}
          <b>{ownPlayerName}</b>
          <span className="gc-own-reaction-emoji">{str(ownReaction.emoji)}</span>
        </div>}
        <div className="gc-hand" ref={handRef} aria-label={`Ваша рука · ${hand.length} карт`}>
          {handRows.map((row, rowIndex) => (
            <div className="gc-hand-row" key={rowIndex} style={{ height: `${row.height}px` }}>
              {row.cards.map(slot => {
                const c = hand[slot.index];
                if (!c) return null;
                const possible = legal.filter(v => {
                  const a = rec(v);
                  return str(a.cardId, str(rec(a.payload).cardId)) === str(c.id);
                });
                const isSelected = target === slot.index && possible.length > 0;
                return (
                  <button
                    type="button"
                    key={str(c.id, String(slot.index))}
                    className={`gc-hand-card${isSelected ? " selected" : ""}`}
                    style={{
                      left: `${slot.left}px`,
                      bottom: `${slot.lift}px`,
                      width: `${row.cardWidth}px`,
                      height: `${row.cardWidth * 1.42}px`,
                      zIndex: isSelected ? 100 : slot.index + 1,
                      transform: `translateY(${isSelected ? -12 : 0}px) rotate(${slot.angle}deg)`,
                    }}
                    disabled={!possible.length || busy}
                    onClick={() => {
                      setTarget(slot.index);
                      if (possible.length === 1) {
                        onAction(possible[0]);
                        setTarget(-1);
                      }
                    }}
                    aria-label={`Обрати карту ${String(c.rank)} ${suitName[str(c.suit)] || ""}`}
                  >
                    <PlayingCard
                      card={{
                        rank: String(c.rank),
                        suit: str(c.suit, "spades") as
                          | "spades"
                          | "hearts"
                          | "diamonds"
                          | "clubs",
                      }}
                      dealIndex={slot.index}
                      cardWidth={row.cardWidth}
                      skin="durak-reference"
                    />
                  </button>
                );
              })}
            </div>
          ))}
          {!hand.length && <p className="gc-empty-hand">У руці більше немає карт</p>}
        </div>
        <div className="gc-legal-actions">
          {legal
            .filter(v => ["take", "done", "beat"].includes(str(rec(v).type)))
            .map((v, i) => (
              <button
                className="gc-button"
                key={i}
                disabled={busy}
                onClick={() => {
                  setTarget(-1);
                  onAction(v);
                }}
              >
                {str(rec(v).type) === "take"
                  ? "Взяти карти"
                  : "Бито · завершити атаку"}
              </button>
            ))}
          {selectedCard &&
            legal
              .filter(
                v =>
                  str(rec(v).cardId, str(rec(rec(v).payload).cardId)) ===
                  str(selectedCard.id)
              )
              .map((v, i) => (
                <button
                  className="gc-button gc-quiet"
                  key={i}
                  disabled={busy}
                  onClick={() => {
                    setTarget(-1);
                    onAction(v);
                  }}
                >
                  {{
                    attack: "Атакувати",
                    throw_in: "Підкинути",
                    defend: `Покрити ціль №${num(rec(v).index) + 1}`,

                  }[str(rec(v).type)] || str(rec(v).label)}
                </button>
              ))}
        </div>
        <small className="gc-durak-hint">
          Підкидати можна лише карту того самого номіналу. Для покриття виберіть ціль на столі.
        </small>
      </div>
    );
  }
  return (
    <p className="gc-safe-state">
      Очікуємо безпечну проєкцію гри; ходи недоступні.
    </p>
  );
}

function TableScreen({
  table,
  busy,
  inviteToken,
  onReady,
  onStart,
  onLeave,
  onCancel,
  onKick,
  onAction,
  onRefresh,
  onCopy,
  onShare,
  onDispute,
  onAgain,
  onReact,
}: {
  table: GameTable;
  busy: boolean;
  inviteToken: string;
  onReady: (v: boolean) => void;
  onStart: () => void;
  onLeave: () => void;
  onCancel: () => void;
  onKick: (id: string) => void;
  onAction: (a: unknown) => void;
  onRefresh: () => void;
  onCopy: () => void;
  onShare: () => void;
  onDispute: (s: string) => void;
  onAgain: () => void;
  onReact: (emoji: string) => void;
}) {
  const isOwner = table.isOwner === true;
  const me = table.players.find(p => p.id === table.myPlayerId);
  const playerCount = table.players.length;
  const ready = table.players.every(p => p.ready);
  const min = table.minPlayers || 2;
  const running = ["playing", "started"].includes(table.status);
  const cancelled = table.status === "cancelled";
  const projection = rec(table.projection ?? table.state);
  const legal = arr(projection.legalActions ?? projection.availableActions);
  const events = [...arr(table.events), ...arr(projection.events)].slice(-25);
  const ended = ["finished", "complete", "cancelled"].includes(table.status);
  const result = rec(table.result);
  const bankSettlement = rec(result.bankSettlement);
  const bank = ended
    ? num(
        bankSettlement.availableBank,
        num(
          result.totalPot,
          num(
            result.bank,
            num(table.bank, num(projection.bank, table.stake * playerCount))
          )
        )
      )
    : num(table.bank, num(projection.bank, table.stake * playerCount));
  const seconds = table.turnEndsAt
    ? Math.max(
        0,
        Math.ceil((new Date(table.turnEndsAt).getTime() - Date.now()) / 1000)
      )
    : null;
  const [dispute, setDispute] = useState("");
  return (
    <section className={`gc-table-screen${table.gameId === "durak" ? " gc-table-screen--durak" : ""}${running && table.gameId === "durak" ? " gc-table-screen--durak-live" : ""}${ended && table.gameId === "durak" ? " gc-table-screen--durak-result" : ""}`}>
      <div className="gc-table-meta">
        <span className={`gc-badge ${table.visibility}`}>
          {table.visibility === "private" ? (
            <>
              <LockKeyhole size={12} /> Приватний
            </>
          ) : (
            "Публічний"
          )}
        </span>
        <span className="gc-badge">Ставка {table.stake} 🪙</span>
        <span className="gc-badge gc-pot-badge">Банк · {bank} 🪙</span>
        <span className="gc-badge">
          {playerCount}/{table.maxPlayers} місць
        </span>
        <span className="gc-badge gc-status-badge">
          {table.status === "waiting" || table.status === "lobby"
            ? "Очікування"
            : table.status === "playing" || table.status === "started"
              ? "У грі"
              : table.status === "finished" || table.status === "complete"
                ? "Завершено"
                : table.status}
        </span>
        {seconds !== null && running && (
          <span className="gc-badge">Хід: {seconds} с</span>
        )}
      </div>
      {!running && !ended ? (
        <>
          <section className="gc-card">
            <h2>
              Учасники{" "}
              <span>
                {playerCount}/{table.maxPlayers}
              </span>
            </h2>
            {table.players.map(p => (
              <div className="gc-player" key={p.id}>
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt="" />
                ) : (
                  <span className="gc-avatar">
                    {(p.nick || p.name || "?").slice(0, 1)}
                  </span>
                )}
                <span>
                  {p.nick || p.name || "Гравець"}{p.vip && <span title="VIP"> 👑</span>}
                  {p.id === table.ownerId && <small>Власник</small>}
                  <small>Ставка · {table.stake} 🪙</small>
                </span>
                <b className={p.ready ? "ready" : ""}>
                  {p.ready ? "Готовий" : "Очікує"}
                </b>
                {isOwner && p.id !== table.ownerId && (
                  <button
                    className="gc-text-button"
                    disabled={busy}
                    onClick={() => onKick(p.id)}
                  >
                    Вилучити
                  </button>
                )}
              </div>
            ))}
            <p className="gc-empty">
              Вільні місця: {Math.max(0, table.maxPlayers - playerCount)} · Для
              старту потрібно щонайменше {min} гравців і готовність усіх.
            </p>
          </section>
          <section className="gc-card">
            <h3>Запросити друзів</h3>
            <div className="gc-actions">
              <button className="gc-button gc-quiet" onClick={onCopy}>
                <Copy size={15} /> Копіювати посилання
              </button>
              <button className="gc-button gc-quiet" onClick={onShare}>
                Надіслати в Telegram
              </button>
            </div>
          </section>
          <div className="gc-actions gc-lobby-actions">
            {!isOwner && (
              <button
                className="gc-button gc-quiet"
                disabled={busy || !me}
                aria-pressed={Boolean(me?.ready)}
                onClick={() => onReady(!me?.ready)}
              >
                {me?.ready ? "Скасувати готовність" : "Готово"}
              </button>
            )}
            {isOwner && (
              <button
                className="gc-button"
                disabled={busy || playerCount < min || !ready}
                onClick={onStart}
              >
                Почати гру
              </button>
            )}
            <button
              className="gc-button gc-danger"
              disabled={busy}
              onClick={isOwner ? onCancel : onLeave}
            >
              {isOwner ? "Скасувати стіл" : "Вийти зі столу"}
            </button>
          </div>
        </>
      ) : running ? (
        <>
          <div className="gc-card gc-game-state">
            <h2>Ігровий стіл</h2>
            <div
              className={`gc-turn-banner${projection.isYourTurn ? " is-yours" : ""}`}
            >
              <span className="gc-turn-dot" />
              <strong>
                {projection.isYourTurn
                  ? "Ваш хід"
                  : `Хід: ${str(projection.turnPlayerName, table.players.find(p => p.id === projection.turn)?.nick || table.players.find(p => p.id === projection.turn)?.name || "суперника")}`}
              </strong>
            </div>
            <div className="gc-live-seats" aria-label="Гравці за столом">
              {table.players.map(p => (
                <div
                  className={`gc-live-seat${p.id === projection.turn ? " is-active" : ""}`}
                  key={p.id}
                >
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt="" />
                  ) : (
                    <span>{(p.nick || p.name || "Г").slice(0, 1)}</span>
                  )}
                  <strong>
                    {p.nick || p.name || "Гравець"}{p.vip && <span title="VIP"> 👑</span>}
                    {p.id === table.myPlayerId ? " · ви" : ""}
                  </strong>
                  <small>Ставка · {table.stake} 🪙</small>
                </div>
              ))}
            </div>
            <div className="gc-projection">
              <GameProjection
                game={table.gameId}
                projection={projection}
                legal={legal}
                busy={busy}
                onAction={onAction}
                players={table.players}
                myPlayerId={table.myPlayerId}
                bank={bank}
                stake={table.stake}
                turnSeconds={seconds}
                events={events}
              />
            </div>
            <button
              className="gc-icon gc-refresh"
              onClick={onRefresh}
              aria-label="Оновити стан гри"
            >
              <RefreshCw size={15} />
            </button>
          </div>
          {table.gameId === "durak" ? (
            <>
            <details className="gc-live-reactions">
              <summary aria-label="Надіслати реакцію" title="Реакція"><Smile size={19} aria-hidden="true" /></summary>
              <div className="gc-live-reaction-picker" role="group" aria-label="Швидкі реакції">
                {["😂", "🤦", "🤬", "😏", "😭", "🤩", "😉"].map(emoji => <button key={emoji} type="button" aria-label={`Надіслати ${emoji}`} disabled={busy} onClick={event => { event.currentTarget.closest("details")?.removeAttribute("open"); onReact(emoji); }}>{emoji}</button>)}
              </div>
            </details>
            <details className="gc-live-tools">
              <summary aria-label="Історія матчу та повідомлення про проблему" title="Історія / звернення">
                <MoreHorizontal size={19} aria-hidden="true" />
              </summary>
              <div className="gc-live-tools-panel">
                <button className="gc-button gc-quiet gc-live-refresh" type="button" disabled={busy} onClick={onRefresh}>
                  <RefreshCw size={15} aria-hidden="true" /> Оновити стан гри
                </button>
                <section className="gc-card">
                  <h3>Події матчу</h3>
                  {events.length ? (
                    events.map((e, i) => (
                      <p className="gc-event" key={i}>
                        {typeof e === "string" ? e : safeSummary(e)}
                      </p>
                    ))
                  ) : (
                    <p className="gc-empty">Історія подій поки порожня.</p>
                  )}
                </section>
                <section className="gc-card">
                  <label className="gc-label">
                    Повідомити про проблему
                    <textarea
                      value={dispute}
                      maxLength={1000}
                      onChange={e => setDispute(e.target.value)}
                      placeholder="Опишіть ситуацію"
                    />
                  </label>
                  <button
                    className="gc-button gc-quiet"
                    disabled={busy || !dispute.trim()}
                    onClick={() => {
                      onDispute(dispute.trim());
                      setDispute("");
                    }}
                  >
                    Надіслати звернення
                  </button>
                </section>
              </div>
            </details>
            </>
          ) : (
            <>
              <section className="gc-card">
                <h3>Події матчу</h3>
                {events.length ? (
                  events.map((e, i) => (
                    <p className="gc-event" key={i}>
                      {typeof e === "string" ? e : safeSummary(e)}
                    </p>
                  ))
                ) : (
                  <p className="gc-empty">Історія подій поки порожня.</p>
                )}
              </section>
              <section className="gc-card">
                <label className="gc-label">
                  Повідомити про проблему
                  <textarea
                    value={dispute}
                    maxLength={1000}
                    onChange={e => setDispute(e.target.value)}
                    placeholder="Опишіть ситуацію"
                  />
                </label>
                <button
                  className="gc-button gc-quiet"
                  disabled={busy || !dispute.trim()}
                  onClick={() => {
                    onDispute(dispute.trim());
                    setDispute("");
                  }}
                >
                  Надіслати звернення
                </button>
              </section>
            </>
          )}
        </>
      ) : (
        table.gameId === "durak" && !cancelled ? (
          <DurakResult
            table={table}
            onAgain={onAgain}
          />
        ) : (
        <section
          className={`gc-card gc-result${cancelled ? " is-cancelled" : ""}`}
        >
          {!cancelled && <Crown size={24} />}
          <h2>{cancelled ? "Стіл скасовано" : "Партію завершено"}</h2>
          <p>
            {cancelled
              ? "Стіл скасовано; це не є перемогою або завершеною партією."
              : str(result.reason)
                ? tableResultReason(table.gameId, str(result.reason))
                : safeSummary(table.result)}
          </p>
          {!cancelled && arr(result.winners).length > 0 && (
            <p>Переможці: {arr(result.winners).map(String).join(", ")}</p>
          )}
          {!cancelled && result.draw === true && <p>Результат: нічия</p>}
          {!cancelled && result.myPayout !== undefined && (
            <p>Ваша фактична виплата: {num(result.myPayout)} 🪙</p>
          )}
          {!cancelled && bankSettlement.myTargetPayout !== undefined && (
            <p>
              Цільова виплата: {num(bankSettlement.myTargetPayout)} 🪙
              {bankSettlement.bankCapped === true
                ? ` · обмежено банком (${num(bankSettlement.availableBank)} 🪙 доступно)`
                : ""}
            </p>
          )}
          <p>
            {bankSettlement.availableBank !== undefined
              ? "Доступний банк"
              : "Банк столу"}
            : {bank} 🪙 · розрахунок і виплата — за серверним результатом.
          </p>
          {arr(result.payouts).length > 0 && (
            <div className="gc-payouts" aria-label="Фактичні виплати">
              {arr(result.payouts).map((item, index) => {
                const payout = rec(item);
                const player = table.players.find(
                  p => p.id === str(payout.playerId)
                );
                return (
                  <div key={index}>
                    <span>
                      {player?.nick ||
                        player?.name ||
                        str(payout.playerId, "Гравець")}
                    </span>
                    <b>{num(payout.amount, num(payout.payout))} 🪙</b>
                  </div>
                );
              })}
            </div>
          )}
          <div className="gc-actions">
            {!cancelled && (
              <button className="gc-button" onClick={onAgain}>
                Зіграти ще раз
              </button>
            )}
            <button className="gc-button gc-quiet" onClick={onLeave}>
              Повернутися до ігор
            </button>
          </div>
        </section>
        )
      )}
    </section>
  );
}
