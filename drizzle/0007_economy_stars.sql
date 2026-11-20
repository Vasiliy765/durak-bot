ALTER TABLE `users`
  ADD COLUMN `telegramId` varchar(64) NULL,
  ADD COLUMN `username` varchar(100) NULL,
  ADD COLUMN `coins` int NOT NULL DEFAULT 0,
  ADD COLUMN `crystals` int NOT NULL DEFAULT 0,
  ADD COLUMN `vip_until` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `users`
  ADD UNIQUE KEY `users_telegram_id_uq` (`telegramId`);
--> statement-breakpoint
ALTER TABLE `spy_wallets`
  ADD COLUMN `crystals` int NOT NULL DEFAULT 0,
  ADD COLUMN `vipUntil` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `spy_economy_ledger`
  ADD COLUMN `currency` varchar(16) NOT NULL DEFAULT 'coins';
--> statement-breakpoint
CREATE TABLE `economy_settings` (
  `key` varchar(64) NOT NULL,
  `value` json NOT NULL,
  `updatedBy` varchar(64) NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
);
--> statement-breakpoint
INSERT INTO `economy_settings` (`key`, `value`) VALUES
  ('exchange_rate', '100'),
  ('vip_price_crystals', '100'),
  ('salary_coins', '100'),
  ('bonus_coins', '50'),
  ('stars_packages', '[{"id":"crystal_10","stars":10,"crystals":10},{"id":"crystal_55","stars":50,"crystals":55},{"id":"crystal_120","stars":100,"crystals":120},{"id":"crystal_650","stars":500,"crystals":650}]');
--> statement-breakpoint
CREATE TABLE `spy_stars_orders` (
  `id` varchar(64) NOT NULL,
  `telegramId` varchar(64) NOT NULL,
  `packageId` varchar(32) NOT NULL,
  `stars` int NOT NULL,
  `crystals` int NOT NULL,
  `status` enum('pending','paid','cancelled') NOT NULL DEFAULT 'pending',
  `chargeId` varchar(128) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `paidAt` timestamp NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `spy_stars_orders_charge_uq` (`chargeId`),
  KEY `spy_stars_orders_user_idx` (`telegramId`,`createdAt`)
);
