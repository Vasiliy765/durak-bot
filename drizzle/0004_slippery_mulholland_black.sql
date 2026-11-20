CREATE TABLE `game_center_config` (
	`key` varchar(64) NOT NULL,
	`value` json NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `game_center_config_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `game_player_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`telegramId` varchar(64) NOT NULL,
	`gameId` enum('battleship','durak','blackjack','tic_tac_toe') NOT NULL,
	`gamesPlayed` int NOT NULL DEFAULT 0,
	`wins` int NOT NULL DEFAULT 0,
	`losses` int NOT NULL DEFAULT 0,
	`draws` int NOT NULL DEFAULT 0,
	`netCoins` int NOT NULL DEFAULT 0,
	`biggestWin` int NOT NULL DEFAULT 0,
	`rating` int NOT NULL DEFAULT 1000,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `game_player_stats_id` PRIMARY KEY(`id`),
	CONSTRAINT `game_player_stats_user_game_uq` UNIQUE(`telegramId`,`gameId`)
);
--> statement-breakpoint
CREATE TABLE `game_table_disputes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tableId` varchar(36) NOT NULL,
	`reportedBy` varchar(64) NOT NULL,
	`details` varchar(1000) NOT NULL,
	`status` enum('open','reviewing','resolved','rejected') NOT NULL DEFAULT 'open',
	`reviewedBy` varchar(64),
	`resolution` varchar(1000),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `game_table_disputes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_table_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tableId` varchar(36) NOT NULL,
	`sequence` int NOT NULL,
	`actionId` varchar(80) NOT NULL,
	`actorId` varchar(64) NOT NULL,
	`eventType` varchar(40) NOT NULL,
	`publicPayload` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `game_table_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `game_table_event_seq_uq` UNIQUE(`tableId`,`sequence`),
	CONSTRAINT `game_table_action_uq` UNIQUE(`tableId`,`actionId`)
);
--> statement-breakpoint
CREATE TABLE `game_table_players` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tableId` varchar(36) NOT NULL,
	`telegramId` varchar(64) NOT NULL,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100),
	`username` varchar(100),
	`avatarUrl` text,
	`seat` int NOT NULL,
	`ready` boolean NOT NULL DEFAULT false,
	`status` enum('active','left','winner','loser','draw','forfeit') NOT NULL DEFAULT 'active',
	`contribution` int NOT NULL DEFAULT 0,
	`lastSeenAt` timestamp,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `game_table_players_id` PRIMARY KEY(`id`),
	CONSTRAINT `game_table_user_uq` UNIQUE(`tableId`,`telegramId`),
	CONSTRAINT `game_table_seat_uq` UNIQUE(`tableId`,`seat`)
);
--> statement-breakpoint
CREATE TABLE `game_table_results` (
	`tableId` varchar(36) NOT NULL,
	`gameId` enum('battleship','durak','blackjack','tic_tac_toe') NOT NULL,
	`winnerIds` json NOT NULL,
	`outcome` json NOT NULL,
	`totalPot` int NOT NULL,
	`payouts` json NOT NULL,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `game_table_results_tableId` PRIMARY KEY(`tableId`)
);
--> statement-breakpoint
CREATE TABLE `game_tables` (
	`id` varchar(36) NOT NULL,
	`ownerId` varchar(64) NOT NULL,
	`gameId` enum('battleship','durak','blackjack','tic_tac_toe') NOT NULL,
	`status` enum('lobby','playing','finished','cancelled') NOT NULL DEFAULT 'lobby',
	`visibility` enum('public','private') NOT NULL DEFAULT 'public',
	`name` varchar(80) NOT NULL,
	`stake` int NOT NULL,
	`minPlayers` int NOT NULL,
	`maxPlayers` int NOT NULL,
	`options` json NOT NULL,
	`state` json NOT NULL,
	`inviteToken` varchar(64) NOT NULL,
	`createRequestId` varchar(64) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`lobbyExpiresAt` timestamp,
	`startedAt` timestamp,
	`endedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `game_tables_id` PRIMARY KEY(`id`),
	CONSTRAINT `game_table_create_req_uq` UNIQUE(`ownerId`,`createRequestId`),
	CONSTRAINT `game_table_invite_token_uq` UNIQUE(`inviteToken`)
);
--> statement-breakpoint
CREATE INDEX `game_player_stats_rating_idx` ON `game_player_stats` (`gameId`,`rating`);--> statement-breakpoint
CREATE INDEX `game_table_dispute_status_idx` ON `game_table_disputes` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `game_table_dispute_table_idx` ON `game_table_disputes` (`tableId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `game_table_event_history_idx` ON `game_table_events` (`tableId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `game_table_user_status_idx` ON `game_table_players` (`telegramId`,`status`);--> statement-breakpoint
CREATE INDEX `game_table_result_game_date_idx` ON `game_table_results` (`gameId`,`completedAt`);--> statement-breakpoint
CREATE INDEX `game_table_game_status_idx` ON `game_tables` (`gameId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `game_table_owner_status_idx` ON `game_tables` (`ownerId`,`status`);