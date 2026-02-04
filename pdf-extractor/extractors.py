"""Extractor helpers for PDF text extraction

Implements a robust fallback chain:
- pypdf (fast) -> pdfplumber -> pymupdf (fitz) -> pdf2image + pytesseract (OCR)
"""
import io
import traceback
import asyncio
from typing import Tuple, Dict, Any

async def extract_text_from_pdf(buffer: bytes, ocr: bool = False) -> Tuple[str, Dict[str, Any]]:
    # Try pypdf
    try:
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(buffer))
        text = "\n".join([p.extract_text() or "" for p in reader.pages])
        if text.strip():
            return text, {"method": "pypdf", "pages": len(reader.pages)}
    except Exception as e:
        # fall through
        print("pypdf failed:", e)

    # Try pdfplumber
    try:
        import pdfplumber

        with pdfplumber.open(io.BytesIO(buffer)) as pdf:
            texts = []
            for page in pdf.pages:
                texts.append(page.extract_text() or "")
            text = "\n".join(texts)
            if text.strip():
                return text, {"method": "pdfplumber", "pages": len(pdf.pages)}
    except Exception as e:
        print("pdfplumber failed:", e)

    # Try pymupdf (fitz)
    try:
        import fitz

        doc = fitz.open(stream=buffer, filetype="pdf")
        texts = []
        for p in doc:
            texts.append(p.get_text("text") or "")
        text = "\n".join(texts)
        if text.strip():
            return text, {"method": "pymupdf", "pages": doc.page_count}
    except Exception as e:
        print("pymupdf failed:", e)

    # OCR fallback
    if ocr:
        try:
            from pdf2image import convert_from_bytes
            import pytesseract

            images = convert_from_bytes(buffer)
            texts = []
            for im in images:
                texts.append(pytesseract.image_to_string(im))
            text = "\n".join(texts)
            if text.strip():
                return text, {"method": "ocr", "pages": len(images)}
        except Exception as e:
            print("OCR fallback failed:", e)

    raise Exception("All extractors failed to extract text")
