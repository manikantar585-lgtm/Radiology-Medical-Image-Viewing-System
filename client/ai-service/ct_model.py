import base64
import os
import shutil
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np


# =========================================================
# CT MODEL CONFIGURATION
# =========================================================

CT_MODEL_NAME = "TotalSegmentator"

CT_MODEL_VERSION = (
    "TotalSegmentator-CT"
)

CT_CLINICAL_VALIDATION = False

CT_REVIEW_REQUIRED = True

CT_DEVICE = os.getenv(
    "CT_AI_DEVICE",
    "cpu",
)


# =========================================================
# OPTIONAL ROI CONFIGURATION
# =========================================================

# These are anatomical structures, not disease labels.
#
# We intentionally start with a small ROI set because the
# current computer is CPU-only.

ROI_PRESETS = {

    "kidney": [
        "kidney_left",
        "kidney_right",
    ],

    "abdomen": [
        "liver",
        "spleen",
        "kidney_left",
        "kidney_right",
        "pancreas",
    ],

    "chest": [
        "lung_left",
        "lung_right",
        "heart",
        "aorta",
    ],

    "head": [
        "brain",
    ],

    "body": [
        "liver",
        "spleen",
        "kidney_left",
        "kidney_right",
        "lung_left",
        "lung_right",
        "heart",
        "aorta",
    ],

    "default": [
        "liver",
        "spleen",
        "kidney_left",
        "kidney_right",
    ],
}


# Limb studies contain none of the trunk organs above, so they
# use the free "body" task (trunk vs. extremities) instead.

EXTREMITY_KEYWORDS = [
    "ankle",
    "foot",
    "feet",
    "toe",
    "heel",
    "knee",
    "leg",
    "tibia",
    "fibula",
    "femur",
    "thigh",
    "hand",
    "wrist",
    "finger",
    "elbow",
    "arm",
    "forearm",
    "humerus",
    "shoulder",
    "extremity",
    "limb",
]


def is_extremity(
    body_part: Optional[str],
) -> bool:

    value = normalize_body_part(
        body_part
    )

    return any(
        keyword in value.split()
        for keyword in EXTREMITY_KEYWORDS
    )


# =========================================================
# SAFE HELPERS
# =========================================================

def normalize_body_part(
    body_part: Optional[str],
) -> str:

    value = str(
        body_part or ""
    ).strip().lower()

    value = (
        value
        .replace("_", " ")
        .replace("-", " ")
    )

    value = " ".join(
        value.split()
    )

    return value


def select_roi_subset(
    body_part: Optional[str],
) -> List[str]:

    value = normalize_body_part(
        body_part
    )

    if (
        "kidney" in value
        or "renal" in value
    ):
        return ROI_PRESETS[
            "kidney"
        ]

    if (
        "abdomen" in value
        or "abdominal" in value
    ):
        return ROI_PRESETS[
            "abdomen"
        ]

    if (
        "chest" in value
        or "thorax" in value
        or "lung" in value
    ):
        return ROI_PRESETS[
            "chest"
        ]

    if (
        "head" in value
        or "brain" in value
        or "skull" in value
    ):
        return ROI_PRESETS[
            "head"
        ]

    return ROI_PRESETS[
        "default"
    ]


def safe_float(
    value: Any,
    default: float = 0.0,
) -> float:

    try:
        result = float(
            value
        )

        if np.isfinite(
            result
        ):
            return result

    except (
        TypeError,
        ValueError,
    ):
        pass

    return default


# =========================================================
# DICOM DETECTION
# =========================================================

def contains_real_dicom(
    images: List[Dict[str, Any]],
) -> bool:

    for image in images:

        file_name = str(
            image.get(
                "fileName",
                "",
            )
        ).lower()

        content_type = str(
            image.get(
                "contentType",
                "",
            )
        ).lower()

        if (
            file_name.endswith(
                ".dcm"
            )
            or file_name.endswith(
                ".dicom"
            )
            or "dicom" in content_type
        ):
            return True

    return False


