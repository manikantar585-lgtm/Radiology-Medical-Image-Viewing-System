const { sql, query } = require("../db/pool");
const { notFound } = require("../utils/http");

const METADATA_COLUMNS = `
  pi.Id AS id, pi.PatientId AS patientId, pi.StudyId AS studyId, pi.SeriesId AS seriesId,
  pi.ImageOrder AS imageOrder, pi.FileName AS fileName, pi.ContentType AS contentType,
  pi.CreatedAt AS createdAt`;

const ORDER_BY_IMAGE_ORDER = "ORDER BY ISNULL(pi.ImageOrder, 2147483647), pi.Id";

async function list(userId, { patientId, studyId, seriesId } = {}) {
  const params = { userId: [sql.Int, userId] };
  let text = `SELECT ${METADATA_COLUMNS} FROM dbo.PatientImages pi WHERE pi.UserId = @userId`;

  if (patientId) {
    text += " AND pi.PatientId = @patientId";
    params.patientId = [sql.Int, patientId];
  }
  if (studyId) {
    text += " AND pi.StudyId = @studyId";
    params.studyId = [sql.Int, studyId];
  }
  if (seriesId) {
    text += " AND pi.SeriesId = @seriesId";
    params.seriesId = [sql.Int, seriesId];
  }
  text += ` ${ORDER_BY_IMAGE_ORDER}`;

  const { recordset } = await query(text, params);
  return recordset;
}

/** Returns an image including its binary data, or throws 404. */
async function getWithData(userId, imageId) {
  const { recordset } = await query(
    `SELECT ${METADATA_COLUMNS}, pi.ImageData AS imageData
     FROM dbo.PatientImages pi
     WHERE pi.Id = @id AND pi.UserId = @userId`,
    { id: [sql.Int, imageId], userId: [sql.Int, userId] }
  );
  const image = recordset[0];
  if (!image || !image.imageData) {
    throw notFound("Image not found");
  }
  return image;
}

/** All images of a study with their data, whether linked directly or via a series. */
async function listStudyImagesWithData(userId, patientId, studyId) {
  const { recordset } = await query(
    `SELECT pi.Id AS id, pi.FileName AS fileName, pi.ContentType AS contentType,
            pi.ImageOrder AS imageOrder, pi.SeriesId AS seriesId, pi.ImageData AS imageData
     FROM dbo.PatientImages pi
     WHERE pi.UserId = @userId
       AND pi.PatientId = @patientId
       AND (
         pi.StudyId = @studyId
         OR EXISTS (
           SELECT 1 FROM dbo.Series sr
           WHERE sr.Id = pi.SeriesId AND sr.StudyId = @studyId AND sr.PatientId = @patientId
         )
       )
     ${ORDER_BY_IMAGE_ORDER}`,
    {
      userId: [sql.Int, userId],
      patientId: [sql.Int, patientId],
      studyId: [sql.Int, studyId],
    }
  );
  return recordset;
}

async function remove(userId, imageId) {
  const { rowsAffected } = await query(
    "DELETE FROM dbo.PatientImages WHERE Id = @id AND UserId = @userId",
    { id: [sql.Int, imageId], userId: [sql.Int, userId] }
  );
  if (rowsAffected[0] === 0) {
    throw notFound("Image not found or you do not have permission to delete it");
  }
}

/** Heuristic used by the preview endpoint to decide whether to render via the AI service. */
function isDicom({ fileName, contentType }) {
  const name = String(fileName || "").toLowerCase();
  const type = String(contentType || "").toLowerCase();
  return (
    name.endsWith(".dcm") ||
    name.endsWith(".dicom") ||
    type.includes("dicom") ||
    type === "application/octet-stream"
  );
}

module.exports = { list, getWithData, listStudyImagesWithData, remove, isDicom };
