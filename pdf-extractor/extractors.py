"""Extractor helpers for PDF text extraction

Implements a robust fallback chain with intelligent OCR detection:
- pypdf (fast) -> pdfplumber -> pymupdf (fitz) -> intelligent OCR detection -> enhanced OCR
"""
import io
import traceback
import asyncio
from typing import Tuple, Dict, Any, List, Optional
import re


def _is_meaningful_text(text: str, min_chars: int = 100, min_words: int = 20) -> bool:
    """Check if extracted text contains meaningful content."""
    if not text or not text.strip():
        return False

    # Remove excessive whitespace
    cleaned = re.sub(r'\s+', ' ', text.strip())

    # Check minimum character count
    if len(cleaned) < min_chars:
        return False

    # Check minimum word count
    words = cleaned.split()
    if len(words) < min_words:
        return False

    # Check if text is not just repeated characters or symbols
    if len(set(cleaned.lower())) < 10:  # Less than 10 unique characters
        return False

    return True


def _detect_image_characteristics(image) -> Dict[str, Any]:
    """Analyze image to determine optimal preprocessing strategy."""
    try:
        import numpy as np
        from PIL import ImageStat
        
        # Convert to grayscale if needed
        if image.mode != 'L':
            gray = image.convert('L')
        else:
            gray = image
        
        # Get basic statistics
        stat = ImageStat.Stat(gray)
        mean_brightness = stat.mean[0]
        stddev = stat.stddev[0]
        
        # Convert to numpy for more analysis
        img_array = np.array(gray)
        
        # Detect if image is very dark or very light
        is_dark = mean_brightness < 100
        is_light = mean_brightness > 180
        
        # Detect if image has low contrast
        low_contrast = stddev < 40
        
        # Estimate if image is noisy (high variation in small areas)
        # Simple noise detection via local variance
        kernel_size = 5
        local_vars = []
        for i in range(0, img_array.shape[0] - kernel_size, kernel_size * 2):
            for j in range(0, img_array.shape[1] - kernel_size, kernel_size * 2):
                patch = img_array[i:i+kernel_size, j:j+kernel_size]
                local_vars.append(np.var(patch))
        
        avg_local_var = np.mean(local_vars) if local_vars else 0
        is_noisy = avg_local_var > 1000
        
        return {
            'mean_brightness': mean_brightness,
            'stddev': stddev,
            'is_dark': is_dark,
            'is_light': is_light,
            'low_contrast': low_contrast,
            'is_noisy': is_noisy
        }
    except Exception as e:
        print(f"Image analysis failed: {e}")
        return {}


def _detect_and_correct_rotation(image):
    """Detect and correct image rotation using Tesseract OSD."""
    try:
        import pytesseract
        from PIL import Image
        
        # Try to get orientation
        osd = pytesseract.image_to_osd(image)
        
        # Extract rotation angle
        angle_match = re.search(r'(?<=Rotate: )\d+', osd)
        if angle_match:
            angle = int(angle_match.group(0))
            if angle != 0:
                print(f"Detected rotation: {angle} degrees, correcting...")
                image = image.rotate(angle, expand=True, fillcolor='white')
        
        return image
    except Exception as e:
        print(f"Rotation detection failed (will proceed without correction): {e}")
        return image


