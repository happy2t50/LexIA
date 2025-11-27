# 🚀 Guía de Setup Completo: PostgreSQL + OLAP + RAG

Esta guía te llevará paso a paso para configurar el sistema completo con PostgreSQL, OLAP Cube y RAG.

## 📋 Requisitos Previos

- ✅ PostgreSQL 14+ instalado
- ✅ Node.js 18+
- ✅ npm o yarn

---

## PASO 1: Configurar PostgreSQL

### 1.1 Crear Base de Datos

```bash
# Conectarse a PostgreSQL
psql -U postgres

# Dentro de psql:
CREATE DATABASE lexia_db;

# Salir
\q
```

### 1.2 Ejecutar Migraciones

```bash
# Desde la raíz del proyecto
cd LexIA2.0

# Migración 1: Tablas principales
psql -U postgres -d lexia_db -f database/migrations/001_create_tables.sql

# Migración 2: Soporte vectorial (pgvector)
psql -U postgres -d lexia_db -f database/migrations/002_add_vector_support.sql
```

**Nota:** Si `002_add_vector_support.sql` falla con error de pgvector:

```bash
# Instalar pgvector primero

# Ubuntu/Debian:
sudo apt-get install postgresql-14-pgvector

# macOS:
brew install pgvector

# Luego volver a ejecutar la migración
```

### 1.3 Verificar Tablas Creadas

```bash
psql -U postgres -d lexia_db

# Dentro de psql:
\dt

# Deberías ver:
# - usuarios
# - abogados
# - negocios
# - consultas (OLAP)
# - documentos_legales (RAG)
# - documento_chunks (RAG con vectores)
# - rag_consultas
# - Y más...

# Verificar extensiones
\dx

# Deberías ver:
# - uuid-ossp
# - vector (pgvector)

\q
```

---

## PASO 2: Configurar OLAP Cube Service

### 2.1 Instalar Dependencias

```bash
cd microservices/IA/olap-cube
npm install
```

### 2.2 Configurar Variables de Entorno

El archivo `.env` ya fue creado con:

```env
PORT=3001
USE_POSTGRESQL=true
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lexia_db
DB_USER=postgres
DB_PASSWORD=password
DB_POOL_MAX=20
```

**⚠️ IMPORTANTE:** Cambia `DB_PASSWORD` por tu contraseña real de PostgreSQL.

### 2.3 Iniciar Servicio

```bash
npm run dev
```

Deberías ver:

```
📊 OLAP Cube usando PostgreSQL
🔍 OLAP Cube Service corriendo en puerto 3001
```

### 2.4 Verificar Health Check

```bash
curl http://localhost:3001/health
```

Respuesta esperada:

```json
{
  "status": "OK",
  "service": "OLAP Cube Service",
  "database": "Connected"
}
```

---

## PASO 3: Configurar RAG Service

### 3.1 Instalar Dependencias

```bash
cd ../rag
npm install
```

**Nota:** La primera vez puede tomar varios minutos porque descarga el modelo de embeddings (~80MB).

### 3.2 Configurar Variables de Entorno

El archivo `.env` ya fue creado. Verifica:

```env
PORT=3009
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lexia_db
DB_USER=postgres
DB_PASSWORD=password  # ⚠️ Cambiar por tu contraseña

EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2
TOP_K_RESULTS=5
SIMILARITY_THRESHOLD=0.7
```

### 3.3 Iniciar Servicio

```bash
npm run dev
```

Deberías ver:

```
🔄 Inicializando RAG Service...
🔄 Cargando modelo de embeddings: Xenova/all-MiniLM-L6-v2...
✅ Modelo de embeddings cargado exitosamente
✅ RAG Service listo
🚀 RAG Service corriendo en puerto 3009
```

**Nota:** La primera ejecución tomará ~30-60 segundos mientras descarga el modelo.

### 3.4 Verificar Health Check

```bash
curl http://localhost:3009/health
```

Respuesta esperada:

