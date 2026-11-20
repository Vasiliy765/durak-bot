UPDATE `users` u
JOIN `spy_profiles` p ON u.`openId` = CONCAT('telegram:', p.`telegramId`)
LEFT JOIN `spy_wallets` w ON w.`telegramId` = p.`telegramId`
SET u.`telegramId` = p.`telegramId`,
    u.`username` = p.`username`,
    u.`coins` = COALESCE(w.`balance`, 0),
    u.`crystals` = COALESCE(w.`crystals`, 0),
    u.`vip_until` = w.`vipUntil`;
--> statement-breakpoint
UPDATE `users` u
JOIN `spy_profiles` p ON u.`telegramId` = p.`telegramId`
LEFT JOIN `spy_wallets` w ON w.`telegramId` = p.`telegramId`
SET u.`username` = p.`username`,
    u.`coins` = COALESCE(w.`balance`, 0),
    u.`crystals` = COALESCE(w.`crystals`, 0),
    u.`vip_until` = w.`vipUntil`;
--> statement-breakpoint
INSERT INTO `users` (`openId`, `telegramId`, `username`, `coins`, `crystals`, `vip_until`, `name`, `loginMethod`)
SELECT CONCAT('telegram:', p.`telegramId`), p.`telegramId`, p.`username`,
       COALESCE(w.`balance`, 0), COALESCE(w.`crystals`, 0), w.`vipUntil`,
       CONCAT_WS(' ', p.`firstName`, p.`lastName`), 'telegram'
FROM `spy_profiles` p
LEFT JOIN `spy_wallets` w ON w.`telegramId` = p.`telegramId`
WHERE NOT EXISTS (
  SELECT 1 FROM `users` u
  WHERE u.`telegramId` = p.`telegramId`
     OR u.`openId` = CONCAT('telegram:', p.`telegramId`)
);
