"""
FastAPI REST API routes exposing all 7 AI/ML services for the AICTE Validation Desk.
"""
import json
from typing import Optional, List
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Query
from PIL import Image

from app.api.schemas import (
    OCRExtractionResponse,
    PerceptualHashResponse,
    TamperAnalysisResponse,
    FuzzyMatchRequest,
    FuzzyMatchResponse,
    AnomalyCheckRequest,
    AnomalyCheckResponse,
    FullValidationResponse
)
from app.services.ocr_engine import ocr_engine
from app.services.opencv_processor import OpenCVProcessor
from app.services.perceptual_hasher import PerceptualHasher
from app.services.fuzzy_matcher import FuzzyMatcher
from app.services.anomaly_detector import anomaly_detector
from app.services.llm_extractor import LLMStructuredExtractor
from app.services.orchestrator import AICTEOrchestrator

router = APIRouter()


@router.post("/ocr/extract", response_model=OCRExtractionResponse, summary="Extract document fields & evidence boxes via PaddleOCR")
async def extract_ocr_fields(
    file: UploadFile = File(..., description="Uploaded document (PDF, PNG, JPG)"),
    docKey: str = Form("generic", description="Document type key (e.g. fire_noc, land_deed)")
):
    """
    Direct pluggable endpoint for AICTE Desk `extractFields()` replacement.
    Runs OpenCV preprocessing -> PaddleOCR -> LLM structured extraction -> normalized evidence boxes.
    """
    try:
        content = await file.read()
        images, pdf_text = ocr_engine.load_image_or_pdf(content, file.filename or "")
        first_page = images[0] if images else Image.new("RGB", (1240, 1754), color=(255, 255, 255))

        preprocessed_img, _ = OpenCVProcessor.preprocess_document(first_page)
        raw_text, ocr_boxes, _ = ocr_engine.extract_text_and_boxes(preprocessed_img, pdf_fallback_text=pdf_text)
        fields, boxes, conf = LLMStructuredExtractor.extract(raw_text, ocr_boxes, doc_key=docKey)

        return OCRExtractionResponse(
            success=True,
            confidence=conf,
            boxes=boxes,
            fields=fields,
            rawText=raw_text,
            pageCount=len(images),
            engine="PaddleOCR" if ocr_engine.paddle_ocr else "AICTE OCR Pipeline"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR Extraction error: {str(e)}")


@router.post("/forensics/perceptual-hash", response_model=PerceptualHashResponse, summary="Calculate visual perceptual hashes & detect duplicates")
async def calculate_perceptual_hash(
    file: UploadFile = File(...),
    registryJson: Optional[str] = Form(None, description="Optional JSON list of known [{refNo, pHash}]")
):
    """
    Generates multi-algorithm perceptual hashes (pHash, dHash, aHash, wHash) and checks
    against prior applications to flag cross-institute document reuse or visual tampering.
    """
    try:
        content = await file.read()
        images, _ = ocr_engine.load_image_or_pdf(content, file.filename or "")
        img = images[0] if images else Image.new("RGB", (1240, 1754))

        hashes = PerceptualHasher.compute_hashes(img)
        registry = []
        if registryJson:
            try:
                registry = json.loads(registryJson)
            except Exception:
                registry = []

        check = PerceptualHasher.check_duplicate_in_registry(hashes, registry)
        return PerceptualHashResponse(
            pHash=hashes["pHash"],
            dHash=hashes["dHash"],
            aHash=hashes["aHash"],
            wHash=hashes.get("wHash"),
            isDuplicate=check["isDuplicate"],
            hammingDistance=check["hammingDistance"],
            matchedRefNo=check["matchedRefNo"],
            verdict=check["verdict"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Perceptual hash error: {str(e)}")


@router.post("/forensics/tamper-analysis", response_model=TamperAnalysisResponse, summary="OpenCV Error Level Analysis & Stamp/Signature Detection")
async def analyze_tampering(file: UploadFile = File(...)):
    """
    Analyzes image tampering using OpenCV: Error Level Analysis (ELA) for image splicing,
    official circular stamp detection, and signature presence heuristic.
    """
    try:
        content = await file.read()
        images, _ = ocr_engine.load_image_or_pdf(content, file.filename or "")
        img = images[0] if images else Image.new("RGB", (1240, 1754))

        ela_res = OpenCVProcessor.perform_error_level_analysis(img)
        stamp_sig_res = OpenCVProcessor.detect_stamp_and_signature(img)

        flags = list(ela_res.get("flags", []))
        if not stamp_sig_res["stampDetected"]:
            flags.append("No official stamp or circular seal detected in document")
        if not stamp_sig_res["signatureDetected"]:
            flags.append("Signature not definitively detected in execution zone")

        return TamperAnalysisResponse(
            isTampered=ela_res["isTampered"],
            tamperConfidence=0.88 if ela_res["isTampered"] else 0.12,
            elaScore=ela_res["elaScore"],
            stampDetected=stamp_sig_res["stampDetected"],
            signatureDetected=stamp_sig_res["signatureDetected"],
            flags=flags,
            tamperRegions=stamp_sig_res.get("stampRegions", [])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tamper analysis error: {str(e)}")


@router.post("/matching/rapidfuzz", response_model=FuzzyMatchResponse, summary="RapidFuzz fuzzy string matching for applicant identity")
async def match_names_rapidfuzz(req: FuzzyMatchRequest):
    """
    Compares the applicant institution name with the document certificate holder name
    using C++-accelerated RapidFuzz token ratios.
    """
    try:
        res = FuzzyMatcher.compare_holder_name(
            req.applicantName,
            req.documentHolderName,
            threshold=req.threshold
        )
        return FuzzyMatchResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RapidFuzz matching error: {str(e)}")


@router.post("/ml/anomaly-detector", response_model=AnomalyCheckResponse, summary="scikit-learn Document Classifier & Isolation Forest anomaly check")
async def check_ml_anomaly(req: AnomalyCheckRequest):
    """
    Evaluates extracted certificate text against trained TF-IDF + Classifier and
    detects multi-variate outliers using scikit-learn Isolation Forest.
    """
    try:
        res = anomaly_detector.detect_anomalies(
            document_type=req.documentType,
            extracted_text=req.extractedText,
            holder_similarity=req.holderNameSimilarity,
            issue_date_days_ago=req.issueDateDaysAgo or 0,
            confidence_score=req.confidenceScore,
            metadata_flags_count=req.metadataFlagsCount
        )
        return AnomalyCheckResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anomaly detector error: {str(e)}")


@router.post("/validate-document", response_model=FullValidationResponse, summary="Full End-to-End AI/ML Validation Pipeline")
async def validate_document_full(
    file: UploadFile = File(...),
    docKey: str = Form(..., description="Document type key (e.g. fire_noc, land_deed)"),
    applicantName: Optional[str] = Form(None, description="Registered institute name"),
    existingHashesJson: Optional[str] = Form(None, description="Optional existing hashes JSON"),
    metadataFlagsJson: Optional[str] = Form(None, description="Optional PDF metadata flags JSON")
):
    """
    Single unified API executing all 7 AI/ML engines:
    PaddleOCR + OpenCV + scikit-learn + RapidFuzz + Perceptual Hash + LLM Extraction.
    """
    try:
        content = await file.read()
        existing_hashes = []
        if existingHashesJson:
            try:
                existing_hashes = json.loads(existingHashesJson)
            except Exception:
                existing_hashes = []

        meta_flags = []
        if metadataFlagsJson:
            try:
                meta_flags = json.loads(metadataFlagsJson)
            except Exception:
                meta_flags = []

        result = AICTEOrchestrator.process_document(
            file_bytes=content,
            filename=file.filename or "upload.pdf",
            doc_key=docKey,
            applicant_name=applicantName,
            existing_hashes=existing_hashes,
            metadata_flags=meta_flags
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document validation error: {str(e)}")
