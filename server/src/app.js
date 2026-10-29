const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const config = require("./config/env");
const { query } = require("./db/pool");
const { requireAuth } = require("./middleware/auth");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");
const { asyncHandler } = require("./utils/http");

const authRoutes = require("./routes/auth.routes");
const patientRoutes = require("./routes/patients.routes");
const studyRoutes = require("./routes/studies.routes");
const seriesRoutes = require("./routes/series.routes");
const imageRoutes = require("./routes/images.routes");
const reportRoutes = require("./routes/reports.routes");
const aiRoutes = require("./routes/ai.routes");

/** Builds the Express application without binding a port, so tests can use it directly. */
function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: config.corsOrigins, credentials: true }));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  if (!config.isTest) {
    app.use(morgan(config.isProduction ? "combined" : "dev"));
  }

  app.get("/", (_req, res) => {
    res.send("Radiology Medical Image Viewing System API");
  });

  app.get(
    "/api/health",
    asyncHandler(async (_req, res) => {
      try {
        await query("SELECT 1 AS ok");
        res.json({ success: true, message: "Backend and database are working" });
      } catch {
        res.status(503).json({ success: false, message: "Database connection failed" });
      }
    })
  );

  // Public: register and login. Profile routes inside apply requireAuth themselves.
  app.use("/api", authRoutes);

  // Everything below requires a valid bearer token.
  app.use("/api/patients", requireAuth, patientRoutes);
  app.use("/api/studies", requireAuth, studyRoutes);
  app.use("/api/series", requireAuth, seriesRoutes);
  app.use("/api/images", requireAuth, imageRoutes);
  app.use("/api/reports", requireAuth, reportRoutes);
  app.use("/api/ai", requireAuth, aiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
