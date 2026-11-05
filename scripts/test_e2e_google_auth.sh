#!/usr/bin/env bash
set -e

# ==============================================================================
# JMS End-to-End (E2E) Google SSO & Author Role Verification Script
# Portable for macOS and Linux
# ==============================================================================

BASE_URL="http://localhost:8080/api/v1"
TIMESTAMP=$(date +%s)
TEST_AUTHOR_EMAIL="author.${TIMESTAMP}@uts.edu.au"
TEST_AUTHOR_NAME="Dr. Test Author ${TIMESTAMP}"
TMP_DIR="/tmp/jms_e2e_test_${TIMESTAMP}"
mkdir -p "${TMP_DIR}"

cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

echo "===================================================================="
echo "🧪 Starting JMS Google Auth SSO & Author Default Role E2E Verification"
echo "Target Base URL: ${BASE_URL}"
echo "===================================================================="

assert_status() {
  local test_name="$1"
  local actual_code="$2"
  local expected_code="$3"

  if [ "$actual_code" -eq "$expected_code" ]; then
    echo "  ✅ PASS: ${test_name} (HTTP ${actual_code})"
  else
    echo "  ❌ FAIL: ${test_name} (Expected HTTP ${expected_code}, got HTTP ${actual_code})"
    exit 1
  fi
}

# ------------------------------------------------------------------------------
# TEST 1: Unauthenticated Guard Verification
# ------------------------------------------------------------------------------
echo ""
echo "[Test 1] Verifying that unauthenticated calls are blocked with HTTP 401..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/auth/me")
assert_status "Unauthenticated GET /auth/me blocked" "$HTTP_CODE" 401

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/manuscripts")
assert_status "Unauthenticated GET /manuscripts blocked" "$HTTP_CODE" 401

# ------------------------------------------------------------------------------
# TEST 2: Brand New Google User Signs In -> Strictly Assigned AUTHOR Role
# ------------------------------------------------------------------------------
echo ""
echo "[Test 2] Testing Google SSO registration for brand new user (${TEST_AUTHOR_EMAIL})..."
AUTH_CODE=$(curl -s -o "${TMP_DIR}/auth.json" -w "%{http_code}" -X POST "${BASE_URL}/auth/google" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'"${TEST_AUTHOR_EMAIL}"'",
    "full_name": "'"${TEST_AUTHOR_NAME}"'",
    "affiliation": "UTS Faculty of Engineering & IT"
  }')
assert_status "Google SSO Registration" "$AUTH_CODE" 200

AUTHOR_TOKEN=$(grep -o '"token":"[^"]*' "${TMP_DIR}/auth.json" | cut -d'"' -f4)
AUTHOR_ROLE=$(grep -o '"role":"[^"]*' "${TMP_DIR}/auth.json" | cut -d'"' -f4)

if [ -z "$AUTHOR_TOKEN" ]; then
  echo "  ❌ FAIL: Failed to obtain JWT token for new Google user"
  cat "${TMP_DIR}/auth.json"
  exit 1
fi

echo "  ✅ Token generated successfully: ${AUTHOR_TOKEN:0:25}..."

if [ "$AUTHOR_ROLE" = "AUTHOR" ]; then
  echo "  ✅ PASS: New Google user is strictly registered as AUTHOR (Role: ${AUTHOR_ROLE})"
else
  echo "  ❌ FAIL: Expected role AUTHOR, got ${AUTHOR_ROLE}"
  exit 1
fi

# ------------------------------------------------------------------------------
# TEST 3: Dynamic Session Invariant Check (GET /auth/me)
# ------------------------------------------------------------------------------
echo ""
echo "[Test 3] Verifying session validation via GET /auth/me with Author Token..."
ME_CODE=$(curl -s -o "${TMP_DIR}/me.json" -w "%{http_code}" -X GET "${BASE_URL}/auth/me" \
  -H "Authorization: Bearer ${AUTHOR_TOKEN}")

assert_status "GET /auth/me with valid Bearer token" "$ME_CODE" 200

ME_EMAIL=$(grep -o '"email":"[^"]*' "${TMP_DIR}/me.json" | cut -d'"' -f4)
ME_ROLE=$(grep -o '"role":"[^"]*' "${TMP_DIR}/me.json" | cut -d'"' -f4)

if [ "$ME_EMAIL" = "$TEST_AUTHOR_EMAIL" ] && [ "$ME_ROLE" = "AUTHOR" ]; then
  echo "  ✅ PASS: Identity matches database record (${ME_EMAIL}, Role: ${ME_ROLE})"
else
  echo "  ❌ FAIL: Identity mismatch (${ME_EMAIL}, Role: ${ME_ROLE})"
  exit 1
fi

# ------------------------------------------------------------------------------
# TEST 4: Author Creates Manuscript Submission
# ------------------------------------------------------------------------------
echo ""
echo "[Test 4] Submitting manuscript draft as Author..."
SUBMISSION_CODE=$(curl -s -o "${TMP_DIR}/submission.json" -w "%{http_code}" -X POST "${BASE_URL}/manuscripts" \
  -H "Authorization: Bearer ${AUTHOR_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "E2E Verification Paper: Microservices Memory Pipelines",
    "abstract": "Automated verification test ensuring Google SSO and Author role permissions function seamlessly end-to-end.",
    "keywords": ["E2E", "Testing", "GoogleSSO", "JMS"]
  }')

