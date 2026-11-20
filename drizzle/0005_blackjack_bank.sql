CREATE TABLE `game_center_bank` (
	`id` varchar(32) NOT NULL,
	`balance` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `game_center_bank_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_center_bank_ledger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tableId` varchar(36) NOT NULL,
	`kind` varchar(32) NOT NULL,
	`amount` int NOT NULL,
	`balanceAfter` int NOT NULL,
	`idempotencyKey` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `game_center_bank_ledger_id` PRIMARY KEY(`id`),
	CONSTRAINT `game_center_bank_settlement_uq` UNIQUE(`tableId`),
	CONSTRAINT `game_center_bank_idempotency_uq` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE INDEX `game_center_bank_ledger_created_idx` ON `game_center_bank_ledger` (`createdAt`);
--> statement-breakpoint
INSERT INTO `game_center_bank` (`id`, `balance`) VALUES ('main', 0);
