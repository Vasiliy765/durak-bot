import { describe, expect, it } from "vitest";
import { commandGuideGroups } from "./commandsGuideData";
import { chatPrankCategories } from "../../../shared/chatPrankCatalog";
import { parseChatPrank } from "../../../server/game/chatPranks";
import { parseWager } from "../../../server/game/chatWagers";
import {
  economySlashFallbackCommands,
  economyTextCommands,
  parseEconomyTextCommand,
  parseTelegramCommand,
  supportedTelegramSlashCommands,
} from "../../../shared/telegramCommands";

describe("Telegram command guide", () => {
  it("keeps the four outer collapsible groups unchanged", () => {
    expect(commandGuideGroups.map(group => group.title)).toEqual([
      "Ігри в чаті",
      "Дії",
      "Економіка",
      "Інші команди",
    ]);
  });

  it("documents every non-economy slash command and hides legacy economy slash fallbacks", () => {
    const examples = commandGuideGroups.flatMap(group =>
      group.entries.flatMap(entry => entry.examples || [])
    );
    const slashExamples = examples.filter(example => example.text.startsWith("/"));
    const parsed = slashExamples.map(example => parseTelegramCommand(example.text));
    expect(parsed.every(Boolean)).toBe(true);
    const visible = [...new Set(parsed.map(command => command!.command))].sort();
    const notShown = supportedTelegramSlashCommands
      .filter(command => !visible.includes(command))
      .sort();
    expect(notShown).toEqual([...economySlashFallbackCommands].sort());
    expect(parseTelegramCommand("/щодня")?.command).toBe("щодня");
  });

  it("shows all 29 RP actions in the four exact categories with copyable reply triggers", () => {
    const actions = commandGuideGroups.find(group => group.id === "actions")!;
    expect(actions.sections?.map(section => section.title)).toEqual([
      "Романтичні дії",
      "Дружні дії",
      "Жарти та приколи",
      "Агресивні та кумедні",
    ]);
    expect(actions.sections?.map(section => section.entries.length)).toEqual([
      3, 8, 8, 10,
    ]);
    expect(actions.entries).toHaveLength(29);
    expect(actions.description.toLocaleLowerCase("uk")).toContain("лише як reply");
    expect(actions.description).toContain("курсивом");
    expect(actions.description).toContain("без реального контакту");

    for (const category of chatPrankCategories) {
      const section = actions.sections!.find(item => item.title === category.title)!;
      for (const action of category.actions) {
        const entry = section.entries.find(item => item.id === `action-${action.id}`)!;
        expect(entry.title).toBe(action.title);
        expect(entry.description.toLocaleLowerCase("uk")).toContain("reply");
        expect(entry.examples?.map(example => example.text)).toEqual(action.triggers);
        expect(entry.examples?.some(example => example.text.includes("@username"))).toBe(false);
        for (const trigger of action.triggers) {
          expect(parseChatPrank(trigger)?.action).toBe(action.id);
        }
      }
    }
  });

  it("shows the requested ordinary economy words first and maps each to a real handler", () => {
    const economy = commandGuideGroups.find(group => group.id === "economy")!;
    expect(economy.entries.map(entry => entry.title)).toEqual([
      "Зп / Зарплата",
      "Баланс",
      "Бонус",
      "Топ мажорів",
    ]);
    const examplesById = new Map(
      economy.entries.map(entry => [entry.id, entry.examples?.map(example => example.text)])
    );
    const expectedIds = { zp: "salary", balance: "balance", daily: "daily", top: "coin-top" };
    for (const mapping of economyTextCommands) {
      expect(examplesById.get(expectedIds[mapping.command])).toEqual(mapping.triggers);
      for (const trigger of mapping.triggers) {
        expect(parseEconomyTextCommand(trigger)?.command).toBe(mapping.command);
      }
    }
    expect(economy.entries.every(entry => entry.examples?.every(example => !example.text.startsWith("/")))).toBe(true);
  });

  it("copies only valid coin and dice wager syntax with server-supported stake limits", () => {
    const games = commandGuideGroups.find(group => group.id === "games")!;
    for (const id of ["coin-wager", "dice-wager"]) {
      const entry = games.entries.find(item => item.id === id)!;
      for (const example of entry.examples || []) {
        const parsed = parseWager(example.text);
        expect(parsed).toMatchObject({ stake: 50, game: id === "coin-wager" ? "coin" : "dice" });
      }
    }
    expect(parseWager("Зіграти в монетку 9")).toBeNull();
    expect(parseWager("Зіграти в кубики 101")).toBeNull();
  });

  it("keeps profile navigation as a Mini App link rather than inventing /profile", () => {
    const allExamples = commandGuideGroups.flatMap(group =>
      group.entries.flatMap(entry => entry.examples || [])
    );
    expect(allExamples.some(example => example.text === "/profile")).toBe(false);
    const profile = commandGuideGroups.find(group => group.id === "other")!
      .entries.find(entry => entry.id === "profile-page");
    expect(profile?.navigationOnly).toBe(true);
    expect(profile?.navigationTarget).toBe("profile");
    expect(profile?.examples).toBeUndefined();
  });
});
