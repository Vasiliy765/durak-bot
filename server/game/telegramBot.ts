import { sendBotMessage, setBotsTopicThread } from "./telegramApi";
import { enforceNonPlayerMessageDelete } from "./groupPermissions";
import { handlePreCheckoutQuery, handleSuccessfulPayment, rollbackBuggedCrystals } from "./economy";

const FIVE_MINUTES_SEC = 5 * 60;
const WEBAPP_URL = process.env.WEBAPP_URL ? process.env.WEBAPP_URL : "https://mistral.run";

export async function processTelegramUpdate(update: any) {
  if (update.pre_checkout_query) {
    await handlePreCheckoutQuery(update.pre_checkout_query);
    return;
  }

  const msg = update.message;
  if (!msg) return;

  const chatId: number = msg.chat.id;
  const userId: number | undefined = msg.from ? msg.from.id : undefined;
  const threadId: number | undefined = msg.message_thread_id;
  const text: string = (msg.text ? msg.text : "").trim();
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
      "🕵️‍♂️ <b>Ігровий центр готовий!</b>\nНатисни кнопку нижче, щоб відкрити гру:",
      {
        message_thread_id: threadId,
        reply_markup: {
          inline_keyboard: [[{ text: "🎮 Відкрити гру", web_app: { url: WEBAPP_URL } }]],
        },
      }
    );
    return;
  }

  if (lowerText.startsWith("/set_bots_topic") && threadId) {
    setBotsTopicThread(chatId, threadId);
    await sendBotMessage(chatId, "✅ Цю гілку закріплено для відповідей бота («Боти»).", {
      message_thread_id: threadId,
      autoDeleteSeconds: FIVE_MINUTES_SEC,
    });
    return;
  }

  if (["баланс", "/balance"].includes(lowerText) || lowerText.startsWith("/balance@")) {
    await sendBotMessage(chatId, "💎 Перевірити та поповнити баланс можна у Mini App.", {
      message_thread_id: threadId,
      autoDeleteSeconds: FIVE_MINUTES_SEC,
    });
    return;
  }

  if (["зп", "зарплата", "/zp"].includes(lowerText) || lowerText.startsWith("/zp@")) {
    await sendBotMessage(chatId, "💰 Щоденна нагорода (ЗП) доступна у Mini App.", {
      message_thread_id: threadId,
      autoDeleteSeconds: FIVE_MINUTES_SEC,
    });
    return;
  }
}
