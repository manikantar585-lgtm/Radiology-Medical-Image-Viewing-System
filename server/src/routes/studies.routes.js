const { Router } = require("express");
const studyService = require("../services/studyService");
const patientService = require("../services/patientService");
const {
  validate,
  z,
  requiredText,
  optionalText,
  id,
  optionalId,
  optionalDate,
  idParam,
} = require("../middleware/validate");
const { asyncHandler, forbidden } = require("../utils/http");

const router = Router();

const createSchema = z.object({
  patientId: id("Patient ID"),
  studyId: requiredText("Study ID", 100),
  bodyPart: requiredText("Body part", 100),
  modality: requiredText("Modality", 50),
  studyDate: z.coerce.date({
    required_error: "Study date is required",
    invalid_type_error: "Study date is not a valid date",
  }),
  studyDescription: optionalText(200),
  status: optionalText(50),
});

const updateSchema = z.object({
  studyId: optionalText(100),
  bodyPart: optionalText(100),
  modality: optionalText(50),
  studyDate: optionalDate,
  studyDescription: optionalText(200),
});

const listQuery = z.object({ patientId: optionalId("Patient ID") });
const params = validate(idParam("Study ID"), "params");

router.get(
  "/",
  validate(listQuery, "query"),
  asyncHandler(async (req, res) => {
    const studies = await studyService.list(req.userId, req.validated.query);
    res.json({ success: true, studies });
  })
);

router.get(
  "/:id",
  params,
  asyncHandler(async (req, res) => {
    const study = await studyService.get(req.userId, req.validated.params.id);
    res.json({ success: true, study });
  })
);

router.post(
  "/",
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const { patientId, ...study } = req.validated.body;
    if (!(await patientService.isOwnedBy(req.userId, patientId))) {
      throw forbidden("Patient not found or access denied");
    }
    const created = await studyService.create(req.userId, patientId, study);
    res.status(201).json({ success: true, message: "Study created successfully", study: created });
  })
);

router.put(
  "/:id",
  params,
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const study = await studyService.update(
      req.userId,
      req.validated.params.id,
      req.validated.body
    );
    res.json({ success: true, message: "Study updated successfully", study });
  })
);

router.delete(
  "/:id",
  params,
  asyncHandler(async (req, res) => {
    await studyService.remove(req.userId, req.validated.params.id);
    res.json({ success: true, message: "Study deleted successfully" });
  })
);

module.exports = router;
