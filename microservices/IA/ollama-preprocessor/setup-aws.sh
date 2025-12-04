#!/bin/bash

# Script de setup rápido para Ollama en AWS EC2
# Uso: bash setup-aws.sh [modelo]
# Ejemplo: bash setup-aws.sh llama3.2:1b

set -e

echo "🚀 LexIA 2.0 - Setup Ollama Preprocessor en AWS"
echo "================================================"

# Variables
MODELO=${1:-"llama3.2:1b"}
echo "📦 Modelo a instalar: $MODELO"

# 1. Actualizar sistema
echo ""
echo "📥 Actualizando sistema..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

# 2. Instalar Docker
echo ""
echo "🐳 Instalando Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "✅ Docker instalado"
else
    echo "✅ Docker ya está instalado"
fi

# 3. Instalar Docker Compose
echo ""
echo "🔧 Instalando Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose instalado"
else
    echo "✅ Docker Compose ya está instalado"
fi

# 4. Configurar swap (para instancias con poca RAM)
echo ""
echo "💾 Configurando swap memory..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "✅ Swap de 2GB configurado"
else
    echo "✅ Swap ya está configurado"
fi

# 5. Crear red Docker si no existe
echo ""
echo "🌐 Creando red Docker..."
docker network create lexia-network 2>/dev/null || echo "✅ Red lexia-network ya existe"

# 6. Verificar archivos
echo ""
echo "📁 Verificando archivos necesarios..."
if [ ! -f "docker-compose.ollama.yml" ]; then
    echo "❌ Error: docker-compose.ollama.yml no encontrado"
    echo "Asegúrate de estar en el directorio microservices/IA"
    exit 1
fi

# 7. Configurar variables de entorno
echo ""
echo "⚙️  Configurando variables de entorno..."
cd ollama-preprocessor
if [ ! -f ".env" ]; then
    cat > .env <<EOF
PORT=3005
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=$MODELO
EOF
    echo "✅ Archivo .env creado"
else
    echo "✅ Archivo .env ya existe"
fi
cd ..

# 8. Iniciar servicios
echo ""
echo "🚀 Iniciando servicios Docker..."
docker-compose -f docker-compose.ollama.yml up -d

# 9. Esperar a que Ollama esté listo
echo ""
echo "⏳ Esperando a que Ollama esté listo (30 segundos)..."
sleep 30

# 10. Descargar modelo
echo ""
echo "📥 Descargando modelo $MODELO (esto puede tardar varios minutos)..."
docker exec lexia-ollama ollama pull $MODELO

# 11. Verificar instalación
echo ""
echo "✅ Verificando instalación..."
echo ""
echo "🔍 Health check Ollama:"
curl -s http://localhost:11434/api/tags | jq '.models[].name' || echo "API responde"

echo ""
echo "🔍 Health check Preprocessor:"
curl -s http://localhost:3005/health | jq '.'

# 12. Test de normalización
echo ""
echo "🧪 Test de normalización:"
curl -s -X POST http://localhost:3005/normalize \
  -H "Content-Type: application/json" \
  -d '{"texto": "hey me agarraron bolo"}' | jq '.'

# 13. Mostrar información final
echo ""
echo "================================================"
echo "✅ Setup completado exitosamente!"
echo "================================================"
echo ""
echo "📊 Servicios corriendo:"
docker-compose -f docker-compose.ollama.yml ps
echo ""
echo "📝 Comandos útiles:"
echo "  Ver logs:        docker-compose -f docker-compose.ollama.yml logs -f"
echo "  Reiniciar:       docker-compose -f docker-compose.ollama.yml restart"
echo "  Detener:         docker-compose -f docker-compose.ollama.yml down"
echo "  Ver recursos:    docker stats"
echo ""
echo "🌐 Endpoints:"
echo "  Ollama:          http://localhost:11434"
echo "  Preprocessor:    http://localhost:3005"
echo "  Health:          http://localhost:3005/health"
echo "  Normalize:       http://localhost:3005/normalize"
echo ""
echo "💡 Para usar desde otros servicios:"
echo "  OLLAMA_PREPROCESSOR_URL=http://$(hostname -I | awk '{print $1}'):3005"
echo ""
echo "⚠️  IMPORTANTE: Si acabas de instalar Docker, reinicia la sesión SSH para que los permisos se apliquen."
