import base64
import io
import math
import os
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from fastapi import APIRouter, HTTPException
from PIL import Image, ImageOps
import pydicom

try:
    from pydicom.pixel_data_handlers.util import apply_voi_lut
except ImportError:
    apply_voi_lut = None

from schemas import AIRequest
from mri_model import analyze_mri_images
from ct_model import analyze_ct_images
from vision_models import (
    BRAIN_KEYWORDS,
    analyze_study_images,
    matches_any,
)

from dicom_series import (
    create_dicom_series_from_ai_images,
    cleanup_dicom_series,
)


router = APIRouter()


# =========================================================
# CONFIGURATION
# =========================================================

MAX_IMAGES_PER_REQUEST = int(
    os.getenv(
        "AI_MAX_IMAGES",
        "500",
    )
)

MAX_DECODED_IMAGE_BYTES = int(
    os.getenv(
        "AI_MAX_IMAGE_BYTES",
        str(100 * 1024 * 1024),
    )
)


MODEL_REGISTRY: Dict[str, Dict[str, Any]] = {
    "CT": {
        "name": "CT-AI",
        "enabled": True,
        "description": (
            "Quantitative CT analysis from Hounsfield "
            "units, with TotalSegmentator anatomical "
            "segmentation for larger series."
        ),
    },

    "MRI": {
        "name": "MRI-Brain-Tumor-Classifier",
        "enabled": True,
        "description": (
            "Research/development MRI brain-tumor "
            "image classification model."
        ),
    },

    "X-RAY": {
        "name": "X-RAY-AI",
        "enabled": False,
        "description": (
            "X-ray clinical model adapter is not "
            "installed yet."
        ),
    },

    "ULTRASOUND": {
        "name": "ULTRASOUND-AI",
        "enabled": False,
        "description": (
            "Ultrasound clinical model adapter is not "
            "installed yet."
        ),
    },

    "PET": {
        "name": "PET-AI",
        "enabled": False,
        "description": (
            "PET clinical model adapter is not "
            "installed yet."
        ),
    },

    "GENERAL": {
        "name": "GENERAL-AI",
        "enabled": False,
        "description": (
            "General clinical model adapter is not "
            "installed yet."
        ),
    },
}


# =========================================================
# BASIC HELPERS
# =========================================================

def clamp(
    value: float,
    minimum: float,
    maximum: float,
) -> float:
    return max(
        minimum,
        min(
            maximum,
            value,
        ),
    )


def safe_score(
    value: Any,
) -> float:
    try:
        numeric_value = float(value)
    except (
        TypeError,
        ValueError,
    ):
        return 0.0

    if not math.isfinite(numeric_value):
        return 0.0

    return round(
        clamp(
            numeric_value,
            0.0,
            1.0,
        ),
        4,
    )


def safe_int(
    value: Any,
    default: int = 0,
) -> int:
    try:
        return int(value)
    except (
        TypeError,
        ValueError,
    ):
        return default


def normalize_modality(
    modality: Optional[str],
) -> str:

    value = str(
        modality or ""
    ).strip().upper()

    # Normalize common CT labels such as:
    # CT, CT SCAN, CAT SCAN, COMPUTED TOMOGRAPHY
    if value in {
        "CT",
        "CT SCAN",
        "CT-SCAN",
        "CAT",
        "CAT SCAN",
        "COMPUTED TOMOGRAPHY",
    }:
        return "CT"

    # MRI / MR labels
    if value in {
        "MR",
        "MRI",
        "MAGNETIC RESONANCE",
        "MAGNETIC RESONANCE IMAGING",
    }:
        return "MRI"

    # X-ray labels
    if value in {
        "XR",
        "X-RAY",
        "X RAY",
        "X_RAY",
        "XRAY",
        "RADIOGRAPH",
        "RADIOGRAPHY",
    }:
        return "X-RAY"

    # Ultrasound labels
    if value in {
        "US",
        "ULTRASOUND",
        "SONOGRAPHY",
    }:
        return "ULTRASOUND"

    # PET labels
    if value in {
        "PT",
        "PET",
        "PET-CT",
        "PET CT",
        "PET CT SCAN",
    }:
        return "PET"

    return value or "UNKNOWN"


def select_model(
    modality: Optional[str],
) -> Dict[str, Any]:

    normalized = normalize_modality(
        modality
    )

    key = (
        normalized
        if normalized in MODEL_REGISTRY
        else "GENERAL"
    )

    config = MODEL_REGISTRY[key]

    return {
        "modality": normalized,
        "name": config["name"],
        "enabled": bool(
            config["enabled"]
        ),
        "description": config[
            "description"
        ],
    }


# =========================================================
# BASE64 HELPERS
# =========================================================

