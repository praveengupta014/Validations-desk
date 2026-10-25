"""
Tests for scikit-learn document classification and Isolation Forest anomaly detection.
"""
from app.services.anomaly_detector import anomaly_detector


def test_classify_fire_noc_document():
    text = "Directorate of Fire and Emergency Services Provisional No Objection Certificate NOC premises inspected fire safety compliance"
    pred_type, conf = anomaly_detector.classify_document(text)
    assert pred_type == "fire_noc"
    assert conf > 0.25


def test_classify_land_deed_document():
    text = "Registered Sale Deed sub registrar office revenue patta survey number total land schedule boundary"
    pred_type, conf = anomaly_detector.classify_document(text)
    assert pred_type == "land_deed"
    assert conf > 0.25


def test_anomaly_detection_normal_submission():
    text = "Fire safety certificate issued to Sunrise Institute of Technology reference number FS-2026-99"
    res = anomaly_detector.detect_anomalies(
        document_type="fire_noc",
        extracted_text=text,
        holder_similarity=0.95,
        confidence_score=0.92,
        metadata_flags_count=0
    )
    assert res["riskSeverity"] in ["low", "warning"]
    assert res["anomalyScore"] < 50


def test_anomaly_detection_mismatched_type():
    text = "Registered Sale Deed lease agreement land measurements in acres and survey khasra boundaries"
    # Uploaded as fire_noc but text is land_deed!
    res = anomaly_detector.detect_anomalies(
        document_type="fire_noc",
        extracted_text=text,
        holder_similarity=0.95,
        confidence_score=0.90,
        metadata_flags_count=0
    )
    assert res["typeMatchesDeclared"] is False
    assert res["anomalyScore"] >= 40