# =========================================================
# INPUT VALIDATION
# =========================================================

def validate_ct_images(
    images: List[Dict[str, Any]],
) -> Dict[str, Any]:

    if not images:
        return {
            "valid": False,
            "reason": (
                "No CT images were supplied."
            ),
        }

    has_dicom = contains_real_dicom(
        images
    )

    if not has_dicom:
        return {
            "valid": False,
            "reason": (
                "CT images are JPG/PNG, so Hounsfield-unit "
                "measurements and TotalSegmentator need the "
                "original CT DICOM files."
            ),
        }

    return {
        "valid": True,
        "reason": (
            "Original DICOM input detected."
        ),
    }


# =========================================================
# TOTALSEGMENTATOR IMPORT
# =========================================================

def load_totalsegmentator():
    try:

        from totalsegmentator.python_api import (
            totalsegmentator,
        )

        return totalsegmentator

    except Exception as error:

        raise RuntimeError(
            "TotalSegmentator could not be imported: "
            f"{error}"
        ) from error


# =========================================================
# NIFTI / SEGMENTATION UTILITIES
# =========================================================

def get_nifti_label_map(
    nifti_path: Path,
) -> Dict[int, str]:

    try:

        from totalsegmentator.nifti_ext_header import (
            load_multilabel_nifti,
        )

        _, label_map = (
            load_multilabel_nifti(
                nifti_path
            )
        )

        normalized = {}

        for key, value in (
            label_map or {}
        ).items():

            try:
                integer_key = int(
                    key
                )
            except (
                TypeError,
                ValueError,
            ):
                continue

            normalized[
                integer_key
            ] = str(
                value
            )

        return normalized

    except Exception:
        return {}


def count_labels(
    segmentation,
    label_map: Dict[int, str],
) -> List[Dict[str, Any]]:

    data = np.asarray(
        segmentation
        .get_fdata()
    )

    results = []

    unique_values = np.unique(
        data
    )

    voxel_spacing = (
        segmentation
        .header
        .get_zooms()
    )

    if len(
        voxel_spacing
    ) >= 3:

        voxel_volume_mm3 = (
            safe_float(
                voxel_spacing[0],
                1.0,
            )
            * safe_float(
                voxel_spacing[1],
                1.0,
            )
            * safe_float(
                voxel_spacing[2],
                1.0,
            )
        )

    else:
        voxel_volume_mm3 = 1.0

    for raw_label in unique_values:

        label_id = int(
            round(
                safe_float(
                    raw_label
                )
            )
        )

        if label_id == 0:
            continue

        voxel_count = int(
            np.sum(
                data == raw_label
            )
        )

        label_name = (
            label_map.get(
                label_id,
                f"label_{label_id}",
            )
        )

        volume_mm3 = (
            voxel_count
            * voxel_volume_mm3
        )

        volume_ml = (
            volume_mm3
            / 1000.0
        )

        results.append(
            {
                "labelId":
                    label_id,

                "label":
                    label_name,

                "voxelCount":
                    voxel_count,

                "volumeMm3":
                    round(
                        volume_mm3,
                        2,
                    ),

                "volumeMl":
                    round(
                        volume_ml,
                        2,
                    ),
            }
        )

    return results


# =========================================================
# END OF PART 1
# =========================================================
# =========================================================
# RUN TOTALSEGMENTATOR
# =========================================================

