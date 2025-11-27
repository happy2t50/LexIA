# 🚀 LexIA 2.0 - Guía de Inicio Rápido

Esta guía te ayudará a poner en marcha el sistema completo de LexIA 2.0 en **10 minutos**.

---

## ✅ Prerequisitos

### Software requerido:
- [x] **Node.js** v18+ ([Descargar](https://nodejs.org/))
- [x] **PostgreSQL** v14+ ([Descargar](https://www.postgresql.org/download/))
- [x] **Git** ([Descargar](https://git-scm.com/downloads))

### Verificar instalación:
```bash
node --version    # Debe mostrar v18 o superior
npm --version     # Debe mostrar 9 o superior
psql --version    # Debe mostrar 14 o superior
```

---

## 📦 Paso 1: Preparar Base de Datos

### 1.1 Crear base de datos
```bash
# En Windows (CMD o PowerShell)
psql -U postgres

# Dentro de psql:
CREATE DATABASE lexia_db;
\q
```

### 1.2 Aplicar migraciones
```bash
cd "C:\Users\umina\OneDrive\Escritorio\LexIA2.0"

# Migración 1: Schema inicial
psql -U postgres -d lexia_db -f database/migrations/001_initial_schema.sql

# Migración 2: Soporte vectorial (RAG)
psql -U postgres -d lexia_db -f database/migrations/002_add_vector_support.sql

# Migración 3: Chat intelligence
psql -U postgres -d lexia_db -f database/migrations/003_chat_intelligence.sql
```

### 1.3 Verificar instalación
```bash
psql -U postgres -d lexia_db -c "\dt"
```

Deberías ver tablas como: `usuarios`, `abogados`, `documento_chunks`, `conversaciones`, etc.

---

## ⚙️ Paso 2: Configurar Variables de Entorno

### Copiar archivos .env en cada servicio:

```bash
# Auth Service
cd microservices/auth
cp .env.example .env
# Editar .env y configurar DB_PASSWORD

# OLAP Cube
cd ../IA/olap-cube
cp .env.example .env
# Editar .env y configurar USE_POSTGRESQL=true

# Clustering ML
cd ../clustering-ml
cp .env.example .env

# NLP
cd ../nlp
cp .env.example .env

# RAG
cd ../rag
cp .env.example .env

# Chat
cd ../../../chat
cp .env.example .env
# Editar .env y configurar AUTO_GROUP_USERS=true
```

### Configuración mínima de .env (todos los servicios):
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lexia_db
DB_USER=postgres
DB_PASSWORD=TU_PASSWORD_AQUI
```

---

## 📥 Paso 3: Instalar Dependencias

### Opción A: Instalar todo de una vez
```bash
# Desde la raíz del proyecto
cd "C:\Users\umina\OneDrive\Escritorio\LexIA2.0"

# Auth
cd microservices/auth && npm install && cd ../..

# OLAP Cube
cd microservices/IA/olap-cube && npm install && cd ../../..

# Clustering
cd microservices/IA/clustering-ml && npm install && cd ../../..

# NLP
cd microservices/IA/nlp && npm install && cd ../../..

# RAG
cd microservices/IA/rag && npm install && cd ../../..

# Chat
cd microservices/chat && npm install && cd ../..
```

### Opción B: Instalar uno por uno
```bash
# Ir a cada carpeta y ejecutar:
npm install
```

---

## 🚀 Paso 4: Iniciar Servicios

### IMPORTANTE: Iniciar en este orden

#### Terminal 1 - Auth Service
```bash
cd microservices/auth
npm run dev
```
Espera a ver: `🔐 Auth Service corriendo en puerto 3003`

#### Terminal 2 - OLAP Cube
```bash
cd microservices/IA/olap-cube
npm run dev
```
Espera a ver: `📊 OLAP Cube corriendo en puerto 3001`

#### Terminal 3 - Clustering ML
```bash
cd microservices/IA/clustering-ml
npm run dev
```
Espera a ver: `🎯 Clustering Service corriendo en puerto 3002`

#### Terminal 4 - NLP Service
```bash
cd microservices/IA/nlp
npm run dev
```
Espera a ver: `🧠 NLP Service corriendo en puerto 3004`

#### Terminal 5 - RAG Service (CRÍTICO: esperar carga del modelo)
```bash
cd microservices/IA/rag
npm run dev
```
Espera a ver:
```
📚 RAG Service corriendo en puerto 3009
⏳ Cargando modelo de embeddings...
✅ Modelo de embeddings cargado exitosamente: Xenova/all-MiniLM-L6-v2
```
**⚠️ NO continuar hasta ver "Modelo cargado exitosamente"** (puede tardar 30-60 segundos la primera vez)

#### Terminal 6 - Chat Service (CORE - iniciar al final)
```bash
cd microservices/chat
npm run dev
```
Espera a ver:
```
🤖 Chat Service corriendo en puerto 3010
📊 Integrado con RAG: http://localhost:3009
🧠 Integrado con NLP: http://localhost:3004
🎯 Integrado con Clustering: http://localhost:3002
```

---

## ✅ Paso 5: Verificar que Todo Funciona

### 5.1 Health Checks
```bash
# Verificar cada servicio (en una nueva terminal)
curl http://localhost:3003/health  # Auth
curl http://localhost:3001/health  # OLAP
curl http://localhost:3002/health  # Clustering
curl http://localhost:3004/health  # NLP
curl http://localhost:3009/health  # RAG
curl http://localhost:3010/health  # Chat
```

Todos deben responder con `"status": "OK"`

### 5.2 Prueba completa del sistema
```bash
# 1. Iniciar sesión de chat
curl -X POST http://localhost:3010/session/start \
  -H "Content-Type: application/json" \
  -d "{\"usuarioId\": \"test123\", \"nombre\": \"Usuario Test\"}"

# Copiar el sessionId de la respuesta

# 2. Enviar mensaje de prueba
curl -X POST http://localhost:3010/message \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"PEGA_SESSION_ID_AQUI\",
    \"usuarioId\": \"test123\",
    \"nombre\": \"Usuario Test\",
    \"mensaje\": \"me multaron por estacionarme mal\"
  }"
```

Si obtienes una respuesta con:
- ✅ `"success": true`
- ✅ `"mensaje"`: respuesta del chat
- ✅ `"articulos"`: artículos legales encontrados
- ✅ `"cluster"`: cluster detectado (ej. "C2")
- ✅ `"sugerencias"`: sugerencias de acciones

**¡El sistema está funcionando correctamente! 🎉**

---

## 🎯 Servicios y Puertos

| Servicio | Puerto | Status | Descripción |
|----------|--------|--------|-------------|
| Auth | 3003 | ✅ Activo | Autenticación JWT |
| OLAP Cube | 3001 | ✅ Activo | Análisis y analytics |
| Clustering ML | 3002 | ✅ Activo | Clasificación K-means |
| NLP | 3004 | ✅ Activo | Análisis de sentimiento |
| RAG | 3009 | ✅ Activo | Búsqueda semántica |
| Chat | 3010 | ✅ Activo | **CORE** - Orquestador |

---

## 🔧 Solución de Problemas

### Problema: "Cannot connect to database"
**Solución:**
1. Verificar que PostgreSQL está corriendo:
   ```bash
   # Windows
   services.msc
   # Buscar "postgresql" y verificar que está "Running"
   ```
2. Verificar credenciales en `.env`
3. Verificar que la base de datos `lexia_db` existe

### Problema: "Port already in use"
**Solución:**
```bash
# Windows - Encontrar proceso usando puerto
netstat -ano | findstr :3010

# Matar proceso
taskkill /PID <PID_NUMBER> /F
```

### Problema: RAG Service - "Model loading failed"
**Solución:**
1. Verificar conexión a internet (primera vez descarga modelo)
2. Esperar más tiempo (puede tardar 1-2 minutos)
3. Verificar espacio en disco (modelo ocupa ~50MB)
4. Reintentar:
   ```bash
   cd microservices/IA/rag
   rm -rf node_modules
   npm install
   npm run dev
   ```

### Problema: Chat Service - "RAG_SERVICE_URL is not responding"
**Solución:**
1. Verificar que RAG Service está corriendo
2. Verificar que el modelo de RAG cargó exitosamente
3. Verificar URL en `.env` del Chat Service:
   ```env
   RAG_SERVICE_URL=http://localhost:3009
   ```

### Problema: "Embedding dimension mismatch"
**Solución:**
Aplicar migración 002 nuevamente:
```bash
psql -U postgres -d lexia_db -f database/migrations/002_add_vector_support.sql
```

---

## 📊 Ejemplo de Conversación Completa

### 1. Iniciar sesión
```bash
curl -X POST http://localhost:3010/session/start \
  -H "Content-Type: application/json" \
  -d '{"usuarioId": "juan123", "nombre": "Juan"}'
```

**Respuesta:**
```json
{
  "success": true,
  "sessionId": "uuid-session-123",
  "mensaje": "¡Hola Juan! 👋\n\nSoy LexIA, tu asistente legal inteligente..."
}
```

### 2. Hacer pregunta
```bash
curl -X POST http://localhost:3010/message \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "uuid-session-123",
    "usuarioId": "juan123",
    "nombre": "Juan",
    "mensaje": "me multaron por estacionarme 30 cm separado de la banqueta"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "mensaje": "Hola Juan, entiendo tu preocupación.\n\nEs importante que sepas que tienes opciones...\n\n📋 Información Legal Aplicable:\n\n**Artículo 138 - Estacionamiento Prohibido**...",
  "articulos": [
    {
      "titulo": "Artículo 138",
      "contenido": "...",
      "similitud": 0.92
    }
  ],
  "sugerencias": [
    {"tipo": "abogados", "texto": "👨‍⚖️ Ver abogados especializados"},
    {"tipo": "impugnar", "texto": "⚖️ ¿Cómo impugnar esta multa?"}
  ],
  "cluster": "C2",
  "sentimiento": "preocupado"
}
```

### 3. Solicitar abogados
```bash
curl -X POST http://localhost:3010/recommend-lawyers \
  -H "Content-Type: application/json" \
  -d '{
    "usuarioId": "juan123",
    "cluster": "C2",
    "ciudad": "Chiapas",
    "limit": 10
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "cluster": "C2",
  "totalAbogados": 10,
  "abogados": [
    {
      "nombre": "Lic. María González",
      "especialidades": ["Infracciones de Tránsito"],
      "rating": 4.9,
      "experiencia": 15,
      "scorePersonalizado": 0.95,
      "razonRecomendacion": "Alta tasa de éxito • 15 años experiencia"
    }
  ]
}
```

---

## 📚 Siguientes Pasos

### 1. Cargar datos de prueba
- [ ] Crear usuarios de prueba
- [ ] Indexar documentos legales en RAG
- [ ] Crear perfiles de abogados

### 2. Personalizar
- [ ] Ajustar templates de respuestas empáticas
- [ ] Configurar clusters según tus necesidades
- [ ] Personalizar scoring de abogados

### 3. Integrar Frontend
- [ ] React/Vue/Angular
- [ ] WebSockets para chat en tiempo real
- [ ] Dashboard de analytics

### 4. Producción
- [ ] Docker Compose setup
- [ ] HTTPS/TLS
- [ ] Load balancing
- [ ] Monitoring (Prometheus/Grafana)

---

## 📖 Documentación Completa

- **Arquitectura:** [ARQUITECTURA_ACTUALIZADA.md](./ARQUITECTURA_ACTUALIZADA.md)
- **Chat Service:** [microservices/chat/README.md](./microservices/chat/README.md)
- **RAG Service:** [microservices/IA/rag/README.md](./microservices/IA/rag/README.md)
- **Limpieza realizada:** [CLEANUP_PLAN.md](./CLEANUP_PLAN.md)

---

## 🆘 ¿Necesitas Ayuda?

### Contactos:
- **GitHub Issues:** [Reportar problema](https://github.com/tu-repo/lexia-2.0/issues)
- **Documentación:** Ver carpeta `docs/`
- **Logs:** Revisar consola de cada servicio

---

**¡Listo! Ahora tienes LexIA 2.0 corriendo completamente. 🎉**

**Última actualización:** 22 de Noviembre, 2025
