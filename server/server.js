const express = require("express");
const cors = require("cors");
const sql = require("mssql");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const app = express();
app.use(cors());
app.use(express.json());

const config = {
  server: "localhost",
  database: "RadiologyDB",
  user: "Mani",
  password: "Mani@7013",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};
let pool;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});
function getUserId(req) {
  const headerUserId = req.headers["x-user-id"];
  const bodyUserId =
    req.body && req.body.userId
      ? req.body.userId
      : null;
  const queryUserId =
    req.query && req.query.userId
      ? req.query.userId
      : null;
  const userId =
    headerUserId ||
    bodyUserId ||
    queryUserId;
  const parsedUserId =
    Number(userId);
  if (
    !parsedUserId ||
    Number.isNaN(parsedUserId)
  ) {
    return null;
  }
  return parsedUserId;
}
async function userExists(userId) {
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
  return result.recordset.length > 0;
}
async function connectDatabase() {
  try {
    pool = await sql.connect(config);
    console.log(
      "Connected to RadiologyDB"
    );
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT *
        FROM sys.tables
        WHERE name = 'Patients'
      )
      BEGIN
        CREATE TABLE dbo.Patients
        (
          Id INT IDENTITY(1,1)
            PRIMARY KEY,
          UserId INT NULL,
          Name NVARCHAR(100)
            NOT NULL,
          Age INT NOT NULL,
          Gender NVARCHAR(20)
            NOT NULL,
          Phone NVARCHAR(20)
            NOT NULL,
          CreatedAt DATETIME
            DEFAULT GETDATE()
        )
      END
    `);
    await pool.request().query(`
      IF COL_LENGTH(
        'dbo.Patients',
        'UserId'
      ) IS NULL
      BEGIN
        ALTER TABLE dbo.Patients
        ADD UserId INT NULL
      END
    `);
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT *
        FROM sys.tables
        WHERE name = 'Studies'
      )
      BEGIN
        CREATE TABLE dbo.Studies
        (
          Id INT IDENTITY(1,1)
            PRIMARY KEY,
          UserId INT NULL,
          PatientId INT NOT NULL,
          StudyId NVARCHAR(50)
            NOT NULL,
          Modality NVARCHAR(50)
            NOT NULL,
          BodyPart NVARCHAR(100)
            NOT NULL,
          StudyDate DATE NOT NULL,
          Status NVARCHAR(50)
            NOT NULL
            DEFAULT 'Completed',
          CreatedAt DATETIME
            DEFAULT GETDATE()
        )
      END
    `);
    await pool.request().query(`
      IF COL_LENGTH(
        'dbo.Studies',
        'UserId'
      ) IS NULL
      BEGIN
        ALTER TABLE dbo.Studies
        ADD UserId INT NULL
      END
    `);
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT *
        FROM sys.tables
        WHERE name = 'PatientImages'
      )
      BEGIN
        CREATE TABLE dbo.PatientImages
        (
          Id INT IDENTITY(1,1)
            PRIMARY KEY,
          UserId INT NULL,
          PatientId INT NOT NULL,
          StudyId INT NULL,
          FileName NVARCHAR(255)
            NOT NULL,
          ContentType NVARCHAR(100)
            NOT NULL,
          ImageData VARBINARY(MAX)
            NOT NULL,
          CreatedAt DATETIME
            DEFAULT GETDATE()
        )
      END
    `);
    await pool.request().query(`
      IF COL_LENGTH(
        'dbo.PatientImages',
        'UserId'
      ) IS NULL
      BEGIN
        ALTER TABLE dbo.PatientImages
        ADD UserId INT NULL
      END
    `);
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT *
        FROM sys.tables
        WHERE name = 'Reports'
      )
      BEGIN
        CREATE TABLE dbo.Reports
        (
          Id INT IDENTITY(1,1)
            PRIMARY KEY,
          UserId INT NULL,
          PatientId INT NULL,
          StudyId INT NULL,
          RadiologistName
            NVARCHAR(150) NULL,
          Findings
            NVARCHAR(MAX) NULL,
          Impression
            NVARCHAR(MAX) NULL,
          Status
            NVARCHAR(50) NULL
            DEFAULT 'Completed',
          ReportDate DATETIME NULL
            DEFAULT GETDATE(),
          CreatedAt DATETIME NULL
            DEFAULT GETDATE()
        )
      END
    `);
    await pool.request().query(`
      IF COL_LENGTH(
        'dbo.Reports',
        'UserId'
      ) IS NULL
      BEGIN
        ALTER TABLE dbo.Reports
        ADD UserId INT NULL
      END
    `);
    await pool.request().query(`
      IF COL_LENGTH(
        'dbo.PatientImages',
        'StudyId'
      ) IS NULL
      BEGIN
        ALTER TABLE dbo.PatientImages
        ADD StudyId INT NULL
      END
    `);
    const firstUser =
      await pool.request().query(`
        SELECT TOP 1 Id
        FROM dbo.Users
        ORDER BY Id ASC
      `);
    if (
      firstUser.recordset.length > 0
    ) {
      const defaultUserId =
        firstUser.recordset[0].Id;
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
      await pool.request().query(`
        UPDATE s
        SET s.UserId =
          p.UserId
        FROM dbo.Studies s
        INNER JOIN dbo.Patients p
          ON p.Id = s.PatientId
        WHERE s.UserId IS NULL
      `);
      await pool.request().query(`
        UPDATE pi
        SET pi.UserId =
          p.UserId
        FROM dbo.PatientImages pi
        INNER JOIN dbo.Patients p
          ON p.Id = pi.PatientId
        WHERE pi.UserId IS NULL
      `);
      await pool.request().query(`
        UPDATE r
        SET r.UserId =
          p.UserId
        FROM dbo.Reports r
        INNER JOIN dbo.Patients p
          ON p.Id = r.PatientId
        WHERE r.UserId IS NULL
      `);
    }
    console.log(
      "User data separation is ready"
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
app.get(
  "/",
  (req, res) => {
    res.send(
      "Radiology Medical Image Viewing System Backend Running..."
    );
  }
);
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
            email
          )
          .input(
            "employeeId",
            sql.NVarChar(50),
            employeeId
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
        existingUser.recordset
          .length > 0
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
          fullName
        )
        .input(
          "email",
          sql.NVarChar(150),
          email
        )
        .input(
          "mobile",
          sql.NVarChar(20),
          mobile
        )
        .input(
          "employeeId",
          sql.NVarChar(50),
          employeeId
        )
        .input(
          "department",
          sql.NVarChar(100),
          department
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
            email
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
        result.recordset.length === 0
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
              INSERTED.Id
              AS id,
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
        result.recordset.length === 0
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
        !/[A-Z]/.test(newPassword) ||
        !/[a-z]/.test(newPassword) ||
        !/[0-9]/.test(newPassword)
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
        result.recordset.length === 0
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
        await userExists(userId);
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
            ORDER BY Id DESC
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
        result.recordset.length === 0
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
        await userExists(userId);
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
              INSERTED.CreatedAt AS createdAt
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
              INSERTED.CreatedAt AS createdAt
            WHERE Id =
              @id
            AND UserId =
              @userId
          `);
      if (
        result.recordset.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Patient not found or you do not have permission to update this patient",
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
          DELETE FROM dbo.PatientImages
          WHERE PatientId =
            @patientId
          AND UserId =
            @userId
        `);
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
          DELETE FROM dbo.Reports
          WHERE PatientId =
            @patientId
          AND UserId =
            @userId
        `);
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
          DELETE FROM dbo.Studies
          WHERE PatientId =
            @patientId
          AND UserId =
            @userId
        `);
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
        result.rowsAffected[0] === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Patient not found or you do not have permission to delete this patient",
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
app.get(
  "/api/patients/search",
  async (req, res) => {
    try {
      const userId =
        getUserId(req);
      const search =
        String(
          req.query.search ||
          ""
        ).trim();
      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "User ID is required",
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
            "search",
            sql.NVarChar(100),
            `%${search}%`
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
            AND
            (
              Name LIKE @search
              OR Phone LIKE @search
            )
            ORDER BY Id DESC
          `);
      res.status(200).json({
        success: true,
        patients:
          result.recordset,
      });
    } catch (error) {
      console.log(
        "Search Patients Error"
      );
      console.log(error);
      res.status(500).json({ 
        success: false,
        message:
          "Unable to search patients",
      });
    }
  }
);
app.get(
  "/api/studies",
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
              s.Id AS id,
              s.StudyId AS studyId,
              s.PatientId AS patientId,
              p.Name AS patientName,
              s.Modality AS modality,
              s.BodyPart AS bodyPart,
              s.StudyDate AS studyDate,
              s.Status AS status,
              (
                SELECT COUNT(*)
                FROM dbo.PatientImages pi
                WHERE pi.StudyId = s.Id
                AND pi.PatientId = s.PatientId
                AND pi.UserId = @userId
              ) AS imageCount,
              s.CreatedAt AS createdAt
            FROM dbo.Studies s
            INNER JOIN dbo.Patients p
              ON p.Id = s.PatientId
            WHERE s.UserId =
              @userId
            AND p.UserId =
              @userId
            ORDER BY s.Id DESC
          `);
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
app.get(
  "/api/studies/:id",
  async (req, res) => {
    try {
      const userId =
        getUserId(req);
      const studyDatabaseId =
        Number(
          req.params.id
        );
      if (
        !userId ||
        !studyDatabaseId
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
            "id",
            sql.Int,
            studyDatabaseId
          )
          .input(
            "userId",
            sql.Int,
            userId
          )
          .query(`
            SELECT
              s.Id AS id,
              s.StudyId AS studyId,
              s.PatientId AS patientId,
              p.Name AS patientName,
              s.Modality AS modality,
              s.BodyPart AS bodyPart,
              s.StudyDate AS studyDate,
              s.Status AS status,
              (
                SELECT COUNT(*)
                FROM dbo.PatientImages pi
                WHERE pi.StudyId = s.Id
                AND pi.PatientId = s.PatientId
                AND pi.UserId = @userId
              ) AS imageCount,
              s.CreatedAt AS createdAt
            FROM dbo.Studies s
            INNER JOIN dbo.Patients p
              ON p.Id = s.PatientId
            WHERE s.Id =
              @id
            AND s.UserId =
              @userId
            AND p.UserId =
              @userId
          `);
      if (
        result.recordset.length === 0
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
app.post(
  "/api/studies",
  async (req, res) => {
    try {
      const userId =
        getUserId(req);
      const {
        patientId,
        studyId,
        modality,
        bodyPart,
        studyDate,
        status,
      } = req.body;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "User ID is required",
        });
      }
      if (
        !patientId ||
        !studyId ||
        !modality ||
        !bodyPart ||
        !studyDate
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please fill all study fields",
        });
      }
      const patientResult =
        await pool
          .request()
          .input(
            "patientId",
            sql.Int,
            Number(patientId)
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
        patientResult.recordset.length === 0
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to create a study for this patient",
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
            Number(patientId)
          )
          .input(
            "studyId",
            sql.NVarChar(50),
            studyId.trim()
          )
          .input(
            "modality",
            sql.NVarChar(50),
            modality.trim()
          )
          .input(
            "bodyPart",
            sql.NVarChar(100),
            bodyPart.trim()
          )
          .input(
            "studyDate",
            sql.Date,
            studyDate
          )
          .input(
            "status",
            sql.NVarChar(50),
            status ||
              "Completed"
          )
          .query(`
            INSERT INTO dbo.Studies
            (
              UserId,
              PatientId,
              StudyId,
              Modality,
              BodyPart,
              StudyDate,
              Status
            )

            OUTPUT
              INSERTED.Id AS id,
              INSERTED.StudyId AS studyId,
              INSERTED.PatientId AS patientId,
              INSERTED.Modality AS modality,
              INSERTED.BodyPart AS bodyPart,
              INSERTED.StudyDate AS studyDate,
              INSERTED.Status AS status,
              INSERTED.CreatedAt AS createdAt

            VALUES
            (
              @userId,
              @patientId,
              @studyId,
              @modality,
              @bodyPart,
              @studyDate,
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
app.put(
  "/api/studies/:id",
  async (req, res) => {
    try {
      const userId =
        getUserId(req);
      const studyDatabaseId =
        Number(
          req.params.id
        );
      const {
        patientId,
        studyId,
        modality,
        bodyPart,
        studyDate,
        status,
      } = req.body;
      if (
        !userId ||
        !studyDatabaseId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "User ID and Study ID are required",
        });
      }

      if (
        !patientId ||
        !studyId ||
        !modality ||
        !bodyPart ||
        !studyDate
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please fill all study fields",
        });
      }
      const patientResult =
        await pool
          .request()
          .input(
            "patientId",
            sql.Int,
            Number(patientId)
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
        patientResult.recordset.length === 0
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to use this patient",
        });
      }
      const result =
        await pool
          .request()
          .input(
            "id",
            sql.Int,
            studyDatabaseId
          )
          .input(
            "userId",
            sql.Int,
            userId
          )
          .input(
            "patientId",
            sql.Int,
            Number(patientId)
          )
          .input(
            "studyId",
            sql.NVarChar(50),
            studyId.trim()
          )
          .input(
            "modality",
            sql.NVarChar(50),
            modality.trim()
          )
          .input(
            "bodyPart",
            sql.NVarChar(100),
            bodyPart.trim()
          )
          .input(
            "studyDate",
            sql.Date,
            studyDate
          )
          .input(
            "status",
            sql.NVarChar(50),
            status ||
              "Completed"
          )
          .query(`
            UPDATE dbo.Studies
            SET
              PatientId =
                @patientId,
              StudyId =
                @studyId,
              Modality =
                @modality,
              BodyPart =
                @bodyPart,
              StudyDate =
                @studyDate,
              Status =
                @status
            OUTPUT
              INSERTED.Id AS id,
              INSERTED.StudyId AS studyId,
              INSERTED.PatientId AS patientId,
              INSERTED.Modality AS modality,
              INSERTED.BodyPart AS bodyPart,
              INSERTED.StudyDate AS studyDate,
              INSERTED.Status AS status,
              INSERTED.CreatedAt AS createdAt

            WHERE Id =
              @id

            AND UserId =
              @userId
          `);
      if (
        result.recordset.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Study not found or you do not have permission to update it",
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
app.delete(
  "/api/studies/:id",
  async (req, res) => {
    try {
      const userId =
        getUserId(req);
      const studyDatabaseId =
        Number(
          req.params.id
        );
      if (
        !userId ||
        !studyDatabaseId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "User ID and Study ID are required",
        });
      }
      await pool
        .request()
        .input(
          "studyId",
          sql.Int,
          studyDatabaseId
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
      await pool
        .request()
        .input(
          "studyId",
          sql.Int,
          studyDatabaseId
        )
        .input(
          "userId",
          sql.Int,
          userId
        )
        .query(`
          DELETE FROM dbo.Reports
          WHERE StudyId =
            @studyId
          AND UserId =
            @userId
        `);
      const result =
        await pool
          .request()
          .input(
            "id",
            sql.Int,
            studyDatabaseId
          )
          .input(
            "userId",
            sql.Int,
            userId
          )
          .query(`
            DELETE FROM dbo.Studies
            WHERE Id =
              @id
            AND UserId =
              @userId
          `);
      if (
        result.rowsAffected[0] === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Study not found or you do not have permission to delete it",
        });
      }
      res.status(200).json({
        success: true,
        message:
          "Study deleted successfully",
      });
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
          pi.PatientId AS patientId,
          pi.StudyId AS studyId,
          pi.FileName AS fileName,
          pi.ContentType AS contentType,
          pi.CreatedAt AS createdAt
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
      if (patientId) {
        query += `
          AND pi.PatientId =
            @patientId
        `;
        request.input(
          "patientId",
          sql.Int,
          patientId
        );
      }
      if (studyId) {
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
      query += `
        ORDER BY pi.Id DESC
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
      console.log(error);
      res.status(500).json({
        success: false,
        message:
          "Unable to get images",
      });
    }
  }
);
app.post(
  "/api/images/upload",
  upload.single("image"),
  async (req, res) => {
    try {
      const userId =
        getUserId(req);
      const patientId =
        Number(
          req.body.patientId
        );
      const studyId =
        req.body.studyId
          ? Number(
              req.body.studyId
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
        !patientId ||
        !req.file
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Patient ID and image are required",
        });
      }
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
            SELECT Id
            FROM dbo.Patients
            WHERE Id =
              @patientId
            AND UserId =
              @userId
          `);
      if (
        patientResult.recordset.length === 0
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to upload an image for this patient",
        });

      }
      if (studyId) {
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
              SELECT Id
              FROM dbo.Studies
              WHERE Id =
                @studyId
              AND PatientId =
                @patientId
              AND UserId =
                @userId
            `);
        if (
          studyResult.recordset
            .length === 0
        ) {
          return res.status(403).json({
            success: false,
            message:
              "Invalid study or you do not have permission to use this study",
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
            patientId
          )
          .input(
            "studyId",
            sql.Int,
            studyId
          )
          .input(
            "fileName",
            sql.NVarChar(255),
            req.file.originalname
          )
          .input(
            "contentType",
            sql.NVarChar(100),
            req.file.mimetype
          )
          .input(
            "imageData",
            sql.VarBinary(sql.MAX),
            req.file.buffer
          )
          .query(`
            INSERT INTO dbo.PatientImages
            (
              UserId,
              PatientId,
              StudyId,
              FileName,
              ContentType,
              ImageData
            )
            OUTPUT
              INSERTED.Id AS id,
              INSERTED.PatientId AS patientId,
              INSERTED.StudyId AS studyId,
              INSERTED.FileName AS fileName,
              INSERTED.ContentType AS contentType,
              INSERTED.CreatedAt AS createdAt
            VALUES
            (
              @userId,
              @patientId,
              @studyId,
              @fileName,
              @contentType,
              @imageData
            )
          `);
      res.status(201).json({
        success: true,
        message:
          "Image uploaded successfully",
        image:
          result.recordset[0],
      });
    } catch (error) {
      console.log(
        "Upload Image Error"
      );
      console.log(error);
      res.status(500).json({
        success: false,
        message:
          "Unable to upload image",
      });
    }
  }
);
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
              Id,
              FileName,
              ContentType,
              ImageData
            FROM dbo.PatientImages
            WHERE Id =
              @id
            AND UserId =
              @userId
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
      res.setHeader(
        "Content-Type",
        image.ContentType
      );
      res.send(
        image.ImageData
      );
    } catch (error) {
      console.log(
        "View Image Error"
      );
      console.log(error);
      res.status(500).json({
        success: false,
        message:
          "Unable to view image",
      });
    }
  }
);
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
            DELETE FROM dbo.PatientImages
            WHERE Id =
             @id
            AND UserId =
              @userId
          `);
      if (
        result.rowsAffected[0] === 0
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
      console.log(error);
      res.status(500).json({
        success: false,
        message:
          "Unable to delete image",
      });
    }
  }
);
app.get(
  "/api/reports",
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
              r.Id AS id,
              r.PatientId AS patientId,
              p.Name AS patientName,
              r.StudyId AS studyId,
              s.StudyId AS studyNumber,
              r.RadiologistName
                AS radiologistName,
              r.Findings AS findings,
              r.Impression AS impression,
              r.Status AS status,
              r.ReportDate AS reportDate,
              r.CreatedAt AS createdAt
            FROM dbo.Reports r
            LEFT JOIN dbo.Patients p
              ON p.Id =
                r.PatientId
            LEFT JOIN dbo.Studies s
              ON s.Id =
                r.StudyId
            WHERE r.UserId =
              @userId
            ORDER BY r.Id DESC
          `);
      res.status(200).json({
        success: true,
        reports:
          result.recordset,
      });
    } catch (error) {
      console.log(
        "Get Reports Error"
      );
      console.log(error);
      res.status(500).json({
        success: false,
        message:
          "Unable to get reports",
      });
    }
  }
);
app.get(
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
            SELECT
              r.Id AS id,
              r.PatientId AS patientId,
              p.Name AS patientName,
              r.StudyId AS studyId,
              s.StudyId AS studyNumber,
              r.RadiologistName
                AS radiologistName,
              r.Findings AS findings,
              r.Impression AS impression,
              r.Status AS status,
              r.ReportDate AS reports,
              r.CreatedAt AS createdAt
            FROM dbo.Reports r
            LEFT JOIN dbo.Patients p
              ON p.Id =
                r.PatientId
            LEFT JOIN dbo.Studies s
              ON s.Id =
                r.StudyId
            WHERE r.Id =
              @id
            AND r.UserId =
              @userId
          `);
      if (
        result.recordset.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Report not found",
        });
      }
      res.status(200).json({
        success: true,
        report:
          result.recordset[0],
      });
    } catch (error) {
      console.log(
        "Get Report Error"
      );
      console.log(error);
      res.status(500).json({
        success: false,
        message:
          "Unable to get report",
      });
    }
  }
);
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
      } = req.body;

      if (!userId) {

        return res.status(401).json({
          success: false,
          message:
            "User ID is required",
        });

      }

      if (!patientId) {

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
            Number(patientId)
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
        patientResult.recordset.length === 0
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to create a report for this patient",
        });
      }
      if (studyId) {
        const studyResult =
          await pool
            .request()
            .input(
              "studyId",
              sql.Int,
              Number(studyId)
            )
            .input(
              "patientId",
              sql.Int,
              Number(patientId)
            )
            .input(
              "userId",
              sql.Int,
              userId
            )
            .query(`
              SELECT Id
              FROM dbo.Studies
              WHERE Id =
                @studyId
              AND PatientId =
               @patientId
              AND UserId =
                @userId
            `);
        if (
          studyResult.recordset
            .length === 0
        ) {
          return res.status(403).json({
            success: false,
            message:
              "Invalid study or you do not have permission to use this study",
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
            Number(patientId)
          )
          .input(
            "studyId",
            sql.Int,
            studyId
              ? Number(studyId)
              : null
          )
          .input(
            "radiologistName",
            sql.NVarChar(150),
            radiologistName ||
              null
          )
          .input(
            "findings",
            sql.NVarChar(sql.MAX),
            findings ||
              null
          )
          .input(
            "impression",
            sql.NVarChar(sql.MAX),
            impression ||
              null
          )

          .input(
            "status",
            sql.NVarChar(50),
            status ||
              "Completed"
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
              INSERTED.PatientId AS patientId,
              INSERTED.StudyId AS studyId,
              INSERTED.RadiologistName
                AS radiologistName,
              INSERTED.Findings AS findings,
              INSERTED.Impression AS impression,
              INSERTED.Status AS status,
              INSERTED.ReportDate AS reportDate,
              INSERTED.CreatedAt AS createdAt
            VALUES
            (
              @userId,
              @patientId,
              @studyId,
              @radiologistName,
              @findings,
              @impression,
              @status,
              GETDATE()
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
      console.log(error);
      res.status(500).json({
        success: false,
        message:
          "Unable to create report",
      });
    }
  }
);
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
        patientId,
        studyId,
        radiologistName,
        findings,
        impression,
        status,
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
      if (!patientId) {
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
            Number(patientId)
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
        patientResult.recordset.length === 0
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to use this patient",
        });
      }
      if (studyId) {
        const studyResult =
          await pool
            .request()
            .input(
              "studyId",
              sql.Int,
              Number(studyId)
            )
            .input(
              "patientId",
              sql.Int,
              Number(patientId)
            )
            .input(
              "userId",
              sql.Int,
              userId
            )
            .query(`
              SELECT Id

              FROM dbo.Studies
              WHERE Id =
                @studyId
              AND PatientId =
                @patientId
              AND UserId =
                @userId
            `);
        if (
          studyResult.recordset.length === 0
        ) {
          return res.status(403).json({
            success: false,
            message:
              "Invalid study or you do not have permission to use this study",
          });
       }
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
            "patientId",
            sql.Int,
            Number(patientId)
          )
          .input(
            "studyId",
            sql.Int,
            studyId
              ? Number(studyId)
              : null
          )
          .input(
            "radiologistName",
            sql.NVarChar(150),
            radiologistName ||
              null
          )
          .input(
            "findings",
            sql.NVarChar(sql.MAX),
            findings ||
              null
          )
          .input(
            "impression",
            sql.NVarChar(sql.MAX),
            impression ||
              null
          )
          .input(
            "status",
            sql.NVarChar(50),
            status ||
              "Completed"
          )
          .query(`
            UPDATE dbo.Reports
            SET
              PatientId =
                @patientId,
              StudyId =
                @studyId,
              RadiologistName =
                @radiologistName,
              Findings =
                @findings,
              Impression =
                @impression,
              Status =
                @status,
              ReportDate =
                GETDATE()
            OUTPUT
              INSERTED.Id AS id,
              INSERTED.PatientId AS patientId,
              INSERTED.StudyId AS studyId,
              INSERTED.RadiologistName
                AS radiologistName,
              INSERTED.Findings AS findings,
              INSERTED.Impression AS impression,
              INSERTED.Status AS status,
              INSERTED.ReportDate AS reportDate,
              INSERTED.CreatedAt AS createdAt
            WHERE Id =
              @id
            AND UserId =
              @userId
          `);
      if (
        result.recordset.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Report not found or you do not have permission to update it",
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
      console.log(error);
      res.status(500).json({
        success: false,
        message:
          "Unable to update report",
      });
    }
  }
);
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
        result.rowsAffected[0] === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Report not found or you do not have permission to delete it",
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
      console.log(error);
      res.status(500).json({
        success: false,
        message:
          "Unable to delete report",
      });
    }
  }
);
app.get(
  "/api/dashboard",
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
      const patients =
        await pool
          .request()
          .input(
            "userId",
            sql.Int,
            userId
          )
          .query(`
            SELECT COUNT(*) AS count
            FROM dbo.Patients
            WHERE UserId =
              @userId
          `);
      const studies =
        await pool
          .request()
          .input(
            "userId",
            sql.Int,
            userId
          )
          .query(`
            SELECT COUNT(*) AS count
            FROM dbo.Studies
            WHERE UserId =
              @userId
          `);
      const images =
        await pool
          .request()
          .input(
            "userId",
            sql.Int,
            userId
          )
          .query(`
            SELECT COUNT(*) AS count
            FROM dbo.PatientImages
            WHERE UserId =
              @userId
          `);
      const reports =
        await pool
          .request()
          .input(
            "userId",
            sql.Int,
            userId
          )
          .query(`
            SELECT COUNT(*) AS count
            FROM dbo.Reports
            WHERE UserId =
              @userId
          `);
      res.status(200).json({
        success: true,
        counts: {
          patients:
            patients.recordset[0].count,
          studies:
            studies.recordset[0].count,
          images:
            images.recordset[0].count,
          reports:
            reports.recordset[0].count,
        },
      });
    } catch (error) {
      console.log(
        "Dashboard Error"
      );
      console.log(error);
      res.status(500).json({
        success: false,
        message:
          "Unable to load dashboard",
      });
    }
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
        `Backend: http://10.198.159.228:${PORT}`
      );
    }
  );
}
startServer();