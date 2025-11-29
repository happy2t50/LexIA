# 🚀 Inicio Rápido - LexIA 2.0

Esta guía te ayudará a levantar todo el sistema LexIA 2.0 en menos de 20 minutos.

## ✅ Pre-requisitos

1. **Docker Desktop** instalado y corriendo
2. **Node.js** v18+ instalado (ya lo tienes)
3. **Git** instalado

## 🎯 Opción 1: Inicialización Automática (Recomendado)

### Windows (PowerShell)

```powershell
cd C:\Users\umina\OneDrive\Escritorio\LexIA2.0
.\scripts\init-complete-system.ps1
```

### Linux/Mac

```bash
cd ~/LexIA2.0
chmod +x ./scripts/init-complete-system.sh
./scripts/init-complete-system.sh
```

Este script ejecuta automáticamente:
1. ✅ Verifica Docker
2. ✅ Levanta contenedores
3. ✅ Ejecuta migraciones
4. ✅ Indexa 17 documentos legales del seed
5. ✅ Procesa 7 PDFs de leyes de Chiapas (~760 artículos)
6. ✅ Genera embeddings y los almacena en PostgreSQL

**Tiempo estimado**: 15-20 minutos

---

## 🛠️ Opción 2: Paso a Paso Manual

### Paso 1: Levantar Docker

```bash
cd C:\Users\umina\OneDrive\Escritorio\LexIA2.0
docker-compose up -d
```

**Espera 30 segundos** para que los servicios se inicialicen.

### Paso 2: Verificar Contenedores

```bash
docker ps
```

Deberías ver:
- `lexia-gateway` (Nginx - Puerto 80)
- `lexia-postgres` (PostgreSQL + pgvector - Puerto 5432)
- `lexia-chat` (Chat Service - Puerto 3007)
- `lexia-rag` (RAG Service - Puerto 3009)
- `lexia-auth` (Auth Service - Puerto 3008)

### Paso 3: Verificar Migraciones

Las migraciones se ejecutan automáticamente al iniciar PostgreSQL. Para verificar:

```bash
docker logs lexia-postgres | grep "CREATE TABLE"
```

### Paso 4: Indexar Documentos del Seed

```bash
cd scripts
npm install pg axios
node -e "
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
    const result = await pool.query(
        'SELECT titulo, contenido, fuente, categoria, cluster_relacionado FROM documentos_legales WHERE activo = true'
    );

    console.log('📚 Indexando', result.rows.length, 'documentos...');

    for (const doc of result.rows) {
        try {
            await axios.post('http://localhost/api/rag/index', {
                titulo: doc.titulo,
                contenido: doc.contenido,
                fuente: doc.fuente,
                categoria: doc.categoria,
                clusterRelacionado: doc.cluster_relacionado
            });
            console.log('  ✅', doc.titulo.substring(0, 50));
            await new Promise(r => setTimeout(r, 100));
        } catch (e) {
            console.error('  ❌', doc.titulo, e.message);
        }
    }

    await pool.end();
}

indexDocuments();
"
```

### Paso 5: Procesar PDFs de Leyes de Chiapas

```bash
cd scripts
npm install pdf-parse axios
node process-pdf-laws.js
```

**Esto procesará**:
- Ley de Movilidad de Chiapas
- Reglamento de Movilidad de Chiapas
- Reglamentos de Tránsito de: Comitán, Palenque, San Cristóbal, Tapachula, Tuxtla Gutiérrez

**Tiempo estimado**: 10-15 minutos

---

## 🧪 Verificar que Todo Funciona

### 1. Ver Estadísticas RAG

```bash
curl http://localhost/api/rag/stats
```

**Respuesta esperada**:
```json
{
  "totalDocumentos": 777,
  "totalChunks": 2331,
  "categorias": {
    "Infracciones Graves": 120,
    "Multas Menores": 350,
    "Accidentes": 80,
    "Vehículos": 90,
    "Transporte Público": 70,
    "General": 67
  }
}
```

### 2. Probar Búsqueda RAG

```bash
curl -X POST http://localhost/api/rag/search \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"multa por estacionarse en doble fila\",\"topK\":3}"
```

### 3. Probar Chat

```bash
curl -X POST http://localhost/api/chat/message \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"test-session-001\",
    \"mensaje\": \"¿Cuál es la multa por estacionarse mal en Tuxtla Gutiérrez?\",
    \"usuarioId\": \"user-001\",
    \"nombre\": \"Usuario Test\"
  }"
```

**Respuesta esperada**:
```json
{
  "mensaje": "Según el Reglamento de Tránsito de Tuxtla Gutiérrez, Artículo X...",
  "cluster": "C2",
  "intencion": "consulta_multa",
  "sessionId": "test-session-001"
}
```

### 4. Ver Logs de Servicios

