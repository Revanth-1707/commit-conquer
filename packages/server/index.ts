import path from "path";
import dotenv from "dotenv";
import { createCommerceApp } from "./src/appFactory";
import { validateRequiredEnv } from "./src/platform/env";
import { enableDevelopmentEventLogging } from "./src/runtime/events";

dotenv.config({ path: path.join(__dirname, ".env") });

validateRequiredEnv();
enableDevelopmentEventLogging();

const app = createCommerceApp();
const PORT = parseInt(process.env.PORT ?? "4000", 10);
const SERVICE_NAME = process.env.SERVICE_NAME ?? process.env.API_SERVICE ?? "monolith";

app.listen(PORT, () => {
  console.log(`
  ┌──────────────────────────────────────────┐
  │   commit&conquer API                     │
  │                                          │
  │   Mode:   ${SERVICE_NAME.padEnd(31)}│
  │   Store:  http://localhost:${PORT}/api/v1/store │
  │   Admin:  http://localhost:${PORT}/api/v1/admin │
  │   Health: http://localhost:${PORT}/health       │
  │                                          │
  │   ENV: ${process.env.NODE_ENV ?? "development"}
  └──────────────────────────────────────────┘
  `);
});

export default app;
export { createCommerceApp };
