const request = require("supertest");

jest.mock("../src/services/patientService");
jest.mock("../src/services/studyService");
jest.mock("../src/services/seriesService");
jest.mock("../src/services/reportService");
jest.mock("../src/services/userService");

const patientService = require("../src/services/patientService");
const studyService = require("../src/services/studyService");
const seriesService = require("../src/services/seriesService");
const reportService = require("../src/services/reportService");
const userService = require("../src/services/userService");
const { signToken } = require("../src/middleware/auth");
const { createApp } = require("../src/app");
const { notFound } = require("../src/utils/http");

const app = createApp();
const auth = { Authorization: `Bearer ${signToken({ id: 3, email: "a@b.c" })}` };

beforeEach(() => jest.resetAllMocks());

describe("patients", () => {
  it("creates a patient with coerced, trimmed fields", async () => {
    patientService.create.mockImplementation(async (_userId, patient) => ({ id: 1, ...patient }));

    const res = await request(app)
      .post("/api/patients")
      .set(auth)
      .send({ name: "  Jane  ", age: "42", gender: "F", phone: "555" });

    expect(res.status).toBe(201);
    expect(patientService.create).toHaveBeenCalledWith(3, {
      name: "Jane",
      age: 42,
      gender: "F",
      phone: "555",
    });
  });

  it("rejects a non-numeric age", async () => {
    const res = await request(app)
      .post("/api/patients")
      .set(auth)
      .send({ name: "Jane", age: "abc", gender: "F", phone: "555" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Age must be a number");
  });

  it("rejects a non-numeric id parameter", async () => {
    const res = await request(app).get("/api/patients/abc").set(auth);
    expect(res.status).toBe(400);
  });

  it("maps service not-found errors to 404", async () => {
    patientService.get.mockRejectedValue(notFound("Patient not found"));

    const res = await request(app).get("/api/patients/5").set(auth);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Patient not found");
  });
});

describe("studies", () => {
  const study = {
    patientId: 9,
    studyId: "ST001",
    bodyPart: "Chest",
    modality: "CT",
    studyDate: "2026-01-15",
  };

  it("refuses to create a study for another user's patient", async () => {
    patientService.isOwnedBy.mockResolvedValue(false);

    const res = await request(app).post("/api/studies").set(auth).send(study);

    expect(res.status).toBe(403);
    expect(studyService.create).not.toHaveBeenCalled();
  });

  it("creates a study for an owned patient", async () => {
    patientService.isOwnedBy.mockResolvedValue(true);
    studyService.create.mockResolvedValue({ id: 11 });

    const res = await request(app).post("/api/studies").set(auth).send(study);

    expect(res.status).toBe(201);
    expect(studyService.create).toHaveBeenCalledWith(
      3,
      9,
      expect.objectContaining({ studyId: "ST001", studyDate: new Date("2026-01-15") })
    );
  });

  it("passes the patient filter through as a number", async () => {
    studyService.list.mockResolvedValue([]);

    await request(app).get("/api/studies?patientId=4").set(auth);

    expect(studyService.list).toHaveBeenCalledWith(3, { patientId: 4 });
  });
});

describe("series upload", () => {
  it("requires at least one file", async () => {
    const res = await request(app)
      .post("/api/series/upload")
      .set(auth)
      .field("patientId", "1")
      .field("studyId", "2");

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Please select at least one image");
  });

  it("rejects unsupported file types", async () => {
    const res = await request(app)
      .post("/api/series/upload")
      .set(auth)
      .field("patientId", "1")
      .field("studyId", "2")
      .attach("images", Buffer.from("x"), "notes.exe");

    expect(res.status).toBe(400);
    expect(seriesService.uploadImages).not.toHaveBeenCalled();
  });

  it("stores accepted files in the user's study", async () => {
    studyService.findOwned.mockResolvedValue({ id: 2, modality: "CT" });
    seriesService.uploadImages.mockResolvedValue({ seriesId: 5, images: [{ id: 1 }] });

    const res = await request(app)
      .post("/api/series/upload")
      .set(auth)
      .field("patientId", "1")
      .field("studyId", "2")
      .attach("images", Buffer.from("DICM"), "slice-001.dcm");

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ seriesId: 5, count: 1 });
    expect(seriesService.uploadImages).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ patientId: 1, studyId: 2, seriesId: null, modality: "CT" })
    );
  });
});

describe("reports", () => {
  it("fills NOT NULL columns: radiologist defaults to the user, blanks become empty text", async () => {
    patientService.isOwnedBy.mockResolvedValue(true);
    studyService.findOwned.mockResolvedValue({ id: 2 });
    userService.findById.mockResolvedValue({ id: 3, fullName: "Dr Test" });
    reportService.create.mockResolvedValue({ id: 1 });

    const res = await request(app)
      .post("/api/reports")
      .set(auth)
      .send({ patientId: 1, studyId: 2 });

    expect(res.status).toBe(201);
    expect(reportService.create).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ radiologistName: "Dr Test", findings: "", impression: "" })
    );
  });

  it("requires a study", async () => {
    const res = await request(app)
      .post("/api/reports")
      .set(auth)
      .send({ patientId: 1, findings: "Normal" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Study ID is required");
    expect(reportService.create).not.toHaveBeenCalled();
  });

  it("refuses a study that does not belong to the patient", async () => {
    patientService.isOwnedBy.mockResolvedValue(true);
    studyService.findOwned.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/reports")
      .set(auth)
      .send({ patientId: 1, studyId: 99, findings: "Normal" });

    expect(res.status).toBe(403);
    expect(reportService.create).not.toHaveBeenCalled();
  });
});

describe("unknown routes", () => {
  it("return a JSON 404", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
