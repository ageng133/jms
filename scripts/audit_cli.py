#!/usr/bin/env python3
"""
Format Kilat Monolithic CLI Audit Runner
Directly executes PyMuPDF + spaCy layout & compliance audit without an external HTTP daemon.
"""
import sys
import os
import json
import argparse

# Add backend/ai-worker to sys.path so we can import app modules directly
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
AI_WORKER_DIR = os.path.join(REPO_ROOT, "backend", "ai-worker")
if AI_WORKER_DIR not in sys.path:
    sys.path.insert(0, AI_WORKER_DIR)

try:
    from app.engine import AuditEngine, InvalidDocumentError
    from app.models.audit import TemplateSpecs
except ImportError as e:
    sys.stderr.write(f"Error importing ai-worker engine: {e}\n")
    sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Format Kilat Monolithic CLI Auditor")
    parser.add_argument("--draft", required=True, help="Path to draft PDF")
    parser.add_argument("--template", required=False, default=None, help="Path to template PDF")
    parser.add_argument("--specs", required=False, default=None, help="JSON string or file of TemplateSpecs")
    parser.add_argument("--output-json", required=True, help="Path to output JSON report")
    parser.add_argument("--output-annotated", required=False, default=None, help="Path to output annotated PDF")

    args = parser.parse_args()

    if not os.path.exists(args.draft):
        sys.stderr.write(f"Draft PDF not found: {args.draft}\n")
        sys.exit(2)

    with open(args.draft, "rb") as f:
        draft_bytes = f.read()

    template_bytes = None
    if args.template and os.path.exists(args.template):
        with open(args.template, "rb") as f:
            template_bytes = f.read()

    template_specs = None
    if args.specs:
        specs_str = args.specs
        if os.path.exists(args.specs):
            with open(args.specs, "r", encoding="utf-8") as f:
                specs_str = f.read()
        try:
            template_specs = TemplateSpecs.model_validate_json(specs_str)
        except Exception as e:
            sys.stderr.write(f"Warning: failed to parse template specs: {e}\n")

    try:
        engine = AuditEngine()
        result = engine.run(
            draft_bytes=draft_bytes,
            template_bytes=template_bytes,
            template_specs=template_specs,
        )
    except InvalidDocumentError as e:
        sys.stderr.write(f"Invalid document: {e}\n")
        sys.exit(3)
    except Exception as e:
        sys.stderr.write(f"Audit failed: {e}\n")
        sys.exit(4)

    with open(args.output_json, "w", encoding="utf-8") as f:
        json.dump(result.to_dict(), f, indent=2)

    if args.output_annotated and result.annotated_pdf:
        with open(args.output_annotated, "wb") as f:
            f.write(result.annotated_pdf)

    print(f"[OK] Audit completed successfully. Score: {result.overall_score}")


if __name__ == "__main__":
    main()
