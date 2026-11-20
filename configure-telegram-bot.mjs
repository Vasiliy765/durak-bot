import "dotenv/config";
import { createHash } from "node:crypto";

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const appBase = process.env.TELEGRAM_WEBAPP_URL?.trim();
const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
if (!token || !appBase) throw new Error("Set TELEGRAM_BOT_TOKEN and TELEGRAM_WEBAPP_URL in the protected environment.");

const baseUrl = new URL(appBase);
if (baseUrl.protocol !== "https:") throw new Error("TELEGRAM_WEBAPP_URL must use HTTPS.");
const webhookUrl = new URL("/api/telegram/webhook", baseUrl).toString();
const secret = configuredSecret || createHash("sha256")
  .update("spyfall:telegram-webhook:v1\0")
  .update(token)
  .digest("hex");
if (!/^[A-Za-z0-9_-]{1,256}$/.test(secret)) throw new Error("TELEGRAM_WEBHOOK_SECRET must use only letters, digits, underscore, or hyphen.");

async function telegramCall(method, body) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) {
    throw new Error(`${method} failed (${payload?.error_code || response.status}): ${payload?.description || response.statusText || "Telegram API error"}`);
  }
  return payload.result;
}

const privateCommands = [
  { command: "start", description: "Відкрити ШПИГУН" },
  { command: "play", description: "Запустити Mini App" },
  { command: "help", description: "Команди й правила" },
  { command: "balance", description: "Переглянути баланс монет" },
  { command: "zp", description: "Отримати зарплату агента" },
  { command: "daily", description: "Забрати щоденний бонус" },
  { command: "top", description: "Рейтинг за монетами" },
  { command: "shop", description: "Відкрити магазин" },
  { command: "inventory", description: "Відкрити інвентар" },
  { command: "terms", description: "Умови цифрових товарів" },
  { command: "paysupport", description: "Підтримка платежів Stars" },
  { command: "rules", description: "Правила гри" },
];
const groupCommands = [
  { command: "game", description: "Створити групове лобі" },
  { command: "join", description: "Приєднатися до лобі" },
  { command: "leave", description: "Вийти з лобі" },
  { command: "players", description: "Показати гравців" },
  { command: "startgame", description: "Запустити партію (учасник лобі)" },
  { command: "stopgame", description: "Зупинити партію (адмін)" },
  { command: "rules", description: "Правила групової гри" },
  { command: "stats", description: "Статистика групи" },
  { command: "balance", description: "Переглянути баланс монет" },
  { command: "zp", description: "Отримати зарплату агента" },
  { command: "daily", description: "Забрати щоденний бонус" },
  { command: "top", description: "Рейтинг за монетами" },
  { command: "shop", description: "Відкрити магазин" },
  { command: "inventory", description: "Відкрити інвентар" },
  { command: "help", description: "Команди й правила" },
];

await telegramCall("setWebhook", {
  url: webhookUrl,
  secret_token: secret,
  allowed_updates: ["message", "callback_query", "pre_checkout_query"],
  drop_pending_updates: false,
});
await telegramCall("setMyCommands", {
  commands: privateCommands,
  scope: { type: "default" },
  language_code: "uk",
});
await telegramCall("setMyCommands", {
  commands: groupCommands,
  scope: { type: "all_group_chats" },
  language_code: "uk",
});
const webhookInfo = await telegramCall("getWebhookInfo", {});
if (webhookInfo.url !== webhookUrl) throw new Error("Telegram reports a webhook URL different from the configured app URL.");
const allowedUpdates = webhookInfo.allowed_updates || [];
if (!["message", "callback_query", "pre_checkout_query"].every(update => allowedUpdates.includes(update))) {
  throw new Error("Telegram webhook is missing message, callback_query or pre_checkout_query updates.");
}
console.log(`Telegram webhook and Ukrainian command menus verified for ${webhookUrl}; ${webhookInfo.pending_update_count ?? "unknown"} pending updates were preserved.`);
