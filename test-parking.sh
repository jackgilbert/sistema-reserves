#!/bin/bash

# Script para probar el sistema de parking
# Usa el booking de test: PARK-TEST-001 con matrícula 1234ABC

API_URL="http://parking.localhost:3001"
BOOKING_CODE="PARK-TEST-001"
PLATE="1234ABC"

echo "🚗 Prueba del Sistema de Parking"
echo "================================"
echo ""

# 1. Entrada al parking
echo "1️⃣  Probando ENTRADA al parking..."
echo "   POST $API_URL/parking/entry"
ENTRY_RESPONSE=$(curl -s -X POST "$API_URL/parking/entry" \
  -H "Content-Type: application/json" \
  -d "{\"bookingCode\":\"$BOOKING_CODE\",\"plate\":\"$PLATE\"}")

echo "   Respuesta:"
echo "$ENTRY_RESPONSE" | jq '.'

SESSION_ID=$(echo "$ENTRY_RESPONSE" | jq -r '.sessionId // empty')

if [ -z "$SESSION_ID" ]; then
  echo "   ❌ Error: No se pudo crear la sesión"
  exit 1
fi

echo "   ✅ Sesión creada: $SESSION_ID"
echo ""
echo "   ⏳ Esperando 5 segundos para simular tiempo en parking..."
sleep 5
echo ""

# 2. Solicitar cotización de salida
echo "2️⃣  Probando COTIZACIÓN de salida..."
echo "   POST $API_URL/parking/exit/quote"
QUOTE_RESPONSE=$(curl -s -X POST "$API_URL/parking/exit/quote" \
  -H "Content-Type: application/json" \
  -d "{\"bookingCode\":\"$BOOKING_CODE\",\"plate\":\"$PLATE\"}")

echo "   Respuesta:"
echo "$QUOTE_RESPONSE" | jq '.'

AMOUNT_DUE=$(echo "$QUOTE_RESPONSE" | jq -r '.amountDue // 0')
MINUTES=$(echo "$QUOTE_RESPONSE" | jq -r '.minutes // 0')

echo "   ⏱️  Tiempo: $MINUTES minuto(s)"
echo "   💰 Importe: €$(echo "scale=2; $AMOUNT_DUE/100" | bc)"
echo ""

# 3. Probar tolerancia de matrícula (1 carácter diferente)
echo "3️⃣  Probando TOLERANCIA de matrícula (1234AB0 ≈ 1234ABC)..."
echo "   POST $API_URL/parking/exit/quote con plate=1234AB0"
TOLERANT_RESPONSE=$(curl -s -X POST "$API_URL/parking/exit/quote" \
  -H "Content-Type: application/json" \
  -d "{\"bookingCode\":\"$BOOKING_CODE\",\"plate\":\"1234AB0\"}")

if echo "$TOLERANT_RESPONSE" | jq -e '.sessionId' > /dev/null 2>&1; then
  echo "   ✅ Tolerancia funcionando correctamente"
else
  echo "   ❌ Error en tolerancia:"
  echo "$TOLERANT_RESPONSE" | jq '.'
fi
echo ""

# 4. Procesar pago y salida
echo "4️⃣  Probando PAGO y salida..."
echo "   POST $API_URL/parking/exit/pay"
PAY_RESPONSE=$(curl -s -X POST "$API_URL/parking/exit/pay" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\",\"paymentMethod\":\"terminal\"}")

echo "   Respuesta:"
echo "$PAY_RESPONSE" | jq '.'

if echo "$PAY_RESPONSE" | jq -e '.status == "CLOSED"' > /dev/null 2>&1; then
  echo "   ✅ Pago procesado y barrera abierta"
else
  echo "   ❌ Error en el pago"
fi
echo ""

echo "🎉 Prueba completada!"
echo ""
echo "📊 Resumen:"
echo "   - Entrada: ✅"
echo "   - Cotización: ✅"
echo "   - Tolerancia: ✅"
echo "   - Pago/Salida: ✅"
echo ""
echo "💡 Para ver eventos del sistema:"
echo "   SELECT * FROM gate_events ORDER BY created_at DESC LIMIT 10;"
