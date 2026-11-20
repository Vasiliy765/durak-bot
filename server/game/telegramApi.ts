const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const API_BASE = ["https://", "api", ".telegram.org/bot", BOT_TOKEN].join("");

const botsTopicThreads = new Map<number, number>();

export function setBotsTopicThread(chatId: number, threadId: number) {
  botsTopicThreads.set(chatId, threadId);
}

export function getBotsTopicThread(chatId: number): number | undefined {
  if (process.env.BOTS_TOPIC_THREAD_ID) {
    return Number(process.env.BOTS_TOPIC_THREAD_ID);
  }
  return botsTopicThreads.get(chatId);
}

export async function callTelegram<T = any>(method: string, payload: Record<string, any>): Promise<T> {
  const res = await fetch(${API_BASE}/${method}, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.ok) {
    console.error([Telegram API ${method}] Error:, data.description);
  }
  return data;
}

export async function deleteChatMessage(chatId: number, messageId: number) {
  return callTelegram("deleteMessage", {
    chat_id: chatId,
    message_id: messageId,
  });
}

/**
 * Відправка повідомлення у гілку (тему) + опціональне автовидалення через N секунд (за замовчуванням 5 хв для сервісних відповідей)
 */
export async function sendBotMessage(
  chatId: number,
  text: string,
  options: Record<string, any> & { autoDeleteSeconds?: number } = {}
) {
  const { autoDeleteSeconds, ...tgOptions } = options;
  const threadId = tgOptions.message_thread_id ?? getBotsTopicThread(chatId);

  const response: any = await callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...(threadId ? { message_thread_id: threadId } : {}),
    ...tgOptions,
  });

  if (autoDeleteSeconds && response?.ok && response?.result?.message_id) {
    const sentMessageId = response.result.message_id;
    setTimeout(() => {
      deleteChatMessage(chatId, sentMessageId).catch(() => {});
    }, autoDeleteSeconds * 1000);
  }

  return response;
}
