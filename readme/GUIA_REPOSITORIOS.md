# Guía de Estrategias de Repositorios para LexIA 2.0

## ✅ Estado Actual: MONOREPO (Recomendado)

Tu proyecto está actualmente subido como **monorepo único** en:
**https://github.com/happy2t50/LexIA.git**

### Ventajas del Monorepo:
- ✅ Gestión unificada de versiones
- ✅ Compartir código común fácilmente (`shared/`)
- ✅ Un solo CI/CD pipeline
- ✅ Documentación centralizada
- ✅ Más fácil de mantener para equipos pequeños
- ✅ Docker Compose centralizado

---

## Opción 1: Mantener Monorepo (RECOMENDADO) ⭐

### Estructura Actual:
```
LexIA/
├── microservices/
│   ├── auth/
│   ├── chat/
│   ├── geo-assistance/
│   └── IA/
│       ├── clustering-ml/
│       ├── nlp/
│       ├── olap-cube/
│       └── rag/
├── nginx/           # API Gateway
├── database/
├── shared/
└── docker-compose.yml
```

### Cómo trabajar con este enfoque:

#### 1. Clonar el repositorio:
```bash
git clone https://github.com/happy2t50/LexIA.git
cd LexIA
```

#### 2. Trabajar en un microservicio específico:
```bash
cd microservices/chat
npm install
npm run dev
```

#### 3. Commits por microservicio:
```bash
git add microservices/chat/
git commit -m "feat(chat): agregar nueva funcionalidad de clustering"
git push origin main
```

#### 4. Deploy individual por microservicio:
```bash
# Solo el servicio de chat
docker-compose up --build chat

# Solo el API Gateway (nginx)
docker-compose up --build nginx
```

---

## Opción 2: Dividir en Múltiples Repositorios (AVANZADO)

### Estructura propuesta:
```
LexIA-Auth          → https://github.com/happy2t50/LexIA-Auth.git
LexIA-Chat          → https://github.com/happy2t50/LexIA-Chat.git
LexIA-GeoAssistance → https://github.com/happy2t50/LexIA-GeoAssistance.git
LexIA-ML-Clustering → https://github.com/happy2t50/LexIA-ML-Clustering.git
LexIA-NLP           → https://github.com/happy2t50/LexIA-NLP.git
LexIA-OLAP          → https://github.com/happy2t50/LexIA-OLAP.git
LexIA-RAG           → https://github.com/happy2t50/LexIA-RAG.git
LexIA-API-Gateway   → https://github.com/happy2t50/LexIA-API-Gateway.git
LexIA-Shared        → https://github.com/happy2t50/LexIA-Shared.git
LexIA-Infrastructure → https://github.com/happy2t50/LexIA-Infrastructure.git
```

### Pasos para dividir (NO RECOMENDADO para equipos pequeños):

#### 1. Crear repositorios individuales en GitHub:
- Ir a https://github.com/new
- Crear cada repositorio listado arriba

