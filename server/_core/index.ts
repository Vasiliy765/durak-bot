import express from "express";
import path from "path";
import { processTelegramUpdate } from "../game/telegramBot";

const app = express();
app.use(express.json());

app.post("/api/telegram/webhook", async (req, res) => {
  try {
    await processTelegramUpdate(req.body);
  } catch (err) {
    console.error("[Webhook Error]:", err);
  }
  res.sendStatus(200);
});

const distPath = path.resolve(process.cwd(), "dist", "public");
app.use(express.static(distPath));

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server is running on port " + PORT);
});
