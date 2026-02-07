#!/usr/bin/env python3
"""
Test script for enhanced PDF extractor OCR capabilities
"""
import asyncio
import sys
from extractors import extract_text_from_pdf, _is_meaningful_text

async def test_ocr_detection():
    """Test the intelligent OCR detection with various text samples."""

    print("Testing intelligent OCR detection...")

    # Test cases for meaningful text detection
    test_cases = [
        ("", False, "Empty text"),
        ("   ", False, "Whitespace only"),
        ("hello world", False, "Too short"),
        ("x" * 200, False, "Repeated characters"),
        ("This is a test document with enough content to be considered meaningful text for extraction purposes.", True, "Meaningful text"),
        ("The quick brown fox jumps over the lazy dog. This sentence contains all letters of the alphabet and is long enough to pass the meaningful text test.", True, "Long meaningful text"),
    ]

    for text, expected, description in test_cases:
        result = _is_meaningful_text(text)
        status = "✓" if result == expected else "✗"
        print(f"{status} {description}: {result} (expected {expected})")

    print("\nTesting OCR detection with mock PDF data...")

    # Test with a mock PDF that would fail text extraction (simulating scanned PDF)
    # In a real test, you'd use actual PDF files
    try:
        # This would normally be PDF bytes that contain no extractable text
        mock_scanned_pdf = b"%PDF-1.4 mock scanned pdf content"  # This won't work, just for testing

        text, meta = await extract_text_from_pdf(mock_scanned_pdf, ocr=True)
        print(f"Extraction result: {len(text)} chars, method: {meta.get('method', 'unknown')}")
        print(f"Has OCR: {meta.get('has_ocr', False)}")

    except Exception as e:
        print(f"Expected error for mock PDF: {e}")

    print("\nEnhanced PDF extractor test completed!")

if __name__ == "__main__":
    asyncio.run(test_ocr_detection())
