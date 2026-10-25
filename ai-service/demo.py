#!/usr/bin/env python3
"""
AICTE Validation Desk — AI/ML Layer Live Demonstration Script.
Executes an end-to-end audit of a certificate through all 7 components:
1. Python FastAPI Stack
2. OpenCV Computer Vision (Deskew, ELA, Stamp/Signature)
3. PaddleOCR Text Reading
4. LLM Structured Extraction (Pydantic + Bounding Boxes)
5. RapidFuzz Resilient String Matching
6. Perceptual Hashing (pHash, dHash, aHash, wHash)
7. Scikit-learn Document Classification & Isolation Forest Anomaly Scoring
"""
from io import BytesIO
from PIL import Image, ImageDraw

from app.services.opencv_processor import OpenCVProcessor
from app.services.perceptual_hasher import PerceptualHasher
from app.services.fuzzy_matcher import FuzzyMatcher
from app.services.anomaly_detector import anomaly_detector
from app.services.llm_extractor import LLMStructuredExtractor
from app.services.orchestrator import AICTEOrchestrator


def create_demo_certificate() -> bytes:
    """Generate a synthetic test certificate image with text, dates, stamp, and reference number."""
    img = Image.new("RGB", (800, 1000), color=(252, 252, 250))
    draw = ImageDraw.Draw(img)

    # Header & Issuer
    draw.rectangle([20, 20, 780, 50], fill=(30, 41, 59))
    draw.text((180, 26), "DIRECTORATE OF FIRE AND EMERGENCY SERVICES", fill=(255, 255, 255))

    # Certificate details
    draw.text((60, 100), "PROVISIONAL FIRE SAFETY NO OBJECTION CERTIFICATE", fill=(15, 23, 42))
    draw.text((60, 160), "Ref No: FS/2026/00142", fill=(15, 23, 42))
    draw.text((60, 210), "In favour of: Sunrise Institute of Technology", fill=(15, 23, 42))
    draw.text((60, 260), "Date of Issue: 2024-04-10", fill=(15, 23, 42))
    draw.text((60, 310), "Valid till: 2027-04-09", fill=(15, 23, 42))
    draw.text((60, 360), "Built-up Area: 12500 sqm", fill=(15, 23, 42))
    draw.text((60, 420), "Premises inspected and verified compliant with National Building Code fire safety norms.", fill=(51, 65, 85))

    # Official circular seal in blue ink
    draw.ellipse([500, 700, 640, 840], outline=(0, 40, 180), width=4)
    draw.text((530, 760), "OFFICIAL SEAL", fill=(0, 40, 180))

    # Officer signature stroke
    draw.line([(100, 820), (140, 790), (180, 825), (230, 785), (280, 810)], fill=(0, 0, 0), width=3)
    draw.text((100, 835), "Chief Fire Officer", fill=(71, 85, 105))

    buf = BytesIO()
    img.save(buf, format="JPEG", quality=95)
    return buf.getvalue()


def run_live_demo():
    print("=" * 70)
    print("AICTE VALIDATION DESK — PLUGGABLE AI / ML LAYER (PS 26261)")
    print("=" * 70)

    cert_bytes = create_demo_certificate()
    applicant_name = "Sunrise Institute of Technology, Greater Noida"
    doc_key = "fire_noc"

    print(f"\n[1/6] Processing Document: '{doc_key}' for Applicant: '{applicant_name}'...")

    # Run complete unified orchestrator
    result = AICTEOrchestrator.process_document(
        file_bytes=cert_bytes,
        filename="fire_noc.jpg",
        doc_key=doc_key,
        applicant_name=applicant_name,
        existing_hashes=[]
    )

    print("\n" + "-" * 70)
    print("2. PADDLEOCR & LLM STRUCTURED EXTRACTION:")
    print("-" * 70)
    print(f"  • Extraction Confidence : {int(result.extraction.confidence * 100)}%")
    print(f"  • Extracted Holder      : {result.extraction.fields.holderName}")
    print(f"  • Issuing Authority     : {result.extraction.fields.issuer}")
    print(f"  • Reference Number      : {result.extraction.fields.referenceNo}")
    print(f"  • Issue Date            : {result.extraction.fields.issueDate}")
    print(f"  • Expiry Date           : {result.extraction.fields.expiryDate}")
    print(f"  • Certified Area        : {result.extraction.fields.area} sqm")
    print("\n  Evidence Bounding Boxes (normalized % for Document Viewer):")
    for field, box in result.extraction.boxes.items():
        print(f"    - {field:<12}: left={box.x}%, top={box.y}%, w={box.w}%, h={box.h}%, conf={box.conf}")

    print("\n" + "-" * 70)
    print("3. OPENCV COMPUTER VISION FORENSICS:")
    print("-" * 70)
    print(f"  • Tamper Detected       : {result.tamperAnalysis.isTampered}")
    print(f"  • Error Level (ELA)     : {result.tamperAnalysis.elaScore}")
    print(f"  • Official Stamp Seal   : {'✓ DETECTED' if result.tamperAnalysis.stampDetected else '✗ NOT DETECTED'}")
    print(f"  • Signature Detected    : {'✓ DETECTED' if result.tamperAnalysis.signatureDetected else '✗ NOT DETECTED'}")
    if result.tamperAnalysis.flags:
        for flag in result.tamperAnalysis.flags:
            print(f"    Notice: {flag}")

    print("\n" + "-" * 70)
    print("4. RAPIDFUZZ STRING SIMILARITY MATCHING:")
    print("-" * 70)
    if result.fuzzyMatch:
        print(f"  • Composite Similarity  : {int(result.fuzzyMatch.similarity * 100)}%")
        print(f"  • Token-Set Ratio       : {int(result.fuzzyMatch.tokenSetRatio * 100)}%")
        print(f"  • Token-Sort Ratio      : {int(result.fuzzyMatch.tokenSortRatio * 100)}%")
        print(f"  • Match Verdict         : {result.fuzzyMatch.verdict}")

    print("\n" + "-" * 70)
    print("5. PERCEPTUAL HASH VISUAL FINGERPRINTING:")
    print("-" * 70)
    print(f"  • pHash (DCT)           : {result.perceptualHash.pHash}")
    print(f"  • dHash (Gradient)      : {result.perceptualHash.dHash}")
    print(f"  • aHash (Average)       : {result.perceptualHash.aHash}")
    print(f"  • Duplicate Detected    : {result.perceptualHash.isDuplicate}")
    print(f"  • Fingerprint Verdict   : {result.perceptualHash.verdict}")

    print("\n" + "-" * 70)
    print("6. SCIKIT-LEARN ANOMALY DETECTION & CLASSIFICATION:")
    print("-" * 70)
    print(f"  • Content Classification: {result.anomalyAssessment.predictedDocType} ({int(result.anomalyAssessment.docTypeConfidence * 100)}% conf)")
    print(f"  • Declared Type Match   : {result.anomalyAssessment.typeMatchesDeclared}")
    print(f"  • Risk Severity Level   : {result.anomalyAssessment.riskSeverity.upper()}")
    print(f"  • Model Anomaly Score   : {result.anomalyAssessment.anomalyScore} / 100")

    print("\n" + "=" * 70)
    print(f"SUMMARY DECISION: Overall Risk Score = {result.overallRiskScore} | Route = {result.recommendedRoute.upper()}")
    print(f"Verdict: {result.summary}")
    print("=" * 70)


if __name__ == "__main__":
    run_live_demo()
