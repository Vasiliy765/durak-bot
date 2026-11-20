CREATE TABLE `spy_economy_ledger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`telegramId` varchar(64) NOT NULL,
	`kind` varchar(40) NOT NULL,
	`amount` int NOT NULL,
	`balanceAfter` int NOT NULL,
	`idempotencyKey` varchar(140) NOT NULL,
	`referenceId` varchar(100),
	`note` varchar(240) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `spy_economy_ledger_id` PRIMARY KEY(`id`),
	CONSTRAINT `spy_economy_ledger_idempotencyKey_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `spy_group_games` (
	`chatId` varchar(64) NOT NULL,
	`chatType` enum('group','supergroup') NOT NULL,
	`chatTitle` varchar(160) NOT NULL,
	`hostId` varchar(64) NOT NULL,
	`status` enum('lobby','playing','voting','spy_guess','finished','cancelled') NOT NULL DEFAULT 'lobby',
	`roundId` varchar(64) NOT NULL,
	`lobbyMessageId` int,
	`roundStartedAt` timestamp,
	`roundEndsAt` timestamp,
	`state` json NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spy_group_games_chatId` PRIMARY KEY(`chatId`)
);
--> statement-breakpoint
CREATE TABLE `spy_group_permission_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chatId` varchar(64) NOT NULL,
	`roundId` varchar(64) NOT NULL,
	`telegramId` varchar(64) NOT NULL,
	`originalStatus` varchar(24) NOT NULL,
	`originalSnapshot` json NOT NULL,
	`appliedPermissions` json NOT NULL,
	`restoreStatus` enum('captured','applied','restoring','restored','conflict','failed') NOT NULL DEFAULT 'captured',
	`restoreAttempts` int NOT NULL DEFAULT 0,
	`lastError` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spy_group_permission_snapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `spy_group_permission_round_user_uq` UNIQUE(`chatId`,`roundId`,`telegramId`)
);
--> statement-breakpoint
CREATE TABLE `spy_inventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`telegramId` varchar(64) NOT NULL,
	`itemId` varchar(64) NOT NULL,
	`equipped` boolean NOT NULL DEFAULT false,
	`purchasedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spy_inventory_id` PRIMARY KEY(`id`),
	CONSTRAINT `spy_inventory_user_item_uq` UNIQUE(`telegramId`,`itemId`)
);
--> statement-breakpoint
CREATE TABLE `spy_shop_items` (
	`itemId` varchar(64) NOT NULL,
	`name` varchar(100) NOT NULL,
	`category` varchar(32) NOT NULL,
	`description` varchar(240) NOT NULL,
	`price` int NOT NULL,
	`metadata` json NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `spy_shop_items_itemId` PRIMARY KEY(`itemId`)
);
--> statement-breakpoint
CREATE TABLE `spy_telegram_updates` (
	`updateId` varchar(32) NOT NULL,
	`status` enum('processing','done','failed') NOT NULL DEFAULT 'processing',
	`attempts` int NOT NULL DEFAULT 1,
	`lastError` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spy_telegram_updates_updateId` PRIMARY KEY(`updateId`)
);
--> statement-breakpoint
CREATE TABLE `spy_wallets` (
	`telegramId` varchar(64) NOT NULL,
	`balance` int NOT NULL DEFAULT 0,
	`lastSalaryAt` timestamp,
	`lastDailyAt` timestamp,
	`dailyStreak` int NOT NULL DEFAULT 0,
	`gameRewardsDate` varchar(10),
	`gameRewardsToday` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spy_wallets_telegramId` PRIMARY KEY(`telegramId`)
);
--> statement-breakpoint
CREATE INDEX `spy_economy_user_history_idx` ON `spy_economy_ledger` (`telegramId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `spy_group_status_deadline_idx` ON `spy_group_games` (`status`,`roundEndsAt`);--> statement-breakpoint
CREATE INDEX `spy_group_permission_restore_idx` ON `spy_group_permission_snapshots` (`restoreStatus`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `spy_inventory_user_idx` ON `spy_inventory` (`telegramId`);