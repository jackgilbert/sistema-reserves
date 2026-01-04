#!/bin/bash

echo "🔐 Detailed Login Test"
echo "====================="

# Test with verbose output
curl -v -X POST "http://localhost:3001/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-tenant-domain: localhost" \
  -d '{
    "email": "admin@museo.com",
    "password": "admin123"
  }' 2>&1 | grep -E "(HTTP|x-tenant|statusCode|message|accessToken)"

echo ""
echo ""
echo "📊 Testing tenant resolution directly..."
curl -s "http://localhost:3001/offerings" \
  -H "x-tenant-domain: localhost" | jq '.' || echo "No offerings endpoint or jq not available"
