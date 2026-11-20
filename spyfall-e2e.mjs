import "/home/ubuntu/spyfallua/node_modules/dotenv/config.js";
import { randomUUID } from "node:crypto";
import mysql from "/home/ubuntu/spyfallua/node_modules/mysql2/promise.js";

const base = "http://127.0.0.1:3000/api/game";
const runId = randomUUID().replaceAll("-", "").slice(0, 10);
const players = ["a", "b", "c"].map((suffix, index) => ({ id: `qa-${runId}-${suffix}`, name: `QA ${index + 1}` }));
const outsider = { id: `qa-${runId}-outsider`, name: "QA Outsider" };
const roomCodes = [];
const checks = [];

function headers(player) {
  return { "content-type": "application/json", "x-preview-player": player.id };
}
async function request(player, path, method = "GET", body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: headers(player),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${method} ${path} (${response.status}): ${data.error || JSON.stringify(data)}`);
  return data;
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
  checks.push(message);
}
async function play(mode, expectedWinner) {
  const created = await request(players[0], "/rooms", "POST", {
    name: `QA ${mode} ${runId}`,
    maxPlayers: 3,
    spyCount: 1,
    durationMinutes: 5,
    allowRejoin: true,
    isPrivate: mode !== "secret_word",
    categories: [],
    mode,
  });
  const code = created.room.code;
  roomCodes.push(code);
  for (const player of players.slice(1)) await request(player, `/rooms/${code}/join`, "POST", {});
  const chatPost = await request(players[1], `/rooms/${code}/messages`, "POST", { text: "Почнімо обговорення операції." });
  assert(chatPost.room.messages?.some(message => message.text === "Почнімо обговорення операції."), `${mode}: team chat message is persisted in the shared room`);
  let outsiderRejected = false;
  try { await request(outsider, `/rooms/${code}/messages`, "POST", { text: "Чужий доступ" }); }
  catch (error) { outsiderRejected = error instanceof Error && /\(403\)/.test(error.message); }
  assert(outsiderRejected, `${mode}: a non-member cannot read/write the private room chat`);
  for (const player of players) await request(player, `/rooms/${code}/ready`, "POST", { ready: true });

  const started = await request(players[0], `/rooms/${code}/start`, "POST", {});
  assert(started.room.status === "playing", `${mode}: round starts after all 3 players are ready`);
  const views = await Promise.all(players.map(player => request(player, `/rooms/${code}`)));
  const spyIndex = views.findIndex(view => view.room.yourRole === "spy");
  const civilians = views.map((view, index) => ({ view: view.room, player: players[index], index })).filter(entry => entry.view.yourRole === "civilian");
  assert(spyIndex >= 0 && civilians.length === 2, `${mode}: server assigns one spy and two civilians`);
  const spyView = views[spyIndex].room;
  assert(!Object.hasOwn(spyView, "location") && !Object.hasOwn(spyView, "categories"), `${mode}: spy response does not expose the secret or its category`);
  assert(civilians.every(entry => typeof entry.view.location === "string" && entry.view.location.length > 0), `${mode}: civilians receive the secret`);
  const secret = civilians[0].view.location;

  if (mode === "secret_word") {
    const options = await request(players[0], "/locations/options?mode=secret_word");
    assert(options.locations.includes(secret), "secret-word mode: the actual answer is included in the spy guess choices");
  }

  const activeIndex = players.findIndex(player => `preview:${player.id}` === started.room.activePlayerId);
  const targetIndex = (activeIndex + 1) % players.length;
  const asked = await request(players[activeIndex], `/rooms/${code}/questions`, "POST", { to: `preview:${players[targetIndex].id}`, text: "Чи часто тут бувають люди?" });
  const question = asked.room.questions.at(-1);
  const answered = await request(players[targetIndex], `/rooms/${code}/questions/${question.id}/answer`, "POST", { answer: "Іноді так." });
  assert(answered.room.questions.some(item => item.id === question.id && item.answer === "Іноді так."), `${mode}: question and answer are saved in room state`);
  const chatDuringRound = await request(players[0], `/rooms/${code}/messages`, "POST", { text: "Ще одна підказка для команди." });
  assert(chatDuringRound.room.messages?.length === 2, `${mode}: the general chat remains available during the round`);

  await request(players[0], `/rooms/${code}/vote/start`, "POST", {});
  const spyPlayerId = `preview:${players[spyIndex].id}`;
  let voteResult;
  for (const civilian of civilians) {
    voteResult = await request(civilian.player, `/rooms/${code}/vote`, "POST", { targetId: spyPlayerId });
    if (voteResult.room.status === "spy_guess") break;
  }
  assert(voteResult?.room.status === "spy_guess", `${mode}: strict majority correctly reveals the spy for a last guess`);
  const options = await request(players[0], `/locations/options?mode=${mode}`);
  const wrongGuess = options.locations.find(option => option !== secret);
  const guess = expectedWinner === "spies" ? secret : wrongGuess;
  const completed = await request(players[spyIndex], `/rooms/${code}/guess`, "POST", { secret: guess });
  assert(completed.room.status === "finished" && completed.room.result?.winner === expectedWinner, `${mode}: correct/incorrect secret guess yields ${expectedWinner}`);
  const profile = await request(players[0], "/session");
  assert(profile.player.gamesPlayed >= 1, `${mode}: completed result increments persistent profile statistics`);
  return { mode, code, winner: completed.room.result.winner, secretKind: completed.room.secretKind };
}

try {
  for (const player of players) await request(player, "/session");
  const spyfall = await play("spyfall", "spies");
  const secretWord = await play("secret_word", "civilians");
  console.log(JSON.stringify({ ok: true, runId, spyfall, secretWord, checks, roomCodes }, null, 2));
} finally {
  if (process.env.DATABASE_URL) {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    if (roomCodes.length) {
      const placeholders = roomCodes.map(() => "?").join(",");
      await connection.execute(`DELETE FROM spy_games WHERE roomCode IN (${placeholders})`, roomCodes);
      await connection.execute(`DELETE FROM spy_rooms WHERE code IN (${placeholders})`, roomCodes);
    }
    const profileIds = [...players, outsider].map(player => `preview:${player.id}`);
    const placeholders = profileIds.map(() => "?").join(",");
    await connection.execute(`DELETE FROM spy_profiles WHERE telegramId IN (${placeholders})`, profileIds);
    await connection.end();
    console.log(`Cleaned test-only rooms, results and ${profileIds.length} profiles for run ${runId}.`);
  } else {
    console.error("DATABASE_URL not available to cleanup; use the unique QA prefix for cleanup before rerunning.");
  }
}
