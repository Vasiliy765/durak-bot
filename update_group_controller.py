from pathlib import Path
p=Path('/home/ubuntu/spyfallua/server/game/groupGame.ts')
s=p.read_text()
def rep(old,new,n=1):
    global s
    c=s.count(old)
    if c!=n: raise SystemExit(f'Expected {n}, found {c}: {old[:100]!r}')
    s=s.replace(old,new,n)
def block(start,end,new):
    global s
    a=s.index(start); b=s.index(end,a)
    s=s[:a]+new+s[b:]

rep('  guessGroupSecret,\n','')
rep('  isGroupPlayer,\n','  activeGroupPlayers,\n  finishGroupRound,\n  isActiveGroupPlayer,\n  isGroupPlayer,\n')
rep('    votes: state.votes || {},\n','    votes: state.votes || {},\n    eliminatedPlayerIds: state.eliminatedPlayerIds || [],\n')
rep('      status: next.status,\n      state: next,\n','      status: next.status,\n      hostId: next.hostId,\n      state: next,\n')
rep('  await assertGroupAdmin(chatId, actor.id);\n  await assertBotPermissions(chatId, chat.type);','  if (actor.is_bot) throw new Error("Створити гру може лише учасник чату.");\n  await assertBotPermissions(chatId, chat.type);')
rep('Після набору щонайменше 3 гравців будь-який учасник лобі може розпочати гру кнопкою або командою /startgame.','Після набору щонайменше 3 гравців будь-який учасник чату може розпочати гру кнопкою або командою /startgame.')
block('function voteMarkup(state: GroupGameState): TelegramMarkup {','function executionVoteMarkup(state: GroupGameState): TelegramMarkup {','function voteMarkup(state: GroupGameState): TelegramMarkup {\n  const players = activeGroupPlayers(state);\n  const rows: TelegramButton[][] = [];\n  for (let index = 0; index < players.length; index += 2) {\n    rows.push(players.slice(index, index + 2).map(player => ({ text: displayName(player).slice(0, 60), callback_data: `g:v:${state.roundId}:${player.id}` })));\n  }\n  return { inline_keyboard: rows };\n}\n\n')
rep('  const active = state.players.find(player => player.id === state.activeAskerId);','  if (!isActiveGroupPlayer(state, state.activeAskerId)) return;\n  const active = state.players.find(player => player.id === state.activeAskerId);')
rep('return `⚖️ Стратити підозрюваного ${displayName(accused)}?\\n👍 За страту: ${yes}/${state.players.length} · 👎 Проти: ${no}/${state.players.length}. Для страти потрібна сувора більшість.\\n⏱ Голосування триває повні 60 секунд; більшість не закриває фазу достроково.`;','const activeCount = activeGroupPlayers(state).length;\n    return `⚖️ Стратити підозрюваного ${displayName(accused)}?\\n👍 За страту: ${yes}/${activeCount} · 👎 Проти: ${no}/${activeCount}. Для страти потрібна сувора більшість активних гравців.\\n⏱ Голосування триває повні 60 секунд; більшість не закриває фазу достроково.`;')
rep('return `🗳 Голосування за підозрюваного.\\nПроголосувало: ${votes}/${state.players.length}. За себе голосувати не можна.\\n⏱ Голосування триває повні 60 секунд; більшість не закриває фазу достроково.`;','const activeCount = activeGroupPlayers(state).length;\n  return `🗳 Голосування за підозрюваного.\\nПроголосувало: ${votes}/${activeCount}. За себе голосувати не можна.\\n⏱ Голосування триває повні 60 секунд; більшість не закриває фазу достроково.`;')
rep('  if (!actorId) throw new Error("Запустити гру можна лише з особистого акаунта.");\n  await assertBotPermissions(chatId, message.chat.type);','  if (!actorId || message.from?.is_bot) throw new Error("Запустити гру можна лише з особистого акаунта.");\n  await assertBotPermissions(chatId, message.chat.type);')
rep('  if (!isGroupPlayer(state, String(actorId))) throw new Error("Запустити партію можуть лише учасники поточного лобі.");\n','')
block('function guessKeyboard(chatId: string, state: GroupGameState, page: number): TelegramMarkup {','async function processVoteOutcome(','''async function callbackAnswer(callbackId: string, text: string, alert = false) {
  try {
    await telegramCall("answerCallbackQuery", { callback_query_id: callbackId, text: text.slice(0, 180), show_alert: alert });
  } catch { /* The callback may have expired. */ }
}

async function handleLegacyGuessCallback(callback: { id: string; from: TelegramUser; data: string; message?: TelegramMessage }) {
  const [, chatId, roundId] = callback.data.split(":");
  if (!chatId || !roundId) {
    await callbackAnswer(callback.id, "Ця кнопка останнього здогаду більше не діє.", true);
    return;
  }
  const row = await getGame(chatId);
  if (!row || row.roundId !== roundId) {
    await callbackAnswer(callback.id, "Ця партія вже завершилася.", true);
    return;
  }
  const state = stateFromRow(row);
  if (state.status !== "spy_guess") {
    await callbackAnswer(callback.id, "Останній здогад у груповій грі прибрано.", true);
    return;
  }
  const finished = await mutateGame(chatId, roundId, current => {
    if (current.status !== "spy_guess") return current;
    const spy = current.players.find(player => player.id === current.guesserId);
    const name = spy ? (spy.username ? `@${spy.username}` : spy.firstName) : "Шпигун";
    return finishGroupRound(current, "civilians", `Шпигуна ${name} страчено. Гра завершена негайно.`);
  });
  await callbackAnswer(callback.id, "Останній здогад скасовано: агенти перемогли.", true);
  await finishAndAnnounce(chatId, finished.state);
}

''')
block('async function processVoteOutcome(', 'async function commitFinishedRound(','''async function processVoteOutcome(chatId: string, previous: GroupGameState, next: GroupGameState, accusedId?: string) {
  const suspectId = accusedId || next.accusedId || previous.accusedId || undefined;
  if (next.status === "voting" && next.voteStage === "execution" && (previous.status !== "voting" || previous.voteStage !== "execution")) {
    await sendGroupText(chatId, `🔎 Більшість визначила підозрюваного: ${displayName(next.players.find(player => player.id === suspectId))}. Тепер голосуємо: стратити чи помилувати.`);
    await announceVoting(chatId, next);
    return;
  }
  if (next.status === "finished") {
    await finishAndAnnounce(chatId, next);
    return;
  }
  if (next.status === "playing" && previous.status === "voting") {
    const eliminatedId = previous.accusedId;
    const wasAgentExecuted = previous.voteStage === "execution" && Boolean(eliminatedId && next.eliminatedPlayerIds.includes(eliminatedId));
    const message = wasAgentExecuted
      ? `🔨 ${displayName(next.players.find(player => player.id === eliminatedId))} страчений і вибув із гри. Раунд триває.`
      : previous.voteStage === "execution"
        ? "⚖️ Підозрюваного не страчено: більшість не підтримала вирок. Гра триває."
        : "🗳 Голосування не визначило більшості за підозрюваного. Гра триває.";
    await closeVotingMessage(chatId, next.roundId, message);
    await announceTurn(chatId, next);
  }
}

''')
rep('      xpParticipation: config.participation,\n      xpWin: config.win,','      xpParticipation: config.participation,\n      xpWin: config.win,\n      winnerRewardOverride: 10,')
rep('Статистика й монети оновлені у профілях.','Кожен гравець команди-переможця отримав 10 🪙. Статистика оновлена.')
block('async function renderPlayers(chatId: string) {','async function showStats(','''async function renderPlayers(chatId: string) {
  const row = await getGame(chatId);
  if (!row) throw new Error("У цій групі ще немає гри. Створіть лобі командою /game.");
  const state = stateFromRow(row);
  const players = state.players.map((player, index) => `${index + 1}. ${displayName(player)}${isActiveGroupPlayer(state, player.id) ? "" : " · вибув"}`).join("\\n") || "Поки що немає учасників.";
  const activeCount = activeGroupPlayers(state).length;
  await sendGroupText(chatId, `👥 Активні: ${activeCount} · гравців у партії: ${state.players.length}/${state.maxPlayers}\\n${players}`);
}

''')
rep('else if (command === "rules") await sendGroupText(chatId, "Шпигун не знає секрет. Спершу оберіть підозрюваного; потім те саме повідомлення перемкнеться на 👍 стратити / 👎 помилувати. Кожна фаза триває повні 60 секунд і завершується автоматично; набрана раніше більшість не зупиняє таймер. Для страти потрібна сувора більшість. Якщо стратили шпигуна, він приватно вгадує секрет; категорія в групі відкривається лише після фіналу. Наприкінці бот один раз оголошує переможця й того, хто програв.");','else if (command === "rules") await sendGroupText(chatId, "Шпигун не знає секрет. Спершу визначається підозрюваний, потім те саме повідомлення перемикається на 👍 стратити / 👎 помилувати; кожна фаза триває повні 60 секунд. Вибулі не голосують і не діють. Страта шпигуна одразу завершує гру перемогою агентів; страчений агент вибуває, гра триває до 1 активного агента й 1 шпигуна — тоді перемагає шпигун. Переможці отримують 10 🪙 кожен. Категорія й секрет відкриваються лише у фіналі.");')
rep('  if (!state.players.some(player => player.id === userId)) {','  if (!isActiveGroupPlayer(state, userId)) {')
# Remove the old, participant-only callback parser/handler block is already replaced above.
rep('  if (!data.startsWith("g:") && !data.startsWith("gs:") && !data.startsWith("gp:")) return false;','  if (!data.startsWith("g:") && !data.startsWith("gs:") && !data.startsWith("gp:")) return false;')
rep('      const { action, parts } = parseCallback(data);\n      await handleGuessCallback(callback as { id: string; from: TelegramUser; data: string; message?: TelegramMessage }, action || "", parts);','      await handleLegacyGuessCallback(callback as { id: string; from: TelegramUser; data: string; message?: TelegramMessage });')
rep('      if (!current.players.some(player => player.id === userId)) throw new Error("Запитання можуть ставити лише учасники.");','      if (!isActiveGroupPlayer(current, userId)) throw new Error("Запитання можуть ставити лише активні учасники.");')
rep('      const available = current.players.filter(player => player.id !== userId);','      const available = activeGroupPlayers(current).filter(player => player.id !== userId);')
rep('          if (current.status === "spy_guess" && current.guessEndsAt == null) return { ...current, guessEndsAt: now + 60_000 };\n          return tickGroupRound(current, now).state;','          return tickGroupRound(current, now).state;')
rep('        } else if (state.status === "spy_guess" && previous.status === "voting") {\n          await processVoteOutcome(chatId, previous, state, state.accusedId || state.guesserId || undefined);\n','')
block('        } else if (state.status === "spy_guess" && !state.guessPromptSent) {','        } else if (state.status === "finished" && !state.resultAnnounced) {','')
block('function parseCallback(data: string) {','export async function handleGroupCallback(','')
p.write_text(s)
