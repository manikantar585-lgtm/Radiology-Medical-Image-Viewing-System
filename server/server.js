require("dotenv").config();

const express = require("express");
const cors = require("cors");
const sql = require("mssql");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const axios = require("axios");

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "50mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "50mb",
  })
);


/* =========================
   SQL SERVER CONFIGURATION
========================= */

// Credentials come only from server/.env (never commit them).
const dbConfig = {
  user: process.env.DB_USER,

  password:
    process.env.DB_PASSWORD,

  server:
    process.env.DB_SERVER ||
    "localhost",

  database:
    process.env.DB_NAME ||
    "RadiologyDB",

  options: {
    encrypt: false,
    trustServerCertificate: true,
  },

  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },

  requestTimeout: 120000,
};


/* =========================
   SQL CONNECTION POOL
========================= */

let pool;

async function connectDatabase() {
  try {
    pool = await sql.connect(
      dbConfig
    );

    console.log(
      "SQL Server Connected Successfully"
    );

    await initializeDatabase();

    console.log(
      "Database initialization completed"
    );
  } catch (error) {
    console.log(
      "Database Connection Failed"
    );

    console.log(
      error.message
    );

    process.exit(1);
  }
}


/* =========================
   USER ID HELPER
========================= */

function getUserId(req) {
  const headerUserId =
    req.headers["x-user-id"];

  if (
    headerUserId !== undefined &&
    headerUserId !== null &&
    String(headerUserId).trim() !== ""
  ) {
    const id = Number(
      headerUserId
    );

    if (
      Number.isInteger(id) &&
      id > 0
    ) {
      return id;
    }
  }

  const bodyUserId =
    req.body &&
    req.body.userId;

  if (
    bodyUserId !== undefined &&
    bodyUserId !== null &&
    String(bodyUserId).trim() !== ""
  ) {
    const id = Number(
      bodyUserId
    );

    if (
      Number.isInteger(id) &&
      id > 0
    ) {
      return id;
    }
  }

  const queryUserId =
    req.query &&
    req.query.userId;

  if (
    queryUserId !== undefined &&
    queryUserId !== null &&
    String(queryUserId).trim() !== ""
  ) {
    const id = Number(
      queryUserId
    );

    if (
      Number.isInteger(id) &&
      id > 0
    ) {
      return id;
    }
  }

  return null;
}


/* =========================
   CHECK USER
========================= */

async function userExists(
  userId
) {
  if (!userId) {
    return false;
  }

  const result =
    await pool
      .request()
      .input(
        "userId",
        sql.Int,
        userId
      )
      .query(`
        SELECT Id
        FROM dbo.Users
        WHERE Id = @userId
      `);

  return (
    result.recordset.length >
    0
  );
}


/* =========================
   MULTER CONFIGURATION
========================= */

const storage =
  multer.memoryStorage();

const upload = multer({
  storage,

  limits: {
    // Kept in sync with MAX_UPLOAD_FILE_SIZE_BYTES in the frontend's
    // ImageViewer component. These two values must always match, or
    // files between the two limits will pass the client-side check
    // and then be silently rejected by the server.
    fileSize:
      100 * 1024 * 1024,

    files: 500,
  },

  fileFilter:
    (_req, file, cb) => {
      const fileName =
        String(
          file.originalname || ""
        ).toLowerCase();

      const mime =
        String(
          file.mimetype || ""
        ).toLowerCase();

      const extension =
        fileName.includes(".")
          ? fileName
              .substring(
                fileName.lastIndexOf(
                  "."
                )
              )
          : "";

      const allowedExtensions =
        [
          ".dcm",
          ".dicom",
          ".png",
          ".jpg",
          ".jpeg",
          ".webp",
          ".bmp",
          ".tif",
          ".tiff",
        ];

      const allowedMimeTypes =
        [
          "application/dicom",
          "application/octet-stream",
          "image/png",
          "image/jpeg",
          "image/webp",
          "image/bmp",
          "image/tiff",
        ];

      /*
       * DICOM files sometimes arrive
       * with application/octet-stream,
       * so we allow that MIME type.
       *
       * We also allow normal image files
       * because the existing application
       * supports regular image uploads.
       */

      if (
        allowedExtensions.includes(
          extension
        ) ||
        allowedMimeTypes.includes(
          mime
        ) ||
        !extension
      ) {
        return cb(
          null,
          true
        );
      }

      return cb(
        new Error(
          "Unsupported file type"
        )
      );
    },
});


/* =========================
   DATABASE INITIALIZATION
========================= */

