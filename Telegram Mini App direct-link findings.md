# Telegram Mini App direct-link findings

Captured 2026-11-18 for the follow-up invite-link repair.

Telegram’s official Mini Apps documentation defines a direct link for a named app as `https://t.me/<bot_username>/<app_short_name>?startapp=<parameter>`. For a bot that has a configured Main Mini App, the main-app direct link is `https://t.me/<bot_username>?startapp=<parameter>`. Telegram passes a non-empty `startapp` value to the Mini App as `start_param` and `tgWebAppStartParam`; the client already reads `initDataUnsafe.start_param` and falls back to the `startapp` query string in `client/src/lib/telegram.ts`.

After the owner reported enabling the Main Mini App in BotFather, Telegram Bot API `getMe` was called again on 2026-11-18 and confirmed `@SecretAgentGame` with `has_main_web_app: true`. `TELEGRAM_APP_SHORT_NAME` remains unset, so no named-app short link is fabricated; table invitations use the official Main Mini App form `https://t.me/SecretAgentGame?startapp=<opaque-arcade-invite-token>`. The configured Mini App web origin is still used for the bot's in-Telegram `web_app` launch button, but is never presented as a shareable Telegram invite URL.

The invite parameter must contain only an unguessable table invite token, not a hidden board/card state or another user’s Telegram ID. On launch the existing authenticated API must validate Telegram `initData`, resolve the requesting Telegram ID, and confirm the invite token/table is still joinable before showing the join screen.

References:

- [Telegram Mini Apps — Direct Link Mini Apps and startapp](https://core.telegram.org/bots/webapps)
- [Telegram Bot API — getMe](https://core.telegram.org/bots/api#user)
