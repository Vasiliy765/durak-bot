CREATE TABLE IF NOT EXISTS `spy_games` (
	`roundId` varchar(64) NOT NULL,
	`roomCode` varchar(8) NOT NULL,
	`roomName` varchar(100) NOT NULL,
	`mode` varchar(32) NOT NULL,
	`winner` enum('spies','civilians') NOT NULL,
	`location` varchar(140) NOT NULL,
	`participants` json NOT NULL,
	`durationSeconds` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `spy_games_roundId` PRIMARY KEY(`roundId`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `spy_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(140) NOT NULL,
	`category` varchar(80) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `spy_locations_id` PRIMARY KEY(`id`),
	CONSTRAINT `spy_locations_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `spy_profiles` (
	`telegramId` varchar(64) NOT NULL,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100),
	`username` varchar(100),
	`avatarUrl` text,
	`gamesPlayed` int NOT NULL DEFAULT 0,
	`wins` int NOT NULL DEFAULT 0,
	`losses` int NOT NULL DEFAULT 0,
	`spyWins` int NOT NULL DEFAULT 0,
	`civilianWins` int NOT NULL DEFAULT 0,
	`spiesCaught` int NOT NULL DEFAULT 0,
	`rating` int NOT NULL DEFAULT 1000,
	`xp` int NOT NULL DEFAULT 0,
	`winStreak` int NOT NULL DEFAULT 0,
	`bestStreak` int NOT NULL DEFAULT 0,
		`achievements` json NOT NULL,
	`blocked` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spy_profiles_telegramId` PRIMARY KEY(`telegramId`)
);
--> statement-breakpoint
CREATE TABLE `spy_rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(8) NOT NULL,
	`name` varchar(100) NOT NULL,
	`ownerId` varchar(64) NOT NULL,
	`isPrivate` boolean NOT NULL DEFAULT true,
	`maxPlayers` int NOT NULL,
	`spyCount` int NOT NULL,
	`durationMinutes` int NOT NULL,
	`allowRejoin` boolean NOT NULL DEFAULT true,
	`categories` json NOT NULL,
	`mode` varchar(32) NOT NULL DEFAULT 'spyfall',
	`status` enum('lobby','playing','voting','spy_guess','finished') NOT NULL DEFAULT 'lobby',
	`state` json NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spy_rooms_id` PRIMARY KEY(`id`),
	CONSTRAINT `spy_rooms_code_unique` UNIQUE(`code`)
);