async function initializeDatabase() {
  try {
    /*
     * USERS
     */

    await pool
      .request()
      .query(`
        IF OBJECT_ID(
          'dbo.Users',
          'U'
        ) IS NULL
        BEGIN
          CREATE TABLE dbo.Users
          (
            Id INT IDENTITY(1,1)
              PRIMARY KEY,

            FullName
              NVARCHAR(100)
              NOT NULL,

            Email
              NVARCHAR(150)
              NOT NULL
              UNIQUE,

            Mobile
              NVARCHAR(20)
              NOT NULL,

            EmployeeId
              NVARCHAR(50)
              NOT NULL
              UNIQUE,

            Department
              NVARCHAR(100)
              NOT NULL,

            Password
              NVARCHAR(255)
              NOT NULL,

            CreatedAt DATETIME
              DEFAULT GETDATE()
          )
        END
      `);


    /*
     * PATIENTS
     */

    await pool
      .request()
      .query(`
        IF OBJECT_ID(
          'dbo.Patients',
          'U'
        ) IS NULL
        BEGIN
          CREATE TABLE dbo.Patients
          (
            Id INT IDENTITY(1,1)
              PRIMARY KEY,

            UserId INT NULL,

            Name
              NVARCHAR(100)
              NOT NULL,

            Age INT NULL,

            Gender
              NVARCHAR(20)
              NULL,

            Phone
              NVARCHAR(20)
              NULL,

            CreatedAt DATETIME
              DEFAULT GETDATE()
          )
        END
      `);


    /*
     * ADD USER ID TO PATIENTS
     */

    await pool
      .request()
      .query(`
        IF COL_LENGTH(
          'dbo.Patients',
          'UserId'
        ) IS NULL
        BEGIN
          ALTER TABLE dbo.Patients
          ADD UserId INT NULL
        END
      `);


    /*
     * STUDIES
     */

    await pool
      .request()
      .query(`
        IF OBJECT_ID(
          'dbo.Studies',
          'U'
        ) IS NULL
        BEGIN
          CREATE TABLE dbo.Studies
          (
            Id INT IDENTITY(1,1)
              PRIMARY KEY,

            UserId INT NULL,

            PatientId INT NOT NULL,

            StudyDate DATETIME NULL,

            StudyDescription
              NVARCHAR(200)
              NULL,

            Modality
              NVARCHAR(50)
              NULL,

            CreatedAt DATETIME
              DEFAULT GETDATE()
          )
        END
      `);


    /*
     * ADD USER ID TO STUDIES
     */

    await pool
      .request()
      .query(`
        IF COL_LENGTH(
          'dbo.Studies',
          'UserId'
        ) IS NULL
        BEGIN
          ALTER TABLE dbo.Studies
          ADD UserId INT NULL
        END
      `);


    await pool
      .request()
      .query(`
        IF COL_LENGTH(
          'dbo.Studies',
          'StudyDescription'
        ) IS NULL
        BEGIN
          ALTER TABLE dbo.Studies
          ADD StudyDescription NVARCHAR(200) NULL
        END
      `);


    /*
     * ADD STUDY ID (business identifier,
     * e.g. "ST001" — distinct from the
     * auto-incrementing Id primary key)
     */

    await pool
      .request()
      .query(`
        IF COL_LENGTH(
          'dbo.Studies',
          'StudyId'
        ) IS NULL
        BEGIN
          ALTER TABLE dbo.Studies
          ADD StudyId NVARCHAR(100) NULL
        END
      `);


    /*
     * ADD BODY PART
     */

    await pool
      .request()
      .query(`
        IF COL_LENGTH(
          'dbo.Studies',
          'BodyPart'
        ) IS NULL
        BEGIN
          ALTER TABLE dbo.Studies
          ADD BodyPart NVARCHAR(100) NULL
        END
      `);


    /*
     * PATIENT IMAGES
     */

    await pool
      .request()
      .query(`
        IF OBJECT_ID(
          'dbo.PatientImages',
          'U'
        ) IS NULL
        BEGIN
          CREATE TABLE dbo.PatientImages
          (
            Id INT IDENTITY(1,1)
              PRIMARY KEY,

            UserId INT NULL,

            PatientId INT NOT NULL,

            StudyId INT NULL,

            SeriesId INT NULL,

            ImageOrder INT NULL,

            FileName
              NVARCHAR(255)
              NULL,

            ContentType
              NVARCHAR(100)
              NULL,

            ImageData
              VARBINARY(MAX)
              NULL,

            CreatedAt DATETIME
              DEFAULT GETDATE()
          )
        END
      `);


    /*
     * ADD IMAGE USER ID
     */

    await pool
      .request()
      .query(`
        IF COL_LENGTH(
          'dbo.PatientImages',
          'UserId'
        ) IS NULL
        BEGIN
          ALTER TABLE dbo.PatientImages
          ADD UserId INT NULL
        END
      `);


    /*
     * ADD STUDY ID
     */

    await pool
      .request()
      .query(`
        IF COL_LENGTH(
          'dbo.PatientImages',
          'StudyId'
        ) IS NULL
        BEGIN
          ALTER TABLE dbo.PatientImages
          ADD StudyId INT NULL
        END
      `);


    /*
     * ADD SERIES ID
     */

    await pool
      .request()
      .query(`
        IF COL_LENGTH(
          'dbo.PatientImages',
          'SeriesId'
        ) IS NULL
        BEGIN
          ALTER TABLE dbo.PatientImages
          ADD SeriesId INT NULL
        END
      `);


    /*
     * ADD IMAGE ORDER
     */

    await pool
      .request()
      .query(`
        IF COL_LENGTH(
          'dbo.PatientImages',
          'ImageOrder'
        ) IS NULL
        BEGIN
          ALTER TABLE dbo.PatientImages
          ADD ImageOrder INT NULL
        END
      `);


    /*
     * REPORTS
     */

    await pool
      .request()
      .query(`
        IF OBJECT_ID(
          'dbo.Reports',
          'U'
        ) IS NULL
        BEGIN
          CREATE TABLE dbo.Reports
          (
            Id INT IDENTITY(1,1)
              PRIMARY KEY,

            UserId INT NULL,

            PatientId INT NULL,

            StudyId INT NULL,

            RadiologistName
              NVARCHAR(150)
              NULL,

            Findings
              NVARCHAR(MAX)
              NULL,

            Impression
              NVARCHAR(MAX)
              NULL,

            Status
              NVARCHAR(50)
              NULL
              DEFAULT 'Completed',

            ReportDate DATETIME
              NULL
              DEFAULT GETDATE(),

            CreatedAt DATETIME
              NULL
              DEFAULT GETDATE()
          )
        END
      `);


    /*
     * ADD REPORT USER ID
     */

    await pool
      .request()
      .query(`
        IF COL_LENGTH(
          'dbo.Reports',
          'UserId'
        ) IS NULL
        BEGIN
          ALTER TABLE dbo.Reports
          ADD UserId INT NULL
        END
      `);


    /*
     * SERIES
     */

    await pool
      .request()
      .query(`
        IF OBJECT_ID(
          'dbo.Series',
          'U'
        ) IS NULL
        BEGIN
          CREATE TABLE dbo.Series
          (
            Id INT IDENTITY(1,1)
              PRIMARY KEY,

            UserId INT NULL,

            PatientId INT NOT NULL,

            StudyId INT NOT NULL,

            SeriesNumber INT NOT NULL,

            SeriesDescription
              NVARCHAR(200)
              NULL,

            Modality
              NVARCHAR(50)
              NULL,

            CreatedAt DATETIME
              DEFAULT GETDATE()
          )
        END
      `);


    /*
     * SERIES USER ID
     */

    await pool
      .request()
      .query(`
        IF COL_LENGTH(
          'dbo.Series',
          'UserId'
        ) IS NULL
        BEGIN
          ALTER TABLE dbo.Series
          ADD UserId INT NULL
        END
      `);


    /*
     * SERIES DESCRIPTION
     */

    await pool
      .request()
      .query(`
        IF COL_LENGTH(
          'dbo.Series',
          'SeriesDescription'
        ) IS NULL
        BEGIN
          ALTER TABLE dbo.Series
          ADD SeriesDescription
            NVARCHAR(200) NULL
        END
      `);


    /*
     * SERIES MODALITY
     */

    await pool
      .request()
      .query(`
        IF COL_LENGTH(
          'dbo.Series',
          'Modality'
        ) IS NULL
        BEGIN
          ALTER TABLE dbo.Series
          ADD Modality
            NVARCHAR(50) NULL
        END
      `);


    /*
     * SERIES NAME
     *
     * Keep old database compatible.
     */

    await pool
      .request()
      .query(`
        IF COL_LENGTH(
          'dbo.Series',
          'SeriesName'
        ) IS NOT NULL
        BEGIN
          ALTER TABLE dbo.Series
          ALTER COLUMN SeriesName
            NVARCHAR(200) NULL
        END
      `);


    /*
     * CREATE SERIES FOR EXISTING
     * STUDIES THAT ALREADY HAVE IMAGES
     */

    await pool
      .request()
      .query(`
        INSERT INTO dbo.Series
        (
          UserId,
          PatientId,
          StudyId,
          SeriesNumber,
          SeriesDescription,
          Modality
        )

        SELECT
          st.UserId,
          st.PatientId,
          st.Id,
          1,
          'Primary Image Series',
          st.Modality

        FROM dbo.Studies st

        WHERE EXISTS
        (
          SELECT 1

          FROM dbo.PatientImages pi

          WHERE pi.StudyId =
            st.Id
        )

        AND NOT EXISTS
        (
          SELECT 1

          FROM dbo.Series sr

          WHERE sr.StudyId =
            st.Id

          AND sr.PatientId =
            st.PatientId

          AND sr.SeriesNumber =
            1
        );
      `);


    /*
     * CONNECT OLD IMAGES TO
     * PRIMARY SERIES
     */

    await pool
      .request()
      .query(`
        UPDATE pi

        SET pi.SeriesId =
          sr.Id

        FROM dbo.PatientImages pi

        INNER JOIN dbo.Series sr
          ON sr.StudyId =
            pi.StudyId

         AND sr.PatientId =
            pi.PatientId

         AND sr.SeriesNumber =
            1

        WHERE pi.SeriesId IS NULL
      `);


    /*
     * FIND FIRST USER
     */

    const firstUser =
      await pool
        .request()
        .query(`
          SELECT TOP 1 Id
          FROM dbo.Users
          ORDER BY Id ASC
        `);


    /*
     * REPAIR OLD RECORDS
     */

    if (
      firstUser.recordset.length >
      0
    ) {
      const defaultUserId =
        firstUser
          .recordset[0]
          .Id;


      await pool
        .request()
        .input(
          "defaultUserId",
          sql.Int,
          defaultUserId
        )
        .query(`
          UPDATE dbo.Patients

          SET UserId =
            @defaultUserId

          WHERE UserId IS NULL
        `);


      await pool
        .request()
        .query(`
          UPDATE s

          SET s.UserId =
            p.UserId

          FROM dbo.Studies s

          INNER JOIN dbo.Patients p
            ON p.Id =
              s.PatientId

          WHERE s.UserId IS NULL
        `);


      await pool
        .request()
        .query(`
          UPDATE pi

          SET pi.UserId =
            p.UserId

          FROM dbo.PatientImages pi

          INNER JOIN dbo.Patients p
            ON p.Id =
              pi.PatientId

          WHERE pi.UserId IS NULL
        `);


      await pool
        .request()
        .query(`
          UPDATE r

          SET r.UserId =
            p.UserId

          FROM dbo.Reports r

          INNER JOIN dbo.Patients p
            ON p.Id =
              r.PatientId

          WHERE r.UserId IS NULL
        `);


      await pool
        .request()
        .query(`
          UPDATE sr

          SET sr.UserId =
            p.UserId

          FROM dbo.Series sr

          INNER JOIN dbo.Patients p
            ON p.Id =
              sr.PatientId

          WHERE sr.UserId IS NULL
        `);
    }


    console.log(
      "User data separation is ready"
    );

    console.log(
      "Series support is ready"
    );
  } catch (error) {
    console.log(
      "Database Initialization Error"
    );

    console.log(
      error.message
    );

    throw error;
  }
}


/* =========================
   HOME
========================= */

app.get(
  "/",
  (_req, res) => {
    res.send(
      "Radiology Medical Image Viewing System Backend Running..."
    );
  }
);


/* =========================
   REGISTER
========================= */

app.post(
  "/api/register",
  async (req, res) => {
    try {
      const {
        fullName,
        email,
        mobile,
        employeeId,
        department,
        password,
      } = req.body;


      if (
        !fullName ||
        !email ||
        !mobile ||
        !employeeId ||
        !department ||
        !password
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please fill all fields",
        });
      }


      const existingUser =
        await pool
          .request()
          .input(
            "email",
            sql.NVarChar(150),
            email.trim()
          )
          .input(
            "employeeId",
            sql.NVarChar(50),
            employeeId.trim()
          )
          .query(`
            SELECT Id

            FROM dbo.Users

            WHERE Email =
              @email

            OR EmployeeId =
              @employeeId
          `);


      if (
        existingUser.recordset.length >
        0
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Email or Employee ID already exists",
        });
      }


      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );


      await pool
        .request()
        .input(
          "fullName",
          sql.NVarChar(100),
          fullName.trim()
        )
        .input(
          "email",
          sql.NVarChar(150),
          email.trim()
        )
        .input(
          "mobile",
          sql.NVarChar(20),
          mobile.trim()
        )
        .input(
          "employeeId",
          sql.NVarChar(50),
          employeeId.trim()
        )
        .input(
          "department",
          sql.NVarChar(100),
          department.trim()
        )
        .input(
          "password",
          sql.NVarChar(255),
          hashedPassword
        )
        .query(`
          INSERT INTO dbo.Users
          (
            FullName,
            Email,
            Mobile,
            EmployeeId,
            Department,
            Password
          )

          VALUES
          (
            @fullName,
            @email,
            @mobile,
            @employeeId,
            @department,
            @password
          )
        `);


      console.log(
        `New user registered: ${email}`
      );


      res.status(201).json({
        success: true,
        message:
          "Registration successful",
      });
    } catch (error) {
      console.log(
        "Registration Error"
      );

      console.log(error);

      res.status(500).json({
        success: false,
        message:
          "Registration failed",
      });
    }
  }
);


/* =========================
   LOGIN
========================= */

app.post(
  "/api/login",
  async (req, res) => {
    try {
      const {
        email,
        password,
      } = req.body;


      if (
        !email ||
        !password
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter email and password",
        });
      }


      const result =
        await pool
          .request()
          .input(
            "email",
            sql.NVarChar(150),
            email.trim()
          )
          .query(`
            SELECT
              Id,
              FullName,
              Email,
              Mobile,
              EmployeeId,
              Department,
              Password

            FROM dbo.Users

            WHERE Email =
              @email
          `);


      if (
        result.recordset.length ===
        0
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid Email or Password",
        });
      }


      const user =
        result.recordset[0];


      const passwordMatch =
        await bcrypt.compare(
          password,
          user.Password
        );


      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid Email or Password",
        });
      }


      console.log(
        `Login successful: ${email}`
      );


      res.status(200).json({
        success: true,

        message:
          "Login Successful",

        user: {
          id:
            user.Id,

          fullName:
            user.FullName,

          email:
            user.Email,

          mobile:
            user.Mobile,

          employeeId:
            user.EmployeeId,

          department:
            user.Department,
        },
      });
    } catch (error) {
      console.log(
        "Login Error"
      );

      console.log(error);

      res.status(500).json({
        success: false,
        message:
          "Login failed",
      });
    }
  }
);


/* =========================
   UPDATE PROFILE
========================= */

