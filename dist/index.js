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
  crystals_150: 150,
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
  const updated = (memoryBalances.get(userId) || 0) + amount;
  memoryBalances.set(userId, updated);
  return updated;
}
async function handlePreCheckoutQuery(query) {
  await callTelegram("answerPreCheckoutQuery", {
    pre_checkout_query_id: query.id,
    ok: true
  });
}
async function handleSuccessfulPayment(message) {
  const userId = message.from?.id;
  const chatId = message.chat?.id;
  const payment = message.successful_payment;
  if (!userId || !payment) return;
  const payload = payment.invoice_payload || "";
  const crystalsAmount = CRYSTAL_PACKAGES[payload] || Number(payload.replace(/[^0-9]/g, "")) || 0;
  if (crystalsAmount > 0) {
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

// server/game/telegramBot.ts
var FIVE_MINUTES_SEC = 5 * 60;
async function processTelegramUpdate(update) {
  if (update.pre_checkout_query) {
    await handlePreCheckoutQuery(update.pre_checkout_query);
    return;
  }
  const msg = update.message;
  if (!msg) return;
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const threadId = msg.message_thread_id;
  const text = (msg.text || "").trim();
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
  if (lowerText.startsWith("/set_bots_topic") && threadId) {
    setBotsTopicThread(chatId, threadId);
    await sendBotMessage(chatId, "\u2705 \u0426\u044E \u0433\u0456\u043B\u043A\u0443 \u0437\u0430\u043A\u0440\u0456\u043F\u043B\u0435\u043D\u043E \u0434\u043B\u044F \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u0435\u0439 \u0431\u043E\u0442\u0430 (\xAB\u0411\u043E\u0442\u0438\xBB).", {
      message_thread_id: threadId,
      autoDeleteSeconds: FIVE_MINUTES_SEC
    });
    return;
  }
  if (["\u0431\u0430\u043B\u0430\u043D\u0441", "/balance"].includes(lowerText) || lowerText.startsWith("/balance@")) {
    await sendBotMessage(chatId, "\u{1F48E} \u041F\u0435\u0440\u0435\u0432\u0456\u0440\u0438\u0442\u0438 \u0442\u0430 \u043F\u043E\u043F\u043E\u0432\u043D\u0438\u0442\u0438 \u0431\u0430\u043B\u0430\u043D\u0441 \u043C\u043E\u0436\u043D\u0430 \u0443 Mini App.", {
      message_thread_id: threadId,
      autoDeleteSeconds: FIVE_MINUTES_SEC
    });
    return;
  }
  if (["\u0437\u043F", "\u0437\u0430\u0440\u043F\u043B\u0430\u0442\u0430", "/zp"].includes(lowerText) || lowerText.startsWith("/zp@")) {
    await sendBotMessage(chatId, "\u{1F4B0} \u0429\u043E\u0434\u0435\u043D\u043D\u0430 \u043D\u0430\u0433\u043E\u0440\u043E\u0434\u0430 (\u0417\u041F) \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0443 Mini App.", {
      message_thread_id: threadId,
      autoDeleteSeconds: FIVE_MINUTES_SEC
    });
    return;
  }
}

// server/game/miniAppRoutes.ts
import crypto from "crypto";
var BOT_TOKEN2 = process.env.TELEGRAM_BOT_TOKEN || "";
function parseTelegramInitData(initDataRaw) {
  if (!initDataRaw) return null;
  try {
    const params = new URLSearchParams(initDataRaw);
    const userStr = params.get("user");
    const hash = params.get("hash");
    if (!userStr || !hash) return null;
    if (BOT_TOKEN2) {
      const dataCheckArr = [];
      params.forEach((val, key) => {
        if (key !== "hash") dataCheckArr.push(key + "=" + val);
      });
      dataCheckArr.sort();
      const secretKey = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN2).digest();
      const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckArr.join("\n")).digest("hex");
      if (calculatedHash !== hash) return null;
    }
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}
var userState = /* @__PURE__ */ new Map();
function getUserState(id) {
  if (!userState.has(id)) {
    userState.set(id, { coins: 500, crystals: 10, lastSalary: 0, lastDaily: 0, streak: 1 });
  }
  return userState.get(id);
}
var tablesStore = [];
function registerMiniAppRoutes(app2) {
  const getAuthUser = (req) => {
    const initData = String(req.headers["x-telegram-init-data"] || "");
    return parseTelegramInitData(initData);
  };
  app2.get("/api/game/profile", (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });
    const st = getUserState(user.id);
    res.json({
      profile: {
        id: String(user.id),
        telegramId: String(user.id),
        firstName: user.first_name,
        lastName: user.last_name || "",
        username: user.username || "",
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
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });
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
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });
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
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });
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
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });
    const packageId = String(req.body?.packageId || "crystals_50");
    const crystals = CRYSTAL_PACKAGES[packageId] || 50;
    const starsPrice = Math.max(1, Math.round(crystals / 2));
    const tgRes = await callTelegram("createInvoiceLink", {
      title: crystals + " \u041A\u0440\u0438\u0441\u0442\u0430\u043B\u0456\u0432",
      description: "\u041F\u043E\u043F\u043E\u0432\u043D\u0435\u043D\u043D\u044F \u0431\u0430\u043B\u0430\u043D\u0441\u0443 \u043A\u0440\u0438\u0441\u0442\u0430\u043B\u0456\u0432 \u0443 \u0433\u0440\u0456",
      payload: packageId,
      currency: "XTR",
      prices: [{ label: crystals + " \u{1F48E}", amount: starsPrice }]
    });
    if (!tgRes?.ok) {
      return res.status(500).json({ error: tgRes?.description || "Failed to create Stars invoice" });
    }
    res.json({ invoiceUrl: tgRes.result, orderId: packageId + "_" + Date.now() });
  });
  app2.get("/api/game-center/tables", (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });
    res.json({ tables: tablesStore, myPlayerId: String(user.id) });
  });
  app2.get("/api/game-center/leaderboard", (_req, res) => {
    res.json({ players: [] });
  });
  app2.get("/api/game/economy/shop", (_req, res) => {
    res.json({ items: [] });
  });
  app2.get("/api/game/economy/inventory", (_req, res) => {
    res.json({ items: [] });
  });
  app2.get("/api/game/economy/top", (_req, res) => {
    res.json({ players: [] });
  });
}

// server/_core/index.ts
var app = express();
app.use(express.json());
app.post("/api/telegram/webhook", async (req, res) => {
  try {
    await processTelegramUpdate(req.body);
  } catch (err) {
    console.error("[Webhook Error]:", err);
  }
  res.sendStatus(200);
});
registerMiniAppRoutes(app);
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
});
