const config = require("./config/env");
const db = require("./db/pool");
const { runMigrations } = require("./db/migrations");
const { createApp } = require("./app");

async function start() {
  try {
    await db.connect();
    console.info("[db] connected to SQL Server");
    await runMigrations();
    console.info("[db] schema is up to date");
  } catch (error) {
    console.error("[db] startup failed:", error.message);
    process.exit(1);
  }

  const server = createApp().listen(config.port, () => {
    console.info(`[api] listening on http://localhost:${config.port} (${config.env})`);
  });

  const shutdown = (signal) => {
    console.info(`[api] ${signal} received, shutting down`);
    server.close(async () => {
      await db.close();
      process.exit(0);
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start();