app.put(
  "/api/users/:id",
  async (req, res) => {
    try {
      const userId =
        Number(
          req.params.id
        );


      const {
        fullName,
        mobile,
        department,
      } = req.body;


      if (!userId) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid user ID",
        });
      }


      if (
        !fullName ||
        !mobile ||
        !department
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please fill all profile fields",
        });
      }


      const result =
        await pool
          .request()
          .input(
            "id",
            sql.Int,
            userId
          )
          .input(
            "fullName",
            sql.NVarChar(100),
            fullName.trim()
          )
          .input(
            "mobile",
            sql.NVarChar(20),
            mobile.trim()
          )
          .input(
            "department",
            sql.NVarChar(100),
            department.trim()
          )
          .query(`
            UPDATE dbo.Users

            SET
              FullName =
                @fullName,

              Mobile =
                @mobile,

              Department =
                @department

            OUTPUT
              INSERTED.Id AS id,

              INSERTED.FullName
                AS fullName,

              INSERTED.Email
                AS email,

              INSERTED.Mobile
                AS mobile,

              INSERTED.EmployeeId
                AS employeeId,

              INSERTED.Department
                AS department

            WHERE Id =
              @id
          `);


      if (
        result.recordset.length ===
        0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });
      }


      res.status(200).json({
        success: true,

        message:
          "Profile updated successfully",

        user:
          result.recordset[0],
      });
    } catch (error) {
      console.log(
        "Update Profile Error"
      );

      console.log(error);

      res.status(500).json({
        success: false,
        message:
          "Unable to update profile",
      });
    }
  }
);


/* =========================
   CHANGE PASSWORD
========================= */

app.post(
  "/api/change-password",
  async (req, res) => {
    try {
      const {
        userId,
        currentPassword,
        newPassword,
      } = req.body;


      if (
        !userId ||
        !currentPassword ||
        !newPassword
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please fill all password fields",
        });
      }


      if (
        newPassword.length < 8 ||
        !/[A-Z]/.test(
          newPassword
        ) ||
        !/[a-z]/.test(
          newPassword
        ) ||
        !/[0-9]/.test(
          newPassword
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "New password must contain at least 8 characters, one uppercase letter, one lowercase letter, and one number",
        });
      }


      const result =
        await pool
          .request()
          .input(
            "userId",
            sql.Int,
            Number(userId)
          )
          .query(`
            SELECT
              Id,
              Password

            FROM dbo.Users

            WHERE Id =
              @userId
          `);


      if (
        result.recordset.length ===
        0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });
      }


      const user =
        result.recordset[0];


      const passwordMatch =
        await bcrypt.compare(
          currentPassword,
          user.Password
        );


      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          message:
            "Current password is incorrect",
        });
      }


      if (
        currentPassword ===
        newPassword
      ) {
        return res.status(400).json({
          success: false,
          message:
            "New password must be different from the current password",
        });
      }


      const hashedPassword =
        await bcrypt.hash(
          newPassword,
          10
        );


      await pool
        .request()
        .input(
          "userId",
          sql.Int,
          Number(userId)
        )
        .input(
          "password",
          sql.NVarChar(255),
          hashedPassword
        )
        .query(`
          UPDATE dbo.Users

          SET Password =
            @password

          WHERE Id =
            @userId
        `);


      res.status(200).json({
        success: true,
        message:
          "Password changed successfully",
      });
    } catch (error) {
      console.log(
        "Change Password Error"
      );

      console.log(error);

      res.status(500).json({
        success: false,
        message:
          "Unable to change password",
      });
    }
  }
);


/* =========================
   GET ALL PATIENTS
========================= */

app.get(
  "/api/patients",
  async (req, res) => {
    try {
      const userId =
        getUserId(req);


      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "User ID is required",
        });
      }


      const exists =
        await userExists(
          userId
        );


      if (!exists) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid user",
        });
      }


      const result =
        await pool
          .request()
          .input(
            "userId",
            sql.Int,
            userId
          )
          .query(`
            SELECT
              Id AS id,

              Name AS name,

              Age AS age,

              Gender AS gender,

              Phone AS phone,

              CreatedAt AS createdAt

            FROM dbo.Patients

            WHERE UserId =
              @userId

            ORDER BY
              Id DESC
          `);


      res.status(200).json({
        success: true,

        patients:
          result.recordset,
      });
    } catch (error) {
      console.log(
        "Get Patients Error"
      );

      console.log(error);

      res.status(500).json({
        success: false,
        message:
          "Unable to get patients",
      });
    }
  }
);


/* =========================
   GET SINGLE PATIENT
========================= */

app.get(
  "/api/patients/:id",
  async (req, res) => {
    try {
      const userId =
        getUserId(req);


      const patientId =
        Number(
          req.params.id
        );


      if (
        !userId ||
        !patientId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "User ID and Patient ID are required",
        });
      }


      const result =
        await pool
          .request()
          .input(
            "id",
            sql.Int,
            patientId
          )
          .input(
            "userId",
            sql.Int,
            userId
          )
          .query(`
            SELECT
              Id AS id,

              Name AS name,

              Age AS age,

              Gender AS gender,

              Phone AS phone,

              CreatedAt AS createdAt

            FROM dbo.Patients

            WHERE Id =
              @id

            AND UserId =
              @userId
          `);


      if (
        result.recordset.length ===
        0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Patient not found",
        });
      }


      res.status(200).json({
        success: true,

        patient:
          result.recordset[0],
      });
    } catch (error) {
      console.log(
        "Get Patient Error"
      );

      console.log(error);

      res.status(500).json({
        success: false,
        message:
          "Unable to get patient",
      });
    }
  }
);


/* =========================
   CREATE PATIENT
========================= */

app.post(
  "/api/patients",
  async (req, res) => {
    try {
      const userId =
        getUserId(req);


      const {
        name,
        age,
        gender,
        phone,
      } = req.body;


      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "User ID is required",
        });
      }


      if (
        !name ||
        !age ||
        !gender ||
        !phone
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please fill all patient fields",
        });
      }


      const exists =
        await userExists(
          userId
        );


      if (!exists) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid user",
        });
      }


      const result =
        await pool
          .request()
          .input(
            "userId",
            sql.Int,
            userId
          )
          .input(
            "name",
            sql.NVarChar(100),
            name.trim()
          )
          .input(
            "age",
            sql.Int,
            Number(age)
          )
          .input(
            "gender",
            sql.NVarChar(20),
            gender.trim()
          )
          .input(
            "phone",
            sql.NVarChar(20),
            phone.trim()
          )
          .query(`
            INSERT INTO dbo.Patients
            (
              UserId,
              Name,
              Age,
              Gender,
              Phone
            )

            OUTPUT
              INSERTED.Id AS id,

              INSERTED.Name AS name,

              INSERTED.Age AS age,

              INSERTED.Gender AS gender,

              INSERTED.Phone AS phone,

              INSERTED.CreatedAt
                AS createdAt

            VALUES
            (
              @userId,
              @name,
              @age,
              @gender,
              @phone
            )
          `);


      res.status(201).json({
        success: true,

        message:
          "Patient created successfully",

        patient:
          result.recordset[0],
      });
    } catch (error) {
      console.log(
        "Create Patient Error"
      );

      console.log(error);

      res.status(500).json({
        success: false,
        message:
          "Unable to create patient",
      });
    }
  }
);


/* =========================
   UPDATE PATIENT
========================= */

app.put(
  "/api/patients/:id",
  async (req, res) => {
    try {
      const userId =
        getUserId(req);


      const patientId =
        Number(
          req.params.id
        );


      const {
        name,
        age,
        gender,
        phone,
      } = req.body;


      if (
        !userId ||
        !patientId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "User ID and Patient ID are required",
        });
      }


      if (
        !name ||
        !age ||
        !gender ||
        !phone
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please fill all patient fields",
        });
      }


      const result =
        await pool
          .request()
          .input(
            "id",
            sql.Int,
            patientId
          )
          .input(
            "userId",
            sql.Int,
            userId
          )
          .input(
            "name",
            sql.NVarChar(100),
            name.trim()
          )
          .input(
            "age",
            sql.Int,
            Number(age)
          )
          .input(
            "gender",
            sql.NVarChar(20),
            gender.trim()
          )
          .input(
            "phone",
            sql.NVarChar(20),
            phone.trim()
          )
          .query(`
            UPDATE dbo.Patients

            SET
              Name =
                @name,

              Age =
                @age,

              Gender =
                @gender,

              Phone =
                @phone

            OUTPUT
              INSERTED.Id AS id,

              INSERTED.Name AS name,

              INSERTED.Age AS age,

              INSERTED.Gender AS gender,

              INSERTED.Phone AS phone,

              INSERTED.CreatedAt
                AS createdAt

            WHERE Id =
              @id

            AND UserId =
              @userId
          `);


      if (
        result.recordset.length ===
        0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Patient not found",
        });
      }


      res.status(200).json({
        success: true,

        message:
          "Patient updated successfully",

        patient:
          result.recordset[0],
      });
    } catch (error) {
      console.log(
        "Update Patient Error"
      );

      console.log(error);

      res.status(500).json({
        success: false,
        message:
          "Unable to update patient",
      });
    }
  }
);


/* =========================
   DELETE PATIENT
========================= */

app.delete(
  "/api/patients/:id",
  async (req, res) => {
    try {
      const userId =
        getUserId(req);


      const patientId =
        Number(
          req.params.id
        );


      if (
        !userId ||
        !patientId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "User ID and Patient ID are required",
        });
      }


      const result =
        await pool
          .request()
          .input(
            "id",
            sql.Int,
            patientId
          )
          .input(
            "userId",
            sql.Int,
            userId
          )
          .query(`
            DELETE FROM dbo.Patients

            WHERE Id =
              @id

            AND UserId =
              @userId
          `);


      if (
        result.rowsAffected[0] ===
        0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Patient not found",
        });
      }


      res.status(200).json({
        success: true,

        message:
          "Patient deleted successfully",
      });
    } catch (error) {
      console.log(
        "Delete Patient Error"
      );

      console.log(error);

      res.status(500).json({
        success: false,
        message:
          "Unable to delete patient",
      });
    }
  }
);


/* =========================
   CREATE STUDY
========================= */

