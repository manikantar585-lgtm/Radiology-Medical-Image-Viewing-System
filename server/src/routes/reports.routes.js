const { Router } = require("express");
const reportService = require("../services/reportService");
const patientService = require("../services/patientService");
const studyService = require("../services/studyService");
const userService = require("../services/userService");
const {
  validate,
  z,
  optionalText,
  id,
  optionalId,
  optionalDate,
  idParam,
} = require("../middleware/validate");
const { asyncHandler, forbidden } = require("../utils/http");

const router = Router();

// Findings and Impression are NOT NULL in existing databases, so blanks are
// stored as empty text rather than NULL.
const optionalLongText = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => value || "");

const reportFields = {
  radiologistName: optionalText(150),
  findings: optionalLongText,
  impression: optionalLongText,
  status: optionalText(50),
  reportDate: optionalDate,
};

const createSchema = z.object({
  patientId: id("Patient ID"),
  // Required: every report belongs to a study (the UI enforces it and
  // Reports.StudyId is NOT NULL in existing databases).
  studyId: id("Study ID"),
  ...reportFields,
});

const updateSchema = z.object(reportFields);

const listQuery = z.object({
  patientId: optionalId("Patient ID"),
  studyId: optionalId("Study ID"),
});

const params = validate(idParam("Report ID"), "params");

/** RadiologistName is NOT NULL; default it to the signed-in user's name. */
async function withRadiologist(userId, report) {
  if (report.radiologistName) {
    return report;
  }
  const user = await userService.findById(userId);
  return { ...report, radiologistName: user?.fullName || "Unknown" };
}

router.get(
  "/",
  validate(listQuery, "query"),
  asyncHandler(async (req, res) => {
    const reports = await reportService.list(req.userId, req.validated.query);
    res.json({ success: true, reports });
  })
);

router.post(
  "/",
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const body = req.validated.body;

    if (!(await patientService.isOwnedBy(req.userId, body.patientId))) {
      throw forbidden("Patient not found or access denied");
    }
    if (!(await studyService.findOwned(req.userId, body.studyId, body.patientId))) {
      throw forbidden("Study not found or access denied");
    }

    const report = await reportService.create(req.userId, await withRadiologist(req.userId, body));
    res.status(201).json({ success: true, message: "Report created successfully", report });
  })
);

router.put(
  "/:id",
  params,
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const report = await reportService.update(
      req.userId,
      req.validated.params.id,
      await withRadiologist(req.userId, req.validated.body)
    );
    res.json({ success: true, message: "Report updated successfully", report });
  })
);

router.delete(
  "/:id",
  params,
  asyncHandler(async (req, res) => {
    await reportService.remove(req.userId, req.validated.params.id);
    res.json({ success: true, message: "Report deleted successfully" });
  })
);

module.exports = router;
