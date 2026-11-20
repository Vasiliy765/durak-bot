import { getTelegramInitData } from "./telegram";

export type Player = {
  id: string;
  firstName: string;
  lastName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  ready?: boolean;
  online?: boolean;
  vip?: boolean;
  role?: "spy" | "civilian";
};
export type RoomSettings = {
  name: string;
  maxPlayers: number;
  spyCount: number;
  durationMinutes: number;
  allowRejoin: boolean;
  isPrivate: boolean;
  categories: string[];
  mode: string;
};
export type GameQuestion = { id: string; from: string; fromName: string; to: string; toName: string; text: string; answer?: string; answeredBy?: string; createdAt: number };
export type GameMessage = { id: string; from: string; fromName: string; text: string; createdAt: number };
export type GameRoom = {
  code: string;
  name: string;
  ownerId: string;
  settings: RoomSettings;
  status: "lobby" | "playing" | "voting" | "spy_guess" | "finished";
  players: Player[];
  yourRole?: "spy" | "civilian";
  location?: string;
  categories?: string[];
  activePlayerId?: string;
  startedAt?: number;
  roundEndsAt?: number;
  votingEndsAt?: number;
  questions?: GameQuestion[];
  messages?: GameMessage[];
  votesCast?: number;
  youVoted?: boolean;
  yourVote?: string;
  secretKind?: "location" | "word";
  suspectedName?: string;
  spyGuessTargetId?: string;
  result?: { winner: "spies" | "civilians"; location: string; message: string; reason: string; participants: Player[] };
  roundId?: string;
};

export type ProfileCosmetic = { itemId: string; name: string; category: string; description: string; metadata: Record<string, string | number | boolean> };

export type Profile = {
  telegramId?: string;
  vip?: boolean;
  firstName: string;
  lastName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  gamesPlayed: number;
  wins: number;
  losses: number;
  spyWins: number;
  civilianWins: number;
  rating: number;
  xp: number;
  winStreak: number;
  bestStreak: number;
  achievements: string[];
  equippedCosmetics?: ProfileCosmetic[];
  winRate?: number;
  level?: number;
  periodGames?: number;
  periodWins?: number;
};

export type EconomyOverview = {
  balance: number;
  crystals: number;
  vipUntil: string | null;
  vipActive: boolean;
  settings: { exchange_rate: number; vip_price_crystals: number; salary_coins: number; bonus_coins: number; stars_packages: Array<{ id: string; stars: number; crystals: number }> };
  dailyStreak: number;
  nextSalaryAt: number | null;
  nextDailyAt: number | null;
  salaryReady: boolean;
  dailyReady: boolean;
};
export type ShopItem = {
  itemId: string;
  name: string;
  category: string;
  description: string;
  price: number;
  metadata: Record<string, string | number | boolean>;
};
export type InventoryItem = ShopItem & { equipped: boolean; purchasedAt: string };
export type WalletLeader = { balance: number; vip?: boolean; firstName?: string | null; lastName?: string | null; username?: string | null; avatarUrl?: string | null };

const previewStorageKey = "spy-preview-agent-v1";

export class GameApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "GameApiError";
  }
}

function getPreviewHeaders() {
  let id = sessionStorage.getItem(previewStorageKey);
  if (!id) {
    id = `agent-${crypto.randomUUID().slice(0, 8)}`;
    sessionStorage.setItem(previewStorageKey, id);
  }
  return { "x-preview-player": id };
}

export function rotatePreviewAgent() {
  sessionStorage.setItem(previewStorageKey, `agent-${crypto.randomUUID().slice(0, 8)}`);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  const initData = getTelegramInitData();
  if (initData) headers.set("x-telegram-init-data", initData);
  else if (import.meta.env.DEV) {
    Object.entries(getPreviewHeaders()).forEach(([name, value]) => headers.set(name, value));
  }
  const response = await fetch(`/api/game${path}`, { ...options, headers, credentials: "include" });
  const body = await response.json().catch(() => ({ error: "Некоректна відповідь сервера" }));
  if (!response.ok) throw new GameApiError(body.error || "Не вдалося виконати запит", response.status);
  return body as T;
}

