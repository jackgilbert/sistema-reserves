#!/usr/bin/env bash
set -euo pipefail

# Replays a captured Redsys merchantURL notification against the running app.
#
# Usage:
#   TENANT_DOMAIN=localhost \
#   TARGET_URL=http://localhost:3000/api/payments/redsys/notify \
#   bash scripts/redsys-replay-notify.sh \
#     '<Ds_MerchantParameters_base64>' \
#     '<Ds_Signature_base64>' \
#     'HMAC_SHA256_V1'
#
# Notes:
# - If you copy/paste a signature from a x-www-form-urlencoded source, '+' might have been turned into spaces.
#   This script does NOT modify the provided values. Pass them exactly as captured.

MERCHANT_PARAMETERS=${1:-}
SIGNATURE=${2:-}
SIGNATURE_VERSION=${3:-HMAC_SHA256_V1}

if [[ -z "${MERCHANT_PARAMETERS}" || -z "${SIGNATURE}" ]]; then
  echo "Usage: bash scripts/redsys-replay-notify.sh '<Ds_MerchantParameters>' '<Ds_Signature>' [Ds_SignatureVersion]" >&2
  exit 1
fi

TENANT_DOMAIN=${TENANT_DOMAIN:-localhost}
TARGET_URL=${TARGET_URL:-http://localhost:3000/api/payments/redsys/notify}

curl -sS -X POST "${TARGET_URL}" \
  -H "x-tenant-domain: ${TENANT_DOMAIN}" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "Ds_SignatureVersion=${SIGNATURE_VERSION}" \
  --data-urlencode "Ds_MerchantParameters=${MERCHANT_PARAMETERS}" \
  --data-urlencode "Ds_Signature=${SIGNATURE}"

echo
