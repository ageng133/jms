#!/usr/bin/env bash
set -e

GATEWAY_URL="http://localhost:8080"
echo "=== 🔒 Format Kilat Security Regression Test Suite ==="

# 1. Test Path Traversal in Upload Key
echo -n "[1/5] Testing Path Traversal rejection in upload key... "
TRAVERSAL_RESP=$(curl -s -w "\n%{http_code}" -X PUT "${GATEWAY_URL}/api/v1/files/upload?key=../../secret.txt" -d "malicious content")
TRAVERSAL_CODE=$(echo "$TRAVERSAL_RESP" | tail -n1)
if [ "$TRAVERSAL_CODE" -eq 400 ]; then
  echo "✅ PASSED (HTTP 400 Bad Request returned as expected)"
else
  echo "❌ FAILED (Expected 400, got $TRAVERSAL_CODE)"
  exit 1
fi

# 2. Test Path Traversal in Download Key
echo -n "[2/5] Testing Path Traversal rejection in download key... "
DOWNLOAD_TRAVERSAL_RESP=$(curl -s -w "\n%{http_code}" "${GATEWAY_URL}/api/v1/files/download?key=../../.env")
DOWNLOAD_TRAVERSAL_CODE=$(echo "$DOWNLOAD_TRAVERSAL_RESP" | tail -n1)
if [ "$DOWNLOAD_TRAVERSAL_CODE" -eq 400 ]; then
  echo "✅ PASSED (HTTP 400 Bad Request returned as expected)"
else
  echo "❌ FAILED (Expected 400, got $DOWNLOAD_TRAVERSAL_CODE)"
  exit 1
fi

# 3. Test Invalid PDF Header Magic Bytes
echo -n "[3/5] Testing Magic Bytes validation (fake PDF payload)... "
FAKE_PDF_RESP=$(curl -s -w "\n%{http_code}" -X PUT "${GATEWAY_URL}/api/v1/files/upload?key=test_submissions/fake.pdf" -d "This is plain text pretending to be a PDF")
FAKE_PDF_CODE=$(echo "$FAKE_PDF_RESP" | tail -n1)
if [ "$FAKE_PDF_CODE" -eq 400 ]; then
  echo "✅ PASSED (HTTP 400 Bad Request returned, non-PDF rejected)"
else
  echo "❌ FAILED (Expected 400, got $FAKE_PDF_CODE)"
  exit 1
fi

# 4. Test Valid PDF Upload & Download
echo -n "[4/5] Testing Valid PDF Upload with %PDF header... "
VALID_PDF_KEY="test_submissions/valid_test.pdf"
VALID_PAYLOAD=$(printf "%%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%%%EOF")
VALID_UPLOAD_RESP=$(curl -s -w "\n%{http_code}" -X PUT "${GATEWAY_URL}/api/v1/files/upload?key=${VALID_PDF_KEY}" --data-binary "$VALID_PAYLOAD")
VALID_UPLOAD_CODE=$(echo "$VALID_UPLOAD_RESP" | tail -n1)
if [ "$VALID_UPLOAD_CODE" -eq 200 ]; then
  echo "✅ Upload PASSED"
else
  echo "❌ Upload FAILED (Expected 200, got $VALID_UPLOAD_CODE)"
  exit 1
fi

echo -n "      Testing Valid PDF Download... "
DOWNLOAD_CONTENT=$(curl -s "${GATEWAY_URL}/api/v1/files/download?key=${VALID_PDF_KEY}")
if echo "$DOWNLOAD_CONTENT" | grep -q "%PDF-1.4"; then
  echo "✅ Download PASSED (Magic byte verified in downloaded content)"
else
  echo "❌ Download FAILED"
  exit 1
fi

# 5. Test Maximum Upload Size Limit Enforcement (>35MB)
echo -n "[5/5] Testing 35MB Upload Limit enforcement... "
# Create a 36MB sparse/dummy file starting with %PDF-1.4 to test size boundary
TEMP_OVERSIZED="/tmp/oversized_test.pdf"
python3 -c "
with open('$TEMP_OVERSIZED', 'wb') as f:
    f.write(b'%PDF-1.4\n' + b'0' * (36 * 1024 * 1024))
"
OVERSIZED_RESP=$(curl -s -w "\n%{http_code}" -X PUT "${GATEWAY_URL}/api/v1/files/upload?key=test_submissions/oversized.pdf" --data-binary "@$TEMP_OVERSIZED")
OVERSIZED_CODE=$(echo "$OVERSIZED_RESP" | tail -n1)
rm -f "$TEMP_OVERSIZED"

if [ "$OVERSIZED_CODE" -eq 400 ]; then
  echo "✅ PASSED (HTTP 400 Bad Request returned, oversized payload rejected)"
else
  echo "❌ FAILED (Expected 400, got $OVERSIZED_CODE)"
  exit 1
fi

echo "========================================================"
echo "🎉 ALL 5 SECURITY REGRESSION TESTS PASSED DETERMINISTICALLY!"
echo "========================================================"

