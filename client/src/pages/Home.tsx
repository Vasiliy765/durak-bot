import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Coins,
  Crown,
  Crosshair,
  Eye,
  Gamepad2,
  Gift,
  LockKeyhole,
  MapPinned,
  Menu,
  Package,
  Radio,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import GameRoomScreen, {
  RoomSettingsForm,
} from "@/components/game/GameRoomScreen";
import GameCenterScreen from "@/components/game-center/GameCenterScreen";
import EconomyScreen, {
  type EconomyTab,
} from "@/components/game/EconomyScreen";
import CommandsScreen from "@/components/CommandsScreen";
import AdminPanel from "@/components/game/AdminPanel";
import {
  GameApiError,
  gameApi,
  rotatePreviewAgent,
  type GameRoom,
  type Profile,
  type RoomSettings,
} from "@/lib/gameApi";
import {
  getTelegramLaunchCode,
  getTelegramStartParameter,
  initializeTelegramWebApp,
  parseArcadeInviteToken,
  playUiSound,
} from "@/lib/telegram";

const defaultSettings: RoomSettings = {
  name: "Операція «Чорний ворон»",
  maxPlayers: 8,
  spyCount: 1,
  durationMinutes: 7,
  allowRejoin: true,
  isPrivate: true,
  categories: [],
  mode: "spyfall",
};
type Page =
  | "game-center"
  | "home"
  | "create"
  | "join"
  | "profile"
  | "economy"
  | "commands"
  | "rules"
  | "settings"
  | "admin";
type Session = {
  player: Profile;
  admin: boolean;
  preview: boolean;
  categories: string[];
  locationCount: number;
};