def decode_base64_data(
    value: str,
) -> bytes:

    if not value:
        raise ValueError(
            "Image Base64 data is empty"
        )

    text = str(value).strip()

    # Support:
    # data:image/png;base64,AAAA...
    if text.startswith("data:") and "," in text:
        text = text.split(
            ",",
            1,
        )[1]

    try:
        decoded = base64.b64decode(
            text,
            validate=True,
        )
    except Exception as error:
        raise ValueError(
            f"Invalid Base64 image data: {error}"
        ) from error

    if not decoded:
        raise ValueError(
            "Decoded image data is empty"
        )

    if len(decoded) > MAX_DECODED_IMAGE_BYTES:
        raise ValueError(
            "Decoded image exceeds the configured "
            "maximum size"
        )

    return decoded


# =========================================================
# DICOM HELPERS
# =========================================================

def apply_dicom_transforms(
    dataset,
    pixels: np.ndarray,
) -> np.ndarray:

    array = np.asarray(
        pixels,
        dtype=np.float32,
    )

    # Rescale slope/intercept
    try:
        slope = float(
            getattr(
                dataset,
                "RescaleSlope",
                1.0,
            )
        )
    except (
        TypeError,
        ValueError,
    ):
        slope = 1.0

    try:
        intercept = float(
            getattr(
                dataset,
                "RescaleIntercept",
                0.0,
            )
        )
    except (
        TypeError,
        ValueError,
    ):
        intercept = 0.0

    array = (
        array * slope
    ) + intercept

    # Apply VOI LUT/windowing when supported
    if apply_voi_lut is not None:
        try:
            transformed = apply_voi_lut(
                dataset,
                index=0,
            )

            transformed = np.asarray(
                transformed,
                dtype=np.float32,
            )

            if transformed.ndim == 2:
                array = transformed

        except Exception:
            pass

    # MONOCHROME1 means lower values are displayed
    # brighter, therefore invert for analysis.
    photometric = str(
        getattr(
            dataset,
            "PhotometricInterpretation",
            "",
        )
    ).upper()

    if photometric == "MONOCHROME1":
        maximum = float(
            np.max(array)
        )

        minimum = float(
            np.min(array)
        )

        array = (
            maximum
            + minimum
            - array
        )

    return array


def get_dicom_metadata(
    dataset,
) -> Dict[str, Any]:

    return {
        "modality": str(
            getattr(
                dataset,
                "Modality",
                "",
            )
        ),

        "rows": safe_int(
            getattr(
                dataset,
                "Rows",
                0,
            )
        ),

        "columns": safe_int(
            getattr(
                dataset,
                "Columns",
                0,
            )
        ),

        "bodyPart": str(
            getattr(
                dataset,
                "BodyPartExamined",
                "",
            )
        ),

        "seriesDescription": str(
            getattr(
                dataset,
                "SeriesDescription",
                "",
            )
        ),

        "seriesNumber": safe_int(
            getattr(
                dataset,
                "SeriesNumber",
                0,
            )
        ),

        "instanceNumber": safe_int(
            getattr(
                dataset,
                "InstanceNumber",
                0,
            )
        ),

        "sopInstanceUID": str(
            getattr(
                dataset,
                "SOPInstanceUID",
                "",
            )
        ),

        "studyInstanceUID": str(
            getattr(
                dataset,
                "StudyInstanceUID",
                "",
            )
        ),

        "seriesInstanceUID": str(
            getattr(
                dataset,
                "SeriesInstanceUID",
                "",
            )
        ),
    }


# =========================================================
# PIXEL NORMALIZATION
# =========================================================

def normalize_pixels(
    pixels: np.ndarray,
) -> np.ndarray:

    array = np.asarray(
        pixels,
        dtype=np.float32,
    )

    if array.size == 0:
        raise ValueError(
            "Image contains no pixel data"
        )

    minimum = float(
        np.min(array)
    )

    maximum = float(
        np.max(array)
    )

    if (
        not math.isfinite(minimum)
        or not math.isfinite(maximum)
    ):
        raise ValueError(
            "Image contains invalid pixel values"
        )

    if maximum <= minimum:
        return np.zeros_like(
            array,
            dtype=np.float32,
        )

    normalized = (
        array - minimum
    ) / (
        maximum - minimum
    )

    normalized = np.clip(
        normalized,
        0.0,
        1.0,
    )

    return normalized.astype(
        np.float32
    )


# =========================================================
# IMAGE DECODING
# =========================================================

