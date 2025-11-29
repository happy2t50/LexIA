# Script para dividir el monorepo en múltiples repositorios
# USO: .\scripts\split-to-multirepo.ps1
# ADVERTENCIA: Este script creará múltiples directorios nuevos

param(
    [switch]$DryRun = $false,
    [switch]$Push = $false
)

$baseDir = "C:\Users\umina\OneDrive\Escritorio"
$sourceRepo = "C:\Users\umina\OneDrive\Escritorio\LexIA2.0"
$githubUser = "happy2t50"

# Definir microservicios y sus rutas
$services = @(
    @{
        name = "LexIA-Auth"
        path = "microservices/auth"
        description = "Servicio de autenticación y autorización"
    },
    @{
        name = "LexIA-Chat"
        path = "microservices/chat"
        description = "Servicio de chat inteligente con IA"
    },
    @{
        name = "LexIA-GeoAssistance"
        path = "microservices/geo-assistance"
        description = "Servicio de asistencia geolocalizada"
    },
    @{
        name = "LexIA-ML-Clustering"
        path = "microservices/IA/clustering-ml"
        description = "Servicio de clustering y ML"
    },
    @{
        name = "LexIA-NLP"
        path = "microservices/IA/nlp"
        description = "Servicio de procesamiento de lenguaje natural"
    },
    @{
        name = "LexIA-OLAP"
        path = "microservices/IA/olap-cube"
        description = "Servicio de análisis OLAP"
    },
    @{
        name = "LexIA-RAG"
        path = "microservices/IA/rag"
        description = "Servicio RAG (Retrieval Augmented Generation)"
    },
    @{
        name = "LexIA-API-Gateway"
        path = "nginx"
        description = "API Gateway con Nginx"
    },
    @{
        name = "LexIA-Shared"
        path = "shared"
        description = "Biblioteca compartida entre microservicios"
    }
)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  LexIA 2.0 - Split to Multi-Repo  " -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN MODE] - No se crearán archivos reales" -ForegroundColor Yellow
    Write-Host ""
}

# Verificar que el directorio fuente existe
if (-not (Test-Path $sourceRepo)) {
    Write-Host "ERROR: No se encuentra el directorio fuente: $sourceRepo" -ForegroundColor Red
    exit 1
}

Write-Host "Directorio fuente: $sourceRepo" -ForegroundColor Green
Write-Host "Microservicios a procesar: $($services.Count)" -ForegroundColor Green
Write-Host ""

# Confirmar acción
if (-not $DryRun) {
    $confirm = Read-Host "¿Deseas continuar? Esto creará $($services.Count) nuevos directorios (S/N)"
    if ($confirm -ne 'S' -and $confirm -ne 's') {
        Write-Host "Operación cancelada" -ForegroundColor Yellow
        exit 0
    }
}

