#!/bin/bash
# Script de Inicialización Completa - LexIA 2.0
# Ejecuta todos los pasos necesarios para levantar el sistema

echo "========================================"
echo "  LexIA 2.0 - Inicialización Completa"
echo "========================================"
echo ""

# Paso 1: Verificar Docker
echo "[1/6] Verificando Docker..."
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Docker no está corriendo"
    echo "   Por favor inicia Docker y ejecuta este script nuevamente"
    exit 1
fi
echo "✅ Docker está corriendo"
echo ""

# Paso 2: Levantar contenedores
echo "[2/6] Levantando contenedores Docker..."
cd "$(dirname "$0")/.."
docker-compose down
docker-compose up -d
if [ $? -ne 0 ]; then
    echo "❌ Error al levantar contenedores"
    exit 1
fi
echo "✅ Contenedores levantados"
echo ""

# Paso 3: Esperar a que los servicios estén listos
echo "[3/6] Esperando a que los servicios estén listos..."
echo "   Esperando 30 segundos..."
sleep 30
echo "✅ Servicios iniciados"
echo ""

# Paso 4: Ejecutar migraciones
echo "[4/6] Ejecutando migraciones de base de datos..."
docker exec lexia-postgres psql -U lexia_user -d lexia_db -f /docker-entrypoint-initdb.d/001_init_schema.sql
docker exec lexia-postgres psql -U lexia_user -d lexia_db -f /docker-entrypoint-initdb.d/002_add_pgvector.sql
docker exec lexia-postgres psql -U lexia_user -d lexia_db -f /docker-entrypoint-initdb.d/003_create_rag_tables.sql
docker exec lexia-postgres psql -U lexia_user -d lexia_db -f /docker-entrypoint-initdb.d/004_seed_legal_documents.sql
echo "✅ Migraciones ejecutadas"
echo ""

# Paso 5: Indexar documentos del seed
echo "[5/6] Indexando documentos legales del seed..."
echo "   Esto puede tomar 2-3 minutos..."

# Script para indexar desde PostgreSQL
cat > ./scripts/temp-index-seed.js << 'EOF'
const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'lexia_db',
    user: 'lexia_user',
    password: 'lexia_password_2024'
});

async function indexDocuments() {
    try {
        const result = await pool.query(
            'SELECT id, titulo, contenido, fuente, categoria, cluster_relacionado FROM documentos_legales WHERE activo = true'
        );

        console.log(`📚 Encontrados ${result.rows.length} documentos legales`);

        let indexed = 0;
        for (const doc of result.rows) {
            try {
                await axios.post('http://localhost/api/rag/index', {
                    titulo: doc.titulo,
                    contenido: doc.contenido,
                    fuente: doc.fuente,
                    categoria: doc.categoria,
                    clusterRelacionado: doc.cluster_relacionado
                });
                indexed++;
                console.log(`  ✅ ${doc.titulo.substring(0, 60)}...`);

                // Delay para no saturar
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`  ❌ Error: ${doc.titulo}`, error.message);
            }
        }

        console.log(`\n✅ Indexados ${indexed}/${result.rows.length} documentos`);
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

indexDocuments();
EOF

# Ejecutar script de indexación
cd ./scripts
npm install pg axios > /dev/null 2>&1
node temp-index-seed.js
rm temp-index-seed.js
cd ..
echo "✅ Documentos del seed indexados"
echo ""

# Paso 6: Procesar PDFs de leyes de tránsito
echo "[6/6] Procesando PDFs de leyes de tránsito de Chiapas..."
echo "   Esto puede tomar 10-15 minutos..."
cd ./scripts
npm install pdf-parse axios > /dev/null 2>&1
node process-pdf-laws.js
cd ..
echo "✅ PDFs procesados e indexados"
echo ""

# Resumen final
echo "========================================"
echo "  ✅ SISTEMA LISTO"
echo "========================================"
echo ""
echo "Servicios disponibles:"
echo "  🌐 API Gateway:    http://localhost"
echo "  💬 Chat Service:   http://localhost/api/chat"
echo "  🧠 RAG Service:    http://localhost/api/rag"
echo "  🔐 Auth Service:   http://localhost/api/auth"
echo ""
echo "Verificar estado:"
echo "  docker ps"
echo ""
echo "Ver estadísticas RAG:"
echo "  curl http://localhost/api/rag/stats"
echo ""
echo "Logs de servicios:"
echo "  docker logs lexia-chat"
echo "  docker logs lexia-rag"
echo "  docker logs lexia-auth"
echo ""