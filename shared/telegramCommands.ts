export const supportedTelegramSlashCommands = [
  "start",
  "play",
  "help",
  "terms",
  "paysupport",
  "game",
  "join",
  "leave",
  "players",
  "startgame",
  "stopgame",
  "rules",
  "stats",
  "zp",
  "daily",
  "щодня",
  "balance",
  "bal",
  "top",
  "shop",
  "inventory",
] as const;

export type TelegramSlashCommand =
  (typeof supportedTelegramSlashCommands)[number];

export const economySlashFallbackCommands = [
  "zp",
  "daily",
  "щодня",
  "balance",
  "bal",
  "top",
] as const satisfies readonly TelegramSlashCommand[];

export const economyTextCommands = [
  { command: "zp", triggers: ["зп", "зарплата"] },
  { command: "balance", triggers: ["баланс", "балік"] },
  { command: "daily", triggers: ["бонус"] },
  { command: "top", triggers: ["топ мажорів", "топ"] },
] as const satisfies readonly {
  command: "zp" | "balance" | "daily" | "top";
  triggers: readonly string[];
}[];

export type EconomyTextCommand = (typeof economyTextCommands)[number]["command"];

const supportedCommands = new Set<string>(supportedTelegramSlashCommands);

export function parseTelegramCommand(text: string): {
  command: TelegramSlashCommand;
  args: string[];
} | null {
  const match = /^\/([\p{L}0-9_]+)(?:@[a-zA-Z0-9_]+)?(?:\s+([\s\S]+))?$/iu.exec(
    text.trim()
  );
  if (!match) return null;
  const command = match[1]!.toLocaleLowerCase("uk");
  if (!supportedCommands.has(command)) return null;
  return {
    command: command as TelegramSlashCommand,
    args: match[2]?.trim().split(/\s+/).filter(Boolean) || [],
  };
}

/** Match only complete, case-insensitive economy phrases, never substrings. */
export function parseEconomyTextCommand(text: string): {
  command: EconomyTextCommand;
  trigger: string;
} | null {
  const normalized = text.trim().replace(/\s+/g, " ").toLocaleLowerCase("uk");
  if (!normalized) return null;

  for (const entry of economyTextCommands) {
    const trigger = entry.triggers.find(value => value === normalized);
    if (trigger) return { command: entry.command, trigger };
  }
  return null;
}
