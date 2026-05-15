import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createStoreRouter } from "./routes/store";
import { createAdminRouter } from "./routes/admin";
import { err, handleErr } from "./platform/http";

export type RuntimeMode = "monolith" | "store" | "admin";

export interface AppOptions {
  mode?: RuntimeMode;
}

export function createCommerceApp({ mode = readRuntimeMode() }: AppOptions = {}) {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Admin-Secret", "X-Cart-Id"],
  }));
  app.use(express.json({ limit: "2mb" }));
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: mode,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: "1.0.0-hackathon",
    });
  });

  if (mode === "monolith" || mode === "store") {
    app.use("/api/v1/store", createStoreRouter());
  }

  if (mode === "monolith" || mode === "admin") {
    app.use("/api/v1/admin", createAdminRouter());
  }

  app.use((_req, res) => {
    res.status(404).json(err("NOT_FOUND", "Route not found"));
  });

  app.use((e: unknown, _req: Request, res: Response, _next: NextFunction) => {
    handleErr(e, res);
  });

  return app;
}

function readRuntimeMode(): RuntimeMode {
  const service = process.env.SERVICE_NAME ?? process.env.API_SERVICE ?? "monolith";
  return service === "store" || service === "admin" ? service : "monolith";
}
