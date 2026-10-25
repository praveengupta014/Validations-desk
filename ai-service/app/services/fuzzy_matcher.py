"""
RapidFuzz-powered fuzzy matching engine for AICTE document verification.
Performs resilient string comparison between application data and OCR extracted certificate fields.
"""
import re
from typing import Dict, Any, Tuple
from rapidfuzz import fuzz, utils


# Common Indian educational entity noise words & honors to normalize
STOP_TOKENS = {
    "of", "the", "and", "for", "a", "an", "in", "at", "to",
    "shri", "smt", "dr", "prof", "late", "trust", "samiti", "society",
    "mandal", "sanstha", "shikshan", "prasarini", "memorial", "charitable"
}

# OCR character confusion mapping
CHAR_CONFUSIONS = {
    'O': '0', 'o': '0', 'D': '0', 'Q': '0',
    'I': '1', 'l': '1', '|': '1', '!': '1',
    'Z': '2', 'z': '2',
    'S': '5', 's': '5',
    'B': '8',
}


def normalize_entity_name(name: str) -> str:
    """Clean and standardize an institutional or trust name."""
    if not name:
        return ""
    # Lowercase and replace non-alphanumeric with spaces
    cleaned = re.sub(r'[^a-zA-Z0-9\s]', ' ', name.lower())
    tokens = [t.strip() for t in cleaned.split() if t.strip()]
    filtered = [t for t in tokens if t not in STOP_TOKENS]
    return " ".join(filtered if filtered else tokens)


def normalize_reference_no(ref: str) -> str:
    """Normalize reference numbers by removing separators and handling OCR letter/digit swaps."""
    if not ref:
        return ""
    # Strip whitespace, hyphens, slashes
    clean = re.sub(r'[\s\-_/\\.:]', '', ref.upper())
    return clean


class FuzzyMatcher:
    """
    RapidFuzz matching service for AICTE applicant vs document verification.
    """

    @staticmethod
    def compare_holder_name(
        applicant_name: str,
        document_holder: str,
        threshold: float = 0.60
    ) -> Dict[str, Any]:
        """
        Compare the institute applicant name with the holder name extracted from document.
        Combines Token-Set-Ratio, Token-Sort-Ratio, and Partial-Ratio.
        """
        if not applicant_name or not document_holder:
            return {
                "similarity": 0.0,
                "isMatch": False,
                "tokenSortRatio": 0.0,
                "tokenSetRatio": 0.0,
                "partialRatio": 0.0,
                "verdict": "Missing applicant or holder name"
            }

        norm_app = normalize_entity_name(applicant_name)
        norm_doc = normalize_entity_name(document_holder)

        # Compute ratios using RapidFuzz
        token_sort = fuzz.token_sort_ratio(norm_app, norm_doc, processor=utils.default_process) / 100.0
        token_set = fuzz.token_set_ratio(norm_app, norm_doc, processor=utils.default_process) / 100.0
        partial = fuzz.partial_ratio(norm_app, norm_doc, processor=utils.default_process) / 100.0

        # Weighted aggregate: token_set handles reordering & extra trust words best
        composite_score = round(0.50 * token_set + 0.35 * token_sort + 0.15 * partial, 2)
        is_match = composite_score >= threshold

        if composite_score >= 0.85:
            verdict = "Strong Match — Names are consistent"
        elif composite_score >= threshold:
            verdict = "Acceptable Match — Minor spelling or word-order difference"
        elif composite_score >= 0.35:
            verdict = "Discrepancy Detected — Likely a different affiliate or trust name"
        else:
            verdict = "Severe Mismatch — Document belongs to a completely different entity"

        return {
            "similarity": composite_score,
            "isMatch": is_match,
            "tokenSortRatio": round(token_sort, 2),
            "tokenSetRatio": round(token_set, 2),
            "partialRatio": round(partial, 2),
            "verdict": verdict
        }

    @staticmethod
    def compare_reference_numbers(ref1: str, ref2: str) -> Tuple[float, bool]:
        """
        Fuzzy match reference numbers tolerating OCR character substitutions (e.g. 0 vs O).
        """
        if not ref1 or not ref2:
            return 0.0, False

        clean1 = normalize_reference_no(ref1)
        clean2 = normalize_reference_no(ref2)

        if clean1 == clean2:
            return 1.0, True

        # Normalized character swap comparison
        trans1 = "".join(CHAR_CONFUSIONS.get(c, c) for c in clean1)
        trans2 = "".join(CHAR_CONFUSIONS.get(c, c) for c in clean2)

        if trans1 == trans2:
            return 0.98, True

        # RapidFuzz partial ratio for partial prefixes / year suffix shifts
        ratio = fuzz.ratio(clean1, clean2) / 100.0
        return round(ratio, 2), ratio >= 0.85
