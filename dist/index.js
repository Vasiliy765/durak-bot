// server/_core/index.ts
import express from "express";
import path from "path";

// server/game/telegramApi.ts
var BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
var API_BASE = ["https://", "api", ".telegram.org/bot", BOT_TOKEN].join("");
var botsTopicThreads = /* @__PURE__ */ new Map();
function setBotsTopicThread(chatId, threadId) {
  botsTopicThreads.set(chatId, threadId);
}
function getBotsTopicThread(chatId) {
  if (process.env.BOTS_TOPIC_THREAD_ID) {
    return Number(process.env.BOTS_TOPIC_THREAD_ID);
  }
  return botsTopicThreads.get(chatId);
}
async function callTelegram(method, payload) {
  const res = await fetch(API_BASE + "/" + method, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!data.ok) {
    console.error("[Telegram API " + method + "] Error:", data.description);
  }
  return data;
}
async function deleteChatMessage(chatId, messageId) {
  return callTelegram("deleteMessage", {
    chat_id: chatId,
    message_id: messageId
  });
}
async function sendBotMessage(chatId, text, options = {}) {
  const { autoDeleteSeconds, ...tgOptions } = options;
  const threadId = tgOptions.message_thread_id ?? getBotsTopicThread(chatId);
  const response = await callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...threadId ? { message_thread_id: threadId } : {},
    ...tgOptions
  });
  if (autoDeleteSeconds && response?.ok && response?.result?.message_id) {
    const sentMessageId = response.result.message_id;
    setTimeout(() => {
      deleteChatMessage(chatId, sentMessageId).catch(() => {
      });
    }, autoDeleteSeconds * 1e3);
  }
  return response;
}

// server/game/groupPermissions.ts
var activeGamePlayers = /* @__PURE__ */ new Map();
async function enforceNonPlayerMessageDelete(chatId, userId, messageId) {
  if (!userId) return false;
  const players = activeGamePlayers.get(chatId);
  if (!players || players.size === 0) return false;
  if (!players.has(userId)) {
    await deleteChatMessage(chatId, messageId);
    return true;
  }
  return false;
}