def run_totalsegmentator(
    dicom_directory: Path,
    output_directory: Path,
    body_part: Optional[str],
) -> Dict[str, Any]:

    totalsegmentator = (
        load_totalsegmentator()
    )

    if is_extremity(
        body_part
    ):
        task = "body"
        roi_subset = None
    else:
        task = "total"
        roi_subset = (
            select_roi_subset(
                body_part
            )
        )

    output_directory.mkdir(
        parents=True,
        exist_ok=True,
    )

    output_file = (
        output_directory
        / "ct_segmentation.nii.gz"
    )

    print(
        "Starting TotalSegmentator..."
    )

    print(
        f"Device: {CT_DEVICE}"
    )

    print(
        f"Task: {task}, ROI subset: {roi_subset}"
    )

    try:

        segmentation = (
            totalsegmentator(
                input=str(
                    dicom_directory
                ),

                output=str(
                    output_file
                ),

                ml=True,

                task=task,

                roi_subset=roi_subset,

                fast=True,

                device=CT_DEVICE,

                quiet=False,

                nr_thr_resamp=1,

                nr_thr_saving=1,
            )
        )

        # TotalSegmentator normally writes the file when
        # an output path is provided. Some versions also
        # return an in-memory NIfTI object.

        if (
            segmentation is not None
            and not output_file.exists()
        ):

            try:

                import nibabel as nib

                # Some versions return (image, label_map).
                if isinstance(segmentation, tuple):
                    segmentation = segmentation[0]

                nib.save(
                    segmentation,
                    output_file,
                )

            except Exception as error:

                print(
                    "Unable to save returned "
                    f"segmentation: {error}"
                )


        if not output_file.exists():

            raise RuntimeError(
                "TotalSegmentator completed "
                "without creating the segmentation file."
            )


        import nibabel as nib

        segmentation_image = (
            nib.load(
                str(
                    output_file
                )
            )
        )


        label_map = (
            get_nifti_label_map(
                output_file
            )
        )


        structures = count_labels(
            segmentation_image,
            label_map,
        )


        return {
            "success":
                True,

            "available":
                True,

            "model":
                CT_MODEL_NAME,

            "modelVersion":
                CT_MODEL_VERSION,

            "device":
                CT_DEVICE,

            "task":
                "anatomical CT segmentation",

            "segmentationTask":
                task,

            "roiSubset":
                roi_subset,

            "structures":
                structures,

            "segmentationFile":
                str(
                    output_file
                ),

            "clinicalValidation":
                CT_CLINICAL_VALIDATION,

            "reviewRequired":
                CT_REVIEW_REQUIRED,

            "note":
                (
                    "Anatomical segmentation output "
                    "is provided for research/development "
                    "and requires qualified clinical review."
                ),
        }

    except Exception as error:

        return {
            "success":
                False,

            "available":
                False,

            "model":
                CT_MODEL_NAME,

            "modelVersion":
                CT_MODEL_VERSION,

            "device":
                CT_DEVICE,

            "task":
                "anatomical CT segmentation",

            "roiSubset":
                roi_subset,

            "structures":
                [],

            "clinicalValidation":
                CT_CLINICAL_VALIDATION,

            "reviewRequired":
                CT_REVIEW_REQUIRED,

            "error":
                str(error),

            "reason":
                (
                    "TotalSegmentator inference failed: "
                    f"{error}"
                ),
        }


# =========================================================
# CREATE TEMPORARY DICOM SERIES
# =========================================================