def _preprocess_image_adaptive(image, characteristics: Optional[Dict[str, Any]] = None):
    """Apply adaptive preprocessing based on image characteristics."""
    try:
        from PIL import Image, ImageEnhance, ImageFilter, ImageOps
        import numpy as np
        import cv2
        
        # Analyze image if characteristics not provided
        if characteristics is None:
            characteristics = _detect_image_characteristics(image)
        
        # Convert to grayscale
        if image.mode != 'L':
            image = image.convert('L')
        
        # Convert to numpy array for OpenCV operations
        img_array = np.array(image)
        
        # Apply denoising if image is noisy
        if characteristics.get('is_noisy', False):
            print("Applying noise reduction...")
            img_array = cv2.fastNlMeansDenoising(img_array, None, h=10, templateWindowSize=7, searchWindowSize=21)
        
        # Apply adaptive thresholding for better binarization
        # This works much better than global contrast enhancement for uneven lighting
        if characteristics.get('low_contrast', False) or characteristics.get('is_dark', False) or characteristics.get('is_light', False):
            print("Applying adaptive thresholding...")
            img_array = cv2.adaptiveThreshold(
                img_array,
                255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY,
                blockSize=11,
                C=2
            )
        else:
            # Use Otsu's binarization for good contrast images
            _, img_array = cv2.threshold(img_array, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Convert back to PIL
        image = Image.fromarray(img_array)
        
        # Light sharpening to enhance edges (but not too aggressive)
        image = image.filter(ImageFilter.UnsharpMask(radius=1, percent=100, threshold=3))
        
        # Slight morphological operations to clean up
        # Dilate then erode to close small gaps (closing operation)
        img_array = np.array(image)
        kernel = np.ones((2, 2), np.uint8)
        img_array = cv2.morphologyEx(img_array, cv2.MORPH_CLOSE, kernel)
        image = Image.fromarray(img_array)
        
        return image
        
    except ImportError as e:
        print(f"OpenCV not available, falling back to PIL-only preprocessing: {e}")
        # Fallback to simpler PIL-only preprocessing
        return _preprocess_image_simple(image, characteristics)
    except Exception as e:
        print(f"Adaptive preprocessing failed: {e}")
        return image


def _preprocess_image_simple(image, characteristics: Optional[Dict[str, Any]] = None):
    """Simpler PIL-only preprocessing as fallback."""
    from PIL import Image, ImageEnhance, ImageFilter, ImageOps
    
    if characteristics is None:
        characteristics = _detect_image_characteristics(image)
    
    # Convert to grayscale
    if image.mode != 'L':
        image = image.convert('L')
    
    # Adaptive contrast enhancement based on image characteristics
    if characteristics.get('low_contrast', False):
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.8)
    elif characteristics.get('is_dark', False):
        enhancer = ImageEnhance.Brightness(image)
        image = enhancer.enhance(1.3)
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.5)
    elif characteristics.get('is_light', False):
        enhancer = ImageEnhance.Brightness(image)
        image = enhancer.enhance(0.85)
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.3)
    else:
        # Moderate enhancement for normal images
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.3)
    
    # Denoise if needed
    if characteristics.get('is_noisy', False):
        image = image.filter(ImageFilter.MedianFilter(size=3))
    
    # Light sharpening
    image = image.filter(ImageFilter.UnsharpMask(radius=1, percent=100, threshold=3))
    
    # Auto-level to use full tonal range
    image = ImageOps.autocontrast(image, cutoff=2)
    
    return image


def _determine_psm_mode(image) -> int:
    """Determine optimal PSM (Page Segmentation Mode) for the image."""
    try:
        import pytesseract
        
        # Try to detect layout
        # PSM modes:
        # 3 = Fully automatic page segmentation (default)
        # 4 = Assume a single column of text
        # 6 = Assume a single uniform block of text
        # 11 = Sparse text. Find as much text as possible
        # 12 = Sparse text with OSD
        
        # For most documents, PSM 3 (automatic) is safest
        # We'll use 3 as default, but could get fancier with layout analysis
        return 3
        
    except Exception as e:
        print(f"PSM detection failed, using default: {e}")
        return 3


