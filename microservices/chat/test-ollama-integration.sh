#!/bin/bash

# Script de pruebas para verificar integración de Ollama con llama3.2:3b
# Autor: Claude Code
# Fecha: 2025-12-04

echo "🧪 Iniciando pruebas de integración Ollama + RAG..."
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# === TEST 1: Pregunta General (solo Ollama, sin RAG) ===
echo -e "${BLUE}TEST 1: Pregunta General${NC}"
echo "Pregunta: '¿Por qué debo detenerme en un alto?'"
echo "Esperado: Tipo 'general', sin artículos RAG, sin emojis"
echo ""

curl -X POST http://localhost/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-general-1",
    "mensaje": "por que debo detenerme en un alto",
    "usuarioId": "test-user-123",
    "nombre": "Test"
  }' | jq -r '.mensaje' > /tmp/test1.txt

if grep -q "🚗\|📋\|⭐\|🚦" /tmp/test1.txt; then
  echo -e "${RED}❌ FALLO: Encontró emojis en la respuesta${NC}"
else
  echo -e "${GREEN}✅ PASÓ: Sin emojis${NC}"
fi

echo ""
echo "--- Respuesta completa ---"
cat /tmp/test1.txt
echo ""
echo "===================================="
echo ""

# === TEST 2: Situación Legal (Ollama + RAG) ===
echo -e "${BLUE}TEST 2: Situación Legal${NC}"
echo "Pregunta: 'me chocaron y el wey se fue'"
echo "Esperado: Tipo 'urgente' o 'legal', con artículos RAG sobre fuga"
echo ""

curl -X POST http://localhost/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-legal-1",
    "mensaje": "me chocaron y el wey se fue",
    "usuarioId": "test-user-123",
    "nombre": "Javi"
  }' > /tmp/test2.json

# Verificar emojis
if jq -r '.mensaje' /tmp/test2.json | grep -q "🚗\|📋\|⭐\|🚦"; then
  echo -e "${RED}❌ FALLO: Encontró emojis${NC}"
else
  echo -e "${GREEN}✅ PASÓ: Sin emojis${NC}"
fi

# Verificar artículos
ARTICULOS_COUNT=$(jq '.articulos | length' /tmp/test2.json)
if [ "$ARTICULOS_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✅ PASÓ: Tiene artículos del RAG ($ARTICULOS_COUNT artículos)${NC}"
else
  echo -e "${RED}❌ FALLO: No tiene artículos del RAG${NC}"
fi

# Verificar cluster
CLUSTER=$(jq -r '.cluster' /tmp/test2.json)
echo "Cluster detectado: $CLUSTER"

echo ""
echo "--- Mensaje de respuesta ---"
jq -r '.mensaje' /tmp/test2.json
echo ""
echo "===================================="
echo ""

# === TEST 3: Profesionistas Solo en Cards ===
echo -e "${BLUE}TEST 3: Profesionistas Solo en Cards${NC}"
echo "Pregunta: 'me detuvieron por exceso de velocidad'"
echo "Esperado: Profesionistas solo en array, NO en mensaje"
echo ""

curl -X POST http://localhost/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-prof-1",
    "mensaje": "me detuvieron por exceso de velocidad",
    "usuarioId": "test-user-123",
    "nombre": "Carlos"
  }' > /tmp/test3.json

# Verificar que NO hay texto de profesionistas
if jq -r '.mensaje' /tmp/test3.json | grep -q "Profesionistas especializados\|Carlos.*⭐"; then
  echo -e "${RED}❌ FALLO: Profesionistas aparecen en el texto${NC}"
else
  echo -e "${GREEN}✅ PASÓ: Profesionistas NO están en el texto${NC}"
fi

# Verificar que SÍ hay profesionistas en el array
PROF_COUNT=$(jq '.profesionistas | length' /tmp/test3.json 2>/dev/null || echo "0")
if [ "$PROF_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✅ PASÓ: Profesionistas en array ($PROF_COUNT profesionistas)${NC}"
else
  echo "⚠️  ADVERTENCIA: No hay profesionistas (puede ser normal según tema)"
fi

echo ""
echo "===================================="
echo ""

# === TEST 4: Off-Topic ===
echo -e "${BLUE}TEST 4: Off-Topic Detection${NC}"
echo "Pregunta: 'sabes cuando sale el nuevo call of duty'"
echo "Esperado: Cluster 'off_topic'"
echo ""

curl -X POST http://localhost/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-offtopic-1",
    "mensaje": "sabes cuando sale el nuevo call of duty",
    "usuarioId": "test-user-123",
    "nombre": "Test"
  }' > /tmp/test4.json

CLUSTER=$(jq -r '.cluster' /tmp/test4.json)
if [ "$CLUSTER" = "off_topic" ]; then
  echo -e "${GREEN}✅ PASÓ: Detectado como off_topic${NC}"
else
  echo -e "${RED}❌ FALLO: Detectado como '$CLUSTER' (esperado 'off_topic')${NC}"
fi

echo ""
jq -r '.mensaje' /tmp/test4.json
echo ""
echo "===================================="
echo ""

# === Verificar Logs de Ollama ===
echo -e "${BLUE}Logs del servicio de chat (últimos 50 líneas):${NC}"
docker logs lexia-chat --tail 50 | grep -E "🤖|✅|❌|Tipo de pregunta"

echo ""
echo "🎯 Pruebas completadas. Revisa los resultados arriba."