// server/game/economy.ts
import mysql from "mysql2/promise";
var CRYSTAL_PACKAGES = {
  crystals_50: 50,
  crystals_100: 100,
  crystals_150: 150,
  crystals_300: 300,
  crystals_500: 500,
  crystals_1200: 1200
};
var pool = null;
function getPool() {
  if (!pool && process.env.DATABASE_URL) {
    pool = mysql.createPool(process.env.DATABASE_URL);
  }
  return pool;
}
var memoryBalances = /* @__PURE__ */ new Map();
async function addCrystalsToUser(userId, amount) {
  const tgId = String(userId);
  const db = getPool();
  if (db) {
    try {
      await db.execute(
        "UPDATE users SET crystals = COALESCE(crystals, 0) + ? WHERE telegramId = ?",
        [amount, tgId]
      );
      await db.execute(
        "UPDATE spy_wallets SET crystals = COALESCE(crystals, 0) + ? WHERE telegramId = ?",
        [amount, tgId]
      );
      const [rows] = await db.execute(
        "SELECT COALESCE(crystals, 0) AS crystals FROM users WHERE telegramId = ? LIMIT 1",
        [tgId]
      );
      if (rows && rows.length > 0) {
        return Number(rows.crystals);
      }
    } catch (err) {
      console.error("[Economy MySQL Error]:", err);
    }
  }
  const current = memoryBalances.get(userId) ? memoryBalances.get(userId) : 0;
  const updated = current + amount;
  memoryBalances.set(userId, updated);
  return updated;
}
async function rollbackBuggedCrystals() {
  const db = getPool();
  if (!db) {
    memoryBalances.clear();
    return "\u2139\uFE0F \u0411\u0430\u0437\u0430 MySQL (DATABASE_URL) \u043D\u0435 \u043F\u0456\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0430 \u2014 \u0442\u0438\u043C\u0447\u0430\u0441\u043E\u0432\u0430 \u043F\u0430\u043C'\u044F\u0442\u044C \u0431\u0430\u043B\u0430\u043D\u0441\u0456\u0432 \u043F\u043E\u0432\u043D\u0456\u0441\u0442\u044E \u043E\u0447\u0438\u0449\u0435\u043D\u0430.";
  }
  const reportLines = [];
  try {
    const [badUsers] = await db.execute(
      "SELECT telegramId, crystals FROM users WHERE crystals >= 100000"
    );
    for (const row of badUsers) {
      const tgId = String(row.telegramId);
      const currentCrystals = BigInt(row.crystals);
      let legitimateCrystals = 0;
      try {
        const [paidRows] = await db.execute(
          "SELECT COALESCE(SUM(crystals), 0) AS totalPaid FROM spy_star_orders WHERE telegramId = ? AND status = 'paid'",
          [tgId]
        );
        if (paidRows && paidRows.length > 0) {
          legitimateCrystals = Number(paidRows.totalPaid);
        }
      } catch {
      }
      const deducted = currentCrystals - BigInt(legitimateCrystals);
      await db.execute("UPDATE users SET crystals = ? WHERE telegramId = ?", [legitimateCrystals, tgId]);
      await db.execute("UPDATE spy_wallets SET crystals = ? WHERE telegramId = ?", [legitimateCrystals, tgId]);
      reportLines.push(
        "\u2022 ID " + tgId + ": \u0441\u043F\u0438\u0441\u0430\u043D\u043E -" + deducted.toString() + " \u{1F48E} (\u0437\u0430\u043B\u0438\u0448\u0435\u043D\u043E \u0440\u0435\u0430\u043B\u044C\u043D\u0438\u0445 \u043F\u043E\u043A\u0443\u043F\u043E\u043A: " + legitimateCrystals + " \u{1F48E})"
      );
    }
    const [badWallets] = await db.execute(
      "SELECT telegramId, crystals FROM spy_wallets WHERE crystals >= 100000"
    );
    for (const w of badWallets) {
      const tgId = String(w.telegramId);
      await db.execute("UPDATE spy_wallets SET crystals = 0 WHERE telegramId = ?", [tgId]);
      reportLines.push("\u2022 \u0413\u0430\u043C\u0430\u043D\u0435\u0446\u044C ID " + tgId + ": \u0441\u043F\u0438\u0441\u0430\u043D\u043E -" + String(w.crystals) + " \u{1F48E}");
    }
  } catch (err) {
    console.error("[Rollback Error]:", err);
    return "\u274C \u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u043F\u0440\u0438 \u043F\u0435\u0440\u0435\u0432\u0456\u0440\u0446\u0456 \u0431\u0430\u0437\u0438: " + String(err);
  }
  if (reportLines.length === 0) {
    return "\u2705 \u041D\u0430\u043A\u0440\u0443\u0447\u0435\u043D\u0438\u0445 \u0431\u0430\u043B\u0430\u043D\u0441\u0456\u0432 \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E \u2014 \u0443\u0441\u0456 \u043A\u0440\u0438\u0441\u0442\u0430\u043B\u0438 \u0432\u0436\u0435 \u0441\u043F\u0438\u0441\u0430\u043D\u0456 \u0430\u0431\u043E \u0432 \u043C\u0435\u0436\u0430\u0445 \u0440\u0435\u0430\u043B\u044C\u043D\u0438\u0445 \u043F\u043E\u043A\u0443\u043F\u043E\u043A.";
  }
  return "\u{1F9F9} <b>\u0417\u0432\u0456\u0442 \u043F\u0440\u043E \u0441\u043F\u0438\u0441\u0430\u043D\u043D\u044F \u043F\u043E\u043C\u0438\u043B\u043A\u043E\u0432\u0438\u0445 \u043A\u0440\u0438\u0441\u0442\u0430\u043B\u0456\u0432:</b>\n" + reportLines.join("\n");
}
async function handlePreCheckoutQuery(query) {
  await callTelegram("answerPreCheckoutQuery", {
    pre_checkout_query_id: query.id,
    ok: true
  });
}
async function handleSuccessfulPayment(message) {
  const userId = message.from ? message.from.id : void 0;
  const chatId = message.chat ? message.chat.id : void 0;
  const payment = message.successful_payment;
  if (!userId) return;
  if (!payment) return;
  const payload = String(payment.invoice_payload ? payment.invoice_payload : "");
  let crystalsAmount = 0;
  if (CRYSTAL_PACKAGES[payload]) {
    crystalsAmount = CRYSTAL_PACKAGES[payload];
  } else {
    const match = payload.match(/crystals[_:](\d{1,5})/i);
    if (match) {
      crystalsAmount = Number(match);
    }
  }
  if (crystalsAmount > 0 && crystalsAmount <= 5e4) {
    const newBalance = await addCrystalsToUser(userId, crystalsAmount);
    if (chatId) {
      await sendBotMessage(
        chatId,
        "\u{1F48E} \u041E\u043F\u043B\u0430\u0442\u0430 \u0443\u0441\u043F\u0456\u0448\u043D\u0430! \u041D\u0430\u0440\u0430\u0445\u043E\u0432\u0430\u043D\u043E <b>+" + crystalsAmount + " \u043A\u0440\u0438\u0441\u0442\u0430\u043B\u0456\u0432</b>.\n\u041F\u043E\u0442\u043E\u0447\u043D\u0438\u0439 \u0431\u0430\u043B\u0430\u043D\u0441: <b>" + newBalance + " \u{1F48E}</b>",
        { message_thread_id: message.message_thread_id }
      );
    }
  }
}

