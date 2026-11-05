"""
HTTP entry point for the audit engine, called by the Go gateway.

    POST /v1/audit   multipart/form-data
        manuscript      (file, required)  draft PDF
        template        (file, optional)  journal template PDF
        template_specs  (text, optional)  JSON TemplateSpecs preset used when no template PDF
    -> 200 {"report": {...}, "annotated_pdf_base64": "..."|null}
    -> 422 {"detail": "..."} for unreadable / invalid PDFs

    GET /healthz

The worker is stateless: it never touches the database or file storage.
Run with:  python -m app.server   (binds AUDIT_ENGINE_HOST:AUDIT_ENGINE_PORT)
"""
import base64
import hmac
import json
import logging
from typing import Optional

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from pydantic import ValidationError

from app.config import settings
from app.engine import ENGINE_NAME, AuditEngine, InvalidDocumentError
from app.models.audit import TemplateSpecs

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [AI-Worker] %(message)s",
)
logger = logging.getLogger("jms-ai-worker")

app = FastAPI(title="JMS Audit Engine", version="1.0.0")
engine = AuditEngine()

MAX_BYTES = settings.AUDIT_MAX_UPLOAD_MB * 1024 * 1024


def _check_token(token: Optional[str]) -> None:
    expected = settings.AUDIT_ENGINE_TOKEN
    if expected and not hmac.compare_digest(token or "", expected):
        raise HTTPException(status_code=401, detail="invalid worker token")


async def _read_limited(f: UploadFile, label: str) -> bytes:
    data = await f.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail=f"{label} exceeds {settings.AUDIT_MAX_UPLOAD_MB} MB")
    return data


@app.get("/healthz")
def healthz():
    return {"status": "HEALTHY", "engine": ENGINE_NAME}


@app.post("/v1/audit")
async def audit(
    manuscript: UploadFile = File(...),
    template: Optional[UploadFile] = File(None),
    template_specs: Optional[str] = Form(None),
    x_worker_token: Optional[str] = Header(None),
):
    _check_token(x_worker_token)

    draft_bytes = await _read_limited(manuscript, "Manuscript")
    template_bytes = await _read_limited(template, "Template") if template is not None else None

    preset: Optional[TemplateSpecs] = None
    if template_specs:
        try:
            preset = TemplateSpecs(**json.loads(template_specs))
        except (ValueError, ValidationError) as exc:
            raise HTTPException(status_code=422, detail=f"invalid template_specs: {exc}")

    try:
        result = engine.run(draft_bytes, template_bytes or None, preset)
    except InvalidDocumentError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return {
        "report": result.to_dict(),
        "annotated_pdf_base64": (
            base64.b64encode(result.annotated_pdf).decode("ascii") if result.annotated_pdf else None
        ),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=settings.AUDIT_ENGINE_HOST, port=settings.AUDIT_ENGINE_PORT)
