const crypto = require("crypto");

require("dotenv").config({ quiet: true });

const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

function resolveJwtSecret() {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  if (isProduction) {
    throw new Error("JWT_SECRET must be set in production");
  }

  // Development fallback: a random secret means tokens stop working after a
  // restart, which is acceptable locally and impossible to forget in prod.
  if (!isTest) {
    console.warn("[config] JWT_SECRET not set; using a random development secret");
  }
  return crypto.randomBytes(32).toString("hex");
}

const config = {
  env: process.env.NODE_ENV || "development",
  isProduction,
  isTest,
  port: Number(process.env.PORT) || 5000,

  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),

  db: {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || "localhost",
    database: process.env.DB_NAME || "RadiologyDB",
    options: {
      encrypt: process.env.DB_ENCRYPT === "true",
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false",
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    requestTimeout: 120000,
  },

  jwt: {
    secret: resolveJwtSecret(),
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  },

  aiServiceUrl: process.env.AI_SERVICE_URL || "http://127.0.0.1:8001",

  upload: {
    // Must match MAX_UPLOAD_FILE_SIZE_BYTES in client/src/pages/ImageViewer.js.
    maxFileSizeBytes: 100 * 1024 * 1024,
    maxFilesPerSeries: 500,
  },
};

module.exports = config;
