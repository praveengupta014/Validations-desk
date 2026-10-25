"""
AICTE Validation Desk — Pluggable AI / ML Microservice
SIH 2026 PS 26261 Architecture Implementation

Implements:
- Python FastAPI
- PaddleOCR
- OpenCV Forensics & Preprocessing
- scikit-learn Anomaly Detection & Classification
- RapidFuzz High-Performance Matching
- Perceptual Hashing (pHash/dHash/aHash/wHash)
- LLM Structured Extraction
"""
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from config import settings
from app.api.endpoints import router as api_router
from app.services.ocr_engine import _PADDLE_AVAILABLE

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Pluggable AI/ML Microservice for AICTE Document Intelligence & Forensic Validation",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware for Node.js server and React client
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(api_router, prefix=settings.API_PREFIX)


@app.get("/health", tags=["System"])
async def health_check():
    """Service liveness and health indicator."""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION
    }


@app.get("/api/v1/info", tags=["System"])
async def system_info():
    """Information about active AI/ML engines matching the system stack."""
    return {
        "stack": {
            "runtime": f"Python {sys.version.split()[0]}",
            "ocr": "PaddleOCR" if _PADDLE_AVAILABLE else "AICTE OCR Pipeline (Native Fallback)",
            "computerVision": "OpenCV (cv2)",
            "machineLearning": "scikit-learn (TF-IDF + LogisticRegression + IsolationForest)",
            "fuzzyMatching": "RapidFuzz (C++ Levenshtein & Token Ratios)",
            "visualFingerprinting": "Perceptual Hash (ImageHash pHash, dHash, aHash, wHash)",
            "structuredExtraction": "LLM Extraction (Pydantic Schema + Gemini/OpenAI/Ollama/NLP)"
        },
        "endpoints": [
            f"{settings.API_PREFIX}/ocr/extract",
            f"{settings.API_PREFIX}/forensics/perceptual-hash",
            f"{settings.API_PREFIX}/forensics/tamper-analysis",
            f"{settings.API_PREFIX}/matching/rapidfuzz",
            f"{settings.API_PREFIX}/ml/anomaly-detector",
            f"{settings.API_PREFIX}/validate-document"
        ]
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
