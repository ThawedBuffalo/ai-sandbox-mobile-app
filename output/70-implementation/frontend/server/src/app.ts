import cors from "cors";
import express from "express";
import fs from "fs";
import path from "path";
import { estimateRouter } from "./routes/estimate";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api", estimateRouter);

const staticDir = process.env.STATIC_DIR ?? path.resolve(__dirname, "../../ui/dist");
const indexPath = path.join(staticDir, "index.html");

if (fs.existsSync(indexPath)) {
  app.use(express.static(staticDir));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path === "/health") {
      next();
      return;
    }

    res.sendFile(indexPath);
  });
}
