const { sql, query, withTransaction, inserted } = require("../db/pool");
const { notFound } = require("../utils/http");

const COLUMNS = `
  Id AS id, UserId AS userId, PatientId AS patientId, StudyId AS studyId,
  BodyPart AS bodyPart, StudyDate AS studyDate, StudyDescription AS studyDescription,
  Modality AS modality, CreatedAt AS createdAt`;

const SELECT_WITH_PATIENT = `
  SELECT
    s.Id AS id, s.UserId AS userId, s.PatientId AS patientId, s.StudyId AS studyId,
    s.BodyPart AS bodyPart, s.StudyDate AS studyDate, s.StudyDescription AS studyDescription,
    s.Modality AS modality, s.Status AS status, s.CreatedAt AS createdAt,
    p.Name AS patientName
  FROM dbo.Studies s
  LEFT JOIN dbo.Patients p ON p.Id = s.PatientId`;

// Images may be linked to a study directly or only through their series.
const IMAGE_COUNT = `
  (
    SELECT COUNT(DISTINCT pi.Id)
    FROM dbo.PatientImages pi
    WHERE pi.StudyId = s.Id
       OR EXISTS (SELECT 1 FROM dbo.Series sr WHERE sr.Id = pi.SeriesId AND sr.StudyId = s.Id)
  ) AS imageCount`;

const studyParams = ({ studyId, bodyPart, studyDate, studyDescription, modality }) => ({
  studyIdText: [sql.NVarChar(100), studyId],
  bodyPart: [sql.NVarChar(100), bodyPart],
  studyDate: [sql.DateTime, studyDate],
  studyDescription: [sql.NVarChar(200), studyDescription],
  modality: [sql.NVarChar(50), modality],
});

async function list(userId, { patientId } = {}) {
  const params = { userId: [sql.Int, userId] };
  let text = `
    SELECT
      s.Id AS id, s.UserId AS userId, s.PatientId AS patientId, s.StudyId AS studyId,
      s.BodyPart AS bodyPart, s.StudyDate AS studyDate, s.StudyDescription AS studyDescription,
      s.Modality AS modality, s.CreatedAt AS createdAt,
      ${IMAGE_COUNT},
      p.Name AS patientName
    FROM dbo.Studies s
    LEFT JOIN dbo.Patients p ON p.Id = s.PatientId
    WHERE s.UserId = @userId`;

  if (patientId) {
    text += " AND s.PatientId = @patientId";
    params.patientId = [sql.Int, patientId];
  }
  text += " ORDER BY s.StudyDate DESC, s.Id DESC";

  const { recordset } = await query(text, params);
  return recordset;
}

async function get(userId, studyId) {
  const { recordset } = await query(
    `${SELECT_WITH_PATIENT} WHERE s.Id = @studyId AND s.UserId = @userId`,
    { studyId: [sql.Int, studyId], userId: [sql.Int, userId] }
  );
  if (recordset.length === 0) {
    throw notFound("Study not found");
  }
  return recordset[0];
}

/** Returns the study's modality if it belongs to the patient and user, else null. */
async function findOwned(userId, studyId, patientId, executor) {
  const { recordset } = await query(
    `SELECT Id AS id, Modality AS modality FROM dbo.Studies
     WHERE Id = @studyId AND PatientId = @patientId AND UserId = @userId`,
    {
      studyId: [sql.Int, studyId],
      patientId: [sql.Int, patientId],
      userId: [sql.Int, userId],
    },
    executor
  );
  return recordset[0] || null;
}

async function create(userId, patientId, study) {
  const { recordset } = await query(
    `INSERT INTO dbo.Studies
       (UserId, PatientId, StudyId, BodyPart, StudyDate, StudyDescription, Modality, Status)
     OUTPUT ${inserted(COLUMNS)}
     VALUES
       (@userId, @patientId, @studyIdText, @bodyPart, @studyDate, @studyDescription, @modality, @status)`,
    {
      userId: [sql.Int, userId],
      patientId: [sql.Int, patientId],
      status: [sql.NVarChar(50), study.status || "Completed"],
      ...studyParams(study),
    }
  );
  return recordset[0];
}

async function update(userId, studyId, study) {
  const { recordset } = await query(
    `UPDATE dbo.Studies
     SET StudyId = @studyIdText, BodyPart = @bodyPart, StudyDate = @studyDate,
         StudyDescription = @studyDescription, Modality = @modality
     OUTPUT ${inserted(COLUMNS)}
     WHERE Id = @id AND UserId = @userId`,
    { id: [sql.Int, studyId], userId: [sql.Int, userId], ...studyParams(study) }
  );
  if (recordset.length === 0) {
    throw notFound("Study not found");
  }
  return recordset[0];
}

/** Deletes a study together with its series and images. */
async function remove(userId, studyId) {
  await withTransaction(async (transaction) => {
    const params = { studyId: [sql.Int, studyId], userId: [sql.Int, userId] };

    await query(
      "DELETE FROM dbo.PatientImages WHERE StudyId = @studyId AND UserId = @userId",
      params,
      transaction
    );
    await query(
      "DELETE FROM dbo.Series WHERE StudyId = @studyId AND UserId = @userId",
      params,
      transaction
    );
    const { rowsAffected } = await query(
      "DELETE FROM dbo.Studies WHERE Id = @studyId AND UserId = @userId",
      params,
      transaction
    );
    if (rowsAffected[0] === 0) {
      throw notFound("Study not found");
    }
  });
}

module.exports = { list, get, findOwned, create, update, remove };
