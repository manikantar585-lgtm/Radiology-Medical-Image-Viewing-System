import base64
import io
import shutil
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
from PIL import Image

from pydicom.dataset import FileDataset, FileMetaDataset
from pydicom.uid import (
    UID,
    ExplicitVRLittleEndian,
    SecondaryCaptureImageStorage,
    generate_uid,
)


SUPPORTED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/bmp",
    "image/tiff",
    "image/x-png",
    "application/octet-stream",
}
def _safe_text(value: Any, fallback: str) -> str:
    text = str(value or "").strip()
    if not text:
        return fallback
    return (
        text.replace("\\", "_")
        .replace("/", "_")
        .replace("\n", " ")
        .replace("\r", " ")
    )
def _decode_base64(data_base64: str) -> bytes:
    """
    Decode Base64 image data received from Node.js.
    """

    if not data_base64:
        raise ValueError("Image Base64 data is empty")

    value = str(data_base64).strip()

    if "," in value and value.lower().startswith("data:"):
        value = value.split(",", 1)[1]

    try:
        return base64.b64decode(
            value,
            validate=True,
        )
    except Exception as error:
        raise ValueError(
            f"Invalid Base64 image data: {error}"
        ) from error
def _image_to_grayscale(
    image_bytes: bytes,
):
    """
    Convert JPG/PNG/etc. into 8-bit grayscale.

    Important:
    This does NOT recover original CT Hounsfield Units.
    It is a derived image representation.
    """

    with Image.open(
        io.BytesIO(image_bytes)
    ) as image:

        image.load()

        grayscale = image.convert("L")

        array = np.asarray(
            grayscale,
            dtype=np.uint8,
        ).copy()

    return array


def create_derived_dicom(
    pixel_array: np.ndarray,
    output_path: Path,
    study_uid: str,
    series_uid: str,
    sop_uid: str,
    patient_id: str,
    patient_name: str,
    instance_number: int,
    series_description: str,
    source_file_name: str,
):
    """
    Create one derived Secondary Capture DICOM file.

    This is intentionally marked as derived Secondary Capture.
    It must not be represented as an original CT acquisition.
    """

    rows, columns = pixel_array.shape[:2]

    file_meta = FileMetaDataset()

    file_meta.FileMetaInformationVersion = b"\x00\x01"

    file_meta.MediaStorageSOPClassUID = (
        SecondaryCaptureImageStorage
    )

    file_meta.MediaStorageSOPInstanceUID = UID(
        sop_uid
    )

    file_meta.TransferSyntaxUID = (
        ExplicitVRLittleEndian
    )

    file_meta.ImplementationClassUID = generate_uid()

    ds = FileDataset(
        str(output_path),
        {},
        file_meta=file_meta,
        preamble=b"\x00" * 128,
    )

    ds.is_little_endian = True
    ds.is_implicit_VR = False

    # ---------------------------------------------------------
    # SOP / INSTANCE
    # ---------------------------------------------------------

    ds.SOPClassUID = (
        SecondaryCaptureImageStorage
    )

    ds.SOPInstanceUID = sop_uid

    ds.StudyInstanceUID = study_uid

    ds.SeriesInstanceUID = series_uid

    ds.InstanceNumber = instance_number

    ds.SeriesNumber = 1

    # ---------------------------------------------------------
    # MODALITY
    # ---------------------------------------------------------

    # SC = Secondary Capture.
    # Do NOT falsely label converted screenshots as CT.
    ds.Modality = "SC"

    # ---------------------------------------------------------
    # PATIENT
    # ---------------------------------------------------------

    ds.PatientID = _safe_text(
        patient_id,
        "DERIVED-PATIENT",
    )

    ds.PatientName = _safe_text(
        patient_name,
        "DerivedPatient",
    )

    # ---------------------------------------------------------
    # IMAGE DESCRIPTION
    # ---------------------------------------------------------

    ds.SeriesDescription = _safe_text(
        series_description,
        "Derived Image Series",
    )

    ds.ImageType = [
        "DERIVED",
        "SECONDARY",
    ]

    ds.DerivationDescription = (
        "DICOM object generated from "
        f"source image {source_file_name}"
    )

    ds.ConversionType = "WSD"

    ds.BurnedInAnnotation = "UNKNOWN"

    # ---------------------------------------------------------
    # IMAGE PIXEL DATA
    # ---------------------------------------------------------

    ds.Rows = int(rows)

    ds.Columns = int(columns)

    ds.SamplesPerPixel = 1

    ds.PhotometricInterpretation = (
        "MONOCHROME2"
    )

    ds.BitsAllocated = 8

    ds.BitsStored = 8

    ds.HighBit = 7

    ds.PixelRepresentation = 0

    ds.PixelAspectRatio = [
        1,
        1,
    ]

    # ---------------------------------------------------------
    # PIXEL DATA
    # ---------------------------------------------------------

    ds.PixelData = pixel_array.tobytes()

    # ---------------------------------------------------------
    # SAVE
    # ---------------------------------------------------------

    ds.save_as(
        str(output_path),
        write_like_original=False,
    )


