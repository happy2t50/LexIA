# 🏗️ LexIA 2.0 - Arquitectura Actualizada

**Fecha:** 22 de Noviembre, 2025
**Versión:** 2.0 - Limpia y Optimizada

---

## 🎯 Visión General

LexIA 2.0 es un **asistente legal inteligente** que combina:
- 💬 Chat conversacional con memoria contextual
- 🧠 Inteligencia Artificial con aprendizaje continuo
- 🎯 Clustering automático de consultas legales
- 📚 Búsqueda semántica de artículos legales
- 👨‍⚖️ Recomendación personalizada de abogados
- 👥 Foro comunitario con agrupación automática

---

## 🏛️ Arquitectura de Microservicios

### Diagrama Principal

```
┌────────────────────────────────────────────────────────────────────┐
│                        USUARIO FINAL                               │
│                   (Web/Mobile Frontend)                            │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Auth Service   │
                    │   (Puerto 3003) │
                    │                 │
                    │  • JWT Tokens   │
                    │  • Login/Signup │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
    ┌─────────▼────────┐ ┌──▼────────┐ ┌──▼──────────────┐
    │   OLAP Cube      │ │    NLP    │ │ Clustering ML   │
    │  (Puerto 3001)   │ │ (3004)    │ │  (Puerto 3002)  │
    │                  │ │           │ │                 │
    │ • PostgreSQL     │ │ • Análisis│ │ • K-means       │
    │ • Analytics      │ │   Sentiment│ │ • 5 Clusters   │
    │ • Dashboards     │ │ • Intent  │ │ • Predicción    │
    └──────────────────┘ └───────────┘ └─────────────────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
                    ┌────────▼────────┐
                    │  RAG Service    │
                    │  (Puerto 3009)  │
                    │                 │
                    │ • Embeddings    │
                    │   Locales       │
                    │ • pgvector      │
                    │ • Búsqueda      │
                    │   Semántica     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Chat Service   │
                    │  (Puerto 3010)  │
                    │    🎯 CORE      │
                    │                 │
                    │ • Conversación  │
                    │ • Memoria       │
                    │ • Recomendación │
                    │ • ML Learning   │
                    │ • Agrupación    │
                    │   Usuarios      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  PostgreSQL DB  │
                    │                 │
                    │ • lexia_db      │
                    │ • pgvector      │
                    │ • Todas tablas  │
                    └─────────────────┘
```

---

## 📦 Servicios Activos

### 1. 🔐 Auth Service (Puerto 3003)
**Responsabilidad:** Autenticación y autorización

**Tecnologías:**
- Express.js
- JWT (JSON Web Tokens)
- PostgreSQL

**Funcionalidades:**
- ✅ Login y registro de usuarios
- ✅ Verificación de tokens JWT
- ✅ Gestión de roles (usuario, experto, admin)
- ✅ Recuperación de contraseñas

**Endpoints principales:**
```
POST /auth/login       - Iniciar sesión
POST /auth/register    - Registro de usuario
POST /auth/verify      - Verificar token
POST /auth/refresh     - Refrescar token
```

---

### 2. 📊 OLAP Cube Service (Puerto 3001)
**Responsabilidad:** Análisis multidimensional de datos

**Tecnologías:**
- Express.js
- PostgreSQL (configuración dual: in-memory o PostgreSQL)
- Hexagonal Architecture

**Funcionalidades:**
- ✅ Análisis por dimensiones (tiempo, ciudad, cluster, tipo_multa)
- ✅ Métricas agregadas
- ✅ Dashboards analíticos
- ✅ Reportes ejecutivos

**Endpoints principales:**
```
POST /consultas        - Crear consulta
GET /analytics/dimension/:dimension  - Análisis dimensional
GET /analytics/summary - Resumen general
```

**Configuración:**
```env
USE_POSTGRESQL=true   # true para PostgreSQL, false para in-memory
```

---

### 3. 🎯 Clustering ML Service (Puerto 3002)
**Responsabilidad:** Clasificación automática de consultas

**Tecnologías:**
- Express.js
- ml-kmeans (K-means clustering)
- Natural (NLP básico)
- PostgreSQL

