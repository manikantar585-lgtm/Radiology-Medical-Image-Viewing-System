"""
Pretrained research models that run on decoded 2D images.

- BiomedCLIP (microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224)
  zero-shot image/text matching, used for every modality.
- TorchXRayVision DenseNet (densenet121-res224-all)
  18 chest X-ray pathology scores, used when the image is a chest film.

Both are research models: scores are not calibrated diagnoses and
always require radiologist review.
"""

import os
import threading
from typing import Any, Dict, List, Optional, Tuple, cast

import numpy as np
from PIL import Image


# =========================================================
# CONFIGURATION
# =========================================================

BIOMEDCLIP_NAME = (
    "hf-hub:microsoft/"
    "BiomedCLIP-PubMedBERT_256-vit_base_patch16_224"
)

XRV_WEIGHTS = "densenet121-res224-all"

DEVICE = os.getenv(
    "VISION_AI_DEVICE",
    "cpu",
)

# Large series are sampled evenly to keep CPU inference fast.
MAX_IMAGES_PER_STUDY = 24

# Zero-shot scores at or above this are flagged for review.
REVIEW_SCORE = 0.35

# Modality-check score needed to call the images a mismatch.
MISMATCH_SCORE = 0.6

# TorchXRayVision outputs are threshold-calibrated at 0.5.
XRV_POSITIVE = 0.5

PROMPT_TEMPLATE = "this is a medical image showing {}"

MODALITY_LABELS = {
    "CT": "a CT scan",
    "MRI": "an MRI scan",
    "X-RAY": "an X-ray radiograph",
    "ULTRASOUND": "an ultrasound image",
    "PET": "a PET scan",
    "OTHER": "a photograph or graphic that is not a medical scan",
}

XRAY_REGION_LABELS = [
    "chest",
    "hand",
    "wrist",
    "foot",
    "ankle",
    "knee",
    "hip and pelvis",
    "spine",
    "skull",
    "shoulder",
    "elbow",
]

# Candidate findings per modality. The first entry is the
# "normal" option so the model can prefer no abnormality.
CANDIDATES = {
    "CT_HEAD": [
        "normal head CT",
        "intracranial hemorrhage",
        "ischemic stroke",
        "skull fracture",
        "brain tumor",
        "hydrocephalus",
    ],
    "CT_NECK": [
        "normal neck CT",
        "enlarged cervical lymph nodes",
        "thyroid nodule",
        "neck mass",
        "neck abscess",
        "cervical spine fracture",
    ],
    "CT_CHEST": [
        "normal chest CT",
        "lung nodule",
        "pneumonia",
        "pleural effusion",
        "pulmonary embolism",
        "emphysema",
    ],
    "CT_ABDOMEN": [
        "normal abdominal CT",
        "kidney stone",
        "kidney cyst",
        "kidney tumor",
        "liver lesion",
        "appendicitis",
        "bowel obstruction",
    ],
    "CT_EXTREMITY": [
        "normal bone CT",
        "bone fracture",
        "joint dislocation",
        "bone lesion",
        "metal implant",
    ],
    "CT": [
        "normal CT",
        "kidney stone",
        "kidney cyst",
        "kidney tumor",
        "liver lesion",
        "intracranial hemorrhage",
        "lung nodule",
        "pneumonia",
        "pleural effusion",
        "bone fracture",
    ],
    "MRI_BRAIN": [
        "normal brain MRI",
        "glioma",
        "meningioma",
        "pituitary tumor",
        "ischemic stroke",
        "multiple sclerosis lesions",
        "hydrocephalus",
    ],
    "MRI": [
        "normal MRI",
        "ligament tear",
        "intervertebral disc herniation",
        "tumor",
        "joint effusion",
        "bone marrow edema",
    ],
    "X-RAY": [
        "normal bone radiograph",
        "bone fracture",
        "joint dislocation",
        "osteoarthritis",
        "bone lesion",
        "metal implant",
    ],
    "X-RAY_CHEST": [
        "normal chest X-ray",
        "pneumonia",
        "pleural effusion",
        "pneumothorax",
        "cardiomegaly",
        "lung nodule",
        "pulmonary edema",
    ],
    "ULTRASOUND_PELVIS": [
        "normal pelvic ultrasound",
        "fetus in pregnancy",
        "ovarian cyst",
        "uterine fibroid",
        "free fluid",
    ],
    "ULTRASOUND_NECK": [
        "normal thyroid ultrasound",
        "thyroid nodule",
        "enlarged lymph node",
        "goiter",
    ],
    "ULTRASOUND": [
        "normal ultrasound",
        "gallstones",
        "liver cyst",
        "fatty liver",
        "kidney stone",
        "hydronephrosis",
        "solid mass",
        "fluid collection",
        "fetus in pregnancy",
    ],
    "PET": [
        "normal PET",
        "hypermetabolic lesion",
        "metastatic disease",
        "lymphoma",
    ],
    "GENERAL": [
        "normal anatomy",
        "tumor",
        "bone fracture",
        "fluid collection",
        "inflammation",
    ],
}

