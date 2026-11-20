CREATE TABLE `spy_chat_wagers` (
  `id` varchar(36) NOT NULL,
  `chatId` varchar(64) NOT NULL,
  `messageId` int NOT NULL,
  `sourceMessageId` int NOT NULL,
  `game` enum('coin','dice') NOT NULL,
  `status` enum('pending','rolling','resolved','refunded','expired') NOT NULL DEFAULT 'pending',
  `challengerId` varchar(64) NOT NULL,
  `opponentId` varchar(64) DEFAULT NULL,
  `stake` int NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `round` int NOT NULL DEFAULT 0,
  `failureCount` int NOT NULL DEFAULT 0,
  `challengerRoll` int DEFAULT NULL,
  `opponentRoll` int DEFAULT NULL,
  `winnerId` varchar(64) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `spy_chat_wager_source_uq` (`chatId`,`sourceMessageId`),
  KEY `spy_chat_wager_status_deadline_idx` (`status`,`expiresAt`),
  KEY `spy_chat_wager_chat_status_idx` (`chatId`,`status`)
);
--> statement-breakpoint
CREATE TABLE `spy_chat_wager_bank` (
  `id` int NOT NULL,
  `balance` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);
--> statement-breakpoint
INSERT INTO `spy_chat_wager_bank` (`id`, `balance`) VALUES (1, 0);
--> statement-breakpoint
CREATE TABLE `spy_chat_wager_bank_ledger` (
  `id` int NOT NULL AUTO_INCREMENT,
  `wagerId` varchar(36) NOT NULL,
  `amount` int NOT NULL,
  `balanceAfter` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `spy_chat_wager_bank_wager_uq` (`wagerId`),
  KEY `spy_chat_wager_bank_ledger_created_idx` (`createdAt`)
);
