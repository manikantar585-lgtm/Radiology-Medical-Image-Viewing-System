import math

import pytest

from ct_model import (
    ROI_PRESETS,
    is_extremity,
    measure,
    normalize_body_part,
    safe_float,
    select_roi_subset,
)


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("  Chest_CT  ", "chest ct"),
        ("ABDOMEN-pelvis", "abdomen pelvis"),
        (None, ""),
        ("left   knee", "left knee"),
    ],
)
def test_normalize_body_part(raw, expected):
    assert normalize_body_part(raw) == expected


@pytest.mark.parametrize(
    ("body_part", "preset"),
    [
        ("Renal stone protocol", "kidney"),
        ("Abdomen", "abdomen"),
        ("CT Thorax", "chest"),
        ("Brain", "head"),
        ("Pelvis", "default"),
        (None, "default"),
    ],
)
def test_select_roi_subset(body_part, preset):
    assert select_roi_subset(body_part) == ROI_PRESETS[preset]


@pytest.mark.parametrize(
    ("body_part", "expected"),
    [
        ("Right knee", True),
        ("foot-ankle", True),
        ("Chest", False),
        # Whole-word matching: "arm" must not match inside "pharmacy".
        ("pharmacy", False),
    ],
)
def test_is_extremity(body_part, expected):
    assert is_extremity(body_part) is expected


@pytest.mark.parametrize(
    ("value", "expected"),
    [("3.5", 3.5), (2, 2.0), ("abc", 0.0), (None, 0.0), (math.nan, 0.0), (math.inf, 0.0)],
)
def test_safe_float(value, expected):
    assert safe_float(value) == expected


def test_measure_rounds_to_two_decimals():
    assert measure("Mean HU", 41.2368, "HU") == {"label": "Mean HU", "value": 41.24, "unit": "HU"}