def prepare_ct_input(
    images: List[Dict[str, Any]],
) -> Dict[str, Any]:

    validation = validate_ct_images(
        images
    )

    if not validation[
        "valid"
    ]:

        # Do NOT send JPG/PNG-derived DICOM to
        # TotalSegmentator as real CT.
        return {
            "success":
                False,

            "usableForClinicalCTModel":
                False,

            "derived":
                False,

            "reason":
                validation[
                    "reason"
                ],
        }


    original_dicom_images = [
        image
        for image in images
        if (
            str(
                image.get(
                    "fileName",
                    "",
                )
            )
            .lower()
            .endswith(
                ".dcm"
            )
            or
            str(
                image.get(
                    "fileName",
                    "",
                )
            )
            .lower()
            .endswith(
                ".dicom"
            )
            or
            "dicom"
            in str(
                image.get(
                    "contentType",
                    "",
                )
            ).lower()
        )
    ]


    temp_root = Path(
        tempfile.mkdtemp(
            prefix="radiology_ct_"
        )
    )


    input_directory = (
        temp_root
        / "input"
    )


    try:

        input_directory.mkdir(
            parents=True,
            exist_ok=True,
        )


        # Write the original DICOM bytes unchanged so the
        # Hounsfield-unit values and slice geometry that
        # TotalSegmentator relies on are preserved.

        for index, image in enumerate(
            original_dicom_images
        ):

            raw_bytes = base64.b64decode(
                str(
                    image.get(
                        "dataBase64",
                        "",
                    )
                ).split(
                    ",",
                    1,
                )[-1]
            )

            (
                input_directory
                / f"slice_{index:05d}.dcm"
            ).write_bytes(
                raw_bytes
            )


        return {
            "success":
                True,

            "usableForClinicalCTModel":
                True,

            "derived":
                False,

            "inputDirectory":
                str(
                    input_directory
                ),

            "temporaryRoot":
                str(
                    temp_root
                ),
        }


    except Exception as error:

        shutil.rmtree(
            temp_root,
            ignore_errors=True,
        )

        raise RuntimeError(
            "Unable to prepare CT DICOM input: "
            f"{error}"
        ) from error


# =========================================================
# HOUNSFIELD-UNIT TISSUE QUANTIFICATION
# =========================================================

# Standard CT attenuation ranges (HU).
FAT_HU_RANGE = (-190.0, -30.0)
SOFT_TISSUE_HU_RANGE = (-29.0, 150.0)
BONE_HU_MIN = 250.0
CORTICAL_BONE_HU_MIN = 700.0
METAL_HU_MIN = 2500.0
BODY_HU_MIN = -500.0

# Ignore metal-range clusters smaller than this (noise).
METAL_MIN_VOLUME_ML = 0.05

# TotalSegmentator needs enough z-coverage to be meaningful.
MIN_SEGMENTATION_SLICES = 40


def load_hu_volume(
    dicom_directory: Path,
) -> Dict[str, Any]:

    import pydicom

    slices = []

    for file_path in sorted(
        dicom_directory.glob(
            "*.dcm"
        )
    ):

        dataset = pydicom.dcmread(
            str(file_path),
            force=True,
        )

        if hasattr(
            dataset,
            "PixelData",
        ):
            slices.append(
                dataset
            )

    if not slices:
        raise ValueError(
            "No CT slices with pixel data were found."
        )

    def slice_position(dataset):
        position = getattr(
            dataset,
            "ImagePositionPatient",
            None,
        )

        if position is not None and len(position) >= 3:
            return safe_float(position[2])

        return safe_float(
            getattr(
                dataset,
                "InstanceNumber",
                0,
            )
        )

    slices.sort(
        key=slice_position
    )

    first = slices[0]

    pixel_spacing = getattr(
        first,
        "PixelSpacing",
        [1.0, 1.0],
    )

    row_spacing = safe_float(pixel_spacing[0], 1.0)
    column_spacing = safe_float(pixel_spacing[1], 1.0)

    positions = [
        slice_position(dataset)
        for dataset in slices
    ]

    gaps = np.abs(
        np.diff(positions)
    )

    gaps = gaps[gaps > 0]

    if gaps.size:
        slice_spacing = float(
            np.median(gaps)
        )
    else:
        slice_spacing = safe_float(
            getattr(
                first,
                "SliceThickness",
                1.0,
            ),
            1.0,
        )

    hu_slices = []

    for dataset in slices:

        pixels = dataset.pixel_array

        if pixels.ndim > 2:
            pixels = pixels[0]

        slope = safe_float(
            getattr(dataset, "RescaleSlope", 1.0),
            1.0,
        )

        intercept = safe_float(
            getattr(dataset, "RescaleIntercept", 0.0),
            0.0,
        )

        hu_slices.append(
            pixels.astype(np.float32)
            * slope
            + intercept
        )

    return {
        "volume": np.stack(hu_slices),
        "modality": str(
            getattr(first, "Modality", "")
        ).upper(),
        "sliceCount": len(slices),
        "voxelMl": (
            row_spacing
            * column_spacing
            * slice_spacing
            / 1000.0
        ),
        "sliceSpacingMm": slice_spacing,
    }


