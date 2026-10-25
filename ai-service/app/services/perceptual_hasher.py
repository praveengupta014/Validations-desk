"""
Perceptual Hashing & Visual Fingerprinting Service.
Uses pHash (DCT), dHash (difference), aHash (average), and wHash (wavelet)
to detect duplicate, modified, re-compressed, or fraudulent documents shared across institutes.
"""
from io import BytesIO
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
from PIL import Image
import imagehash


class PerceptualHasher:
    """
    Perceptual hash generator and similarity analyzer for documents and certificates.
    """

    @staticmethod
    def compute_hashes(image: Image.Image) -> Dict[str, str]:
        """
        Compute multi-algorithm perceptual hashes for an image.
        Returns hex strings for pHash, dHash, aHash, and wHash.
        """
        # Ensure RGB format
        if image.mode != "RGB":
            image = image.convert("RGB")

        p_hash = str(imagehash.phash(image))
        d_hash = str(imagehash.dhash(image))
        a_hash = str(imagehash.average_hash(image))

        try:
            w_hash = str(imagehash.whash(image))
        except Exception:
            w_hash = None

        return {
            "pHash": p_hash,
            "dHash": d_hash,
            "aHash": a_hash,
            "wHash": w_hash
        }

    @staticmethod
    def compute_hamming_distance(hash1_str: str, hash2_str: str) -> int:
        """Calculate bitwise Hamming distance between two hex hash strings."""
        h1 = imagehash.hex_to_hash(hash1_str)
        h2 = imagehash.hex_to_hash(hash2_str)
        return int(h1 - h2)

    @classmethod
    def check_duplicate_in_registry(
        cls,
        current_hashes: Dict[str, str],
        existing_registry: Optional[List[Dict[str, str]]] = None,
        hamming_threshold: int = 5
    ) -> Dict[str, Any]:
        """
        Check if the document's perceptual hash matches any document previously submitted
        by another institution.
        """
        if not existing_registry:
            return {
                "isDuplicate": False,
                "hammingDistance": None,
                "matchedRefNo": None,
                "verdict": "Unique visual fingerprint (no prior matches)"
            }

        curr_phash = current_hashes.get("pHash")
        if not curr_phash:
            return {
                "isDuplicate": False,
                "hammingDistance": None,
                "matchedRefNo": None,
                "verdict": "Unable to calculate perceptual hash"
            }

        min_distance = 999
        best_match = None

        for record in existing_registry:
            target_phash = record.get("pHash")
            if not target_phash:
                continue

            try:
                dist = cls.compute_hamming_distance(curr_phash, target_phash)
                if dist < min_distance:
                    min_distance = dist
                    best_match = record
            except Exception:
                continue

        if min_distance == 0:
            return {
                "isDuplicate": True,
                "hammingDistance": 0,
                "matchedRefNo": best_match.get("refNo", "Unknown"),
                "verdict": f"CRITICAL ANOMALY: Identical visual document found in application {best_match.get('refNo', 'Unknown')}"
            }
        elif min_distance <= hamming_threshold:
            return {
                "isDuplicate": True,
                "hammingDistance": min_distance,
                "matchedRefNo": best_match.get("refNo", "Unknown"),
                "verdict": f"SUSPICIOUS DUPLICATE: Visually near-identical copy (Hamming distance {min_distance}) found in application {best_match.get('refNo', 'Unknown')}"
            }

        return {
            "isDuplicate": False,
            "hammingDistance": min_distance if min_distance < 999 else None,
            "matchedRefNo": None,
            "verdict": "Unique visual fingerprint"
        }