app.post(
  "/api/studies",
  async (req, res) => {
    try {
      const userId =
        getUserId(req);


      const {
        patientId,
        studyId,
        bodyPart,
        studyDate,
        studyDescription,
        modality,
        status,
      } = req.body;


      const numericPatientId =
        Number(
          patientId
        );


      if (
        !userId ||
        !numericPatientId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "User ID and Patient ID are required",
        });
      }


      if (
        !String(studyId || "").trim() ||
        !String(bodyPart || "").trim() ||
        !String(modality || "").trim() ||
        !studyDate
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Study ID, modality, body part, and study date are required",
        });
      }


      const patient =
        await pool
          .request()
          .input(
            "patientId",
            sql.Int,
            numericPatientId
          )
          .input(
            "userId",
            sql.Int,
            userId
          )
          .query(`
            SELECT Id

            FROM dbo.Patients

            WHERE Id =
              @patientId

            AND UserId =
              @userId
          `);


      if (
        patient.recordset.length ===
        0
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Patient not found or access denied",
        });
      }


      const result =
        await pool
          .request()
          .input(
            "userId",
            sql.Int,
            userId
          )
          .input(
            "patientId",
            sql.Int,
            numericPatientId
          )
          .input(
            "studyId",
            sql.NVarChar(100),
            studyId
              ? String(studyId).trim()
              : null
          )
          .input(
            "bodyPart",
            sql.NVarChar(100),
            bodyPart
              ? String(bodyPart).trim()
              : null
          )
          .input(
            "studyDate",
            sql.DateTime,
            studyDate
              ? new Date(
                  studyDate
                )
              : new Date()
          )
          .input(
            "studyDescription",
            sql.NVarChar(200),
            studyDescription
              ? studyDescription.trim()
              : null
          )
          .input(
            "modality",
            sql.NVarChar(50),
            modality
              ? modality.trim()
              : null
          )
          .input(
            "status",
            sql.NVarChar(50),
            status
              ? String(status).trim()
              : "Completed"
          )
          .query(`
            INSERT INTO dbo.Studies
            (
              UserId,
              PatientId,
              StudyId,
              BodyPart,
              StudyDate,
              StudyDescription,
              Modality,
              Status
            )

            OUTPUT
              INSERTED.Id AS id,

              INSERTED.UserId AS userId,

              INSERTED.PatientId
                AS patientId,

              INSERTED.StudyId
                AS studyId,

              INSERTED.BodyPart
                AS bodyPart,

              INSERTED.StudyDate
                AS studyDate,

              INSERTED.StudyDescription
                AS studyDescription,

              INSERTED.Modality
                AS modality,

              INSERTED.CreatedAt
                AS createdAt

            VALUES
            (
              @userId,
              @patientId,
              @studyId,
              @bodyPart,
              @studyDate,
              @studyDescription,
              @modality,
              @status
            )
          `);


      res.status(201).json({
        success: true,

        message:
          "Study created successfully",

        study:
          result.recordset[0],
      });
    } catch (error) {
      console.log(
        "Create Study Error"
      );

      console.log(error);

      res.status(500).json({
        success: false,
        message:
          "Unable to create study",
      });
    }
  }
);


/* =========================
   GET STUDIES
========================= */

app.get(
  "/api/studies",
  async (req, res) => {
    try {
      const userId =
        getUserId(req);


      const patientId =
        req.query.patientId
          ? Number(
              req.query.patientId
            )
          : null;


      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "User ID is required",
        });
      }


      let query = `
        SELECT
          s.Id AS id,

          s.UserId AS userId,

          s.PatientId AS patientId,

          s.StudyId AS studyId,

          s.BodyPart AS bodyPart,

          s.StudyDate AS studyDate,

          s.StudyDescription
            AS studyDescription,

          s.Modality AS modality,

          s.CreatedAt AS createdAt,

          (
            SELECT COUNT(DISTINCT pi.Id)
            FROM dbo.PatientImages pi
            WHERE (
              pi.StudyId =
                s.Id
              OR EXISTS (
                SELECT 1
                FROM dbo.Series sr
                WHERE sr.Id =
                  pi.SeriesId
                AND sr.StudyId =
                  s.Id
              )
            )
          ) AS imageCount,

          p.Name AS patientName

        FROM dbo.Studies s

        LEFT JOIN dbo.Patients p
          ON p.Id =
            s.PatientId

        WHERE s.UserId =
          @userId
      `;


      const request =
        pool
          .request()
          .input(
            "userId",
            sql.Int,
            userId
          );


      if (
        patientId
      ) {
        query += `
          AND s.PatientId =
            @patientId
        `;

        request.input(
          "patientId",
          sql.Int,
          patientId
        );
      }


      query += `
        ORDER BY
          s.StudyDate DESC,
          s.Id DESC
      `;


      const result =
        await request.query(
          query
        );


      res.status(200).json({
        success: true,

        studies:
          result.recordset,
      });
    } catch (error) {
      console.log(
        "Get Studies Error"
      );

      console.log(error);

      res.status(500).json({
        success: false,
        message:
          "Unable to get studies",
      });
    }
  }
);


/* =========================
   GET SINGLE STUDY
========================= */

app.get(
  "/api/studies/:id",
  async (req, res) => {
    try {
      const userId =
        getUserId(req);


      const studyId =
        Number(
          req.params.id
        );


      if (
        !userId ||
        !studyId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "User ID and Study ID are required",
        });
      }


      const result =
        await pool
          .request()
          .input(
            "studyId",
            sql.Int,
            studyId
          )
          .input(
            "userId",
            sql.Int,
            userId
          )
          .query(`
            SELECT
              s.Id AS id,

              s.UserId AS userId,

              s.PatientId AS patientId,

              s.StudyId AS studyId,

              s.BodyPart AS bodyPart,

              s.StudyDate AS studyDate,

              s.StudyDescription
                AS studyDescription,

              s.Modality AS modality,

              s.CreatedAt AS createdAt,

              p.Name AS patientName

            FROM dbo.Studies s

            LEFT JOIN dbo.Patients p
              ON p.Id =
                s.PatientId

            WHERE s.Id =
              @studyId

            AND s.UserId =
              @userId
          `);


      if (
        result.recordset.length ===
        0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Study not found",
        });
      }


      res.status(200).json({
        success: true,

        study:
          result.recordset[0],
      });
    } catch (error) {
      console.log(
        "Get Study Error"
      );

      console.log(error);

      res.status(500).json({
        success: false,
        message:
          "Unable to get study",
      });
    }
  }
);


/* =========================
   UPDATE STUDY
========================= */

app.put(
  "/api/studies/:id",
  async (req, res) => {
    try {
      const userId =
        getUserId(req);


      const studyId =
        Number(
          req.params.id
        );


      const {
        studyId: studyIdText,
        bodyPart,
        studyDate,
        studyDescription,
        modality,
      } = req.body;


      if (
        !userId ||
        !studyId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "User ID and Study ID are required",
        });
      }


      const result =
        await pool
          .request()
          .input(
            "studyId",
            sql.Int,
            studyId
          )
          .input(
            "userId",
            sql.Int,
            userId
          )
          .input(
            "studyIdText",
            sql.NVarChar(100),
            studyIdText
              ? String(studyIdText).trim()
              : null
          )
          .input(
            "bodyPart",
            sql.NVarChar(100),
            bodyPart
              ? String(bodyPart).trim()
              : null
          )
          .input(
            "studyDate",
            sql.DateTime,
            studyDate
              ? new Date(
                  studyDate
                )
              : null
          )
          .input(
            "studyDescription",
            sql.NVarChar(200),
            studyDescription
              ? studyDescription.trim()
              : null
          )
          .input(
            "modality",
            sql.NVarChar(50),
            modality
              ? modality.trim()
              : null
          )
          .query(`
            UPDATE dbo.Studies

            SET
              StudyId =
                @studyIdText,

              BodyPart =
                @bodyPart,

              StudyDate =
                @studyDate,

              StudyDescription =
                @studyDescription,

              Modality =
                @modality

            OUTPUT
              INSERTED.Id AS id,

              INSERTED.UserId AS userId,

              INSERTED.PatientId
                AS patientId,

              INSERTED.StudyId
                AS studyId,

              INSERTED.BodyPart
                AS bodyPart,

              INSERTED.StudyDate
                AS studyDate,

              INSERTED.StudyDescription
                AS studyDescription,

              INSERTED.Modality
                AS modality,

              INSERTED.CreatedAt
                AS createdAt

            WHERE Id =
              @studyId

            AND UserId =
              @userId
          `);


      if (
        result.recordset.length ===
        0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Study not found",
        });
      }


      res.status(200).json({
        success: true,

        message:
          "Study updated successfully",

        study:
          result.recordset[0],
      });
    } catch (error) {
      console.log(
        "Update Study Error"
      );

      console.log(error);

      res.status(500).json({
        success: false,
        message:
          "Unable to update study",
      });
    }
  }
);


/* =========================
   DELETE STUDY
========================= */

app.delete(
  "/api/studies/:id",
  async (req, res) => {
    try {
      const userId =
        getUserId(req);


      const studyId =
        Number(
          req.params.id
        );


      if (
        !userId ||
        !studyId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "User ID and Study ID are required",
        });
      }


      const transaction =
        new sql.Transaction(
          pool
        );


      await transaction.begin();


      try {
        await new sql.Request(
          transaction
        )
          .input(
            "studyId",
            sql.Int,
            studyId
          )
          .input(
            "userId",
            sql.Int,
            userId
          )
          .query(`
            DELETE FROM dbo.PatientImages

            WHERE StudyId =
              @studyId

            AND UserId =
              @userId
          `);


        await new sql.Request(
          transaction
        )
          .input(
            "studyId",
            sql.Int,
            studyId
          )
          .input(
            "userId",
            sql.Int,
            userId
          )
          .query(`
            DELETE FROM dbo.Series

            WHERE StudyId =
              @studyId

            AND UserId =
              @userId
          `);


        const result =
          await new sql.Request(
            transaction
          )
            .input(
              "studyId",
              sql.Int,
              studyId
            )
            .input(
              "userId",
              sql.Int,
              userId
            )
            .query(`
              DELETE FROM dbo.Studies

              WHERE Id =
                @studyId

              AND UserId =
                @userId
            `);


        if (
          result.rowsAffected[0] ===
          0
        ) {
          await transaction.rollback();

          return res.status(404).json({
            success: false,
            message:
              "Study not found",
          });
        }


        await transaction.commit();


        res.status(200).json({
          success: true,

          message:
            "Study deleted successfully",
        });
      } catch (error) {
        try {
          await transaction.rollback();
        } catch (
          rollbackError
        ) {
          console.log(
            rollbackError
          );
        }

        throw error;
      }
    } catch (error) {
      console.log(
        "Delete Study Error"
      );

      console.log(error);

      res.status(500).json({
        success: false,
        message:
          "Unable to delete study",
      });
    }
  }
);


/* =========================
   CREATE SERIES
========================= */

