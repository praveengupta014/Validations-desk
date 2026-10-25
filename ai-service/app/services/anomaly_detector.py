"""
Scikit-Learn Machine Learning Service for Document Anomaly & Fraud Risk Scoring.
1. TF-IDF + Classifier for Document Classification & Type Verification.
2. Isolation Forest for Multi-variate Anomaly Detection.
"""
import os
import pickle
from typing import Dict, List, Tuple, Any
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import IsolationForest
from sklearn.pipeline import Pipeline


# AICTE Document Categories & Keywords for Supervised Classification
TRAINING_CORPUS = {
    "fire_noc": [
        "fire safety certificate no objection certificate fire and rescue services fire prevention compliance hydrant extinguishers n.o.c fire department inspected premises safe evacuation",
        "fire officer provisional fire noc valid till fire fighting arrangements installed inspected water sprinkler fire safety rules compliance clearance certificate",
        "directorate of fire services no objection certificate issued under state fire safety act compliance fire fighting measures satisfactory emergency exit",
        "fire clearance noc for educational institution building fire norms satisfaction drill conducted hose reel installed"
    ],
    "land_deed": [
        "sale deed conveyance deed lease agreement registered sub registrar ownership title land schedule survey number khasra bounded north south east west revenue records patta",
        "perpetual lease deed registered trust land measurement in acres hectares ownership clear marketable title possession handed over registered deed no",
        "gift deed land allotment government collector revenue department institutional purpose educational campus boundary demarcation certified copy",
        "title certificate land registry property measurement total land area sub registrar office registration stamp duty paid"
    ],
    "building_plan": [
        "approved building plan municipal corporation town planning authority sanction order built up area floor plan ground floor first floor architectural drawing carpet area total square meters",
        "sanctioned building layout plan approval order development authority permissible ground coverage fsi far educational institution approval letter",
        "structural stability certificate municipal approved plan civil engineer floor space index total plinth area constructed area square meters blueprint",
        "architectural plan drawing approved by commissioner competent authority institutional building blocks lab classrooms auditorium area calculation"
    ],
    "aicte_approval": [
        "all india council for technical education extension of approval eoa new delhi approved intake courses b.tech m.tech mba polytechnic academic session approval letter",
        "aicte regional office approval order sanction of intake engineering and technology management pharmacy academic council compliance report",
        "grant of approval letter all india council for technical education institute permanent id application id affiliation condition",
        "extension of approval for academic year approved intake variations university affiliation aicte approval bureau"
    ],
    "occupancy_cert": [
        "occupancy certificate completion certificate building completion municipal authority certified building fit for occupation civil construction completed as per approved plan",
        "partial completion certificate competent town planner occupancy permitted educational block water drainage sewage electricity connected",
        "building use certificate bu permission municipal corporation occupancy granted institutional purpose sanitation water supply compliant",
        "certificate of completion and occupancy issued by urban development authority building safe and complete"
    ],
    "society_reg": [
        "societies registration act certificate of registration registrar of societies memorandum of association governing body charitable educational society trust registration",
        "trust deed registered public trust charity commissioner bombay public trust act non profit educational trust aims objectives",
        "certificate of incorporation section 8 company non-profit company registrar of companies educational foundation",
        "society registration renewal certificate registrar of firms and societies aims education development"
    ]
}