export const gameApi = {
  session: () => request<{ player: Profile; admin: boolean; preview: boolean; categories: string[]; locationCount: number }>("/session"),
  leaderboard: (period = "all", sort = "rating") => request<{ players: Profile[] }>(`/leaderboard?period=${encodeURIComponent(period)}&sort=${encodeURIComponent(sort)}`),
  locations: (mode = "spyfall") => request<{ locations: string[] }>(`/locations/options?mode=${encodeURIComponent(mode)}`),
  publicRooms: () => request<{ rooms: Array<{ code: string; name: string; count: number; maxPlayers: number }> }>("/rooms?public=1"),
  room: (code: string) => request<{ room: GameRoom }>(`/rooms/${encodeURIComponent(code)}`),
  invite: (code: string) => request<{ inviteLink: string | null }>(`/rooms/${encodeURIComponent(code)}/invite`),
  createRoom: (settings: RoomSettings) => request<{ room: GameRoom }>("/rooms", { method: "POST", body: JSON.stringify(settings) }),
  joinRoom: (code: string) => request<{ room: GameRoom }>(`/rooms/${encodeURIComponent(code)}/join`, { method: "POST", body: "{}" }),
  ready: (code: string, ready: boolean) => request<{ room: GameRoom }>(`/rooms/${encodeURIComponent(code)}/ready`, { method: "POST", body: JSON.stringify({ ready }) }),
  updateSettings: (code: string, settings: RoomSettings) => request<{ room: GameRoom }>(`/rooms/${encodeURIComponent(code)}/settings`, { method: "PATCH", body: JSON.stringify(settings) }),
  removePlayer: (code: string, playerId: string) => request<{ room: GameRoom }>(`/rooms/${encodeURIComponent(code)}/players/${encodeURIComponent(playerId)}`, { method: "DELETE" }),
  leave: (code: string) => request<{ success: boolean }>(`/rooms/${encodeURIComponent(code)}/leave`, { method: "POST", body: "{}" }),
  start: (code: string) => request<{ room: GameRoom }>(`/rooms/${encodeURIComponent(code)}/start`, { method: "POST", body: "{}" }),
  ask: (code: string, to: string, text: string) => request<{ room: GameRoom }>(`/rooms/${encodeURIComponent(code)}/questions`, { method: "POST", body: JSON.stringify({ to, text }) }),
  answer: (code: string, questionId: string, answer: string) => request<{ room: GameRoom }>(`/rooms/${encodeURIComponent(code)}/questions/${encodeURIComponent(questionId)}/answer`, { method: "POST", body: JSON.stringify({ answer }) }),
  sendMessage: (code: string, text: string) => request<{ room: GameRoom }>(`/rooms/${encodeURIComponent(code)}/messages`, { method: "POST", body: JSON.stringify({ text }) }),
  startVote: (code: string) => request<{ room: GameRoom }>(`/rooms/${encodeURIComponent(code)}/vote/start`, { method: "POST", body: "{}" }),
  castVote: (code: string, targetId: string) => request<{ room: GameRoom }>(`/rooms/${encodeURIComponent(code)}/vote`, { method: "POST", body: JSON.stringify({ targetId }) }),
  guess: (code: string, secret: string) => request<{ room: GameRoom }>(`/rooms/${encodeURIComponent(code)}/guess`, { method: "POST", body: JSON.stringify({ location: secret, secret }) }),
  admin: <T>(path: string, options: RequestInit = {}) => request<T>(`/admin${path}`, options),
  economyOverview: () => request<EconomyOverview>("/economy/overview"),
  shopItems: () => request<{ items: ShopItem[] }>("/economy/shop"),
  inventory: () => request<{ items: InventoryItem[] }>("/economy/inventory"),
  coinLeaderboard: () => request<{ players: WalletLeader[] }>("/economy/top?limit=25"),
  claimSalary: () => request<{ claimed: boolean; amount: number; balance: number; remainingMs: number }>("/economy/salary", { method: "POST", body: "{}" }),
  claimDaily: () => request<{ claimed: boolean; amount: number; baseAmount?: number; balance: number; streak: number; streakBonus: number; remainingMs: number }>("/economy/daily", { method: "POST", body: "{}" }),
  createStarsInvoice: (packageId: string) => request<{ invoiceUrl: string; orderId: string }>("/economy/stars/invoice", { method: "POST", body: JSON.stringify({ packageId }) }),
  exchangeCrystals: (crystals: number) => request<{ balance: number; crystals: number; receivedCoins: number }>("/economy/exchange", { method: "POST", body: JSON.stringify({ crystals }) }),
  buyVip: () => request<{ crystals: number; vipUntil: string }>("/economy/vip", { method: "POST", body: "{}" }),
  economyAdmin: <T>(path: string, options: RequestInit = {}) => request<T>(`/economy/admin${path}`, options),
  purchaseItem: (itemId: string) => request<{ success: boolean; alreadyOwned: boolean; balance: number; itemId: string }>("/economy/purchase", { method: "POST", body: JSON.stringify({ itemId }) }),
  equipItem: (itemId: string) => request<{ success: boolean; itemId: string; category: string }>("/economy/equip", { method: "POST", body: JSON.stringify({ itemId }) }),
};