app.post(
  "/api/series",
  async (req, res) => {
    try {
      const userId =
        getUserId(req);


      const {
        patientId,
        studyId,
        seriesNumber,
        seriesDescription,
        modality,
      } = req.body;


      const numericPatientId =
        Number(
          patientId
        );

      const numericStudyId =
        Number(
          studyId
        );


      if (
        !userId ||
        !numericPatientId ||
        !numericStudyId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "User ID, Patient ID and Study ID are required",
        });
      }


      const studyResult =
        await pool
          .request()
          .input(
            "studyId",
            sql.Int,
            numericStudyId
          )
          .input(
            "patientId",
            sql.Int,
            numericPatientId
          )
          .input(
            "userId",
            sql.Int,
            userId
          )
          .query(`
            SELECT
              Id,
              Modality

            FROM dbo.Studies

            WHERE Id =
              @studyId

            AND PatientId =
              @patientId

            AND UserId =
              @userId
          `);


      if (
        studyResult.recordset.length ===
        0
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Invalid study or permission denied",
        });
      }


      let finalSeriesNumber =
        Number(
          seriesNumber
        );


      if (
        !Number.isInteger(
          finalSeriesNumber
        ) ||
        finalSeriesNumber <= 0
      ) {
        const nextResult =
          await pool
            .request()
            .input(
              "studyId",
              sql.Int,
              numericStudyId
            )
            .input(
              "patientId",
              sql.Int,
              numericPatientId
            )
            .input(
              "userId",
              sql.Int,
              userId
            )
            .query(`
              SELECT
                ISNULL(
                  MAX(SeriesNumber),
                  0
                ) + 1
                  AS nextSeriesNumber

              FROM dbo.Series

              WHERE StudyId =
                @studyId

              AND PatientId =
                @patientId

              AND UserId =
                @userId
            `);


        finalSeriesNumber =
          Number(
            nextResult
              .recordset[0]
              .nextSeriesNumber
          );
      }


      const finalModality =
        modality ||
        studyResult
          .recordset[0]
          .Modality ||
        null;


      const finalDescription =
        seriesDescription &&
        String(
          seriesDescription
        ).trim()
          ? String(
              seriesDescription
            ).trim()
          : `Series ${finalSeriesNumber}`;


      const result =
        await pool
          .request()
          .input(
            "userId",
            sql.Int,
            userId
          )
          .input(
            "patientId",
            sql.Int,
            numericPatientId
          )
          .input(
            "studyId",
            sql.Int,
            numericStudyId
          )
          .input(
            "seriesNumber",
            sql.Int,
            finalSeriesNumber
          )
          .input(
            "seriesDescription",
            sql.NVarChar(200),
            finalDescription
          )
          .input(
            "modality",
            sql.NVarChar(50),
            finalModality
          )
          .query(`
            INSERT INTO dbo.Series
            (
              UserId,
              PatientId,
              StudyId,
              SeriesNumber,
              SeriesDescription,
              Modality
            )

            OUTPUT
              INSERTED.Id AS id,

              INSERTED.UserId AS userId,

              INSERTED.PatientId
                AS patientId,

              INSERTED.StudyId
                AS studyId,

              INSERTED.SeriesNumber
                AS seriesNumber,

              INSERTED.SeriesDescription
                AS seriesDescription,

              INSERTED.Modality
                AS modality,

              INSERTED.CreatedAt
                AS createdAt

            VALUES
            (
              @userId,
              @patientId,
              @studyId,
              @seriesNumber,
              @seriesDescription,
              @modality
            )
          `);


      res.status(201).json({
        success: true,

        message:
          "Series created successfully",

        series:
          result.recordset[0],
      });
    } catch (error) {
      console.log(
        "Create Series Error"
      );

      console.log(error);

      res.status(500).json({
        success: false,
        message:
          error.message ||
          "Unable to create series",
      });
    }
  }
);


/* =========================
   GET SERIES
========================= */

app.get(
  "/api/series",
  async (req, res) => {
    try {
      const userId =
        getUserId(req);


      const patientId =
        req.query.patientId
          ? Number(
              req.query.patientId
            )
          : null;


      const studyId =
        req.query.studyId
          ? Number(
              req.query.studyId
            )
          : null;


      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "User ID is required",
        });
      }


      let query = `
        SELECT
          sr.Id AS id,

          sr.UserId AS userId,

          sr.PatientId AS patientId,

          sr.StudyId AS studyId,

          sr.SeriesNumber
            AS seriesNumber,

          sr.SeriesDescription
            AS seriesDescription,

          sr.Modality
            AS modality,

          sr.CreatedAt
            AS createdAt,

          COUNT(pi.Id)
            AS imageCount,

          (
            SELECT TOP 1
              pi2.Id

            FROM dbo.PatientImages pi2

            WHERE pi2.SeriesId =
              sr.Id

            ORDER BY
              ISNULL(
                pi2.ImageOrder,
                2147483647
              ) ASC,

              pi2.Id ASC
          ) AS firstImageId

        FROM dbo.Series sr

        LEFT JOIN dbo.PatientImages pi
          ON pi.SeriesId =
            sr.Id

        WHERE sr.UserId =
          @userId
      `;


      const request =
        pool
          .request()
          .input(
            "userId",
            sql.Int,
            userId
          );


      if (
        patientId
      ) {
        query += `
          AND sr.PatientId =
            @patientId
        `;

        request.input(
          "patientId",
          sql.Int,
          patientId
        );
      }


      if (
        studyId
      ) {
        query += `
          AND sr.StudyId =
            @studyId
        `;

        request.input(
          "studyId",
          sql.Int,
          studyId
        );
      }


      query += `
        GROUP BY
          sr.Id,
          sr.UserId,
          sr.PatientId,
          sr.StudyId,
          sr.SeriesNumber,
          sr.SeriesDescription,
          sr.Modality,
          sr.CreatedAt

        ORDER BY
          sr.SeriesNumber ASC,
          sr.Id ASC
      `;


      const result =
        await request.query(
          query
        );


      res.status(200).json({
        success: true,

        series:
          result.recordset,
      });
    } catch (error) {
      console.log(
        "Get Series Error"
      );

      console.log(error);

      res.status(500).json({
        success: false,
        message:
          "Unable to get series",
      });
    }
  }
);
/* =========================
   UPLOAD SERIES
   MAX 500 IMAGES
========================= */