**Funcionalidades:**
- ✅ Clasificación automática en 5 clusters (C1-C5):
  - **C1:** Infracciones graves de tránsito
  - **C2:** Estacionamiento
  - **C3:** Infracciones menores
  - **C4:** Documentación vehicular
  - **C5:** Licencias y permisos
- ✅ Entrenamiento con datos históricos
- ✅ Predicción de cluster para nuevas consultas

**Endpoints principales:**
```
POST /cluster/predict  - Predecir cluster de nueva consulta
POST /cluster/train    - Entrenar modelo
GET /cluster/info      - Información del modelo
```

---

### 4. 🧠 NLP Service (Puerto 3004)
**Responsabilidad:** Procesamiento de lenguaje natural

**Tecnologías:**
- Express.js
- Natural.js
- Sentiment Analysis
- Intent Detection

**Funcionalidades:**
- ✅ Análisis de sentimiento:
  - preocupado
  - frustrado
  - confundido
  - neutral
  - satisfecho
- ✅ Detección de intención:
  - consulta_multa
  - impugnacion
  - pago
  - informacion_general
  - contactar_abogado

**Endpoints principales:**
```
POST /process          - Procesar texto
POST /sentiment        - Analizar sentimiento
POST /intent           - Detectar intención
```

---

### 5. 📚 RAG Service (Puerto 3009)
**Responsabilidad:** Búsqueda semántica con embeddings

**Tecnologías:**
- Express.js
- Transformers.js (Xenova/all-MiniLM-L6-v2)
- pgvector (PostgreSQL extension)
- Cosine similarity

**Funcionalidades:**
- ✅ Embeddings locales (sin OpenAI)
- ✅ Búsqueda semántica de artículos legales
- ✅ Chunking automático de documentos
- ✅ Indexación vectorial con HNSW
- ✅ Integración con Clustering para detección automática
- ✅ Contexto enriquecido para el chat

**Características técnicas:**
- **Modelo:** Xenova/all-MiniLM-L6-v2
- **Dimensiones:** 384
- **Índice:** HNSW (Hierarchical Navigable Small World)
- **Similitud:** Cosine similarity
- **Umbral:** 0.7 (70% similitud mínima)

**Endpoints principales:**
```
POST /search           - Búsqueda semántica básica
POST /search-smart     - Búsqueda + clustering automático
POST /index-document   - Indexar nuevo documento
GET /health            - Health check + info del modelo
```

**Ejemplo de uso:**
```bash
curl -X POST http://localhost:3009/search-smart \
  -H "Content-Type: application/json" \
  -d '{
    "query": "me multaron por estacionarme 30 cm de la banqueta",
    "usuarioId": "user123"
  }'
```

**Respuesta:**
```json
{
  "clusterDetectado": "C2",
  "chunksRecuperados": [
    {
      "contenido": "Artículo 138 - Estacionamiento...",
      "similitud": 0.92,
      "categoria": "Código de Tránsito"
    }
  ],
  "contexto": "Información legal relevante sobre estacionamiento...",
  "tiempoBusquedaMs": 234
}
```

---

### 6. 💬 Chat Service (Puerto 3010) - 🎯 CORE PRINCIPAL
**Responsabilidad:** Orquestador principal del sistema

**Tecnologías:**
- Express.js
- PostgreSQL
- Axios (comunicación con otros servicios)
- Vector embeddings para memoria

**Funcionalidades:**
- ✅ **Conversación contextual** con memoria completa
- ✅ **Respuestas empáticas** según sentimiento del usuario
- ✅ **Recomendación inteligente de abogados** con ML
- ✅ **Agrupación automática** de usuarios con problemas similares
- ✅ **Sistema de aprendizaje** continuo por feedback
- ✅ **Sugerencias contextuales** inteligentes
- ✅ **Detección de cambio de tema**
- ✅ **Tracking completo** de interacciones

**Servicios internos:**

#### 6.1 ConversationService
```typescript
// Gestión de sesiones y mensajes
- getOrCreateSession(usuarioId)
- saveMessage(sessionId, usuarioId, rol, mensaje, metadata)
- getConversationHistory(sessionId, limit)
- detectTopicChange(sessionId, newCluster)
```

