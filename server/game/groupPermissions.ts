import { deleteChatMessage } from "./telegramApi";

// Список активних учасників поточної гри для кожного чату: chatId -> Set<userId>
const activeGamePlayers = new Map<number, Set<number>>();

export function setActivePlayers(chatId: number, playerIds: number[]) {
  activeGamePlayers.set(chatId, new Set(playerIds));
}

export function clearActiveGame(chatId: number) {
  activeGamePlayers.delete(chatId);
}

export function isPlayerInActiveGame(chatId: number, userId: number): boolean {
  const players = activeGamePlayers.get(chatId);
  if (!players || players.size === 0) return true; // Якщо гра не йде — нікого не чіпаємо
  return players.has(userId);
}

/**
 * 3) БЕЗ 30-ХВИЛИННОГО БАНУ:
 * Якщо в чаті триває гра і пише користувач, який не грає — просто видаляємо його повідомлення.
 */
export async function enforceNonPlayerMessageDelete(
  chatId: number,
  userId: number | undefined,
  messageId: number
): Promise<boolean> {
  if (!userId) return false;
  const players = activeGamePlayers.get(chatId);
  if (!players || players.size === 0) return false;

  if (!players.has(userId)) {
    await deleteChatMessage(chatId, messageId);
    return true;
  }
  return false;
}
