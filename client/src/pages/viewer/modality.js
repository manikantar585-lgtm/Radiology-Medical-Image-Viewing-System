/** Maps free-text modality names to DICOM modality codes (CT, MR, XR, US, PT, OT). */
export function getModality(value) {
  const modality = String(value || "").toUpperCase();

  if (modality.includes("CT")) {
    return "CT";
  }
  if (modality.includes("MRI") || modality === "MR") {
    return "MR";
  }
  if (modality.includes("X-RAY") || modality.includes("XRAY") || modality === "XR") {
    return "XR";
  }
  if (modality.includes("ULTRASOUND") || modality === "US") {
    return "US";
  }
  if (modality.includes("PET")) {
    return "PT";
  }
  return modality || "OT";
}