def measure(
    label: str,
    value: float,
    unit: str,
) -> Dict[str, Any]:

    return {
        "label": label,
        "value": round(float(value), 2),
        "unit": unit,
    }


def analyze_hu_composition(
    dicom_directory: Path,
) -> Dict[str, Any]:

    loaded = load_hu_volume(
        dicom_directory
    )

    volume = loaded["volume"]
    voxel_ml = loaded["voxelMl"]
    slice_count = loaded["sliceCount"]
    modality = loaded["modality"]

    if modality and modality != "CT":
        raise ValueError(
            f"DICOM modality is {modality}, not CT; "
            "Hounsfield-unit analysis does not apply."
        )

    body_mask = volume > BODY_HU_MIN

    fat_mask = (
        (volume >= FAT_HU_RANGE[0])
        & (volume <= FAT_HU_RANGE[1])
    )

    soft_mask = (
        (volume >= SOFT_TISSUE_HU_RANGE[0])
        & (volume <= SOFT_TISSUE_HU_RANGE[1])
    )

    metal_mask = volume >= METAL_HU_MIN

    bone_mask = (
        (volume >= BONE_HU_MIN)
        & ~metal_mask
    )

    cortical_mask = (
        (volume >= CORTICAL_BONE_HU_MIN)
        & ~metal_mask
    )

    body_ml = float(body_mask.sum()) * voxel_ml
    fat_ml = float(fat_mask.sum()) * voxel_ml
    soft_ml = float(soft_mask.sum()) * voxel_ml
    bone_ml = float(bone_mask.sum()) * voxel_ml
    cortical_ml = float(cortical_mask.sum()) * voxel_ml
    metal_ml = float(metal_mask.sum()) * voxel_ml

    mean_bone_hu = (
        float(volume[bone_mask].mean())
        if bone_mask.any()
        else 0.0
    )

    cortical_fraction = (
        cortical_ml / bone_ml * 100.0
        if bone_ml > 0
        else 0.0
    )

    coverage_mm = (
        slice_count
        * loaded["sliceSpacingMm"]
    )

    measurements = [
        measure("Scan coverage", coverage_mm, "mm"),
        measure("Tissue volume (> -500 HU)", body_ml, "ml"),
        measure("Soft tissue volume (-29 to 150 HU)", soft_ml, "ml"),
        measure("Fat volume (-190 to -30 HU)", fat_ml, "ml"),
        measure("Bone volume (>= 250 HU)", bone_ml, "ml"),
        measure("Mean bone attenuation", mean_bone_hu, "HU"),
        measure("Cortical bone fraction (>= 700 HU)", cortical_fraction, "%"),
    ]

    findings = [
        {
            "id": "CT-HU-COMPOSITION",
            "label": "CT tissue composition quantified",
            "type": "quantitative",
            "severity": "informational",
            "confidence": None,
            "description": (
                f"Across {slice_count} slice(s) ({coverage_mm:.0f} mm): "
                f"soft tissue {soft_ml:.1f} ml, fat {fat_ml:.1f} ml, "
                f"bone {bone_ml:.1f} ml with mean attenuation "
                f"{mean_bone_hu:.0f} HU. Derived from scanner "
                "Hounsfield units; not a diagnosis."
            ),
            "location": None,
        }
    ]

    if bone_ml <= 0:
        findings.append(
            {
                "id": "CT-HU-NO-BONE",
                "label": "No bone-density tissue in scanned range",
                "type": "quantitative",
                "severity": "review",
                "confidence": None,
                "description": (
                    "No voxels at or above 250 HU were found. "
                    "Confirm the series covers the intended anatomy."
                ),
                "location": None,
            }
        )

    if metal_ml >= METAL_MIN_VOLUME_ML:

        metal_slices = np.where(
            metal_mask.any(axis=(1, 2))
        )[0]

        findings.append(
            {
                "id": "CT-HU-METAL",
                "label": "Metal-range density detected",
                "type": "quantitative",
                "severity": "review",
                "confidence": None,
                "description": (
                    f"{metal_ml:.2f} ml of voxels at or above "
                    f"{METAL_HU_MIN:.0f} HU, consistent with metallic "
                    "material (e.g. implant or foreign body) or "
                    "beam-hardening artefact. Verify on the images."
                ),
                "location": (
                    f"Slices {int(metal_slices[0]) + 1}"
                    f"-{int(metal_slices[-1]) + 1}"
                ),
            }
        )

    return {
        "sliceCount": slice_count,
        "measurements": measurements,
        "findings": findings,
    }


