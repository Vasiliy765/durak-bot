import mysql from "mysql2/promise";
import { callTelegram, sendBotMessage } from "./telegramApi";

export const CRYSTAL_PACKAGES: Record<string, number> = {
  crystals_50: 50,
  crystals_150: 150,
  crystals_500: 500,
  crystals_1200: 1200,
};

let pool: mysql.Pool | null = null;
function getPool() {
  if (!pool && process.env.DATABASE_URL) {
    pool = mysql.createPool(process.env.DATABASE_URL);
  }
  return pool;
}

const memoryBalances = new Map<number, number>();

export async function addCrystalsToUser(userId: number, amount: number): Promise<number> {
  const tgId = String(userId);
  const db = getPool();

  if (db) {
    try {
      // Оновлюємо кристали у таблиці users
      await db.execute(
        "UPDATE users SET crystals = COALESCE(crystals, 0) + ? WHERE telegramId = ?",
        [amount, tgId]
      );
      // Оновлюємо кристали у дзеркальній таблиці гаманців spy_wallets (якщо є)
      await db.execute(
        "UPDATE spy_wallets SET crystals = COALESCE(crystals, 0) + ? WHERE telegramId = ?",
        [amount, tgId]
      );
      const [rows]: any = await db.execute(
        "SELECT COALESCE(crystals, 0) AS crystals FROM users WHERE telegramId = ? LIMIT 1",
        [tgId]
      );
      if (rows && rows.length > 0) {
        return Number(rows[0].crystals);
      }
    } catch (err) {
      console.error("[Economy MySQL Error]:", err);
    }
  }

  const updated = (memoryBalances.get(userId) || 0) + amount;
  memoryBalances.set(userId, updated);
  return updated;
}

export async function handlePreCheckoutQuery(query: any) {
  await callTelegram("answerPreCheckoutQuery", {
    pre_checkout_query_id: query.id,
    ok: true,
  });
}

export async function handleSuccessfulPayment(message: any) {
  const userId = message.from?.id;
  const chatId = message.chat?.id;
  const payment = message.successful_payment;
  if (!userId || !payment) return;

  const payload: string = payment.invoice_payload || "";
  const crystalsAmount =
    CRYSTAL_PACKAGES[payload] ||
    Number(payload.replace(/[^0-9]/g, "")) ||
    0;

  if (crystalsAmount > 0) {
    const newBalance = await addCrystalsToUser(userId, crystalsAmount);
    if (chatId) {
      await sendBotMessage(
        chatId,
        💎 Оплата успішна! Нараховано <b>+${crystalsAmount} кристалів</b>.\nПоточний баланс: <b>${newBalance} 💎</b>,
        { message_thread_id: message.message_thread_id }
      );
    }
  }
}
