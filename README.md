# LexIA 2.0 - Asistente Legal Inteligente

Sistema de asistencia legal basado en IA para consultas sobre tránsito y normativas vehiculares en Colombia.

## Inicio Rápido

### Prerequisitos
- Docker Desktop instalado y corriendo
- Puerto 80 disponible

### Levantar el Sistema

```bash
# Clonar el repositorio
git clone <repository-url>
cd LexIA2.0

# Iniciar todos los servicios
docker-compose up -d

# Verificar que todo esté corriendo
docker-compose ps
```

### Acceder al Sistema

**API Gateway**: `http://localhost`

Todos los servicios están disponibles a través del API Gateway:
- Chat: `http://localhost/api/chat/`
- RAG: `http://localhost/api/rag/`
- NLP: `http://localhost/api/nlp/`
- Auth: `http://localhost/api/auth/`
- Clustering: `http://localhost/api/clustering/`
- OLAP: `http://localhost/api/olap/`

### Ejemplo de Uso

```bash
# 1. Crear una sesión de chat
curl -X POST http://localhost/api/chat/session/start \
  -H "Content-Type: application/json" \
  -d '{"usuarioId":"550e8400-e29b-41d4-a716-446655440000","nombre":"María"}'

# 2. Enviar un mensaje
curl -X POST http://localhost/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId":"<session-id>",
    "mensaje":"Me multaron por estacionarme mal",
    "usuarioId":"550e8400-e29b-41d4-a716-446655440000",
    "nombre":"María"
  }'
```

## Arquitectura

```
Cliente/Frontend
       ↓
🌐 Nginx API Gateway (Puerto 80)
       ↓
   ┌───┴────┬─────────┬──────────┬──────┬──────┬──────┐
   ↓        ↓         ↓          ↓      ↓      ↓      ↓
PostgreSQL Auth    OLAP    Clustering NLP   RAG   Chat
  :5432   :3003    :3001      :3002   :3004  :3009 :3010
```

### Servicios

| Servicio | Puerto | Función |
|----------|--------|---------|
| **Nginx** | 80 | API Gateway - Punto único de entrada |
| **PostgreSQL** | 5432 | Base de datos principal + pgvector |
| **Chat** | 3010 | Orquestador principal del sistema |
| **RAG** | 3009 | Búsqueda semántica con embeddings locales |
| **NLP** | 3004 | Procesamiento de lenguaje natural |
| **Clustering** | 3002 | Machine Learning - K-means clustering |
| **OLAP** | 3001 | Data warehouse y métricas |
| **Auth** | 3003 | Autenticación y autorización |

## Tecnologías

- **Backend**: Node.js + TypeScript + Express
- **Base de Datos**: PostgreSQL 16 + pgvector
- **ML/AI**:
  - Transformers.js (@xenova/transformers) - Embeddings locales
  - Natural.js - NLP
  - K-means clustering
- **Proxy**: Nginx (Alpine)
- **Contenedores**: Docker + Docker Compose

## Características Principales

- ✅ **100% Local** - No depende de APIs externas (OpenAI, etc.)
- ✅ **Búsqueda Semántica** - RAG con embeddings de 384 dimensiones
- ✅ **Clustering Inteligente** - Categorización automática de consultas
- ✅ **NLP en Español** - Análisis de sentimiento e intención
- ✅ **API Gateway** - Nginx como reverse proxy
- ✅ **Microservicios** - Arquitectura escalable
- ✅ **Base de Datos Vectorial** - pgvector para similitud coseno

## Documentación

Toda la documentación está organizada en la carpeta [`readme/`](readme/):

### 🚀 Guías de Inicio
- [**INICIO_RAPIDO.md**](readme/INICIO_RAPIDO.md) - ⭐ Guía completa de inicio rápido (15-20 min)
- [**QUICK_START.md**](readme/QUICK_START.md) - Guía rápida de inicio
- [**DOCKER_GUIDE.md**](readme/DOCKER_GUIDE.md) - Guía completa de Docker
- [**INICIAR_DOCKER.md**](readme/INICIAR_DOCKER.md) - Instrucciones para iniciar Docker

### 🔐 Autenticación y Seguridad
- [**GUIA_CONFIGURACION_AUTH.md**](readme/GUIA_CONFIGURACION_AUTH.md) - ⭐ Configurar OAuth2 Google y Email
- [**AUTH_SYSTEM_DESIGN.md**](readme/AUTH_SYSTEM_DESIGN.md) - Diseño del sistema de autenticación
- [**MSTG_COMPLIANCE.md**](readme/MSTG_COMPLIANCE.md) - Cumplimiento de normas MSTG
- [**MSTG_BACKEND_ACTIVO.md**](readme/MSTG_BACKEND_ACTIVO.md) - ⭐ Normas MSTG activas en backend

### 📚 API y Servicios
- [**API_GATEWAY.md**](readme/API_GATEWAY.md) - Documentación del API Gateway (Nginx)
- [**CHAT_SERVICE_COMPLETO.md**](readme/CHAT_SERVICE_COMPLETO.md) - Servicio de Chat
- [**POSTGRESQL_INTEGRATION_SUMMARY.md**](readme/POSTGRESQL_INTEGRATION_SUMMARY.md) - Integración PostgreSQL
- [**PDF_PROCESSING_FLOW.md**](readme/PDF_PROCESSING_FLOW.md) - Procesamiento de PDFs de leyes

