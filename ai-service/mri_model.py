import base64
import io
import os
from typing import Any, Dict, List

import numpy as np
import torch
from PIL import Image, ImageOps
from transformers import (
    AutoImageProcessor,
    AutoModelForImageClassification,
)


# =========================================================
# CONFIGURATION
# =========================================================

MODEL_NAME = os.getenv(
    "MRI_MODEL_NAME",
    "Tharsana/vit-base-brain-tumor",
)

DEVICE = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)


# =========================================================
# MODEL CACHE
# =========================================================

_processor = None
_model = None


# =========================================================
# LOAD MODEL
# =========================================================

def load_mri_model():
    global _processor
    global _model

    if (
        _processor is not None
        and _model is not None
    ):
        return _processor, _model

    print(
        f"Loading MRI model: {MODEL_NAME}"
    )

    _processor = (
        AutoImageProcessor.from_pretrained(
            MODEL_NAME,
            use_fast=False,
        )
    )

    _model = (
        AutoModelForImageClassification
        .from_pretrained(
            MODEL_NAME,
        )
    )

    _model.to(DEVICE)
    _model.eval()

    print(
        f"MRI model loaded successfully on {DEVICE}"
    )

    print(
        "MRI model labels:",
        _model.config.id2label,
    )

    return _processor, _model


# =========================================================
# BASE64 IMAGE DECODING
# =========================================================

def decode_base64_image(
    data_base64: str,
) -> Image.Image:

    if not data_base64:
        raise ValueError(
            "Image Base64 data is empty"
        )

    value = str(
        data_base64
    ).strip()

    if (
        value.startswith("data:")
        and "," in value
    ):
        value = value.split(
            ",",
            1,
        )[1]

    try:
        image_bytes = base64.b64decode(
            value,
            validate=True,
        )
    except Exception as error:
        raise ValueError(
            f"Invalid Base64 image: {error}"
        ) from error

    if not image_bytes:
        raise ValueError(
            "Decoded image is empty"
        )

    image = Image.open(
        io.BytesIO(
            image_bytes
        )
    )

    image = ImageOps.exif_transpose(
        image
    )

    image = image.convert(
        "RGB"
    )

    return image


# =========================================================
# LABEL NORMALIZATION
# =========================================================

def normalize_label(
    label: Any,
) -> str:

    value = str(
        label
        if label is not None
        else ""
    ).strip().lower()

    if value in {
        "1",
        "yes",
        "true",
        "positive",
        "tumor",
        "brain tumor",
    }:
        return "yes"

    if value in {
        "0",
        "no",
        "false",
        "negative",
        "normal",
        "healthy",
    }:
        return "no"

    return value or "unknown"


def get_label_map(
    model,
) -> Dict[int, str]:

    raw_map = getattr(
        model.config,
        "id2label",
        {},
    )

    label_map = {}

    for key, value in raw_map.items():

        try:
            index = int(key)
        except (
            TypeError,
            ValueError,
        ):
            continue

        label_map[index] = (
            normalize_label(value)
        )

    return label_map


# =========================================================
# SINGLE IMAGE PREDICTION
# =========================================================

@torch.inference_mode()
def predict_image(
    image: Image.Image,
    processor,
    model,
) -> Dict[str, Any]:

    inputs = processor(
        images=image,
        return_tensors="pt",
    )

    inputs = {
        key: value.to(DEVICE)
        for key, value in inputs.items()
    }

    outputs = model(
        **inputs
    )

    probabilities = torch.softmax(
        outputs.logits,
        dim=-1,
    )[0]

    label_map = get_label_map(
        model
    )

    predictions = []

    for index, probability in enumerate(
        probabilities
    ):

        value = float(
            probability.item()
        )

        label = label_map.get(
            index,
            str(index),
        )

        predictions.append(
            {
                "index": index,
                "label": label,
                "probability": round(
                    value,
                    6,
                ),
                "confidence": round(
                    value,
                    4,
                ),
            }
        )

    predictions.sort(
        key=lambda item:
            item["probability"],
        reverse=True,
    )

    if predictions:
        top_prediction = predictions[0]
    else:
        top_prediction = {
            "index": 0,
            "label": "unknown",
            "probability": 0.0,
            "confidence": 0.0,
        }

    return {
        "predictedLabel":
            top_prediction["label"],

        "predictedIndex":
            top_prediction["index"],

        "confidence":
            top_prediction["confidence"],

        "probability":
            top_prediction["probability"],

        "classProbabilities":
            predictions,
    }


