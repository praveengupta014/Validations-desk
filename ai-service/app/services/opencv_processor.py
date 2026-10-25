"""
OpenCV Image Preprocessing and Forensic Tamper Detection Engine.
Performs deskewing, noise reduction, contrast enhancement, stamp/signature detection,
and Error Level Analysis (ELA) for digital forgery identification.
"""
from io import BytesIO
from typing import Dict, List, Tuple, Any
import numpy as np
import cv2
from PIL import Image, ImageChops, ImageEnhance


class OpenCVProcessor:
    """
    OpenCV computer vision pipeline for document analysis and forensic verification.
    """

    @staticmethod
    def pil_to_cv(pil_img: Image.Image) -> np.ndarray:
        """Convert a PIL image to OpenCV BGR format."""
        if pil_img.mode != "RGB":
            pil_img = pil_img.convert("RGB")
        return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

    @staticmethod
    def cv_to_pil(cv_img: np.ndarray) -> Image.Image:
        """Convert an OpenCV BGR image to PIL RGB format."""
        rgb = cv2.cvtColor(cv_img, cv2.COLOR_BGR2RGB)
        return Image.fromarray(rgb)

    @classmethod
    def preprocess_document(cls, pil_img: Image.Image) -> Tuple[Image.Image, Dict[str, Any]]:
        """
        Enhance image quality for OCR:
        1. Deskewing to correct camera / scanner tilt.
        2. Bilateral filtering to suppress noise while preserving sharp text edges.
        3. CLAHE (Contrast Limited Adaptive Histogram Equalization).
        """
        cv_img = cls.pil_to_cv(pil_img)
        gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)

        # Deskewing calculation
        angle = cls.detect_skew_angle(gray)
        if abs(angle) > 0.5 and abs(angle) < 45.0:
            (h, w) = gray.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            cv_img = cv2.warpAffine(
                cv_img, M, (w, h),
                flags=cv2.INTER_CUBIC,
                borderMode=cv2.BORDER_REPLICATE
            )
            gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
            deskewed = True
        else:
            deskewed = False

        # Contrast enhancement using CLAHE
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced_gray = clahe.apply(gray)

        # Bilateral noise reduction
        denoised = cv2.bilateralFilter(enhanced_gray, d=5, sigmaColor=50, sigmaSpace=50)

        # Convert back to 3-channel for downstream compatibility
        processed_bgr = cv2.cvtColor(denoised, cv2.COLOR_GRAY2BGR)
        result_pil = cls.cv_to_pil(processed_bgr)

        metadata = {
            "skewAngle": round(angle, 2),
            "deskewedApplied": deskewed,
            "dimensions": {"width": pil_img.width, "height": pil_img.height}
        }
        return result_pil, metadata

    @staticmethod
    def detect_skew_angle(gray: np.ndarray) -> float:
        """Calculate skew angle of document text using minAreaRect."""
        blur = cv2.GaussianBlur(gray, (7, 7), 0)
        thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
        coords = np.column_stack(np.where(thresh > 0))
        if len(coords) < 50:
            return 0.0

        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle
        return angle

    @classmethod
    def detect_stamp_and_signature(cls, pil_img: Image.Image) -> Dict[str, Any]:
        """
        Detect official government seals/stamps (circular color clusters) and signatures
        using color space thresholding and morphological filtering.
        """
        cv_img = cls.pil_to_cv(pil_img)
        hsv = cv2.cvtColor(cv_img, cv2.COLOR_BGR2HSV)
        (img_h, img_w) = cv_img.shape[:2]

        # 1. Official ink stamp detection (Blue, Purple, Red seals)
        # Blue/Purple ink range in HSV
        lower_blue = np.array([100, 50, 50])
        upper_blue = np.array([140, 255, 255])
        mask_blue = cv2.inRange(hsv, lower_blue, upper_blue)

        # Red ink range
        lower_red1 = np.array([0, 70, 50])
        upper_red1 = np.array([10, 255, 255])
        lower_red2 = np.array([170, 70, 50])
        upper_red2 = np.array([180, 255, 255])
        mask_red = cv2.bitwise_or(
            cv2.inRange(hsv, lower_red1, upper_red1),
            cv2.inRange(hsv, lower_red2, upper_red2)
        )
        mask_stamp = cv2.bitwise_or(mask_blue, mask_red)

        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        mask_stamp = cv2.morphologyEx(mask_stamp, cv2.MORPH_CLOSE, kernel)
        contours, _ = cv2.findContours(mask_stamp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        stamp_detected = False
        stamp_boxes = []
        for c in contours:
            area = cv2.contourArea(c)
            if area > 400:  # Minimum stamp size in pixels
                x, y, w, h = cv2.boundingRect(c)
                aspect_ratio = float(w) / h
                if 0.6 <= aspect_ratio <= 1.6:  # Circular or oval shape
                    stamp_detected = True
                    stamp_boxes.append({
                        "x": round((x / img_w) * 100, 2),
                        "y": round((y / img_h) * 100, 2),
                        "w": round((w / img_w) * 100, 2),
                        "h": round((h / img_h) * 100, 2),
                        "conf": 0.88
                    })

        # 2. Signature detection heuristic (dense horizontal script near bottom)
        gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
        bottom_region = gray[int(img_h * 0.6):, :]
        thresh_sig = cv2.adaptiveThreshold(
            bottom_region, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV, 11, 2
        )
        sig_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 3))
        sig_dilated = cv2.dilate(thresh_sig, sig_kernel, iterations=2)
        sig_contours, _ = cv2.findContours(sig_dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        signature_detected = False
        for c in sig_contours:
            area = cv2.contourArea(c)
            if 300 < area < 15000:
                x, y, w, h = cv2.boundingRect(c)
                if w > h * 1.5:  # Elongated cursive stroke characteristic
                    signature_detected = True
                    break

        return {
            "stampDetected": stamp_detected,
            "signatureDetected": signature_detected,
            "stampRegions": stamp_boxes
        }

    @classmethod
    def perform_error_level_analysis(cls, pil_img: Image.Image, quality: int = 90) -> Dict[str, Any]:
        """
        Error Level Analysis (ELA):
        Saves image at known JPEG compression rate and compares against original.
        Digital alterations (copied dates, numbers, stamps) compress at different rates,
        producing distinct high-contrast error artifacts.
        """
        if pil_img.mode != "RGB":
            pil_img = pil_img.convert("RGB")

        # Save to memory buffer with specific compression
        buf = BytesIO()
        pil_img.save(buf, format="JPEG", quality=quality)
        buf.seek(0)
        compressed = Image.open(buf)

        # Difference between original and recompressed
        diff = ImageChops.difference(pil_img, compressed)
        extrema = diff.getextrema()
        max_diff = max([ex[1] for ex in extrema]) if extrema else 0
        scale = 255.0 / max_diff if max_diff > 0 else 1.0

        diff_enhanced = ImageEnhance.Brightness(diff).enhance(scale)
        diff_np = np.array(diff_enhanced)
        mean_artifact_level = float(np.mean(diff_np))

        # Check for localized bright clusters indicating splice/tamper
        gray_diff = cv2.cvtColor(diff_np, cv2.COLOR_RGB2GRAY)
        _, thresh_ela = cv2.threshold(gray_diff, 180, 255, cv2.THRESH_BINARY)
        suspicious_pixels = int(np.count_nonzero(thresh_ela))
        total_pixels = gray_diff.size
        tamper_ratio = suspicious_pixels / float(total_pixels)

        is_tampered = tamper_ratio > 0.015 or mean_artifact_level > 35.0
        flags = []
        if is_tampered:
            flags.append(f"ELA detected anomalous compression artifacts ({round(tamper_ratio*100, 2)}% high-error regions)")

        return {
            "isTampered": is_tampered,
            "elaScore": round(mean_artifact_level, 2),
            "tamperRatio": round(tamper_ratio, 4),
            "flags": flags
        }