async def extract_text_from_pdf(buffer: bytes, ocr: bool = False) -> Tuple[str, Dict[str, Any]]:
    """Extract text from PDF with intelligent OCR fallback for scanned documents."""
    
    extraction_errors = []  # Track errors for better debugging
    
    # Try pypdf
    try:
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(buffer))
        text = "\n".join([p.extract_text() or "" for p in reader.pages])
        if _is_meaningful_text(text):
            return text, {"method": "pypdf", "pages": len(reader.pages), "has_ocr": False}
    except Exception as e:
        extraction_errors.append(f"pypdf: {str(e)}")
        print(f"pypdf failed: {e}")

    # Try pdfplumber
    try:
        import pdfplumber

        with pdfplumber.open(io.BytesIO(buffer)) as pdf:
            texts = []
            for page in pdf.pages:
                texts.append(page.extract_text() or "")
            text = "\n".join(texts)
            if _is_meaningful_text(text):
                return text, {"method": "pdfplumber", "pages": len(pdf.pages), "has_ocr": False}
    except Exception as e:
        extraction_errors.append(f"pdfplumber: {str(e)}")
        print(f"pdfplumber failed: {e}")

    # Try pymupdf (fitz)
    try:
        import fitz

        doc = fitz.open(stream=buffer, filetype="pdf")
        texts = []
        for p in doc:
            texts.append(p.get_text("text") or "")
        text = "\n".join(texts)
        if _is_meaningful_text(text):
            return text, {"method": "pymupdf", "pages": doc.page_count, "has_ocr": False}
    except Exception as e:
        extraction_errors.append(f"pymupdf: {str(e)}")
        print(f"pymupdf failed: {e}")

    # Intelligent OCR detection: if all text extraction methods failed to get meaningful text,
    # assume this is a scanned PDF and use OCR
    print("All text extraction methods failed to get meaningful text. Attempting OCR for scanned PDF...")

    # Enhanced OCR with adaptive preprocessing
    try:
        from pdf2image import convert_from_bytes
        import pytesseract
        from PIL import Image

        # Convert PDF to images with good DPI for OCR
        images = convert_from_bytes(buffer, dpi=300)
        texts = []
        ocr_metadata = {
            'pages_processed': 0,
            'pages_failed': 0,
            'preprocessing_applied': []
        }

        for i, img in enumerate(images):
            try:
                print(f"Processing page {i+1}/{len(images)}...")
                
                # Detect and correct rotation
                img = _detect_and_correct_rotation(img)
                
                # Analyze image characteristics
                characteristics = _detect_image_characteristics(img)
                
                # Apply adaptive preprocessing
                preprocessed = _preprocess_image_adaptive(img, characteristics)
                
                # Determine optimal PSM mode
                psm_mode = _determine_psm_mode(preprocessed)
                
                # OCR with configuration optimized for documents
                # Removed overly restrictive whitelist to support more characters
                custom_config = f'--oem 3 --psm {psm_mode}'
                page_text = pytesseract.image_to_string(preprocessed, config=custom_config, lang='eng')

                if page_text.strip():
                    texts.append(f"--- PAGE {i+1} ---\n{page_text}")
                    ocr_metadata['pages_processed'] += 1
                    print(f"✓ OCR successful for page {i+1}")
                else:
                    print(f"⚠ OCR returned empty text for page {i+1}")
                    ocr_metadata['pages_failed'] += 1

            except Exception as e:
                print(f"✗ OCR failed for page {i+1}: {e}")
                extraction_errors.append(f"OCR page {i+1}: {str(e)}")
                ocr_metadata['pages_failed'] += 1
                continue

        text = "\n\n".join(texts)

        if text.strip():
            # Build per-page info for metadata
            pages_info = []
            for idx, t in enumerate(texts):
                pages_info.append({
                    "page_num": idx + 1,
                    "char_count": len(t),
                    "method": "enhanced_ocr"
                })
            return text, {
                "method": "enhanced_ocr",
                "page_count": len(images),
                "pages": pages_info,
                "has_ocr": True,
                "pages_processed": ocr_metadata['pages_processed'],
                "pages_failed": ocr_metadata['pages_failed'],
                "preprocessing": "adaptive_thresholding,denoising,rotation_correction,morphological_ops"
            }
        else:
            extraction_errors.append("Enhanced OCR: No text extracted from any page")

    except ImportError as e:
        error_msg = (
            "OCR dependencies not installed. "
            "Install: pip install pdf2image pytesseract pillow opencv-python-headless"
        )
        print(f"✗ {error_msg}")
        extraction_errors.append(f"Import error: {str(e)}")
        raise Exception(error_msg)
    except Exception as e:
        extraction_errors.append(f"Enhanced OCR: {str(e)}")
        print(f"Enhanced OCR failed: {e}")

    # Final fallback: basic OCR without preprocessing if enhanced OCR fails
    if ocr:
        try:
            from pdf2image import convert_from_bytes
            import pytesseract

            print("Attempting basic OCR fallback...")
            images = convert_from_bytes(buffer, dpi=200)
            texts = []
            for i, img in enumerate(images):
                try:
                    page_text = pytesseract.image_to_string(img, lang='eng')
                    if page_text.strip():
                        texts.append(f"--- PAGE {i+1} ---\n{page_text}")
                except Exception as e:
                    print(f"Basic OCR failed for page {i+1}: {e}")
                    continue
                    
            text = "\n".join(texts)
            if text.strip():
                return text, {
                    "method": "basic_ocr",
                    "page_count": len(images),
                    "pages": [{"page_num": i+1, "char_count": len(t), "method": "basic_ocr"} for i, t in enumerate(texts)],
                    "has_ocr": True,
                    "note": "Enhanced OCR failed, used basic fallback"
                }
        except Exception as e:
            extraction_errors.append(f"Basic OCR fallback: {str(e)}")
            print(f"Basic OCR fallback failed: {e}")

    # Provide detailed error information
    error_details = "\n".join([f"  - {err}" for err in extraction_errors])
    raise Exception(
        f"All extraction methods failed. This may be a corrupted PDF, unsupported format, "
        f"or the document may be too complex.\n\nDetailed errors:\n{error_details}"
    )