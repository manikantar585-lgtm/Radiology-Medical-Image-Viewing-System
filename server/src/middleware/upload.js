const path = require("path");
const multer = require("multer");
const config = require("../config/env");
const { badRequest } = require("../utils/http");

const ALLOWED_EXTENSIONS = new Set([
  ".dcm",
  ".dicom",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".bmp",
  ".tif",
  ".tiff",
]);

// DICOM files often arrive as application/octet-stream or with no extension.
const ALLOWED_MIME_TYPES = new Set([
  "application/dicom",
  "application/octet-stream",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/bmp",
  "image/tiff",
]);

function fileFilter(_req, file, cb) {
  const extension = path.extname(String(file.originalname || "")).toLowerCase();
  const mime = String(file.mimetype || "").toLowerCase();

  if (!extension || ALLOWED_EXTENSIONS.has(extension) || ALLOWED_MIME_TYPES.has(mime)) {
    return cb(null, true);
  }
  return cb(badRequest("Unsupported file type. Please upload DICOM or supported image files."));
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.upload.maxFileSizeBytes,
    files: config.upload.maxFilesPerSeries,
  },
  fileFilter,
});

module.exports = { upload, fileFilter };
