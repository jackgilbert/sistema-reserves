#!/bin/bash

# Test API connectivity
echo "🧪 Testing API server..."

API_URL="http://localhost:3001"

# Test health/root endpoint
echo ""
echo "1. Testing API root..."
curl -s "${API_URL}/" || echo "❌ API server not responding"

# Test login endpoint
echo ""
echo "2. Testing login endpoint..."
curl -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-tenant-domain: localhost" \
  -d '{"email":"admin@museo.com","password":"admin123"}' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "✅ Test complete"
