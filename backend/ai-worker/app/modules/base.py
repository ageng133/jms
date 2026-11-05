from abc import ABC, abstractmethod
from typing import Any
import pymupdf as fitz


class BaseAuditModule(ABC):
    @abstractmethod
    def audit(self, doc: fitz.Document, **kwargs) -> Any:
        """Execute audit analysis on a PDF document."""
        pass