export default function Home() {
  const [page, setPage] = useState<Page>("game-center");
  const [session, setSession] = useState<Session | null>(null);
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [settings, setSettings] = useState<RoomSettings>(defaultSettings);
  const [busy, setBusy] = useState(false);
  const [soundOn, setSoundOn] = useState(
    () => localStorage.getItem("spy-sound") !== "off"
  );
  const [mobileMenu, setMobileMenu] = useState(false);
  const [economyTab, setEconomyTab] = useState<EconomyTab>("wallet");
  const [arcadeInviteToken, setArcadeInviteToken] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    const result = await gameApi.session();
    setSession(result);
    return result;
  }, []);

  useEffect(() => {
    initializeTelegramWebApp();
    void (async () => {
      try {
        await refreshSession();
        const rawStartParam = getTelegramStartParameter().trim();
        const startParam = rawStartParam.toLowerCase();
        const arcadeToken = parseArcadeInviteToken(rawStartParam);
        const viewParam =
          new URLSearchParams(window.location.search)
            .get("view")
            ?.toLowerCase() || "";
        const requestedView = viewParam || startParam;
        if (arcadeToken) {
          setArcadeInviteToken(arcadeToken);
          setPage("game-center");
        } else if (
          ["economy", "shop", "wallet", "inventory", "top"].includes(
            requestedView
          )
        ) {
          const requestedTab: EconomyTab =
            requestedView === "shop" ||
            requestedView === "inventory" ||
            requestedView === "top"
              ? requestedView
              : "wallet";
          setEconomyTab(requestedTab);
          setPage("economy");
        }
        const inviteCode = getTelegramLaunchCode();
        if (inviteCode) {
          const result = await gameApi.joinRoom(inviteCode);
          setRoom(result.room);
        }
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Не вдалося підключитися до сервера гри."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshSession]);

  useEffect(() => {
    if (!room || room.status === "finished") return;
    const interval = window.setInterval(async () => {
      try {
        const result = await gameApi.room(room.code);
        setRoom(result.room);
      } catch (cause) {
        if (
          cause instanceof GameApiError &&
          (cause.status === 403 || cause.status === 404)
        ) {
          setRoom(null);
          setPage("home");
          setError(
            cause.message ||
              "Доступ до кімнати втрачено. Ви повернулися до головного меню."
          );
        }
      }
    }, 2200);
    return () => window.clearInterval(interval);
  }, [room?.code, room?.status]);

  const updateRoom = (next: GameRoom) => setRoom(next);
  const clearRoom = () => {
    setRoom(null);
    setPage("home");
    setError("");
  };

  const createRoom = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await gameApi.createRoom(settings);
      setRoom(result.room);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Не вдалося створити кімнату."
      );
    } finally {
      setBusy(false);
    }
  };

  const joinRoom = async (code = roomCode) => {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      setError("Введіть код кімнати.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await gameApi.joinRoom(clean);
      setRoom(result.room);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Не вдалося приєднатися до кімнати."
      );
    } finally {
      setBusy(false);
    }
  };

  const quickPlay = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await gameApi.publicRooms();
      const available = result.rooms.find(
        candidate => candidate.count < candidate.maxPlayers
      );
      if (available) {
        const joined = await gameApi.joinRoom(available.code).catch(() => null);
        if (joined) {
          setRoom(joined.room);
          return;
        }
      }
      const created = await gameApi.createRoom({
        ...defaultSettings,
        name: `Швидка гра ${Math.floor(Math.random() * 900 + 100)}`,
        isPrivate: false,
      });
      setRoom(created.room);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Швидкий пошук тимчасово недоступний."
      );
    } finally {
      setBusy(false);
    }
  };

  const backFromRoom = async () => {
    const current = room;
    setRoom(null);
    setPage("home");
    if (current && current.status !== "finished")
      await gameApi.leave(current.code).catch(() => undefined);
  };

  const go = (next: Page) => {
    if (next === "profile") void refreshSession().catch(() => undefined);
    setPage(next);
    setError("");
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openEconomy = (tab: EconomyTab = "wallet") => {
    setEconomyTab(tab);
    go("economy");
  };
  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    localStorage.setItem("spy-sound", next ? "on" : "off");
    if (next) window.setTimeout(playUiSound, 0);
  };

  if (loading)
    return (
      <div className="loading-screen">
        <div className="brand-mark">
          <Crosshair size={23} />
        </div>
        <span className="loading-pulse" />
        <p>Захищений канал встановлюється…</p>
      </div>
    );

  if (room && session)
    return (
      <GameRoomScreen
        room={room}
        me={{
          telegramId: session.player.telegramId || "",
          firstName: session.player.firstName,
        }}
        categories={session.categories}
        preview={session.preview}
        onRoom={updateRoom}
        onBack={() => void backFromRoom()}
      />
    );

  const errorBanner = error ? (
    <div className="global-error">
      <Shield size={16} />
      <span>{error}</span>
      <button onClick={() => setError("")} aria-label="Закрити">
        <X size={15} />
      </button>
    </div>
  ) : null;

  return (
    <div className="app-shell">
      <header className="app-header">
        <button
          className="brand-lockup"
          onClick={() => go("game-center")}
          aria-label="ШПИГУН — головна"
        >
          <span className="brand-mark">
            <Crosshair size={20} />
          </span>
          <span className="brand-name">
            ШПИГУН<small>/ ОПЕРАТИВНИЙ ЦЕНТР</small>
          </span>
        </button>
        <nav className="desktop-nav" aria-label="Головна навігація">
          <button
            className={page === "game-center" ? "active" : ""}
            onClick={() => go("game-center")}
          >
            Ігри
          </button>
          <button
            className={page === "home" ? "active" : ""}
            onClick={() => go("home")}
          >
            Spyfall
          </button>
          <button
            className={page === "economy" ? "active" : ""}
            onClick={() => openEconomy("wallet")}
          >
            Гаманець
          </button>
          <button
            className={page === "commands" ? "active" : ""}
            onClick={() => go("commands")}
          >
            Команди
          </button>
          <button
            className={page === "rules" ? "active" : ""}
            onClick={() => go("rules")}
          >
            Правила
          </button>
          <button
            className={page === "settings" ? "active" : ""}
            onClick={() => go("settings")}
          >
            Налаштування
          </button>
          {session?.admin && (
            <button
              className={page === "admin" ? "active" : ""}
              onClick={() => go("admin")}
            >
              Адмін
            </button>
          )}
        </nav>
        <div className="header-actions">
          <button
            className="icon-button sound-button"
            onClick={toggleSound}
            aria-label={soundOn ? "Вимкнути звук" : "Увімкнути звук"}
          >
            {soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
          <button
            className="icon-button mobile-menu-button"
            onClick={() => setMobileMenu(!mobileMenu)}
            aria-label="Меню"
          >
            {mobileMenu ? <X size={19} /> : <Menu size={19} />}
          </button>
          <button className="profile-pill" onClick={() => go("profile")}>
            <span className="avatar avatar-header">
              {session?.player.avatarUrl ? (
                <img src={session.player.avatarUrl} alt="" />
              ) : (
                session?.player.firstName.slice(0, 1) || "А"
              )}
            </span>
            <span>{session?.player.firstName || "Агент"}</span>
            <span className="level-mini">
              РІВ. {session?.player.level || 1}
            </span>
          </button>
        </div>
      </header>

      {mobileMenu && (
        <nav className="mobile-menu">
          <button onClick={() => go("game-center")}>
            <Gamepad2 size={17} /> Ігровий центр
          </button>
          <button onClick={() => go("home")}>
            <Crosshair size={17} /> Spyfall
          </button>
          <button onClick={() => openEconomy("wallet")}>
            <Coins size={17} /> Гаманець і магазин
          </button>
          <button onClick={() => go("profile")}>
            <Users size={17} /> Мій профіль
          </button>
          <button onClick={() => go("commands")}>
            <BookOpen size={17} /> Команди бота
          </button>
          <button onClick={() => go("rules")}>
            <BookOpen size={17} /> Правила
          </button>
          <button onClick={() => go("settings")}>
            <Settings size={17} /> Налаштування
          </button>
          {session?.admin && (
            <button onClick={() => go("admin")}>
              <ShieldCheck size={17} /> Адмін-панель
            </button>
          )}
        </nav>
      )}

      <main
        className={`main-content${page === "game-center" ? " main-content--game-center" : ""}`}
      >
        {errorBanner}
        {session?.preview && (
          <div className="preview-banner">
            <Sparkles size={15} />
            <span>
              <b>Тестовий режим</b> · цей агент доступний лише у Preview, не у
              production.
            </span>
            <button
              onClick={() => {
                rotatePreviewAgent();
                window.location.reload();
              }}
            >
              Змінити агента <ArrowRight size={13} />
            </button>
          </div>
        )}

        {page === "game-center" && (
          <GameCenterScreen
            onBack={() => go("home")}
            initialInviteToken={arcadeInviteToken}
            soundOn={soundOn}
            onToggleSound={toggleSound}
          />
        )}
        {page === "home" && (
          <HomeDashboard
            session={session}
            onCreate={() => go("create")}
            onJoin={() => go("join")}
            onQuick={() => void quickPlay()}
            onEconomy={() => openEconomy("wallet")}
            busy={busy}
            locationCount={session?.locationCount || 220}
          />
        )}
        {page === "create" && (
          <section className="page-panel narrow-panel">
            <PageHeading
              eyebrow="ПІДГОТОВКА ОПЕРАЦІЇ"
              title="Створити кімнату"
              intro="Налаштуйте кімнату та запросіть друзів до спільної гри."
              onBack={() => go("home")}
            />
            <div className="panel-card">
              <RoomSettingsForm
                settings={settings}
                categories={session?.categories || []}
                onChange={setSettings}
              />
              <button
                className="button button-primary button-full create-submit"
                disabled={busy}
                onClick={() => void createRoom()}
              >
                <Crosshair size={17} />
                {busy ? "Створюємо кімнату…" : "Створити кімнату"}
              </button>
              <p className="form-footnote">
                <LockKeyhole size={13} /> Ролі та секретна локація генеруються
                сервером.
              </p>
            </div>
          </section>
        )}
        {page === "join" && (
          <JoinPage
            roomCode={roomCode}
            setRoomCode={setRoomCode}
            onJoin={() => void joinRoom()}
            onJoinPublic={code => void joinRoom(code)}
            onBack={() => go("home")}
            busy={busy}
          />
        )}
        {page === "profile" && session && (
          <ProfilePage
            profile={session.player}
            go={go}
            openEconomy={openEconomy}
          />
        )}
        {page === "economy" && (
          <EconomyScreen onBack={() => go("home")} initialTab={economyTab} />
        )}
        {page === "commands" && (
          <CommandsScreen onOpenProfile={() => go("profile")} />
        )}
        {page === "rules" && <RulesPage />}
        {page === "settings" && (
          <SettingsPage
            soundOn={soundOn}
            toggleSound={toggleSound}
            preview={Boolean(session?.preview)}
            onSwitchAgent={() => {
              rotatePreviewAgent();
              window.location.reload();
            }}
          />
        )}
        {page === "admin" && session?.admin && <AdminPanel />}
        {page === "admin" && !session?.admin && (
          <section className="page-panel narrow-panel">
            <PageHeading
              eyebrow="ОБМЕЖЕНИЙ ДОСТУП"
              title="Немає доступу"
              intro="Панель доступна лише авторизованим адміністраторам."
              onBack={() => go("home")}
            />
          </section>
        )}
      </main>

      <nav className="mobile-bottom-nav">
        <button
          className={page === "game-center" ? "active" : ""}
          onClick={() => go("game-center")}
        >
          <Gamepad2 size={18} />
          <span>Ігри</span>
        </button>
        <button
          className={page === "economy" ? "active" : ""}
          onClick={() => openEconomy("wallet")}
        >
          <Coins size={18} />
          <span>Монети</span>
        </button>
        <button
          className={page === "commands" ? "active" : ""}
          onClick={() => go("commands")}
        >
          <BookOpen size={18} />
          <span>Команди</span>
        </button>
        <button
          className={page === "profile" ? "active" : ""}
          onClick={() => go("profile")}
        >
          <Users size={18} />
          <span>Профіль</span>
        </button>
      </nav>
      <footer className="app-footer">
        <span>ШПИГУН · СОЦІАЛЬНА ДЕДУКЦІЯ</span>
        <span>
          ЗАХИЩЕНИЙ КАНАЛ <i className="live-dot" />
        </span>
        <span>{session?.locationCount ?? 0} ЛОКАЦІЙ В БАЗІ</span>
      </footer>
    </div>
  );
}

