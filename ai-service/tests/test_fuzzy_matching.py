"""
Tests for RapidFuzz fuzzy matching engine.
"""
from app.services.fuzzy_matcher import FuzzyMatcher, normalize_entity_name


def test_normalize_entity_name():
    raw = "Shri Govindram Seksaria Institute of Technology and Science, Indore"
    norm = normalize_entity_name(raw)
    assert "shri" not in norm
    assert "of" not in norm
    assert "and" not in norm
    assert "govindram" in norm
    assert "seksaria" in norm


def test_holder_name_matching():
    app_name = "Sunrise Institute of Technology"
    doc_name = "Sunrise Institute of Technology"
    res = FuzzyMatcher.compare_holder_name(app_name, doc_name)
    assert res["isMatch"] is True
    assert res["similarity"] >= 0.90


def test_holder_name_word_order_variation():
    app_name = "Ambedkar Institute of Technology, Dr. B. R."
    doc_name = "Dr. B. R. Ambedkar Institute of Technology"
    res = FuzzyMatcher.compare_holder_name(app_name, doc_name)
    assert res["isMatch"] is True
    assert res["similarity"] >= 0.70


def test_holder_name_severe_mismatch():
    app_name = "Sunrise Institute of Technology"
    doc_name = "National College of Arts and Commerce"
    res = FuzzyMatcher.compare_holder_name(app_name, doc_name)
    assert res["isMatch"] is False
    assert res["similarity"] < 0.40


def test_reference_number_ocr_character_swap():
    ref1 = "AICTE/2026/0142"
    ref2 = "AICTE/2026/O142"  # 'O' instead of '0'
    score, matched = FuzzyMatcher.compare_reference_numbers(ref1, ref2)
    assert matched is True
    assert score >= 0.95