#### 6.2 ResponseGenerator
```typescript
// Generación de respuestas empáticas
- generateResponse(nombre, sentimiento, intencion, articulos, cluster)
- generateWelcomeMessage(nombre)
- generateSuggestions(cluster, intencion)
- generateGoodbyeMessage()
```

**Templates de empatía:**
- **Preocupado:** "Hola {nombre}, entiendo tu preocupación..."
- **Frustrado:** "Comprendo tu frustración {nombre}..."
- **Confundido:** "Déjame ayudarte a aclarar esto..."
- **Neutral:** "Hola {nombre}, con gusto te ayudo..."

#### 6.3 LawyerRecommendationService
```typescript
// Recomendación con Machine Learning
- recommendLawyers(cluster, usuarioId, ciudad, limit)
- trackContact(abogadoId, cluster)
- getTopLawyers(cluster)
```

**Scoring dinámico:**
```
score_inicial = 0.5
valoración 5 estrellas → score += 10%
valoración 3 estrellas → score sin cambio
valoración 1-2 estrellas → score -= 10%
caso exitoso → score += 15%
```

#### 6.4 UserClusteringService
```typescript
// Agrupación de usuarios
- addUserToGroup(usuarioId, cluster)
- findSimilarUsers(usuarioId, cluster, limit)
- getUserGroups(usuarioId)
- suggestGroups(usuarioId)
```

#### 6.5 LearningService
```typescript
// Sistema de aprendizaje
- recordFeedback(usuarioId, tipo, data)
- getLearningMetrics(cluster)
- getTopLawyers(cluster, limit)
- analyzeTrends(dias)
```

**Endpoints principales:**
```
POST /session/start              - Iniciar sesión de chat
POST /message                    - Enviar mensaje
GET  /session/:id/history        - Historial
POST /session/:id/close          - Cerrar sesión

POST /recommend-lawyers          - Recomendar abogados
POST /contact-lawyer             - Registrar contacto
GET  /top-lawyers/:cluster       - Top abogados

POST /find-similar-users         - Buscar usuarios similares
GET  /user/:id/groups            - Grupos del usuario
GET  /user/:id/suggest-groups    - Sugerir grupos

POST /feedback                   - Registrar feedback
GET  /metrics                    - Métricas de aprendizaje
```

**Flujo completo de procesamiento:**
```
1. Usuario envía mensaje
   ↓
2. Chat guarda mensaje en conversaciones
   ↓
3. Llama a RAG → búsqueda semántica + cluster
   ↓
4. Llama a NLP → sentimiento + intención
   ↓
5. Detecta cambio de tema (si aplica)
   ↓
6. Obtiene contexto de conversación
   ↓
7. ResponseGenerator crea respuesta empática
   ↓
8. Genera sugerencias contextuales
   ↓
9. Guarda respuesta en conversaciones
   ↓
10. Agrupa usuario automáticamente (si está habilitado)
   ↓
11. Retorna respuesta + artículos + sugerencias
```

---

## 🗄️ Base de Datos PostgreSQL

### Extensiones requeridas:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
```

### Tablas principales:

#### Tabla: `documento_chunks`
```sql
CREATE TABLE documento_chunks (
  id UUID PRIMARY KEY,
  documento_id UUID,
  chunk_index INT,
  contenido TEXT,
  embedding vector(384),  -- Para RAG
  metadata JSONB
);