function HomeDashboard({
  session,
  onCreate,
  onJoin,
  onQuick,
  onEconomy,
  busy,
  locationCount,
}: {
  session: Session | null;
  onCreate: () => void;
  onJoin: () => void;
  onQuick: () => void;
  onEconomy: () => void;
  busy: boolean;
  locationCount: number;
}) {
  return (
    <>
      <section className="hero-banner">
        <div className="hero-gridline" />
        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
        <div className="hero-copy">
          <div className="hero-kicker">
            <span className="live-dot" /> КАНАЛ ВІДКРИТО{" "}
            <span className="kicker-divider" /> ОПЕРАЦІЯ № 047
          </div>
          <h1>
            Серед вас
            <br />
            <em>є шпигун.</em>
          </h1>
          <p>
            Ставте правильні питання. Не розкривайте локацію. Знайдіть того, хто
            не знає, де ви.
          </p>
          <div className="hero-actions">
            <button
              className="button button-primary"
              onClick={onQuick}
              disabled={busy}
            >
              <Crosshair size={17} />
              {busy ? "Шукаємо кімнату…" : "Швидка гра в Mini App"}
              <ArrowRight size={15} />
            </button>
            <span className="hero-note">
              <Users size={14} /> 3–12 гравців
            </span>
          </div>
        </div>
        <div className="hero-dossier">
          <div className="dossier-radar">
            <span className="radar-ring ring-1" />
            <span className="radar-ring ring-2" />
            <span className="radar-ring ring-3" />
            <span className="radar-sweep" />
            <span className="radar-dot dot-a" />
            <span className="radar-dot dot-b" />
            <span className="radar-center">
              <Crosshair size={17} />
            </span>
          </div>
          <div className="dossier-label">
            <span>ОПЕРАТИВНЕ ДІЛО</span>
            <b>SPYFALL / UA</b>
          </div>
          <div className="dossier-meta">
            <span>
              АГЕНТИ <b>03—12</b>
            </span>
            <span>
              ЛОКАЦІЇ <b>{locationCount}+</b>
            </span>
            <span>
              МОВА <b>UA</b>
            </span>
          </div>
          <div className="dossier-stamp">ТАЄМНО</div>
        </div>
        <div className="hero-bottomline">
          <span>НАВЕДЕННЯ: ЗАХИЩЕНЕ</span>
          <span>ВЕРСІЯ ОПЕРАЦІЇ 01.0</span>
          <span>ДАНІ ШИФРУЮТЬСЯ</span>
        </div>
      </section>

      <section className="group-bot-card">
        <div className="group-bot-mark">
          <Crosshair size={21} />
        </div>
        <div className="group-bot-copy">
          <span className="eyebrow">ОСНОВНИЙ РЕЖИМ · TELEGRAM ГРУПА</span>
          <h2>Грайте прямо у спільному чаті</h2>
          <p>
            Додайте <b>@SecretAgentGame</b> до групи адміністратором — це
            потрібно для прав самого бота. Будь-який учасник чату може ввести{" "}
            <code>/game</code>, набрати щонайменше трьох гравців і запустити
            партію кнопкою або <code>/startgame</code>, навіть якщо не вступав
            до лобі. Ролі прийдуть приватно; питання та голосування залишаються
            у групі.
          </p>
        </div>
        <div className="group-bot-actions">
          <a
            className="button button-outline"
            href="https://t.me/SecretAgentGame"
            target="_blank"
            rel="noreferrer"
          >
            Відкрити бота <ArrowRight size={14} />
          </a>
          <button className="button button-primary" onClick={onEconomy}>
            <Coins size={16} /> Гаманець і магазин
          </button>
        </div>
      </section>

      <section className="home-action-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ВИБІР ОПЕРАЦІЇ</span>
            <h2>Як гратимемо?</h2>
          </div>
          <span className="section-index">01 / 03</span>
        </div>
        <div className="action-grid">
          <button
            className="action-card action-card-featured"
            onClick={onCreate}
          >
            <span className="action-icon red-icon">
              <Crosshair size={20} />
            </span>
            <span className="action-index">OP-01</span>
            <strong>Створити кімнату</strong>
            <p>Збери команду та обери правила цієї операції.</p>
            <span className="action-link">
              СТВОРИТИ <ArrowRight size={14} />
            </span>
          </button>
          <button className="action-card" onClick={onJoin}>
            <span className="action-icon">
              <LockKeyhole size={19} />
            </span>
            <span className="action-index">OP-02</span>
            <strong>Приєднатися</strong>
            <p>Введи код кімнати, отриманий від друга.</p>
            <span className="action-link">
              ВВЕСТИ КОД <ArrowRight size={14} />
            </span>
          </button>
          <button className="action-card" onClick={onQuick}>
            <span className="action-icon">
              <Radio size={19} />
            </span>
            <span className="action-index">OP-03</span>
            <strong>Швидка гра</strong>
            <p>Знайди відкриту кімнату або створи нову.</p>
            <span className="action-link">
              ШУКАТИ ГРУ <ArrowRight size={14} />
            </span>
          </button>
        </div>
      </section>

      <section className="intel-strip">
        <div className="intel-cell">
          <span className="intel-symbol">
            <Users size={17} />
          </span>
          <div>
            <b>ДРУЗІ ПОРУЧ</b>
            <small>Грайте в одній кімнаті</small>
          </div>
        </div>
        <div className="intel-cell">
          <span className="intel-symbol">
            <Eye size={17} />
          </span>
          <div>
            <b>РОЛІ ПРИВАТНІ</b>
            <small>Ваше досьє бачите лише ви</small>
          </div>
        </div>
        <div className="intel-cell">
          <span className="intel-symbol">
            <MapPinned size={17} />
          </span>
          <div>
            <b>{locationCount}+ ЛОКАЦІЙ</b>
            <small>Жоден раунд не схожий</small>
          </div>
        </div>
      </section>
    </>
  );
}

