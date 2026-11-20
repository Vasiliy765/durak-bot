import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Clock3, RefreshCw, Save, Shield, Swords, Wallet } from "lucide-react";
import { getTelegramInitData } from "@/lib/telegram";
import "./GameCenterAdminPanel.css";

type GameId = "battleship" | "durak" | "tic_tac_toe";
type GameCenterConfig = {
  games: Record<GameId, boolean>;
  minStake: number;
  maxStake: number;
  allowedStakes: number[];
  maxOpenTables: number;
  timers: { turnSeconds: number; lobbyLifetimeMinutes: number; reconnectSeconds: number };
  rules: { battleship: { extraShotOnHit: boolean }; durak: { throwIn: boolean } };
  lobby: { lifetimeMinutes: number; reconnectPolicy: "grace" | "forfeit" | "refund"; reconnectSeconds: number };
};
type TableAudit = { id?: string | number; game?: string; status?: string; stake?: number; players?: number; maxPlayers?: number; createdAt?: string; finishedAt?: string; result?: string; winnerCount?: number };
type Dispute = { id: string | number; status: "open" | "reviewing" | "resolved" | "rejected"; createdAt?: string; reason?: string; tableId?: string | number; note?: string };
type AuditEntry = { id?: string | number; kind?: string; amount?: number; balanceAfter?: number; createdAt?: string; tableId?: string | number; wagerId?: string; status?: string; result?: string };
type Tab = "config" | "tables" | "disputes" | "audit";

const games: Array<{ id: GameId; label: string }> = [
  { id: "battleship", label: "Морський бій" }, { id: "durak", label: "Дурень" },
  { id: "tic_tac_toe", label: "Хрестики-нулики" },
];
const defaults: GameCenterConfig = {
  games: { battleship: true, durak: true, tic_tac_toe: true },
  minStake: 10, maxStake: 200, allowedStakes: [10, 20, 30, 40, 50, 75, 100, 150, 200], maxOpenTables: 100,
  timers: { turnSeconds: 60, lobbyLifetimeMinutes: 30, reconnectSeconds: 120 },
  rules: { battleship: { extraShotOnHit: false }, durak: { throwIn: true } },
  lobby: { lifetimeMinutes: 30, reconnectPolicy: "grace", reconnectSeconds: 120 },
};
const labels: Record<string, string> = { battleship: "Морський бій", durak: "Дурень", tic_tac_toe: "Хрестики-нулики" };
function gameLabel(id?: string) { return id && labels[id] ? labels[id] : id ? "Архівний матч" : "Матч"; }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const initData = getTelegramInitData();
  if (initData) headers.set("x-telegram-init-data", initData);
  const response = await fetch(`/api/game-center/admin${path}`, { ...init, headers, credentials: "include" });
  const body = await response.json().catch(() => ({ error: "Некоректна відповідь сервера" }));
  if (!response.ok) throw new Error(body.error || `Запит не виконано (${response.status})`);
  return body as T;
}
function listFrom<T>(body: unknown, key: string): T[] {
  if (Array.isArray(body)) return body as T[];
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const list = record[key] ?? record.items ?? record.data;
    if (Array.isArray(list)) return list as T[];
  }
  return [];
}
function mergeConfig(input: Partial<GameCenterConfig> | { config?: Partial<GameCenterConfig> }): GameCenterConfig {
  const value = (input as { config?: Partial<GameCenterConfig> }).config ?? input as Partial<GameCenterConfig>;
  const raw = value as Partial<GameCenterConfig> & { enabledGames?: Record<string, boolean>; stakes?: number[]; maxOpenTablesPerUser?: number; turnTimeoutSeconds?: number; lobbyExpiryMinutes?: number; reconnectGraceSeconds?: number };
  return {
    ...defaults, ...value,
    games: { ...defaults.games, ...raw.enabledGames, ...value.games },
    allowedStakes: value.allowedStakes ?? raw.stakes ?? defaults.allowedStakes,
    maxOpenTables: value.maxOpenTables ?? raw.maxOpenTablesPerUser ?? defaults.maxOpenTables,
    timers: { ...defaults.timers, ...(raw.turnTimeoutSeconds === undefined ? {} : { turnSeconds: raw.turnTimeoutSeconds }), ...(raw.lobbyExpiryMinutes === undefined ? {} : { lobbyLifetimeMinutes: raw.lobbyExpiryMinutes }), ...(raw.reconnectGraceSeconds === undefined ? {} : { reconnectSeconds: raw.reconnectGraceSeconds }), ...value.timers },
    rules: { battleship: { ...defaults.rules.battleship, ...value.rules?.battleship }, durak: { ...defaults.rules.durak, ...value.rules?.durak } },
    lobby: { ...defaults.lobby, ...value.lobby },
  };
}
function validate(config: GameCenterConfig): string[] {
  const issues: string[] = [];
  const whole = (n: number) => Number.isInteger(n);
  if (!whole(config.minStake) || config.minStake < 10 || config.minStake > 200) issues.push("Мінімальна ставка має бути цілим числом від 10 до 200.");
  if (!whole(config.maxStake) || config.maxStake < 10 || config.maxStake > 200) issues.push("Максимальна ставка має бути цілим числом від 10 до 200.");
  if (config.minStake > config.maxStake) issues.push("Мінімальна ставка не може перевищувати максимальну.");
  if (!config.allowedStakes.length) issues.push("Дозволений список ставок не може бути порожнім.");
  if (config.allowedStakes.some(n => !whole(n) || n < 10 || n > 200 || n < config.minStake || n > config.maxStake)) issues.push("Кожна ставка має бути цілою, у межах 10–200 та між мінімумом і максимумом.");
  if (new Set(config.allowedStakes).size !== config.allowedStakes.length) issues.push("У списку ставок не повинно бути дублікатів.");
  if (!whole(config.maxOpenTables) || config.maxOpenTables < 1 || config.maxOpenTables > 10000) issues.push("Максимум відкритих столів: ціле число від 1 до 10 000.");
  for (const [label, n, low, high] of [["Таймер ходу", config.timers.turnSeconds, 5, 600], ["Час життя лобі", config.lobby.lifetimeMinutes, 1, 1440], ["Час перепідключення", config.lobby.reconnectSeconds, 0, 3600]] as const) if (!whole(n) || n < low || n > high) issues.push(`${label}: допустимі цілі значення ${low}–${high}.`);
  return issues;
}

