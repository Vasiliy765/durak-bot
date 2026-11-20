import express from "express";
import path from "path";
import { processTelegramUpdate } from "../game/telegramBot";

const app = express();
app.use(express.json());

// Вебхук для прийому оновлень від Telegram (повідомлення, тема Боти, оплата Stars)
app.post("/api/telegram/webhook", async (req, res) => {
  try {
    await processTelegramUpdate(req.body);
  } catch (err) {
    console.error("[Webhook Error]:", err);
  }
  res.sendStatus(200);
});

// Віддача зібраного фронтенду Mini App (якщо є папка dist)
const distPath = path.resolve(process.cwd(), "dist");
app.use(express.static(distPath));

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, "0.0.0.0", () => {
  console.log(Server is running on port ${PORT});
});
