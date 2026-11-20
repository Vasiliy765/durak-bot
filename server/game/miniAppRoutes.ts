import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { callTelegram } from "./telegramApi";
import { CRYSTAL_PACKAGES } from "./economy";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

interface TgUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

// Перевірка підпису Telegram WebApp initData
function parseTelegramInitData(initDataRaw: string): TgUser | null {
  if (!initDataRaw) return null;
  try {
    const params = new URLSearchParams(initDataRaw);
    const userStr = params.get("user");
    const hash = params.get("hash");
    if (!userStr || !hash) return null;

    if (BOT_TOKEN) {
      const dataCheckArr: string[] = [];
      params.forEach((val, key) => {
        if (key !== "hash") dataCheckArr.push(key + "=" + val);
      });
      dataCheckArr.sort();
      const secretKey = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
      const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckArr.join("\n")).digest("hex");
      if (calculatedHash !== hash) return null;
    }

    return JSON.parse(userStr) as TgUser;
  } catch {
    return null;
  }
}

const userState = new Map<number, { coins: number; crystals: number; lastSalary: number; lastDaily: number; streak: number }>();

function getUserState(id: number) {
  if (!userState.has(id)) {
    userState.set(id, { coins: 500, crystals: 10, lastSalary: 0, lastDaily: 0, streak: 1 });
  }
  return userState.get(id)!;
}

const tablesStore: any[] = [];

export function registerMiniAppRoutes(app: Express) {
  const getAuthUser = (req: Request): TgUser | null => {
    const initData = String(req.headers["x-telegram-init-data"] || "");
    return parseTelegramInitData(initData);
  };

  // Профіль користувача (/api/game/profile)
  app.get("/api/game/profile", (req: Request, res: Response) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });
    const st = getUserState(user.id);
    res.json({
      profile: {
        id: String(user.id),
        telegramId: String(user.id),
        firstName: user.first_name,
        lastName: user.last_name || "",
        username: user.username || "",
        coins: st.coins,
        crystals: st.crystals,
        vip: false,
        gamesPlayed: 0,
        gamesWon: 0,
        equipped: {},
      },
    });
  });

  // Огляд економіки (/api/game/economy/overview)
  app.get("/api/game/economy/overview", (req: Request, res: Response) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });
    const st = getUserState(user.id);
    res.json({
      balance: st.coins,
      crystals: st.crystals,
      vip: false,
      streak: st.streak,
      salaryCooldownMs: Math.max(0, st.lastSalary + 3600000 - Date.now()),
      dailyCooldownMs: Math.max(0, st.lastDaily + 86400000 - Date.now()),
    });
  });

  // Зарплата (/api/game/economy/salary)
  app.post("/api/game/economy/salary", (req: Request, res: Response) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });
    const st = getUserState(user.id);
    const now = Date.now();
    if (now - st.lastSalary < 3600000) {
      return res.json({ claimed: false, amount: 0, balance: st.coins, remainingMs: st.lastSalary + 3600000 - now });
    }
    st.lastSalary = now;
    st.coins += 150;
    res.json({ claimed: true, amount: 150, balance: st.coins, remainingMs: 3600000 });
  });

  // Щоденний бонус (/api/game/economy/daily)
  app.post("/api/game/economy/daily", (req: Request, res: Response) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });
    const st = getUserState(user.id);
    const now = Date.now();
    if (now - st.lastDaily < 86400000) {
      return res.json({ claimed: false, amount: 0, bonusAmount: 0, balance: st.coins, streak: st.streak, streakBonus: 0, remainingMs: st.lastDaily + 86400000 - now });
    }
    st.lastDaily = now;
    st.coins += 300;
    res.json({ claimed: true, amount: 300, bonusAmount: 0, balance: st.coins, streak: st.streak, streakBonus: 0, remainingMs: 86400000 });
  });

  // Створення інвойсу Telegram Stars для покупки кристалів
  app.post("/api/game/economy/stars/invoice", async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });
    const packageId = String(req.body?.packageId || "crystals_50");
    const crystals = CRYSTAL_PACKAGES[packageId] || 50;
    const starsPrice = Math.max(1, Math.round(crystals / 2));

    const tgRes: any = await callTelegram("createInvoiceLink", {
      title: crystals + " Кристалів",
      description: "Поповнення балансу кристалів у грі",
      payload: packageId,
      currency: "XTR",
      prices: [{ label: crystals + " 💎", amount: starsPrice }],
    });

    if (!tgRes?.ok) {
      return res.status(500).json({ error: tgRes?.description || "Failed to create Stars invoice" });
    }
    res.json({ invoiceUrl: tgRes.result, orderId: packageId + "_" + Date.now() });
  });

  // Список столів та базовий стан ігрового центру (/api/game-center/...)
  app.get("/api/game-center/tables", (req: Request, res: Response) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });
    res.json({ tables: tablesStore, myPlayerId: String(user.id) });
  });

  app.get("/api/game-center/leaderboard", (_req: Request, res: Response) => {
    res.json({ players: [] });
  });

  app.get("/api/game/economy/shop", (_req: Request, res: Response) => {
    res.json({ items: [] });
  });

  app.get("/api/game/economy/inventory", (_req: Request, res: Response) => {
    res.json({ items: [] });
  });

  app.get("/api/game/economy/top", (_req: Request, res: Response) => {
    res.json({ players: [] });
  });
}
