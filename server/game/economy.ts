import mysql from "mysql2/promise";
import { callTelegram, sendBotMessage } from "./telegramApi";

export const CRYSTAL_PACKAGES: Record<string, number> = {
  crystals_50: 50,
  crystals_100: 100,
  crystals_150: 150,
  crystals_300: 300,
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
      await db.execute(
        "UPDATE users SET crystals = COALESCE(crystals, 0) + ? WHERE telegramId = ?",
        [amount, tgId]
      );
      await db.execute(
        "UPDATE spy_wallets SET crystals = COALESCE(crystals, 0) + ? WHERE telegramId = ?",
        [amount, tgId]
      );
      const [rows]: any = await db.execute(
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

  const current = memoryBalances.get(userId) ? memoryBalances.get(userId)! : 0;
  const updated = current + amount;
  memoryBalances.set(userId, updated);
  return updated;
}

/**
 * Списання всіх помилково виданих кристалів (>= 100000) із збереженням тільки реальних покупок
 */
export async function rollbackBuggedCrystals(): Promise<string> {
  const db = getPool();
  if (!db) {
    memoryBalances.clear();
    return "ℹ️ База MySQL (DATABASE_URL) не підключена — тимчасова пам'ять балансів повністю очищена.";
  }

  const reportLines: string[] = [];
  try {
    const [badUsers]: any = await db.execute(
      "SELECT telegramId, crystals FROM users WHERE crystals >= 100000"
    );

    for (const row of badUsers) {
      const tgId = String(row.telegramId);
      const currentCrystals = BigInt(row.crystals);
      let legitimateCrystals = 0;

      // Перевіряємо реальні оплачені покупки у таблиці замовлень Stars (якщо вона існує)
      try {
        const [paidRows]: any = await db.execute(
          "SELECT COALESCE(SUM(crystals), 0) AS totalPaid FROM spy_star_orders WHERE telegramId = ? AND status = 'paid'",
          [tgId]
        );
        if (paidRows && paidRows.length > 0) {
          legitimateCrystals = Number(paidRows.totalPaid);
        }
      } catch {}

      const deducted = currentCrystals - BigInt(legitimateCrystals);
      await db.execute("UPDATE users SET crystals = ? WHERE telegramId = ?", [legitimateCrystals, tgId]);
      await db.execute("UPDATE spy_wallets SET crystals = ? WHERE telegramId = ?", [legitimateCrystals, tgId]);

      reportLines.push(
        "• ID " + tgId + ": списано -" + deducted.toString() + " 💎 (залишено реальних покупок: " + legitimateCrystals + " 💎)"
      );
    }

    // Додатково перевіряємо spy_wallets на випадок розсинхрону
    const [badWallets]: any = await db.execute(
      "SELECT telegramId, crystals FROM spy_wallets WHERE crystals >= 100000"
    );
    for (const w of badWallets) {
      const tgId = String(w.telegramId);
      await db.execute("UPDATE spy_wallets SET crystals = 0 WHERE telegramId = ?", [tgId]);
      reportLines.push("• Гаманець ID " + tgId + ": списано -" + String(w.crystals) + " 💎");
    }
  } catch (err) {
    console.error("[Rollback Error]:", err);
    return "❌ Помилка при перевірці бази: " + String(err);
  }

  if (reportLines.length === 0) {
    return "✅ Накручених балансів не знайдено — усі кристали вже списані або в межах реальних покупок.";
  }
  return "🧹 <b>Звіт про списання помилкових кристалів:</b>\n" + reportLines.join("\n");
}

export async function handlePreCheckoutQuery(query: any) {
  await callTelegram("answerPreCheckoutQuery", {
    pre_checkout_query_id: query.id,
    ok: true,
  });
}

export async function handleSuccessfulPayment(message: any) {
  const userId = message.from ? message.from.id : undefined;
  const chatId = message.chat ? message.chat.id : undefined;
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

  if (crystalsAmount > 0 && crystalsAmount <= 50000) {
    const newBalance = await addCrystalsToUser(userId, crystalsAmount);
    if (chatId) {
      await sendBotMessage(
        chatId,
        "💎 Оплата успішна! Нараховано <b>+" + crystalsAmount + " кристалів</b>.\nПоточний баланс: <b>" + newBalance + " 💎</b>",
        { message_thread_id: message.message_thread_id }
      );
    }
  }
}