app.post(
  "/api/series/upload",
  upload.array(
    "images",
    500
  ),
  async (req, res) => {
    let transaction;

    try {
      const userId =
        getUserId(req);

      const patientId =
        Number(
          req.body.patientId
        );

      const studyId =
        Number(
          req.body.studyId
        );

      const requestedSeriesId =
        req.body.seriesId
          ? Number(
              req.body.seriesId
            )
          : null;

      const files =
        req.files || [];


      /* =========================
         VALIDATION
      ========================= */

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "User ID is required",
        });
      }


      if (
        !patientId ||
        !studyId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Patient ID and Study ID are required",
        });
      }


      if (
        !Number.isInteger(
          patientId
        ) ||
        !Number.isInteger(
          studyId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Patient ID and Study ID must be valid numbers",
        });
      }


      if (
        files.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please select at least one image",
        });
      }


      if (
        files.length > 500
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A series can contain a maximum of 500 images",
        });
      }


      /* =========================
         VERIFY PATIENT
      ========================= */

      const patientResult =
        await pool
          .request()
          .input(
            "patientId",
            sql.Int,
            patientId
          )
          .input(
            "userId",
            sql.Int,
            userId
          )
          .query(`
            SELECT
              Id

            FROM dbo.Patients

            WHERE Id =
              @patientId

            AND UserId =
              @userId
          `);


      if (
        patientResult.recordset.length ===
        0
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to use this patient",
        });
      }


      /* =========================
         VERIFY STUDY
      ========================= */

      const studyResult =
        await pool
          .request()
          .input(
            "studyId",
            sql.Int,
            studyId
          )
          .input(
            "patientId",
            sql.Int,
            patientId
          )
          .input(
            "userId",
            sql.Int,
            userId
          )
          .query(`
            SELECT
              Id,
              Modality

            FROM dbo.Studies

            WHERE Id =
              @studyId

            AND PatientId =
              @patientId

            AND UserId =
              @userId
          `);


      if (
        studyResult.recordset.length ===
        0
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Invalid study or you do not have permission to use this study",
        });
      }


      /* =========================
         START TRANSACTION
      ========================= */

      transaction =
        new sql.Transaction(
          pool
        );

      await transaction.begin();


      let seriesId =
        requestedSeriesId;


      /* =========================
         USE EXISTING SERIES
      ========================= */

      if (
        seriesId
      ) {
        if (
          !Number.isInteger(
            seriesId
          ) ||
          seriesId <= 0
        ) {
          await transaction.rollback();

          return res.status(400).json({
            success: false,
            message:
              "Invalid Series ID",
          });
        }


        const seriesResult =
          await new sql.Request(
            transaction
          )
            .input(
              "seriesId",
              sql.Int,
              seriesId
            )
            .input(
              "patientId",
              sql.Int,
              patientId
            )
            .input(
              "studyId",
              sql.Int,
              studyId
            )
            .input(
              "userId",
              sql.Int,
              userId
            )
            .query(`
              SELECT
                Id

              FROM dbo.Series

              WHERE Id =
                @seriesId

              AND PatientId =
                @patientId

              AND StudyId =
                @studyId

              AND UserId =
                @userId
            `);


        if (
          seriesResult.recordset.length ===
          0
        ) {
          await transaction.rollback();

          return res.status(404).json({
            success: false,
            message:
              "Series not found or you do not have permission to use it",
          });
        }
      }


      /* =========================
         CREATE NEW SERIES
      ========================= */

      else {
        const nextSeriesResult =
          await new sql.Request(
            transaction
          )
            .input(
              "patientId",
              sql.Int,
              patientId
            )
            .input(
              "studyId",
              sql.Int,
              studyId
            )
            .input(
              "userId",
              sql.Int,
              userId
            )
            .query(`
              SELECT
                ISNULL(
                  MAX(SeriesNumber),
                  0
                ) + 1
                  AS nextSeriesNumber

              FROM dbo.Series

              WHERE PatientId =
                @patientId

              AND StudyId =
                @studyId

              AND UserId =
                @userId
            `);


        const seriesNumber =
          Number(
            nextSeriesResult
              .recordset[0]
              .nextSeriesNumber
          );


        const studyModality =
          studyResult
            .recordset[0]
            .Modality ||
          null;


        const createdSeries =
          await new sql.Request(
            transaction
          )
            .input(
              "userId",
              sql.Int,
              userId
            )
            .input(
              "patientId",
              sql.Int,
              patientId
            )
            .input(
              "studyId",
              sql.Int,
              studyId
            )
            .input(
              "seriesNumber",
              sql.Int,
              seriesNumber
            )
            .input(
              "seriesDescription",
              sql.NVarChar(200),
              `Series ${seriesNumber}`
            )
            .input(
              "modality",
              sql.NVarChar(50),
              studyModality
            )
            .query(`
              INSERT INTO dbo.Series
              (
                UserId,
                PatientId,
                StudyId,
                SeriesNumber,
                SeriesDescription,
                Modality
              )

              OUTPUT
                INSERTED.Id AS id,

                INSERTED.SeriesNumber
                  AS seriesNumber

              VALUES
              (
                @userId,
                @patientId,
                @studyId,
                @seriesNumber,
                @seriesDescription,
                @modality
              )
            `);


        seriesId =
          createdSeries
            .recordset[0]
            .id;
      }


      /* =========================
         FIND LAST IMAGE ORDER
      ========================= */

      const startOrderResult =
        await new sql.Request(
          transaction
        )
          .input(
            "seriesId",
            sql.Int,
            seriesId
          )
          .query(`
            SELECT
              ISNULL(
                MAX(ImageOrder),
                0
              ) AS lastOrder

            FROM dbo.PatientImages

            WHERE SeriesId =
              @seriesId
          `);


      const startOrder =
        Number(
          startOrderResult
            .recordset[0]
            .lastOrder || 0
        );


      /* =========================
         UPLOAD IMAGES
      ========================= */

      const uploadedImages =
        [];


      for (
        let index = 0;
        index <
        files.length;
        index++
      ) {
        const file =
          files[index];


        const imageOrder =
          startOrder +
          index +
          1;


        const insertResult =
          await new sql.Request(
            transaction
          )
            .input(
              "userId",
              sql.Int,
              userId
            )
            .input(
              "patientId",
              sql.Int,
              patientId
            )
            .input(
              "studyId",
              sql.Int,
              studyId
            )
            .input(
              "seriesId",
              sql.Int,
              seriesId
            )
            .input(
              "imageOrder",
              sql.Int,
              imageOrder
            )
            .input(
              "fileName",
              sql.NVarChar(255),
              file.originalname
            )
            .input(
              "contentType",
              sql.NVarChar(100),
              file.mimetype ||
                "application/octet-stream"
            )
            .input(
              "imageData",
              sql.VarBinary(
                sql.MAX
              ),
              file.buffer
            )
            .query(`
              INSERT INTO
                dbo.PatientImages
              (
                UserId,
                PatientId,
                StudyId,
                SeriesId,
                ImageOrder,
                FileName,
                ContentType,
                ImageData
              )

              OUTPUT
                INSERTED.Id AS id,

                INSERTED.PatientId
                  AS patientId,

                INSERTED.StudyId
                  AS studyId,

                INSERTED.SeriesId
                  AS seriesId,

                INSERTED.ImageOrder
                  AS imageOrder,

                INSERTED.FileName
                  AS fileName,

                INSERTED.ContentType
                  AS contentType,

                INSERTED.CreatedAt
                  AS createdAt

              VALUES
              (
                @userId,
                @patientId,
                @studyId,
                @seriesId,
                @imageOrder,
                @fileName,
                @contentType,
                @imageData
              )
            `);


        uploadedImages.push(
          insertResult
            .recordset[0]
        );
      }


      /* =========================
         COMMIT
      ========================= */

      await transaction.commit();

      transaction =
        null;


      res.status(201).json({
        success: true,

        message:
          `${uploadedImages.length} image(s) uploaded successfully`,

        seriesId:
          seriesId,

        count:
          uploadedImages.length,

        images:
          uploadedImages,
      });
    } catch (error) {
      /* =========================
         ROLLBACK
      ========================= */

      if (
        transaction
      ) {
        try {
          await transaction.rollback();
        } catch (
          rollbackError
        ) {
          console.log(
            "Series Upload Rollback Error"
          );

          console.log(
            rollbackError
          );
        }
      }


      console.log(
        "Series Upload Error"
      );

      console.log(
        error
      );


      res.status(500).json({
        success: false,

        message:
          error.message ||
          "Unable to upload image series",
      });
    }
  }
);


/* =========================
   GET IMAGES
========================= */

app.get(
  "/api/images",
  async (req, res) => {
    try {
      const userId =
        getUserId(req);


      const patientId =
        req.query.patientId
          ? Number(
              req.query.patientId
            )
          : null;


      const studyId =
        req.query.studyId
          ? Number(
              req.query.studyId
            )
          : null;


      const seriesId =
        req.query.seriesId
          ? Number(
              req.query.seriesId
            )
          : null;


      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "User ID is required",
        });
      }
      let query = `
        SELECT
          pi.Id AS id,
          pi.PatientId
            AS patientId,
          pi.StudyId
            AS studyId,
          pi.SeriesId
            AS seriesId,
          pi.ImageOrder
            AS imageOrder,
          pi.FileName
            AS fileName,
          pi.ContentType
            AS contentType,
          pi.CreatedAt
            AS createdAt
        FROM dbo.PatientImages pi
        WHERE pi.UserId =
          @userId
      `;
      const request =
        pool
          .request()
          .input(
            "userId",
            sql.Int,
            userId
          );
      if (
        patientId
      ) {
        query += `
          AND pi.PatientId =
            @patientId
        `;

        request.input(
          "patientId",
          sql.Int,
          patientId,
        );
      }
      if (
        studyId
      ) {
        query += `
          AND pi.StudyId =
            @studyId
        `;

        request.input(
          "studyId",
          sql.Int,
          studyId
        );
      }


      if (
        seriesId
      ) {
        query += `
          AND pi.SeriesId =
            @seriesId
        `;

        request.input(
          "seriesId",
          sql.Int,
          seriesId
        );
      }


      query += `
        ORDER BY

          ISNULL(
            pi.ImageOrder,
            2147483647
          ) ASC,

          pi.Id ASC
      `;


      const result =
        await request.query(
          query
        );


      res.status(200).json({
        success: true,

        images:
          result.recordset,
      });
    } catch (error) {
      console.log(
        "Get Images Error"
      );

      console.log(
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to get images",
      });
    }
  }
);


/* =========================================================
   DICOM IMAGE PREVIEW
   Converts DICOM to browser-displayable PNG through Python
========================================================= */

app.get(
  "/api/images/:id/preview",
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      const imageId =
        Number(
          req.params.id
        );

      if (
        !userId ||
        !imageId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "User ID and Image ID are required",
        });
      }

      const result =
        await pool
          .request()
          .input(
            "id",
            sql.Int,
            imageId
          )
          .input(
            "userId",
            sql.Int,
            userId
          )
          .query(`
            SELECT
              Id AS id,
              FileName AS fileName,
              ContentType AS contentType,
              ImageData AS imageData
            FROM dbo.PatientImages
            WHERE Id = @id
              AND UserId = @userId
          `);

      if (
        result.recordset.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Image not found",
        });
      }

      const image =
        result.recordset[0];

      const imageData =
        image.imageData;

      if (!imageData) {
        return res.status(404).json({
          success: false,
          message:
            "Image data not found",
        });
      }

      const fileName =
        String(
          image.fileName || ""
        ).toLowerCase();

      const contentType =
        String(
          image.contentType || ""
        ).toLowerCase();

      const isDicom =
        fileName.endsWith(".dcm") ||
        fileName.endsWith(".dicom") ||
        contentType.includes("dicom") ||
        contentType ===
          "application/octet-stream";

      /* =====================================================
         NORMAL JPG / PNG
      ====================================================== */

      if (!isDicom) {
        res.set(
          "Cache-Control",
          "private, max-age=3600"
        );

        res.type(
          image.contentType ||
            "image/png"
        );

        return res.send(
          imageData
        );
      }

      /* =====================================================
         DICOM → BASE64
      ====================================================== */

      const dataBase64 =
        Buffer
          .from(imageData)
          .toString("base64");

      const aiServiceUrl =
        process.env.AI_SERVICE_URL ||
        "http://127.0.0.1:8000";

      /* =====================================================
         SEND DICOM TO PYTHON RENDERER
      ====================================================== */

      const aiResponse =
        await axios.post(
          `${aiServiceUrl}/api/ai/render-dicom`,
          {
            dataBase64,
          },
          {
            timeout:
              120000,
            maxContentLength:
              100 * 1024 * 1024,
            maxBodyLength:
              100 * 1024 * 1024,
          }
        );

      const responseData =
        aiResponse.data;

      if (
        !responseData ||
        !responseData.success ||
        !responseData.dataBase64
      ) {
        throw new Error(
          "Python DICOM renderer returned an invalid response."
        );
      }

      const pngBuffer =
        Buffer.from(
          responseData.dataBase64,
          "base64"
        );

      res.set(
        "Cache-Control",
        "private, max-age=3600"
      );

      res.type(
        "image/png"
      );

      return res.send(
        pngBuffer
      );

    } catch (error) {
      console.error(
        "DICOM Preview Error:"
      );

      console.error(
        error?.response?.data ||
          error?.message ||
          error
      );

      return res.status(500).json({
        success: false,
        message:
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          error?.message ||
          "Unable to render DICOM preview.",
      });
    }
  }
);


/* =========================
   GET IMAGE BY ID
========================= */

app.get(
  "/api/images/:id",
  async (req, res) => {
    try {
      const userId =
        getUserId(req);


      const imageId =
        Number(
          req.params.id
        );


      if (
        !userId ||
        !imageId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "User ID and Image ID are required",
        });
      }


      const result =
        await pool
          .request()
          .input(
            "id",
            sql.Int,
            imageId
          )
          .input(
            "userId",
            sql.Int,
            userId
          )
          .query(`
            SELECT

              Id AS id,

              PatientId
                AS patientId,

              StudyId
                AS studyId,

              SeriesId
                AS seriesId,

              ImageOrder
                AS imageOrder,

              FileName
                AS fileName,

              ContentType
                AS contentType,

              ImageData
                AS imageData,

              CreatedAt
                AS createdAt

            FROM dbo.PatientImages

            WHERE Id =
              @id

            AND UserId =
              @userId
          `);


      if (
        result.recordset.length ===
        0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Image not found",
        });
      }


      const image =
        result.recordset[0];


      const imageData =
        image.imageData;


      if (
        !imageData
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Image data not found",
        });
      }


      res.set(
        "Cache-Control",
        "private, max-age=3600"
      );


      res.type(
        image.contentType ||
        "application/octet-stream"
      );


      res.send(
        imageData
      );
    } catch (error) {
      console.log(
        "Get Image Error"
      );

      console.log(
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to get image",
      });
    }
  }
);