```bash
# Chat Service
docker logs lexia-chat --tail 50 -f

# RAG Service
docker logs lexia-rag --tail 50 -f

# Auth Service
docker logs lexia-auth --tail 50 -f
```

---

## 📊 Endpoints Disponibles

### API Gateway (http://localhost)

#### Chat Service
- `POST /api/chat/message` - Enviar mensaje al chat
- `GET /api/chat/history/:sessionId` - Historial de conversación
- `GET /api/chat/stats` - Estadísticas del chat

#### RAG Service
- `POST /api/rag/index` - Indexar nuevo documento
- `POST /api/rag/search` - Búsqueda semántica
- `POST /api/rag/search-smart` - Búsqueda con clustering
- `GET /api/rag/stats` - Estadísticas de documentos
- `GET /api/rag/health` - Estado del servicio

#### Auth Service
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/refresh` - Renovar token
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/me` - Perfil del usuario

---

## 🔍 Troubleshooting

### Docker no inicia

```bash
# Reiniciar Docker Desktop
# Luego:
docker-compose down
docker-compose up -d
```

### Error: "Cannot connect to database"

```bash
# Verificar que PostgreSQL esté corriendo
docker logs lexia-postgres

# Reiniciar solo PostgreSQL
docker restart lexia-postgres
```

### Error: "Module not found" en scripts

```bash
cd scripts
rm -rf node_modules package-lock.json
npm install
```

### PDFs no se procesan

**Problema común**: PDFs escaneados (imágenes) no tienen texto seleccionable.

**Solución**: Los PDFs actuales SÍ tienen texto seleccionable. Si encuentras alguno que no funcione, necesitarás OCR (fuera del alcance actual).

### RAG no encuentra resultados

1. Verificar similarity threshold:
```bash
# En docker-compose.yml, debe estar en 0.5
SIMILARITY_THRESHOLD: "0.5"
```

2. Verificar que los documentos se indexaron:
```bash
curl http://localhost/api/rag/stats
```

---

## 📈 Monitoreo

### Ver uso de recursos

```bash
docker stats
```

### Ver bases de datos

```bash
docker exec -it lexia-postgres psql -U lexia_user -d lexia_db

# Dentro de psql:
\dt                                    # Ver tablas
SELECT COUNT(*) FROM documentos_legales;       # Documentos
SELECT COUNT(*) FROM documento_chunks;         # Chunks con embeddings
SELECT categoria, COUNT(*) FROM documentos_legales GROUP BY categoria;
```

---

## 🎯 Próximos Pasos

Una vez que el sistema esté corriendo:

1. **Probar el chat** con diferentes preguntas sobre tránsito
2. **Revisar logs** para entender cómo funciona el RAG
3. **Implementar OAuth2 Google** (ver [readme/AUTH_SYSTEM_DESIGN.md](readme/AUTH_SYSTEM_DESIGN.md))
4. **Implementar 2FA** (ver diseño en AUTH_SYSTEM_DESIGN.md)
5. **Configurar frontend** para usar `http://localhost/api/*`

---

## 📚 Documentación Completa

Ver carpeta [readme/](readme/) para documentación detallada:

- **Arquitectura**: [readme/ARQUITECTURA.md](readme/ARQUITECTURA.md)
- **APIs**: [readme/API_ENDPOINTS.md](readme/API_ENDPOINTS.md)
- **RAG**: [readme/RAG_SERVICE.md](readme/RAG_SERVICE.md)
- **Chat**: [readme/CHAT_SERVICE.md](readme/CHAT_SERVICE.md)
- **Auth**: [readme/AUTH_SYSTEM_DESIGN.md](readme/AUTH_SYSTEM_DESIGN.md)
- **Despliegue**: [readme/DEPLOYMENT.md](readme/DEPLOYMENT.md)

---

## ⚡ Comandos Útiles

```bash
# Iniciar todo
docker-compose up -d

# Ver logs en vivo
docker-compose logs -f

# Reiniciar un servicio
docker restart lexia-chat

# Detener todo
docker-compose down

# Limpiar todo (¡cuidado! borra la BD)
docker-compose down -v

# Reconstruir imágenes
docker-compose build --no-cache

# Ver estado de contenedores
docker ps -a
```

---

## 🎉 ¡Todo Listo!

Si seguiste estos pasos, ahora tienes:

✅ Sistema LexIA 2.0 corriendo en Docker
✅ PostgreSQL con pgvector funcionando
✅ 777+ artículos legales indexados
✅ ~2,300 chunks con embeddings vectoriales
✅ Chat inteligente con búsqueda semántica
✅ Rate limiting configurado en Nginx
✅ Sistema listo para producción

**URL Principal**: http://localhost

**¿Necesitas ayuda?** Revisa los logs con `docker logs <nombre-contenedor>`