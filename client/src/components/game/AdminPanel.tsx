import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Clock3, MapPinned, Plus, Radio, RefreshCw, Settings, Shield, ShieldCheck, Trash2, Trophy, Users, X } from "lucide-react";
import { gameApi, type Profile } from "@/lib/gameApi";
import GameCenterAdminPanel from "@/components/game-center/GameCenterAdminPanel";
import EconomyAdminPanel from "@/components/game/EconomyAdminPanel";

type AdminSection = "overview" | "players" | "locations" | "categories" | "settings" | "errors" | "game-center" | "economy";
type Overview = { users: number; activeRooms: number; gamesPlayed: number; latestGames: Array<{ roomName: string; winner: string; location: string; participants: number; createdAt: string }> };
type AdminPlayer = Omit<Profile, "telegramId"> & { telegramId: string; blocked: boolean };
type Location = { id: number; name: string; category: string; active: boolean };
type Category = { id: number; name: string; active: boolean };
type Config = { voteSeconds: number; xpParticipation: number; xpWin: number };
type SystemError = { id: number; method: string; route: string; message: string; createdAt: string };

const sections: Array<{ id: AdminSection; label: string }> = [
  { id: "overview", label: "Огляд" }, { id: "players", label: "Гравці" }, { id: "locations", label: "Локації" },
  { id: "categories", label: "Категорії" }, { id: "settings", label: "Налаштування" }, { id: "errors", label: "Помилки" },
  { id: "game-center", label: "Ігровий центр" },
  { id: "economy", label: "Економіка" },
];

