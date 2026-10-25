"""
Tests for Perceptual Hash (ImageHash) visual fingerprinting.
"""
from PIL import Image, ImageDraw
from app.services.perceptual_hasher import PerceptualHasher


def test_perceptual_hash_computation():
    img = Image.new("RGB", (200, 200), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.rectangle([20, 20, 80, 80], fill=(0, 0, 0))

    hashes = PerceptualHasher.compute_hashes(img)
    assert "pHash" in hashes
    assert "dHash" in hashes
    assert "aHash" in hashes
    assert len(hashes["pHash"]) == 16


def test_identical_image_duplicate_detection():
    img = Image.new("RGB", (200, 200), color=(240, 240, 240))
    draw = ImageDraw.Draw(img)
    draw.text((30, 30), "FIRE SAFETY CERTIFICATE", fill=(0, 0, 0))

    hashes = PerceptualHasher.compute_hashes(img)
    registry = [{"refNo": "EOA-2026-00001", "pHash": hashes["pHash"]}]

    check = PerceptualHasher.check_duplicate_in_registry(hashes, registry)
    assert check["isDuplicate"] is True
    assert check["hammingDistance"] == 0
    assert check["matchedRefNo"] == "EOA-2026-00001"


def test_unique_image_not_duplicate():
    img1 = Image.new("RGB", (200, 200), color=(255, 255, 255))
    draw1 = ImageDraw.Draw(img1)
    draw1.rectangle([10, 10, 50, 50], fill=(0, 0, 0))

    img2 = Image.new("RGB", (200, 200), color=(0, 0, 0))
    draw2 = ImageDraw.Draw(img2)
    draw2.ellipse([50, 50, 150, 150], fill=(255, 255, 255))

    hashes1 = PerceptualHasher.compute_hashes(img1)
    hashes2 = PerceptualHasher.compute_hashes(img2)

    registry = [{"refNo": "EOA-2026-00099", "pHash": hashes2["pHash"]}]
    check = PerceptualHasher.check_duplicate_in_registry(hashes1, registry)
    assert check["isDuplicate"] is False
