const { z } = require("zod");
const { HttpError } = require("../utils/http");

/**
 * Parses `req[source]` with a zod schema and replaces it with the parsed,
 * coerced value. Validation failures become a 400 with the first issue as the
 * message and the full list under `details`.
 */
const validate =
  (schema, source = "body") =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return next(new HttpError(400, issues[0].message, issues));
    }
    // req.query is a getter in Express 5, so parsed values live on req.validated.
    req.validated = { ...req.validated, [source]: result.data };
    return next();
  };

/* Reusable field schemas */

const requiredText = (label, max) =>
  z
    .string({ required_error: `${label} is required`, invalid_type_error: `${label} must be text` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalText = (max) =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((value) => {
      const text = typeof value === "string" ? value.trim() : "";
      return text === "" ? null : text;
    })
    .pipe(z.string().max(max).nullable());

const id = (label) =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .positive(`${label} is required`);

const optionalId = (label) =>
  z
    .union([z.literal(""), z.null(), z.undefined(), id(label)])
    .transform((value) => (value === "" || value == null ? null : value));

const optionalDate = z
  .union([z.literal(""), z.null(), z.undefined(), z.coerce.date()])
  .transform((value) => (value instanceof Date ? value : null));

const idParam = (label) => z.object({ id: id(label) });

module.exports = { validate, z, requiredText, optionalText, id, optionalId, optionalDate, idParam };