function PageHeading({
  eyebrow,
  title,
  intro,
  onBack,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  onBack: () => void;
}) {
  return (
    <div className="page-heading">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={15} /> Назад
      </button>
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{intro}</p>
    </div>
  );
}

function JoinPage({
  roomCode,
  setRoomCode,
  onJoin,
  onJoinPublic,
  onBack,
  busy,
}: {
  roomCode: string;
  setRoomCode: (value: string) => void;
  onJoin: () => void;
  onJoinPublic: (code: string) => void;
  onBack: () => void;
  busy: boolean;
}) {
  const [publicRooms, setPublicRooms] = useState<
    Array<{ code: string; name: string; count: number; maxPlayers: number }>
  >([]);
  useEffect(() => {
    void gameApi
      .publicRooms()
      .then(result => setPublicRooms(result.rooms))
      .catch(() => setPublicRooms([]));
  }, []);
  return (
    <section className="page-panel narrow-panel">
      <PageHeading
        eyebrow="ПІДКЛЮЧЕННЯ ДО КОМАНДИ"
        title="Приєднатися до кімнати"
        intro="Введи шестизначний код доступу або обери відкриту кімнату."
        onBack={onBack}
      />
      <div className="panel-card join-card">
        <div className="join-code-box">
          <span className="eyebrow">КОД ДОСТУПУ</span>
          <input
            value={roomCode}
            onChange={event =>
              setRoomCode(
                event.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, 8)
              )
            }
            onKeyDown={event => event.key === "Enter" && onJoin()}
            placeholder="ВВЕДІТЬ КОД"
            maxLength={8}
          />
          <small>Код надає власник кімнати</small>
        </div>
        <button
          className="button button-primary button-full"
          onClick={onJoin}
          disabled={busy || roomCode.trim().length < 4}
        >
          <LockKeyhole size={16} />
          {busy ? "Підключаємо…" : "Приєднатися"}
        </button>
        <div className="or-divider">
          <span /> АБО <span />
        </div>
        <div className="section-heading compact-heading">
          <div>
            <span className="eyebrow">ВІДКРИТІ КІМНАТИ</span>
            <h2>Доступні зараз</h2>
          </div>
          <Radio size={16} />
        </div>
        {publicRooms.length ? (
          <div className="open-room-list">
            {publicRooms.map(item => (
              <button
                className="open-room-row"
                key={item.code}
                onClick={() => onJoinPublic(item.code)}
              >
                <span className="open-room-icon">
                  <Swords size={17} />
                </span>
                <span className="open-room-title">
                  <b>{item.name}</b>
                  <small>КОД {item.code}</small>
                </span>
                <span className="open-room-count">
                  {item.count}/{item.maxPlayers}
                  <Users size={13} />
                </span>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-public">
            <Radio size={19} />
            <span>Вільних відкритих кімнат поки немає.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function ProfilePage({
  profile,
  go,
  openEconomy,
}: {
  profile: Profile;
  go: (page: Page) => void;
  openEconomy: (tab?: EconomyTab) => void;
}) {
  const achievements: Record<string, { title: string; description: string }> = {
    "first-spy-win": {
      title: "Перший шпигун",
      description: "Перша перемога за шпигуна",
    },
    "master-of-disguise": {
      title: "Майстер маскування",
      description: "10 перемог за шпигуна",
    },
    detective: { title: "Детектив", description: "10 викритих шпигунів" },
    legend: { title: "Легенда", description: "100 перемог" },
    unstoppable: { title: "Невловимий", description: "5 перемог поспіль" },
  };
  const cosmetics = profile.equippedCosmetics || [];
  const frame = cosmetics.find(item => item.category === "avatar_frame");
  const nameColor = cosmetics.find(item => item.category === "name_color")
    ?.metadata.color;
  const title = cosmetics.find(item => item.category === "title");
  const theme = cosmetics.find(item => item.category === "profile_theme")
    ?.metadata.theme;
  const stamp = cosmetics.find(
    item => item.category === "other" && item.metadata.stamp === "classified"
  );
  const badges = cosmetics.filter(item => item.category === "badge");
  const frameColor =
    typeof frame?.metadata.color === "string"
      ? frame.metadata.color
      : undefined;
  const themeClass =
    theme === "night" || theme === "radar" ? `profile-theme-${theme}` : "";
  const titleText =
    typeof title?.metadata.text === "string"
      ? title.metadata.text
      : title?.name;
  return (
    <section className="page-panel">
      <PageHeading
        eyebrow="ДОСЬЄ АГЕНТА"
        title="Мій профіль"
        intro="Ваша статистика, перемоги та службові відзнаки."
        onBack={() => go("home")}
      />
      <div className="profile-layout">
        <div className={`profile-card ${themeClass}`}>
          <div className="profile-card-top">
            <span
              className="profile-avatar-large"
              style={
                frameColor
                  ? {
                      borderColor: frameColor,
                      boxShadow: `0 0 0 4px ${frameColor}33, 0 0 18px ${frameColor}66`,
                    }
                  : undefined
              }
            >
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" />
              ) : (
                profile.firstName.slice(0, 1)
              )}
            </span>
            <span className="rank-badge">
              <Crown size={13} /> РІВЕНЬ {profile.level || 1}
            </span>
          </div>
          <h2
            style={
              typeof nameColor === "string" ? { color: nameColor } : undefined
            }
          >
            {[profile.firstName, profile.lastName].filter(Boolean).join(" ")}
            {profile.vip && <span title="VIP"> 👑</span>}
          </h2>
          <p>
            {profile.username
              ? `@${profile.username}`
              : "Агент оперативної групи"}
          </p>
          <div className="profile-id">ID · {profile.telegramId || "—"}</div>
          <div className="profile-cosmetics-preview">
            <span className="eyebrow">ОБРАНИЙ СТИЛЬ</span>
            <div className="profile-cosmetic-chips">
              {titleText && (
                <span className="profile-cosmetic-chip title-chip">
                  <Crown size={12} />
                  {titleText}
                </span>
              )}
              {badges.map(item => {
                const BadgeIcon =
                  item.metadata.icon === "eye"
                    ? Eye
                    : item.metadata.icon === "crosshair"
                      ? Crosshair
                      : Shield;
                const color =
                  typeof item.metadata.color === "string"
                    ? item.metadata.color
                    : undefined;
                return (
                  <span
                    className="profile-cosmetic-chip"
                    key={item.itemId}
                    style={
                      color ? { borderColor: `${color}66`, color } : undefined
                    }
                  >
                    <BadgeIcon size={12} />
                    {item.name}
                  </span>
                );
              })}
              {frame && (
                <span className="profile-cosmetic-chip">
                  <Sparkles size={12} />
                  Рамка: {frame.name}
                </span>
              )}
              {typeof nameColor === "string" && (
                <span className="profile-cosmetic-chip">
                  <Sparkles size={12} />
                  Колір імені
                </span>
              )}
              {theme && (
                <span className="profile-cosmetic-chip">
                  <Sparkles size={12} />
                  Тема: {theme === "radar" ? "Радар" : "Ніч"}
                </span>
              )}
              {stamp && (
                <span className="profile-classified-stamp">ТАЄМНО</span>
              )}
              {!cosmetics.length && (
                <button
                  className="profile-cosmetic-link"
                  onClick={() => openEconomy("shop")}
                >
                  Відкрити магазин косметики <ArrowRight size={12} />
                </button>
              )}
            </div>
          </div>
          <div className="xp-label">
            <span>Досвід</span>
            <b>{profile.xp} XP</b>
          </div>
          <div className="xp-track">
            <i
              style={{ width: `${Math.min(100, (profile.xp % 250) / 2.5)}%` }}
            />
          </div>
          <small className="xp-next">
            До рівня {(profile.level || 1) + 1} — {250 - (profile.xp % 250)} XP
          </small>
        </div>
        <div className="profile-stat-grid">
          <StatCard
            label="ПАРТІЙ"
            value={profile.gamesPlayed}
            icon={<Gamepad2 size={17} />}
          />
          <StatCard
            label="ПЕРЕМОГ"
            value={profile.wins}
            icon={<Trophy size={17} />}
          />
          <StatCard
            label="ВІДСОТОК ПЕРЕМОГ"
            value={`${profile.winRate || 0}%`}
            icon={<Target size={17} />}
          />
          <StatCard
            label="РЕЙТИНГ"
            value={profile.rating}
            icon={<Crosshair size={17} />}
          />
          <StatCard
            label="ШПИГУНОМ"
            value={profile.spyWins}
            icon={<Eye size={17} />}
          />
          <StatCard
            label="АГЕНТОМ"
            value={profile.civilianWins}
            icon={<Shield size={17} />}
          />
        </div>
      </div>
      <div className="section-heading profile-ach-heading">
        <div>
          <span className="eyebrow">СЛУЖБОВІ ВІДЗНАКИ</span>
          <h2>Досягнення</h2>
        </div>
        <span className="count-chip">
          {profile.achievements?.length || 0} / 5
        </span>
      </div>
      <div className="achievement-grid">
        {Object.entries(achievements).map(([id, award]) => {
          const earned = profile.achievements?.includes(id);
          return (
            <div
              className={`achievement-card ${earned ? "earned" : "locked"}`}
              key={id}
            >
              <span className="achievement-icon">
                <Award size={19} />
              </span>
              <div>
                <b>{award.title}</b>
                <small>{award.description}</small>
              </div>
              {earned ? (
                <Check size={16} className="earned-check" />
              ) : (
                <LockKeyhole size={14} />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="stat-card">
      <span className="stat-icon">{icon}</span>
      <span className="eyebrow">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RulesPage() {
  const steps = [
    {
      number: "01",
      title: "Отримайте роль",
      text: "Агенти приватно знають локацію або слово. Шпигун отримує роль із позначкою 🕵️‍♂️; агент — 🕴️. Категорія не оголошується в групі до фіналу.",
    },
    {
      number: "02",
      title: "Ставте питання",
      text: "По черзі запитуйте інших про локацію або натякайте на слово. Говоріть досить конкретно, але не надто — шпигун слухає.",
    },
    {
      number: "03",
      title: "Оберіть підозрюваного",
      text: "Будь-який учасник може почати голосування. Бот залишає один список і редагує його після кожного голосу; окремо пише, хто за кого проголосував. Прийом голосів триває повні 60 секунд.",
    },
    {
      number: "04",
      title: "Вирішіть долю",
      text: "Те саме повідомлення переходить до голосування 👍 за страту або 👎 за помилування. Друга фаза теж триває повні 60 секунд і завершується автоматично; більшість не закриває її достроково. Для страти потрібна сувора більшість активних гравців; вибулі не голосують і не діють. Без більшості підозрюваний залишається в грі, а якщо час раунду сплив — перемагають шпигуни.",
    },
    {
      number: "05",
      title: "Завершення партії",
      text: "Страта шпигуна одразу завершує гру перемогою агентів — без останнього здогаду. Страчений агент вибуває; гра триває до одного активного агента й одного шпигуна, коли перемагає шпигун. Наприкінці бот один раз оголошує результат і розкриває секрет та ролі. Кожен переможець групової гри отримує 10 🪙.",
    },
  ];
  return (
    <section className="page-panel narrow-panel">
      <PageHeading
        eyebrow="ПОЛЬОВИЙ ПОСІБНИК"
        title="Правила гри"
        intro="Усе, що потрібно знати перед першою операцією."
        onBack={() => window.location.assign("/")}
      />
      <div className="rules-intro">
        <span className="rules-symbol">
          <CircleHelp size={24} />
        </span>
        <div>
          <b>Серед вас один або кілька шпигунів.</b>
          <p>
            Звичайні гравці знають, де перебувають. Шпигун — ні. Знайдіть його
            раніше, ніж він вас.
          </p>
        </div>
      </div>
      <div className="rules-list">
        {steps.map(step => (
          <div className="rule-step" key={step.number}>
            <span className="rule-number">{step.number}</span>
            <div>
              <b>{step.title}</b>
              <p>{step.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="rules-note">
        <LockKeyhole size={16} />
        <span>
          <b>Бережіть досьє.</b> Роль і локація показуються лише вам. Не
          показуйте екран сусідам.
        </span>
      </div>
    </section>
  );
}

function SettingsPage({
  soundOn,
  toggleSound,
  preview,
  onSwitchAgent,
}: {
  soundOn: boolean;
  toggleSound: () => void;
  preview: boolean;
  onSwitchAgent: () => void;
}) {
  return (
    <section className="page-panel narrow-panel">
      <PageHeading
        eyebrow="НАЛАШТУВАННЯ КАНАЛУ"
        title="Налаштування"
        intro="Керування звуком і сеансом гри."
        onBack={() => window.location.assign("/")}
      />
      <div className="panel-card settings-page-card">
        <div className="toggle-field">
          <span className="setting-leading">
            <span className="setting-icon">
              <Volume2 size={17} />
            </span>
            <span>
              <b>Звукові ефекти</b>
              <small>Короткі сигнали інтерфейсу</small>
            </span>
          </span>
          <button
            className={`switch ${soundOn ? "on" : ""}`}
            onClick={toggleSound}
            aria-pressed={soundOn}
          >
            <i />
          </button>
        </div>
        <div className="settings-divider" />
        <div className="toggle-field">
          <span className="setting-leading">
            <span className="setting-icon">
              <Bell size={17} />
            </span>
            <span>
              <b>Сповіщення від бота</b>
              <small>Після налаштування BotFather і запуску /start</small>
            </span>
          </span>
          <span className="setting-tag">TELEGRAM</span>
        </div>
        {preview && (
          <>
            <div className="settings-divider" />
            <div className="toggle-field">
              <span className="setting-leading">
                <span className="setting-icon">
                  <Users size={17} />
                </span>
                <span>
                  <b>Тестова ідентичність</b>
                  <small>Змінити агента в цій вкладці</small>
                </span>
              </span>
              <button
                className="button button-outline button-small"
                onClick={onSwitchAgent}
              >
                Змінити
              </button>
            </div>
          </>
        )}
        <div className="settings-divider" />
        <div className="settings-privacy">
          <ShieldCheck size={17} />
          <span>
            <b>Захист даних</b>
            <small>
              Telegram initData перевіряється на сервері. Токен бота не
              надсилається у браузер.
            </small>
          </span>
        </div>
      </div>
    </section>
  );
}

function AdminPage() {
  const [overview, setOverview] = useState<{
    users: number;
    activeRooms: number;
    gamesPlayed: number;
    latestGames: Array<{
      roomName: string;
      winner: string;
      location: string;
      participants: number;
      createdAt: string;
    }>;
  } | null>(null);
  const [locations, setLocations] = useState<
    Array<{ id: number; name: string; category: string; active: boolean }>
  >([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [section, setSection] = useState<"overview" | "locations">("overview");
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    try {
      const [overviewData, locationData] = await Promise.all([
        gameApi.admin<typeof overview>("/overview"),
        gameApi.admin<{ locations: typeof locations; categories: string[] }>(
          "/locations"
        ),
      ]);
      setOverview(overviewData);
      setLocations(locationData.locations);
      setCategories(locationData.categories);
      setCategory(current => current || locationData.categories[0] || "");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Не вдалося завантажити панель."
      );
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  const addLocation = async () => {
    try {
      await gameApi.admin("/locations", {
        method: "POST",
        body: JSON.stringify({ name, category }),
      });
      setName("");
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Помилка збереження.");
    }
  };
  const toggleLocation = async (id: number, active: boolean) => {
    await gameApi.admin(`/locations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ active: !active }),
    });
    await reload();
  };
  return (
    <section className="page-panel">
      <div className="page-heading">
        <span className="eyebrow">ЗАКРИТИЙ РОЗДІЛ</span>
        <h1>Адмін-панель</h1>
        <p>Статистика, історія партій і керування базою локацій.</p>
      </div>
      {error && (
        <div className="inline-error">
          {error}
          <button onClick={() => setError("")}>
            <X size={14} />
          </button>
        </div>
      )}
      <div className="admin-tabs">
        <button
          className={section === "overview" ? "selected" : ""}
          onClick={() => setSection("overview")}
        >
          Огляд
        </button>
        <button
          className={section === "locations" ? "selected" : ""}
          onClick={() => setSection("locations")}
        >
          Локації · {locations.length}
        </button>
      </div>
      {section === "overview" ? (
        <>
          <div className="admin-stat-grid">
            <StatCard
              label="ЗАРЕЄСТРОВАНО"
              value={overview?.users ?? "—"}
              icon={<Users size={17} />}
            />
            <StatCard
              label="АКТИВНІ КІМНАТИ"
              value={overview?.activeRooms ?? "—"}
              icon={<Radio size={17} />}
            />
            <StatCard
              label="ЗАВЕРШЕНО ПАРТІЙ"
              value={overview?.gamesPlayed ?? "—"}
              icon={<Trophy size={17} />}
            />
          </div>
          <div className="panel-card admin-history">
            <span className="eyebrow">ОСТАННІ ОПЕРАЦІЇ</span>
            {overview?.latestGames?.length ? (
              overview.latestGames.map((game, index) => (
                <div className="history-row" key={`${game.roomName}-${index}`}>
                  <span className="history-index">0{index + 1}</span>
                  <b>{game.roomName}</b>
                  <span>{game.participants} гравців</span>
                  <span>{game.location}</span>
                  <small>
                    {game.winner === "spies" ? "Шпигуни" : "Агенти"}
                  </small>
                </div>
              ))
            ) : (
              <p className="empty-note">
                Історія завершених партій з'явиться тут.
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="panel-card location-admin">
            <span className="eyebrow">ДОДАТИ ЛОКАЦІЮ</span>
            <div className="location-add-form">
              <input
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder="Назва локації"
              />
              <select
                value={category}
                onChange={event => setCategory(event.target.value)}
              >
                {categories.map(item => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <button
                className="button button-primary"
                disabled={!name.trim()}
                onClick={() => void addLocation()}
              >
                Додати
              </button>
            </div>
            <div className="location-admin-list">
              {locations.map(location => (
                <div
                  className={`location-admin-row ${location.active ? "" : "inactive"}`}
                  key={location.id}
                >
                  <MapPinned size={15} />
                  <span>
                    <b>{location.name}</b>
                    <small>{location.category}</small>
                  </span>
                  <button
                    className={`switch ${location.active ? "on" : ""}`}
                    onClick={() =>
                      void toggleLocation(location.id, location.active)
                    }
                    aria-label="Змінити активність"
                  >
                    <i />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