# =========================================================
# MRI STUDY ANALYSIS
# =========================================================

def analyze_mri_images(
    images: List[Dict[str, Any]],
) -> Dict[str, Any]:

    if not images:
        return {
            "available": False,
            "model": MODEL_NAME,
            "reason": (
                "No MRI images were supplied"
            ),
            "findings": [],
            "measurements": [],
            "segmentation": None,
        }

    processor, model = (
        load_mri_model()
    )

    slice_results = []
    failed_results = []

    # -----------------------------------------------------
    # ANALYZE EACH IMAGE
    # -----------------------------------------------------

    for position, item in enumerate(
        images,
        start=1,
    ):

        try:

            image = decode_base64_image(
                item.get(
                    "dataBase64",
                    "",
                )
            )

            prediction = predict_image(
                image,
                processor,
                model,
            )

            slice_results.append(
                {
                    "imageId":
                        item.get("id"),

                    "fileName":
                        item.get(
                            "fileName"
                        ),

                    "imageOrder":
                        item.get(
                            "imageOrder"
                        ),

                    "sliceNumber":
                        position,

                    "prediction":
                        prediction,
                }
            )

        except Exception as error:

            failed_results.append(
                {
                    "imageId":
                        item.get("id"),

                    "fileName":
                        item.get(
                            "fileName"
                        ),

                    "imageOrder":
                        item.get(
                            "imageOrder"
                        ),

                    "error":
                        str(error),
                }
            )

    if not slice_results:

        return {
            "available": False,
            "model": MODEL_NAME,
            "reason": (
                "MRI model could not process "
                "any supplied images"
            ),
            "sliceResults": [],
            "failedSlices": failed_results,
            "findings": [],
            "measurements": [],
            "segmentation": None,
        }

    # -----------------------------------------------------
    # COLLECT POSITIVE / NEGATIVE PROBABILITIES
    # -----------------------------------------------------

    yes_probabilities = []
    no_probabilities = []

    for item in slice_results:

        probabilities = (
            item[
                "prediction"
            ][
                "classProbabilities"
            ]
        )

        yes_probability = 0.0
        no_probability = 0.0

        for prediction in probabilities:

            label = normalize_label(
                prediction["label"]
            )

            probability = float(
                prediction["probability"]
            )

            if label == "yes":
                yes_probability = probability

            elif label == "no":
                no_probability = probability

        yes_probabilities.append(
            yes_probability
        )

        no_probabilities.append(
            no_probability
        )

    mean_yes_probability = float(
        np.mean(
            yes_probabilities
        )
    )

    mean_no_probability = float(
        np.mean(
            no_probabilities
        )
    )

    maximum_yes_probability = float(
        np.max(
            yes_probabilities
        )
    )

    # -----------------------------------------------------
    # SLICE COUNTS
    # -----------------------------------------------------

    positive_slice_count = sum(
        1
        for value in yes_probabilities
        if value >= 0.50
    )

    negative_slice_count = sum(
        1
        for value in no_probabilities
        if value >= 0.50
    )

    total_processed = len(
        slice_results
    )

    positive_slice_ratio = (
        positive_slice_count
        / total_processed
    )

    # -----------------------------------------------------
    # STUDY-LEVEL PREDICTION
    # -----------------------------------------------------

    if (
        mean_yes_probability
        >= mean_no_probability
    ):
        study_label = "yes"
        study_probability = (
            mean_yes_probability
        )
    else:
        study_label = "no"
        study_probability = (
            mean_no_probability
        )

    study_confidence = round(
        float(
            study_probability
        ),
        4,
    )

    low_confidence = (
        study_confidence < 0.70
    )

    # -----------------------------------------------------
    # FINDING
    # -----------------------------------------------------

    findings = []

    if study_label == "yes":

        findings.append(
            {
                "id":
                    "MRI-MODEL-POSITIVE",

                "label":
                    "Positive-class model prediction",

                "type":
                    "model_prediction",

                "classification":
                    "positive",

                "confidence":
                    study_confidence,

                "severity":
                    "review",

                "description":
                    (
                        "The connected MRI image "
                        "classification model assigned "
                        "the positive class at study "
                        "level. This is a research/"
                        "development model output and "
                        "requires qualified clinical "
                        "review."
                    ),

                "location":
                    None,
            }
        )

    else:

        findings.append(
            {
                "id":
                    "MRI-MODEL-NEGATIVE",

                "label":
                    "Negative-class model prediction",

                "type":
                    "model_prediction",

                "classification":
                    "negative",

                "confidence":
                    study_confidence,

                "severity":
                    "review",

                "description":
                    (
                        "The connected MRI image "
                        "classification model assigned "
                        "the negative class at study "
                        "level. This does not rule out "
                        "disease and requires qualified "
                        "clinical review."
                    ),

                "location":
                    None,
            }
        )

    # -----------------------------------------------------
    # MEASUREMENTS
    # -----------------------------------------------------

    measurements = [
        {
            "type":
                "mean_positive_probability",

            "label":
                "Mean positive-class probability",

            "value":
                round(
                    mean_yes_probability,
                    4,
                ),

            "unit":
                "probability",
        },

        {
            "type":
                "positive_slice_ratio",

            "label":
                "Positive-predicted slice ratio",

            "value":
                round(
                    positive_slice_ratio,
                    4,
                ),

            "unit":
                "ratio",
        },

        {
            "type":
                "maximum_positive_probability",

            "label":
                "Maximum positive-class probability",

            "value":
                round(
                    maximum_yes_probability,
                    4,
                ),

            "unit":
                "probability",
        },
    ]

    # -----------------------------------------------------
    # FINAL RESULT
    # -----------------------------------------------------

    return {
        "available":
            True,

        "model":
            MODEL_NAME,

        "modelType":
            "research_image_classifier",

        "device":
            str(DEVICE),

        "studyPrediction":
            {
                "label":
                    study_label,

                "confidence":
                    study_confidence,

                "meanPositiveProbability":
                    round(
                        mean_yes_probability,
                        4,
                    ),

                "meanNegativeProbability":
                    round(
                        mean_no_probability,
                        4,
                    ),

                "maximumPositiveProbability":
                    round(
                        maximum_yes_probability,
                        4,
                    ),

                "positivePredictedSlices":
                    positive_slice_count,

                "negativePredictedSlices":
                    negative_slice_count,

                "totalProcessedSlices":
                    total_processed,

                "positiveSliceRatio":
                    round(
                        positive_slice_ratio,
                        4,
                    ),

                "lowConfidence":
                    low_confidence,
            },

        "sliceResults":
            slice_results,

        "failedSlices":
            failed_results,

        "findings":
            findings,

        "measurements":
            measurements,

        "segmentation":
            None,

        "localization":
            None,

        "clinicalDiagnosis":
            False,

        "reviewRequired":
            True,

        "disclaimer":
            (
                "Research/development model output only. "
                "This classifier is not a validated "
                "clinical diagnostic system. Results "
                "require qualified clinical review."
            ),
    }
def get_mri_model_status() -> Dict[str, Any]:

    return {
        "name":
            MODEL_NAME,
        "loaded":
            _model is not None,
        "device":
            str(DEVICE),
        "task":
            "binary MRI image classification",
        "clinicalValidation":
            False,
        "reviewRequired":
            True,
    }
def preload_mri_model():

    try:

        load_mri_model()

        return {
            "success":
                True,

            **get_mri_model_status(),
        }

    except Exception as error:

        return {
            "success":
                False,

            "error":
                str(error),

            **get_mri_model_status(),
        }