export default function GameCenterAdminPanel() {
  const [tab, setTab] = useState<Tab>("config");
  const [config, setConfig] = useState<GameCenterConfig>(defaults);
  const [tables, setTables] = useState<TableAudit[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [bankBalance, setBankBalance] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [validation, setValidation] = useState<string[]>([]);

  const loadTab = useCallback(async (target: Tab) => {
    setLoading(true); setError("");
    try {
      if (target === "config") setConfig(mergeConfig(await request<Partial<GameCenterConfig> | { config?: Partial<GameCenterConfig> }>("/config")));
      else if (target === "tables") setTables(listFrom<TableAudit>(await request<unknown>("/tables"), "tables"));
      else if (target === "disputes") setDisputes(listFrom<Dispute>(await request<unknown>("/disputes"), "disputes"));
      else {
        const [tableBody, disputeBody, ledgerBody] = await Promise.all([request<unknown>("/tables"), request<unknown>("/disputes"), request<unknown>("/ledger")]);
        const tableRows = listFrom<TableAudit>(tableBody, "tables");
        const disputeRows = listFrom<Dispute>(disputeBody, "disputes");
        const ledgerRows = listFrom<AuditEntry>(ledgerBody, "entries");
        setBankBalance(Number((ledgerBody as any)?.bankBalance ?? 0));
        setTables(tableRows); setDisputes(disputeRows);
        setAudit([
          ...tableRows.filter(row => row.status === "finished" || row.finishedAt).map(row => ({ id: row.id, kind: "Завершена партія", createdAt: row.finishedAt ?? row.createdAt, tableId: row.id, status: row.status, result: row.result })),
          ...disputeRows.map(row => ({ id: row.id, kind: "Спір", createdAt: row.createdAt, tableId: row.tableId, status: row.status, result: row.reason })),
          ...ledgerRows,
        ]);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не вдалося завантажити дані."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadTab(tab); }, [tab, loadTab]);

  const change = (patch: Partial<GameCenterConfig>) => setConfig(current => ({ ...current, ...patch }));
  const save = async () => {
    const issues = validate(config); setValidation(issues); setError(""); setSuccess("");
    if (issues.length) return;
    setSaving(true);
    try {
      await request("/config", { method: "PUT", body: JSON.stringify({ ...config, enabledGames: { battleship: config.games.battleship, durak: config.games.durak, tic_tac_toe: config.games.tic_tac_toe }, stakes: config.allowedStakes, maxOpenTablesPerUser: config.maxOpenTables, turnTimeoutSeconds: config.timers.turnSeconds, lobbyExpiryMinutes: config.lobby.lifetimeMinutes, reconnectGraceSeconds: config.lobby.reconnectSeconds }) });
      setSuccess("Параметри ігрового центру збережено на сервері.");
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Не вдалося зберегти налаштування."); }
    finally { setSaving(false); }
  };
  const updateDispute = async (item: Dispute, status: Dispute["status"]) => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const note = notes[String(item.id)] ?? item.note ?? "";
      await request(`/disputes/${encodeURIComponent(String(item.id))}`, { method: "PATCH", body: JSON.stringify({ status, note, resolution: note }) });
      setSuccess(`Справу №${item.id} оновлено.`); await loadTab("disputes");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не вдалося оновити справу."); }
    finally { setSaving(false); }
  };

  return <section className="page-panel gc-admin">
    <header className="gc-admin-heading"><div><span className="eyebrow"><Shield size={13}/> ЗАХИЩЕНИЙ ІГРОВИЙ ЦЕНТР</span><h1>Оперативна панель</h1><p>Керування правилами, лобі та розглядом інцидентів.</p></div><span className="gc-classification">ADMIN / GC</span></header>
    {error && <div className="gc-alert gc-alert-error" role="alert"><AlertTriangle size={16}/>{error}</div>}
    {success && <div className="gc-alert gc-alert-success" role="status"><Check size={16}/>{success}</div>}
    <nav className="gc-tabs" aria-label="Ігровий центр — адмін розділи">{([["config","Параметри"],["tables","Столи"],["disputes","Спори"],["audit","Історія / ledger"]] as Array<[Tab,string]>).map(([id,label])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}>{label}</button>)}<button className="gc-refresh" onClick={()=>void loadTab(tab)} disabled={loading} aria-label="Оновити"><RefreshCw size={15}/></button></nav>
    {loading && <div className="gc-loading"><span className="gc-pulse"/>Завантаження захищених даних…</div>}
    {!loading && tab === "config" && <div className="gc-config-layout">
      <article className="gc-card"><div className="gc-card-title"><div><span className="eyebrow">01 / ДОСТУП</span><h2>Активні ігри</h2></div><Swords size={18}/></div><div className="gc-game-list">{games.map(game=><label className="gc-toggle" key={game.id}><span>{game.label}</span><input type="checkbox" checked={config.games[game.id]} onChange={e=>change({games:{...config.games,[game.id]:e.target.checked}})}/></label>)}</div></article>
      <article className="gc-card"><div className="gc-card-title"><div><span className="eyebrow">02 / ЕКОНОМІКА</span><h2>Межі ставок · звичайні монети</h2></div><Wallet size={18}/></div><div className="gc-fields gc-two"><label>Мінімум<input type="number" value={config.minStake} onChange={e=>change({minStake:Number(e.target.value)})}/></label><label>Максимум<input type="number" value={config.maxStake} onChange={e=>change({maxStake:Number(e.target.value)})}/></label><label className="gc-wide">Дозволені ставки · через кому<input value={config.allowedStakes.join(", ")} onChange={e=>change({allowedStakes:e.target.value.split(",").map(v=>v.trim()).filter(Boolean).map(Number)})}/><small>Лише цілі значення у встановленому діапазоні 10–200.</small></label><label className="gc-wide">Максимум відкритих столів<input type="number" value={config.maxOpenTables} onChange={e=>change({maxOpenTables:Number(e.target.value)})}/></label></div></article>
      <article className="gc-card"><div className="gc-card-title"><div><span className="eyebrow">03 / СИНХРОНІЗАЦІЯ</span><h2>Таймери та лобі</h2></div><Clock3 size={18}/></div><div className="gc-fields gc-two"><label>Тривалість ходу · сек<input type="number" value={config.timers.turnSeconds} onChange={e=>change({timers:{...config.timers,turnSeconds:Number(e.target.value)}})}/></label><label>Життя лобі · хв<input type="number" value={config.lobby.lifetimeMinutes} onChange={e=>change({lobby:{...config.lobby,lifetimeMinutes:Number(e.target.value)}})}/></label><label>Пільга перепідключення · сек<input type="number" value={config.lobby.reconnectSeconds} onChange={e=>change({lobby:{...config.lobby,reconnectSeconds:Number(e.target.value)}})}/></label><label>Політика перепідключення<select value={config.lobby.reconnectPolicy} onChange={e=>change({lobby:{...config.lobby,reconnectPolicy:e.target.value as GameCenterConfig["lobby"]["reconnectPolicy"]}})}><option value="grace">Пільговий час</option><option value="forfeit">Поразка після тайм-ауту</option><option value="refund">Повернення ставки</option></select></label></div></article>
      <article className="gc-card"><div className="gc-card-title"><div><span className="eyebrow">04 / ПРАВИЛА</span><h2>Параметри матчів</h2></div><Shield size={18}/></div><div className="gc-game-list"><label className="gc-toggle">Морський бій · додатковий постріл при влучанні<input type="checkbox" checked={config.rules.battleship.extraShotOnHit} onChange={e=>change({rules:{...config.rules,battleship:{extraShotOnHit:e.target.checked}}})}/></label><label className="gc-toggle">Дурень · підкидання дозволено<input type="checkbox" checked={config.rules.durak.throwIn} onChange={e=>change({rules:{...config.rules,durak:{throwIn:e.target.checked}}})}/></label></div></article>
      {validation.length>0 && <div className="gc-validation" role="alert"><b>Виправте параметри перед збереженням:</b>{validation.map(issue=><span key={issue}>• {issue}</span>)}</div>}
      <div className="gc-save-row"><button className="button button-primary" disabled={saving} onClick={()=>void save()}><Save size={15}/>{saving?"Збереження…":"Перевірити й зберегти"}</button></div>
    </div>}
    {!loading && tab === "tables" && <div className="gc-card"><div className="gc-card-title"><div><span className="eyebrow">АКТИВНІ / ОСТАННІ СТОЛИ</span><h2>Список столів · {tables.length}</h2></div><button className="button button-outline button-small" onClick={()=>void loadTab("tables")}><RefreshCw size={13}/> Оновити</button></div>{tables.length===0?<p className="gc-empty">Немає записів столів.</p>:<div className="gc-list">{tables.map((row,index)=><div className="gc-row" key={row.id??index}><b>{gameLabel(row.game)}</b><span>Стіл {row.id??"—"}</span><span>{row.players??"—"}/{row.maxPlayers??"—"} гравців</span><span>{row.stake??"—"} 🪙</span><span className="gc-status">{row.status??"невідомо"}</span><small>{row.finishedAt?new Date(row.finishedAt).toLocaleString("uk-UA"):row.createdAt?new Date(row.createdAt).toLocaleString("uk-UA"):""}</small></div>)}</div>}<p className="gc-privacy-note">Панель не запитує й не показує руки, приховану карту дилера чи розміщення кораблів.</p></div>}
    {!loading && tab === "disputes" && <div className="gc-card"><div className="gc-card-title"><div><span className="eyebrow">РОЗБІР ІНЦИДЕНТІВ</span><h2>Спірні ситуації · {disputes.length}</h2></div><button className="button button-outline button-small" onClick={()=>void loadTab("disputes")}><RefreshCw size={13}/> Оновити</button></div>{disputes.length===0?<p className="gc-empty">Відкритих або збережених спорів немає.</p>:<div className="gc-disputes">{disputes.map(item=><article className="gc-dispute" key={item.id}><div className="gc-dispute-top"><b>Справа №{item.id}</b><span className={`gc-status status-${item.status}`}>{item.status}</span></div><p>{item.reason||"Опис не наданий сервером."}</p><small>Стіл {item.tableId??"—"}{item.createdAt?` · ${new Date(item.createdAt).toLocaleString("uk-UA")}`:""}</small><label className="gc-note">Нотатка оператора<textarea value={notes[String(item.id)]??item.note??""} maxLength={2000} onChange={e=>setNotes(current=>({...current,[String(item.id)]:e.target.value}))} placeholder="Фактичні підстави рішення…"/></label><div className="gc-actions"><button className="button button-outline button-small" disabled={saving} onClick={()=>void updateDispute(item,"reviewing")}>На розгляді</button><button className="button button-primary button-small" disabled={saving} onClick={()=>void updateDispute(item,"resolved")}>Вирішено</button><button className="button button-danger button-small" disabled={saving} onClick={()=>void updateDispute(item,"rejected")}>Відхилити</button></div></article>)}</div>}</div>}
    {!loading && tab === "audit" && <div className="gc-card"><div className="gc-card-title"><div><span className="eyebrow">ЛИШЕ ЧИТАННЯ</span><h2>Історія завершень та аудиту · {audit.length}</h2></div><Wallet size={18}/></div><p className="gc-readonly">Резерв комісій групових ігор: {bankBalance ?? 0} 🪙. Нижче — завершені столи, спори, транзакції гравців та рухи банку.</p>{audit.length===0?<p className="gc-empty">Немає аудиторських записів у відповіді сервера.</p>:<div className="gc-list">{audit.map((row,index)=><div className="gc-row" key={`${row.kind}-${row.id??index}`}><b>{row.kind??"Аудит"}</b><span>{row.tableId ? `Стіл ${row.tableId}` : row.wagerId ? `Виклик ${row.wagerId.slice(0, 8)}` : "Резерв"}</span><span>{row.status??"—"}</span><span>{row.amount===undefined?"":`${row.amount} 🪙`}</span><span>{row.result??(row.balanceAfter===undefined?"":`Баланс після: ${row.balanceAfter} 🪙`)}</span><small>{row.createdAt?new Date(row.createdAt).toLocaleString("uk-UA"):""}</small></div>)}</div>}</div>}
  </section>;
}
