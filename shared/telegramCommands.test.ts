import { describe, expect, it } from "vitest";
import {
  economyTextCommands,
  parseEconomyTextCommand,
  parseTelegramCommand,
  supportedTelegramSlashCommands,
} from "./telegramCommands";

describe("Telegram slash command parser", () => {
  it("recognizes every supported slash command", () => {
    for (const command of supportedTelegramSlashCommands) {
      expect(parseTelegramCommand(`/${command}`)?.command).toBe(command);
    }
  });

  it("supports bot mentions, Unicode command names and arguments", () => {
    expect(parseTelegramCommand("/daily@SecretAgentGame")).toEqual({
      command: "daily",
      args: [],
    });
    expect(parseTelegramCommand("/щодня")).toEqual({
      command: "щодня",
      args: [],
    });
    expect(parseTelegramCommand("/game слово 2")).toEqual({
      command: "game",
      args: ["слово", "2"],
    });
  });

  it("parses payment terms and billing support commands", () => {
    expect(parseTelegramCommand("/terms")?.command).toBe("terms");
    expect(parseTelegramCommand("/paysupport order-123 payment failed")?.args).toEqual([
      "order-123",
      "payment",
      "failed",
    ]);
  });

  it("ignores malformed and unsupported slash commands", () => {
    expect(parseTelegramCommand("/unsupported")).toBeNull();
    expect(parseTelegramCommand("/unknown@SecretAgentGame argument")).toBeNull();
    expect(parseTelegramCommand("daily")).toBeNull();
  });
});

describe("slashless economy text triggers", () => {
  it("maps every requested ordinary phrase to its existing command handler", () => {
    for (const entry of economyTextCommands) {
      for (const trigger of entry.triggers) {
        expect(parseEconomyTextCommand(trigger)).toEqual({
          command: entry.command,
          trigger,
        });
        expect(parseEconomyTextCommand(trigger.toLocaleUpperCase("uk"))?.command)
          .toBe(entry.command);
      }
    }
  });

  it("normalizes internal whitespace but matches complete phrases only", () => {
    expect(parseEconomyTextCommand("  ТОП    МАЖОРІВ  ")).toEqual({
      command: "top",
      trigger: "топ мажорів",
    });
    expect(parseEconomyTextCommand("мій баланс")).toBeNull();
    expect(parseEconomyTextCommand("баланс гравця")).toBeNull();
    expect(parseEconomyTextCommand("бонусом")).toBeNull();
    expect(parseEconomyTextCommand("топ мажорів сьогодні")).toBeNull();
    expect(parseEconomyTextCommand("/баланс")).toBeNull();
  });
});