class AnomalyDetector:
    """
    Scikit-learn model orchestrator for document classification and fraud anomaly detection.
    """

    def __init__(self):
        self.doc_classifier: Pipeline = self._build_document_classifier()
        self.isolation_forest: IsolationForest = self._build_isolation_forest()

    def _build_document_classifier(self) -> Pipeline:
        """Construct and fit TF-IDF + Logistic Regression pipeline."""
        texts = []
        labels = []
        for doc_type, samples in TRAINING_CORPUS.items():
            for sample in samples:
                texts.append(sample)
                labels.append(doc_type)

        pipeline = Pipeline([
            ('tfidf', TfidfVectorizer(ngram_range=(1, 2), min_df=1)),
            ('clf', LogisticRegression(C=1.0, max_iter=200, random_state=42))
        ])
        pipeline.fit(texts, labels)
        return pipeline

    def _build_isolation_forest(self) -> IsolationForest:
        """
        Fit an Isolation Forest on typical normal feature vectors:
        [holder_similarity, ocr_confidence, text_length_norm, issue_date_age_norm, metadata_flags_count]
        """
        # Generate representative distribution of normal submissions
        np.random.seed(42)
        n_samples = 300
        normal_similarity = np.random.uniform(0.70, 1.0, n_samples)
        normal_confidence = np.random.uniform(0.75, 0.99, n_samples)
        normal_text_len = np.random.uniform(0.3, 1.0, n_samples)
        normal_age = np.random.uniform(0.0, 0.6, n_samples)  # Normalized document age
        normal_flags = np.zeros(n_samples)

        X_normal = np.column_stack([
            normal_similarity,
            normal_confidence,
            normal_text_len,
            normal_age,
            normal_flags
        ])

        iso = IsolationForest(contamination=0.05, random_state=42)
        iso.fit(X_normal)
        return iso

    def classify_document(self, text: str) -> Tuple[str, float]:
        """
        Predict the AICTE document type from extracted text and return top prediction + confidence.
        """
        if not text or len(text.strip()) < 10:
            return "unknown", 0.0

        probs = self.doc_classifier.predict_proba([text])[0]
        classes = self.doc_classifier.classes_
        top_idx = int(np.argmax(probs))
        top_class = str(classes[top_idx])
        top_conf = round(float(probs[top_idx]), 2)
        return top_class, top_conf

    def detect_anomalies(
        self,
        document_type: str,
        extracted_text: str,
        holder_similarity: float = 1.0,
        issue_date_days_ago: int = 0,
        confidence_score: float = 0.95,
        metadata_flags_count: int = 0
    ) -> Dict[str, Any]:
        """
        Evaluate document submission against ML classifier and Isolation Forest.
        """
        flags: List[str] = []
        risk_score = 0

        # 1. Document Type Consistency Check
        predicted_type, type_conf = self.classify_document(extracted_text)
        type_matches = (predicted_type == document_type) or (predicted_type == "unknown")

        if not type_matches and type_conf > 0.25:
            flags.append(f"Content indicates '{predicted_type}' (confidence {int(type_conf*100)}%), but uploaded as '{document_type}'")
            risk_score += 40

        # 2. Isolation Forest Outlier Analysis
        norm_len = min(1.0, len(extracted_text) / 2000.0)
        norm_age = min(1.0, max(0.0, issue_date_days_ago / (365.0 * 5.0)))
        feature_vector = np.array([[
            holder_similarity,
            confidence_score,
            norm_len,
            norm_age,
            float(metadata_flags_count)
        ]])

        iso_score = float(self.isolation_forest.decision_function(feature_vector)[0])
        is_iso_outlier = bool(self.isolation_forest.predict(feature_vector)[0] == -1)

        if is_iso_outlier:
            flags.append("Isolation Forest flagged statistical feature deviation in submission parameters")
            risk_score += 25

        if holder_similarity < 0.60:
            flags.append(f"Applicant name similarity {int(holder_similarity*100)}% is below validation threshold")
            risk_score += 35

        if confidence_score < 0.70:
            flags.append(f"Low OCR text clarity ({int(confidence_score*100)}% average confidence)")
            risk_score += 15

        if metadata_flags_count > 0:
            risk_score += (metadata_flags_count * 15)

        total_risk = min(100, max(0, risk_score))
        if total_risk >= 60:
            severity = "critical"
        elif total_risk >= 25:
            severity = "warning"
        else:
            severity = "low"

        return {
            "isAnomaly": is_iso_outlier or (total_risk >= 30),
            "anomalyScore": total_risk,
            "predictedDocType": predicted_type,
            "docTypeConfidence": type_conf,
            "typeMatchesDeclared": type_matches,
            "riskSeverity": severity,
            "flags": flags
        }


# Global instance
anomaly_detector = AnomalyDetector()
