"""
Master AICTE AI/ML Orchestration Pipeline.
Seamlessly coordinates:
1. OpenCV preprocessing & forensic tamper detection
2. PaddleOCR text extraction with normalized evidence boxes
3. LLM structured field extraction (Pydantic models)
4. RapidFuzz resilient string similarity matching
5. Perceptual Hashing & Cross-institute duplicate detection
6. Scikit-learn document classification and statistical anomaly detection
"""
from typing import Dict, List, Optional, Any
from PIL import Image

from app.api.schemas import (
    FullValidationResponse,
    OCRExtractionResponse,
    PerceptualHashResponse,
    TamperAnalysisResponse,
    FuzzyMatchResponse,
    AnomalyCheckResponse,
    EvidenceBox
)
from app.services.ocr_engine import ocr_engine
from app.services.opencv_processor import OpenCVProcessor
from app.services.perceptual_hasher import PerceptualHasher
from app.services.fuzzy_matcher import FuzzyMatcher
from app.services.anomaly_detector import anomaly_detector
from app.services.llm_extractor import LLMStructuredExtractor


class AICTEOrchestrator:
    """
    Unified AI/ML Pipeline executor for AICTE document verification.
    """

    @classmethod
    def process_document(
        cls,
        file_bytes: bytes,
        filename: str,
        doc_key: str,
        applicant_name: Optional[str] = None,
        existing_hashes: Optional[List[Dict[str, str]]] = None,
        metadata_flags: Optional[List[str]] = None
    ) -> FullValidationResponse:
        """
        Execute full multi-stage AI/ML analysis on a submitted certificate.
        """
        # 1. Load document (PDF or Image)
        images, pdf_text = ocr_engine.load_image_or_pdf(file_bytes, filename)
        first_page = images[0] if images else Image.new("RGB", (1240, 1754), color=(255, 255, 255))

        # 2. OpenCV Computer Vision Preprocessing & Forensic Analysis
        preprocessed_img, cv_meta = OpenCVProcessor.preprocess_document(first_page)
        stamp_sig_info = OpenCVProcessor.detect_stamp_and_signature(first_page)
        ela_info = OpenCVProcessor.perform_error_level_analysis(first_page)

        # 3. Perceptual Hashing (Cross-institute duplicate / fraud detection)
        hashes = PerceptualHasher.compute_hashes(first_page)
        duplicate_check = PerceptualHasher.check_duplicate_in_registry(hashes, existing_hashes)

        perceptual_resp = PerceptualHashResponse(
            pHash=hashes["pHash"],
            dHash=hashes["dHash"],
            aHash=hashes["aHash"],
            wHash=hashes.get("wHash"),
            isDuplicate=duplicate_check["isDuplicate"],
            hammingDistance=duplicate_check["hammingDistance"],
            matchedRefNo=duplicate_check["matchedRefNo"],
            verdict=duplicate_check["verdict"]
        )

        # 4. PaddleOCR Text Extraction & Evidence Box Geometry
        raw_text, ocr_boxes, ocr_conf = ocr_engine.extract_text_and_boxes(
            preprocessed_img,
            pdf_fallback_text=pdf_text
        )

        # 5. LLM Structured Field Extraction
        fields, evidence_boxes, extraction_conf = LLMStructuredExtractor.extract(
            raw_text,
            ocr_boxes,
            doc_key=doc_key
        )

        ocr_response = OCRExtractionResponse(
            success=True,
            confidence=extraction_conf,
            boxes=evidence_boxes,
            fields=fields,
            rawText=raw_text,
            pageCount=len(images),
            engine="PaddleOCR" if ocr_engine.paddle_ocr else "AICTE OCR Pipeline"
        )

        # 6. RapidFuzz Fuzzy String Matching
        fuzzy_resp = None
        sim_score = 1.0
        if applicant_name and fields.holderName:
            match_res = FuzzyMatcher.compare_holder_name(applicant_name, fields.holderName)
            sim_score = match_res["similarity"]
            fuzzy_resp = FuzzyMatchResponse(**match_res)

        # 7. Scikit-learn Document Classification & Anomaly Assessment
        anomaly_res = anomaly_detector.detect_anomalies(
            document_type=doc_key,
            extracted_text=raw_text,
            holder_similarity=sim_score,
            confidence_score=extraction_conf,
            metadata_flags_count=len(metadata_flags or [])
        )
        anomaly_resp = AnomalyCheckResponse(**anomaly_res)

        # 8. Compile Forensic Tamper Response
        all_flags = list(ela_info.get("flags", []))
        if not stamp_sig_info["stampDetected"]:
            all_flags.append("Warning: No clear circular/colored issuing seal detected")
        if not stamp_sig_info["signatureDetected"]:
            all_flags.append("Advisory: Manual review recommended for officer signature stroke")

        tamper_resp = TamperAnalysisResponse(
            isTampered=ela_info["isTampered"],
            tamperConfidence=0.88 if ela_info["isTampered"] else 0.15,
            elaScore=ela_info["elaScore"],
            stampDetected=stamp_sig_info["stampDetected"],
            signatureDetected=stamp_sig_info["signatureDetected"],
            flags=all_flags,
            tamperRegions=[EvidenceBox(**b) for b in stamp_sig_info.get("stampRegions", [])]
        )

        # 9. Aggregate Overall Risk Score & Routing
        calculated_risk = 0
        if duplicate_check["isDuplicate"]:
            calculated_risk += 45
        if ela_info["isTampered"]:
            calculated_risk += 35
        if not anomaly_res["typeMatchesDeclared"]:
            calculated_risk += 30
        if sim_score < 0.60:
            calculated_risk += 25
        if extraction_conf < 0.75:
            calculated_risk += 15

        overall_risk = min(100, max(anomaly_resp.anomalyScore, calculated_risk))
        route = "judgment" if overall_risk >= 30 else "clean"

        summary_parts = []
        if duplicate_check["isDuplicate"]:
            summary_parts.append("Duplicate visual hash detected")
        if not anomaly_res["typeMatchesDeclared"]:
            summary_parts.append(f"Content classified as '{anomaly_res['predictedDocType']}'")
        if sim_score < 0.60:
            summary_parts.append(f"Name mismatch ({int(sim_score*100)}%)")
        if not summary_parts:
            summary_parts.append("All automated AI checks passed successfully")

        return FullValidationResponse(
            docKey=doc_key,
            extraction=ocr_response,
            perceptualHash=perceptual_resp,
            tamperAnalysis=tamper_resp,
            fuzzyMatch=fuzzy_resp,
            anomalyAssessment=anomaly_resp,
            overallRiskScore=overall_risk,
            recommendedRoute=route,
            summary="; ".join(summary_parts)
        )
