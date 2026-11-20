import express from "express";
import path from "path";
import { processTelegramUpdate } from "../game/telegramBot";
import { registerMiniAppRoutes } from "../game/miniAppRoutes";

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

registerMiniAppRoutes(app);

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
});
