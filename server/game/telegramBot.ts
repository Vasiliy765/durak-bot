import { sendBotMessage, setBotsTopicThread } from "./telegramApi";
import { enforceNonPlayerMessageDelete } from "./groupPermissions";
import { handlePreCheckoutQuery, handleSuccessfulPayment } from "./economy";

const FIVE_MINUTES_SEC = 5 * 60;

export async function processTelegramUpdate(update: any) {
  // 1. Підтвердження оплати Telegram Stars
  if (update.pre_checkout_query) {
    await handlePreCheckoutQuery(update.pre_checkout_query);
    return;
  }

  const msg = update.message;
  if (!msg) return;

  const chatId: number = msg.chat.id;
  const userId: number | undefined = msg.from?.id;
  const threadId: number | undefined = msg.message_thread_id;
  const text: string = (msg.text || "").trim();
  const lowerText = text.toLowerCase();

  // 2. Успішна оплата Telegram Stars -> зарахування кристалів
  if (msg.successful_payment) {
    await handleSuccessfulPayment(msg);
    return;
  }

  // 3. Якщо йде гра в групі, видаляємо повідомлення від тих, хто НЕ грає (без бану!)
  if (msg.chat.type === "group" || msg.chat.type === "supergroup") {
    const wasDeleted = await enforceNonPlayerMessageDelete(chatId, userId, msg.message_id);
    if (wasDeleted) return;
  }

  // 4. Автоматично запам'ятовуємо гілку "Боти", якщо бот отримав команду в гілці
  if (threadId && text.startsWith("/")) {
    setBotsTopicThread(chatId, threadId);
  }

  if (lowerText.startsWith("/set_bots_topic") && threadId) {
    setBotsTopicThread(chatId, threadId);
    await sendBotMessage(chatId, "✅ Цю гілку закріплено для відповідей бота («Боти»).", {
      message_thread_id: threadId,
      autoDeleteSeconds: FIVE_MINUTES_SEC,
    });
    return;
  }

  // 5. Команди Балансу та ЗП — відповідь у поточну/закріплену гілку + автовидалення через 5 хвилин
  if (lowerText === "баланс" || lowerText.startsWith("/balance")) {
    await sendBotMessage(chatId, "💎 Перевірити та поповнити баланс можна у Mini App.", {
      message_thread_id: threadId,
      autoDeleteSeconds: FIVE_MINUTES_SEC,
    });
    return;
  }

  if (lowerText === "зп"  lowerText === "зарплата"  lowerText.startsWith("/zp")) {
    await sendBotMessage(chatId, "💰 Щоденна нагорода (ЗП) доступна у Mini App.", {
      message_thread_id: threadId,
      autoDeleteSeconds: FIVE_MINUTES_SEC,
    });
    return;
  }
}
