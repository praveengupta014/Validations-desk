"""
Tests for OpenCV preprocessing and tamper analysis.
"""
from PIL import Image, ImageDraw
from app.services.opencv_processor import OpenCVProcessor


def test_opencv_preprocessing():
    img = Image.new("RGB", (300, 400), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((20, 50), "AICTE VALIDATION DESK", fill=(0, 0, 0))

    processed, meta = OpenCVProcessor.preprocess_document(img)
    assert processed is not None
    assert meta["dimensions"]["width"] == 300
    assert meta["dimensions"]["height"] == 400


def test_stamp_detection():
    img = Image.new("RGB", (400, 500), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    # Draw a blue circular stamp
    draw.ellipse([150, 300, 250, 400], fill=(0, 50, 200), outline=(0, 0, 150), width=4)

    res = OpenCVProcessor.detect_stamp_and_signature(img)
    assert res["stampDetected"] is True
    assert len(res["stampRegions"]) >= 1


def test_error_level_analysis():
    img = Image.new("RGB", (200, 200), color=(250, 250, 250))
    draw = ImageDraw.Draw(img)
    draw.text((20, 20), "Authentic Text", fill=(10, 10, 10))

    ela = OpenCVProcessor.perform_error_level_analysis(img)
    assert "elaScore" in ela
    assert "isTampered" in ela
