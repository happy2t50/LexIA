# 🐳 LexIA 2.0 - Guía Docker

Guía completa para ejecutar LexIA 2.0 con Docker.

---

## 📋 Prerequisitos

### Software requerido:
- ✅ **Docker Desktop** instalado y corriendo
- ✅ **8GB RAM** mínimo (recomendado 16GB)
- ✅ **10GB espacio en disco** libre

### Verificar Docker:
```bash
docker --version
docker-compose --version
```

---

## 🚀 Inicio Rápido (Opción Automática)

### Windows PowerShell:
```powershell
cd C:\Users\umina\OneDrive\Escritorio\LexIA2.0
.\docker-test.ps1
```

### Git Bash / Linux / Mac:
```bash
cd /c/Users/umina/OneDrive/Escritorio/LexIA2.0
chmod +x docker-test.sh
./docker-test.sh
```

Este script automáticamente:
1. ✅ Construye todas las imágenes Docker
2. ✅ Inicia todos los contenedores
3. ✅ Espera a que PostgreSQL esté listo
4. ✅ Verifica health de todos los servicios
5. ✅ Ejecuta pruebas completas del sistema

---

## 🔧 Inicio Manual (Opción Paso a Paso)

### Paso 1: Construir imágenes
```bash
docker-compose build
```

Esto puede tardar 5-10 minutos la primera vez.

### Paso 2: Iniciar servicios
```bash
docker-compose up -d
```

### Paso 3: Verificar estado
```bash
docker-compose ps
```

Deberías ver 7 contenedores:
- lexia-postgres
- lexia-auth
- lexia-olap
- lexia-clustering
- lexia-nlp
- lexia-rag
- lexia-chat

### Paso 4: Ver logs
```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f chat
docker-compose logs -f rag
docker-compose logs -f postgres
```

### Paso 5: Esperar a que estén listos
```bash
# Esperar ~60 segundos para que todos los servicios inicien
# RAG puede tardar más porque descarga el modelo de embeddings
```

### Paso 6: Health checks
```bash
curl http://localhost:3003/health  # Auth
curl http://localhost:3001/health  # OLAP
curl http://localhost:3002/health  # Clustering
curl http://localhost:3004/health  # NLP
curl http://localhost:3009/health  # RAG
curl http://localhost:3010/health  # Chat
```

---

## 🧪 Pruebas del Sistema

### Test 1: Iniciar sesión de chat
```bash
curl -X POST http://localhost:3010/session/start \
  -H "Content-Type: application/json" \
  -d '{"usuarioId": "test123", "nombre": "Test Usuario"}'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "sessionId": "uuid-aqui",
  "mensaje": "¡Hola Test Usuario! ..."
}
```

Copiar el `sessionId` para el siguiente test.

### Test 2: Enviar mensaje
```bash
curl -X POST http://localhost:3010/message \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "PEGA_SESSION_ID_AQUI",
    "usuarioId": "test123",
    "nombre": "Test",
    "mensaje": "me multaron por estacionarme mal"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "mensaje": "Hola Test, entiendo tu preocupación...",
  "cluster": "C2",
  "sentimiento": "preocupado",
  "articulos": [...],
  "sugerencias": [...]
}
```

### Test 3: Recomendar abogados
```bash
curl -X POST http://localhost:3010/recommend-lawyers \
  -H "Content-Type: application/json" \
  -d '{
    "usuarioId": "test123",
    "cluster": "C2",
    "limit": 10
  }'
```

---

## 📊 Servicios y Puertos

| Servicio | Puerto | Contenedor | Estado |
|----------|--------|------------|--------|
| PostgreSQL | 5432 | lexia-postgres | ✅ Con pgvector |
| Auth | 3003 | lexia-auth | ✅ JWT |
| OLAP Cube | 3001 | lexia-olap | ✅ PostgreSQL mode |
| Clustering | 3002 | lexia-clustering | ✅ K-means |
| NLP | 3004 | lexia-nlp | ✅ Sentiment |
| RAG | 3009 | lexia-rag | ✅ Embeddings locales |
| Chat | 3010 | lexia-chat | ✅ CORE |

---

## 🗄️ Base de Datos

### Conectarse a PostgreSQL:
```bash
docker exec -it lexia-postgres psql -U postgres -d lexia_db
```

### Ver tablas:
```sql
\dt
```

### Verificar extensión pgvector:
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Ver datos de prueba:
```sql
SELECT * FROM conversaciones LIMIT 5;
SELECT * FROM documento_chunks LIMIT 5;
```

### Salir:
```sql
\q
```

---

## 🔄 Comandos Útiles

### Ver estado de contenedores:
```bash
docker-compose ps
```

### Ver logs en tiempo real:
```bash
# Todos los servicios
docker-compose logs -f

# Un servicio específico
docker-compose logs -f chat
docker-compose logs -f rag
docker-compose logs -f postgres
```

### Reiniciar un servicio:
```bash
docker-compose restart chat
docker-compose restart rag
```

### Reiniciar todos los servicios:
```bash
docker-compose restart
```

### Detener servicios:
```bash
docker-compose stop
```

### Detener y eliminar contenedores:
```bash
docker-compose down
```

### Detener y eliminar INCLUYENDO volúmenes (⚠️ BORRA LA BASE DE DATOS):
```bash
docker-compose down -v
```

### Reconstruir un servicio:
```bash
docker-compose build chat
docker-compose up -d chat
```

### Ver uso de recursos:
```bash
docker stats
```

---

## 🐛 Solución de Problemas

