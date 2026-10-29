const { Router } = require("express");
const imageService = require("../services/imageService");
const aiClient = require("../services/aiClient");
const { validate, z, optionalId, idParam } = require("../middleware/validate");
const { asyncHandler } = require("../utils/http");

const router = Router();

const listQuery = z.object({
  patientId: optionalId("Patient ID"),
  studyId: optionalId("Study ID"),
  seriesId: optionalId("Series ID"),
});

const params = validate(idParam("Image ID"), "params");

function sendBinary(res, buffer, contentType) {
  res.set("Cache-Control", "private, max-age=3600");
  res.type(contentType);
  res.send(buffer);
}

router.get(
  "/",
  validate(listQuery, "query"),
  asyncHandler(async (req, res) => {
    const images = await imageService.list(req.userId, req.validated.query);
    res.json({ success: true, images });
  })
);

/* Browser-displayable preview: DICOM is rendered to PNG by the AI service. */
router.get(
  "/:id/preview",
  params,
  asyncHandler(async (req, res) => {
    const image = await imageService.getWithData(req.userId, req.validated.params.id);

    if (!imageService.isDicom(image)) {
      return sendBinary(res, image.imageData, image.contentType || "image/png");
    }
    const png = await aiClient.renderDicom(image.imageData);
    return sendBinary(res, png, "image/png");
  })
);

/* Original file bytes, used by the Cornerstone DICOM loader. */
router.get(
  "/:id",
  params,
  asyncHandler(async (req, res) => {
    const image = await imageService.getWithData(req.userId, req.validated.params.id);
    sendBinary(res, image.imageData, image.contentType || "application/octet-stream");
  })
);

router.delete(
  "/:id",
  params,
  asyncHandler(async (req, res) => {
    await imageService.remove(req.userId, req.validated.params.id);
    res.json({ success: true, message: "Image deleted successfully" });
  })
);

module.exports = router;