/* =========================
   DELETE IMAGE
========================= */

app.delete(
  "/api/images/:id",
  async (req, res) => {
    try {
      const userId =
        getUserId(req);


      const imageId =
        Number(
          req.params.id
        );


      if (
        !userId ||
        !imageId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "User ID and image ID are required",
        });
      }


      const result =
        await pool
          .request()
          .input(
            "id",
            sql.Int,
            imageId
          )
          .input(
            "userId",
            sql.Int,
            userId
          )
          .query(`
            DELETE FROM
              dbo.PatientImages

            WHERE Id =
              @id

            AND UserId =
              @userId
          `);


      if (
        result.rowsAffected[0] ===
        0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Image not found or you do not have permission to delete it",
        });
      }


      res.status(200).json({
        success: true,

        message:
          "Image deleted successfully",
      });
    } catch (error) {
      console.log(
        "Delete Image Error"
      );

      console.log(
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to delete image",
      });
    }
  }
);


/* =========================
   DELETE SERIES
========================= */

app.delete(
  "/api/series/:id",
  async (req, res) => {
    try {
      const userId =
        getUserId(req);


      const seriesId =
        Number(
          req.params.id
        );


      if (
        !userId ||
        !seriesId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "User ID and Series ID are required",
        });
      }


      const transaction =
        new sql.Transaction(
          pool
        );


      await transaction.begin();


      try {
        const seriesResult =
          await new sql.Request(
            transaction
          )
            .input(
              "seriesId",
              sql.Int,
              seriesId
            )
            .input(
              "userId",
              sql.Int,
              userId
            )
            .query(`
              SELECT
                Id

              FROM dbo.Series

              WHERE Id =
                @seriesId

              AND UserId =
                @userId
            `);


        if (
          seriesResult.recordset.length ===
          0
        ) {
          await transaction.rollback();

          return res.status(404).json({
            success: false,
            message:
              "Series not found",
          });
        }


        await new sql.Request(
          transaction
        )
          .input(
            "seriesId",
            sql.Int,
            seriesId
          )
          .input(
            "userId",
            sql.Int,
            userId
          )
          .query(`
            DELETE FROM
              dbo.PatientImages

            WHERE SeriesId =
              @seriesId

            AND UserId =
              @userId
          `);


        const deleteResult =
          await new sql.Request(
            transaction
          )
            .input(
              "seriesId",
              sql.Int,
              seriesId
            )
            .input(
              "userId",
              sql.Int,
              userId
            )
            .query(`
              DELETE FROM
                dbo.Series

              WHERE Id =
                @seriesId

              AND UserId =
                @userId
            `);


        if (
          deleteResult.rowsAffected[0] ===
          0
        ) {
          await transaction.rollback();

          return res.status(404).json({
            success: false,
            message:
              "Series not found",
          });
        }


        await transaction.commit();


        res.status(200).json({
          success: true,

          message:
            "Series deleted successfully",
        });
      } catch (error) {
        try {
          await transaction.rollback();
        } catch (
          rollbackError
        ) {
          console.log(
            "Series Delete Rollback Error"
          );

          console.log(
            rollbackError
          );
        }

        throw error;
      }
    } catch (error) {
      console.log(
        "Delete Series Error"
      );

      console.log(
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to delete series",
      });
    }
  }
);
/* =========================================================
   AI RADIOLOGY COPILOT
   ========================================================= */

app.post(
  "/api/ai/analyze-study",
  async (req, res) => {
    try {
      const userId = getUserId(req);

      const databaseStudyId = Number(
        req.body.studyId
      );

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User ID is required",
        });
      }

      if (!databaseStudyId) {
        return res.status(400).json({
          success: false,
          message: "Study ID is required",
        });
      }

      /* =====================================================
         1. GET STUDY
         ===================================================== */

      const studyResult =
        await pool
          .request()
          .input(
            "studyId",
            sql.Int,
            databaseStudyId
          )
          .input(
            "userId",
            sql.Int,
            userId
          )
          .query(`
            SELECT
              s.Id AS id,
              s.UserId AS userId,
              s.PatientId AS patientId,
              s.StudyId AS studyId,
              s.BodyPart AS bodyPart,
              s.StudyDate AS studyDate,
              s.StudyDescription AS studyDescription,
              s.Modality AS modality,
              s.Status AS status,
              p.Name AS patientName
            FROM dbo.Studies s
            LEFT JOIN dbo.Patients p
              ON p.Id = s.PatientId
            WHERE s.Id = @studyId
              AND s.UserId = @userId
          `);

      if (
        studyResult.recordset.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message: "Study not found",
        });
      }

      const study =
        studyResult.recordset[0];

      /* =====================================================
         2. GET ALL STUDY IMAGES
         ===================================================== */

      const imageResult =
        await pool
          .request()
          .input(
            "studyId",
            sql.Int,
            databaseStudyId
          )
          .input(
            "patientId",
            sql.Int,
            study.patientId
          )
          .input(
            "userId",
            sql.Int,
            userId
          )
          .query(`
            SELECT
              pi.Id AS id,
              pi.FileName AS fileName,
              pi.ContentType AS contentType,
              pi.ImageOrder AS imageOrder,
              pi.SeriesId AS seriesId,
              pi.ImageData AS imageData
            FROM dbo.PatientImages pi
            WHERE pi.UserId = @userId
              AND pi.PatientId = @patientId
              AND (
                pi.StudyId = @studyId
                OR EXISTS (
                  SELECT 1
                  FROM dbo.Series sr
                  WHERE sr.Id = pi.SeriesId
                    AND sr.StudyId = @studyId
                    AND sr.PatientId = @patientId
                )
              )
            ORDER BY
              CASE
                WHEN pi.ImageOrder IS NULL
                THEN 2147483647
                ELSE pi.ImageOrder
              END,
              pi.Id ASC
          `);

      const images =
        imageResult.recordset || [];

      if (images.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "No images found for this study",
        });
      }

      console.log(
        `AI analysis requested - Study: ${databaseStudyId}, Modality: ${study.modality}, Images: ${images.length}`
      );

      /* =====================================================
         3. CONVERT SQL IMAGE DATA TO BASE64
         ===================================================== */

      const aiImages =
        images.map((item) => ({
          id: item.id,

          fileName:
            item.fileName ||
            `image-${item.id}`,

          contentType:
            item.contentType ||
            "application/octet-stream",

          imageOrder:
            item.imageOrder,

          seriesId:
            item.seriesId,

          dataBase64:
            Buffer
              .from(item.imageData)
              .toString("base64"),
        }));

      /* =====================================================
         4. CALL PYTHON AI SERVICE
         ===================================================== */

      const aiResponse =
        await axios.post(
          `${process.env.AI_SERVICE_URL ||
            "http://127.0.0.1:8000"}/api/ai/analyze`,
          {
            studyId:
              study.studyId ||
              String(databaseStudyId),

            databaseStudyId:
              databaseStudyId,

            patientId:
              study.patientId,

            modality:
              study.modality ||
              "UNKNOWN",

            bodyPart:
              study.bodyPart,

            studyDescription:
              study.studyDescription,

            modelType:
              "AUTO",

            images:
              aiImages,
          },
          {
            timeout: 300000,

            maxContentLength:
              Infinity,

            maxBodyLength:
              Infinity,
          }
        );

      const pythonResponse =
        aiResponse.data || {};

      /*
       * Python returns:
       *
       * {
       *   success: true,
       *   message: "...",
       *   result: {
       *      findings: [],
       *      report: {},
       *      ...
       *   }
       * }
       */

      const aiResult =
        pythonResponse.result ||
        {};

      /* =====================================================
         5. RETURN FLAT RESULT TO REACT
         ===================================================== */

      return res.status(200).json({
        success: true,

        message:
          "AI analysis completed successfully",

        result: {
          ...aiResult,

          databaseStudyId:
            databaseStudyId,

          patientId:
            study.patientId,

          patientName:
            study.patientName,

          bodyPart:
            study.bodyPart,

          studyDescription:
            study.studyDescription,

          modality:
            study.modality,

          processedImages:
            aiResult.processedImages ||
            images.length,

          metadata: {
            ...(aiResult.metadata || {}),

            generatedAt:
              new Date().toISOString(),

            pipeline:
              "Radiology AI Copilot",

            reviewRequired:
              true,
          },
        },
      });
    } catch (error) {
      console.log(
        "AI Study Analysis Error"
      );

      console.log(
        error.message
      );

      /* =====================================================
         PYTHON AI SERVICE ERROR
         ===================================================== */

      if (
        error.response &&
        error.response.data
      ) {
        console.log(
          "Python AI Service Response:",
          error.response.data
        );

        return res.status(502).json({
          success: false,

          message:
            "Python AI service returned an error",

          aiServiceError:
            error.response.data,
        });
      }

      /* =====================================================
         PYTHON SERVICE NOT RUNNING
         ===================================================== */

      if (
        error.code ===
        "ECONNREFUSED"
      ) {
        return res.status(503).json({
          success: false,

          message:
            `AI service is not running. Please start the Python AI service at ${process.env.AI_SERVICE_URL || "http://127.0.0.1:8000"}.`,
        });
      }

      /* =====================================================
         TIMEOUT
         ===================================================== */

      if (
        error.code ===
          "ECONNABORTED" ||
        error.code ===
          "ETIMEDOUT"
      ) {
        return res.status(504).json({
          success: false,

          message:
            "AI service request timed out.",
        });
      }

      /* =====================================================
         GENERAL ERROR
         ===================================================== */

      return res.status(500).json({
        success: false,

        message:
          error.message ||
          "Unable to analyze study",
      });
    }
  }
);

/* =========================
   REPORTS
========================= */

