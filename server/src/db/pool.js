const sql = require("mssql");
const config = require("../config/env");

let pool = null;

async function connect() {
  if (!pool) {
    pool = await new sql.ConnectionPool(config.db).connect();
  }
  return pool;
}

function getPool() {
  if (!pool) {
    throw new Error("Database pool is not connected; call connect() first");
  }
  return pool;
}

async function close() {
  if (pool) {
    await pool.close();
    pool = null;
  }
}

/**
 * Runs a parameterised query.
 *
 * @param {string} text SQL text using @name placeholders.
 * @param {Record<string, [import("mssql").ISqlType | Function, unknown]>} params
 *   Map of placeholder name to [sql type, value].
 * @param {import("mssql").ConnectionPool | import("mssql").Transaction} [executor]
 *   Pool or open transaction; defaults to the shared pool.
 */
async function query(text, params = {}, executor = getPool()) {
  const request = executor.request();
  for (const [name, [type, value]] of Object.entries(params)) {
    request.input(name, type, value);
  }
  return request.query(text);
}

/**
 * Runs `work(transaction)` inside a transaction, committing on success and
 * rolling back on any thrown error.
 */
async function withTransaction(work) {
  const transaction = new sql.Transaction(getPool());
  await transaction.begin();
  try {
    const result = await work(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      console.error("[db] rollback failed", rollbackError);
    }
    throw error;
  }
}

/**
 * Prefixes each source column in a "Col AS alias" list with INSERTED., for
 * reuse in OUTPUT clauses: "Id AS id, Name AS name" -> "INSERTED.Id AS id, ...".
 */
const inserted = (columns) => columns.replace(/(\w+) AS/g, "INSERTED.$1 AS");

module.exports = { sql, connect, getPool, close, query, withTransaction, inserted };