CREATE INDEX ON documento_chunks USING hnsw (embedding vector_cosine_ops);
```

#### Tabla: `conversaciones`
```sql
CREATE TABLE conversaciones (
  id UUID PRIMARY KEY,
  usuario_id UUID,
  sesion_id UUID,
  mensaje TEXT,
  rol VARCHAR(20),  -- user, assistant, system
  cluster_detectado VARCHAR(10),
  embedding vector(384),  -- Para similitud de conversación
  sentimiento VARCHAR(20),
  intencion VARCHAR(50),
  contexto JSONB,
  fecha TIMESTAMP DEFAULT NOW()
);
```

#### Tabla: `sesiones_chat`
```sql
CREATE TABLE sesiones_chat (
  id UUID PRIMARY KEY,
  usuario_id UUID,
  fecha_inicio TIMESTAMP DEFAULT NOW(),
  fecha_fin TIMESTAMP,
  activa BOOLEAN DEFAULT true
);
```

#### Tabla: `usuarios_clusters`
```sql
CREATE TABLE usuarios_clusters (
  usuario_id UUID,
  cluster VARCHAR(10),
  total_consultas INT DEFAULT 1,
  ultima_consulta TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (usuario_id, cluster)
);
```

#### Tabla: `grupos_usuarios`
```sql
CREATE TABLE grupos_usuarios (
  id UUID PRIMARY KEY,
  cluster VARCHAR(10),
  nombre VARCHAR(255),
  descripcion TEXT,
  total_miembros INT DEFAULT 0,
  fecha_creacion TIMESTAMP DEFAULT NOW()
);
```

#### Tabla: `interacciones_aprendizaje`
```sql
CREATE TABLE interacciones_aprendizaje (
  id UUID PRIMARY KEY,
  tipo VARCHAR(50),  -- valoracion_abogado, like_respuesta, caso_exitoso
  usuario_id UUID,
  abogado_id UUID,
  consulta_id UUID,
  conversacion_id UUID,
  valoracion INT,  -- 1-5
  feedback TEXT,
  cluster VARCHAR(10),
  fecha TIMESTAMP DEFAULT NOW()
);
```

#### Tabla: `recommendation_scores`
```sql
CREATE TABLE recommendation_scores (
  abogado_id UUID,
  cluster VARCHAR(10),
  score_inicial FLOAT DEFAULT 0.5,
  score_ajustado FLOAT DEFAULT 0.5,
  total_contactos INT DEFAULT 0,
  total_casos_exitosos INT DEFAULT 0,
  ultima_actualizacion TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (abogado_id, cluster)
);
```

### Funciones SQL:

#### `buscar_chunks_similares()`
```sql
CREATE OR REPLACE FUNCTION buscar_chunks_similares(
  query_embedding vector(384),
  limite INT DEFAULT 5,
  umbral_similitud FLOAT DEFAULT 0.7
)
RETURNS TABLE (...) AS $
-- Busca chunks más similares usando cosine similarity
$;
```

#### `actualizar_score_abogado()`
```sql
CREATE OR REPLACE FUNCTION actualizar_score_abogado(
  p_abogado_id UUID,
  p_cluster VARCHAR,
  p_valoracion INT
)
RETURNS VOID AS $
-- Actualiza score dinámicamente según valoración
$;
```

---

## 🔄 Flujo de Datos Completo

### Ejemplo: Usuario pregunta sobre multa de estacionamiento

```
┌─────────────────────────────────────────────────────────────┐
│ USUARIO: "me multaron por estacionarme 30 cm de banqueta"  │
└────────────────────────────┬────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Chat Service   │
                    │   (3010)        │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
    ┌─────────▼────────┐ ┌──▼────────┐ ┌──▼──────────────┐
    │  RAG Service     │ │  NLP      │ │ Clustering      │
    │  (3009)          │ │  (3004)   │ │ (3002)          │
    │                  │ │           │ │                 │
    │ Búsqueda         │ │ Detecta:  │ │ Ya detectado    │
    │ semántica        │ │ • preocup.│ │ por RAG (C2)    │
    │ → Artículo 138   │ │ • consulta│ │                 │
    │ (similitud 92%)  │ │           │ │                 │
    │ → Cluster C2     │ │           │ │                 │
    └──────────────────┘ └───────────┘ └─────────────────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
                    ┌────────▼────────┐
                    │  Chat Service   │
                    │                 │
                    │ ResponseGen:    │
                    │ "Hola Juan,     │
                    │  entiendo tu    │
                    │  preocupación..." │
                    │                 │
                    │ LawyerService:  │
                    │ Top 10 abogados │
                    │ cluster C2      │
                    │                 │
                    │ UserClustering: │
                    │ Agrupa a Juan   │
                    │ con otros C2    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  PostgreSQL     │
                    │  Guarda todo:   │
                    │  • Conversación │
                    │  • Cluster      │
                    │  • Embedding    │
                    └─────────────────┘