### Problema: "Port already in use"
```bash
# Windows - Encontrar y matar proceso
netstat -ano | findstr :3010
taskkill /PID <PID> /F

# O cambiar puerto en docker-compose.yml
```

### Problema: "Cannot connect to database"
```bash
# Ver logs de PostgreSQL
docker-compose logs postgres

# Verificar si PostgreSQL está listo
docker exec lexia-postgres pg_isready -U postgres

# Reiniciar PostgreSQL
docker-compose restart postgres
```

### Problema: "RAG Service not responding"
```bash
# Ver logs de RAG
docker-compose logs -f rag

# El modelo puede tardar en descargar la primera vez
# Esperar a ver: "✅ Modelo de embeddings cargado exitosamente"
```

### Problema: "Out of memory"
```bash
# Aumentar memoria de Docker Desktop
# Settings > Resources > Memory > 8GB o más

# O reducir memoria de RAG en docker-compose.yml
```

### Problema: "Build failed"
```bash
# Limpiar cache y reconstruir
docker-compose down
docker system prune -a
docker-compose build --no-cache
docker-compose up -d
```

### Ver logs detallados de un servicio:
```bash
docker logs lexia-chat --tail 100 -f
docker logs lexia-rag --tail 100 -f
```

---

## 📁 Volúmenes de Datos

### Ver volúmenes:
```bash
docker volume ls
```

Volúmenes creados:
- `lexia20_postgres_data` - Base de datos PostgreSQL
- `lexia20_rag_models` - Modelos de embeddings de RAG

### Backup de base de datos:
```bash
docker exec lexia-postgres pg_dump -U postgres lexia_db > backup.sql
```

### Restaurar base de datos:
```bash
docker exec -i lexia-postgres psql -U postgres lexia_db < backup.sql
```

---

## 🔐 Seguridad

### Cambiar contraseñas en producción:

Editar `docker-compose.yml`:
```yaml
environment:
  POSTGRES_PASSWORD: TU_PASSWORD_SEGURA_AQUI
  JWT_SECRET: TU_JWT_SECRET_AQUI
```

### Variables de entorno sensibles:

Crear archivo `.env` en la raíz:
```env
POSTGRES_PASSWORD=mi_password_segura
JWT_SECRET=mi_jwt_secret_largo_y_aleatorio
```

Y en docker-compose.yml:
```yaml
environment:
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  JWT_SECRET: ${JWT_SECRET}
```

---

## 🚀 Producción

### Mejoras recomendadas para producción:

1. **HTTPS/TLS:**
   - Usar Nginx reverse proxy
   - Certificados SSL/TLS

2. **Monitoreo:**
   - Prometheus + Grafana
   - Health checks más robustos

3. **Escalabilidad:**
   - Kubernetes deployment
   - Load balancing

4. **Backup automático:**
   - Cron jobs para backup de PostgreSQL
   - Backup de volúmenes

5. **Logging centralizado:**
   - ELK Stack (Elasticsearch, Logstash, Kibana)
   - Fluentd

---

## 📈 Monitoreo

### Ver uso de recursos en tiempo real:
```bash
docker stats
```

### Ver memoria de un contenedor:
```bash
docker stats lexia-rag --no-stream
```

### Ver logs de errores:
```bash
docker-compose logs | grep -i error
docker-compose logs | grep -i exception
```

---

## 🎯 Arquitectura Docker

```
┌─────────────────────────────────────────────────────┐
│              Docker Network: lexia-network          │
│                                                     │
│  ┌────────────────┐  ┌────────────────┐           │
│  │   PostgreSQL   │  │   Auth (3003)  │           │
│  │   (5432)       │  │                │           │
│  │   + pgvector   │  │   JWT Tokens   │           │
│  └────────┬───────┘  └────────────────┘           │
│           │                                        │
│  ┌────────┴────────────────────────────┐          │
│  │                                      │          │
│  ▼                                      ▼          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │OLAP(3001)│  │Cluster   │  │NLP(3004) │         │
│  │          │  │(3002)    │  │          │         │
│  └──────────┘  └──────────┘  └──────────┘         │
│                      │                             │
│                      ▼                             │
│              ┌──────────────┐                      │
│              │  RAG (3009)  │                      │
│              │  + Embeddings│                      │
│              └──────┬───────┘                      │
│                     │                              │
│                     ▼                              │
│              ┌──────────────┐                      │
│              │ Chat (3010)  │  ← CORE              │
│              │              │                      │
│              └──────────────┘                      │
│                                                     │
│  Volúmenes persistentes:                           │
│  • postgres_data (Base de datos)                   │
│  • rag_models (Modelos embeddings)                 │
└─────────────────────────────────────────────────────┘
```

---

## ✅ Checklist de Verificación

Antes de considerar el sistema como funcionando:

- [ ] Docker Desktop está corriendo
- [ ] `docker-compose build` completado sin errores
- [ ] `docker-compose up -d` ejecutado
- [ ] 7 contenedores corriendo (`docker-compose ps`)
- [ ] PostgreSQL health check OK
- [ ] Todos los servicios responden a /health
- [ ] Test de sesión de chat funciona
- [ ] Test de mensaje funciona
- [ ] Cluster detectado correctamente
- [ ] Artículos legales retornados

---

## 📚 Recursos Adicionales

- [Docker Compose Docs](https://docs.docker.com/compose/)
- [PostgreSQL Docker](https://hub.docker.com/_/postgres)
- [pgvector](https://github.com/pgvector/pgvector)

---

**¡Sistema Dockerizado Listo! 🎉**

**Última actualización:** 22 de Noviembre, 2025
