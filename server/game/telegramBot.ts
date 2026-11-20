import { sendBotMessage, setBotsTopicThread } from "./telegramApi";
import { enforceNonPlayerMessageDelete } from "./groupPermissions";
import { handlePreCheckoutQuery, handleSuccessfulPayment, rollbackBuggedCrystals } from "./economy";
import { getOrCreateUser } from "./userStore";

const FIVE_MINUTES_SEC = 5 * 60;
const ONE_HOUR_MS = 60 * 60 * 1000;
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
  const firstName: string = msg.from && msg.from.first_name ? msg.from.first_name : "Гравець";
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

  // Реальний баланс у чаті (видаляється через 5 хв)
  if (userId && (["баланс", "/balance"].includes(lowerText) || lowerText.startsWith("/balance@"))) {
    const u = getOrCreateUser(userId);
    await sendBotMessage(
      chatId,
      "👤 <b>" + firstName + "</b>, твій баланс:\n🪙 Монети: <b>" + u.coins + "</b>\n💎 Кристали: <b>" + u.crystals + "</b>",
      {
        message_thread_id: threadId,
        autoDeleteSeconds: FIVE_MINUTES_SEC,
      }
    );
    return;
  }

  // Реальна видача ЗП прямо в чаті (раз на годину, видаляється через 5 хв)
  if (userId && (["зп", "зарплата", "/zp"].includes(lowerText) || lowerText.startsWith("/zp@"))) {
    const u = getOrCreateUser(userId);
    const now = Date.now();
    if (now - u.lastSalary < ONE_HOUR_MS) {
      const minsLeft = Math.ceil((u.lastSalary + ONE_HOUR_MS - now) / 60000);
      await sendBotMessage(
        chatId,
        "⏳ <b>" + firstName + "</b>, ти вже отримував ЗП.\nНаступна зарплата через <b>" + minsLeft + " хв</b>.",
        {
          message_thread_id: threadId,
          autoDeleteSeconds: FIVE_MINUTES_SEC,
        }
      );
      return;
    }

    const reward = 150;
    u.lastSalary = now;
    u.coins += reward;
    await sendBotMessage(
      chatId,
      "💰 <b>" + firstName + "</b>, ти отримав зарплату <b>+" + reward + " 🪙</b>!\nПоточний баланс: <b>" + u.coins + " 🪙</b> | <b>" + u.crystals + " 💎</b>",
      {
        message_thread_id: threadId,
        autoDeleteSeconds: FIVE_MINUTES_SEC,
      }
    );
    return;
  }
}