// server/game/userStore.ts
var users = /* @__PURE__ */ new Map();
function getOrCreateUser(userId) {
  if (!users.has(userId)) {
    users.set(userId, {
      coins: 500,
      crystals: 10,
      lastSalary: 0,
      lastDaily: 0,
      streak: 1
    });
  }
  return users.get(userId);
}

// server/game/telegramBot.ts
var FIVE_MINUTES_SEC = 5 * 60;
var ONE_HOUR_MS = 60 * 60 * 1e3;
var WEBAPP_URL = process.env.WEBAPP_URL ? process.env.WEBAPP_URL : "https://mistral.run";
async function processTelegramUpdate(update) {
  if (update.pre_checkout_query) {
    await handlePreCheckoutQuery(update.pre_checkout_query);
    return;
  }
  const msg = update.message;
  if (!msg) return;
  const chatId = msg.chat.id;
  const userId = msg.from ? msg.from.id : void 0;
  const firstName = msg.from && msg.from.first_name ? msg.from.first_name : "\u0413\u0440\u0430\u0432\u0435\u0446\u044C";
  const threadId = msg.message_thread_id;
  const text = (msg.text ? msg.text : "").trim();
  const lowerText = text.toLowerCase();
  if (msg.successful_payment) {
    await handleSuccessfulPayment(msg);
    return;
  }
  if (msg.chat.type === "group" || msg.chat.type === "supergroup") {
    const wasDeleted = await enforceNonPlayerMessageDelete(chatId, userId, msg.message_id);
    if (wasDeleted) return;
  }
  if (threadId && text.startsWith("/")) {
    setBotsTopicThread(chatId, threadId);
  }
  if (lowerText.startsWith("/rollback_crystals")) {
    const report = await rollbackBuggedCrystals();
    await sendBotMessage(chatId, report, { message_thread_id: threadId });
    return;
  }
  if (lowerText.startsWith("/start") || lowerText.startsWith("/play")) {
    await sendBotMessage(
      chatId,
      "\u{1F575}\uFE0F\u200D\u2642\uFE0F <b>\u0406\u0433\u0440\u043E\u0432\u0438\u0439 \u0446\u0435\u043D\u0442\u0440 \u0433\u043E\u0442\u043E\u0432\u0438\u0439!</b>\n\u041D\u0430\u0442\u0438\u0441\u043D\u0438 \u043A\u043D\u043E\u043F\u043A\u0443 \u043D\u0438\u0436\u0447\u0435, \u0449\u043E\u0431 \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \u0433\u0440\u0443:",
      {
        message_thread_id: threadId,
        reply_markup: {
          inline_keyboard: [[{ text: "\u{1F3AE} \u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \u0433\u0440\u0443", web_app: { url: WEBAPP_URL } }]]
        }
      }
    );
    return;
  }
  if (lowerText.startsWith("/set_bots_topic") && threadId) {
    setBotsTopicThread(chatId, threadId);
    await sendBotMessage(chatId, "\u2705 \u0426\u044E \u0433\u0456\u043B\u043A\u0443 \u0437\u0430\u043A\u0440\u0456\u043F\u043B\u0435\u043D\u043E \u0434\u043B\u044F \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u0435\u0439 \u0431\u043E\u0442\u0430 (\xAB\u0411\u043E\u0442\u0438\xBB).", {
      message_thread_id: threadId,
      autoDeleteSeconds: FIVE_MINUTES_SEC
    });
    return;
  }
  if (userId && (["\u0431\u0430\u043B\u0430\u043D\u0441", "/balance"].includes(lowerText) || lowerText.startsWith("/balance@"))) {
    const u = getOrCreateUser(userId);
    await sendBotMessage(
      chatId,
      "\u{1F464} <b>" + firstName + "</b>, \u0442\u0432\u0456\u0439 \u0431\u0430\u043B\u0430\u043D\u0441:\n\u{1FA99} \u041C\u043E\u043D\u0435\u0442\u0438: <b>" + u.coins + "</b>\n\u{1F48E} \u041A\u0440\u0438\u0441\u0442\u0430\u043B\u0438: <b>" + u.crystals + "</b>",
      {
        message_thread_id: threadId,
        autoDeleteSeconds: FIVE_MINUTES_SEC
      }
    );
    return;
  }
  if (userId && (["\u0437\u043F", "\u0437\u0430\u0440\u043F\u043B\u0430\u0442\u0430", "/zp"].includes(lowerText) || lowerText.startsWith("/zp@"))) {
    const u = getOrCreateUser(userId);
    const now = Date.now();
    if (now - u.lastSalary < ONE_HOUR_MS) {
      const minsLeft = Math.ceil((u.lastSalary + ONE_HOUR_MS - now) / 6e4);
      await sendBotMessage(
        chatId,
        "\u23F3 <b>" + firstName + "</b>, \u0442\u0438 \u0432\u0436\u0435 \u043E\u0442\u0440\u0438\u043C\u0443\u0432\u0430\u0432 \u0417\u041F.\n\u041D\u0430\u0441\u0442\u0443\u043F\u043D\u0430 \u0437\u0430\u0440\u043F\u043B\u0430\u0442\u0430 \u0447\u0435\u0440\u0435\u0437 <b>" + minsLeft + " \u0445\u0432</b>.",
        {
          message_thread_id: threadId,
          autoDeleteSeconds: FIVE_MINUTES_SEC
        }
      );
      return;
    }
    const reward = 150;
    u.lastSalary = now;
    u.coins += reward;
    await sendBotMessage(
      chatId,
      "\u{1F4B0} <b>" + firstName + "</b>, \u0442\u0438 \u043E\u0442\u0440\u0438\u043C\u0430\u0432 \u0437\u0430\u0440\u043F\u043B\u0430\u0442\u0443 <b>+" + reward + " \u{1FA99}</b>!\n\u041F\u043E\u0442\u043E\u0447\u043D\u0438\u0439 \u0431\u0430\u043B\u0430\u043D\u0441: <b>" + u.coins + " \u{1FA99}</b> | <b>" + u.crystals + " \u{1F48E}</b>",
      {
        message_thread_id: threadId,
        autoDeleteSeconds: FIVE_MINUTES_SEC
      }
    );
    return;
  }
}

