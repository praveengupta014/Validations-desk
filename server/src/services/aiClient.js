/**
 * Node.js Client for AICTE Python AI/ML Microservice.
 * Integrates:
 * - PaddleOCR (Field extraction & normalized bounding boxes)
 * - OpenCV Forensics (ELA tamper analysis, seal/stamp & signature detection)
 * - Perceptual Hashing (Cross-institute duplicate detection)
 * - RapidFuzz String Matching (Applicant vs Certificate holder)
 * - Scikit-learn (Document classification & Isolation Forest anomaly risk)
 */
import fs from 'fs';
import path from 'path';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://127.0.0.1:8000');

/** Check if the Python AI service is reachable and healthy */
export async function isAIServiceAvailable() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${AI_SERVICE_URL}/health`, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

/** Fetch system info and active AI modules */
export async function getAISystemInfo() {
  try {
    const res = await fetch(`${AI_SERVICE_URL}/api/v1/info`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Call PaddleOCR & LLM Structured Extraction endpoint.
 * Returns { confidence, boxes, fields, rawText, engine }
 */
export async function callAIServiceOCR(filePath, docKey, mimeType = 'application/pdf') {
  if (!filePath || !fs.existsSync(filePath)) return null;

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: mimeType });
    const formData = new FormData();
    formData.append('file', blob, path.basename(filePath));
    formData.append('docKey', docKey || 'generic');

    const res = await fetch(`${AI_SERVICE_URL}/api/v1/ocr/extract`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      console.warn(`[AIClient] OCR endpoint returned ${res.status}: ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    return {
      confidence: data.confidence,
      boxes: data.boxes,
      fields: data.fields,
      rawText: data.rawText,
      engine: data.engine || 'PaddleOCR',
    };
  } catch (err) {
    console.warn(`[AIClient] Error connecting to AI OCR service: ${err.message}`);
    return null;
  }
}

/**
 * Call Master Validation Pipeline.
 * Executes PaddleOCR + OpenCV + scikit-learn + RapidFuzz + Perceptual Hash.
 */
export async function callAIServiceValidation({
  filePath,
  docKey,
  applicantName,
  existingHashes = [],
  metadataFlags = [],
  mimeType = 'application/pdf'
}) {
  if (!filePath || !fs.existsSync(filePath)) return null;

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: mimeType });
    const formData = new FormData();
    formData.append('file', blob, path.basename(filePath));
    formData.append('docKey', docKey);
    if (applicantName) formData.append('applicantName', applicantName);
    if (existingHashes?.length) formData.append('existingHashesJson', JSON.stringify(existingHashes));
    if (metadataFlags?.length) formData.append('metadataFlagsJson', JSON.stringify(metadataFlags));

    const res = await fetch(`${AI_SERVICE_URL}/api/v1/validate-document`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      console.warn(`[AIClient] Full validation returned ${res.status}: ${res.statusText}`);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.warn(`[AIClient] Error calling AI validation service: ${err.message}`);
    return null;
  }
}