def decode_image(
    image_bytes: bytes,
    content_type: str,
    file_name: str,
) -> Tuple[
    np.ndarray,
    int,
    int,
    str,
    Dict[str, Any],
]:

    content_type = str(
        content_type or ""
    ).lower().strip()

    file_name_lower = str(
        file_name or ""
    ).lower().strip()

    is_dicom = (
        "dicom" in content_type
        or file_name_lower.endswith(".dcm")
        or file_name_lower.endswith(".dicom")
    )

    # -----------------------------------------------------
    # DICOM
    # -----------------------------------------------------

    if is_dicom:
        try:
            dataset = pydicom.dcmread(
                io.BytesIO(
                    image_bytes
                ),
                force=True,
            )

            if not hasattr(
                dataset,
                "PixelData",
            ):
                raise ValueError(
                    "DICOM does not contain PixelData"
                )

            raw_pixels = (
                dataset.pixel_array
            )

            raw_pixels = apply_dicom_transforms(
                dataset,
                raw_pixels,
            )

            if raw_pixels.ndim > 2:
                raw_pixels = raw_pixels[0]

            height, width = (
                raw_pixels.shape[:2]
            )

            normalized = normalize_pixels(
                raw_pixels
            )

            metadata = get_dicom_metadata(
                dataset
            )

            return (
                normalized,
                width,
                height,
                "DICOM",
                metadata,
            )

        except Exception as error:
            raise ValueError(
                f"DICOM decoding failed: {error}"
            ) from error

    # -----------------------------------------------------
    # JPG / PNG / OTHER NORMAL IMAGE
    # -----------------------------------------------------

    try:
        image = Image.open(
            io.BytesIO(
                image_bytes
            )
        )

        image = ImageOps.exif_transpose(
            image
        )

        image = image.convert(
            "L"
        )

        array = np.asarray(
            image,
            dtype=np.float32,
        )

        normalized = normalize_pixels(
            array
        )

        width, height = (
            image.size
        )

        metadata = {
            "modality": "",
            "rows": height,
            "columns": width,
            "bodyPart": "",
            "seriesDescription": "",
            "seriesNumber": 0,
            "instanceNumber": 0,
            "sourceFileName": file_name,
        }

        return (
            normalized,
            width,
            height,
            "IMAGE",
            metadata,
        )

    except Exception as error:
        raise ValueError(
            f"Image decoding failed: {error}"
        ) from error


# =========================================================
# IMAGE FEATURES
# =========================================================

def calculate_percentile(
    pixels: np.ndarray,
    percentile: float,
) -> float:

    try:
        value = np.percentile(
            pixels,
            percentile,
        )

        return float(
            value
        )

    except Exception:
        return 0.0


def calculate_gradient_strength(
    pixels: np.ndarray,
) -> float:

    if (
        pixels.ndim != 2
        or pixels.shape[0] < 2
        or pixels.shape[1] < 2
    ):
        return 0.0

    gradient_x = np.diff(
        pixels,
        axis=1,
    )

    gradient_y = np.diff(
        pixels,
        axis=0,
    )

    value = (
        np.mean(
            np.abs(
                gradient_x
            )
        )
        +
                np.mean(
            np.abs(
                gradient_y
            )
        )
    ) / 2.0

    return float(
        value
    )


def calculate_histogram_features(
    pixels: np.ndarray,
) -> Dict[str, Any]:

    histogram, _ = np.histogram(
        pixels,
        bins=16,
        range=(
            0.0,
            1.0,
        ),
    )

    histogram = histogram.astype(
        np.float64
    )

    total = float(
        np.sum(histogram)
    )

    if total > 0:
        normalized_histogram = (
            histogram / total
        )
    else:
        normalized_histogram = (
            np.zeros(
                16,
                dtype=np.float64,
            )
        )

    entropy = 0.0

    for probability in normalized_histogram:
        if probability > 0:
            entropy -= (
                probability
                * math.log2(
                    probability
                )
            )

    return {
        "histogram": [
            round(
                float(value),
                6,
            )
            for value in normalized_histogram
        ],
        "entropy": round(
            float(entropy),
            4,
        ),
    }


def analyze_pixels(
    pixels: np.ndarray,
) -> Dict[str, Any]:

    mean_value = float(
        np.mean(pixels)
    )

    std_value = float(
        np.std(pixels)
    )

    minimum = float(
        np.min(pixels)
    )

    maximum = float(
        np.max(pixels)
    )

    gradient_strength = (
        calculate_gradient_strength(
            pixels
        )
    )

    if std_value > 0:
        contrast_ratio = (
            mean_value
            / std_value
        )
    else:
        contrast_ratio = 0.0

    histogram_features = (
        calculate_histogram_features(
            pixels
        )
    )

    return {
        "meanIntensity": round(
            mean_value,
            4,
        ),

        "intensityStd": round(
            std_value,
            4,
        ),

        "minimumIntensity": round(
            minimum,
            4,
        ),

        "maximumIntensity": round(
            maximum,
            4,
        ),

        "percentile01": round(
            calculate_percentile(
                pixels,
                1,
            ),
            4,
        ),

        "percentile50": round(
            calculate_percentile(
                pixels,
                50,
            ),
            4,
        ),

        "percentile99": round(
            calculate_percentile(
                pixels,
                99,
            ),
            4,
        ),

        "gradientStrength": round(
            gradient_strength,
            4,
        ),

        "contrastRatio": round(
            contrast_ratio,
            4,
        ),

        "histogramEntropy": histogram_features[
            "entropy"
        ],

        "histogram": histogram_features[
            "histogram"
        ],
    }