// server/game/miniAppRoutes.ts
function parseTelegramUser(req) {
  let raw = "";
  if (req.headers["x-telegram-init-data"]) {
    raw = String(req.headers["x-telegram-init-data"]);
  } else if (req.query.initData) {
    raw = String(req.query.initData);
  }
  if (raw) {
    try {
      const params = new URLSearchParams(raw);
      const userStr = params.get("user");
      if (userStr) {
        const parsed = JSON.parse(userStr);
        if (parsed && parsed.id) return parsed;
      }
    } catch {
    }
  }
  return { id: 1000001, first_name: "\u0413\u0440\u0430\u0432\u0435\u0446\u044C", username: "player" };
}
var userState = /* @__PURE__ */ new Map();
function getUserState(id) {
  if (!userState.has(id)) {
    userState.set(id, { coins: 500, crystals: 10, lastSalary: 0, lastDaily: 0, streak: 1 });
  }
  return userState.get(id);
}
function registerMiniAppRoutes(app2) {
  app2.get("/api/game/profile", (req, res) => {
    const user = parseTelegramUser(req);
    const st = getUserState(user.id);
    res.json({
      profile: {
        id: String(user.id),
        telegramId: String(user.id),
        firstName: user.first_name,
        lastName: user.last_name ? user.last_name : "",
        username: user.username ? user.username : "",
        coins: st.coins,
        crystals: st.crystals,
        vip: false,
        gamesPlayed: 0,
        gamesWon: 0,
        equipped: {}
      }
    });
  });
  app2.get("/api/game/economy/overview", (req, res) => {
    const user = parseTelegramUser(req);
    const st = getUserState(user.id);
    res.json({
      balance: st.coins,
      crystals: st.crystals,
      vip: false,
      streak: st.streak,
      salaryCooldownMs: Math.max(0, st.lastSalary + 36e5 - Date.now()),
      dailyCooldownMs: Math.max(0, st.lastDaily + 864e5 - Date.now())
    });
  });
  app2.post("/api/game/economy/salary", (req, res) => {
    const user = parseTelegramUser(req);
    const st = getUserState(user.id);
    const now = Date.now();
    if (now - st.lastSalary < 36e5) {
      return res.json({ claimed: false, amount: 0, balance: st.coins, remainingMs: st.lastSalary + 36e5 - now });
    }
    st.lastSalary = now;
    st.coins += 150;
    res.json({ claimed: true, amount: 150, balance: st.coins, remainingMs: 36e5 });
  });
  app2.post("/api/game/economy/daily", (req, res) => {
    const user = parseTelegramUser(req);
    const st = getUserState(user.id);
    const now = Date.now();
    if (now - st.lastDaily < 864e5) {
      return res.json({ claimed: false, amount: 0, bonusAmount: 0, balance: st.coins, streak: st.streak, streakBonus: 0, remainingMs: st.lastDaily + 864e5 - now });
    }
    st.lastDaily = now;
    st.coins += 300;
    res.json({ claimed: true, amount: 300, bonusAmount: 0, balance: st.coins, streak: st.streak, streakBonus: 0, remainingMs: 864e5 });
  });
  app2.post("/api/game/economy/stars/invoice", async (req, res) => {
    const packageId = req.body && req.body.packageId ? String(req.body.packageId) : "crystals_50";
    const crystals = CRYSTAL_PACKAGES[packageId] ? CRYSTAL_PACKAGES[packageId] : 50;
    const starsPrice = Math.max(1, Math.round(crystals / 2));
    const tgRes = await callTelegram("createInvoiceLink", {
      title: crystals + " \u041A\u0440\u0438\u0441\u0442\u0430\u043B\u0456\u0432",
      description: "\u041F\u043E\u043F\u043E\u0432\u043D\u0435\u043D\u043D\u044F \u0431\u0430\u043B\u0430\u043D\u0441\u0443 \u043A\u0440\u0438\u0441\u0442\u0430\u043B\u0456\u0432 \u0443 \u0433\u0440\u0456",
      payload: packageId,
      currency: "XTR",
      prices: [{ label: crystals + " \u{1F48E}", amount: starsPrice }]
    });
    if (!tgRes || !tgRes.ok) {
      return res.status(500).json({ error: "Failed to create Stars invoice" });
    }
    res.json({ invoiceUrl: tgRes.result, orderId: packageId + "_" + Date.now() });
  });
  app2.get("/api/game-center/tables", (req, res) => {
    const user = parseTelegramUser(req);
    res.json({ tables: [], myPlayerId: String(user.id) });
  });
  app2.get("/api/game-center/leaderboard", (_req, res) => res.json({ players: [] }));
  app2.get("/api/game/economy/shop", (_req, res) => res.json({ items: [] }));
  app2.get("/api/game/economy/inventory", (_req, res) => res.json({ items: [] }));
  app2.get("/api/game/economy/top", (_req, res) => res.json({ players: [] }));
}

// server/_core/index.ts
var app = express();
app.use(express.json());
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});
app.post("/api/telegram/webhook", async (req, res) => {
  try {
    await processTelegramUpdate(req.body);
  } catch (err) {
    console.error("[Webhook Error]:", err);
  }
  res.sendStatus(200);
});
registerMiniAppRoutes(app);
app.all("/api/trpc/*", (_req, res) => {
  res.json([{ result: { data: { json: null } } }]);
});
var distPath = path.resolve(process.cwd(), "dist", "public");
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"), (err) => {
    if (err) res.status(200).send("Bot server is running");
  });
});
var PORT = Number(process.env.PORT || 3e3);
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server is running on port " + PORT);
  rollbackBuggedCrystals().then((rep) => console.log(rep)).catch(() => {
  });
});
