import { boolean, index, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  telegramId: varchar("telegramId", { length: 64 }).unique(),
  username: varchar("username", { length: 100 }),
  coins: int("coins").default(0).notNull(),
  crystals: int("crystals").default(0).notNull(),
  vipUntil: timestamp("vip_until"),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const spyProfiles = mysqlTable("spy_profiles", {
  telegramId: varchar("telegramId", { length: 64 }).primaryKey(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }),
  username: varchar("username", { length: 100 }),
  avatarUrl: text("avatarUrl"),
  gamesPlayed: int("gamesPlayed").default(0).notNull(),
  wins: int("wins").default(0).notNull(),
  losses: int("losses").default(0).notNull(),
  spyWins: int("spyWins").default(0).notNull(),
  civilianWins: int("civilianWins").default(0).notNull(),
  spiesCaught: int("spiesCaught").default(0).notNull(),
  rating: int("rating").default(1000).notNull(),
  xp: int("xp").default(0).notNull(),
  winStreak: int("winStreak").default(0).notNull(),
  bestStreak: int("bestStreak").default(0).notNull(),
  achievements: json("achievements").$type<string[]>().notNull(),
  blocked: boolean("blocked").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const spyRooms = mysqlTable("spy_rooms", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 8 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  ownerId: varchar("ownerId", { length: 64 }).notNull(),
  isPrivate: boolean("isPrivate").default(true).notNull(),
  maxPlayers: int("maxPlayers").notNull(),
  spyCount: int("spyCount").notNull(),
  durationMinutes: int("durationMinutes").notNull(),
  allowRejoin: boolean("allowRejoin").default(true).notNull(),
  categories: json("categories").$type<string[]>().notNull(),
  mode: varchar("mode", { length: 32 }).default("spyfall").notNull(),
  status: mysqlEnum("status", ["lobby", "playing", "voting", "spy_guess", "finished"]).default("lobby").notNull(),
  state: json("state").$type<Record<string, unknown>>().notNull(),
  version: int("version").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const spyLocations = mysqlTable("spy_locations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 140 }).notNull().unique(),
  category: varchar("category", { length: 80 }).notNull(),
  active: boolean("active").default(true).notNull(),
});

export const spyCategories = mysqlTable("spy_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 80 }).notNull().unique(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const spyGameConfig = mysqlTable("spy_game_config", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: json("value").$type<number>().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const spySystemErrors = mysqlTable("spy_system_errors", {
  id: int("id").autoincrement().primaryKey(),
  method: varchar("method", { length: 12 }).notNull(),
  route: varchar("route", { length: 180 }).notNull(),
  message: varchar("message", { length: 500 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const spyGames = mysqlTable("spy_games", {
  roundId: varchar("roundId", { length: 64 }).primaryKey(),
  roomCode: varchar("roomCode", { length: 8 }).notNull(),
  roomName: varchar("roomName", { length: 100 }).notNull(),
  mode: varchar("mode", { length: 32 }).notNull(),
  winner: mysqlEnum("winner", ["spies", "civilians"]).notNull(),
  location: varchar("location", { length: 140 }).notNull(),
  participants: json("participants").$type<Array<{ id: string; name: string; role: "spy" | "civilian"; votedForSpy: boolean }>>().notNull(),
  durationSeconds: int("durationSeconds").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Global wallet per verified Telegram ID. */
export const spyWallets = mysqlTable("spy_wallets", {
  telegramId: varchar("telegramId", { length: 64 }).primaryKey(),
  balance: int("balance").default(0).notNull(),
  crystals: int("crystals").default(0).notNull(),
  vipUntil: timestamp("vipUntil"),
  lastSalaryAt: timestamp("lastSalaryAt"),
  lastDailyAt: timestamp("lastDailyAt"),
  dailyStreak: int("dailyStreak").default(0).notNull(),
  gameRewardsDate: varchar("gameRewardsDate", { length: 10 }),
  gameRewardsToday: int("gameRewardsToday").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Append-only transaction history; idempotencyKey prevents duplicate rewards and purchases. */
export const spyEconomyLedger = mysqlTable("spy_economy_ledger", {
  id: int("id").autoincrement().primaryKey(),
  telegramId: varchar("telegramId", { length: 64 }).notNull(),
  kind: varchar("kind", { length: 40 }).notNull(),
  currency: varchar("currency", { length: 16 }).default("coins").notNull(),
  amount: int("amount").notNull(),
  balanceAfter: int("balanceAfter").notNull(),
  idempotencyKey: varchar("idempotencyKey", { length: 140 }).notNull().unique(),
  referenceId: varchar("referenceId", { length: 100 }),
  note: varchar("note", { length: 240 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  userHistory: index("spy_economy_user_history_idx").on(table.telegramId, table.createdAt),
}));

/** Editable server-owned pricing and rewards; never accept a client price. */
export const economySettings = mysqlTable("economy_settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: json("value").$type<unknown>().notNull(),
  updatedBy: varchar("updatedBy", { length: 64 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Idempotent Telegram Stars invoice/order record; successful charge IDs are durable. */
export const spyStarsOrders = mysqlTable("spy_stars_orders", {
  id: varchar("id", { length: 64 }).primaryKey(),
  telegramId: varchar("telegramId", { length: 64 }).notNull(),
  packageId: varchar("packageId", { length: 32 }).notNull(),
  stars: int("stars").notNull(),
  crystals: int("crystals").notNull(),
  status: mysqlEnum("status", ["pending", "paid", "cancelled"]).default("pending").notNull(),
  chargeId: varchar("chargeId", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  paidAt: timestamp("paidAt"),
}, table => ({
  telegramLookup: index("spy_stars_orders_user_idx").on(table.telegramId, table.createdAt),
  chargeUnique: uniqueIndex("spy_stars_orders_charge_uq").on(table.chargeId),
}));

/** Seeded, server-priced cosmetic catalog. */
export const spyShopItems = mysqlTable("spy_shop_items", {
  itemId: varchar("itemId", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  category: varchar("category", { length: 32 }).notNull(),
  description: varchar("description", { length: 240 }).notNull(),
  price: int("price").notNull(),
  metadata: json("metadata").$type<Record<string, string | number | boolean>>().notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const spyInventory = mysqlTable("spy_inventory", {
  id: int("id").autoincrement().primaryKey(),
  telegramId: varchar("telegramId", { length: 64 }).notNull(),
  itemId: varchar("itemId", { length: 64 }).notNull(),
  equipped: boolean("equipped").default(false).notNull(),
  purchasedAt: timestamp("purchasedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  userItem: uniqueIndex("spy_inventory_user_item_uq").on(table.telegramId, table.itemId),
  userLookup: index("spy_inventory_user_idx").on(table.telegramId),
}));

/** Durable single active session per Telegram group/supergroup. */
export const spyGroupGames = mysqlTable("spy_group_games", {
  chatId: varchar("chatId", { length: 64 }).primaryKey(),
  chatType: mysqlEnum("chatType", ["group", "supergroup"]).notNull(),
  chatTitle: varchar("chatTitle", { length: 160 }).notNull(),
  hostId: varchar("hostId", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["lobby", "playing", "voting", "spy_guess", "finished", "cancelled"]).default("lobby").notNull(),
  roundId: varchar("roundId", { length: 64 }).notNull(),
  lobbyMessageId: int("lobbyMessageId"),
  roundStartedAt: timestamp("roundStartedAt"),
  roundEndsAt: timestamp("roundEndsAt"),
  state: json("state").$type<Record<string, unknown>>().notNull(),
  version: int("version").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  statusDeadline: index("spy_group_status_deadline_idx").on(table.status, table.roundEndsAt),
}));

/** Snapshot only users actually restricted by soft spectator protection. */
export const spyGroupPermissionSnapshots = mysqlTable("spy_group_permission_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  chatId: varchar("chatId", { length: 64 }).notNull(),
  roundId: varchar("roundId", { length: 64 }).notNull(),
  telegramId: varchar("telegramId", { length: 64 }).notNull(),
  originalStatus: varchar("originalStatus", { length: 24 }).notNull(),
  originalSnapshot: json("originalSnapshot").$type<Record<string, unknown>>().notNull(),
  appliedPermissions: json("appliedPermissions").$type<Record<string, boolean>>().notNull(),
  restoreStatus: mysqlEnum("restoreStatus", ["captured", "applied", "restoring", "restored", "conflict", "failed"]).default("captured").notNull(),
  restoreAttempts: int("restoreAttempts").default(0).notNull(),
  lastError: varchar("lastError", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  userPerRound: uniqueIndex("spy_group_permission_round_user_uq").on(table.chatId, table.roundId, table.telegramId),
  restoreQueue: index("spy_group_permission_restore_idx").on(table.restoreStatus, table.updatedAt),
}));

/** Webhook update ledger for replay-safe processing across process restarts. */
export const spyTelegramUpdates = mysqlTable("spy_telegram_updates", {
  updateId: varchar("updateId", { length: 32 }).primaryKey(),
  status: mysqlEnum("status", ["processing", "done", "failed"]).default("processing").notNull(),
  attempts: int("attempts").default(1).notNull(),
  lastError: varchar("lastError", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Durable group wager state; balances remain exclusively in spy_wallets. */
export const spyChatWagers = mysqlTable("spy_chat_wagers", {
  id: varchar("id", { length: 36 }).primaryKey(),
  chatId: varchar("chatId", { length: 64 }).notNull(),
  messageId: int("messageId").notNull(),
  sourceMessageId: int("sourceMessageId").notNull(),
  game: mysqlEnum("game", ["coin", "dice"]).notNull(),
  status: mysqlEnum("status", ["pending", "rolling", "resolved", "refunded", "expired"]).default("pending").notNull(),
  challengerId: varchar("challengerId", { length: 64 }).notNull(),
  opponentId: varchar("opponentId", { length: 64 }),
  stake: int("stake").notNull(),
  escrowed: boolean("escrowed").default(false).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  round: int("round").default(0).notNull(),
  failureCount: int("failureCount").default(0).notNull(),
  challengerRoll: int("challengerRoll"),
  opponentRoll: int("opponentRoll"),
  winnerId: varchar("winnerId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  sourceMessage: uniqueIndex("spy_chat_wager_source_uq").on(table.chatId, table.sourceMessageId),
  statusDeadline: index("spy_chat_wager_status_deadline_idx").on(table.status, table.expiresAt),
  chatStatus: index("spy_chat_wager_chat_status_idx").on(table.chatId, table.status),
}));

/** Conserved reserve for the 5% commission from group chat wagers. */
export const spyChatWagerBank = mysqlTable("spy_chat_wager_bank", {
  id: int("id").primaryKey(),
  balance: int("balance").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Append-only, one-row-per-wager record of commission accumulated by the reserve. */
export const spyChatWagerBankLedger = mysqlTable("spy_chat_wager_bank_ledger", {
  id: int("id").autoincrement().primaryKey(),
  wagerId: varchar("wagerId", { length: 36 }).notNull(),
  amount: int("amount").notNull(),
  balanceAfter: int("balanceAfter").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  wager: uniqueIndex("spy_chat_wager_bank_wager_uq").on(table.wagerId),
  created: index("spy_chat_wager_bank_ledger_created_idx").on(table.createdAt),
}));

/** Server-authoritative Mini App tables for the four new arcade games. */
export const gameTables = mysqlTable("game_tables", {
  id: varchar("id", { length: 36 }).primaryKey(),
  ownerId: varchar("ownerId", { length: 64 }).notNull(),
  gameId: mysqlEnum("gameId", ["battleship", "durak", "blackjack", "tic_tac_toe"]).notNull(),
  status: mysqlEnum("status", ["lobby", "playing", "finished", "cancelled"]).default("lobby").notNull(),
  visibility: mysqlEnum("visibility", ["public", "private"]).default("public").notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  stake: int("stake").notNull(),
  minPlayers: int("minPlayers").notNull(),
  maxPlayers: int("maxPlayers").notNull(),
  options: json("options").$type<Record<string, unknown>>().notNull(),
  state: json("state").$type<Record<string, unknown>>().notNull(),
  inviteToken: varchar("inviteToken", { length: 64 }).notNull(),
  createRequestId: varchar("createRequestId", { length: 64 }).notNull(),
  version: int("version").default(1).notNull(),
  lobbyExpiresAt: timestamp("lobbyExpiresAt"),
  startedAt: timestamp("startedAt"),
  endedAt: timestamp("endedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  createRequest: uniqueIndex("game_table_create_req_uq").on(table.ownerId, table.createRequestId),
  invite: uniqueIndex("game_table_invite_token_uq").on(table.inviteToken),
  gameStatus: index("game_table_game_status_idx").on(table.gameId, table.status, table.createdAt),
  ownerStatus: index("game_table_owner_status_idx").on(table.ownerId, table.status),
}));

/** One authoritative active Arcade room pointer per Telegram player; history remains in game_tables. */
export const gamePlayerActiveRooms = mysqlTable("game_player_active_rooms", {
  telegramId: varchar("telegramId", { length: 64 }).primaryKey(),
  activeRoomId: varchar("active_room_id", { length: 36 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** One durable seat per user/table; left seats may be reactivated before start. */
export const gameTablePlayers = mysqlTable("game_table_players", {
  id: int("id").autoincrement().primaryKey(),
  tableId: varchar("tableId", { length: 36 }).notNull(),
  telegramId: varchar("telegramId", { length: 64 }).notNull(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }),
  username: varchar("username", { length: 100 }),
  avatarUrl: text("avatarUrl"),
  seat: int("seat").notNull(),
  ready: boolean("ready").default(false).notNull(),
  status: mysqlEnum("status", ["active", "left", "winner", "loser", "draw", "forfeit"]).default("active").notNull(),
  contribution: int("contribution").default(0).notNull(),
  lastSeenAt: timestamp("lastSeenAt"),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
}, table => ({
  tableUser: uniqueIndex("game_table_user_uq").on(table.tableId, table.telegramId),
  tableSeat: uniqueIndex("game_table_seat_uq").on(table.tableId, table.seat),
  userStatus: index("game_table_user_status_idx").on(table.telegramId, table.status),
}));

/** Append-only non-secret event records for replay-safe moves and audit. */
export const gameTableEvents = mysqlTable("game_table_events", {
  id: int("id").autoincrement().primaryKey(),
  tableId: varchar("tableId", { length: 36 }).notNull(),
  sequence: int("sequence").notNull(),
  actionId: varchar("actionId", { length: 80 }).notNull(),
  actorId: varchar("actorId", { length: 64 }).notNull(),
  eventType: varchar("eventType", { length: 40 }).notNull(),
  publicPayload: json("publicPayload").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  tableSequence: uniqueIndex("game_table_event_seq_uq").on(table.tableId, table.sequence),
  tableAction: uniqueIndex("game_table_action_uq").on(table.tableId, table.actionId),
  tableHistory: index("game_table_event_history_idx").on(table.tableId, table.createdAt),
}));

export const gameTableResults = mysqlTable("game_table_results", {
  tableId: varchar("tableId", { length: 36 }).primaryKey(),
  gameId: mysqlEnum("gameId", ["battleship", "durak", "blackjack", "tic_tac_toe"]).notNull(),
  winnerIds: json("winnerIds").$type<string[]>().notNull(),
  outcome: json("outcome").$type<Record<string, unknown>>().notNull(),
  totalPot: int("totalPot").notNull(),
  payouts: json("payouts").$type<Record<string, number>>().notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
}, table => ({
  gameCompleted: index("game_table_result_game_date_idx").on(table.gameId, table.completedAt),
}));

export const gamePlayerStats = mysqlTable("game_player_stats", {
  id: int("id").autoincrement().primaryKey(),
  telegramId: varchar("telegramId", { length: 64 }).notNull(),
  gameId: mysqlEnum("gameId", ["battleship", "durak", "blackjack", "tic_tac_toe"]).notNull(),
  gamesPlayed: int("gamesPlayed").default(0).notNull(),
  wins: int("wins").default(0).notNull(),
  losses: int("losses").default(0).notNull(),
  draws: int("draws").default(0).notNull(),
  netCoins: int("netCoins").default(0).notNull(),
  biggestWin: int("biggestWin").default(0).notNull(),
  rating: int("rating").default(1000).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  userGame: uniqueIndex("game_player_stats_user_game_uq").on(table.telegramId, table.gameId),
  gameRating: index("game_player_stats_rating_idx").on(table.gameId, table.rating),
}));

export const gameTableDisputes = mysqlTable("game_table_disputes", {
  id: int("id").autoincrement().primaryKey(),
  tableId: varchar("tableId", { length: 36 }).notNull(),
  reportedBy: varchar("reportedBy", { length: 64 }).notNull(),
  details: varchar("details", { length: 1000 }).notNull(),
  status: mysqlEnum("status", ["open", "reviewing", "resolved", "rejected"]).default("open").notNull(),
  reviewedBy: varchar("reviewedBy", { length: 64 }),
  resolution: varchar("resolution", { length: 1000 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  statusCreated: index("game_table_dispute_status_idx").on(table.status, table.createdAt),
  tableCreated: index("game_table_dispute_table_idx").on(table.tableId, table.createdAt),
}));

export const gameCenterConfig = mysqlTable("game_center_config", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: json("value").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/** Conserved shared reserve used only for Blackjack bank-capped payouts. */
export const gameCenterBank = mysqlTable("game_center_bank", {
  id: varchar("id", { length: 32 }).primaryKey(),
  balance: int("balance").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/** Append-only record of net reserve movements; one settlement movement per table. */
export const gameCenterBankLedger = mysqlTable("game_center_bank_ledger", {
  id: int("id").autoincrement().primaryKey(),
  tableId: varchar("tableId", { length: 36 }).notNull(),
  kind: varchar("kind", { length: 32 }).notNull(),
  amount: int("amount").notNull(),
  balanceAfter: int("balanceAfter").notNull(),
  idempotencyKey: varchar("idempotencyKey", { length: 128 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  settlement: uniqueIndex("game_center_bank_settlement_uq").on(table.tableId),
  idempotency: uniqueIndex("game_center_bank_idempotency_uq").on(table.idempotencyKey),
  created: index("game_center_bank_ledger_created_idx").on(table.createdAt),
}));
export type User = typeof users.$inferSelect;
export type GroupGameStatus = typeof spyGroupGames.$inferSelect["status"];
export type InsertUser = typeof users.$inferInsert;
export type SpyProfile = typeof spyProfiles.$inferSelect;
export type SpyRoom = typeof spyRooms.$inferSelect;
export type SpyGame = typeof spyGames.$inferSelect;
export type SpyWallet = typeof spyWallets.$inferSelect;
export type SpyGroupGame = typeof spyGroupGames.$inferSelect;
export type GameTable = typeof gameTables.$inferSelect;
export type GameTablePlayer = typeof gameTablePlayers.$inferSelect;
export type GameTableResult = typeof gameTableResults.$inferSelect;
export type GamePlayerStat = typeof gamePlayerStats.$inferSelect;
export type GameCenterBank = typeof gameCenterBank.$inferSelect;
export type GameCenterBankLedgerEntry = typeof gameCenterBankLedger.$inferSelect;
