# Telegram Bot API constraints for group gameplay

These notes describe the current official Bot API contracts used by the group-game design. The selected product behavior is **soft spectator protection**, not a global read-only lock.

## Permissions and member discovery

- `setChatPermissions` replaces default permissions for all members of a group or supergroup. It requires the bot to be a chat administrator with `can_restrict_members`; it is not used by the selected design because it would alter group-wide defaults.
- `restrictChatMember` applies to one known user and is documented for supergroups only. A bot cannot enumerate every current group member: `getChatMemberCount` returns a count, `getChatAdministrators` returns administrators, and `getChatMember` requires a known `user_id`.
- `ChatFullInfo.permissions` contains default member permissions for groups and supergroups. `ChatMemberRestricted` contains a known restricted member's individual permission flags and `until_date`.
- The selected soft mode responds only when an identifiable nonparticipant attempts to post: delete the message; in a supergroup, first store that user's current permission state and then temporarily restrict them for the remaining game. On game end, restore only if their current state still matches the bot-applied restriction. A basic group can receive deletion/warnings but not individual restriction. Silent spectators cannot be preemptively identified or restricted.
- The bot must have `Delete Messages` for the delete action and `Restrict Members` for individual restrictions. Never modify owner/admin rights.

## Updates and group visibility

Telegram bots added as group administrators receive all group messages. For inline-button gameplay, the webhook must accept `callback_query` updates as well as `message` updates. Callback actions must be tied to the original group message, current round and requesting Telegram user ID.

## Official sources

- [setChatPermissions](https://core.telegram.org/bots/api/methods/setchatpermissions)
- [restrictChatMember](https://core.telegram.org/bots/api/methods/restrictchatmember)
- [getChatMemberCount](https://core.telegram.org/bots/api/methods/getchatmembercount)
- [getChatAdministrators](https://core.telegram.org/bots/api/methods/getchatadministrators)
- [getChatMember](https://core.telegram.org/bots/api/methods/getchatmember)
- [ChatFullInfo](https://core.telegram.org/bots/api/types/chatfullinfo)
- [ChatMemberRestricted](https://core.telegram.org/bots/api/types/chatmemberrestricted)
- [ChatPermissions](https://core.telegram.org/bots/api/types/chatpermissions)
- [Bot group privacy and admin messages](https://core.telegram.org/bots/features#privacy-mode)
