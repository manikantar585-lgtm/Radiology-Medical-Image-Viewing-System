class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

const badRequest = (message) => new HttpError(400, message);
const unauthorized = (message = "Authentication required") => new HttpError(401, message);
const forbidden = (message = "Access denied") => new HttpError(403, message);
const notFound = (message = "Resource not found") => new HttpError(404, message);
const conflict = (message) => new HttpError(409, message);

/** Wraps an async route handler so rejected promises reach the error middleware. */
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

/** Parses a positive integer id, returning null for anything else. */
function toId(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Parses a required positive integer id or throws 400. */
function requireId(value, label) {
  const id = toId(value);
  if (!id) {
    throw badRequest(`${label} is required`);
  }
  return id;
}

/** Trims a value to a string, or returns null when it is empty. */
function trimOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const text = String(value).trim();
  return text === "" ? null : text;
}

module.exports = {
  HttpError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  asyncHandler,
  toId,
  requireId,
  trimOrNull,
};
