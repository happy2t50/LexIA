# LexIA 2.0 - API Gateway (Nginx)

## Descripción

Nginx actúa como **API Gateway** (reverse proxy) centralizando todas las peticiones HTTP a los microservicios de LexIA 2.0.

## Arquitectura

```
Cliente (Frontend/Mobile)
        ↓
   Nginx (Port 80)
        ↓
   ┌────┴────┬────────┬────────┬────────┬────────┐
   ↓         ↓        ↓        ↓        ↓        ↓
  Auth     OLAP   Clustering  NLP     RAG     Chat
 :3003    :3001     :3002    :3004   :3009   :3010
```

## URL Base

**Producción/Docker**: `http://localhost`
**Desarrollo Directo**: `http://localhost:PORT` (acceso directo a cada servicio)

## Endpoints Disponibles

### 1. API Gateway Info
```bash
GET http://localhost/
GET http://localhost/health
```

**Respuesta:**
```json
{
  "message": "LexIA 2.0 API Gateway",
  "version": "1.0.0",
  "endpoints": [
    "/api/auth",
    "/api/olap",
    "/api/clustering",
    "/api/nlp",
    "/api/rag",
    "/api/chat"
  ]
}
```

---

### 2. Auth Service
**Base URL**: `http://localhost/api/auth/`

#### Health Check
```bash
GET http://localhost/api/auth/health
```

#### Registro
```bash
POST http://localhost/api/auth/register
Content-Type: application/json

{
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "password": "password123",
  "rol": "ciudadano"
}
```

#### Login
```bash
POST http://localhost/api/auth/login
Content-Type: application/json

{
  "email": "juan@example.com",
  "password": "password123"
}
```

---

### 3. Chat Service (CORE API)
**Base URL**: `http://localhost/api/chat/`

#### Iniciar Sesión
```bash
POST http://localhost/api/chat/session/start
Content-Type: application/json

{
  "usuarioId": "550e8400-e29b-41d4-a716-446655440000",
  "nombre": "María"
}
```

**Respuesta:**
```json
{
  "success": true,
  "sessionId": "uuid-aqui",
  "mensaje": "¡Hola María! Soy LexIA..."
}
```

#### Enviar Mensaje
```bash
POST http://localhost/api/chat/message
Content-Type: application/json

{
  "sessionId": "uuid-sesion",
  "mensaje": "Me multaron por estacionarme mal",
  "usuarioId": "550e8400-e29b-41d4-a716-446655440000",
  "nombre": "María"
}
```

**Respuesta:**
```json
{
  "success": true,
  "mensaje": "Respuesta de LexIA...",
  "articulos": [...],
  "sugerencias": [...],
  "cluster": "C2",
  "sentimiento": "neutral",
  "sessionId": "uuid-sesion"
}
```

#### Obtener Historial
```bash
GET http://localhost/api/chat/session/{sessionId}/history?limit=50
```

#### Recomendar Abogados
```bash
POST http://localhost/api/chat/recommend-lawyers
Content-Type: application/json

{
  "cluster": "C1",
  "ciudad": "Bogotá",
  "limit": 10
}
```

#### Cerrar Sesión
```bash
POST http://localhost/api/chat/session/{sessionId}/close
```

---

### 4. RAG Service
**Base URL**: `http://localhost/api/rag/`

#### Health Check
```bash
GET http://localhost/api/rag/health
```

**Respuesta:**
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

#### Buscar Documentos (Semantic Search)
```bash
POST http://localhost/api/rag/search
Content-Type: application/json

{
  "query": "multa estacionamiento",
  "topK": 5
}
```

#### Buscar con Clustering Automático
```bash
POST http://localhost/api/rag/search-smart
Content-Type: application/json

{
  "query": "me detuvieron borracho",
  "usuarioId": "uuid-usuario"
}
```

#### Indexar Documento Legal
```bash
POST http://localhost/api/rag/index
Content-Type: application/json

{
  "titulo": "Artículo 135 - Estacionamiento Prohibido",
  "contenido": "El conductor que estacione...",
  "categoria": "Multas",
  "clusterRelacionado": "C2"
}
```

#### Obtener Estadísticas
```bash
GET http://localhost/api/rag/stats
```

---

### 5. NLP Service
**Base URL**: `http://localhost/api/nlp/`

#### Procesar Texto
```bash
POST http://localhost/api/nlp/process
Content-Type: application/json

{
  "textoConsulta": "Me multaron por estacionarme mal",
  "usuarioId": "uuid-usuario"
}
```

**Respuesta:**
```json
{
  "textoOriginal": "Me multaron por estacionarme mal",
  "textoNormalizado": "me multaron por estacionarme mal",
  "tokens": ["me", "multaron", "por", "estacionarme", "mal"],
  "entidades": {
    "lugares": [],
    "fechas": [],
    "numeros": []
  },
  "intencion": "reporte",
  "palabrasClave": ["multaron", "estacionarme"],
  "cluster": "C2",
  "confianza": 0.85
}
```

#### Analizar Sentimiento
```bash
POST http://localhost/api/nlp/sentiment
Content-Type: application/json

{
  "texto": "Estoy muy molesto con esta multa injusta"
}
```

---

### 6. Clustering ML Service
**Base URL**: `http://localhost/api/clustering/`

