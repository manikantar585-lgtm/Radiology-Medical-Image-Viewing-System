const multer = require("multer");
const config = require("../config/env");
const { HttpError } = require("../utils/http");

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: `Each image must be ${config.upload.maxFileSizeBytes / (1024 * 1024)} MB or smaller`,
  LIMIT_FILE_COUNT: `A series can contain a maximum of ${config.upload.maxFilesPerSeries} images`,
  LIMIT_UNEXPECTED_FILE: `A series can contain a maximum of ${config.upload.maxFilesPerSeries} images`,
};

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

// Express recognises error handlers by their four-argument signature.
function errorHandler(error, req, res, _next) {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: MULTER_MESSAGES[error.code] || "Unable to read the uploaded files",
    });
  }

  if (error instanceof HttpError) {
    return res.status(error.status).json({
      success: false,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
  }

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Malformed JSON body" });
  }

  console.error(`[error] ${req.method} ${req.originalUrl}`, error);

  // Internal error details are only exposed outside production.
  return res.status(500).json({
    success: false,
    message: config.isProduction ? "Internal server error" : error.message || "Internal server error",
  });
}

module.exports = { notFoundHandler, errorHandler };