BRAIN_KEYWORDS = ["brain", "head", "skull", "cranial", "neuro"]
CHEST_KEYWORDS = ["chest", "lung", "thorax", "thoracic", "cxr"]

# Body-part words mapped to a region. Matching is fuzzy, so
# typos such as "nick" (neck) or "kidany" (kidney) still map.
REGION_VOCABULARY = {
    "head": ["head", "brain", "skull", "cranial", "cranium", "sinus", "face"],
    "neck": ["neck", "cervical", "thyroid", "throat", "larynx", "pharynx"],
    "chest": ["chest", "lung", "lungs", "thorax", "thoracic", "heart", "cardiac"],
    "abdomen": [
        "abdomen", "abdominal", "kidney", "kidneys", "renal", "liver",
        "stomach", "pancreas", "spleen", "bowel", "gallbladder", "kub",
    ],
    "pelvis": ["pelvis", "pelvic", "uterus", "ovary", "bladder", "prostate", "obstetric"],
    "extremity": [
        "ankle", "foot", "knee", "leg", "hand", "wrist", "elbow", "arm",
        "shoulder", "hip", "femur", "tibia", "finger", "toe", "limb",
    ],
}

# Region prompts used when the body part label is unknown.
REGION_PROMPTS = {
    "head": "the head",
    "neck": "the neck",
    "chest": "the chest",
    "abdomen": "the abdomen",
    "pelvis": "the pelvis",
    "extremity": "an arm or leg",
}

# Hide zero-shot candidates that score below this.
MIN_FINDING_SCORE = 0.10
MIN_MEASUREMENT_SCORE = 0.01


# =========================================================
# MODEL LOADING (cached, thread-safe)
# =========================================================

_lock = threading.Lock()
_clip: Optional[Tuple[Any, Any, Any]] = None
_xrv: Optional[Any] = None
_text_cache: Dict[Tuple[str, ...], Any] = {}


def load_biomedclip():

    global _clip

    with _lock:

        if _clip is None:

            import open_clip

            # Returns (model, preprocess) because return_transform
            # defaults to True; the declared type is a union.
            model, preprocess = cast(
                Tuple[Any, Any],
                open_clip.create_model_from_pretrained(
                    BIOMEDCLIP_NAME
                ),
            )

            tokenizer = open_clip.get_tokenizer(
                BIOMEDCLIP_NAME
            )

            model.to(DEVICE).eval()

            _clip = (
                model,
                preprocess,
                tokenizer,
            )

        return _clip


def load_xrv():

    global _xrv

    with _lock:

        if _xrv is None:

            import torchxrayvision as xrv

            model = xrv.models.DenseNet(
                weights=XRV_WEIGHTS
            )

            model.to(DEVICE).eval()

            _xrv = model

        return _xrv


# =========================================================
# HELPERS
# =========================================================

