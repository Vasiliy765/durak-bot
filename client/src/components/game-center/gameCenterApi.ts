import { getTelegramInitData } from "@/lib/telegram";

export type ArcadeGameId = "battleship" | "durak" | "tic_tac_toe";
export type TablePlayer = {
  id: string;
  name?: string;
  nick?: string;
  avatarUrl?: string | null;
  vip?: boolean;
  ready?: boolean;
  owner?: boolean;
  status?: string;
  online?: boolean;
  handCount?: number;
};
export type GameTable = {
  id: string;
  gameId: ArcadeGameId;
  name?: string;
  stake: number;
  minPlayers: number;
  maxPlayers: number;
  visibility: "public" | "private";
  status: string;
  players: TablePlayer[];
  ownerId: string;
  inviteToken?: string;
  inviteLink?: string;
  options?: Record<string, unknown>;
  projection?: unknown;
  state?: unknown;
  bank?: number;
  turnEndsAt?: number | string | null;
  isOwner?: boolean;
  myPlayerId?: string;
  result?: unknown;
  events?: unknown[];
  version?: number;
};
export type GameCenterConfig = {
  games: Array<{
    id: ArcadeGameId;
    enabled: boolean;
    name?: string;
    minPlayers?: number;
    maxPlayers?: number;
    playerCounts?: number[];
    options?: Record<string, unknown>;
  }>;
  stakeOptions: number[];
  minStake: number;
  maxStake: number;
  limits?: Record<string, unknown>;
};
export class GameCenterApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "GameCenterApiError";
  }
}
const previewKey = "spy-preview-agent-v1";
function previewHeaders() {
  let id = sessionStorage.getItem(previewKey);
  if (!id) {
    id = `agent-${crypto.randomUUID().slice(0, 8)}`;
    sessionStorage.setItem(previewKey, id);
  }
  return { "x-preview-player": id };
}
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const initData = getTelegramInitData();
  if (initData) headers.set("x-telegram-init-data", initData);
  else if (import.meta.env.DEV)
    Object.entries(previewHeaders()).forEach(([k, v]) => headers.set(k, v));
  const res = await fetch(`/api/game-center${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  const body = await res
    .json()
    .catch(() => ({ error: "Некоректна відповідь сервера" }));
  if (!res.ok)
    throw new GameCenterApiError(
      body.error || "Не вдалося виконати запит",
      res.status
    );
  return body as T;
}
const json = (body?: unknown): RequestInit => ({
  method: "POST",
  body: JSON.stringify(body ?? {}),
});
export const gameCenterApi = {
  config: () => request<GameCenterConfig>("/config"),
  publicTables: (gameId?: string, stake?: number) =>
    request<{ tables: GameTable[] }>(
      `/tables/public?${new URLSearchParams({ ...(gameId ? { gameId } : {}), ...(stake ? { stake: String(stake) } : {}) })}`
    ),
  mine: () => request<{ tables: GameTable[] }>("/tables/mine"),
  active: () => request<{ table: GameTable | null }>("/tables/active"),
  create: (input: {
    gameId: string;
    name: string;
    stake: number;
    minPlayers: number;
    maxPlayers: number;
    visibility: "public" | "private";
    options: Record<string, unknown>;
    requestId: string;
  }) => request<{ table: GameTable }>("/tables", json(input)),
  table: (id: string) =>
    request<{ table: GameTable }>(`/tables/${encodeURIComponent(id)}`),
  invite: (token: string) =>
    request<{ table: GameTable }>(`/invites/${encodeURIComponent(token)}`),
  join: (id: string, inviteToken?: string) =>
    request<{ table: GameTable }>(
      `/tables/${encodeURIComponent(id)}/join`,
      json(inviteToken ? { inviteToken } : {})
    ),
  leave: (id: string) =>
    request<{ table?: GameTable }>(
      `/tables/${encodeURIComponent(id)}/leave`,
      json()
    ),
  ready: (id: string, ready: boolean) =>
    request<{ table: GameTable }>(
      `/tables/${encodeURIComponent(id)}/ready`,
      json({ ready })
    ),
  kick: (id: string, playerId: string) =>
    request<{ table: GameTable }>(
      `/tables/${encodeURIComponent(id)}/kick`,
      json({ playerId })
    ),
  cancel: (id: string) =>
    request<{ table?: GameTable }>(
      `/tables/${encodeURIComponent(id)}/cancel`,
      json()
    ),
  start: (id: string) =>
    request<{ table: GameTable }>(
      `/tables/${encodeURIComponent(id)}/start`,
      json()
    ),
  action: (id: string, actionId: string, action: unknown) =>
    request<{ table: GameTable }>(
      `/tables/${encodeURIComponent(id)}/action`,
      json({ actionId, action })
    ),
  reaction: (id: string, emoji: string) =>
    request<{ table: GameTable }>(
      `/tables/${encodeURIComponent(id)}/reaction`,
      json({ emoji })
    ),
  reactionSocketTicket: (id: string) =>
    request<{ ticket: string }>(
      `/tables/${encodeURIComponent(id)}/reaction-socket-ticket`,
      json()
    ),
  openReactionSocket: (ticket: string) => {
    const url = new URL("/api/game-center/reactions", window.location.href);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.searchParams.set("ticket", ticket);
    return new WebSocket(url);
  },
  heartbeat: (id: string) =>
    request<{ table: GameTable }>(
      `/tables/${encodeURIComponent(id)}/heartbeat`,
      json()
    ),
  leaderboard: (gameId?: string) =>
    request<{ players: unknown[] }>(
      `/leaderboard${gameId ? `?gameId=${encodeURIComponent(gameId)}` : ""}`
    ),
  dispute: (id: string, details: string) =>
    request<{ success: boolean }>(
      `/tables/${encodeURIComponent(id)}/disputes`,
      json({ details })
    ),
};
