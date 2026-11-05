"""
Single scoring rule for an audit. Mirrored in Go (domain.ScoreAudit) so that
every engine (PyMuPDF worker, Gemini) produces comparable scores.

- critical_errors = number of DISTINCT failed layout rules (e.g. MARGIN_TOP,
  COLUMN_LAYOUT). A margin breach that affects 40 text blocks is one problem
  to fix, not 40.
- warnings = anonymization leaks + uncited references + missing citations.
- score = 100 - 15 * critical_errors - 5 * warnings, clamped to [0, 100].
- PASS iff there are no critical errors and at most 2 warnings.
"""
from typing import Iterable

CRITICAL_PENALTY = 15
WARNING_PENALTY = 5
MAX_WARNINGS_FOR_PASS = 2


def compute_summary(failed_rules: Iterable[str], warnings: int) -> dict:
    critical_errors = len(set(failed_rules))
    score = 100 - critical_errors * CRITICAL_PENALTY - warnings * WARNING_PENALTY
    score = max(0, min(100, score))
    status = "PASS" if critical_errors == 0 and warnings <= MAX_WARNINGS_FOR_PASS else "FAIL"
    return {
        "overall_score": score,
        "critical_errors": critical_errors,
        "warnings": warnings,
        "status": status,
    }
