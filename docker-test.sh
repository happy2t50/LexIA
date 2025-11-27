#!/bin/bash

echo "🚀 LexIA 2.0 - Docker Test Script"
echo "=================================="
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para verificar health
check_health() {
    local service=$1
    local port=$2
    echo -n "Verificando $service (puerto $port)... "

    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health)

    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FAIL (HTTP $response)${NC}"
        return 1
    fi
}

# Paso 1: Build containers
echo "📦 Paso 1: Construyendo contenedores..."
docker-compose build
if [ $? -ne 0 ]; then
    echo -e "${RED}Error en build${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Build completado${NC}"
echo ""

# Paso 2: Iniciar contenedores
echo "🚀 Paso 2: Iniciando contenedores..."
docker-compose up -d
if [ $? -ne 0 ]; then
    echo -e "${RED}Error al iniciar contenedores${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Contenedores iniciados${NC}"
echo ""

# Paso 3: Esperar PostgreSQL
echo "⏳ Paso 3: Esperando PostgreSQL..."
sleep 10

# Verificar PostgreSQL
docker exec lexia-postgres pg_isready -U postgres
if [ $? -ne 0 ]; then
    echo -e "${RED}PostgreSQL no está listo${NC}"
    exit 1
fi
echo -e "${GREEN}✓ PostgreSQL listo${NC}"
echo ""

# Paso 4: Esperar a que servicios estén listos
echo "⏳ Paso 4: Esperando a que servicios estén listos (60s)..."
sleep 60
echo ""

# Paso 5: Health checks
echo "🏥 Paso 5: Verificando salud de servicios..."
check_health "Auth" 3003
check_health "OLAP Cube" 3001
check_health "Clustering" 3002
check_health "NLP" 3004
check_health "RAG" 3009
check_health "Chat" 3010
echo ""

# Paso 6: Test completo del sistema
echo "🧪 Paso 6: Probando flujo completo..."
echo ""

# Test 1: Iniciar sesión
echo "Test 1: Iniciar sesión de chat..."
SESSION_RESPONSE=$(curl -s -X POST http://localhost:3010/session/start \
  -H "Content-Type: application/json" \
  -d '{"usuarioId": "test_docker", "nombre": "Test Usuario"}')

SESSION_ID=$(echo $SESSION_RESPONSE | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$SESSION_ID" ]; then
    echo -e "${RED}✗ No se pudo iniciar sesión${NC}"
    echo "Respuesta: $SESSION_RESPONSE"
else
    echo -e "${GREEN}✓ Sesión iniciada: $SESSION_ID${NC}"
fi
echo ""

# Test 2: Enviar mensaje
if [ ! -z "$SESSION_ID" ]; then
    echo "Test 2: Enviando mensaje de prueba..."
    MESSAGE_RESPONSE=$(curl -s -X POST http://localhost:3010/message \
      -H "Content-Type: application/json" \
      -d "{\"sessionId\": \"$SESSION_ID\", \"usuarioId\": \"test_docker\", \"nombre\": \"Test\", \"mensaje\": \"me multaron por estacionarme mal\"}")

    SUCCESS=$(echo $MESSAGE_RESPONSE | grep -o '"success":true')

    if [ ! -z "$SUCCESS" ]; then
        echo -e "${GREEN}✓ Mensaje procesado exitosamente${NC}"

        # Mostrar cluster detectado
        CLUSTER=$(echo $MESSAGE_RESPONSE | grep -o '"cluster":"[^"]*"' | cut -d'"' -f4)
        echo "  Cluster detectado: $CLUSTER"

        # Mostrar sentimiento
        SENTIMENT=$(echo $MESSAGE_RESPONSE | grep -o '"sentimiento":"[^"]*"' | cut -d'"' -f4)
        echo "  Sentimiento: $SENTIMENT"
    else
        echo -e "${RED}✗ Error al procesar mensaje${NC}"
        echo "Respuesta: $MESSAGE_RESPONSE"
    fi
fi
echo ""

# Paso 7: Mostrar logs
echo "📋 Logs de servicios:"
echo "  Ver logs: docker-compose logs -f [servicio]"
echo "  Servicios: postgres, auth, olap-cube, clustering, nlp, rag, chat"
echo ""

# Paso 8: Comandos útiles
echo "🔧 Comandos útiles:"
echo "  Detener: docker-compose down"
echo "  Ver estado: docker-compose ps"
echo "  Reiniciar: docker-compose restart [servicio]"
echo "  Logs: docker-compose logs -f [servicio]"
echo ""

echo -e "${GREEN}✅ Tests completados!${NC}"