def create_dicom_series_from_ai_images(
    images: List[Dict[str, Any]],
    patient_id: Optional[Any] = None,
    patient_name: Optional[str] = None,
    series_description: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Convert a list of AIImage dictionaries into a temporary
    derived DICOM series.

    Each input image becomes one DICOM Secondary Capture
    instance.

    Returns metadata about the generated temporary series.
    """

    if not images:
        raise ValueError(
            "No images supplied for DICOM conversion"
        )

    # ---------------------------------------------------------
    # SORT IMAGES
    # ---------------------------------------------------------

    def sort_key(item):
        order = item.get("imageOrder")

        try:
            return (
                0,
                int(order),
                int(item.get("id", 0)),
            )
        except (
            TypeError,
            ValueError,
        ):
            return (
                1,
                0,
                int(item.get("id", 0)),
            )

    ordered_images = sorted(
        images,
        key=sort_key,
    )

    # ---------------------------------------------------------
    # TEMPORARY DIRECTORY
    # ---------------------------------------------------------

    output_directory = tempfile.mkdtemp(
        prefix="radiology_derived_dicom_"
    )

    output_path = Path(
        output_directory
    )

    # ---------------------------------------------------------
    # COMMON DICOM UIDs
    # ---------------------------------------------------------

    study_uid = generate_uid()

    series_uid = generate_uid()

    safe_patient_id = _safe_text(
        patient_id,
        "DERIVED-PATIENT",
    )

    safe_patient_name = _safe_text(
        patient_name,
        "DerivedPatient",
    )

    safe_series_description = _safe_text(
        series_description,
        "Derived Image Series",
    )

    converted_files = []

    failed_files = []

    # ---------------------------------------------------------
    # CONVERT EACH IMAGE
    # ---------------------------------------------------------

    for index, image in enumerate(
        ordered_images,
        start=1,
    ):
        file_name = _safe_text(
            image.get("fileName"),
            f"image-{index}",
        )

        try:
            raw_bytes = _decode_base64(
                image.get("dataBase64", "")
            )

            pixel_array = _image_to_grayscale(
                raw_bytes
            )

            sop_uid = generate_uid()

            output_file = (
                output_path
                / f"IM_{index:04d}.dcm"
            )

            create_derived_dicom(
                pixel_array=pixel_array,
                output_path=output_file,
                study_uid=study_uid,
                series_uid=series_uid,
                sop_uid=sop_uid,
                patient_id=safe_patient_id,
                patient_name=safe_patient_name,
                instance_number=index,
                series_description=(
                    safe_series_description
                ),
                source_file_name=file_name,
            )

            converted_files.append(
                {
                    "sourceImageId": image.get("id"),
                    "sourceFileName": file_name,
                    "dicomFile": str(output_file),
                    "instanceNumber": index,
                    "rows": int(
                        pixel_array.shape[0]
                    ),
                    "columns": int(
                        pixel_array.shape[1]
                    ),
                }
            )

        except Exception as error:
            failed_files.append(
                {
                    "sourceImageId": image.get("id"),
                    "sourceFileName": file_name,
                    "error": str(error),
                }
            )

    # ---------------------------------------------------------
    # RESULT
    # ---------------------------------------------------------

    return {
        "success": len(failed_files) == 0,
        "outputDirectory": output_directory,
        "studyInstanceUID": study_uid,
        "seriesInstanceUID": series_uid,
        "modality": "SC",
        "sourceType": "JPG/PNG",
        "derived": True,
        "convertedCount": len(
            converted_files
        ),
        "failedCount": len(
            failed_files
        ),
        "files": converted_files,
        "failures": failed_files,
    }


def cleanup_dicom_series(
    output_directory: Optional[str],
):
    """
    Delete temporary DICOM directory.
    """

    if not output_directory:
        return

    directory = Path(
        output_directory
    )

    if not directory.exists():
        return

    try:
        shutil.rmtree(
            directory,
            ignore_errors=True,
        )
    except Exception:
        pass 