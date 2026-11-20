CREATE TABLE `game_player_active_rooms` (
  `telegramId` varchar(64) NOT NULL,
  `active_room_id` varchar(36) DEFAULT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`telegramId`)
);

INSERT INTO `game_player_active_rooms` (`telegramId`, `active_room_id`)
SELECT active_rooms.`telegramId`, active_rooms.`active_room_id`
FROM (
  SELECT p.`telegramId`, SUBSTRING_INDEX(GROUP_CONCAT(p.`tableId` ORDER BY t.`createdAt` DESC SEPARATOR ','), ',', 1) AS `active_room_id`
  FROM `game_table_players` p
  INNER JOIN `game_tables` t ON t.`id` = p.`tableId`
  WHERE p.`status` = 'active' AND t.`status` IN ('lobby', 'playing')
  GROUP BY p.`telegramId`
) AS active_rooms;
