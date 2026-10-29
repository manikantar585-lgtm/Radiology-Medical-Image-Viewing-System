const bcrypt = require("bcryptjs");
const { sql, query, inserted } = require("../db/pool");
const { conflict, notFound, unauthorized, badRequest } = require("../utils/http");

const BCRYPT_ROUNDS = 10;

const PUBLIC_COLUMNS = `
  Id AS id, FullName AS fullName, Email AS email, Mobile AS mobile,
  EmployeeId AS employeeId, Department AS department`;

function assertStrongPassword(password) {
  if (
    password.length < 8 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    throw badRequest(
      "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, and one number"
    );
  }
}

async function register({ fullName, email, mobile, employeeId, department, password }) {
  assertStrongPassword(password);

  const existing = await query(
    "SELECT Id FROM dbo.Users WHERE Email = @email OR EmployeeId = @employeeId",
    {
      email: [sql.NVarChar(150), email],
      employeeId: [sql.NVarChar(50), employeeId],
    }
  );
  if (existing.recordset.length > 0) {
    throw conflict("Email or Employee ID already exists");
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const { recordset } = await query(
    `INSERT INTO dbo.Users (FullName, Email, Mobile, EmployeeId, Department, Password)
     OUTPUT ${inserted(PUBLIC_COLUMNS)}
     VALUES (@fullName, @email, @mobile, @employeeId, @department, @password)`,
    {
      fullName: [sql.NVarChar(100), fullName],
      email: [sql.NVarChar(150), email],
      mobile: [sql.NVarChar(20), mobile],
      employeeId: [sql.NVarChar(50), employeeId],
      department: [sql.NVarChar(100), department],
      password: [sql.NVarChar(255), hashedPassword],
    }
  );
  return recordset[0];
}

async function authenticate(email, password) {
  const { recordset } = await query(
    `SELECT ${PUBLIC_COLUMNS}, Password AS passwordHash FROM dbo.Users WHERE Email = @email`,
    { email: [sql.NVarChar(150), email] }
  );

  const user = recordset[0];
  // Same message for unknown email and wrong password to avoid user enumeration.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw unauthorized("Invalid Email or Password");
  }

  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

async function findById(userId) {
  const { recordset } = await query(`SELECT ${PUBLIC_COLUMNS} FROM dbo.Users WHERE Id = @id`, {
    id: [sql.Int, userId],
  });
  return recordset[0] || null;
}

async function updateProfile(userId, { fullName, mobile, department }) {
  const { recordset } = await query(
    `UPDATE dbo.Users
     SET FullName = @fullName, Mobile = @mobile, Department = @department
     OUTPUT ${inserted(PUBLIC_COLUMNS)}
     WHERE Id = @id`,
    {
      id: [sql.Int, userId],
      fullName: [sql.NVarChar(100), fullName],
      mobile: [sql.NVarChar(20), mobile],
      department: [sql.NVarChar(100), department],
    }
  );
  if (recordset.length === 0) {
    throw notFound("User not found");
  }
  return recordset[0];
}

async function changePassword(userId, currentPassword, newPassword) {
  assertStrongPassword(newPassword);
  if (currentPassword === newPassword) {
    throw badRequest("New password must be different from the current password");
  }

  const { recordset } = await query("SELECT Password FROM dbo.Users WHERE Id = @id", {
    id: [sql.Int, userId],
  });
  if (recordset.length === 0) {
    throw notFound("User not found");
  }
  if (!(await bcrypt.compare(currentPassword, recordset[0].Password))) {
    throw unauthorized("Current password is incorrect");
  }

  await query("UPDATE dbo.Users SET Password = @password WHERE Id = @id", {
    id: [sql.Int, userId],
    password: [sql.NVarChar(255), await bcrypt.hash(newPassword, BCRYPT_ROUNDS)],
  });
}

module.exports = {
  register,
  authenticate,
  findById,
  updateProfile,
  changePassword,
  assertStrongPassword,
};
