#!/bin/bash

# Script de inicialización del sistema LexIA 2.0
# Este script ejecuta tareas post-deployment

echo "🚀 Inicializando sistema LexIA 2.0..."

# Esperar a que PostgreSQL esté completamente listo
echo "⏳ Esperando PostgreSQL..."
sleep 10

# Ejecutar seed de documentos legales
echo "📚 Cargando documentos legales..."
docker exec -i lexia-postgres psql -U postgres -d lexia_db < /docker-entrypoint-initdb.d/004_seed_legal_documents.sql

if [ $? -eq 0 ]; then
    echo "✅ Documentos legales cargados exitosamente"
else
    echo "❌ Error al cargar documentos legales"
    exit 1
fi

# Verificar cantidad de documentos
DOC_COUNT=$(docker exec lexia-postgres psql -U postgres -d lexia_db -t -c "SELECT COUNT(*) FROM documentos_legales WHERE activo = true;")
echo "📊 Documentos legales en BD: $DOC_COUNT"

# Indexar todos los documentos en RAG
echo "🔍 Indexando documentos en RAG..."
sleep 5  # Esperar a que RAG esté listo

# Llamar al endpoint de indexación
RESPONSE=$(curl -s -X POST http://localhost/api/rag/index-all)
echo "Respuesta RAG: $RESPONSE"

# Verificar chunks creados
CHUNK_COUNT=$(docker exec lexia-postgres psql -U postgres -d lexia_db -t -c "SELECT COUNT(*) FROM documento_chunks;")
echo "📊 Chunks indexados: $CHUNK_COUNT"

echo "✅ Sistema inicializado correctamente!"
echo ""
echo "🌐 Accede al API Gateway en: http://localhost"
echo "📖 Documentación: readme/API_GATEWAY.md"