def segmentation_findings(
    structures: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:

    return [
        {
            "id": "CT-ANATOMY-" + str(structure.get("label")),
            "label": "Segmented anatomy: " + str(structure.get("label")),
            "type": "anatomical_segmentation",
            "severity": "informational",
            "confidence": None,
            "description": (
                "TotalSegmentator identified this anatomical structure "
                f"({structure.get('volumeMl')} ml). "
                "This is not a disease diagnosis."
            ),
            "location": None,
            "measurement": {
                "volumeMl": structure.get("volumeMl"),
                "volumeMm3": structure.get("volumeMm3"),
            },
        }
        for structure in structures
    ]


# =========================================================
# CT ANALYSIS ENTRY POINT
# =========================================================

def analyze_ct_images(
    images: List[Dict[str, Any]],
    body_part: Optional[str] = None,
) -> Dict[str, Any]:

    prepared = prepare_ct_input(
        images=images,
    )


    if not prepared.get(
        "success"
    ):

        return {
            "available":
                False,

            "model":
                CT_MODEL_NAME,

            "modelType":
                "anatomical CT segmentation",

            "device":
                CT_DEVICE,

            "findings":
                [],

            "measurements":
                [],

            "segmentation":
                None,

            "structures":
                [],

            "clinicalValidation":
                CT_CLINICAL_VALIDATION,

            "reviewRequired":
                CT_REVIEW_REQUIRED,

            "reason":
                prepared.get(
                    "reason",
                    "CT model input is not suitable.",
                ),
        }


    dicom_directory = (
        prepared.get(
            "inputDirectory"
        )
    )


    if not dicom_directory:

        return {
            "available":
                False,

            "model":
                CT_MODEL_NAME,

            "modelType":
                "anatomical CT segmentation",

            "device":
                CT_DEVICE,

            "findings":
                [],

            "measurements":
                [],

            "segmentation":
                None,

            "structures":
                [],

            "clinicalValidation":
                CT_CLINICAL_VALIDATION,

            "reviewRequired":
                CT_REVIEW_REQUIRED,

            "reason":
                (
                    "Prepared CT DICOM directory "
                    "was not returned."
                ),
        }


    temp_root = prepared.get(
        "temporaryRoot"
    )


    output_directory = Path(
        tempfile.mkdtemp(
            prefix="radiology_ct_seg_"
        )
    )


    try:

        hu_result = analyze_hu_composition(
            Path(
                dicom_directory
            )
        )

        findings = list(
            hu_result["findings"]
        )

        if hu_result["sliceCount"] >= MIN_SEGMENTATION_SLICES:

            segmentation = run_totalsegmentator(
                dicom_directory=Path(
                    dicom_directory
                ),

                output_directory=
                    output_directory,

                body_part=
                    body_part,
            )

            if segmentation.get("success"):
                findings.extend(
                    segmentation_findings(
                        segmentation.get(
                            "structures",
                            [],
                        )
                    )
                )

            segmentation.pop(
                "segmentationFile",
                None,
            )

        else:

            segmentation = {
                "success": False,
                "skipped": True,
                "reason": (
                    f"Series has {hu_result['sliceCount']} slice(s); "
                    "TotalSegmentator needs at least "
                    f"{MIN_SEGMENTATION_SLICES} for reliable "
                    "anatomical segmentation."
                ),
            }

        return {
            "available":
                True,

            "model":
                "CT HU quantification"
                + (
                    " + TotalSegmentator"
                    if segmentation.get("success")
                    else ""
                ),

            "modelType":
                "quantitative CT analysis",

            "device":
                CT_DEVICE,

            "findings":
                findings,

            "measurements":
                hu_result["measurements"],

            "segmentation":
                segmentation,

            "clinicalValidation":
                CT_CLINICAL_VALIDATION,

            "reviewRequired":
                CT_REVIEW_REQUIRED,
        }

    except Exception as error:

        return {
            "available":
                False,

            "model":
                CT_MODEL_NAME,

            "findings":
                [],

            "measurements":
                [],

            "segmentation":
                None,

            "clinicalValidation":
                CT_CLINICAL_VALIDATION,

            "reviewRequired":
                CT_REVIEW_REQUIRED,

            "reason":
                f"CT analysis failed: {error}",
        }


    finally:

        shutil.rmtree(
            str(
                output_directory
            ),
            ignore_errors=True,
        )

        if temp_root:

            shutil.rmtree(
                str(
                    temp_root
                ),
                ignore_errors=True,
            )
            # =========================================================
# MODEL STATUS
# =========================================================

def get_ct_model_status() -> Dict[str, Any]:

    try:

        from totalsegmentator.python_api import (
            totalsegmentator,
        )

        imported = (
            totalsegmentator
            is not None
        )

    except Exception as error:

        return {
            "success":
                True,

            "name":
                CT_MODEL_NAME,

            "version":
                CT_MODEL_VERSION,

            "installed":
                False,

            "importable":
                False,

            "device":
                CT_DEVICE,

            "clinicalValidation":
                CT_CLINICAL_VALIDATION,

            "reviewRequired":
                CT_REVIEW_REQUIRED,

            "error":
                str(error),
        }


    return {
        "success":
            True,

        "name":
            CT_MODEL_NAME,

        "version":
            CT_MODEL_VERSION,

        "installed":
            True,

        "importable":
            imported,

        "device":
            CT_DEVICE,

        "task":
            "anatomical CT segmentation",

        "clinicalValidation":
            CT_CLINICAL_VALIDATION,

        "reviewRequired":
            CT_REVIEW_REQUIRED,

        "cpuMode":
            CT_DEVICE == "cpu",

        "note":
            (
                "TotalSegmentator is an anatomical "
                "segmentation system. It should be used "
                "with genuine CT image data. Derived "
                "JPG/PNG-to-DICOM images are not treated "
                "as equivalent to the original CT acquisition."
            ),
    }


# =========================================================
# SIMPLE PRELOAD / IMPORT TEST
# =========================================================

def preload_ct_model() -> Dict[str, Any]:

    status = (
        get_ct_model_status()
    )

    if not status.get(
        "importable",
        False,
    ):

        return {
            **status,

            "loaded":
                False,
        }


    try:

        # TotalSegmentator loads task-specific weights
        # when inference is actually requested.
        return {
            **status,

            "loaded":
                True,
        }

    except Exception as error:

        return {
            **status,

            "loaded":
                False,

            "error":
                str(error),
        }


# =========================================================
# DIRECT SCRIPT TEST
# =========================================================

if __name__ == "__main__":

    import json

    print(
        json.dumps(
            get_ct_model_status(),
            indent=2,
        )
    )