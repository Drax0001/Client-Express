from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Request
from fastapi.responses import JSONResponse
import os
import uuid
import asyncio
import requests
from extractors import extract_text_from_pdf
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="PDF Extractor")

EXTRACTION_API_KEY = os.getenv("EXTRACTION_API_KEY")
CALLBACK_URL = os.getenv("CALLBACK_URL")
CALLBACK_KEY = os.getenv("CALLBACK_KEY")

# In-memory job store for prototype. In production use Redis + RQ/Celery.
_jobs = {}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/extract/pdf")
async def extract_pdf(file: UploadFile = File(...), request: Request = None):
    # Simple API key check for internal use
    if EXTRACTION_API_KEY:
        key = request.headers.get("x-service-key")
        if key != EXTRACTION_API_KEY:
            raise HTTPException(status_code=401, detail="invalid api key")

    contents = await file.read()
    try:
        # Synchronous extraction with intelligent OCR fallback for scanned PDFs
        text, meta = await extract_text_from_pdf(contents, ocr=True)
        # print(f"text: {text}, meta: {meta}")
        return {"text": text, "meta": meta}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/jobs/pdf")
async def jobs_pdf(background_tasks: BackgroundTasks, file: UploadFile = File(...), request: Request = None):
    if EXTRACTION_API_KEY:
        key = request.headers.get("x-service-key")
        if key != EXTRACTION_API_KEY:
            raise HTTPException(status_code=401, detail="invalid api key")

    job_id = str(uuid.uuid4())
    contents = await file.read()

    # Store initial job
    _jobs[job_id] = {"status": "queued", "result": None}

    # Enqueue background task
    loop = asyncio.get_event_loop()
    loop.create_task(_process_job(job_id, contents))

    return JSONResponse(status_code=202, content={"jobId": job_id})

async def _process_job(job_id: str, buffer: bytes):
    try:
        _jobs[job_id]["status"] = "processing"
        # Full extraction with OCR fallback
        text, meta = await extract_text_from_pdf(buffer, ocr=True)
        _jobs[job_id]["status"] = "done"
        _jobs[job_id]["result"] = {"text": text, "meta": meta}

        # Call callback webhook if configured
        if CALLBACK_URL:
            try:
                headers = {"Content-Type": "application/json"}
                if CALLBACK_KEY:
                    headers["x-service-key"] = CALLBACK_KEY
                payload = {"jobId": job_id, "text": text, "meta": meta}
                requests.post(CALLBACK_URL, json=payload, headers=headers, timeout=10)
            except Exception as e:
                # Log but don't fail job
                print("Failed to POST callback:", e)
    except Exception as e:
        _jobs[job_id]["status"] = "failed"
        _jobs[job_id]["result"] = {"error": str(e)}

@app.get("/jobs/{job_id}")
async def get_job(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="job not found")
    return job