export default function AdminPanel() {
  const [section, setSection] = useState<AdminSection>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<Config>({ voteSeconds: 45, xpParticipation: 25, xpWin: 35 });
  const [errors, setErrors] = useState<SystemError[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [overviewData, playerData, locationData, settingData, errorData] = await Promise.all([
        gameApi.admin<Overview>("/overview"),
        gameApi.admin<{ players: AdminPlayer[] }>("/players"),
        gameApi.admin<{ locations: Location[]; categories: Category[] }>("/locations"),
        gameApi.admin<{ settings: Config }>("/settings"),
        gameApi.admin<{ errors: SystemError[] }>("/errors"),
      ]);
      setOverview(overviewData);
      setPlayers(playerData.players);
      setLocations(locationData.locations);
      setCategories(locationData.categories);
      setSettings(settingData.settings);
      setErrors(errorData.errors);
      setCategory(current => current && locationData.categories.some(item => item.name === current && item.active) ? current : locationData.categories.find(item => item.active)?.name || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не вдалося завантажити панель.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    const timer = window.setInterval(() => void reload(), 30_000);
    return () => window.clearInterval(timer);
  }, [reload]);

  const mutate = async (action: () => Promise<unknown>) => {
    setSaving(true); setError(""); setSaved(false);
    try { await action(); await reload(); setSaved(true); window.setTimeout(() => setSaved(false), 2400); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Не вдалося зберегти зміну."); }
    finally { setSaving(false); }
  };

  const addLocation = () => {
    if (!name.trim() || !category) return;
    void mutate(async () => { await gameApi.admin("/locations", { method: "POST", body: JSON.stringify({ name, category }) }); setName(""); });
  };
  const addCategory = () => {
    if (!categoryName.trim()) return;
    void mutate(async () => { await gameApi.admin("/categories", { method: "POST", body: JSON.stringify({ name: categoryName }) }); setCategoryName(""); });
  };
  const toggleLocation = (item: Location) => void mutate(() => gameApi.admin(`/locations/${item.id}`, { method: "PATCH", body: JSON.stringify({ active: !item.active }) }));
  const toggleCategory = (item: Category) => void mutate(() => gameApi.admin(`/categories/${item.id}`, { method: "PATCH", body: JSON.stringify({ active: !item.active }) }));
  const togglePlayer = (player: AdminPlayer) => void mutate(() => gameApi.admin(`/players/${encodeURIComponent(player.telegramId)}/block`, { method: "PATCH", body: JSON.stringify({ blocked: !player.blocked }) }));
  const saveSettings = () => void mutate(() => gameApi.admin("/settings", { method: "PATCH", body: JSON.stringify(settings) }));

  return <section className="page-panel admin-page">
    <div className="page-heading"><span className="eyebrow">ЗАКРИТИЙ РОЗДІЛ</span><h1>Адмін-панель</h1><p>Статистика, безпека та керування ігровим середовищем.</p></div>
    {error && <div className="inline-error"><AlertTriangle size={15} />{error}<button onClick={() => setError("")} aria-label="Закрити"><X size={14} /></button></div>}
    {saved && <div className="inline-success"><Check size={14} />Зміни збережено.</div>}
    <nav className="admin-tabs" aria-label="Розділи адміністратора">{sections.map(item => <button className={section === item.id ? "selected" : ""} key={item.id} onClick={() => setSection(item.id)}>{item.label}</button>)}<button className="admin-refresh" onClick={() => void reload()} aria-label="Оновити" disabled={loading}><RefreshCw size={15} /></button></nav>

    {loading && <div className="panel-card admin-loading">Завантаження захищених даних…</div>}
    {!loading && section === "game-center" && <GameCenterAdminPanel />}
    {!loading && section === "economy" && <EconomyAdminPanel />}
    {!loading && section === "overview" && <>
      <div className="admin-stat-grid"><AdminStat label="ЗАРЕЄСТРОВАНО" value={overview?.users ?? 0} icon={<Users size={17} />} /><AdminStat label="АКТИВНІ КІМНАТИ" value={overview?.activeRooms ?? 0} icon={<Radio size={17} />} /><AdminStat label="ЗАВЕРШЕНО ПАРТІЙ" value={overview?.gamesPlayed ?? 0} icon={<Trophy size={17} />} /></div>
      <div className="panel-card admin-history"><span className="eyebrow">ОСТАННІ ОПЕРАЦІЇ</span>{overview?.latestGames?.length ? overview.latestGames.map((game, index) => <div className="history-row" key={`${game.roomName}-${index}`}><span className="history-index">{String(index + 1).padStart(2, "0")}</span><b>{game.roomName}</b><span>{game.participants} гравців</span><span>{game.location}</span><small>{game.winner === "spies" ? "Шпигуни" : "Агенти"}</small></div>) : <p className="empty-note">Історія завершених партій з'явиться тут.</p>}</div>
    </>}

    {!loading && section === "players" && <div className="panel-card admin-list-card"><div className="section-heading"><div><span className="eyebrow">АКАУНТИ</span><h2>Гравці · {players.length}</h2></div><Shield size={17} /></div>{players.length ? players.map(player => <div className={`admin-player-row ${player.blocked ? "inactive" : ""}`} key={player.telegramId}><span className="avatar">{player.avatarUrl ? <img src={player.avatarUrl} alt="" /> : player.firstName.slice(0, 1)}</span><span className="admin-player-info"><b>{player.firstName}{player.lastName ? ` ${player.lastName}` : ""}</b><small>{player.username ? `@${player.username} · ` : ""}ID ${player.telegramId} · {player.gamesPlayed} партій</small></span><button className={`button ${player.blocked ? "button-outline" : "button-danger"} button-small`} disabled={saving} onClick={() => togglePlayer(player)}>{player.blocked ? "Розблокувати" : "Блокувати"}</button></div>) : <p className="empty-note">Користувачів ще немає.</p>}</div>}

    {!loading && section === "locations" && <div className="panel-card location-admin"><span className="eyebrow">ДОДАТИ ЛОКАЦІЮ</span><div className="location-add-form"><input value={name} onChange={event => setName(event.target.value)} placeholder="Назва локації" /><select value={category} onChange={event => setCategory(event.target.value)}>{categories.filter(item => item.active).map(item => <option key={item.id} value={item.name}>{item.name}</option>)}</select><button className="button button-primary" disabled={!name.trim() || !category || saving} onClick={addLocation}><Plus size={15} /> Додати</button></div><div className="location-admin-list">{locations.map(item => <div className={`location-admin-row ${item.active ? "" : "inactive"}`} key={item.id}><MapPinned size={15} /><span><b>{item.name}</b><small>{item.category}</small></span><button className={`switch ${item.active ? "on" : ""}`} onClick={() => toggleLocation(item)} aria-label="Змінити активність"><i /></button></div>)}</div></div>}

    {!loading && section === "categories" && <div className="panel-card location-admin category-admin"><span className="eyebrow">КАТАЛОГ КАТЕГОРІЙ</span><div className="location-add-form"><input value={categoryName} onChange={event => setCategoryName(event.target.value)} placeholder="Нова категорія" maxLength={80} /><button className="button button-primary" disabled={!categoryName.trim() || saving} onClick={addCategory}><Plus size={15} /> Додати</button></div><div className="location-admin-list">{categories.map(item => <div className={`location-admin-row ${item.active ? "" : "inactive"}`} key={item.id}><MapPinned size={15} /><span><b>{item.name}</b><small>{locations.filter(location => location.category === item.name && location.active).length} активних локацій</small></span><button className={`switch ${item.active ? "on" : ""}`} onClick={() => toggleCategory(item)} aria-label="Змінити активність"><i /></button></div>)}</div></div>}

    {!loading && section === "settings" && <div className="panel-card admin-settings-card"><span className="eyebrow">ГЛОБАЛЬНІ ПАРАМЕТРИ</span><p className="section-copy">Нові параметри застосовуються до наступних ігрових дій; таймери вже запущених голосувань не змінюються.</p><div className="admin-settings-grid"><label>Тривалість голосування · секунд<input type="number" min={15} max={120} value={settings.voteSeconds} onChange={event => setSettings({ ...settings, voteSeconds: Number(event.target.value) })} /></label><label>XP за участь<input type="number" min={5} max={100} value={settings.xpParticipation} onChange={event => setSettings({ ...settings, xpParticipation: Number(event.target.value) })} /></label><label>Бонус XP за перемогу<input type="number" min={0} max={100} value={settings.xpWin} onChange={event => setSettings({ ...settings, xpWin: Number(event.target.value) })} /></label></div><button className="button button-primary" disabled={saving} onClick={saveSettings}><Settings size={15} /> Зберегти параметри</button></div>}

    {!loading && section === "errors" && <div className="panel-card admin-error-list"><div className="section-heading"><div><span className="eyebrow">СЕРВЕРНИЙ ЖУРНАЛ</span><h2>Помилки · {errors.length}</h2></div><ShieldCheck size={17} /></div>{errors.length ? errors.map(item => <div className="admin-error-row" key={item.id}><span className="error-method">{item.method}</span><div><b>{item.route}</b><p>{item.message}</p><small><Clock3 size={12} /> {new Date(item.createdAt).toLocaleString("uk-UA")}</small></div></div>) : <p className="empty-note">Зареєстрованих помилок немає.</p>}</div>}
  </section>;
}

function AdminStat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <div className="stat-card"><span className="stat-icon">{icon}</span><span className="eyebrow">{label}</span><strong>{value}</strong></div>;
}