# Procesar cada servicio
foreach ($service in $services) {
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    Write-Host "Procesando: $($service.name)" -ForegroundColor White
    Write-Host "Ruta: $($service.path)" -ForegroundColor Gray
    Write-Host "Descripción: $($service.description)" -ForegroundColor Gray
    
    $newDir = Join-Path $baseDir $service.name
    $sourcePath = Join-Path $sourceRepo $service.path
    
    # Verificar que existe el directorio fuente
    if (-not (Test-Path $sourcePath)) {
        Write-Host "  ⚠ WARNING: No se encuentra $sourcePath - SALTANDO" -ForegroundColor Yellow
        continue
    }
    
    if ($DryRun) {
        Write-Host "  [DRY RUN] Crearía directorio: $newDir" -ForegroundColor Yellow
        Write-Host "  [DRY RUN] Copiaría desde: $sourcePath" -ForegroundColor Yellow
        continue
    }
    
    # Crear directorio nuevo
    if (Test-Path $newDir) {
        Write-Host "  ⚠ El directorio ya existe. ¿Sobrescribir? (S/N): " -ForegroundColor Yellow -NoNewline
        $overwrite = Read-Host
        if ($overwrite -ne 'S' -and $overwrite -ne 's') {
            Write-Host "  ⏭ Saltando $($service.name)" -ForegroundColor Yellow
            continue
        }
        Remove-Item -Path $newDir -Recurse -Force
    }
    
    New-Item -ItemType Directory -Force -Path $newDir | Out-Null
    Write-Host "  ✓ Directorio creado" -ForegroundColor Green
    
    # Copiar archivos del microservicio
    Copy-Item -Path "$sourcePath\*" -Destination $newDir -Recurse -Force
    Write-Host "  ✓ Archivos copiados" -ForegroundColor Green
    
    # Copiar archivos raíz necesarios
    $rootFiles = @('.gitignore', '.dockerignore', '.env.example')
    foreach ($file in $rootFiles) {
        $sourceFile = Join-Path $sourceRepo $file
        if (Test-Path $sourceFile) {
            Copy-Item -Path $sourceFile -Destination $newDir -Force
            Write-Host "  ✓ Copiado: $file" -ForegroundColor Green
        }
    }
    
    # Crear README.md específico
    $readmeContent = @"
# $($service.name)

> $($service.description)

## 🚀 Parte del ecosistema LexIA 2.0

Este repositorio contiene el microservicio **$($service.name)**.

## 📋 Requisitos

- Node.js 18+
- Docker (opcional)
- PostgreSQL (para servicios que lo requieran)

## 🔧 Instalación

\`\`\`bash
npm install
\`\`\`

## 🏃 Ejecutar

### Modo desarrollo
\`\`\`bash
npm run dev
\`\`\`

### Con Docker
\`\`\`bash
docker build -t lexia-$(($service.name).ToLower()) .
docker run -p 3000:3000 lexia-$(($service.name).ToLower())
\`\`\`

## 🔗 Repositorios relacionados

- [LexIA - Monorepo Principal](https://github.com/$githubUser/LexIA)
$(foreach ($s in $services) { if ($s.name -ne $service.name) { "- [$($s.name)](https://github.com/$githubUser/$($s.name))`n" } })

## 📄 Licencia

Ver repositorio principal para información de licencia.

## 🤝 Contribuir

Ver [CONTRIBUTING.md](../LexIA/CONTRIBUTING.md) en el repositorio principal.

---

**Mantenido por:** LexIA Team  
**Repositorio original:** https://github.com/$githubUser/LexIA
"@
    
    $readmeContent | Out-File -FilePath (Join-Path $newDir "README.md") -Encoding UTF8
    Write-Host "  ✓ README.md creado" -ForegroundColor Green
    
    # Inicializar Git
    Push-Location $newDir
    
    git init | Out-Null
    Write-Host "  ✓ Git inicializado" -ForegroundColor Green
    
    git add . | Out-Null
    git commit -m "Initial commit: $($service.name) - $($service.description)" | Out-Null
    Write-Host "  ✓ Commit inicial creado" -ForegroundColor Green
    
    git branch -M main | Out-Null
    Write-Host "  ✓ Branch 'main' creado" -ForegroundColor Green
    
    # Configurar remote
    $repoUrl = "https://github.com/$githubUser/$($service.name).git"
    git remote add origin $repoUrl 2>$null
    Write-Host "  ✓ Remote configurado: $repoUrl" -ForegroundColor Green
    
    # Push (solo si se especificó el flag)
    if ($Push) {
        Write-Host "  📤 Pushing to GitHub..." -ForegroundColor Cyan
        git push -u origin main 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Push exitoso" -ForegroundColor Green
        } else {
            Write-Host "  ⚠ Error en push - verifica que el repo existe en GitHub" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ℹ Para hacer push ejecuta: git push -u origin main" -ForegroundColor Gray
    }
    
    Pop-Location
    
    Write-Host "  ✅ $($service.name) procesado correctamente" -ForegroundColor Green
    Write-Host ""
}

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Proceso completado" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

if (-not $DryRun) {
    Write-Host "📁 Directorios creados en: $baseDir" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Siguientes pasos:" -ForegroundColor Yellow
    Write-Host "  1. Crear los repositorios en GitHub:" -ForegroundColor White
    foreach ($service in $services) {
        Write-Host "     - https://github.com/new → $($service.name)" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "  2. Hacer push de cada repositorio:" -ForegroundColor White
    Write-Host "     cd directorio && git push -u origin main" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  O ejecuta: .\scripts\split-to-multirepo.ps1 -Push" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✨ Script completado exitosamente" -ForegroundColor Green
