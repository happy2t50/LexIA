# Script de Inicialización Completa - LexIA 2.0
# Ejecuta todos los pasos necesarios para levantar el sistema

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LexIA 2.0 - Inicialización Completa" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Paso 1: Verificar Docker
Write-Host "[1/6] Verificando Docker..." -ForegroundColor Yellow
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker no está corriendo" -ForegroundColor Red
    Write-Host "   Por favor inicia Docker Desktop y ejecuta este script nuevamente" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker está corriendo" -ForegroundColor Green
Write-Host ""

# Paso 2: Levantar contenedores
Write-Host "[2/6] Levantando contenedores Docker..." -ForegroundColor Yellow
Set-Location "C:\Users\umina\OneDrive\Escritorio\LexIA2.0"
docker-compose down
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al levantar contenedores" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Contenedores levantados" -ForegroundColor Green
Write-Host ""

# Paso 3: Esperar a que los servicios estén listos
Write-Host "[3/6] Esperando a que los servicios estén listos..." -ForegroundColor Yellow
Write-Host "   Esperando 30 segundos..." -ForegroundColor Gray
Start-Sleep -Seconds 30
Write-Host "✅ Servicios iniciados" -ForegroundColor Green
Write-Host ""

# Paso 4: Ejecutar migraciones
Write-Host "[4/6] Ejecutando migraciones de base de datos..." -ForegroundColor Yellow
docker exec lexia-postgres psql -U lexia_user -d lexia_db -f /docker-entrypoint-initdb.d/001_init_schema.sql
docker exec lexia-postgres psql -U lexia_user -d lexia_db -f /docker-entrypoint-initdb.d/002_add_pgvector.sql
docker exec lexia-postgres psql -U lexia_user -d lexia_db -f /docker-entrypoint-initdb.d/003_create_rag_tables.sql
docker exec lexia-postgres psql -U lexia_user -d lexia_db -f /docker-entrypoint-initdb.d/004_seed_legal_documents.sql
Write-Host "✅ Migraciones ejecutadas" -ForegroundColor Green
Write-Host ""

# Paso 5: Indexar documentos del seed
Write-Host "[5/6] Indexando documentos legales del seed..." -ForegroundColor Yellow
Write-Host "   Esto puede tomar 2-3 minutos..." -ForegroundColor Gray

# Script para indexar desde PostgreSQL
$indexScript = @'
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
'@

# Guardar y ejecutar script temporal
$indexScript | Out-File -FilePath ".\scripts\temp-index-seed.js" -Encoding utf8
Set-Location ".\scripts"
npm install pg axios --silent
node temp-index-seed.js
Remove-Item temp-index-seed.js
Set-Location ..
Write-Host "✅ Documentos del seed indexados" -ForegroundColor Green
Write-Host ""

# Paso 6: Procesar PDFs de leyes de tránsito
Write-Host "[6/6] Procesando PDFs de leyes de tránsito de Chiapas..." -ForegroundColor Yellow
Write-Host "   Esto puede tomar 10-15 minutos..." -ForegroundColor Gray
Set-Location ".\scripts"
npm install pdf-parse axios --silent
node process-pdf-laws.js
Set-Location ..
Write-Host "✅ PDFs procesados e indexados" -ForegroundColor Green
Write-Host ""

# Resumen final
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ SISTEMA LISTO" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Servicios disponibles:" -ForegroundColor White
Write-Host "  🌐 API Gateway:    http://localhost" -ForegroundColor Cyan
Write-Host "  💬 Chat Service:   http://localhost/api/chat" -ForegroundColor Cyan
Write-Host "  🧠 RAG Service:    http://localhost/api/rag" -ForegroundColor Cyan
Write-Host "  🔐 Auth Service:   http://localhost/api/auth" -ForegroundColor Cyan
Write-Host ""
Write-Host "Verificar estado:" -ForegroundColor White
Write-Host "  docker ps" -ForegroundColor Gray
Write-Host ""
Write-Host "Ver estadísticas RAG:" -ForegroundColor White
Write-Host "  curl http://localhost/api/rag/stats" -ForegroundColor Gray
Write-Host ""
Write-Host "Logs de servicios:" -ForegroundColor White
Write-Host "  docker logs lexia-chat" -ForegroundColor Gray
Write-Host "  docker logs lexia-rag" -ForegroundColor Gray
Write-Host "  docker logs lexia-auth" -ForegroundColor Gray
Write-Host ""