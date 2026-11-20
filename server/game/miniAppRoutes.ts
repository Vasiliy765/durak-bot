import type { Express, Request, Response } from "express";
import { callTelegram } from "./telegramApi";
import { CRYSTAL_PACKAGES } from "./economy";
import { getOrCreateUser } from "./userStore";

interface TgUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

function parseTelegramUser(req: Request): TgUser {
  let raw = "";
  if (req.headers["x-telegram-init-data"]) {
    raw = String(req.headers["x-telegram-init-data"]);
  } else if (req.query.initData) {
    raw = String(req.query.initData);
  }
  if (raw) {
    try {
      const params = new URLSearchParams(raw);
      const userStr = params.get("user");
      if (userStr) {
        const parsed = JSON.parse(userStr);
        if (parsed && parsed.id) return parsed as TgUser;
      }
    } catch {}
  }
  return { id: 1000001, first_name: "Гравець", username: "player" };
}

const tablesStore = new Array<any>();
const defaultBets = Array.of(10, 50, 100, 500);

const defaultGames = Array.of(
  { id: "durak", gameType: "durak", name: "Дурак", title: "Дурак", minPlayers: 2, maxPlayers: 4, bets: defaultBets },
  { id: "battleship", gameType: "battleship", name: "Морський бій", title: "Морський бій", minPlayers: 2, maxPlayers: 2, bets: defaultBets },
  { id: "tictactoe", gameType: "tictactoe", name: "Хрестики-нулики", title: "Хрестики-нулики", minPlayers: 2, maxPlayers: 2, bets: defaultBets }
);

export function registerMiniAppRoutes(app: Express) {
  app.get("/api/game/profile", (req: Request, res: Response) => {
    const user = parseTelegramUser(req);
    const st = getOrCreateUser(user.id);
    res.json({
      profile: {
        id: String(user.id),
        telegramId: String(user.id),
        firstName: user.first_name,
        lastName: user.last_name ? user.last_name : "",
        username: user.username ? user.username : "",
        coins: st.coins,
        crystals: st.crystals,
        vip: false,
        gamesPlayed: 0,
        gamesWon: 0,
        equipped: {},
      },
    });
  });

  app.get("/api/game/economy/overview", (req: Request, res: Response) => {
    const user = parseTelegramUser(req);
    const st = getOrCreateUser(user.id);
    res.json({
      balance: st.coins,
      crystals: st.crystals,
      vip: false,
      streak: st.streak,
      salaryCooldownMs: Math.max(0, st.lastSalary + 3600000 - Date.now()),
      dailyCooldownMs: Math.max(0, st.lastDaily + 86400000 - Date.now()),
    });
  });

  app.post("/api/game/economy/salary", (req: Request, res: Response) => {
    const user = parseTelegramUser(req);
    const st = getOrCreateUser(user.id);
    const now = Date.now();
    if (now - st.lastSalary < 3600000) {
      return res.json({ claimed: false, amount: 0, balance: st.coins, remainingMs: st.lastSalary + 3600000 - now });
    }
    st.lastSalary = now;
    st.coins += 150;
    res.json({ claimed: true, amount: 150, balance: st.coins, remainingMs: 3600000 });
  });

  app.post("/api/game/economy/daily", (req: Request, res: Response) => {
    const user = parseTelegramUser(req);
    const st = getOrCreateUser(user.id);
    const now = Date.now();
    if (now - st.lastDaily < 86400000) {
      return res.json({ claimed: false, amount: 0, bonusAmount: 0, balance: st.coins, streak: st.streak, streakBonus: 0, remainingMs: st.lastDaily + 86400000 - now });
    }
    st.lastDaily = now;
    st.coins += 300;
    res.json({ claimed: true, amount: 300, bonusAmount: 0, balance: st.coins, streak: st.streak, streakBonus: 0, remainingMs: 86400000 });
  });

  app.post("/api/game/economy/stars/invoice", async (req: Request, res: Response) => {
    const packageId = req.body && req.body.packageId ? String(req.body.packageId) : "crystals_50";
    const crystals = CRYSTAL_PACKAGES[packageId] ? CRYSTAL_PACKAGES[packageId] : 50;
    const starsPrice = Math.max(1, Math.round(crystals / 2));

    const tgRes: any = await callTelegram("createInvoiceLink", {
      title: crystals + " Кристалів",
      description: "Поповнення балансу кристалів у грі",
      payload: packageId,
      currency: "XTR",
      prices: Array.of({ label: crystals + " 💎", amount: starsPrice }),
    });

    if (!tgRes || !tgRes.ok) {
      return res.status(500).json({ error: "Failed to create Stars invoice" });
    }
    res.json({ invoiceUrl: tgRes.result, orderId: packageId + "_" + Date.now() });
  });

  app.get("/api/game-center/config", (_req: Request, res: Response) => {
    res.json({
      games: defaultGames,
      modes: defaultGames,
      betOptions: defaultBets,
      bets: defaultBets,
      defaultBet: 50,
    });
  });

  app.get("/api/game-center/tables", (req: Request, res: Response) => {
    const user = parseTelegramUser(req);
    res.json({ tables: tablesStore, myPlayerId: String(user.id) });
  });

  app.get("/api/game-center/tables/mine", (req: Request, res: Response) => {
    const user = parseTelegramUser(req);
    res.json({ tables: new Array(), myPlayerId: String(user.id) });
  });

  app.get("/api/game-center/tables/active", (req: Request, res: Response) => {
    const user = parseTelegramUser(req);
    res.json({ tables: tablesStore, myPlayerId: String(user.id) });
  });

  app.get("/api/game-center/leaderboard", (_req: Request, res: Response) => res.json({ players: new Array() }));
  app.get("/api/game/economy/shop", (_req: Request, res: Response) => res.json({ items: new Array() }));
  app.get("/api/game/economy/inventory", (_req: Request, res: Response) => res.json({ items: new Array() }));
  app.get("/api/game/economy/top", (_req: Request, res: Response) => res.json({ players: new Array() }));

  app.all("/api/game-center/*", (req: Request, res: Response) => {
    const user = parseTelegramUser(req);
    res.json({
      ok: true,
      games: defaultGames,
      modes: defaultGames,
      betOptions: defaultBets,
      bets: defaultBets,
      tables: tablesStore,
      myPlayerId: String(user.id),
      players: new Array(),
      items: new Array(),
    });
  });
      }