# =========================================================
# IMAGE QUALITY
# =========================================================

def evaluate_image_quality(
    pixels: np.ndarray,
) -> Dict[str, Any]:

    mean_value = float(
        np.mean(pixels)
    )

    std_value = float(
        np.std(pixels)
    )

    gradient_strength = (
        calculate_gradient_strength(
            pixels
        )
    )

    dynamic_range = float(
        np.max(pixels)
        - np.min(pixels)
    )

    issues: List[str] = []

    if dynamic_range < 0.05:
        issues.append(
            "Very low dynamic range"
        )

    if std_value < 0.03:
        issues.append(
            "Low image variation"
        )

    if gradient_strength < 0.01:
        issues.append(
            "Low edge strength"
        )

    if mean_value < 0.02:
        issues.append(
            "Image may be predominantly dark"
        )

    if mean_value > 0.98:
        issues.append(
            "Image may be predominantly bright"
        )

    if not issues:
        quality = "acceptable"
    elif len(issues) == 1:
        quality = "review"
    else:
        quality = "limited"

    return {
        "quality": quality,
        "issues": issues,
        "dynamicRange": round(
            dynamic_range,
            4,
        ),
        "meanIntensity": round(
            mean_value,
            4,
        ),
        "standardDeviation": round(
            std_value,
            4,
        ),
        "gradientStrength": round(
            gradient_strength,
            4,
        ),
    }


# =========================================================
# VISUAL REGION
# =========================================================

def create_center_region(
    width: int,
    height: int,
) -> Dict[str, int]:

    region_width = max(
        1,
        int(
            width * 0.30
        ),
    )

    region_height = max(
        1,
        int(
            height * 0.30
        ),
    )

    x = max(
        0,
        int(
            (width - region_width)
            / 2
        ),
    )

    y = max(
        0,
        int(
            (height - region_height)
            / 2
        ),
    )

    return {
        "x": x,
        "y": y,
        "width": region_width,
        "height": region_height,
    }


# =========================================================
# PROCESSED IMAGE RESULT
# =========================================================

def build_processed_image_result(
    image_id: int,
    file_name: str,
    image_order: Optional[int],
    series_id: Optional[int],
    width: int,
    height: int,
    source_type: str,
    pixels: np.ndarray,
    dicom_metadata: Dict[str, Any],
) -> Dict[str, Any]:

    features = analyze_pixels(
        pixels
    )

    quality = evaluate_image_quality(
        pixels
    )

    return {
        "imageId": image_id,

        "fileName": file_name,

        "imageOrder": image_order,

        "seriesId": series_id,

        "width": width,

        "height": height,

        "sourceType": source_type,

        "features": features,

        "quality": quality,

        "dicomMetadata": (
            dicom_metadata
            if source_type == "DICOM"
            else None
        ),

        "visualRegion": create_center_region(
            width,
            height,
        ),
    }


# =========================================================
# CLINICAL MODEL ADAPTER
# =========================================================

def run_clinical_model(
    modality: str,
    request: AIRequest,
    decoded_pixels: List[np.ndarray],
) -> Dict[str, Any]:
    """
    Run the modality specialist (CT HU analysis, MRI brain
    classifier) and the general vision models (BiomedCLIP,
    TorchXRayVision), then merge their output.
    """

    specialist = run_specialist_model(
        modality,
        request,
    )

    try:

        vision = analyze_study_images(
            normalize_modality(
                modality
            ),
            request.bodyPart,
            decoded_pixels,
        )

    except Exception as error:

        vision = {
            "available": False,
            "model": "BiomedCLIP",
            "findings": [],
            "measurements": [],
            "reason": f"Vision model inference failed: {error}",
        }

    return merge_model_results(
        [
            specialist,
            vision,
        ]
    )


def merge_model_results(
    results: List[Dict[str, Any]],
) -> Dict[str, Any]:

    available = [
        result
        for result in results
        if result.get("available")
    ]

    notes = [
        str(result.get("reason"))
        for result in results
        if not result.get("available")
        and result.get("reason")
    ]

    if not available:
        return {
            "available": False,
            "model": results[0].get("model"),
            "findings": [],
            "measurements": [],
            "segmentation": None,
            "reason": " ".join(notes) or "No AI model produced a result.",
        }

    prediction = next(
        (
            result["studyPrediction"]
            for result in available
            if result.get("studyPrediction")
        ),
        None,
    )

    return {
        "available": True,
        "model": " + ".join(
            str(result.get("model"))
            for result in available
        ),
        "modelType": "multi-model research analysis",
        "device": available[0].get("device"),
        "findings": [
            finding
            for result in available
            for finding in result.get("findings", [])
        ],
        "measurements": [
            measurement
            for result in available
            for measurement in result.get("measurements", [])
        ],
        "segmentation": next(
            (
                result.get("segmentation")
                for result in available
                if result.get("segmentation")
            ),
            None,
        ),
        "studyPrediction": prediction,
        "summaries": [
            result["summary"]
            for result in available
            if result.get("summary")
        ],
        "notes": notes,
        "clinicalValidation": False,
        "reviewRequired": True,
    }


