from abc import ABC, abstractmethod
from typing import Any
import fitz


class BaseAuditModule(ABC):
    @abstractmethod
    def audit(self, doc: fitz.Document, **kwargs) -> Any:
        """Execute audit analysis on a PDF document."""
        pass

