# AICTE Document Intelligence — Pluggable AI / ML Microservice

> **Smart India Hackathon 2026 · Problem Statement PS 26261**  
> AICTE Validation Desk — "Verify early, decide with confidence"

This microservice implements the complete **AI / ML Layer (Pluggable)** architecture specified in the AICTE Validation Desk stack:

![AI/ML Layer](https://img.shields.io/badge/AI%2FML%20Layer-Pluggable-blueviolet?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.9%2B-blue?style=for-the-badge&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688?style=for-the-badge&logo=fastapi)
![OpenCV](https://img.shields.io/badge/OpenCV-5.0-5C3EE8?style=for-the-badge&logo=opencv)
![scikit--learn](https://img.shields.io/badge/scikit--learn-1.4%2B-F7931E?style=for-the-badge&logo=scikitlearn)
![RapidFuzz](https://img.shields.io/badge/RapidFuzz-Matching-4B8BBE?style=for-the-badge)
![Perceptual Hash](https://img.shields.io/badge/Perceptual%20Hash-pHash-FF6F00?style=for-the-badge)

---

## 🛠️ Stack Components (Mapped to Architecture)

| Component | Technology | Role in AICTE Validation Desk |
|---|---|---|
| **Runtime & API** | `Python`, `FastAPI`, `Uvicorn` | Asynchronous REST microservice with interactive OpenAPI docs (`/docs`). |
| **OCR & Text Extraction** | `PaddleOCR` | Reads certificate text, extracts multi-polygon tokens, and converts them to normalized percentage bounding boxes (`{x, y, w, h, conf}`) for the React Document Viewer. |
| **Computer Vision Forensics** | `OpenCV` | Automatic deskewing, Error Level Analysis (ELA) for image splice/tamper detection, circular stamp/seal isolation, and signature presence heuristic. |
| **Fuzzy Matching** | `RapidFuzz` | C++ accelerated Levenshtein string matching. Compares applicant name vs certificate holder name (Token-Set, Token-Sort, Partial ratios) and handles OCR character confusions in reference numbers. |
| **Visual Fingerprinting** | `Perceptual Hash` (`imagehash`) | Computes `pHash` (DCT), `dHash` (Gradient), `aHash` (Average), and `wHash` (Wavelet) to detect duplicate or altered certificates reused across different institutions. |
| **Statistical Anomaly & ML** | `scikit-learn` | Supervised TF-IDF document type classification (`fire_noc`, `land_deed`, `building_plan`, etc.) + Unsupervised `IsolationForest` outlier risk scoring. |
| **Structured Field Extraction**| `LLM` (`Pydantic` + Gemini / OpenAI / Ollama / NLP) | Standardizes dates to ISO (`YYYY-MM-DD`), calculates built-up and land area in square meters, and extracts holder and issuer names. |

---

## 🚀 Quick Start

### 1. Run with Python Virtual Environment

```bash
cd ai-service

# Create and activate virtual environment (if not already done)
python3 -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server on port 8000
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API documentation will be available at:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

### 2. Run with Docker & Docker Compose

```bash
cd ai-service
docker compose up --build
```

---

## 🧪 Testing & Live Demonstration

### Run Unit Tests
A full test suite covering all 7 modules:
```bash
cd ai-service
PYTHONPATH=. .venv/bin/pytest tests
```

### Run Live Interactive Demo Script
Executes an end-to-end check of a simulated certificate through all 7 AI/ML engines:
```bash
cd ai-service
PYTHONPATH=. .venv/bin/python demo.py
```

---

## 📡 API Endpoints

### 1. `POST /api/v1/ocr/extract`
Drop-in replacement for the node server's `extractFields()`.
- **Input**: Multipart file (`file`) + Document Key (`docKey`)
- **Output**:
```json
{
  "success": true,
  "confidence": 0.92,
  "boxes": {
    "holderName": { "x": 12.0, "y": 22.0, "w": 60.0, "h": 6.0, "conf": 0.92 },
    "issuer": { "x": 12.0, "y": 10.0, "w": 45.0, "h": 3.5, "conf": 0.94 },
    "referenceNo": { "x": 12.0, "y": 34.0, "w": 38.0, "h": 5.0, "conf": 0.92 },
    "issueDate": { "x": 12.0, "y": 44.0, "w": 30.0, "h": 5.0, "conf": 0.92 },
    "expiryDate": { "x": 52.0, "y": 44.0, "w": 30.0, "h": 5.0, "conf": 0.92 },
    "area": { "x": 12.0, "y": 56.0, "w": 30.0, "h": 5.0, "conf": 0.90 }
  },
  "fields": {
    "holderName": "Sunrise Institute of Technology",
    "issuer": "Directorate of Fire and Emergency Services",
    "referenceNo": "FS/2026/00142",
    "issueDate": "2024-04-10",
    "expiryDate": "2027-04-09",
    "area": 12500
  },
  "rawText": "...",
  "pageCount": 1,
  "engine": "PaddleOCR"
}
```

### 2. `POST /api/v1/forensics/perceptual-hash`
Detects cross-institute duplicate document sharing.
- **Output**:
```json
{
  "pHash": "af162e6a726e620e",
  "dHash": "6560684c8833730a",
  "aHash": "00ffbffffffbbbff",
  "wHash": "...",
  "isDuplicate": false,
  "hammingDistance": null,
  "matchedRefNo": null,
  "verdict": "Unique visual fingerprint (no prior matches)"
}
```

### 3. `POST /api/v1/forensics/tamper-analysis`
Detects image splicing and confirms seal/signature presence.
- **Output**:
```json
{
  "isTampered": false,
  "tamperConfidence": 0.12,
  "elaScore": 1.1,
  "stampDetected": true,
  "signatureDetected": true,
  "flags": []
}
```

### 4. `POST /api/v1/matching/rapidfuzz`
High-speed fuzzy matching between applicant name and certificate holder.
- **Input**:
```json
{
  "applicantName": "Sunrise Institute of Technology, Greater Noida",
  "documentHolderName": "Sunrise Institute of Technology",
  "threshold": 0.60
}
```
- **Output**:
```json
{
  "similarity": 0.92,
  "isMatch": true,
  "tokenSortRatio": 0.95,
  "tokenSetRatio": 1.0,
  "partialRatio": 0.88,
  "verdict": "Strong Match — Names are consistent"
}
```

### 5. `POST /api/v1/ml/anomaly-detector`
Scikit-learn classification & Isolation Forest anomaly risk assessment.
- **Input**:
```json
{
  "documentType": "fire_noc",
  "extractedText": "Provisional Fire Safety NOC issued compliance verified",
  "holderNameSimilarity": 0.95,
  "confidenceScore": 0.92,
  "metadataFlagsCount": 0
}
```
- **Output**:
```json
{
  "isAnomaly": false,
  "anomalyScore": 0,
  "predictedDocType": "fire_noc",
  "docTypeConfidence": 0.94,
  "typeMatchesDeclared": true,
  "riskSeverity": "low",
  "flags": []
}
```

### 6. `POST /api/v1/validate-document`
The master orchestrator API: runs all 6 engines in a single call and returns the consolidated risk score and officer routing recommendation.

---

## 🔌 Connecting to Node.js Backend (Pluggable Integration)

As documented in `server/src/services/analyzer.js`, swapping the prototype extraction with this real AI service requires only pointing `extractFields()` to `http://localhost:8000/api/v1/ocr/extract`:

```javascript
// Example connector (zero client/server schema change needed)
import axios from 'axios';

export async function extractFieldsFromAIService(filePath, docKey) {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));
  formData.append('docKey', docKey);

  const res = await axios.post('http://localhost:8000/api/v1/ocr/extract', formData, {
    headers: formData.getHeaders()
  });

  return {
    confidence: res.data.confidence,
    boxes: res.data.boxes,
    fields: res.data.fields
  };
}
```