def run_specialist_model(
    modality: str,
    request: AIRequest,
) -> Dict[str, Any]:
    """
    Run the modality-specific adapter.

    MRI uses the research brain-tumor classifier (brain/head
    studies only); CT uses Hounsfield-unit analysis.
    """

    model = select_model(
        modality
    )

    normalized_modality = model[
        "modality"
    ]

    # =====================================================
    # MRI MODEL
    # =====================================================

    if (
        normalized_modality == "MRI"
        and model["enabled"]
        and matches_any(
            request.bodyPart,
            BRAIN_KEYWORDS,
        )
    ):

        try:

            mri_images = [
                {
                    "id":
                        image.id,

                    "fileName":
                        image.fileName,

                    "contentType":
                        image.contentType,

                    "imageOrder":
                        image.imageOrder,

                    "seriesId":
                        image.seriesId,

                    "dataBase64":
                        image.dataBase64,
                }
                for image in request.images
            ]

            mri_result = analyze_mri_images(
                mri_images
            )

            return mri_result

        except Exception as error:

            return {
                "available":
                    False,

                "model":
                    model["name"],

                "modality":
                    normalized_modality,

                "findings":
                    [],

                "measurements":
                    [],

                "segmentation":
                    None,

                "reason":
                    (
                        "MRI model inference failed: "
                        f"{error}"
                    ),
            }

    # =====================================================
    # CT MODEL
    # =====================================================

    if (
        normalized_modality == "CT"
        and model["enabled"]
    ):

        ct_images = [
            {
                "id":
                    image.id,

                "fileName":
                    image.fileName,

                "contentType":
                    image.contentType,

                "imageOrder":
                    image.imageOrder,

                "seriesId":
                    image.seriesId,

                "dataBase64":
                    image.dataBase64,
            }
            for image in request.images
        ]

        return analyze_ct_images(
            ct_images,
            body_part=request.bodyPart,
        )

    return {
        "available": False,

        "model": model["name"],

        "modality": normalized_modality,

        "findings": [],

        "measurements": [],

        "segmentation": None,

        # No specialist for this modality; the general vision
        # models cover it, so there is nothing to report here.
        "reason": None,
    }


# =========================================================
# TECHNICAL FINDINGS
# =========================================================