```json
{
  "status": "OK",
  "service": "RAG Service",
  "database": "Connected",
  "embeddingModel": "Xenova/all-MiniLM-L6-v2",
  "modelInitialized": true,
  "ragInitialized": true
}
```

---

## PASO 4: Indexar Documentos Legales

### 4.1 Indexar Documentos Iniciales

Los documentos fueron insertados por la migración, pero necesitan ser procesados para generar embeddings:

```bash
curl -X POST http://localhost:3009/index-all
```

Deberías ver en la consola del servicio:

```
📄 Encontrados 7 documentos para indexar
  ✅ Artículo 123 - Violación de Semáforo en Rojo (3 chunks)
  ✅ Artículo 106 - Exceso de Velocidad (3 chunks)
  ✅ Artículo 138 - Estacionamiento Prohibido (2 chunks)
  ✅ Artículo 152 - Conducción bajo Efectos del Alcohol (3 chunks)
  ✅ Artículo 131 - Conducir sin Licencia (3 chunks)
  ✅ Artículo 109 - No Portar SOAT (3 chunks)
  ✅ Artículo 110 - Obligaciones en caso de Accidente (2 chunks)
✅ Indexación completa: 7 documentos
```

### 4.2 Verificar Indexación

```bash
curl http://localhost:3009/stats
```

Respuesta esperada:

```json
{
  "success": true,
  "baseConocimiento": {
    "total_documentos": "7",
    "total_chunks": "19",
    "total_categorias": "5",
    "total_clusters": "5"
  },
  "modeloEmbeddings": {
    "nombre": "Xenova/all-MiniLM-L6-v2",
    "dimension": 384,
    "inicializado": true
  }
}
```

---

## PASO 5: Probar el Sistema RAG

### 5.1 Búsqueda Simple

```bash
curl -X POST http://localhost:3009/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "me pasé un semáforo en rojo"
  }'
```

Respuesta esperada:

```json
{
  "success": true,
  "consulta": "me pasé un semáforo en rojo",
  "chunksRecuperados": [
    {
      "id": "...",
      "contenido": "Todo conductor que no respete la señal...",
      "similitud": 0.89,
      "tituloDocumento": "Artículo 123 - Violación de Semáforo",
      "categoria": "Señalización",
      "cluster": "C1"
    }
  ],
  "contexto": "[Documento 1: Artículo 123]\n...",
  "tiempoBusquedaMs": 120
}
```

### 5.2 Búsqueda con Filtro por Cluster

```bash
curl -X POST http://localhost:3009/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "multa por velocidad",
    "cluster": "C1"
  }'
```

---

## PASO 6: Iniciar Clustering ML (Opcional pero Recomendado)

Para usar la búsqueda inteligente que auto-detecta el cluster:

### 6.1 Iniciar Clustering Service

```bash
cd ../clustering-ml
npm run dev
```

### 6.2 Probar Búsqueda Inteligente

```bash
curl -X POST http://localhost:3009/search-smart \
  -H "Content-Type: application/json" \
  -d '{
    "query": "me multaron por exceso de velocidad",
    "usuarioId": "user123"
  }'
```

Esto automáticamente:
1. Predice que es cluster C1
2. Busca documentos relacionados con velocidad
3. Retorna resultados contextualizados

---

## PASO 7: Integrar con NLP y Otros Servicios

### 7.1 Iniciar NLP Service

```bash
cd ../nlp
npm run dev
```

### 7.2 Flujo Completo

```javascript
// 1. Usuario hace consulta
const consulta = "me pasé un semáforo en rojo";

// 2. NLP procesa
const nlpResponse = await fetch('http://localhost:3004/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ textoConsulta: consulta })
});

// 3. RAG busca contexto
const ragResponse = await fetch('http://localhost:3009/search-smart', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: consulta })
});

// 4. Usar contexto para generar respuesta
const resultado = await ragResponse.json();
console.log(resultado.contexto); // Contexto legal relevante
```

---

## 🧪 Tests de Verificación

### Test 1: PostgreSQL

