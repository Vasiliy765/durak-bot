import { sendBotMessage, setBotsTopicThread } from "./telegramApi";
import { enforceNonPlayerMessageDelete } from "./groupPermissions";
import { handlePreCheckoutQuery, handleSuccessfulPayment } from "./economy";

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
  const text: string = msg.text || "";

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

  // 4. Автоматично запам'ятовуємо тему "Боти", якщо бот отримав команду в темі форуму
  if (msg.message_thread_id && text.startsWith("/")) {
    setBotsTopicThread(chatId, msg.message_thread_id);
  }

  // Команда прив'язки теми вручну: /set_bots_topic
  if (text.startsWith("/set_bots_topic") && msg.message_thread_id) {
    setBotsTopicThread(chatId, msg.message_thread_id);
    await sendBotMessage(chatId, "✅ Цю тему закріплено для відповідей бота («Боти»).");
  }
}