def build_technical_findings(
    successful_count: int,
    failed_count: int,
    processed_images: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:

    findings: List[
        Dict[str, Any]
    ] = []

    if successful_count > 0:
        findings.append(
            {
                "id":
                    "TECH-IMAGE-PROCESSING",

                "label":
                    "Image processing completed",

                "type":
                    "technical",

                "severity":
                    "review",

                "confidence":
                    None,

                "description":
                    (
                        f"{successful_count} "
                        f"image(s) were successfully "
                        f"decoded and analyzed."
                    ),

                "location":
                    None,
            }
        )

    if failed_count > 0:
        findings.append(
            {
                "id":
                    "TECH-IMAGE-FAILURES",

                "label":
                    "Some images could not be processed",

                "type":
                    "technical",

                "severity":
                    "warning",

                "confidence":
                    None,

                "description":
                    (
                        f"{failed_count} image(s) "
                        f"could not be decoded."
                    ),

                "location":
                    None,
            }
        )

    limited_quality_count = 0

    for item in processed_images:
        quality = item.get(
            "quality",
            {},
        )

        if quality.get(
            "quality"
        ) == "limited":
            limited_quality_count += 1

    if limited_quality_count > 0:
        findings.append(
            {
                "id":
                    "TECH-IMAGE-QUALITY",

                "label":
                    "Image quality requires review",

                "type":
                    "technical",

                "severity":
                    "warning",

                "confidence":
                    None,

                "description":
                    (
                        f"{limited_quality_count} "
                        f"image(s) had technical "
                        f"quality limitations."
                    ),

                "location":
                    None,
            }
        )

    return findings


# =========================================================
# STUDY SUMMARY
# =========================================================

def summarize_processed_images(
    processed_images: List[Dict[str, Any]],
) -> Dict[str, Any]:

    valid = [
        item
        for item in processed_images
        if "features" in item
    ]

    if not valid:
        return {
            "meanIntensity": 0.0,
            "meanGradientStrength": 0.0,
            "meanContrastRatio": 0.0,
        }

    mean_intensity = float(
        np.mean(
            [
                item[
                    "features"
                ][
                    "meanIntensity"
                ]
                for item in valid
            ]
        )
    )

    mean_gradient = float(
        np.mean(
            [
                item[
                    "features"
                ][
                    "gradientStrength"
                ]
                for item in valid
            ]
        )
    )

    mean_contrast = float(
        np.mean(
            [
                item[
                    "features"
                ][
                    "contrastRatio"
                ]
                for item in valid
            ]
        )
    )

    return {
        "meanIntensity": round(
            mean_intensity,
            4,
        ),

        "meanGradientStrength": round(
            mean_gradient,
            4,
        ),

        "meanContrastRatio": round(
            mean_contrast,
            4,
        ),
    }


# =========================================================
# REPORT BUILDER
# =========================================================

def build_report(
    modality: str,
    model_result: Dict[str, Any],
    successful_count: int,
    failed_count: int,
) -> Dict[str, str]:

    model_name = str(
        model_result.get(
            "model",
            "AI model",
        )
    )

    clinical_findings = model_result.get(
        "findings",
        [],
    )

    notes = model_result.get(
        "notes",
        [],
    )

    if not (
        model_result.get("available")
        and clinical_findings
    ):

        reason = str(
            model_result.get("reason")
            or "No inference result was available."
        )

        return {
            "findings": (
                "No AI clinical-model finding was generated. "
                f"{successful_count} image(s) were processed "
                f"and {failed_count} image(s) failed."
            ),
            "impression": (
                f"{reason}\n\n"
                "Radiologist review is required."
            ),
        }

    review_findings = [
        finding
        for finding in clinical_findings
        if finding.get("severity") == "review"
    ]

    other_findings = [
        finding
        for finding in clinical_findings
        if finding.get("severity") != "review"
    ]

    findings_text = "\n\n".join(
        f"{finding.get('label')}: {finding.get('description')}"
        for finding in review_findings + other_findings
    )

    impression_lines = [
        f"{modality} study, {successful_count} image(s) analysed "
        f"by {model_name}.",
    ]

    impression_lines.extend(
        model_result.get(
            "summaries",
            [],
        )
    )

    if review_findings:
        impression_lines.append(
            "Flagged for review: "
            + ", ".join(
                str(finding.get("label"))
                for finding in review_findings
            )
            + "."
        )
    else:
        impression_lines.append(
            "No finding reached the review threshold."
        )

    if notes:
        impression_lines.append(
            "Notes: " + " ".join(notes)
        )

    impression_lines.append(
        "\nAll output comes from research models, is not a "
        "diagnosis, and requires qualified radiologist review."
    )

    return {
        "findings": findings_text,

        "impression": "\n".join(impression_lines),
    }


# =========================================================
# DICOM CONVERSION HELPER
# =========================================================

def is_dicom_source(
    file_name: str,
    content_type: str,
) -> bool:

    name = str(
        file_name or ""
    ).lower()

    mime = str(
        content_type or ""
    ).lower()

    return (
        "dicom" in mime
        or name.endswith(".dcm")
        or name.endswith(".dicom")
    )


def create_derived_series_if_needed(
    request: AIRequest,
) -> Optional[Dict[str, Any]]:
    """
    JPG/PNG studies are converted into a derived
    DICOM Secondary Capture series.

    Original DICOM files are not converted again.
    """

    source_images = [
        {
            "id": image.id,
            "fileName": image.fileName,
            "contentType": image.contentType,
            "imageOrder": image.imageOrder,
            "seriesId": image.seriesId,
            "dataBase64": image.dataBase64,
        }
        for image in request.images
        if not is_dicom_source(
            image.fileName,
            image.contentType,
        )
    ]

    if not source_images:
        return None

    modality = normalize_modality(
        request.modality
    )

    try:
        result = (
            create_dicom_series_from_ai_images(
                images=source_images,

                patient_id=(
                    request.patientId
                    if request.patientId is not None
                    else "DERIVED-PATIENT"
                ),

                patient_name=(
                    "Radiology Patient"
                ),

                series_description=(
                    f"Derived {modality} "
                    "image series"
                ),
            )
        )

        return result

    except Exception as error:
        return {
            "success": False,

            "modality": "SC",

            "sourceType": "JPG/PNG",

            "derived": True,

            "convertedCount": 0,

            "failedCount": len(
                source_images
            ),

            "error": str(error),
        }


# =========================================================
# MAIN AI ANALYSIS ENDPOINT
# =========================================================

@router.post(
    "/api/ai/analyze"
)
async def analyze_study(
    request: AIRequest,
):

    derived_dicom = None

    cleanup_directory = None

    try:

        # -----------------------------------------------------
        # VALIDATION
        # -----------------------------------------------------

        if not str(
            request.studyId or ""
        ).strip():

            raise HTTPException(
                status_code=400,
                detail=(
                    "studyId is required"
                ),
            )

        if not request.images:

            raise HTTPException(
                status_code=400,
                detail=(
                    "At least one image is required"
                ),
            )

        if len(
            request.images
        ) > MAX_IMAGES_PER_REQUEST:

            raise HTTPException(
                status_code=400,
                detail=(
                    f"Maximum of "
                    f"{MAX_IMAGES_PER_REQUEST} "
                    "images are allowed"
                ),
            )

        # -----------------------------------------------------
        # MODEL SELECTION
        # -----------------------------------------------------

        model = select_model(
            request.modality
        )

        normalized_modality = model[
            "modality"
        ]

        # -----------------------------------------------------
        # PROCESS IMAGES
        # -----------------------------------------------------

        processed_images = []

        decoded_pixels = []

        successful_count = 0

        failed_count = 0

        for image in request.images:

            try:

                raw_bytes = (
                    decode_base64_data(
                        image.dataBase64
                    )
                )

                (
                    pixels,
                    width,
                    height,
                    source_type,
                    image_metadata,
                ) = decode_image(
                    raw_bytes,
                    image.contentType,
                    image.fileName,
                )

                processed_result = (
                    build_processed_image_result(
                        image_id=image.id,

                        file_name=image.fileName,

                        image_order=image.imageOrder,

                        series_id=image.seriesId,

                        width=width,

                        height=height,

                        source_type=source_type,

                        pixels=pixels,

                        dicom_metadata=image_metadata,
                    )
                )

                processed_images.append(
                    processed_result
                )

                decoded_pixels.append(
                    pixels
                )

                successful_count += 1

            except Exception as error:

                failed_count += 1

                processed_images.append(
                    {
                        "imageId":
                            image.id,

                        "fileName":
                            image.fileName,

                        "imageOrder":
                            image.imageOrder,

                        "seriesId":
                            image.seriesId,

                        "error":
                            str(error),
                    }
                )

        if successful_count == 0:

            raise HTTPException(
                status_code=422,
                detail=(
                    "None of the supplied images "
                    "could be processed"
                ),
            )

        # -----------------------------------------------------
        # JPG / PNG → DERIVED DICOM
        # -----------------------------------------------------

        derived_dicom = (
            create_derived_series_if_needed(
                request
            )
        )

        if derived_dicom:

            cleanup_directory = (
                derived_dicom.get(
                    "outputDirectory"
                )
            )

        # -----------------------------------------------------
        # TECHNICAL SUMMARY
        # -----------------------------------------------------

        technical_findings = (
            build_technical_findings(
                successful_count,
                failed_count,
                processed_images,
            )
        )

        image_summary = (
            summarize_processed_images(
                processed_images
            )
        )

        # -----------------------------------------------------
        # CLINICAL MODEL
        # -----------------------------------------------------

        model_result = (
            run_clinical_model(
                normalized_modality,
                request,
                decoded_pixels,
            )
        )

        clinical_findings = (
            model_result.get(
                "findings",
                [],
            )
        )

        measurements = (
            model_result.get(
                "measurements",
                [],
            )
        )

        segmentation = (
            model_result.get(
                "segmentation"
            )
        )

        # -----------------------------------------------------
        # COMMON FINDINGS ARRAY
        # -----------------------------------------------------

        findings = []

        findings.extend(
            clinical_findings
        )

        # Technical findings are kept separate so the UI can
        # distinguish clinical AI results from image-processing
        # information.
        # -----------------------------------------------------

        # -----------------------------------------------------
        # REPORT
        # -----------------------------------------------------

        report = build_report(
            modality=normalized_modality,

            model_result=model_result,

            successful_count=successful_count,

            failed_count=failed_count,
        )

        # -----------------------------------------------------
        # FINAL RESULT
        # -----------------------------------------------------

        result = {

            "studyId":
                request.studyId,

            "databaseStudyId":
                request.databaseStudyId,

            "patientId":
                request.patientId,

            "modality":
                normalized_modality,

            "bodyPart":
                request.bodyPart,

            "studyDescription":
                request.studyDescription,

            "model":
                model["name"],

            "status":
                "completed",

            "processedImages":
                successful_count,

            "failedImages":
                failed_count,

            "totalImagesReceived":
                len(
                    request.images
                ),

            "findings":
                findings,

            "clinicalFindings":
                clinical_findings,

            "technicalFindings":
                technical_findings,

            "measurements":
                measurements,

            "segmentation":
                segmentation,

            "imageAnalysis":
                image_summary,

            "processedImageDetails":
                processed_images,

            "derivedDicom":
                derived_dicom,

            "clinicalModel":
                {
                    "available":
                        bool(
                            model_result.get(
                                "available",
                                False,
                            )
                        ),

                    "name":
                        model_result.get(
                            "model",
                            model["name"],
                        ),

                    "type":
                        model_result.get(
                            "modelType",
                            "unknown",
                        ),

                    "device":
                        model_result.get(
                            "device",
                            None,
                        ),

                    "clinicalValidation":
                        bool(
                            model_result.get(
                                "clinicalValidation",
                                False,
                            )
                        ),

                    "reviewRequired":
                        bool(
                            model_result.get(
                                "reviewRequired",
                                True,
                            )
                        ),

                    "reason":
                        model_result.get(
                            "reason"
                        ),
                },

            "report":
                report,

            "metadata":
                {
                    "pipeline":
                        "Radiology AI Copilot",

                    "model":
                        model["name"],

                    "normalizedModality":
                        normalized_modality,

                    "reviewRequired":
                        True,

                    "assistiveOnly":
                        True,

                    "realImageDataProcessed":
                        True,

                    "derivedDICOMCreated":
                        bool(
                            derived_dicom
                        ),

                    "clinicalInferenceAvailable":
                        bool(
                            model_result.get(
                                "available",
                                False,
                            )
                        ),

                    "note":
                        (
                            "This stage performs "
                            "real image ingestion, "
                            "preprocessing and, when "
                            "applicable, derived "
                            "DICOM conversion. "
                            "Clinical findings require "
                            "a connected clinical model "
                            "and radiologist review."
                        ),
                },
        }

        return {
            "success":
                True,

            "message":
                "AI image processing completed",

            "result":
                result,
        }

    except HTTPException:
        raise

    except Exception as error:

        print(
            "AI analysis error:",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )

    finally:

        # Temporary derived DICOM files are removed after
        # the analysis request completes.
        if cleanup_directory:
            cleanup_dicom_series(
                cleanup_directory
            )


# =========================================================
# AI HEALTH
# =========================================================

@router.get(
    "/api/ai/health"
)
async def ai_health():

    clinical_models_available = any(
        bool(
            config.get(
                "enabled"
            )
        )
        for config in MODEL_REGISTRY.values()
    )

    return {
        "success":
            True,

        "service":
            "Radiology AI Copilot",

        "status":
            "running",

        "version":
            "1.0.0",

        "clinicalModelsAvailable":
            clinical_models_available,

        "supportedModalities":
            [
                "CT",
                "MRI",
                "X-RAY",
                "ULTRASOUND",
                "PET",
            ],
    }


# =========================================================
# AI MODELS
# =========================================================

@router.get(
    "/api/ai/models"
)
async def ai_models():

    models = []

    for modality, config in (
        MODEL_REGISTRY.items()
    ):

        models.append(
            {
                "modality":
                    modality,

                "name":
                    config["name"],

                "enabled":
                    bool(
                        config["enabled"]
                    ),

                "description":
                    config["description"],
            }
        )

    return {
        "success":
            True,

        "models":
            models,

        "count":
            len(models),
    }


# =========================================================
# AI SERVICE ROOT
# =========================================================

@router.get(
    "/api/ai"
)
async def ai_root():

    return {
        "success":
            True,

        "service":
            "Radiology AI Copilot",

        "status":
            "running",

        "description":
            (
                "Multimodal medical imaging "
                "AI orchestration service"
            ),

        "endpoints":
            {
                "analyze":
                    "/api/ai/analyze",

                "health":
                    "/api/ai/health",

                "models":
                    "/api/ai/models",
            },
    }


# =========================================================
# DICOM IMAGE PREVIEW
# =========================================================

@router.post("/api/ai/render-dicom")
async def render_dicom_preview(
    payload: Dict[str, Any],
):

    try:

        data_base64 = payload.get(
            "dataBase64"
        )

        if not data_base64:
            raise HTTPException(
                status_code=400,
                detail="dataBase64 is required",
            )

        raw_bytes = decode_base64_data(
            data_base64
        )

        dataset = pydicom.dcmread(
            io.BytesIO(raw_bytes),
            force=True,
        )

        if not hasattr(
            dataset,
            "PixelData",
        ):
            raise HTTPException(
                status_code=422,
                detail="DICOM contains no PixelData",
            )

        pixels = dataset.pixel_array

        if pixels.ndim > 2:
            pixels = pixels[0]

        pixels = apply_dicom_transforms(
            dataset,
            pixels,
        )

        normalized = normalize_pixels(
            pixels
        )

        preview = (
            normalized * 255.0
        ).clip(
            0,
            255,
        ).astype(
            np.uint8
        )

        image = Image.fromarray(
            preview,
            mode="L",
        )

        output = io.BytesIO()

        image.save(
            output,
            format="PNG",
        )

        png_base64 = base64.b64encode(
            output.getvalue()
        ).decode(
            "ascii"
        )

        return {
            "success": True,
            "contentType": "image/png",
            "dataBase64": png_base64,
            "width": image.width,
            "height": image.height,
        }

    except HTTPException:
        raise

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=(
                f"DICOM preview rendering failed: "
                f"{error}"
            ),
        )