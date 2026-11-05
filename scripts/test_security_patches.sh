#!/usr/bin/env bash
# ==============================================================================
# Format Kilat - Security regression tests for the file upload/download API.
#
# The file endpoints require a signed-in user and only accept storage keys that
# belong to that user's manuscripts (raw/<manuscript-id>/...). This script signs
# in with demo login, creates a draft and gets a real upload key, then checks:
#   1. path traversal in the upload key            -> 400
#   2. path traversal in the download key          -> 400
#   3. fake PDF (wrong magic bytes)                -> 400
#   4. valid PDF upload + download round trip      -> 200, body starts with %PDF
#   5. upload larger than MAX_UPLOAD_MB (35 MB)    -> 413 PAYLOAD_TOO_LARGE
#   6. anonymous upload/download                   -> 401
#   7. another user downloading the file           -> 403
#
# Requirements: gateway running with AUTH_DEMO_LOGIN=true (the dev default).
# Usage: scripts/test_security_patches.sh
#        BASE_URL=http://host:8080/api/v1 scripts/test_security_patches.sh
# ==============================================================================
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080/api/v1}"
TS=$(date +%s)
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

pass() { echo "✅ PASSED ($*)"; }
fail() { echo "❌ FAILED ($*)"; exit 1; }
json_str() { echo "$1" | grep -o "\"$2\":\"[^\"]*\"" | head -1 | sed "s/\"$2\":\"\\([^\"]*\\)\"/\\1/"; }
# http_code <curl args...> -> prints only the HTTP status
http_code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

login() {
  local resp
  resp=$(curl -s -X POST "${BASE_URL}/auth/google" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1@uts.edu.au\",\"full_name\":\"Security Test $1\"}")
  json_str "$resp" token
}

echo "=== 🔒 Format Kilat Security Regression Test Suite (${BASE_URL}) ==="

# Setup: user, draft manuscript and a legitimate upload key ---------------------
TOKEN=$(login "sec.owner.${TS}")
[ -n "$TOKEN" ] || { echo "❌ demo login failed (is AUTH_DEMO_LOGIN enabled?)"; exit 1; }
AUTH="Authorization: Bearer ${TOKEN}"
DRAFT=$(curl -s -X POST "${BASE_URL}/manuscripts" -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"title":"Security regression draft","abstract":"Automated security test.","keywords":["security"]}')
MID=$(json_str "$DRAFT" id)
[ -n "$MID" ] || { echo "❌ could not create draft: $DRAFT"; exit 1; }
PRESIGN=$(curl -s -X POST "${BASE_URL}/manuscripts/${MID}/files/presign" -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"filename":"draft.pdf","file_type":"PDF","file_role":"MANUSCRIPT"}')
KEY=$(json_str "$PRESIGN" s3_key)
[ -n "$KEY" ] || { echo "❌ presign failed: $PRESIGN"; exit 1; }
echo "    setup: manuscript ${MID}, key ${KEY}"

# 1. Path traversal in the upload key -----------------------------------------
echo -n "[1/7] Path traversal rejected in upload key... "
CODE=$(http_code -X PUT "${BASE_URL}/files/upload?key=raw/${MID}/../../secret.txt" -H "$AUTH" -d "malicious content")
[ "$CODE" = "400" ] && pass "HTTP 400" || fail "expected 400, got $CODE"

# 2. Path traversal in the download key ---------------------------------------
echo -n "[2/7] Path traversal rejected in download key... "
CODE=$(http_code "${BASE_URL}/files/download?key=../../.env" -H "$AUTH")
[ "$CODE" = "400" ] && pass "HTTP 400" || fail "expected 400, got $CODE"

# 3. Fake PDF (wrong magic bytes) ---------------------------------------------
echo -n "[3/7] Magic bytes validation (fake PDF payload)... "
CODE=$(http_code -X PUT "${BASE_URL}/files/upload?key=${KEY}" -H "$AUTH" -H "Content-Type: application/pdf" \
  -d "This is plain text pretending to be a PDF")
[ "$CODE" = "400" ] && pass "HTTP 400, non-PDF rejected" || fail "expected 400, got $CODE"

# 4. Valid PDF upload + download ----------------------------------------------
echo -n "[4/7] Valid PDF upload with %PDF header... "
VALID="${TMP_DIR}/valid.pdf"
printf '%%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%%%EOF\n' > "$VALID"
CODE=$(http_code -X PUT "${BASE_URL}/files/upload?key=${KEY}" -H "$AUTH" -H "Content-Type: application/pdf" --data-binary "@${VALID}")
[ "$CODE" = "200" ] && pass "HTTP 200" || fail "expected 200, got $CODE"

echo -n "      Valid PDF download... "
curl -s "${BASE_URL}/files/download?key=${KEY}" -H "$AUTH" -o "${TMP_DIR}/down.pdf"
head -c 8 "${TMP_DIR}/down.pdf" | grep -q "%PDF-1.4" && pass "magic bytes verified" || fail "downloaded content is not the uploaded PDF"

# 5. Upload size limit ----------------------------------------------------------
echo -n "[5/7] Upload limit enforcement (36 MB > MAX_UPLOAD_MB=35)... "
BIG="${TMP_DIR}/oversized.pdf"
{ printf '%%PDF-1.4\n'; head -c $((36 * 1024 * 1024)) /dev/zero; } > "$BIG"
CODE=$(http_code -X PUT "${BASE_URL}/files/upload?key=${KEY}" -H "$AUTH" -H "Content-Type: application/pdf" --data-binary "@${BIG}" || true)
[ "$CODE" = "413" ] && pass "HTTP 413 PAYLOAD_TOO_LARGE" || fail "expected 413, got $CODE"

# 6. Anonymous access -----------------------------------------------------------
echo -n "[6/7] Anonymous upload/download blocked... "
UP=$(http_code -X PUT "${BASE_URL}/files/upload?key=${KEY}" --data-binary "@${VALID}")
DOWN=$(http_code "${BASE_URL}/files/download?key=${KEY}")
[ "$UP" = "401" ] && [ "$DOWN" = "401" ] && pass "HTTP 401 / 401" || fail "expected 401/401, got $UP/$DOWN"

# 7. Another user cannot read the file ----------------------------------------
echo -n "[7/7] Other user cannot download someone else's file... "
OTHER=$(login "sec.intruder.${TS}")
CODE=$(http_code "${BASE_URL}/files/download?key=${KEY}" -H "Authorization: Bearer ${OTHER}")
[ "$CODE" = "403" ] || [ "$CODE" = "404" ] && pass "HTTP $CODE" || fail "expected 403, got $CODE"

echo "========================================================"
echo "🎉 ALL 7 SECURITY REGRESSION TESTS PASSED"
echo "========================================================"
