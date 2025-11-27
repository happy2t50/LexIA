# 🐳 LexIA 2.0 con Docker - README

## Inicio Rápido

### 1. Asegúrate de tener Docker Desktop corriendo

### 2. Construir e iniciar (Automático):

**Windows PowerShell:**
```powershell
.\docker-test.ps1
```

**Git Bash / Linux / Mac:**
```bash
chmod +x docker-test.sh
./docker-test.sh
```

### 3. O manual:

```bash
# Build
docker-compose build

# Iniciar
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

---

## 🧪 Probar el Sistema

### Health Check:
```bash
curl http://localhost:3010/health
```

### Iniciar chat:
```bash
curl -X POST http://localhost:3010/session/start \
  -H "Content-Type: application/json" \
  -d '{"usuarioId": "test", "nombre": "Test"}'
```

### Enviar mensaje:
```bash
curl -X POST http://localhost:3010/message \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "SESSION_ID_DEL_PASO_ANTERIOR",
    "usuarioId": "test",
    "nombre": "Test",
    "mensaje": "me multaron por estacionarme mal"
  }'
```

---

## 📊 Servicios Disponibles

| Servicio | Puerto | URL |
|----------|--------|-----|
| Chat (CORE) | 3010 | http://localhost:3010 |
| RAG | 3009 | http://localhost:3009 |
| NLP | 3004 | http://localhost:3004 |
| Auth | 3003 | http://localhost:3003 |
| Clustering | 3002 | http://localhost:3002 |
| OLAP Cube | 3001 | http://localhost:3001 |
| PostgreSQL | 5432 | localhost:5432 |

---

## 🔧 Comandos Útiles

```bash
# Ver estado
docker-compose ps

# Ver logs de chat
docker-compose logs -f chat

# Reiniciar servicio
docker-compose restart chat

# Conectarse a PostgreSQL
docker exec -it lexia-postgres psql -U postgres -d lexia_db

# Detener todo
docker-compose down

# Detener y borrar datos (⚠️)
docker-compose down -v
```

---

## 📚 Documentación Completa

Ver [DOCKER_GUIDE.md](./DOCKER_GUIDE.md) para guía completa.

---

**¡Sistema listo para usar! 🚀**