```

---

## 📊 Servicios Deprecados

Los siguientes servicios han sido **reemplazados** y movidos a `_deprecated/`:

| Servicio | Puerto | Estado | Reemplazado por |
|----------|--------|--------|----------------|
| Search | 3005 | ❌ DEPRECADO | RAG Service (3009) |
| Recommendations | 3006 | ❌ DEPRECADO | Chat > LawyerService (3010) |
| Explanation | 3007 | ❌ DEPRECADO | Chat > ResponseGenerator (3010) |

Ver [_deprecated/README.md](./_deprecated/README.md) para más detalles.

---

## ⚙️ Configuración del Sistema

### Variables de entorno globales:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lexia_db
DB_USER=postgres
DB_PASSWORD=password
DB_POOL_MAX=20

# Servicios
AUTH_SERVICE_URL=http://localhost:3003
OLAP_SERVICE_URL=http://localhost:3001
CLUSTERING_SERVICE_URL=http://localhost:3002
NLP_SERVICE_URL=http://localhost:3004
RAG_SERVICE_URL=http://localhost:3009
CHAT_SERVICE_URL=http://localhost:3010

# OLAP Cube
USE_POSTGRESQL=true  # true para PostgreSQL, false para in-memory

# Chat Service
AUTO_GROUP_USERS=true  # Agrupar usuarios automáticamente
```

---

## 🚀 Iniciar el Sistema Completo

### 1. Preparar Base de Datos
```bash
# Crear base de datos
createdb lexia_db

# Ejecutar migraciones
psql -U postgres -d lexia_db -f database/migrations/001_initial_schema.sql
psql -U postgres -d lexia_db -f database/migrations/002_add_vector_support.sql
psql -U postgres -d lexia_db -f database/migrations/003_chat_intelligence.sql
```

### 2. Iniciar servicios en orden:
```bash
# Terminal 1 - Auth
cd microservices/auth
npm install
npm run dev

# Terminal 2 - OLAP Cube
cd microservices/IA/olap-cube
npm install
npm run dev

# Terminal 3 - Clustering
cd microservices/IA/clustering-ml
npm install
npm run dev

# Terminal 4 - NLP
cd microservices/IA/nlp
npm install
npm run dev

# Terminal 5 - RAG (IMPORTANTE: esperar a que cargue el modelo)
cd microservices/IA/rag
npm install
npm run dev
# Esperar: "✅ Modelo de embeddings cargado exitosamente"

# Terminal 6 - Chat (CORE - último)
cd microservices/chat
npm install
npm run dev
```

### 3. Verificar que todo está funcionando:
```bash
curl http://localhost:3003/health  # Auth
curl http://localhost:3001/health  # OLAP
curl http://localhost:3002/health  # Clustering
curl http://localhost:3004/health  # NLP
curl http://localhost:3009/health  # RAG
curl http://localhost:3010/health  # Chat
```

---

## 📈 Monitoreo y Métricas

### Health checks disponibles:
- `GET /health` en cada servicio
- Verifica conexión a base de datos
- Verifica integración con otros servicios

### Métricas de aprendizaje:
```bash
# Métricas globales
curl http://localhost:3010/metrics

# Métricas por cluster
curl http://localhost:3010/metrics?cluster=C2

# Top abogados por cluster
curl http://localhost:3010/top-lawyers/C2?limit=10
```

---

## 🔐 Seguridad

### Consideraciones:
- ✅ JWT tokens para autenticación
- ✅ Validación de inputs
- ✅ Prepared statements (prevención SQL injection)
- ✅ CORS configurado
- ✅ Variables de entorno para secretos
- ✅ Datos locales (no APIs externas)

### TODO para producción:
- [ ] HTTPS/TLS
- [ ] Rate limiting
- [ ] Input sanitization más robusta
- [ ] Logs centralizados
- [ ] Monitoreo con Prometheus/Grafana

---

## 📚 Documentación Adicional

- [CLEANUP_PLAN.md](./CLEANUP_PLAN.md) - Plan de limpieza ejecutado
- [CHAT_SERVICE_COMPLETO.md](./CHAT_SERVICE_COMPLETO.md) - Documentación completa del Chat
- [_deprecated/README.md](./_deprecated/README.md) - Servicios deprecados
- [microservices/IA/rag/README.md](./microservices/IA/rag/README.md) - Documentación RAG
- [microservices/chat/README.md](./microservices/chat/README.md) - Documentación Chat

---

**Última actualización:** 22 de Noviembre, 2025
**Autor:** LexIA 2.0 Development Team
