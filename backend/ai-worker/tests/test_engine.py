import base64
import json

import pymupdf as fitz
import pytest
from fastapi.testclient import TestClient

from app.engine import AuditEngine, InvalidDocumentError
from app.models.audit import TemplateSpecs
from app.scoring import compute_summary

A4 = (595, 842)


def make_pdf(pages):
    """pages: list of lists of (x, y, text)."""
    doc = fitz.open()
    for items in pages:
        page = doc.new_page(width=A4[0], height=A4[1])
        for x, y, text in items:
            page.insert_text(fitz.Point(x, y), text, fontsize=10)
    data = doc.tobytes()
    doc.close()
    return data


CLEAN = make_pdf([
    [
        (100, 150, "A Blind Study of Layout Compliance"),
        (100, 180, "Abstract. We cite prior work [1] and [2]."),
    ],
    [
        (100, 150, "References"),
        (100, 175, "[1] A. Alpha. Paper one. 2024."),
        (100, 195, "[2] B. Beta. Paper two. 2023."),
    ],
])

DIRTY = make_pdf([
    [
        (100, 20, "Header text that sits inside the top margin area"),
        (100, 150, "Contact: leaked.author@mit.edu"),
        (100, 180, "We cite [1] and [3] here."),
    ],
    [
        (100, 150, "References"),
        (100, 175, "[1] A. Alpha. Paper one. 2024."),
        (100, 195, "[2] B. Beta. Never cited. 2023."),
    ],
])

LOOSE_SPECS = TemplateSpecs(
    page_format="A4", margin_top_mm=25.4, margin_bottom_mm=25.4,
    margin_left_mm=25.4, margin_right_mm=25.4, column_count=1,
    source="preset:test", name="Test preset",
)


@pytest.fixture(scope="module")
def engine():
    # blank spaCy pipeline: deterministic, no model download needed in CI
    import spacy
    return AuditEngine(nlp_model=spacy.blank("en"))


def test_scoring_counts_distinct_rules():
    s = compute_summary(["MARGIN_TOP"] * 40 + ["MARGIN_LEFT"], warnings=1)
    assert s["critical_errors"] == 2
    assert s["overall_score"] == 100 - 30 - 5
    assert s["status"] == "FAIL"
    assert compute_summary([], 2)["status"] == "PASS"
    assert compute_summary([], 50)["overall_score"] == 0


def test_clean_manuscript_passes(engine):
    r = engine.run(CLEAN, template_specs=LOOSE_SPECS)
    assert r.summary.status == "PASS"
    assert r.overall_score == 100
    assert r.annotated_pdf is None
    assert r.template_specs.source == "preset:test"


def test_dirty_manuscript_flags_everything_and_annotates(engine):
    r = engine.run(DIRTY, template_specs=LOOSE_SPECS)
    d = r.to_dict()

    rules = {c["rule"] for c in d["modules"]["geometry_and_layout"]["checks"]}
    assert "MARGIN_TOP" in rules
    assert any(l["type"] in ("EMAIL", "Author Email") for l in d["modules"]["anonymization"]["leaks_found"])
    assert d["modules"]["citation_crosscheck"]["missing_citations"] == ["[3]"]
    assert d["modules"]["citation_crosscheck"]["uncited_references"][0].startswith("[2]")
    # JSON contract uses "pass", not the pydantic field name "pass_"
    assert "pass" in d["modules"]["citation_crosscheck"]
    assert "pass_" not in json.dumps(d)

    assert r.summary.status == "FAIL"
    assert r.overall_score == 100 - 15 * 1 - 5 * 3

    # Annotated PDF exists and contains a box for the leaked email
    assert r.annotated_pdf and r.annotated_pdf.startswith(b"%PDF")
    out = fitz.open(stream=r.annotated_pdf, filetype="pdf")
    notes = [a.info.get("content", "") for a in out[0].annots()]
    out.close()
    assert any("ANONYMIZATION_EMAIL" in n for n in notes)


def test_uploaded_template_wins_over_preset(engine):
    template = make_pdf([[(60, 60, "Template body text spanning the page for margin extraction.")]])
    r = engine.run(CLEAN, template_bytes=template, template_specs=LOOSE_SPECS)
    assert r.template_specs.source == "uploaded_template"
    assert r.template_specs.is_custom_template is True


def test_invalid_pdf_rejected(engine):
    with pytest.raises(InvalidDocumentError):
        engine.run(b"not a pdf at all")


@pytest.fixture()
def client(engine, monkeypatch):
    import app.server as server
    monkeypatch.setattr(server, "engine", engine)
    return TestClient(server.app), server


def test_server_audit_roundtrip(client):
    c, _ = client
    resp = c.post(
        "/v1/audit",
        files={"manuscript": ("draft.pdf", DIRTY, "application/pdf")},
        data={"template_specs": LOOSE_SPECS.model_dump_json()},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["report"]["engine"] == "pymupdf-worker"
    assert body["report"]["summary"]["status"] == "FAIL"
    assert base64.b64decode(body["annotated_pdf_base64"]).startswith(b"%PDF")


def test_server_rejects_invalid_pdf(client):
    c, _ = client
    resp = c.post("/v1/audit", files={"manuscript": ("x.pdf", b"garbage", "application/pdf")})
    assert resp.status_code == 422


def test_server_token(client, monkeypatch):
    c, server = client
    monkeypatch.setattr(server.settings, "AUDIT_ENGINE_TOKEN", "s3cret")
    files = {"manuscript": ("draft.pdf", CLEAN, "application/pdf")}
    assert c.post("/v1/audit", files=files).status_code == 401
    assert c.post("/v1/audit", files=files, headers={"X-Worker-Token": "s3cret"}).status_code == 200
