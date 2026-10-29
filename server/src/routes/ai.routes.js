const { Router } = require("express");
const studyService = require("../services/studyService");
const imageService = require("../services/imageService");
const aiClient = require("../services/aiClient");
const { validate, z, id } = require("../middleware/validate");
const { asyncHandler, notFound } = require("../utils/http");

const router = Router();

const analyzeSchema = z.object({ studyId: id("Study ID") });

router.post(
  "/analyze-study",
  validate(analyzeSchema),
  asyncHandler(async (req, res) => {
    const databaseStudyId = req.validated.body.studyId;
    const study = await studyService.get(req.userId, databaseStudyId);

    const images = await imageService.listStudyImagesWithData(
      req.userId,
      study.patientId,
      databaseStudyId
    );
    if (images.length === 0) {
      throw notFound("No images found for this study");
    }

    console.info(
      `[ai] analysis requested study=${databaseStudyId} modality=${study.modality} images=${images.length}`
    );

    const result = await aiClient.analyzeStudy({
      studyId: study.studyId || String(databaseStudyId),
      databaseStudyId,
      patientId: study.patientId,
      modality: study.modality || "UNKNOWN",
      bodyPart: study.bodyPart,
      studyDescription: study.studyDescription,
      modelType: "AUTO",
      images: images.map((image) => ({
        id: image.id,
        fileName: image.fileName || `image-${image.id}`,
        contentType: image.contentType || "application/octet-stream",
        imageOrder: image.imageOrder,
        seriesId: image.seriesId,
        dataBase64: Buffer.from(image.imageData).toString("base64"),
      })),
    });

    res.json({
      success: true,
      message: "AI analysis completed successfully",
      result: {
        ...result,
        databaseStudyId,
        patientId: study.patientId,
        patientName: study.patientName,
        bodyPart: study.bodyPart,
        studyDescription: study.studyDescription,
        modality: study.modality,
        processedImages: result.processedImages || images.length,
        metadata: {
          ...(result.metadata || {}),
          generatedAt: new Date().toISOString(),
          pipeline: "Radiology AI Copilot",
          reviewRequired: true,
        },
      },
    });
  })
);

module.exports = router;