#### 2. Script PowerShell para dividir:
```powershell
# Guardar en scripts/split-repos.ps1

$baseDir = "C:\Users\umina\OneDrive\Escritorio"
$services = @(
    @{name="LexIA-Auth"; path="microservices/auth"},
    @{name="LexIA-Chat"; path="microservices/chat"},
    @{name="LexIA-GeoAssistance"; path="microservices/geo-assistance"},
    @{name="LexIA-ML-Clustering"; path="microservices/IA/clustering-ml"},
    @{name="LexIA-NLP"; path="microservices/IA/nlp"},
    @{name="LexIA-OLAP"; path="microservices/IA/olap-cube"},
    @{name="LexIA-RAG"; path="microservices/IA/rag"},
    @{name="LexIA-API-Gateway"; path="nginx"},
    @{name="LexIA-Shared"; path="shared"}
)

foreach ($service in $services) {
    Write-Host "Creando repositorio: $($service.name)"
    
    # Crear directorio nuevo
    $newDir = Join-Path $baseDir $service.name
    New-Item -ItemType Directory -Force -Path $newDir
    
    # Copiar archivos del microservicio
    $sourcePath = Join-Path "C:\Users\umina\OneDrive\Escritorio\LexIA2.0" $service.path
    Copy-Item -Path "$sourcePath\*" -Destination $newDir -Recurse
    
    # Copiar archivos comunes
    Copy-Item "C:\Users\umina\OneDrive\Escritorio\LexIA2.0\.gitignore" $newDir
    Copy-Item "C:\Users\umina\OneDrive\Escritorio\LexIA2.0\.dockerignore" $newDir
    
    # Inicializar Git
    Set-Location $newDir
    git init
    git add .
    git commit -m "Initial commit: $($service.name)"
    git branch -M main
    
    # Agregar remote (actualizar con tu URL)
    git remote add origin "https://github.com/happy2t50/$($service.name).git"
    
    # Push (comentado, descomentar cuando estés listo)
    # git push -u origin main
}
```

### Desventajas de múltiples repos:
- ❌ Más complejo de mantener
- ❌ Dificulta compartir código común
- ❌ Requiere gestión de versiones entre repos
- ❌ CI/CD más complicado
- ❌ Necesitas Git submodules o monorepo tools

---

## 🎯 Recomendación Final

**MANTÉN EL MONOREPO** a menos que:
- Tengas equipos separados para cada microservicio
- Necesites ciclos de deploy completamente independientes
- Tengas restricciones de permisos por equipo
- El proyecto crezca a más de 50 microservicios

### Buenas prácticas para tu Monorepo:

#### 1. Estructura de commits semántica:
```bash
git commit -m "feat(chat): nueva funcionalidad"
git commit -m "fix(auth): corregir validación"
git commit -m "docs(readme): actualizar guía"
git commit -m "refactor(rag): optimizar búsqueda"
```

#### 2. Branches por feature:
```bash
git checkout -b feature/chat-clustering
# Hacer cambios
git add microservices/chat/
git commit -m "feat(chat): implementar clustering de usuarios"
git push origin feature/chat-clustering
```

#### 3. Tags por versión:
```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

#### 4. GitHub Actions para CI/CD (crear `.github/workflows/deploy.yml`):
```yaml
name: Deploy Microservices

on:
  push:
    paths:
      - 'microservices/**'
      - 'nginx/**'

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      chat: ${{ steps.changes.outputs.chat }}
      auth: ${{ steps.changes.outputs.auth }}
    steps:
      - uses: actions/checkout@v3
      - uses: dorny/paths-filter@v2
        id: changes
        with:
          filters: |
            chat:
              - 'microservices/chat/**'
            auth:
              - 'microservices/auth/**'

  deploy-chat:
    needs: detect-changes
    if: needs.detect-changes.outputs.chat == 'true'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy Chat Service
        run: echo "Deploying chat service..."
```

---

## 📝 Archivos Protegidos

El `.gitignore` ya está configurado para proteger:
- ✅ `.claude/` (carpeta de configuración de Claude)
- ✅ `.env`, `.env.local`, `.env.production`
- ✅ `credentials/`, `secrets/`
- ✅ `node_modules/`
- ✅ Archivos de build (`dist/`, `build/`)

---

## 🚀 Próximos Pasos

1. **Crear README.md principal** con arquitectura
2. **Configurar GitHub Actions** para CI/CD
3. **Crear template de PR** (Pull Request)
4. **Documentar cada microservicio** individualmente
5. **Configurar branch protection** en GitHub

---

## 📚 Recursos Útiles

- [Monorepo vs Polyrepo](https://monorepo.tools/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Docker Compose](https://docs.docker.com/compose/)

---

**Estado actual:** ✅ Proyecto subido exitosamente como monorepo
**URL:** https://github.com/happy2t50/LexIA.git
**Branch principal:** `main`
