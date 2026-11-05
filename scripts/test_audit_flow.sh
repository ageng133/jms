#!/usr/bin/env bash
# ==============================================================================
# Format Kilat (JMS) - Live pre-submission audit smoke test
#
# Exercises the real pipeline end to end:
#   login -> create draft -> presign -> upload PDF -> confirm (template preset)
#   -> poll audit until COMPLETED -> download annotated PDF
#
# Requirements: the gateway (AUTH_DEMO_LOGIN=true) and the audit worker
# (make run-worker) must be running. Only curl, grep and sed are needed.
#
# Usage: scripts/test_audit_flow.sh [preset]      (default preset: ieee)
#        BASE_URL=http://host:8080/api/v1 scripts/test_audit_flow.sh acm
# ==============================================================================
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080/api/v1}"
PRESET="${1:-ieee}"
TS=$(date +%s)
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

pass() { echo "  ✅ $*"; }
fail() { echo "  ❌ $*"; exit 1; }
# json_str <json> <key>  -> first string value of "key"
json_str() { echo "$1" | grep -o "\"$2\":\"[^\"]*\"" | head -1 | sed "s/\"$2\":\"\\([^\"]*\\)\"/\\1/"; }
# json_num <json> <key>  -> first numeric value of "key"
json_num() { echo "$1" | grep -o "\"$2\":[0-9.]*" | head -1 | sed "s/\"$2\"://"; }

echo "=================================================================="
echo " Format Kilat audit smoke test  (base: ${BASE_URL}, preset: ${PRESET})"
echo "=================================================================="

# 1. Liveness + engine status --------------------------------------------------
echo "[1/6] Gateway liveness"
curl -sf "${BASE_URL%/api/v1}/healthz" | grep -q HEALTHY || fail "gateway unreachable at ${BASE_URL%/api/v1}/healthz"
pass "gateway healthy"

# 2. Demo login ------------------------------------------------------------------
echo "[2/6] Demo sign-in"
LOGIN=$(curl -s -X POST "${BASE_URL}/auth/google" -H "Content-Type: application/json" \
  -d "{\"email\":\"smoke.${TS}@uts.edu.au\",\"full_name\":\"Smoke Test ${TS}\"}")
TOKEN=$(json_str "$LOGIN" token)
[ -n "$TOKEN" ] || fail "login failed (is AUTH_DEMO_LOGIN enabled?): $LOGIN"
AUTH="Authorization: Bearer ${TOKEN}"
pass "signed in"

STATUS=$(curl -s -H "$AUTH" "${BASE_URL}/system/status")
echo "      system status: $(echo "$STATUS" | grep -o '"engines":\[[^]]*\]')"
echo "$STATUS" | grep -q '"status":"online"\|"status":"configured"' || fail "no audit engine reachable; start it with: make run-worker"

# 3. Draft manuscript ----------------------------------------------------------
echo "[3/6] Create draft manuscript"
DRAFT=$(curl -s -X POST "${BASE_URL}/manuscripts" -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"title":"Smoke test manuscript","abstract":"Automated smoke test.","keywords":["smoke"]}')
MID=$(json_str "$DRAFT" id)
[ -n "$MID" ] || fail "draft not created: $DRAFT"
pass "manuscript ${MID}"

# 4. Upload a small PDF (contains an author e-mail and an uncited reference) ----
echo "[4/6] Upload manuscript PDF"
PDF="${TMP_DIR}/draft.pdf"
STREAM='BT /F1 11 Tf 20 800 Td (Contact: smoke.author@uts.edu.au) Tj 0 -20 Td (Prior work [1] matters.) Tj 0 -700 Td (References) Tj 0 -14 Td ([1] A. Smith, Formatting, 2020.) Tj 0 -14 Td ([2] B. Jones, Unused, 2021.) Tj ET'
{
  printf '%%PDF-1.4\n'
  printf '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n'
  printf '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n'
  printf '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n'
  printf '4 0 obj << /Length %d >> stream\n%s\nendstream endobj\n' "${#STREAM}" "$STREAM"
  printf '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n'
  printf 'trailer << /Root 1 0 R >>\n%%%%EOF\n'
} > "$PDF"
SIZE=$(wc -c < "$PDF" | tr -d ' ')

PRESIGN=$(curl -s -X POST "${BASE_URL}/manuscripts/${MID}/files/presign" -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"filename":"draft.pdf","file_type":"PDF","file_role":"MANUSCRIPT"}')
KEY=$(json_str "$PRESIGN" s3_key)
URL=$(json_str "$PRESIGN" upload_url | sed 's/\\u0026/\&/g')
[ -n "$KEY" ] && [ -n "$URL" ] || fail "presign failed: $PRESIGN"
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X PUT "$URL" -H "$AUTH" -H "Content-Type: application/pdf" --data-binary "@${PDF}")
[ "$CODE" = "200" ] || fail "upload returned HTTP ${CODE}"
pass "uploaded ${SIZE} bytes -> ${KEY}"

# 5. Confirm + poll -------------------------------------------------------------
echo "[5/6] Confirm submission and wait for the audit"
CONFIRM=$(curl -s -X POST "${BASE_URL}/manuscripts/${MID}/files/confirm" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"draft_file\":{\"file_type\":\"PDF\",\"s3_key\":\"${KEY}\",\"original_filename\":\"draft.pdf\",\"file_size_bytes\":${SIZE}},\"template_preset\":\"${PRESET}\"}")
AID=$(json_str "$CONFIRM" audit_id)
[ -n "$AID" ] || fail "confirm failed: $CONFIRM"

AUDIT=""; ASTATUS=""
for _ in $(seq 1 90); do
  AUDIT=$(curl -s -H "$AUTH" "${BASE_URL}/audits/${AID}")
  ASTATUS=$(echo "$AUDIT" | grep -o '"status":"\(QUEUED\|PROCESSING\|COMPLETED\|FAILED\)"' | head -1 | cut -d'"' -f4)
  [ "$ASTATUS" = "COMPLETED" ] || [ "$ASTATUS" = "FAILED" ] && break
  sleep 1
done
[ "$ASTATUS" = "COMPLETED" ] || fail "audit ${AID} ended as '${ASTATUS}': $(json_str "$AUDIT" error_message)"
pass "audit ${AID} COMPLETED (engine $(json_str "$AUDIT" engine), score $(json_num "$AUDIT" score_overall))"
echo "$AUDIT" | grep -q 'smoke.author@uts.edu.au' && pass "e-mail leak detected" || fail "e-mail leak not detected"
echo "$AUDIT" | grep -q 'B. Jones' && pass "uncited reference detected" || fail "uncited reference not detected"

# 6. Annotated PDF ------------------------------------------------------------
echo "[6/6] Download annotated PDF"
ANN=$(json_str "$AUDIT" annotated_pdf_s3_key)
[ -n "$ANN" ] || fail "no annotated PDF key"
curl -s -o "${TMP_DIR}/annotated.pdf" -H "$AUTH" "${BASE_URL}/files/download?key=${ANN}"
head -c 5 "${TMP_DIR}/annotated.pdf" | grep -q '%PDF-' || fail "annotated PDF download is not a PDF"
CODE=$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}/files/download?key=${ANN}")
[ "$CODE" = "401" ] || fail "anonymous download should be 401, got ${CODE}"
pass "annotated PDF downloaded; anonymous access blocked (401)"

echo "=================================================================="
echo " 🎉 Audit smoke test PASSED"
echo "=================================================================="
