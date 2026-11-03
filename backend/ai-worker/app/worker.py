import json
import logging
import signal
import sys
import time
import fitz
import redis

from app.config import settings
from app.db.repository import DBRepository
from app.models.audit import (
    AuditModules,
    AuditReport,
    AuditSummary,
    WorkerJobPayload,
)
from app.modules.annotator import VisualPDFAnnotator
from app.modules.anonymization import AnonymizationAuditor
from app.modules.citation import CitationAuditor
from app.modules.layout import LayoutAuditor
from app.storage.s3 import S3Client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [AI-Worker] %(message)s",
)
logger = logging.getLogger("jms-ai-worker")


class PreSubmissionAuditEngine:
    def __init__(self):
        self.s3 = S3Client()
        self.db = DBRepository()
        self.layout_auditor = LayoutAuditor()
        self.anonymization_auditor = AnonymizationAuditor()
        self.citation_auditor = CitationAuditor()
        self.annotator = VisualPDFAnnotator()

    def execute_audit(self, payload: WorkerJobPayload) -> AuditReport:
        logger.info(f"Starting audit job: audit_id={payload.audit_id}, manuscript_id={payload.manuscript_id}")
        self.db.mark_audit_processing(payload.audit_id)

        # 1. Fetch file from S3
        file_bytes = self.s3.download_file_bytes(payload.s3_key)
        doc = fitz.open(stream=file_bytes, filetype="pdf")

        all_annotations = []

        # 2. Run Module 1: Layout & Geometry
        layout_res, layout_annots = self.layout_auditor.audit(doc)
        all_annotations.extend(layout_annots)

        # 3. Run Module 2: Anonymization Double-Blind
        anon_res, anon_annots = self.anonymization_auditor.audit(doc)
        all_annotations.extend(anon_annots)

        # 4. Run Module 3: Citation Integrity
        cite_res, cite_annots = self.citation_auditor.audit(doc)
        all_annotations.extend(cite_annots)

        # 5. Run Module 4: Visual PDF Annotations
        annotated_pdf_s3_key = None
        if len(all_annotations) > 0:
            annotated_bytes = self.annotator.annotate_document(doc, all_annotations)
            annotated_pdf_s3_key = f"audits/annotated_{payload.audit_id}.pdf"
            self.s3.upload_file_bytes(annotated_pdf_s3_key, annotated_bytes, "application/pdf")
            logger.info(f"Uploaded annotated PDF with {len(all_annotations)} annotations to {annotated_pdf_s3_key}")

        doc.close()

        # 6. Score & Summary Computation
        critical_errors = len([c for c in layout_res.checks if not c.passed])
        warnings = (
            len(anon_res.leaks_found)
            + len(cite_res.uncited_references)
            + len(cite_res.missing_citations)
        )

        overall_score = max(0, 100 - (critical_errors * 15 + warnings * 5))
        status = "PASS" if critical_errors == 0 and warnings <= 2 else "FAIL"

        summary = AuditSummary(
            critical_errors=critical_errors,
            warnings=warnings,
            status=status,
        )

        modules = AuditModules(
            geometry_and_layout=layout_res,
            anonymization=anon_res,
            citation_crosscheck=cite_res,
        )

        report = AuditReport(
            audit_id=payload.audit_id,
            manuscript_id=payload.manuscript_id,
            overall_score=overall_score,
            summary=summary,
            modules=modules,
            annotated_pdf_s3_key=annotated_pdf_s3_key,
        )

        # 7. Persist to DB
        self.db.save_audit_report(report, payload.manuscript_id)
        logger.info(f"Audit completed: audit_id={payload.audit_id}, score={overall_score}, status={status}")
        return report


class WorkerConsumer:
    def __init__(self):
        self.redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            password=settings.REDIS_PASSWORD or None,
            db=settings.REDIS_DB,
            decode_responses=True,
        )
        self.queue_name = settings.REDIS_AUDIT_QUEUE
        self.engine = PreSubmissionAuditEngine()
        self.running = True

        signal.signal(signal.SIGINT, self.shutdown)
        signal.signal(signal.SIGTERM, self.shutdown)

    def shutdown(self, signum, frame):
        logger.info("Shutdown signal received. Stopping worker loop...")
        self.running = False

    def start(self):
        logger.info(f"Worker listening on Redis queue: '{self.queue_name}' at {settings.REDIS_HOST}:{settings.REDIS_PORT}")
        while self.running:
            try:
                item = self.redis_client.brpop(self.queue_name, timeout=2)
                if item is None:
                    continue

                _, raw_data = item
                data = json.loads(raw_data)
                payload = WorkerJobPayload(**data)

                try:
                    self.engine.execute_audit(payload)
                except Exception as ex:
                    logger.error(f"Audit execution failed for audit_id={payload.audit_id}: {ex}", exc_info=True)
                    self.engine.db.mark_audit_failed(payload.audit_id, str(ex))

            except redis.ConnectionError as r_err:
                logger.warning(f"Redis connection error: {r_err}. Retrying in 5 seconds...")
                time.sleep(5)
            except Exception as e:
                logger.error(f"Unexpected worker loop error: {e}", exc_info=True)
                time.sleep(1)

        logger.info("Worker stopped cleanly.")


if __name__ == "__main__":
    consumer = WorkerConsumer()
    consumer.start()
