CREATE TABLE `spy_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(80) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `spy_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `spy_categories_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `spy_game_config` (
	`key` varchar(64) NOT NULL,
	`value` json NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spy_game_config_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `spy_system_errors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`method` varchar(12) NOT NULL,
	`route` varchar(180) NOT NULL,
	`message` varchar(500) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `spy_system_errors_id` PRIMARY KEY(`id`)
);
