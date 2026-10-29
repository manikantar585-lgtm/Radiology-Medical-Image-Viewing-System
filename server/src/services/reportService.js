const { sql, query, inserted } = require("../db/pool");
const { notFound } = require("../utils/http");

const COLUMNS = `
  Id AS id, UserId AS userId, PatientId AS patientId, StudyId AS studyId,
  RadiologistName AS radiologistName, Findings AS findings, Impression AS impression,
  Status AS status, ReportDate AS reportDate, CreatedAt AS createdAt`;

const reportParams = ({ radiologistName, findings, impression, status, reportDate }) => ({
  radiologistName: [sql.NVarChar(150), radiologistName],
  findings: [sql.NVarChar(sql.MAX), findings],
  impression: [sql.NVarChar(sql.MAX), impression],
  status: [sql.NVarChar(50), status || "Completed"],
  reportDate: [sql.DateTime, reportDate],
});

async function list(userId, { patientId, studyId } = {}) {
  const params = { userId: [sql.Int, userId] };
  let text = `
    SELECT
      r.Id AS id, r.UserId AS userId, r.PatientId AS patientId, r.StudyId AS studyId,
      r.RadiologistName AS radiologistName, r.Findings AS findings, r.Impression AS impression,
      r.Status AS status, r.ReportDate AS reportDate, r.CreatedAt AS createdAt,
      p.Name AS patientName
    FROM dbo.Reports r
    LEFT JOIN dbo.Patients p ON p.Id = r.PatientId
    WHERE r.UserId = @userId`;

  if (patientId) {
    text += " AND r.PatientId = @patientId";
    params.patientId = [sql.Int, patientId];
  }
  if (studyId) {
    text += " AND r.StudyId = @studyId";
    params.studyId = [sql.Int, studyId];
  }
  text += " ORDER BY r.Id DESC";

  const { recordset } = await query(text, params);
  return recordset;
}

async function create(userId, { patientId, studyId, ...report }) {
  const { recordset } = await query(
    `INSERT INTO dbo.Reports
       (UserId, PatientId, StudyId, RadiologistName, Findings, Impression, Status, ReportDate)
     OUTPUT ${inserted(COLUMNS)}
     VALUES
       (@userId, @patientId, @studyId, @radiologistName, @findings, @impression, @status, @reportDate)`,
    {
      userId: [sql.Int, userId],
      patientId: [sql.Int, patientId],
      studyId: [sql.Int, studyId],
      ...reportParams({ ...report, reportDate: report.reportDate || new Date() }),
    }
  );
  return recordset[0];
}

async function update(userId, reportId, report) {
  const { recordset } = await query(
    `UPDATE dbo.Reports
     SET RadiologistName = @radiologistName, Findings = @findings, Impression = @impression,
         Status = @status, ReportDate = @reportDate
     OUTPUT ${inserted(COLUMNS)}
     WHERE Id = @id AND UserId = @userId`,
    { id: [sql.Int, reportId], userId: [sql.Int, userId], ...reportParams(report) }
  );
  if (recordset.length === 0) {
    throw notFound("Report not found");
  }
  return recordset[0];
}

async function remove(userId, reportId) {
  const { rowsAffected } = await query(
    "DELETE FROM dbo.Reports WHERE Id = @id AND UserId = @userId",
    { id: [sql.Int, reportId], userId: [sql.Int, userId] }
  );
  if (rowsAffected[0] === 0) {
    throw notFound("Report not found");
  }
}

module.exports = { list, create, update, remove };
