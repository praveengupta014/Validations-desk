"""
Configuration module for AICTE AI/ML Service.
Reads environment variables or defaults.
"""
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Server configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    APP_NAME: str = "AICTE Document Intelligence AI Service"
    APP_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"

    # CORS Settings
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:5000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5000",
        "*"
    ]

    # PaddleOCR Settings
    USE_PADDLE_OCR: bool = True
    OCR_LANG: str = "en"
    OCR_USE_ANGLE_CLS: bool = True

    # LLM Settings (optional API keys, fallback to rule-based NLP if None)
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    LLM_PROVIDER: str = "auto"  # 'gemini', 'openai', 'ollama', 'auto', 'rule_based'
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    LLM_MODEL_NAME: str = "gemini-1.5-flash"

    # Perceptual Hashing & Duplicate Detection Thresholds
    PHASH_HAMMING_THRESHOLD: int = 5  # <= 5 bits difference is considered near-duplicate

    # Anomaly Detection Thresholds (scikit-learn)
    ANOMALY_CONTAMINATION: float = 0.05
    RISK_THRESHOLD_HIGH: float = 0.70
    RISK_THRESHOLD_MEDIUM: float = 0.40

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