def matches_any(
    value: Optional[str],
    keywords: List[str],
) -> bool:

    text = str(value or "").lower()

    return any(
        keyword in text
        for keyword in keywords
    )


def sample_images(
    images: List[np.ndarray],
) -> List[np.ndarray]:

    if len(images) <= MAX_IMAGES_PER_STUDY:
        return images

    indices = np.linspace(
        0,
        len(images) - 1,
        MAX_IMAGES_PER_STUDY,
    ).round().astype(int)

    return [images[index] for index in indices]


def to_rgb(
    pixels: np.ndarray,
) -> Image.Image:

    array = np.asarray(
        pixels,
        dtype=np.float32,
    )

    if array.ndim == 3:
        array = array.mean(axis=2)

    array = np.clip(array, 0.0, 1.0)

    return Image.fromarray(
        (array * 255.0).astype(np.uint8)
    ).convert("RGB")


def percent(
    value: float,
) -> float:

    return round(float(value) * 100.0, 1)


# =========================================================
# BIOMEDCLIP ZERO-SHOT
# =========================================================

def zero_shot(
    images: List[np.ndarray],
    labels: List[str],
) -> np.ndarray:
    """
    Mean softmax probability of each label across the images.
    """

    import torch

    model, preprocess, tokenizer = load_biomedclip()

    key = tuple(labels)

    with torch.no_grad():

        if key not in _text_cache:

            tokens = tokenizer(
                [PROMPT_TEMPLATE.format(label) for label in labels],
                context_length=256,
            ).to(DEVICE)

            text_features = model.encode_text(tokens)

            _text_cache[key] = (
                text_features
                / text_features.norm(dim=-1, keepdim=True)
            )

        text_features = _text_cache[key]

        batch = torch.stack(
            [preprocess(to_rgb(image)) for image in images]
        ).to(DEVICE)

        image_features = model.encode_image(batch)

        image_features = (
            image_features
            / image_features.norm(dim=-1, keepdim=True)
        )

        logits = (
            model.logit_scale.exp()
            * image_features
            @ text_features.T
        )

        probabilities = logits.softmax(dim=-1)

    return probabilities.mean(dim=0).cpu().numpy()


def body_region(
    body_part: Optional[str],
) -> Optional[str]:

    import difflib

    vocabulary = {
        word: region
        for region, words in REGION_VOCABULARY.items()
        for word in words
    }

    for word in str(body_part or "").lower().replace("-", " ").split():

        match = difflib.get_close_matches(
            word,
            list(vocabulary),
            n=1,
            cutoff=0.6,
        )

        if match:
            return vocabulary[match[0]]

    return None


def candidate_key(
    modality: str,
    region: Optional[str],
    is_chest: bool,
) -> str:

    if modality == "CT":
        key = f"CT_{str(region).upper()}"
        if region == "pelvis":
            key = "CT_ABDOMEN"
        return key if key in CANDIDATES else "CT"

    if modality == "MRI":
        return "MRI_BRAIN" if region == "head" else "MRI"

    if modality == "X-RAY":
        return "X-RAY_CHEST" if is_chest else "X-RAY"

    if modality == "ULTRASOUND":
        key = f"ULTRASOUND_{str(region).upper()}"
        return key if key in CANDIDATES else "ULTRASOUND"

    if modality in CANDIDATES:
        return modality

    return "GENERAL"


# =========================================================
# TORCHXRAYVISION (CHEST X-RAY)
# =========================================================