app.get(
  "/api/reports",
  async (req, res) => {
    try {
      const userId =
        getUserId(req);


      const patientId =
        req.query.patientId
          ? Number(
              req.query.patientId
            )
          : null;


      const studyId =
        req.query.studyId
          ? Number(
              req.query.studyId
            )
          : null;


      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "User ID is required",
        });
      }


      let query = `
        SELECT

          r.Id AS id,

          r.UserId AS userId,

          r.PatientId
            AS patientId,

          r.StudyId
            AS studyId,

          r.RadiologistName
            AS radiologistName,

          r.Findings
            AS findings,

          r.Impression
            AS impression,

          r.Status
            AS status,

          r.ReportDate
            AS reportDate,

          r.CreatedAt
            AS createdAt,

          p.Name
            AS patientName

        FROM dbo.Reports r

        LEFT JOIN dbo.Patients p
          ON p.Id =
            r.PatientId

        WHERE r.UserId =
          @userId
      `;


      const request =
        pool
          .request()
          .input(
            "userId",
            sql.Int,
            userId
          );


      if (
        patientId
      ) {
        query += `
          AND r.PatientId =
            @patientId
        `;

        request.input(
          "patientId",
          sql.Int,
          patientId
        );
      }


      if (
        studyId
      ) {
        query += `
          AND r.StudyId =
            @studyId
        `;

        request.input(
          "studyId",
          sql.Int,
          studyId
        );
      }


      query += `
        ORDER BY
          r.Id DESC
      `;


      const result =
        await request.query(
          query
        );


      res.status(200).json({
        success: true,

        reports:
          result.recordset,
      });
    } catch (error) {
      console.log(
        "Get Reports Error"
      );

      console.log(
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to get reports",
      });
    }
  }
);


/* =========================
   CREATE REPORT
========================= */

app.post(
  "/api/reports",
  async (req, res) => {
    try {
      const userId =
        getUserId(req);


      const {
        patientId,
        studyId,
        radiologistName,
        findings,
        impression,
        status,
        reportDate,
      } = req.body;


      const numericPatientId =
        patientId
          ? Number(
              patientId
            )
          : null;


      const numericStudyId =
        studyId
          ? Number(
              studyId
            )
          : null;


      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "User ID is required",
        });
      }


      if (
        !numericPatientId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Patient ID is required",
        });
      }


      const patientResult =
        await pool
          .request()
          .input(
            "patientId",
            sql.Int,
            numericPatientId
          )
          .input(
            "userId",
            sql.Int,
            userId
          )
          .query(`
            SELECT
              Id

            FROM dbo.Patients

            WHERE Id =
              @patientId

            AND UserId =
              @userId
          `);


      if (
        patientResult.recordset.length ===
        0
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Patient not found or access denied",
        });
      }


      if (
        numericStudyId
      ) {
        const studyResult =
          await pool
            .request()
            .input(
              "studyId",
              sql.Int,
              numericStudyId
            )
            .input(
              "patientId",
              sql.Int,
              numericPatientId
            )
            .input(
              "userId",
              sql.Int,
              userId
            )
            .query(`
              SELECT
                Id

              FROM dbo.Studies

              WHERE Id =
                @studyId

              AND PatientId =
                @patientId

              AND UserId =
                @userId
            `);


        if (
          studyResult.recordset.length ===
          0
        ) {
          return res.status(403).json({
            success: false,
            message:
              "Study not found or access denied",
          });
        }
      }


      const result =
        await pool
          .request()
          .input(
            "userId",
            sql.Int,
            userId
          )
          .input(
            "patientId",
            sql.Int,
            numericPatientId
          )
          .input(
            "studyId",
            sql.Int,
            numericStudyId
          )
          .input(
            "radiologistName",
            sql.NVarChar(150),
            radiologistName
              ? String(
                  radiologistName
                ).trim()
              : null
          )
          .input(
            "findings",
            sql.NVarChar(sql.MAX),
            findings || null
          )
          .input(
            "impression",
            sql.NVarChar(sql.MAX),
            impression || null
          )
          .input(
            "status",
            sql.NVarChar(50),
            status
              ? String(
                  status
                ).trim()
              : "Completed"
          )
          .input(
            "reportDate",
            sql.DateTime,
            reportDate
              ? new Date(
                  reportDate
                )
              : new Date()
          )
          .query(`
            INSERT INTO dbo.Reports
            (
              UserId,
              PatientId,
              StudyId,
              RadiologistName,
              Findings,
              Impression,
              Status,
              ReportDate
            )

            OUTPUT

              INSERTED.Id AS id,

              INSERTED.UserId AS userId,

              INSERTED.PatientId
                AS patientId,

              INSERTED.StudyId
                AS studyId,

              INSERTED.RadiologistName
                AS radiologistName,

              INSERTED.Findings
                AS findings,

              INSERTED.Impression
                AS impression,

              INSERTED.Status
                AS status,

              INSERTED.ReportDate
                AS reportDate,

              INSERTED.CreatedAt
                AS createdAt

            VALUES
            (
              @userId,
              @patientId,
              @studyId,
              @radiologistName,
              @findings,
              @impression,
              @status,
              @reportDate
            )
          `);


      res.status(201).json({
        success: true,

        message:
          "Report created successfully",

        report:
          result.recordset[0],
      });
    } catch (error) {
      console.log(
        "Create Report Error"
      );

      console.log(
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to create report",
      });
    }
  }
);


/* =========================
   UPDATE REPORT
========================= */

app.put(
  "/api/reports/:id",
  async (req, res) => {
    try {
      const userId =
        getUserId(req);


      const reportId =
        Number(
          req.params.id
        );


      const {
        radiologistName,
        findings,
        impression,
        status,
        reportDate,
      } = req.body;


      if (
        !userId ||
        !reportId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "User ID and Report ID are required",
        });
      }


      const result =
        await pool
          .request()
          .input(
            "id",
            sql.Int,
            reportId
          )
          .input(
            "userId",
            sql.Int,
            userId
          )
          .input(
            "radiologistName",
            sql.NVarChar(150),
            radiologistName
              ? String(
                  radiologistName
                ).trim()
              : null
          )
          .input(
            "findings",
            sql.NVarChar(sql.MAX),
            findings || null
          )
          .input(
            "impression",
            sql.NVarChar(sql.MAX),
            impression || null
          )
          .input(
            "status",
            sql.NVarChar(50),
            status
              ? String(
                  status
                ).trim()
              : "Completed"
          )
          .input(
            "reportDate",
            sql.DateTime,
            reportDate
              ? new Date(
                  reportDate
                )
              : null
          )
          .query(`
            UPDATE dbo.Reports

            SET

              RadiologistName =
                @radiologistName,

              Findings =
                @findings,

              Impression =
                @impression,

              Status =
                @status,

              ReportDate =
                @reportDate

            OUTPUT

              INSERTED.Id AS id,

              INSERTED.UserId AS userId,

              INSERTED.PatientId
                AS patientId,

              INSERTED.StudyId
                AS studyId,

              INSERTED.RadiologistName
                AS radiologistName,

              INSERTED.Findings
                AS findings,

              INSERTED.Impression
                AS impression,

              INSERTED.Status
                AS status,

              INSERTED.ReportDate
                AS reportDate,

              INSERTED.CreatedAt
                AS createdAt

            WHERE Id =
              @id

            AND UserId =
              @userId
          `);


      if (
        result.recordset.length ===
        0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Report not found",
        });
      }


      res.status(200).json({
        success: true,

        message:
          "Report updated successfully",

        report:
          result.recordset[0],
      });
    } catch (error) {
      console.log(
        "Update Report Error"
      );

      console.log(
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to update report",
      });
    }
  }
);


/* =========================
   DELETE REPORT
========================= */

app.delete(
  "/api/reports/:id",
  async (req, res) => {
    try {
      const userId =
        getUserId(req);


      const reportId =
        Number(
          req.params.id
        );


      if (
        !userId ||
        !reportId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "User ID and Report ID are required",
        });
      }


      const result =
        await pool
          .request()
          .input(
            "id",
            sql.Int,
            reportId
          )
          .input(
            "userId",
            sql.Int,
            userId
          )
          .query(`
            DELETE FROM dbo.Reports

            WHERE Id =
              @id

            AND UserId =
              @userId
          `);


      if (
        result.rowsAffected[0] ===
        0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Report not found",
        });
      }


      res.status(200).json({
        success: true,

        message:
          "Report deleted successfully",
      });
    } catch (error) {
      console.log(
        "Delete Report Error"
      );

      console.log(
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to delete report",
      });
    }
  }
);


/* =========================
   HEALTH CHECK
========================= */

app.get(
  "/api/health",
  async (_req, res) => {
    try {
      await pool
        .request()
        .query(
          "SELECT 1 AS ok"
        );


      res.status(200).json({
        success: true,

        message:
          "Backend and database are working",
      });
    } catch (error) {
      res.status(500).json({
        success: false,

        message:
          "Database connection failed",
      });
    }
  }
);


/* =========================
   MULTER ERROR HANDLER
========================= */

app.use(
  (
    error,
    _req,
    res,
    // Express identifies error handlers by their four parameters.
    _next
  ) => {
    if (
      error instanceof
      multer.MulterError
    ) {
      let message =
        "Unable to read the uploaded files";


      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {
        message =
          "Each image must be 100 MB or smaller";
      }


      if (
        error.code ===
          "LIMIT_FILE_COUNT" ||
        error.code ===
          "LIMIT_UNEXPECTED_FILE"
      ) {
        message =
          "A series can contain a maximum of 500 images";
      }


      return res.status(400).json({
        success: false,

        message,
      });
    }


    if (
      error &&
      error.message ===
        "Unsupported file type"
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Unsupported file type. Please upload DICOM or supported image files.",
      });
    }


    console.log(
      "Unhandled Server Error"
    );

    console.log(
      error
    );


    return res.status(500).json({
      success: false,

      message:
        error &&
        error.message
          ? error.message
          : "Internal server error",
    });
  }
);


/* =========================
   404 HANDLER
========================= */

app.use(
  (
    req,
    res
  ) => {
    res.status(404).json({
      success: false,

      message:
        `Route not found: ${req.method} ${req.originalUrl}`,
    });
  }
);


const PORT = 5000;
async function startServer() {
  await connectDatabase();

  app.listen(
    PORT,
    "0.0.0.0",
    () => {
      console.log(
        `Server is running on port ${PORT}`
      );

      console.log(
        `Backend: http://localhost:${PORT}`
      );
    }
  );
}

startServer();