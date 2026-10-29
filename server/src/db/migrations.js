const { query } = require("./pool");

const createTable = (name, columns) => `
  IF OBJECT_ID('dbo.${name}', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.${name} (${columns})
  END`;

const addColumn = (table, column, definition) => `
  IF COL_LENGTH('dbo.${table}', '${column}') IS NULL
  BEGIN
    ALTER TABLE dbo.${table} ADD ${column} ${definition}
  END`;

/*
 * Idempotent schema setup. Each statement is safe to run on every start, so
 * databases created by older versions of the app are upgraded in place.
 */
const SCHEMA_STATEMENTS = [
  createTable(
    "Users",
    `Id INT IDENTITY(1,1) PRIMARY KEY,
     FullName NVARCHAR(100) NOT NULL,
     Email NVARCHAR(150) NOT NULL UNIQUE,
     Mobile NVARCHAR(20) NOT NULL,
     EmployeeId NVARCHAR(50) NOT NULL UNIQUE,
     Department NVARCHAR(100) NOT NULL,
     Password NVARCHAR(255) NOT NULL,
     CreatedAt DATETIME DEFAULT GETDATE()`
  ),

  createTable(
    "Patients",
    `Id INT IDENTITY(1,1) PRIMARY KEY,
     UserId INT NULL,
     Name NVARCHAR(100) NOT NULL,
     Age INT NULL,
     Gender NVARCHAR(20) NULL,
     Phone NVARCHAR(20) NULL,
     CreatedAt DATETIME DEFAULT GETDATE()`
  ),
  addColumn("Patients", "UserId", "INT NULL"),

  createTable(
    "Studies",
    `Id INT IDENTITY(1,1) PRIMARY KEY,
     UserId INT NULL,
     PatientId INT NOT NULL,
     StudyDate DATETIME NULL,
     StudyDescription NVARCHAR(200) NULL,
     Modality NVARCHAR(50) NULL,
     CreatedAt DATETIME DEFAULT GETDATE()`
  ),
  addColumn("Studies", "UserId", "INT NULL"),
  addColumn("Studies", "StudyDescription", "NVARCHAR(200) NULL"),
  // Business identifier such as "ST001", distinct from the Id primary key.
  addColumn("Studies", "StudyId", "NVARCHAR(100) NULL"),
  addColumn("Studies", "BodyPart", "NVARCHAR(100) NULL"),
  addColumn("Studies", "Status", "NVARCHAR(50) NULL"),

  createTable(
    "PatientImages",
    `Id INT IDENTITY(1,1) PRIMARY KEY,
     UserId INT NULL,
     PatientId INT NOT NULL,
     StudyId INT NULL,
     SeriesId INT NULL,
     ImageOrder INT NULL,
     FileName NVARCHAR(255) NULL,
     ContentType NVARCHAR(100) NULL,
     ImageData VARBINARY(MAX) NULL,
     CreatedAt DATETIME DEFAULT GETDATE()`
  ),
  addColumn("PatientImages", "UserId", "INT NULL"),
  addColumn("PatientImages", "StudyId", "INT NULL"),
  addColumn("PatientImages", "SeriesId", "INT NULL"),
  addColumn("PatientImages", "ImageOrder", "INT NULL"),

  createTable(
    "Reports",
    `Id INT IDENTITY(1,1) PRIMARY KEY,
     UserId INT NULL,
     PatientId INT NULL,
     StudyId INT NULL,
     RadiologistName NVARCHAR(150) NULL,
     Findings NVARCHAR(MAX) NULL,
     Impression NVARCHAR(MAX) NULL,
     Status NVARCHAR(50) NULL DEFAULT 'Completed',
     ReportDate DATETIME NULL DEFAULT GETDATE(),
     CreatedAt DATETIME NULL DEFAULT GETDATE()`
  ),
  addColumn("Reports", "UserId", "INT NULL"),

  createTable(
    "Series",
    `Id INT IDENTITY(1,1) PRIMARY KEY,
     UserId INT NULL,
     PatientId INT NOT NULL,
     StudyId INT NOT NULL,
     SeriesNumber INT NOT NULL,
     SeriesDescription NVARCHAR(200) NULL,
     Modality NVARCHAR(50) NULL,
     CreatedAt DATETIME DEFAULT GETDATE()`
  ),
  addColumn("Series", "UserId", "INT NULL"),
  addColumn("Series", "SeriesDescription", "NVARCHAR(200) NULL"),
  addColumn("Series", "Modality", "NVARCHAR(50) NULL"),

  // Legacy databases had a NOT NULL SeriesName column; relax it.
  `IF COL_LENGTH('dbo.Series', 'SeriesName') IS NOT NULL
   BEGIN
     ALTER TABLE dbo.Series ALTER COLUMN SeriesName NVARCHAR(200) NULL
   END`,
];

/*
 * Data repair for databases created before series and per-user ownership
 * existed: give every study with images a primary series, attach orphan
 * images to it, and assign unowned rows to the first registered user.
 */
const BACKFILL_STATEMENTS = [
  `INSERT INTO dbo.Series (UserId, PatientId, StudyId, SeriesNumber, SeriesDescription, Modality)
   SELECT st.UserId, st.PatientId, st.Id, 1, 'Primary Image Series', st.Modality
   FROM dbo.Studies st
   WHERE EXISTS (SELECT 1 FROM dbo.PatientImages pi WHERE pi.StudyId = st.Id)
     AND NOT EXISTS (
       SELECT 1 FROM dbo.Series sr
       WHERE sr.StudyId = st.Id AND sr.PatientId = st.PatientId AND sr.SeriesNumber = 1
     )`,

  `UPDATE pi SET pi.SeriesId = sr.Id
   FROM dbo.PatientImages pi
   INNER JOIN dbo.Series sr
     ON sr.StudyId = pi.StudyId AND sr.PatientId = pi.PatientId AND sr.SeriesNumber = 1
   WHERE pi.SeriesId IS NULL`,
];

const OWNERSHIP_BACKFILL_STATEMENTS = [
  `UPDATE dbo.Patients SET UserId = (SELECT TOP 1 Id FROM dbo.Users ORDER BY Id)
   WHERE UserId IS NULL`,
  ...["Studies", "PatientImages", "Reports", "Series"].map(
    (table) => `
      UPDATE t SET t.UserId = p.UserId
      FROM dbo.${table} t
      INNER JOIN dbo.Patients p ON p.Id = t.PatientId
      WHERE t.UserId IS NULL`
  ),
];

async function runMigrations() {
  for (const statement of [...SCHEMA_STATEMENTS, ...BACKFILL_STATEMENTS]) {
    await query(statement);
  }

  const { recordset } = await query("SELECT TOP 1 Id FROM dbo.Users");
  if (recordset.length > 0) {
    for (const statement of OWNERSHIP_BACKFILL_STATEMENTS) {
      await query(statement);
    }
  }
}

module.exports = { runMigrations };