```bash
psql -U postgres -d lexia_db -c "SELECT COUNT(*) FROM consultas;"
```

### Test 2: OLAP Cube

```bash
curl http://localhost:3001/consultas
```

### Test 3: RAG Embeddings

```bash
curl -X POST http://localhost:3009/embedding \
  -H "Content-Type: application/json" \
  -d '{"text": "hola mundo"}'
```

Debería retornar vector de 384 dimensiones.

### Test 4: Búsqueda Vectorial

```bash
curl -X POST http://localhost:3009/search \
  -H "Content-Type: application/json" \
  -d '{"query": "alcoholímetro"}'
```

Debería encontrar documentos relacionados con cluster C3.

---

## 🐛 Troubleshooting

### Error: "Cannot find module '@xenova/transformers'"

```bash
cd microservices/IA/rag
npm install @xenova/transformers
```

### Error: "extension 'vector' does not exist"

```bash
# Instalar pgvector
sudo apt-get install postgresql-14-pgvector  # Linux
brew install pgvector  # macOS

# Luego en PostgreSQL:
psql -U postgres -d lexia_db -c "CREATE EXTENSION vector;"
```

### Error: "ECONNREFUSED" al conectar a PostgreSQL

Verifica que PostgreSQL esté corriendo:

```bash
# Linux
sudo systemctl status postgresql

# macOS
brew services list

# Iniciar si no está corriendo
sudo systemctl start postgresql  # Linux
brew services start postgresql@14  # macOS
```

### Modelo de embeddings tarda mucho en cargar

Primera carga: ~30-60 segundos (descarga modelo)
Siguientes: ~5-10 segundos (lee de caché)

Ubicación del caché:
- Linux/macOS: `~/.cache/huggingface/`
- Windows: `C:\Users\{usuario}\.cache\huggingface\`

---

## 📊 Arquitectura Final

```
┌─────────────┐
│   Usuario   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│         Frontend / API Gateway          │
└──────┬──────────────────────┬───────────┘
       │                      │
       ▼                      ▼
┌─────────────┐      ┌──────────────┐
│ NLP Service │      │ Auth Service │
│  (port 3004)│      │  (port 3003) │
└──────┬──────┘      └──────────────┘
       │
       ▼
┌──────────────────┐
│ Clustering ML    │
│   (port 3002)    │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐       ┌─────────────────┐
│   RAG Service    │◄─────►│  OLAP Cube      │
│   (port 3009)    │       │  (port 3001)    │
└──────┬───────────┘       └────────┬────────┘
       │                            │
       ▼                            ▼
┌──────────────────────────────────────────┐
│         PostgreSQL + pgvector            │
│  ┌──────────┐  ┌────────────────────┐   │
│  │ consultas│  │ documento_chunks   │   │
│  │  (OLAP)  │  │  (vectores 384D)   │   │
│  └──────────┘  └────────────────────┘   │
└──────────────────────────────────────────┘
```

---

## ✅ Checklist Final

- [ ] PostgreSQL instalado y corriendo
- [ ] Ambas migraciones ejecutadas (001 y 002)
- [ ] Extensión pgvector instalada
- [ ] OLAP Cube conectado a PostgreSQL
- [ ] RAG Service inicializado
- [ ] Modelo de embeddings cargado
- [ ] Documentos indexados (7 documentos, ~19 chunks)
- [ ] Tests de búsqueda funcionando
- [ ] Clustering ML corriendo (opcional)
- [ ] Integración completa probada

---

## 🎉 ¡Sistema Listo!

Ahora tienes:

✅ **OLAP Cube** conectado a PostgreSQL para análisis multidimensional
✅ **RAG Service** con embeddings locales (sin OpenAI)
✅ **Base de datos vectorial** con pgvector para búsqueda semántica
✅ **Clustering automático** para clasificación inteligente
✅ **Sistema completo** sin dependencias de APIs externas

**Próximos pasos:**
1. Agregar más documentos legales
2. Integrar con frontend
3. Implementar generación de respuestas (LLM local o templates)
4. Escalar con más datos
