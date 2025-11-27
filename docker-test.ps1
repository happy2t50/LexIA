# LexIA 2.0 - Docker Test Script (PowerShell)
Write-Host "🚀 LexIA 2.0 - Docker Test Script" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Función para verificar health
function Check-Health {
    param(
        [string]$Service,
        [int]$Port
    )

    Write-Host "Verificando $Service (puerto $Port)... " -NoNewline

    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$Port/health" -Method Get -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ OK" -ForegroundColor Green
            return $true
        }
    }
    catch {
        Write-Host "✗ FAIL" -ForegroundColor Red
        return $false
    }
}

# Paso 1: Build containers
Write-Host "📦 Paso 1: Construyendo contenedores..." -ForegroundColor Yellow
docker-compose build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error en build" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Build completado" -ForegroundColor Green
Write-Host ""

# Paso 2: Iniciar contenedores
Write-Host "🚀 Paso 2: Iniciando contenedores..." -ForegroundColor Yellow
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al iniciar contenedores" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Contenedores iniciados" -ForegroundColor Green
Write-Host ""

# Paso 3: Esperar PostgreSQL
Write-Host "⏳ Paso 3: Esperando PostgreSQL..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Verificar PostgreSQL
docker exec lexia-postgres pg_isready -U postgres
if ($LASTEXITCODE -ne 0) {
    Write-Host "PostgreSQL no está listo" -ForegroundColor Red
    exit 1
}
Write-Host "✓ PostgreSQL listo" -ForegroundColor Green
Write-Host ""

# Paso 4: Esperar a que servicios estén listos
Write-Host "⏳ Paso 4: Esperando a que servicios estén listos (60s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 60
Write-Host ""

# Paso 5: Health checks
Write-Host "🏥 Paso 5: Verificando salud de servicios..." -ForegroundColor Yellow
Check-Health -Service "Auth" -Port 3003
Check-Health -Service "OLAP Cube" -Port 3001
Check-Health -Service "Clustering" -Port 3002
Check-Health -Service "NLP" -Port 3004
Check-Health -Service "RAG" -Port 3009
Check-Health -Service "Chat" -Port 3010
Write-Host ""

# Paso 6: Test completo del sistema
Write-Host "🧪 Paso 6: Probando flujo completo..." -ForegroundColor Yellow
Write-Host ""

# Test 1: Iniciar sesión
Write-Host "Test 1: Iniciar sesión de chat..." -ForegroundColor Cyan
$sessionBody = @{
    usuarioId = "test_docker"
    nombre = "Test Usuario"
} | ConvertTo-Json

try {
    $sessionResponse = Invoke-RestMethod -Uri "http://localhost:3010/session/start" -Method Post -Body $sessionBody -ContentType "application/json"
    $sessionId = $sessionResponse.sessionId

    if ($sessionId) {
        Write-Host "✓ Sesión iniciada: $sessionId" -ForegroundColor Green
    } else {
        Write-Host "✗ No se pudo iniciar sesión" -ForegroundColor Red
    }
}
catch {
    Write-Host "✗ Error al iniciar sesión: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Enviar mensaje
if ($sessionId) {
    Write-Host "Test 2: Enviando mensaje de prueba..." -ForegroundColor Cyan
    $messageBody = @{
        sessionId = $sessionId
        usuarioId = "test_docker"
        nombre = "Test"
        mensaje = "me multaron por estacionarme mal"
    } | ConvertTo-Json

    try {
        $messageResponse = Invoke-RestMethod -Uri "http://localhost:3010/message" -Method Post -Body $messageBody -ContentType "application/json"

        if ($messageResponse.success) {
            Write-Host "✓ Mensaje procesado exitosamente" -ForegroundColor Green
            Write-Host "  Cluster detectado: $($messageResponse.cluster)"
            Write-Host "  Sentimiento: $($messageResponse.sentimiento)"
            Write-Host "  Respuesta: $($messageResponse.mensaje.Substring(0, [Math]::Min(100, $messageResponse.mensaje.Length)))..."
        } else {
            Write-Host "✗ Error al procesar mensaje" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Paso 7: Mostrar información útil
Write-Host "📋 Logs de servicios:" -ForegroundColor Cyan
Write-Host "  Ver logs: docker-compose logs -f [servicio]"
Write-Host "  Servicios: postgres, auth, olap-cube, clustering, nlp, rag, chat"
Write-Host ""

Write-Host "🔧 Comandos útiles:" -ForegroundColor Cyan
Write-Host "  Detener: docker-compose down"
Write-Host "  Ver estado: docker-compose ps"
Write-Host "  Reiniciar: docker-compose restart [servicio]"
Write-Host "  Logs: docker-compose logs -f [servicio]"
Write-Host ""

Write-Host "✅ Tests completados!" -ForegroundColor Green
