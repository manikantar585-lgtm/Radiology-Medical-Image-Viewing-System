const { sql, query, withTransaction, inserted } = require("../db/pool");
const { notFound } = require("../utils/http");

const COLUMNS = `
  Id AS id, UserId AS userId, PatientId AS patientId, StudyId AS studyId,
  SeriesNumber AS seriesNumber, SeriesDescription AS seriesDescription,
  Modality AS modality, CreatedAt AS createdAt`;

const IMAGE_COLUMNS = `
  Id AS id, PatientId AS patientId, StudyId AS studyId, SeriesId AS seriesId,
  ImageOrder AS imageOrder, FileName AS fileName, ContentType AS contentType,
  CreatedAt AS createdAt`;

const ownerParams = (userId, patientId, studyId) => ({
  userId: [sql.Int, userId],
  patientId: [sql.Int, patientId],
  studyId: [sql.Int, studyId],
});

async function list(userId, { patientId, studyId } = {}) {
  const params = { userId: [sql.Int, userId] };
  let text = `
    SELECT
      sr.Id AS id, sr.UserId AS userId, sr.PatientId AS patientId, sr.StudyId AS studyId,
      sr.SeriesNumber AS seriesNumber, sr.SeriesDescription AS seriesDescription,
      sr.Modality AS modality, sr.CreatedAt AS createdAt,
      COUNT(pi.Id) AS imageCount,
      (
        SELECT TOP 1 pi2.Id
        FROM dbo.PatientImages pi2
        WHERE pi2.SeriesId = sr.Id
        ORDER BY ISNULL(pi2.ImageOrder, 2147483647), pi2.Id
      ) AS firstImageId
    FROM dbo.Series sr
    LEFT JOIN dbo.PatientImages pi ON pi.SeriesId = sr.Id
    WHERE sr.UserId = @userId`;

  if (patientId) {
    text += " AND sr.PatientId = @patientId";
    params.patientId = [sql.Int, patientId];
  }
  if (studyId) {
    text += " AND sr.StudyId = @studyId";
    params.studyId = [sql.Int, studyId];
  }
  text += `
    GROUP BY sr.Id, sr.UserId, sr.PatientId, sr.StudyId, sr.SeriesNumber,
             sr.SeriesDescription, sr.Modality, sr.CreatedAt
    ORDER BY sr.SeriesNumber, sr.Id`;

  const { recordset } = await query(text, params);
  return recordset;
}

async function nextSeriesNumber(userId, patientId, studyId, executor) {
  const { recordset } = await query(
    `SELECT ISNULL(MAX(SeriesNumber), 0) + 1 AS nextSeriesNumber
     FROM dbo.Series
     WHERE StudyId = @studyId AND PatientId = @patientId AND UserId = @userId`,
    ownerParams(userId, patientId, studyId),
    executor
  );
  return Number(recordset[0].nextSeriesNumber);
}

async function insertSeries(
  userId,
  patientId,
  studyId,
  { seriesNumber, description, modality },
  executor
) {
  const { recordset } = await query(
    `INSERT INTO dbo.Series (UserId, PatientId, StudyId, SeriesNumber, SeriesDescription, Modality)
     OUTPUT ${inserted(COLUMNS)}
     VALUES (@userId, @patientId, @studyId, @seriesNumber, @seriesDescription, @modality)`,
    {
      ...ownerParams(userId, patientId, studyId),
      seriesNumber: [sql.Int, seriesNumber],
      seriesDescription: [sql.NVarChar(200), description],
      modality: [sql.NVarChar(50), modality],
    },
    executor
  );
  return recordset[0];
}

/**
 * Creates a series. When no valid series number is given, the next free
 * number within the study is used.
 */
async function create(userId, { patientId, studyId, seriesNumber, seriesDescription, modality }) {
  const number =
    Number.isInteger(seriesNumber) && seriesNumber > 0
      ? seriesNumber
      : await nextSeriesNumber(userId, patientId, studyId);

  return insertSeries(userId, patientId, studyId, {
    seriesNumber: number,
    description: seriesDescription || `Series ${number}`,
    modality,
  });
}

/**
 * Stores uploaded files as a series in one transaction. Files are appended to
 * `seriesId` when given, otherwise a new series is created for them.
 */
async function uploadImages(userId, { patientId, studyId, seriesId, modality, files }) {
  return withTransaction(async (transaction) => {
    let targetSeriesId = seriesId;

    if (targetSeriesId) {
      const { recordset } = await query(
        `SELECT Id FROM dbo.Series
         WHERE Id = @seriesId AND PatientId = @patientId AND StudyId = @studyId AND UserId = @userId`,
        { ...ownerParams(userId, patientId, studyId), seriesId: [sql.Int, targetSeriesId] },
        transaction
      );
      if (recordset.length === 0) {
        throw notFound("Series not found or you do not have permission to use it");
      }
    } else {
      const number = await nextSeriesNumber(userId, patientId, studyId, transaction);
      const created = await insertSeries(
        userId,
        patientId,
        studyId,
        { seriesNumber: number, description: `Series ${number}`, modality },
        transaction
      );
      targetSeriesId = created.id;
    }

    const { recordset: orderRows } = await query(
      "SELECT ISNULL(MAX(ImageOrder), 0) AS lastOrder FROM dbo.PatientImages WHERE SeriesId = @seriesId",
      { seriesId: [sql.Int, targetSeriesId] },
      transaction
    );
    const startOrder = Number(orderRows[0].lastOrder) || 0;

    const images = [];
    for (const [index, file] of files.entries()) {
      const { recordset } = await query(
        `INSERT INTO dbo.PatientImages
           (UserId, PatientId, StudyId, SeriesId, ImageOrder, FileName, ContentType, ImageData)
         OUTPUT ${inserted(IMAGE_COLUMNS)}
         VALUES (@userId, @patientId, @studyId, @seriesId, @imageOrder, @fileName, @contentType, @imageData)`,
        {
          ...ownerParams(userId, patientId, studyId),
          seriesId: [sql.Int, targetSeriesId],
          imageOrder: [sql.Int, startOrder + index + 1],
          fileName: [sql.NVarChar(255), file.originalname],
          contentType: [sql.NVarChar(100), file.mimetype || "application/octet-stream"],
          imageData: [sql.VarBinary(sql.MAX), file.buffer],
        },
        transaction
      );
      images.push(recordset[0]);
    }

    return { seriesId: targetSeriesId, images };
  });
}

/** Deletes a series and all of its images. */
async function remove(userId, seriesId) {
  await withTransaction(async (transaction) => {
    const params = { seriesId: [sql.Int, seriesId], userId: [sql.Int, userId] };

    await query(
      "DELETE FROM dbo.PatientImages WHERE SeriesId = @seriesId AND UserId = @userId",
      params,
      transaction
    );
    const { rowsAffected } = await query(
      "DELETE FROM dbo.Series WHERE Id = @seriesId AND UserId = @userId",
      params,
      transaction
    );
    if (rowsAffected[0] === 0) {
      throw notFound("Series not found");
    }
  });
}

module.exports = { list, create, uploadImages, remove };
