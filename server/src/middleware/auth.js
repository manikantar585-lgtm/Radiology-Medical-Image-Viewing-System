const jwt = require("jsonwebtoken");
const config = require("../config/env");
const { unauthorized } = require("../utils/http");

function signToken(user) {
  return jwt.sign({ sub: String(user.id), email: user.email }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

/**
 * Requires a valid `Authorization: Bearer <token>` header and exposes the
 * authenticated user's id as `req.userId`. The id never comes from the
 * request body or query string, so clients cannot act as another user.
 */
function requireAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(unauthorized());
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      return next(unauthorized("Invalid token"));
    }
    req.userId = userId;
    return next();
  } catch {
    return next(unauthorized("Session expired, please sign in again"));
  }
}

module.exports = { signToken, requireAuth };
