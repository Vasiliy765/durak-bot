import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronDown, Clock3, Copy, Crown, Eye, EyeOff, Flag, LockKeyhole, MapPin, MessageSquareText, Pencil, Send, ShieldAlert, Sparkles, Trash2, Users, Vote, X } from "lucide-react";
import { gameApi, type GameRoom, type Player, type RoomSettings } from "@/lib/gameApi";
import { haptic, playUiSound } from "@/lib/telegram";

type Props = {
  room: GameRoom;
  me: { telegramId: string; firstName: string };
  categories: string[];
  preview: boolean;
  onRoom: (room: GameRoom) => void;
  onBack: () => void;
};

const durations = [5, 7, 10, 15];

export default function GameRoomScreen({ room, me, categories, preview, onRoom, onBack }: Props) {
  const [seconds, setSeconds] = useState(0);
  const [showSecret, setShowSecret] = useState(false);
  const [targetId, setTargetId] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [chatText, setChatText] = useState("");
  const [guess, setGuess] = useState("");
  const [locations, setLocations] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [editSettings, setEditSettings] = useState<RoomSettings>(room.settings);
  const [copied, setCopied] = useState(false);
  const [copiedCodeOnly, setCopiedCodeOnly] = useState(false);

  useEffect(() => {
    setEditSettings(room.settings);
  }, [room.settings]);

  useEffect(() => {
    if (room.messages?.length) chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [room.messages?.length]);

  useEffect(() => {
    const tick = () => {
      const deadline = room.status === "voting" ? room.votingEndsAt : room.roundEndsAt;
      setSeconds(deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : 0);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [room.roundEndsAt, room.votingEndsAt, room.status]);

  useEffect(() => {
    if (room.status === "spy_guess") gameApi.locations(room.settings.mode).then(result => setLocations(result.locations)).catch(() => setLocations([]));
  }, [room.status, room.settings.mode]);

  const isOwner = room.ownerId === me.telegramId;
  const myRole = room.yourRole;
  const activePlayer = room.players.find(player => player.id === room.activePlayerId);
  const isMyTurn = room.activePlayerId === me.telegramId;
  const pendingQuestion = room.questions?.find(question => question.to === me.telegramId && !question.answer);
  const isGuesser = room.status === "spy_guess" && myRole === "spy" && room.spyGuessTargetId === me.telegramId;
  const roleLabel = myRole === "spy" ? "ՇՊԻՈՒՆ" : myRole === "civilian" ? "АГЕНТ" : "АГЕНТ";
  const timerLabel = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const readyCount = room.players.filter(player => player.ready).length;

  const run = async (action: () => Promise<{ room?: GameRoom } | { success: boolean }>) => {
    setError("");
    setWorking(true);
    try {
      const result = await action();
      if ("room" in result && result.room) onRoom(result.room);
      haptic("medium");
      playUiSound();
      return result;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не вдалося виконати дію.");
      return undefined;
    } finally {
      setWorking(false);
    }
  };

  const copyInvite = async () => {
    try {
      const { inviteLink } = await gameApi.invite(room.code);
      await navigator.clipboard.writeText(inviteLink || room.code);
      setCopiedCodeOnly(!inviteLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(`Код запрошення: ${room.code}`);
    }
  };

  const availableTargets = useMemo(() => room.players.filter(player => player.id !== me.telegramId), [room.players, me.telegramId]);

  const submitQuestion = () => {
    if (!targetId || !questionText.trim()) return;
    void run(async () => {
      const result = await gameApi.ask(room.code, targetId, questionText.trim());
      setQuestionText("");
      return result;
    });
  };

  const submitAnswer = (questionId: string) => {
    if (!answerText.trim()) return;
    void run(async () => {
      const result = await gameApi.answer(room.code, questionId, answerText.trim());
      setAnswerText("");
      return result;
    });
  };

  const submitChat = () => {
    if (!chatText.trim()) return;
    void run(async () => {
      const result = await gameApi.sendMessage(room.code, chatText.trim());
      setChatText("");
      return result;
    });
  };

  const saveSettings = () => void run(async () => {
    const result = await gameApi.updateSettings(room.code, editSettings);
    setEditing(false);
    return result;
  });

  return (
    <div className="room-screen">
      <header className="room-topbar">
        <button className="icon-button" onClick={onBack} aria-label="Повернутися"><ArrowLeft size={19} /></button>
        <div className="room-topbar-title"><span className="eyebrow">ОПЕРАТИВНЕ ДІЛО · {room.code}</span><strong>{room.name}</strong></div>
        <button className="icon-button" onClick={copyInvite} aria-label="Копіювати запрошення"><Copy size={17} /></button>
      </header>

      <section className={`room-hero phase-${room.status}`}>
        <div className="hero-map-wash" />
        <div className="hero-status"><span className="live-dot" />{room.status === "lobby" ? "ЛОБІ · НАБІР АГЕНТІВ" : room.status === "voting" ? "АКТИВНЕ ГОЛОСУВАННЯ" : room.status === "spy_guess" ? "ОСТАННІЙ ШАНС ШПИГУНА" : room.status === "finished" ? "ОПЕРАЦІЮ ЗАВЕРШЕНО" : "ОПЕРАЦІЯ АКТИВНА"}</div>
        <div className="hero-main"><div><span className="eyebrow muted">КОД ДОСТУПУ</span><div className="room-code">{room.code}</div></div><div className="hero-stamp">ТАЄМНО<br /><small>DOSSIER 0{room.code.slice(-2)}</small></div></div>
        <div className="hero-foot"><span><Users size={14} /> {room.players.length}/{room.settings.maxPlayers} агентів</span><span><LockKeyhole size={13} /> {room.settings.isPrivate ? "Приватна" : "Відкрита"}</span><span><Clock3 size={14} /> {room.settings.durationMinutes} хв</span></div>
      </section>
      {copied && <div className="inline-success"><Check size={14} />{copiedCodeOnly ? `Код ${room.code} скопійовано. Telegram-посилання запрацює після налаштування імені бота.` : "Telegram-посилання скопійовано. Поділіться з друзями."}</div>}
      {preview && <div className="preview-ribbon"><Sparkles size={14} /> Попередній перегляд · тестовий агент</div>}
      {error && <div className="inline-error"><ShieldAlert size={15} />{error}<button onClick={() => setError("")} aria-label="Закрити"><X size={14} /></button></div>}

      {room.status === "lobby" && (
        <>
          <section className="room-section">
            <div className="section-heading"><div><span className="eyebrow">БРИФІНГ</span><h2>Команда операції</h2></div><span className="count-chip">{readyCount}/{room.players.length} готові</span></div>
            <div className="player-list">
              {room.players.map((player, index) => <PlayerRow key={player.id} player={player} owner={player.id === room.ownerId} me={player.id === me.telegramId} canRemove={isOwner && player.id !== room.ownerId} onRemove={() => void run(() => gameApi.removePlayer(room.code, player.id))} index={index} />)}
              {room.players.length < room.settings.maxPlayers && <div className="waiting-slot"><span className="plus-mark">+</span><span>Чекаємо на агента</span><span className="slot-tag">ВІЛЬНО</span></div>}
            </div>
            <div className="room-actions">
              {!isOwner && <button className={`button ${room.players.find(player => player.id === me.telegramId)?.ready ? "button-quiet" : "button-primary"}`} disabled={working} onClick={() => void run(() => gameApi.ready(room.code, !room.players.find(player => player.id === me.telegramId)?.ready))}>{room.players.find(player => player.id === me.telegramId)?.ready ? "Змінити готовність" : "Я готовий"}</button>}
              {isOwner && <button className="button button-quiet" onClick={() => setEditing(true)}><Pencil size={16} /> Налаштувати</button>}
              {isOwner && <button className="button button-primary" disabled={working || room.players.length < 3 || readyCount !== room.players.length} onClick={() => void run(() => gameApi.start(room.code))}><Flag size={16} /> Почати гру</button>}
            </div>
            {isOwner && (room.players.length < 3 || readyCount !== room.players.length) && <p className="hint-line">{room.players.length < 3 ? "Потрібно щонайменше троє гравців." : "Дочекайтеся, поки вся команда позначить готовність."}</p>}
            <div className="invite-row"><div><span className="eyebrow">ПРИЄДНАННЯ</span><p>Надішліть код або посилання друзям</p></div><button className="button button-outline" onClick={copyInvite}><Copy size={15} />{copied ? "Скопійовано" : "Запросити"}</button></div>
          </section>
        </>
      )}

      {(room.status === "playing" || room.status === "voting" || room.status === "spy_guess") && (
        <>
          <section className="mission-strip">
            <div><span className="eyebrow">{room.status === "voting" ? "ДО ЗАВЕРШЕННЯ ГОЛОСУВАННЯ" : "ЧАС ДО КІНЦЯ РАУНДУ"}</span><strong className={seconds < 60 ? "timer-urgent" : ""}>{timerLabel}</strong></div>
            <div className="mission-active"><span className="pulse-ring"><span /></span><div><span className="eyebrow">АКТИВНИЙ ГРАВЕЦЬ</span><b>{activePlayer?.firstName || "Команда"}</b></div></div>
          </section>

          <section className={`secret-card ${showSecret ? "secret-open" : ""}`}>
            <div className="secret-card-top"><span><LockKeyhole size={14} /> ОСОБИСТЕ ДОСЬЄ</span><span>ДОСТУП: ТІЛЬКИ ВАМ</span></div>
            {showSecret ? <div className="secret-reveal">
              {myRole === "spy" ? <><div className="role-illustration spy-mark">?</div><span className="eyebrow danger-text">ПРОТОКОЛ ШПИГУНА</span><h2>ТИ ШПИГУН</h2><p>Слухай уважно. Відповідай обережно. З'ясуй, що команда має на увазі.</p></> : <><div className="role-illustration"><MapPin size={27} /></div><span className="eyebrow">{room.settings.mode === "secret_word" ? "СЕКРЕТНЕ СЛОВО" : "СЕКРЕТНА ЛОКАЦІЯ"}</span><h2>{room.location || "Досьє недоступне"}</h2><p>{room.settings.mode === "secret_word" ? "Не вимовляйте слово прямо — шпигун слухає." : room.categories?.[0] ? `Категорія: ${room.categories[0]}` : "Не розкривайте локацію прямо."}</p></>}
              <button className="link-button" onClick={() => setShowSecret(false)}><EyeOff size={14} /> Закрити досьє</button>
            </div> : <button className="secret-cover" onClick={() => { setShowSecret(true); haptic(); playUiSound(); }}><span className="cover-seal"><Eye size={20} /></span><strong>Відкрити особисте досьє</strong><span>Переконайтеся, що поруч ніхто не підглядає</span><ChevronDown size={17} className="cover-chevron" /></button>}
          </section>

          {room.status === "playing" && <section className="room-section compact-section">
            <div className="section-heading"><div><span className="eyebrow">ЗВ'ЯЗОК</span><h2>Питання та відповіді</h2></div><span className="count-chip">{room.questions?.length || 0} повідомлень</span></div>
            <div className="question-thread">
              {!room.questions?.length && <div className="empty-note"><MessageSquareText size={19} /><span>Тут з'явиться історія розмови. Ставте питання уважно.</span></div>}
              {room.questions?.map(question => <div className={`question-card ${question.from === me.telegramId ? "question-own" : ""}`} key={question.id}>
                <div className="question-author"><span className="avatar avatar-small">{question.fromName.slice(0, 1)}</span><b>{question.fromName}</b><span>→</span><b>{question.toName}</b><time>{new Date(question.createdAt).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}</time></div>
                <p>{question.text}</p>
                {question.answer ? <div className="answer-line"><span>ВІДПОВІДЬ</span>{question.answer}</div> : question.to === me.telegramId && <div className="answer-form"><input value={answerText} onChange={event => setAnswerText(event.target.value)} placeholder="Ваша відповідь…" maxLength={280} /><button className="send-button" disabled={working || !answerText.trim()} onClick={() => submitAnswer(question.id)} aria-label="Надіслати відповідь"><Send size={15} /></button></div>}
              </div>)}
            </div>
            <div className="ask-compose">
              {isMyTurn ? <><select value={targetId} onChange={event => setTargetId(event.target.value)} aria-label="Кому поставити запитання"><option value="">Оберіть гравця…</option>{availableTargets.map(player => <option key={player.id} value={player.id}>{player.firstName}</option>)}</select><input value={questionText} onChange={event => setQuestionText(event.target.value)} onKeyDown={event => event.key === "Enter" && submitQuestion()} placeholder="Поставте запитання…" maxLength={280} /><button className="send-button" disabled={working || !questionText.trim() || !targetId} onClick={submitQuestion} aria-label="Надіслати запитання"><Send size={16} /></button></> : <div className="turn-note"><Clock3 size={15} />Хід гравця {activePlayer?.firstName || "…"}. Після його питання ваша черга прийде.</div>}
            </div>
            <button className="button button-danger button-full" disabled={working} onClick={() => void run(() => gameApi.startVote(room.code))}><Vote size={16} /> Ініціювати голосування</button>
          </section>}

          {room.status === "voting" && <section className="room-section vote-panel">
            <div className="section-heading"><div><span className="eyebrow danger-text">ПРОТОКОЛ ПЕРЕВІРКИ</span><h2>Хто шпигун?</h2></div><span className="count-chip">{room.votesCast || 0}/{room.players.length} голосів</span></div>
            <p className="section-copy">Оберіть одного підозрюваного. Свій голос змінити не можна.</p>
            <div className="vote-list">{room.players.filter(player => player.id !== me.telegramId).map(player => <button className={`vote-player ${room.yourVote === player.id ? "selected" : ""}`} key={player.id} disabled={Boolean(room.youVoted) || working} onClick={() => void run(() => gameApi.castVote(room.code, player.id))}><span className="avatar">{player.firstName.slice(0, 1)}</span><span><b>{player.firstName}</b><small>{player.username ? `@${player.username}` : "Учасник операції"}</small></span><span className="vote-radio">{room.yourVote === player.id && <Check size={14} />}</span></button>)}</div>
            {room.youVoted && <div className="inline-success"><Check size={14} /> Ваш голос зафіксовано. Очікуємо на команду.</div>}
            <button className="button button-quiet button-full" onClick={() => void run(async () => { await gameApi.leave(room.code); return { success: true }; }).then(onBack)}>Вийти з кімнати</button>
          </section>}

          {room.status === "spy_guess" && <section className="room-section guess-panel">
            <div className="guess-emblem"><MapPin size={26} /></div><span className="eyebrow danger-text">ОСТАННІЙ ШАНС</span><h2>Шпигуна викрито</h2><p>Команда підозрює: <strong>{room.suspectedName || "агента"}</strong>. Шпигун може назвати локацію, щоб перехопити перемогу.</p>
            {isGuesser ? <div className="guess-form"><label htmlFor="location-guess">{room.settings.mode === "secret_word" ? "Ваше слово" : "Ваша версія локації"}</label><select id="location-guess" value={guess} onChange={event => setGuess(event.target.value)}><option value="">Оберіть варіант…</option>{locations.map(location => <option key={location} value={location}>{location}</option>)}</select><button className="button button-primary button-full" disabled={!guess || working} onClick={() => void run(() => gameApi.guess(room.code, guess))}>Підтвердити здогад</button></div> : <div className="waiting-note"><span className="live-dot" />Очікуємо на здогад шпигуна…</div>}
          </section>}
        </>
      )}

      {room.status !== "finished" && <section className="room-section team-chat-section">
        <div className="section-heading"><div><span className="eyebrow">ЗВ'ЯЗОК КОМАНДИ</span><h2>Загальний чат</h2></div><span className="count-chip">{room.messages?.length || 0} / 200</span></div>
        <div className="team-chat-thread" aria-live="polite">
          {room.messages?.length ? room.messages.map(message => <article className={`team-message ${message.from === me.telegramId ? "team-message-own" : ""}`} key={message.id}>
            <header><b>{message.from === me.telegramId ? "Ви" : message.fromName}</b><time>{new Date(message.createdAt).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}</time></header>
            <p>{message.text}</p>
          </article>) : <div className="empty-note"><MessageSquareText size={18} /><span>Почніть розмову з командою. Повідомлення бачать лише учасники кімнати.</span></div>}
          <div className="team-chat-end" ref={chatEndRef} />
        </div>
        <form className="team-chat-compose" onSubmit={event => { event.preventDefault(); submitChat(); }}>
          <input value={chatText} onChange={event => setChatText(event.target.value)} placeholder="Повідомлення команді…" maxLength={280} aria-label="Повідомлення команді" />
          <button className="send-button" type="submit" disabled={working || !chatText.trim()} aria-label="Надіслати повідомлення"><Send size={16} /></button>
        </form>
      </section>}

      {room.status === "finished" && room.result && <section className={`result-card ${room.result.winner === "spies" ? "result-spy" : "result-agents"}`}>
        <div className="result-seal"><Flag size={22} /></div><span className="eyebrow">ПІДСУМОК ОПЕРАЦІЇ</span><h2>{room.result.winner === "spies" ? "Шпигунська мережа перемогла" : "Агенти викрили шпигуна"}</h2><p>{room.result.message}</p><div className="result-location"><span>{room.settings.mode === "secret_word" ? "СЕКРЕТНЕ СЛОВО" : "СЕКРЕТНА ЛОКАЦІЯ"}</span><strong>{room.result.location}</strong></div><p className="result-reason">{room.result.reason}</p><div className="result-roster">{room.result.participants.map(player => <span className={`role-chip ${player.role}`} key={player.id}>{player.firstName}{player.vip && " 👑"} · {player.role === "spy" ? "шпигун" : "агент"}</span>)}</div><button className="button button-primary button-full" onClick={onBack}><ArrowLeft size={16} /> До головного меню</button>
      </section>}

      <footer className="room-footer"><span>ШПИГУН · ОПЕРАЦІЯ {room.code}</span><span>ЗАХИЩЕНИЙ КАНАЛ</span></footer>

      {editing && <div className="modal-backdrop" role="presentation" onClick={() => setEditing(false)}><section className="modal-card" role="dialog" aria-modal="true" aria-label="Налаштування кімнати" onClick={event => event.stopPropagation()}><header className="modal-header"><div><span className="eyebrow">КЕРУВАННЯ ОПЕРАЦІЄЮ</span><h2>Налаштування кімнати</h2></div><button className="icon-button" onClick={() => setEditing(false)}><X size={18} /></button></header><RoomSettingsForm settings={editSettings} categories={categories} onChange={setEditSettings} /><div className="modal-actions"><button className="button button-quiet" onClick={() => setEditing(false)}>Скасувати</button><button className="button button-primary" disabled={working} onClick={saveSettings}>Зберегти</button></div></section></div>}
    </div>
  );
}

function PlayerRow({ player, owner, me, canRemove, onRemove, index }: { player: Player; owner: boolean; me: boolean; canRemove: boolean; onRemove: () => void; index: number }) {
  const initials = player.firstName.slice(0, 1) + (player.lastName?.slice(0, 1) || "");
  return <div className="player-row" style={{ animationDelay: `${index * 45}ms` }}><span className={`avatar ${owner ? "avatar-owner" : ""}`}>{player.avatarUrl ? <img src={player.avatarUrl} alt="" /> : initials}<i className={`online-dot ${player.online ? "is-online" : ""}`} /></span><div className="player-name"><strong>{player.firstName}{player.vip && " 👑"}{me ? " (ви)" : ""}</strong><small>{player.username ? `@${player.username}` : owner ? "Керівник операції" : "Агент команди"}</small></div>{owner && <span className="owner-chip"><Crown size={12} /> ВЛАСНИК</span>}<span className={`ready-chip ${player.ready ? "ready" : ""}`}>{player.ready ? <><Check size={12} /> ГОТОВИЙ</> : "ОЧІКУЄ"}</span>{canRemove && <button className="remove-player" onClick={onRemove} aria-label="Видалити гравця"><Trash2 size={14} /></button>}</div>;
}

export function RoomSettingsForm({ settings, categories, onChange }: { settings: RoomSettings; categories: string[]; onChange: (next: RoomSettings) => void }) {
  const update = (key: keyof RoomSettings, value: RoomSettings[keyof RoomSettings]) => onChange({ ...settings, [key]: value });
  return <div className="settings-form">
    <label className="field-label">Назва кімнати<input value={settings.name} onChange={event => update("name", event.target.value)} maxLength={100} /></label>
    <div className="field-grid"><label className="field-label">Кількість гравців<select value={settings.maxPlayers} onChange={event => update("maxPlayers", Number(event.target.value))}>{[3,4,5,6,7,8,9,10,11,12].map(number => <option key={number} value={number}>{number} гравців</option>)}</select></label><label className="field-label">Шпигунів<select value={settings.spyCount} onChange={event => update("spyCount", Number(event.target.value))}>{[1,2,3].map(number => <option key={number} value={number}>{number}</option>)}</select><small className="field-hint">Оберіть 2 чи 3 для подвійного шпигуна.</small></label></div>
    <div className="field-grid"><label className="field-label">Режим<select value={settings.mode} onChange={event => update("mode", event.target.value)}><option value="spyfall">Шпигун · локація</option><option value="secret_word">Таємне слово</option></select></label><label className="field-label">Тривалість раунду<select value={settings.durationMinutes} onChange={event => update("durationMinutes", Number(event.target.value))}>{durations.map(number => <option key={number} value={number}>{number} хвилин</option>)}</select></label></div>
    <div className="field-grid"><label className="field-label" style={{ gridColumn: "1 / -1" }}>Тип кімнати<select value={settings.isPrivate ? "private" : "public"} onChange={event => update("isPrivate", event.target.value === "private")}><option value="private">Приватна · лише за запрошенням</option><option value="public">Відкрита · доступна пошуку</option></select></label></div>
    <label className="toggle-field"><span><b>Повторне приєднання</b><small>Дозволити повернутися після відключення</small></span><input type="checkbox" checked={settings.allowRejoin} onChange={event => update("allowRejoin", event.target.checked)} /></label>
    <div className="field-label">Категорії локацій<div className="category-picker">{categories.map(category => <button type="button" className={`category-chip ${settings.categories.includes(category) ? "chosen" : ""}`} key={category} onClick={() => update("categories", settings.categories.includes(category) ? settings.categories.filter(item => item !== category) : [...settings.categories, category])}>{category}</button>)}</div><small className="field-hint">Якщо нічого не обрати — використовуватимуться всі категорії.</small></div>
  </div>;
}