### 🏗️ Arquitectura
- [**ARCHITECTURE.md**](readme/ARCHITECTURE.md) - Arquitectura general del sistema
- [**ARQUITECTURA_ACTUALIZADA.md**](readme/ARQUITECTURA_ACTUALIZADA.md) - Arquitectura actualizada
- [**ARQUITECTURA_CHAT_INTELIGENTE.md**](readme/ARQUITECTURA_CHAT_INTELIGENTE.md) - Chat inteligente
- [**HEXAGONAL_ARCHITECTURE.md**](readme/HEXAGONAL_ARCHITECTURE.md) - Patrón hexagonal
- [**GUIA_REPOSITORIOS.md**](readme/GUIA_REPOSITORIOS.md) - ⭐ Estructura de código y repositorios

### 🚀 Despliegue
- [**DEPLOY_COMPLETADO.md**](readme/DEPLOY_COMPLETADO.md) - Resumen del despliegue Docker
- [**POSTGRESQL_SETUP.md**](readme/POSTGRESQL_SETUP.md) - Configuración de PostgreSQL
- [**SETUP_POSTGRESQL_RAG.md**](readme/SETUP_POSTGRESQL_RAG.md) - Setup RAG + PostgreSQL

### 📊 Implementación
- [**RESUMEN_IMPLEMENTACION.md**](readme/RESUMEN_IMPLEMENTACION.md) - Resumen de implementación
- [**STATUS_CHAT_INTELIGENTE.md**](readme/STATUS_CHAT_INTELIGENTE.md) - Estado del chat
- [**SESSION_SUMMARY.md**](readme/SESSION_SUMMARY.md) - Resumen de sesiones
- [**CLEANUP_PLAN.md**](readme/CLEANUP_PLAN.md) - Plan de limpieza
- [**RESUMEN_LIMPIEZA.md**](readme/RESUMEN_LIMPIEZA.md) - Resumen de limpieza

### 📑 Índice Completo
- [**INDEX.md**](readme/INDEX.md) - Índice de toda la documentación

## Comandos Útiles

```bash
# Iniciar todos los servicios
docker-compose up -d

# Ver logs de un servicio específico
docker logs lexia-chat -f
docker logs lexia-rag -f
docker logs lexia-nginx -f

# Ver estado de todos los servicios
docker-compose ps

# Reiniciar un servicio
docker restart lexia-chat

# Parar todos los servicios
docker-compose down

# Parar y eliminar volúmenes
docker-compose down -v

# Reconstruir imágenes
docker-compose build --no-cache

# Ver logs de todos los servicios
docker-compose logs -f
```

## Health Checks

Verificar que todos los servicios estén funcionando:

```bash
curl http://localhost/health                # API Gateway
curl http://localhost/api/auth/health       # Auth Service
curl http://localhost/api/chat/health       # Chat Service
curl http://localhost/api/rag/health        # RAG Service
curl http://localhost/api/nlp/health        # NLP Service
curl http://localhost/api/clustering/health # Clustering Service
curl http://localhost/api/olap/health       # OLAP Service
```

## Variables de Entorno

Las variables de entorno están configuradas en `docker-compose.yml`:

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - PostgreSQL
- `RAG_SERVICE_URL`, `NLP_SERVICE_URL`, `CLUSTERING_SERVICE_URL` - URLs de servicios
- `EMBEDDING_MODEL` - Modelo de embeddings (Xenova/all-MiniLM-L6-v2)
- `JWT_SECRET` - Secret para autenticación JWT

## Desarrollo

### Estructura del Proyecto

```
LexIA2.0/
├── microservices/          # Microservicios
│   ├── auth/              # Servicio de autenticación
│   ├── chat/              # Servicio de chat (orquestador)
│   └── IA/
│       ├── clustering-ml/ # K-means clustering
│       ├── nlp/          # Procesamiento de lenguaje natural
│       ├── olap-cube/    # Data warehouse
│       └── rag/          # Búsqueda semántica
├── database/              # Migraciones y schemas SQL
│   └── migrations/
├── nginx/                 # Configuración del API Gateway
│   └── nginx.conf
├── readme/                # Documentación
├── scripts/              # Scripts auxiliares
└── docker-compose.yml    # Orquestación de contenedores
```

### Agregar un Nuevo Servicio

1. Crear carpeta en `microservices/`
2. Crear Dockerfile
3. Agregar servicio a `docker-compose.yml`
4. Agregar ruta en `nginx/nginx.conf`
5. Documentar en `readme/`

## Troubleshooting

### Puerto 80 ocupado
```bash
# Windows
netstat -ano | findstr :80
taskkill /PID <pid> /F

# Linux/Mac
lsof -i :80
kill -9 <pid>
```

### Servicios no inician
```bash
# Ver logs
docker-compose logs

# Reiniciar todos los servicios
docker-compose restart

# Reconstruir desde cero
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Error de conexión a PostgreSQL
```bash
# Verificar que PostgreSQL esté healthy
docker ps | grep postgres

# Ver logs de PostgreSQL
docker logs lexia-postgres

# Reiniciar PostgreSQL
docker restart lexia-postgres
```

## Contribuir

1. Fork el proyecto
2. Crear una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

## Licencia

[Especificar licencia]

## Contacto

[Información de contacto]

---

**Versión**: 2.0
**Última actualización**: 2025-11-26
**Estado**: ✅ Producción Ready
