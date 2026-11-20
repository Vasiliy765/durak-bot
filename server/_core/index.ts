import express from "express";
import path from "path";
import { processTelegramUpdate } from "../game/telegramBot";
import { registerMiniAppRoutes } from "../game/miniAppRoutes";
import { rollbackBuggedCrystals } from "../game/economy";

const app = express();
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/telegram/webhook", async (req, res) => {
  try {
    await processTelegramUpdate(req.body);
  } catch (err) {
    console.error("[Webhook Error]:", err);
  }
  res.sendStatus(200);
});

registerMiniAppRoutes(app);

// Заглушка для tRPC-запитів клієнта, щоб інтерфейс не падав у помилку
app.all("/api/trpc/*", (_req, res) => {
  res.json([{ result: { data: { json: null } } }]);
});

const distPath = path.resolve(process.cwd(), "dist", "public");
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"), (err) => {
    if (err) res.status(200).send("Bot server is running");
  });
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server is running on port " + PORT);
  rollbackBuggedCrystals().then((rep) => console.log(rep)).catch(() => {});
});
