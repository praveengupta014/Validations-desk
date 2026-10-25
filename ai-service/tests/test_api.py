"""
Tests for FastAPI endpoints.
"""
from io import BytesIO
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw
from main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_system_info():
    response = client.get("/api/v1/info")
    assert response.status_code == 200
    data = response.json()
    assert "stack" in data
    assert "PaddleOCR" in data["stack"]["ocr"] or "AICTE OCR Pipeline" in data["stack"]["ocr"]
    assert "OpenCV" in data["stack"]["computerVision"]
    assert "scikit-learn" in data["stack"]["machineLearning"]
    assert "RapidFuzz" in data["stack"]["fuzzyMatching"]
    assert "Perceptual Hash" in data["stack"]["visualFingerprinting"]


def test_rapidfuzz_endpoint():
    payload = {
        "applicantName": "Sunrise Institute of Technology",
        "documentHolderName": "Sunrise Institute of Technology, Greater Noida",
        "threshold": 0.60
    }
    response = client.post("/api/v1/matching/rapidfuzz", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["isMatch"] is True
    assert data["similarity"] >= 0.70


def test_anomaly_endpoint():
    payload = {
        "documentType": "fire_noc",
        "extractedText": "Provisional Fire Safety NOC issued to Sunrise Institute compliance verified",
        "holderNameSimilarity": 0.95,
        "confidenceScore": 0.92,
        "metadataFlagsCount": 0
    }
    response = client.post("/api/v1/ml/anomaly-detector", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "anomalyScore" in data
    assert "riskSeverity" in data


def test_ocr_extract_endpoint():
    # Create sample image in memory
    img = Image.new("RGB", (400, 300), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((20, 20), "FIRE SAFETY CLEARANCE NOC", fill=(0, 0, 0))
    draw.text((20, 60), "Ref No: FS/2026/0991", fill=(0, 0, 0))
    buf = BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    files = {"file": ("fire_noc.jpg", buf, "image/jpeg")}
    data = {"docKey": "fire_noc"}
    response = client.post("/api/v1/ocr/extract", files=files, data=data)
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert "boxes" in res
    assert "confidence" in res
