const { sql, query, inserted } = require("../db/pool");
const { notFound } = require("../utils/http");

const COLUMNS = "Id AS id, Name AS name, Age AS age, Gender AS gender, Phone AS phone, CreatedAt AS createdAt";
const INSERTED_COLUMNS = inserted(COLUMNS);

const patientParams = ({ name, age, gender, phone }) => ({
  name: [sql.NVarChar(100), name],
  age: [sql.Int, age],
  gender: [sql.NVarChar(20), gender],
  phone: [sql.NVarChar(20), phone],
});

async function list(userId) {
  const { recordset } = await query(
    `SELECT ${COLUMNS} FROM dbo.Patients WHERE UserId = @userId ORDER BY Id DESC`,
    { userId: [sql.Int, userId] }
  );
  return recordset;
}

async function get(userId, patientId) {
  const { recordset } = await query(
    `SELECT ${COLUMNS} FROM dbo.Patients WHERE Id = @id AND UserId = @userId`,
    { id: [sql.Int, patientId], userId: [sql.Int, userId] }
  );
  if (recordset.length === 0) {
    throw notFound("Patient not found");
  }
  return recordset[0];
}

/** Returns true when the patient exists and belongs to the user. */
async function isOwnedBy(userId, patientId) {
  const { recordset } = await query(
    "SELECT 1 AS ok FROM dbo.Patients WHERE Id = @id AND UserId = @userId",
    { id: [sql.Int, patientId], userId: [sql.Int, userId] }
  );
  return recordset.length > 0;
}

async function create(userId, patient) {
  const { recordset } = await query(
    `INSERT INTO dbo.Patients (UserId, Name, Age, Gender, Phone)
     OUTPUT ${INSERTED_COLUMNS}
     VALUES (@userId, @name, @age, @gender, @phone)`,
    { userId: [sql.Int, userId], ...patientParams(patient) }
  );
  return recordset[0];
}

async function update(userId, patientId, patient) {
  const { recordset } = await query(
    `UPDATE dbo.Patients
     SET Name = @name, Age = @age, Gender = @gender, Phone = @phone
     OUTPUT ${INSERTED_COLUMNS}
     WHERE Id = @id AND UserId = @userId`,
    { id: [sql.Int, patientId], userId: [sql.Int, userId], ...patientParams(patient) }
  );
  if (recordset.length === 0) {
    throw notFound("Patient not found");
  }
  return recordset[0];
}

async function remove(userId, patientId) {
  const { rowsAffected } = await query(
    "DELETE FROM dbo.Patients WHERE Id = @id AND UserId = @userId",
    { id: [sql.Int, patientId], userId: [sql.Int, userId] }
  );
  if (rowsAffected[0] === 0) {
    throw notFound("Patient not found");
  }
}

module.exports = { list, get, isOwnedBy, create, update, remove };
