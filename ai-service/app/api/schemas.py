"""
Pydantic API schemas for AICTE AI/ML Service.
Formatted to match and integrate with the AICTE Validation Desk data contracts.
"""
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class EvidenceBox(BaseModel):
    """Normalized evidence coordinates (in 0-100% of page canvas)"""
    x: float = Field(..., description="Left position in % (0 to 100)")
    y: float = Field(..., description="Top position in % (0 to 100)")
    w: float = Field(..., description="Width in % (0 to 100)")
    h: float = Field(..., description="Height in % (0 to 100)")
    conf: float = Field(..., description="Detection confidence (0.0 to 1.0)")


class DocumentFields(BaseModel):
    holderName: Optional[str] = Field(None, description="Legal holder/applicant name")
    issuer: Optional[str] = Field(None, description="Issuing authority name")
    referenceNo: Optional[str] = Field(None, description="Document/order/NOC reference ID")
    issueDate: Optional[str] = Field(None, description="ISO Issue date (YYYY-MM-DD)")
    expiryDate: Optional[str] = Field(None, description="ISO Expiry date (YYYY-MM-DD)")
    area: Optional[float] = Field(None, description="Area in square meters (sqm)")


class OCRExtractionResponse(BaseModel):
    success: bool = True
    confidence: float = Field(..., description="Overall OCR extraction confidence (0-1)")
    boxes: Dict[str, EvidenceBox] = Field(default_factory=dict, description="Evidence boxes per field")
    fields: DocumentFields = Field(default_factory=DocumentFields)
    rawText: str = Field("", description="Full OCR extracted text")
    pageCount: int = 1
    engine: str = "PaddleOCR"


class PerceptualHashRequest(BaseModel):
    existingHashes: Optional[List[Dict[str, str]]] = Field(
        default=None,
        description="List of dicts containing {refNo, pHash, sha256} from other institutes"
    )


class PerceptualHashResponse(BaseModel):
    pHash: str = Field(..., description="DCT-based perceptual hash")
    dHash: str = Field(..., description="Gradient/Difference hash")
    aHash: str = Field(..., description="Average hash")
    wHash: Optional[str] = Field(None, description="Wavelet hash")
    isDuplicate: bool = False
    hammingDistance: Optional[int] = None
    matchedRefNo: Optional[str] = None
    verdict: str = "Unique visual fingerprint"


class TamperAnalysisResponse(BaseModel):
    isTampered: bool = False
    tamperConfidence: float = 0.0
    elaScore: float = Field(..., description="Error Level Analysis artifact score")
    stampDetected: bool = False
    signatureDetected: bool = False
    flags: List[str] = Field(default_factory=list)
    tamperRegions: List[EvidenceBox] = Field(default_factory=list)


class FuzzyMatchRequest(BaseModel):
    applicantName: str = Field(..., description="Name declared by institute on portal")
    documentHolderName: str = Field(..., description="Name extracted from uploaded certificate")
    threshold: float = 0.60


class FuzzyMatchResponse(BaseModel):
    similarity: float = Field(..., description="Similarity ratio from 0.0 to 1.0")
    isMatch: bool
    tokenSortRatio: float
    tokenSetRatio: float
    partialRatio: float
    verdict: str


class AnomalyCheckRequest(BaseModel):
    documentType: str = Field(..., description="Declared document type key (e.g. fire_noc, land_deed)")
    extractedText: str = Field(..., description="Full text extracted from OCR")
    holderNameSimilarity: float = 1.0
    issueDateDaysAgo: Optional[int] = 0
    confidenceScore: float = 0.95
    metadataFlagsCount: int = 0


class AnomalyCheckResponse(BaseModel):
    isAnomaly: bool
    anomalyScore: float = Field(..., description="Normalized anomaly risk score (0-100)")
    predictedDocType: str
    docTypeConfidence: float
    typeMatchesDeclared: bool
    riskSeverity: str = Field(..., description="'low' | 'warning' | 'critical'")
    flags: List[str] = Field(default_factory=list)


class FullValidationResponse(BaseModel):
    """Unified validation response integrating all 7 AI/ML modules"""
    docKey: str
    extraction: OCRExtractionResponse
    perceptualHash: PerceptualHashResponse
    tamperAnalysis: TamperAnalysisResponse
    fuzzyMatch: Optional[FuzzyMatchResponse] = None
    anomalyAssessment: AnomalyCheckResponse
    overallRiskScore: int = Field(..., description="Overall risk (0 to 100)")
    recommendedRoute: str = Field(..., description="'clean' or 'judgment'")
    summary: str