def chest_xray_scores(
    images: List[np.ndarray],
) -> Dict[str, float]:

    import torch
    import torchxrayvision as xrv
    import torchvision

    model = load_xrv()

    transform = torchvision.transforms.Compose(
        [
            xrv.datasets.XRayCenterCrop(),
            xrv.datasets.XRayResizer(224),
        ]
    )

    batch = []

    for image in images:

        array = np.asarray(image, dtype=np.float32)

        if array.ndim == 3:
            array = array.mean(axis=2)

        # TorchXRayVision expects pixel values in [-1024, 1024].
        array = np.clip(array, 0.0, 1.0) * 2048.0 - 1024.0

        batch.append(
            transform(array[None, ...])
        )

    with torch.no_grad():

        outputs = model(
            torch.from_numpy(np.stack(batch)).float().to(DEVICE)
        ).cpu().numpy()

    mean_scores = outputs.mean(axis=0)

    return {
        pathology: float(score)
        for pathology, score in zip(
            model.pathologies,
            mean_scores,
        )
        if pathology
    }


# =========================================================
# STUDY ANALYSIS ENTRY POINT
# =========================================================

def analyze_study_images(
    modality: str,
    body_part: Optional[str],
    images: List[np.ndarray],
) -> Dict[str, Any]:
    """
    Run BiomedCLIP (and TorchXRayVision for chest films) on
    decoded grayscale images normalized to [0, 1].
    """

    if not images:
        return {
            "available": False,
            "model": "BiomedCLIP",
            "findings": [],
            "measurements": [],
            "reason": "No decoded images were available.",
        }

    sampled = sample_images(images)

    findings: List[Dict[str, Any]] = []
    measurements: List[Dict[str, Any]] = []
    models_used = ["BiomedCLIP"]

    # ---------------------------------------------------
    # 1. Does the image look like the declared modality?
    # ---------------------------------------------------

    modality_keys = list(MODALITY_LABELS)

    modality_scores = zero_shot(
        sampled,
        [MODALITY_LABELS[key] for key in modality_keys],
    )

    detected_index = int(np.argmax(modality_scores))
    detected_modality = modality_keys[detected_index]
    detected_score = float(modality_scores[detected_index])

    mismatch = (
        modality in MODALITY_LABELS
        and detected_modality != modality
        and detected_score >= MISMATCH_SCORE
    )

    # Score findings against what the images actually are, so a
    # CT mislabelled as X-ray is not read by the chest X-ray model.
    effective_modality = (
        detected_modality
        if mismatch and detected_modality != "OTHER"
        else modality
    )

    if mismatch:
        findings.append(
            {
                "id": "AI-MODALITY-MISMATCH",
                "label": "Images may not match the study modality",
                "type": "quality",
                "severity": "review",
                "confidence": round(detected_score, 3),
                "description": (
                    f"The study is labelled {modality}, but the images "
                    f"look most like {MODALITY_LABELS[detected_modality]} "
                    f"({percent(detected_score)}%). Check that the "
                    "correct images were uploaded."
                    + (
                        f" Findings below were scored as "
                        f"{effective_modality}."
                        if effective_modality != modality
                        else ""
                    )
                ),
                "location": None,
            }
        )

    # ---------------------------------------------------
    # 2. X-ray region (decides whether to run the chest model)
    # ---------------------------------------------------

    is_chest = matches_any(body_part, CHEST_KEYWORDS)
    region = None

    if effective_modality == "X-RAY":

        region_scores = zero_shot(
            sampled,
            [f"an X-ray of the {label}" for label in XRAY_REGION_LABELS],
        )

        region = XRAY_REGION_LABELS[int(np.argmax(region_scores))]

        if not body_part or not is_chest:
            is_chest = is_chest or region == "chest"

    # ---------------------------------------------------
    # 3. Candidate findings (zero-shot)
    # ---------------------------------------------------

    anatomy = body_region(body_part)

    if anatomy is None and effective_modality in ("CT", "MRI", "ULTRASOUND"):

        region_keys = list(REGION_PROMPTS)

        region_scores = zero_shot(
            sampled,
            [
                f"a {effective_modality} image of {REGION_PROMPTS[key]}"
                for key in region_keys
            ],
        )

        anatomy = region_keys[int(np.argmax(region_scores))]

    key = candidate_key(effective_modality, anatomy, is_chest)
    labels = CANDIDATES[key]
    scores = zero_shot(sampled, labels)

    ranked = sorted(
        zip(labels, scores),
        key=lambda item: item[1],
        reverse=True,
    )

    top_label, top_score = ranked[0]
    normal_label = labels[0]

    for label, score in ranked:

        if score < MIN_MEASUREMENT_SCORE:
            continue

        measurements.append(
            {
                "label": f"BiomedCLIP match: {label}",
                "value": percent(score),
                "unit": "%",
            }
        )

    if top_label == normal_label:
        findings.append(
            {
                "id": "AI-ZS-NORMAL",
                "label": f"Most consistent with {normal_label}",
                "type": "zero_shot",
                "severity": "informational",
                "confidence": round(float(top_score), 3),
                "description": (
                    f"BiomedCLIP ranked '{normal_label}' highest "
                    f"({percent(top_score)}%) among "
                    f"{len(labels)} candidates across "
                    f"{len(sampled)} image(s). Zero-shot scores are "
                    "relative, not calibrated probabilities."
                ),
                "location": None,
            }
        )

    for label, score in ranked[:3]:

        if (
            label == normal_label
            or score < MIN_FINDING_SCORE
        ):
            continue

        findings.append(
            {
                "id": "AI-ZS-" + label.upper().replace(" ", "-"),
                "label": f"Possible {label}",
                "type": "zero_shot",
                "severity": (
                    "review"
                    if score >= REVIEW_SCORE
                    else "informational"
                ),
                "confidence": round(float(score), 3),
                "description": (
                    f"BiomedCLIP zero-shot match {percent(score)}% "
                    f"across {len(sampled)} image(s). This is a "
                    "research screening signal, not a diagnosis; "
                    "verify on the images."
                ),
                "location": None,
            }
        )

    # ---------------------------------------------------
    # 4. Chest X-ray specialist model
    # ---------------------------------------------------

    chest_scores: Dict[str, float] = {}

    if effective_modality == "X-RAY" and is_chest:

        chest_scores = chest_xray_scores(sampled)
        models_used.append("TorchXRayVision")

        for pathology, score in sorted(
            chest_scores.items(),
            key=lambda item: item[1],
            reverse=True,
        ):
            measurements.append(
                {
                    "label": f"TorchXRayVision: {pathology}",
                    "value": percent(score),
                    "unit": "%",
                }
            )

            if score >= XRV_POSITIVE:
                findings.append(
                    {
                        "id": "XRV-" + pathology.upper().replace(" ", "-"),
                        "label": f"Chest X-ray: {pathology}",
                        "type": "pathology_classifier",
                        "severity": "review",
                        "confidence": round(score, 3),
                        "description": (
                            f"TorchXRayVision scored {pathology} at "
                            f"{percent(score)}% (positive threshold 50%). "
                            "Research model; requires radiologist review."
                        ),
                        "location": None,
                    }
                )

    positive_chest = [
        pathology
        for pathology, score in chest_scores.items()
        if score >= XRV_POSITIVE
    ]

    summary_lines = [
        f"BiomedCLIP top match: {top_label} ({percent(top_score)}%).",
    ]

    if region:
        summary_lines.append(f"Detected X-ray region: {region}.")
    elif anatomy:
        summary_lines.append(f"Body region assessed: {anatomy}.")

    if chest_scores:
        summary_lines.append(
            "TorchXRayVision positive pathologies: "
            + (", ".join(positive_chest) if positive_chest else "none")
            + "."
        )

    return {
        "available": True,
        "model": " + ".join(models_used),
        "modelType": "pretrained research models (zero-shot + classifier)",
        "device": DEVICE,
        "findings": findings,
        "measurements": measurements,
        "segmentation": None,
        "studyPrediction": {
            "label": top_label,
            "confidence": float(top_score),
        },
        "detectedModality": detected_modality,
        "detectedRegion": region,
        "summary": " ".join(summary_lines),
        "clinicalValidation": False,
        "reviewRequired": True,
    }
