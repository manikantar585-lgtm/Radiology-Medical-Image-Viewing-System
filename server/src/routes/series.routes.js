const { Router } = require("express");
const config = require("../config/env");
const seriesService = require("../services/seriesService");
const studyService = require("../services/studyService");
const { upload } = require("../middleware/upload");
const { validate, z, optionalText, id, optionalId, idParam } = require("../middleware/validate");
const { asyncHandler, badRequest, forbidden } = require("../utils/http");

const router = Router();

const listQuery = z.object({
  patientId: optionalId("Patient ID"),
  studyId: optionalId("Study ID"),
});

const createSchema = z.object({
  patientId: id("Patient ID"),
  studyId: id("Study ID"),
  seriesNumber: optionalId("Series number"),
  seriesDescription: optionalText(200),
  modality: optionalText(50),
});

const uploadSchema = z.object({
  patientId: id("Patient ID"),
  studyId: id("Study ID"),
  seriesId: optionalId("Series ID"),
});

async function requireOwnedStudy(userId, studyId, patientId) {
  const study = await studyService.findOwned(userId, studyId, patientId);
  if (!study) {
    throw forbidden("Invalid study or you do not have permission to use this study");
  }
  return study;
}

router.get(
  "/",
  validate(listQuery, "query"),
  asyncHandler(async (req, res) => {
    const series = await seriesService.list(req.userId, req.validated.query);
    res.json({ success: true, series });
  })
);

router.post(
  "/",
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const body = req.validated.body;
    const study = await requireOwnedStudy(req.userId, body.studyId, body.patientId);
    const series = await seriesService.create(req.userId, {
      ...body,
      modality: body.modality || study.modality,
    });
    res.status(201).json({ success: true, message: "Series created successfully", series });
  })
);

router.post(
  "/upload",
  upload.array("images", config.upload.maxFilesPerSeries),
  validate(uploadSchema),
  asyncHandler(async (req, res) => {
    const { patientId, studyId, seriesId } = req.validated.body;
    const files = req.files || [];
    if (files.length === 0) {
      throw badRequest("Please select at least one image");
    }

    const study = await requireOwnedStudy(req.userId, studyId, patientId);
    const result = await seriesService.uploadImages(req.userId, {
      patientId,
      studyId,
      seriesId,
      modality: study.modality,
      files,
    });

    res.status(201).json({
      success: true,
      message: `${result.images.length} image(s) uploaded successfully`,
      seriesId: result.seriesId,
      count: result.images.length,
      images: result.images,
    });
  })
);

router.delete(
  "/:id",
  validate(idParam("Series ID"), "params"),
  asyncHandler(async (req, res) => {
    await seriesService.remove(req.userId, req.validated.params.id);
    res.json({ success: true, message: "Series deleted successfully" });
  })
);

module.exports = router;