assert_status "Author creates draft manuscript" "$SUBMISSION_CODE" 201

MANUSCRIPT_ID=$(grep -o '"id":"[^"]*' "${TMP_DIR}/submission.json" | head -n 1 | cut -d'"' -f4)
echo "  ✅ Draft Manuscript Created with UUID: ${MANUSCRIPT_ID}"

# ------------------------------------------------------------------------------
# TEST 5: Managing Editor Account Verification
# ------------------------------------------------------------------------------
echo ""
echo "[Test 5] Authenticating designated Managing Editor (editor.google@uts.edu.au)..."
EDITOR_CODE=$(curl -s -o "${TMP_DIR}/editor.json" -w "%{http_code}" -X POST "${BASE_URL}/auth/google" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "editor.google@uts.edu.au",
    "full_name": "Prof. Dr. Sarah Connor",
    "role": "ADMIN",
    "affiliation": "UTS Editorial Board"
  }')
assert_status "Editor Google SSO" "$EDITOR_CODE" 200

EDITOR_TOKEN=$(grep -o '"token":"[^"]*' "${TMP_DIR}/editor.json" | cut -d'"' -f4)
EDITOR_ROLE=$(grep -o '"role":"[^"]*' "${TMP_DIR}/editor.json" | cut -d'"' -f4)

if [ "$EDITOR_ROLE" = "ADMIN" ] || [ "$EDITOR_ROLE" = "EDITOR" ]; then
  echo "  ✅ PASS: Designated editorial account authenticated with ${EDITOR_ROLE} role"
else
  echo "  ❌ FAIL: Expected role ADMIN or EDITOR, got ${EDITOR_ROLE}"
  exit 1
fi

# ------------------------------------------------------------------------------
# TEST 6: Editor Triages Manuscript Status
# ------------------------------------------------------------------------------
echo ""
echo "[Test 6] Editor updates paper status to ACCEPTED..."
STATUS_CODE=$(curl -s -o "${TMP_DIR}/status.json" -w "%{http_code}" -X PATCH "${BASE_URL}/manuscripts/${MANUSCRIPT_ID}/status" \
  -H "Authorization: Bearer ${EDITOR_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"status": "ACCEPTED"}')

assert_status "Editor updates manuscript status to ACCEPTED" "$STATUS_CODE" 200

# ------------------------------------------------------------------------------
# TEST 6b: Authorization guards (P1 hardening)
# ------------------------------------------------------------------------------
echo ""
echo "[Test 6b] Verifying role, ownership and storage guards..."
AUTHOR_PATCH_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "${BASE_URL}/manuscripts/${MANUSCRIPT_ID}/status" \
  -H "Authorization: Bearer ${AUTHOR_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"status": "ACCEPTED"}')
assert_status "Author cannot accept own manuscript" "$AUTHOR_PATCH_CODE" 403

ANON_DOWNLOAD_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/files/download?key=raw/${MANUSCRIPT_ID}/x.pdf")
assert_status "Anonymous file download rejected" "$ANON_DOWNLOAD_CODE" 401

TRAVERSAL_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT \
  "${BASE_URL}/files/upload?key=raw/${MANUSCRIPT_ID}/../../../../evil.pdf" \
  -H "Authorization: Bearer ${AUTHOR_TOKEN}" \
  --data-binary "%PDF-1.4 test")
assert_status "Path traversal upload rejected" "$TRAVERSAL_CODE" 400

ROLE_ESCALATION_ROLE=$(curl -s -X POST "${BASE_URL}/auth/google" \
  -H "Content-Type: application/json" \
  -d '{"email": "escalation.test.'"$(date +%s)"'@uts.edu.au", "full_name": "Mallory", "role": "ADMIN"}' \
  | grep -o '"role":"[^"]*' | cut -d'"' -f4)
if [ "$ROLE_ESCALATION_ROLE" = "AUTHOR" ]; then
  echo "  ✅ PASS: Client-supplied role is ignored (got AUTHOR)"
else
  echo "  ❌ FAIL: Role escalation possible, got ${ROLE_ESCALATION_ROLE}"
  exit 1
fi

# ------------------------------------------------------------------------------
# TEST 7: Tampered Token Rejection
# ------------------------------------------------------------------------------
echo ""
echo "[Test 7] Verifying that forged or tampered tokens are rejected..."
TAMPERED_TOKEN="${AUTHOR_TOKEN}tampered"
TAMPER_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/auth/me" \
  -H "Authorization: Bearer ${TAMPERED_TOKEN}")

assert_status "Forged token rejected" "$TAMPER_CODE" 401

echo ""
echo "===================================================================="
echo "🎉 ALL E2E GOOGLE SSO & AUTHOR ROLE TESTS PASSED (100% SUCCESS)!"
echo "===================================================================="
