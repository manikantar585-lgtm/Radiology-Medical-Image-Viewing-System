const axios = require("axios");
const config = require("../config/env");
const { HttpError } = require("../utils/http");

const client = axios.create({
  baseURL: config.aiServiceUrl,
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
});

/** Translates transport failures into HTTP errors the API can return as-is. */
function toHttpError(error, fallbackMessage) {
  if (error.response) {
    const data = error.response.data || {};
    return new HttpError(502, data.detail || data.message || "AI service returned an error", data);
  }
  if (error.code === "ECONNREFUSED") {
    return new HttpError(
      503,
      `AI service is not running. Please start the Python AI service at ${config.aiServiceUrl}.`
    );
  }
  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return new HttpError(504, "AI service request timed out.");
  }
  return new HttpError(500, error.message || fallbackMessage);
}

/** Renders a DICOM buffer to a PNG buffer using the Python service. */
async function renderDicom(buffer) {
  try {
    const { data } = await client.post(
      "/api/ai/render-dicom",
      { dataBase64: Buffer.from(buffer).toString("base64") },
      { timeout: 120000 }
    );
    if (!data?.success || !data.dataBase64) {
      throw new HttpError(502, "Python DICOM renderer returned an invalid response.");
    }
    return Buffer.from(data.dataBase64, "base64");
  } catch (error) {
    throw error instanceof HttpError
      ? error
      : toHttpError(error, "Unable to render DICOM preview.");
  }
}

/** Sends a study and its images to the Python analysis pipeline. */
async function analyzeStudy(payload) {
  try {
    const { data } = await client.post("/api/ai/analyze", payload, { timeout: 300000 });
    return data?.result || {};
  } catch (error) {
    throw toHttpError(error, "Unable to analyze study");
  }
}

module.exports = { renderDicom, analyzeStudy };
