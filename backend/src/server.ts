import express from "express";
import cors from "cors";
import helmet from "helmet";
import env from "./config/env";
import screeningsRouter from "./routes/screenings";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/screenings", screeningsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[SERVER] Unhandled error:", err);
  const message = err instanceof Error ? err.message : "Internal Server Error";
  res.status(500).json({ error: message });
});

app.listen(env.port, () => {
  console.log(`[server] Hire Me Maybe API listening on port ${env.port}`);
  console.log(`[server] Health: http://localhost:${env.port}/health`);
  console.log(`[server] Screenings: http://localhost:${env.port}/api/screenings`);
  console.log(`[server] ML service: ${env.mlServiceUrl}`);
});

export default app;
