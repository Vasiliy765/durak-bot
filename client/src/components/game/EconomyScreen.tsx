import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowLeft, Check, Clock3, Coins, Crosshair, Gift, Gem, Crown, Package, ShieldCheck, ShoppingBag, Trophy } from "lucide-react";
import { gameApi, type EconomyOverview, type InventoryItem, type ShopItem, type WalletLeader } from "@/lib/gameApi";

export type EconomyTab = "wallet" | "shop" | "inventory" | "top";

const CATEGORY_LABEL: Record<string, string> = {
  avatar_frame: "Рамки аватарів",
  badge: "Значки",
  title: "Титули",
  name_color: "Кольори імені",
  profile_theme: "Теми профілю",
  other: "Інше",
};

function timeUntil(timestamp: number | null | undefined) {
  if (!timestamp) return "Доступно зараз";
  const seconds = Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));
  if (!seconds) return "Доступно зараз";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.ceil((seconds % 3600) / 60);
  return hours ? `${hours} год ${minutes} хв` : `${Math.max(1, minutes)} хв`;
}

function agentName(player: WalletLeader) {
  return [player.firstName, player.lastName].filter(Boolean).join(" ") || (player.username ? `@${player.username}` : "Агент");
}

export default function EconomyScreen({ onBack, initialTab = "wallet" }: { onBack: () => void; initialTab?: EconomyTab }) {
  const [tab, setTab] = useState<EconomyTab>(initialTab);
  const [overview, setOverview] = useState<EconomyOverview | null>(null);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [leaders, setLeaders] = useState<WalletLeader[]>([]);
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [exchangeAmount, setExchangeAmount] = useState("1");

  const reload = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [wallet, shop, owned, top] = await Promise.all([
        gameApi.economyOverview(),
        gameApi.shopItems(),
        gameApi.inventory(),
        gameApi.coinLeaderboard(),
      ]);
      setOverview(wallet);
      setShopItems(shop.items);
      setInventory(owned.items);
      setLeaders(top.players);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не вдалося завантажити гаманець.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const ownedIds = useMemo(() => new Set(inventory.map(item => item.itemId)), [inventory]);
  const categories = useMemo(() => [...new Set(shopItems.map(item => item.category))], [shopItems]);
  const visibleShop = useMemo(() => category === "all" ? shopItems : shopItems.filter(item => item.category === category), [category, shopItems]);

  const claim = async (kind: "salary" | "daily") => {
    setBusy(kind);
    setNotice("");
    setError("");
    try {
      const result = kind === "salary" ? await gameApi.claimSalary() : await gameApi.claimDaily();
      setNotice(result.claimed
        ? `Отримано +${result.amount} 🪙. Новий баланс: ${result.balance} 🪙.`
        : `Ще ${timeUntil(Date.now() + result.remainingMs)} до наступного отримання.`);
      await reload(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не вдалося отримати винагороду.");
    } finally {
      setBusy("");
    }
  };

  const purchase = async (item: ShopItem) => {
    setBusy(item.itemId);
    setNotice("");
    setError("");
    try {
      const result = await gameApi.purchaseItem(item.itemId);
      setNotice(result.alreadyOwned ? "Цей предмет уже є у вашому інвентарі." : `Придбано «${item.name}» за ${item.price} 🪙.`);
      await reload(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не вдалося виконати покупку.");
    } finally {
      setBusy("");
    }
  };

  const equip = async (item: InventoryItem) => {
    setBusy(item.itemId);
    setNotice("");
    setError("");
    try {
      await gameApi.equipItem(item.itemId);
      setNotice(`Екіпіровано: «${item.name}».`);
      await reload(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не вдалося екіпірувати предмет.");
    } finally {
      setBusy("");
    }
  };

  const buyCrystals = async (packageId: string) => {
    setBusy(packageId); setError(""); setNotice("");
    try {
      const { invoiceUrl } = await gameApi.createStarsInvoice(packageId);
      const openInvoice = window.Telegram?.WebApp?.openInvoice;
      if (!openInvoice) throw new Error("Оплата Stars доступна лише у Telegram Mini App.");
      openInvoice(invoiceUrl, status => {
        if (status === "paid") {
          setNotice("Telegram підтверджує платіж. Кристали з’являться після серверного підтвердження.");
          let attempts = 0;
          const poll = window.setInterval(() => { attempts++; void reload(false); if (attempts >= 10) window.clearInterval(poll); }, 900);
        } else if (status === "failed") setError("Telegram не завершив платіж. Спробуйте ще раз.");
        setBusy("");
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не вдалося створити рахунок Stars.");
      setBusy("");
    }
  };

  const exchange = async () => {
    setBusy("exchange"); setError(""); setNotice("");
    try { const result = await gameApi.exchangeCrystals(Number(exchangeAmount)); setNotice(`Обмін виконано: +${result.receivedCoins} 🪙.`); await reload(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Не вдалося обміняти кристали."); }
    finally { setBusy(""); }
  };

  const vip = async () => {
    setBusy("vip"); setError(""); setNotice("");
    try { const result = await gameApi.buyVip(); setNotice(`VIP активний до ${new Date(result.vipUntil).toLocaleDateString("uk-UA")}.`); await reload(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Не вдалося придбати VIP."); }
    finally { setBusy(""); }
  };

  return <section className="page-panel economy-page">
    <div className="page-heading">
      <button className="back-link" onClick={onBack}><ArrowLeft size={15} /> Назад</button>
      <span className="eyebrow">ФІНАНСИ ОПЕРАТИВНИКА</span>
      <h1>Гаманець і магазин</h1>
      <p>Спільний баланс у всіх чатах, щоденні винагороди й косметика для профілю.</p>
    </div>

    <div className="economy-summary">
      <div className="economy-balance-card">
        <span className="economy-coin-mark"><Coins size={21} /></span>
        <span className="eyebrow">ГЛОБАЛЬНИЙ БАЛАНС</span>
        <strong>{overview ? overview.balance.toLocaleString("uk-UA") : "—"}<small> 🪙</small></strong>
        <p>Один гаманець для Telegram-груп і Mini App.</p>
        <span className="economy-crystal-balance"><Gem size={15} /> {overview?.crystals ?? 0} 💎</span>
      </div>
      <div className="economy-streak-card">
        <div className="economy-streak-heading"><span className="setting-icon"><Gift size={18} /></span><span><b>Щоденна серія</b><small>Фіксований бонус кожні 24 години</small></span></div>
        <strong>{overview?.dailyStreak ?? 0}<small> дн.</small></strong>
        <span className="economy-streak-note">Бонус: {overview?.settings.bonus_coins ?? 50} 🪙 · VIP подвоює нагороду</span>
      </div>
    </div>

    <div className="economy-panel economy-premium-panel">
      <div className="shop-toolbar"><div><span className="eyebrow">КРИСТАЛИ · VIP</span><h2>Поповнення і привілеї</h2></div><Gem size={19} /></div>
      <p className="economy-note">Купівлі оплачуються Telegram Stars. Умови: /terms · підтримка платежів: /paysupport.</p>
      <div className="economy-star-packages">{(overview?.settings.stars_packages || []).map(item => <button className="button button-outline" key={item.id} disabled={busy !== ""} onClick={() => void buyCrystals(item.id)}>{busy === item.id ? "Відкриваємо…" : `${item.crystals} 💎 · ${item.stars} ⭐`}</button>)}</div>
      <div className="economy-premium-actions">
        <label>Обміняти кристали<input type="number" min="1" max={overview?.crystals ?? 0} value={exchangeAmount} onChange={event => setExchangeAmount(event.target.value)} /></label>
        <button className="button button-primary" disabled={busy !== "" || Number(exchangeAmount) <= 0 || Number(exchangeAmount) > (overview?.crystals ?? 0)} onClick={() => void exchange()}>Обміняти на {Number(exchangeAmount || 0) * (overview?.settings.exchange_rate ?? 100)} 🪙</button>
        <button className="button button-outline" disabled={busy !== "" || (overview?.crystals ?? 0) < (overview?.settings.vip_price_crystals ?? 100)} onClick={() => void vip()}><Crown size={15} /> VIP · {overview?.settings.vip_price_crystals ?? 100} 💎 / 30 днів</button>
        <span>{overview?.vipActive ? `👑 VIP до ${new Date(overview.vipUntil!).toLocaleDateString("uk-UA")}` : "VIP подвоює зарплату та бонус."}</span>
      </div>
    </div>

    <div className="economy-tabs" role="tablist" aria-label="Розділи економіки">
      <button className={tab === "wallet" ? "selected" : ""} onClick={() => setTab("wallet")}><Coins size={15} /> Гаманець</button>
      <button className={tab === "shop" ? "selected" : ""} onClick={() => setTab("shop")}><ShoppingBag size={15} /> Магазин</button>
      <button className={tab === "inventory" ? "selected" : ""} onClick={() => setTab("inventory")}><Package size={15} /> Інвентар <span>{inventory.length}</span></button>
      <button className={tab === "top" ? "selected" : ""} onClick={() => setTab("top")}><Trophy size={15} /> Топ монет</button>
    </div>

    {notice && <div className="economy-notice"><Check size={15} />{notice}<button onClick={() => setNotice("")} aria-label="Закрити">×</button></div>}
    {error && <div className="inline-error">{error}<button onClick={() => setError("")} aria-label="Закрити">×</button></div>}
    {loading ? <div className="economy-loading"><span className="loading-pulse" /> Завантажуємо економічне досьє…</div> : <>
      {tab === "wallet" && <div className="economy-panel">
        <div className="wallet-action-grid">
          <article className="wallet-action-card">
            <span className="wallet-action-icon"><Clock3 size={18} /></span>
            <span className="eyebrow">РАЗ НА 2 ГОДИНИ</span>
            <h2>Зарплата агента</h2>
            <p>Фіксована виплата {overview?.settings.salary_coins ?? 100} 🪙. VIP отримує подвійну нагороду. Cooldown спільний для всіх чатів.</p>
            <small>{overview?.salaryReady ? "Доступно зараз" : `Наступна виплата через ${timeUntil(overview?.nextSalaryAt)}`}</small>
            <button className="button button-primary button-full" disabled={busy !== "" || !overview?.salaryReady} onClick={() => void claim("salary")}>{busy === "salary" ? "Зараховуємо…" : "Отримати зарплату"}</button>
          </article>
          <article className="wallet-action-card wallet-daily-card">
            <span className="wallet-action-icon"><Gift size={18} /></span>
            <span className="eyebrow">ЩОДЕННИЙ БОНУС</span>
            <h2>Нагорода за активність</h2>
            <p>Фіксований бонус {overview?.settings.bonus_coins ?? 50} 🪙. VIP отримує подвійну нагороду.</p>
            <small>{overview?.dailyReady ? "Доступно зараз" : `Наступний бонус через ${timeUntil(overview?.nextDailyAt)}`}</small>
            <button className="button button-primary button-full" disabled={busy !== "" || !overview?.dailyReady} onClick={() => void claim("daily")}>{busy === "daily" ? "Зараховуємо…" : "Забрати щоденний бонус"}</button>
          </article>
        </div>
        <div className="economy-howto"><ShieldCheck size={16} /><span>Текстові команди бота: <code>зп</code> або <code>зарплата</code>, <code>бонус</code>, <code>баланс</code> або <code>балік</code>, <code>топ мажорів</code> або <code>топ</code>. Cooldown та суми перевіряє сервер.</span></div>
      </div>}

      {tab === "shop" && <div className="economy-panel">
        <div className="shop-toolbar"><div><span className="eyebrow">КОСМЕТИЧНИЙ КАТАЛОГ</span><h2>Персоналізуйте досьє</h2></div><span className="shop-balance-chip">🪙 {overview?.balance ?? 0}</span></div>
        <div className="shop-category-filters"><button className={category === "all" ? "selected" : ""} onClick={() => setCategory("all")}>Усе</button>{categories.map(item => <button className={category === item ? "selected" : ""} key={item} onClick={() => setCategory(item)}>{CATEGORY_LABEL[item] || item}</button>)}</div>
        <div className="shop-item-grid">{visibleShop.map(item => {
          const owned = ownedIds.has(item.itemId);
          const equipped = inventory.find(value => value.itemId === item.itemId)?.equipped || false;
          const color = typeof item.metadata.color === "string" ? item.metadata.color : undefined;
          return <article className="shop-item-card" key={item.itemId}>
            <div className={`shop-item-preview ${item.category}`} style={color ? { "--item-accent": color } as CSSProperties : undefined}>
              {item.category === "title" ? <span className="shop-title-preview">{typeof item.metadata.text === "string" ? item.metadata.text : item.name}</span> : item.category === "avatar_frame" ? <span className="shop-avatar-preview" /> : item.category === "name_color" ? <b style={color ? { color } : undefined}>АГЕНТ · 047</b> : item.category === "profile_theme" ? <span className={`shop-theme-preview ${String(item.metadata.theme || "")}`}><Crosshair size={20} /></span> : <span className="shop-badge-preview"><ShieldCheck size={19} style={color ? { color } : undefined} /></span>}
            </div>
            <span className="shop-item-category">{CATEGORY_LABEL[item.category] || item.category}</span>
            <h3>{item.name}</h3>
            <p>{item.description}</p>
            <div className="shop-item-footer"><strong>🪙 {item.price}</strong>{owned ? <button className="button button-outline button-small" disabled={equipped || busy !== ""} onClick={() => { const ownedItem = inventory.find(value => value.itemId === item.itemId); if (ownedItem) void equip(ownedItem); }}>{equipped ? "Екіпіровано" : busy === item.itemId ? "Зберігаємо…" : "Екіпірувати"}</button> : <button className="button button-primary button-small" disabled={busy !== "" || (overview?.balance ?? 0) < item.price} onClick={() => void purchase(item)}>{busy === item.itemId ? "Купуємо…" : "Купити"}</button>}</div>
          </article>;
        })}</div>
      </div>}

      {tab === "inventory" && <div className="economy-panel">
        <div className="shop-toolbar"><div><span className="eyebrow">ОСОБИСТЕ СПОРЯДЖЕННЯ</span><h2>Інвентар агента</h2></div><span className="count-chip">{inventory.length} предметів</span></div>
        {inventory.length ? <div className="inventory-item-grid">{inventory.map(item => <article className={`inventory-item-card ${item.equipped ? "equipped" : ""}`} key={item.itemId}>
          <span className="inventory-item-icon">{item.equipped ? <Check size={17} /> : <Package size={17} />}</span><div><span className="shop-item-category">{CATEGORY_LABEL[item.category] || item.category}</span><h3>{item.name}</h3><p>{item.description}</p></div><button className={`button ${item.equipped ? "button-outline" : "button-primary"} button-small`} disabled={item.equipped || busy !== ""} onClick={() => void equip(item)}>{item.equipped ? "Екіпіровано" : busy === item.itemId ? "Зберігаємо…" : "Екіпірувати"}</button>
        </article>)}</div> : <div className="economy-empty"><Package size={23} /><b>Інвентар порожній</b><span>Придбайте перший косметичний предмет у магазині.</span><button className="button button-outline button-small" onClick={() => setTab("shop")}>Відкрити магазин</button></div>}
      </div>}

      {tab === "top" && <div className="economy-panel">
        <div className="shop-toolbar"><div><span className="eyebrow">ГЛОБАЛЬНИЙ РЕЙТИНГ</span><h2>Найбагатші агенти</h2></div><Trophy size={19} /></div>
        <div className="wealth-leaderboard">{leaders.length ? leaders.map((player, index) => <div className={`wealth-leader-row ${index < 3 ? "top-rank" : ""}`} key={`${player.username || agentName(player)}-${index}`}><span className="rank-number">{String(index + 1).padStart(2, "0")}</span><span className="wealth-leader-avatar">{player.avatarUrl ? <img src={player.avatarUrl} alt="" /> : (player.firstName || "А").slice(0, 1)}</span><span className="wealth-leader-name"><b>{agentName(player)}{player.vip && <span title="VIP"> 👑</span>}</b>{player.username && <small>@{player.username}</small>}</span><strong>🪙 {player.balance.toLocaleString("uk-UA")}</strong></div>) : <div className="economy-empty"><Trophy size={22} /><span>Рейтинг почне формуватися після перших монет.</span></div>}</div>
      </div>}
    </>}
  </section>;
}
