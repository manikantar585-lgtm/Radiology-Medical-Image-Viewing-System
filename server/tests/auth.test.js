const request = require("supertest");

jest.mock("../src/services/userService");
jest.mock("../src/services/patientService");

const userService = require("../src/services/userService");
const patientService = require("../src/services/patientService");
const { signToken } = require("../src/middleware/auth");
const { createApp } = require("../src/app");
const { unauthorized } = require("../src/utils/http");

const app = createApp();
const user = { id: 7, email: "doc@example.com", fullName: "Dr Test" };

beforeEach(() => jest.resetAllMocks());

describe("POST /api/login", () => {
  it("returns a token and the user on valid credentials", async () => {
    userService.authenticate.mockResolvedValue(user);

    const res = await request(app)
      .post("/api/login")
      .send({ email: "doc@example.com", password: "Secret123" });

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual(user);
    expect(typeof res.body.token).toBe("string");
  });

  it("returns 401 on invalid credentials", async () => {
    userService.authenticate.mockRejectedValue(unauthorized("Invalid Email or Password"));

    const res = await request(app)
      .post("/api/login")
      .send({ email: "doc@example.com", password: "wrong" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ success: false, message: "Invalid Email or Password" });
  });

  it("returns 400 when fields are missing", async () => {
    const res = await request(app).post("/api/login").send({ email: "doc@example.com" });

    expect(res.status).toBe(400);
    expect(userService.authenticate).not.toHaveBeenCalled();
  });
});

describe("POST /api/register", () => {
  it("rejects an invalid email before touching the database", async () => {
    const res = await request(app).post("/api/register").send({
      fullName: "A",
      email: "not-an-email",
      mobile: "1",
      employeeId: "E1",
      department: "Radiology",
      password: "Secret123",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Enter a valid email address");
    expect(userService.register).not.toHaveBeenCalled();
  });
});

describe("protected routes", () => {
  it("reject requests without a token", async () => {
    const res = await request(app).get("/api/patients");
    expect(res.status).toBe(401);
  });

  it("ignore the legacy x-user-id header", async () => {
    const res = await request(app).get("/api/patients").set("x-user-id", "1");
    expect(res.status).toBe(401);
    expect(patientService.list).not.toHaveBeenCalled();
  });

  it("reject a tampered token", async () => {
    const res = await request(app)
      .get("/api/patients")
      .set("Authorization", `Bearer ${signToken(user)}x`);
    expect(res.status).toBe(401);
  });

  it("scope data to the user in the token", async () => {
    patientService.list.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/patients?userId=999")
      .set("Authorization", `Bearer ${signToken(user)}`);

    expect(res.status).toBe(200);
    expect(patientService.list).toHaveBeenCalledWith(7);
  });
});

describe("PUT /api/users/:id", () => {
  it("forbids editing another user's profile", async () => {
    const res = await request(app)
      .put("/api/users/8")
      .set("Authorization", `Bearer ${signToken(user)}`)
      .send({ fullName: "X", mobile: "1", department: "Y" });

    expect(res.status).toBe(403);
    expect(userService.updateProfile).not.toHaveBeenCalled();
  });
});
