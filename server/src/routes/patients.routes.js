const { Router } = require("express");
const patientService = require("../services/patientService");
const { validate, z, requiredText, idParam } = require("../middleware/validate");
const { asyncHandler } = require("../utils/http");

const router = Router();

const patientSchema = z.object({
  name: requiredText("Name", 100),
  age: z.coerce
    .number({ invalid_type_error: "Age must be a number" })
    .int("Age must be a whole number")
    .min(0, "Age cannot be negative")
    .max(150, "Age is not valid"),
  gender: requiredText("Gender", 20),
  phone: requiredText("Phone", 20),
});

const params = validate(idParam("Patient ID"), "params");

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({ success: true, patients: await patientService.list(req.userId) });
  })
);

router.get(
  "/:id",
  params,
  asyncHandler(async (req, res) => {
    const patient = await patientService.get(req.userId, req.validated.params.id);
    res.json({ success: true, patient });
  })
);

router.post(
  "/",
  validate(patientSchema),
  asyncHandler(async (req, res) => {
    const patient = await patientService.create(req.userId, req.validated.body);
    res.status(201).json({ success: true, message: "Patient created successfully", patient });
  })
);

router.put(
  "/:id",
  params,
  validate(patientSchema),
  asyncHandler(async (req, res) => {
    const patient = await patientService.update(
      req.userId,
      req.validated.params.id,
      req.validated.body
    );
    res.json({ success: true, message: "Patient updated successfully", patient });
  })
);

router.delete(
  "/:id",
  params,
  asyncHandler(async (req, res) => {
    await patientService.remove(req.userId, req.validated.params.id);
    res.json({ success: true, message: "Patient deleted successfully" });
  })
);

module.exports = router;
