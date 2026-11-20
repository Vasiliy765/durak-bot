import { useEffect, useState } from "react";
import { Check, Coins, Gem, Search, Save, ShieldCheck, Crown } from "lucide-react";
import { gameApi } from "@/lib/gameApi";

type Package = { id: string; stars: number; crystals: number };
type Settings = { exchange_rate: number; vip_price_crystals: number; salary_coins: number; bonus_coins: number; stars_packages: Package[] };
type FoundPlayer = { telegramId: string; firstName: string; username?: string | null; balance: number; crystals: number; vipUntil?: string | Date | null };

export default function EconomyAdminPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [query, setQuery] = useState("");
  const [player, setPlayer] = useState<FoundPlayer | null>(null);
  const [currency, setCurrency] = useState<"coins" | "crystals" | "vip">("coins");
  const [amount, setAmount] = useState("10");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void gameApi.economyAdmin<{ settings: Settings }>("/settings").then(result => setSettings(result.settings)).catch(cause => setError(cause instanceof Error ? cause.message : "Не вдалося завантажити налаштування."));
  }, []);

  const save = async () => {
    if (!settings) return;
    setBusy(true); setError(""); setNotice("");
    try { const result = await gameApi.economyAdmin<{ settings: Settings }>("/settings", { method: "POST", body: JSON.stringify(settings) }); setSettings(result.settings); setNotice("Налаштування збережено в базі даних."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Не вдалося зберегти налаштування."); }
    finally { setBusy(false); }
  };

  const find = async () => {
    setBusy(true); setError(""); setPlayer(null);
    try { const result = await gameApi.economyAdmin<{ player: FoundPlayer }>(`/player?target=${encodeURIComponent(query)}`); setPlayer(result.player); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Гравця не знайдено в базі"); }
    finally { setBusy(false); }
  };

  const grant = async () => {
    if (!player) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await gameApi.economyAdmin<{ player: FoundPlayer }>("/grant", { method: "POST", body: JSON.stringify({ target: player.telegramId, currency, amount: Number(amount) }) });
      if (currency === "coins") setPlayer({ ...player, balance: result.player.balance });
      else if (currency === "crystals") setPlayer({ ...player, crystals: result.player.crystals });
      else setPlayer({ ...player, vipUntil: result.player.vipUntil });
      setNotice("Зміни застосовано до балансу гравця.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не вдалося виконати корекцію."); }
    finally { setBusy(false); }
  };

  if (!settings) return <div className="panel-card">{error || "Завантаження налаштувань економіки…"}</div>;
  const setNumber = (key: keyof Omit<Settings, "stars_packages">, value: string) => setSettings({ ...settings, [key]: Number(value) });
  return <div className="economy-admin-stack">
    <section className="panel-card admin-settings-card">
      <div className="section-heading"><div><span className="eyebrow">ЕКОНОМІЧНИЙ КОНТРОЛЬ</span><h2>Керування цінами</h2></div><ShieldCheck size={18} /></div>
      <div className="admin-settings-grid">
        <label>Курс · 💎 → 🪙<input type="number" min="1" value={settings.exchange_rate} onChange={event => setNumber("exchange_rate", event.target.value)} /></label>
        <label>VIP · кристалів / 30 днів<input type="number" min="1" value={settings.vip_price_crystals} onChange={event => setNumber("vip_price_crystals", event.target.value)} /></label>
        <label>Зарплата · 🪙<input type="number" min="1" value={settings.salary_coins} onChange={event => setNumber("salary_coins", event.target.value)} /></label>
        <label>Бонус · 🪙<input type="number" min="1" value={settings.bonus_coins} onChange={event => setNumber("bonus_coins", event.target.value)} /></label>
      </div>
      <h3>Telegram Stars пакети</h3>
      <div className="admin-settings-grid">{settings.stars_packages.map((item, index) => <label key={item.id}>Набір {index + 1} · Stars / 💎<div className="admin-settings-grid"><input type="number" min="1" value={item.stars} onChange={event => setSettings({ ...settings, stars_packages: settings.stars_packages.map((p, i) => i === index ? { ...p, stars: Number(event.target.value) } : p) })} /><input type="number" min="1" value={item.crystals} onChange={event => setSettings({ ...settings, stars_packages: settings.stars_packages.map((p, i) => i === index ? { ...p, crystals: Number(event.target.value) } : p) })} /></div></label>)}</div>
      <button className="button button-primary" disabled={busy} onClick={() => void save()}><Save size={15} /> Зберегти параметри</button>
    </section>
    <section className="panel-card admin-settings-card">
      <div className="section-heading"><div><span className="eyebrow">РУЧНА КОРЕКЦІЯ · АУДИТУЄТЬСЯ</span><h2>Видача гравцю</h2></div><Coins size={18} /></div>
      <div className="location-add-form"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="@username або Telegram ID" /><button className="button button-outline" disabled={busy || !query.trim()} onClick={() => void find()}><Search size={15} /> Знайти</button></div>
      {player && <div className="admin-player-row"><span className="admin-player-info"><b>{player.firstName}{player.username ? ` · @${player.username}` : ""}</b><small>ID {player.telegramId} · {player.balance} 🪙 · {player.crystals} 💎{player.vipUntil ? ` · VIP до ${new Date(player.vipUntil).toLocaleDateString("uk-UA")}` : ""}</small></span></div>}
      <div className="admin-settings-grid"><label>Ресурс<select value={currency} onChange={event => setCurrency(event.target.value as typeof currency)}><option value="coins">Монети 🪙</option><option value="crystals">Кристали 💎</option><option value="vip">VIP дні 👑</option></select></label><label>Кількість (від'ємна — списати)<input type="number" value={amount} onChange={event => setAmount(event.target.value)} /></label></div>
      <button className="button button-primary" disabled={busy || !player || !Number(amount)} onClick={() => void grant()}><Check size={15} /> Виконати корекцію</button>
    </section>
    {(error || notice) && <p role={error ? "alert" : "status"} className={error ? "inline-error" : "inline-success"}>{error || notice}</p>}
    <span className="sr-only"><Gem /><Crown /></span>
  </div>;
}
