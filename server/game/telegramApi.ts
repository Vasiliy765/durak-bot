const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const API_BASE = https://api.telegram.org// Зберігаємо ID теми "Боти" для кожного чату (можна також задати через ENV)
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

/**
 * 1) Відправка повідомлення з автоматичною прив'язкою до теми "Боти" (message_thread_id)
 */
export async function sendBotMessage(
  chatId: number,
  text: string,
  options: Record<string, any> = {}
) {
  const threadId = options.message_thread_id ?? getBotsTopicThread(chatId);
  return callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...(threadId ? { message_thread_id: threadId } : {}),
    ...options,
  });
}

export async function deleteChatMessage(chatId: number, messageId: number) {
  return callTelegram("deleteMessage", {
    chat_id: chatId,
    message_id: messageId,
  });
}
