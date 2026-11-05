import json
import logging
import signal
import sys
import time
import redis

from app.config import settings
from app.db.repository import DBRepository
from app.engine import AuditEngine
from app.models.audit import AuditReport, WorkerJobPayload
from app.storage.s3 import S3Client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [AI-Worker] %(message)s",
)
logger = logging.getLogger("jms-ai-worker")


class PreSubmissionAuditEngine:
    """Redis/S3 job adapter around the storage-agnostic AuditEngine."""

    def __init__(self):
        self.s3 = S3Client()
        self.db = DBRepository()
        self.engine = AuditEngine()

    def execute_audit(self, payload: WorkerJobPayload) -> AuditReport:
        logger.info(
            f"Starting audit job: audit_id={payload.audit_id}, manuscript_id={payload.manuscript_id}, "
            f"template_s3_key={payload.template_s3_key}"
        )
        self.db.mark_audit_processing(payload.audit_id)

        template_bytes = None
        if payload.template_s3_key:
            try:
                template_bytes = self.s3.download_file_bytes(payload.template_s3_key)
            except Exception as e:
                logger.warning(f"Could not download template PDF: {e}. Falling back to default layout specs.")

        draft_bytes = self.s3.download_file_bytes(payload.s3_key)
        result = self.engine.run(draft_bytes, template_bytes)

        annotated_pdf_s3_key = None
        if result.annotated_pdf:
            annotated_pdf_s3_key = f"audits/annotated_{payload.audit_id}.pdf"
            self.s3.upload_file_bytes(annotated_pdf_s3_key, result.annotated_pdf, "application/pdf")
            logger.info(f"Uploaded annotated PDF with {result.annotation_count} annotations to {annotated_pdf_s3_key}")

        report = AuditReport(
            audit_id=payload.audit_id,
            manuscript_id=payload.manuscript_id,
            overall_score=result.overall_score,
            summary=result.summary,
            modules=result.modules,
            template_specs=result.template_specs,
            annotated_pdf_s3_key=annotated_pdf_s3_key,
        )

        self.db.save_audit_report(report, payload.manuscript_id)
        logger.info(f"Audit completed: audit_id={payload.audit_id}, score={report.overall_score}, status={report.summary.status}")
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