#### Predecir Cluster
```bash
POST http://localhost/api/clustering/predict
Content-Type: application/json

{
  "textoConsulta": "Me multaron por exceso de velocidad"
}
```

**Respuesta:**
```json
{
  "cluster": "C2",
  "confianza": 0.92,
  "descripcion": "Multas y sanciones menores"
}
```

#### Entrenar Modelo
```bash
POST http://localhost/api/clustering/train
Content-Type: application/json

{
  "numClusters": 5
}
```

---

### 7. OLAP Cube Service
**Base URL**: `http://localhost/api/olap/`

#### Crear Consulta
```bash
POST http://localhost/api/olap/consultas
Content-Type: application/json

{
  "id": "uuid",
  "textoConsulta": "pregunta del usuario",
  "usuarioId": "uuid-usuario",
  ...
}
```

#### Obtener Métricas
```bash
GET http://localhost/api/olap/metrics?cluster=C1
```

---

## Configuración CORS

El API Gateway está configurado con CORS habilitado para permitir peticiones desde cualquier origen:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: DNT, User-Agent, X-Requested-With, If-Modified-Since, Cache-Control, Content-Type, Range, Authorization
```

## Timeouts

- **Por defecto**: 300 segundos (5 minutos)
- **RAG Service**: 60 segundos
- **Chat Service**: 90 segundos

## Ejemplos de Uso

### Flujo Completo de Chat

```bash
# 1. Crear sesión
SESSION=$(curl -X POST http://localhost/api/chat/session/start \
  -H "Content-Type: application/json" \
  -d '{"usuarioId":"550e8400-e29b-41d4-a716-446655440000","nombre":"Juan"}' \
  | jq -r '.sessionId')

# 2. Enviar mensaje
curl -X POST http://localhost/api/chat/message \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION\",
    \"mensaje\": \"Me multaron por estacionarme mal\",
    \"usuarioId\": \"550e8400-e29b-41d4-a716-446655440000\",
    \"nombre\": \"Juan\"
  }" | jq

# 3. Ver historial
curl http://localhost/api/chat/session/$SESSION/history | jq
```

### Indexar y Buscar Documentos

```bash
# 1. Indexar documento
curl -X POST http://localhost/api/rag/index \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Artículo 120 - Conducir bajo efectos del alcohol",
    "contenido": "Todo conductor que maneje bajo efectos del alcohol...",
    "categoria": "Infracciones Graves",
    "clusterRelacionado": "C1"
  }' | jq

# 2. Buscar documentos
curl -X POST http://localhost/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query":"conducir borracho","topK":3}' | jq
```

## Monitoreo

### Ver logs de Nginx
```bash
docker logs lexia-nginx -f
```

### Ver estado de todos los servicios
```bash
docker-compose ps
```

### Verificar conectividad
```bash
# Health checks de todos los servicios
curl http://localhost/api/auth/health
curl http://localhost/api/olap/health
curl http://localhost/api/clustering/health
curl http://localhost/api/nlp/health
curl http://localhost/api/rag/health
curl http://localhost/api/chat/health
```

## Troubleshooting

### Error 502 Bad Gateway
- Verificar que todos los contenedores estén corriendo: `docker ps`
- Reiniciar el servicio problemático: `docker restart lexia-<service>`

### Error 504 Gateway Timeout
- Aumentar timeouts en [nginx/nginx.conf](nginx/nginx.conf)
- Verificar que el servicio backend no esté sobrecargado

### No hay respuesta
- Verificar que Nginx esté corriendo: `docker ps | grep nginx`
- Reiniciar Nginx: `docker restart lexia-nginx`

## Arquitectura de Red

Todos los servicios están en la misma red Docker (`lexia-network`), lo que permite comunicación interna directa entre servicios sin pasar por Nginx.

**Red interna** (entre servicios):
- Chat → RAG: `http://rag:3009`
- Chat → NLP: `http://nlp:3004`
- Chat → Clustering: `http://clustering:3002`
- RAG → Clustering: `http://clustering:3002`

**Red externa** (desde cliente):
- Todo a través de Nginx: `http://localhost/api/*`

## Seguridad

### Recomendaciones para Producción

1. **Habilitar HTTPS** con certificados SSL/TLS
2. **Limitar CORS** a dominios específicos
3. **Implementar rate limiting** en Nginx
4. **Agregar autenticación JWT** en endpoints sensibles
5. **Configurar firewall** para exponer solo puerto 80/443
6. **Usar secrets** para contraseñas (no en docker-compose.yml)

### Ejemplo de Rate Limiting

```nginx
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    server {
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            # resto de configuración...
        }
    }
}
```

## Variables de Entorno

El API Gateway no requiere variables de entorno. Toda la configuración está en [nginx/nginx.conf](nginx/nginx.conf).

## Escalabilidad

Para escalar horizontalmente:

1. **Múltiples instancias de servicios**:
```yaml
# docker-compose.yml
chat:
  deploy:
    replicas: 3
```

2. **Load balancing en Nginx**:
```nginx
upstream chat_service {
    server chat-1:3010;
    server chat-2:3010;
    server chat-3:3010;
}
```

## Contacto y Soporte

Para reportar problemas o sugerencias sobre el API Gateway, crear un issue en el repositorio del proyecto.
