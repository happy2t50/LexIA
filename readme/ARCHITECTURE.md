# Arquitectura LexIA 2.0

## Visión General

LexIA 2.0 es un sistema distribuido de microservicios diseñado para proporcionar asistencia legal automatizada en casos de incidentes de tránsito, utilizando Machine Learning para clasificar consultas y ofrecer recomendaciones personalizadas.

## Principios de Diseño

### 1. Arquitectura de Microservicios
- **Independencia**: Cada servicio es independiente y puede desplegarse por separado
- **Escalabilidad**: Los servicios pueden escalar horizontalmente según la demanda
- **Resiliencia**: El fallo de un servicio no afecta a todo el sistema
- **Tecnología agnóstica**: Cada servicio puede usar la tecnología más apropiada

### 2. Separación de Responsabilidades
Cada microservicio tiene una responsabilidad única y bien definida:
- **OLAP**: Almacenamiento y análisis de datos
- **Clustering ML**: Clasificación inteligente
- **NLP**: Procesamiento de lenguaje
- **Búsqueda**: Recuperación de información
- **Recomendaciones**: Sugerencias personalizadas
- **Explicación**: Generación de respuestas
- **Geo**: Asistencia geográfica
- **Auth**: Seguridad y autenticación

### 3. Comunicación entre Servicios
- **Protocolo**: HTTP/REST
- **Formato**: JSON
- **Asíncrono**: Comunicación no bloqueante cuando es posible
- **Timeout**: Cada servicio tiene timeouts configurados

## Componentes Principales

### Cubo OLAP (Data Warehouse)

**Propósito**: Base de datos multidimensional para análisis

**Dimensiones**:
- Usuario (ID, tipo, historial)
- Ubicación (ciudad, coordenadas, barrio)
- Tiempo (fecha, hora, día de la semana)
- Tipo de Infracción (categoría, gravedad)
- Abogado (especialización, calificaciones)
- Servicios Complementarios (grúas, talleres, seguros)

**Tabla de Hechos**:
- Consulta_Incidente: Texto de la consulta y metadatos

**Operaciones OLAP**:
- Drill-down: De ciudad → barrio
- Roll-up: De día → mes → año
- Slice: Filtrar por ciudad específica
- Dice: Filtrar por múltiples dimensiones
- Pivot: Rotar dimensiones para análisis

### Machine Learning - Clustering

**Algoritmo**: K-means
- **K = 5**: 5 clusters predefinidos
- **Características**: Vector TF-IDF + embeddings
- **Distancia**: Similitud coseno

**Alternativa**: DBSCAN
- Para detectar clusters de forma irregular
- Útil para identificar nuevos tipos de consultas

**Pipeline ML**:
```
Texto → Preprocesamiento → Vectorización → Clustering → Clasificación
```

**Vectorización**:
1. **TF-IDF**: Frecuencia de términos ponderada
2. **Embeddings**: Representación semántica (128 dimensiones)
3. **Features adicionales**: Longitud, palabras clave, etc.

**Entrenamiento**:
- Offline: Modelo se entrena con datos históricos del OLAP
- Incremental: Se actualiza periódicamente con nuevos datos
- Validación: Cross-validation para evaluar accuracy

### Procesamiento de Lenguaje Natural (NLP)

**Pipeline NLP**:
```
Texto → Normalización → Tokenización → Análisis → Clasificación
```

**Componentes**:
1. **Normalización**: Lowercase, remover acentos, puntuación
2. **Tokenización**: División en palabras
3. **Stemming/Lemmatización**: Reducción a raíz
4. **NER** (Named Entity Recognition): Extracción de entidades
5. **Intent Classification**: Clasificación de intención
6. **Sentiment Analysis**: Análisis de sentimiento

**Librerías**:
- Natural.js: NLP en español
- Compromise: Análisis sintáctico
- Custom: Diccionarios específicos de tránsito

### Sistema de Recomendaciones

**Enfoque Híbrido**:
1. **Content-based**: Basado en cluster asignado
2. **Collaborative**: Basado en usuarios similares (futuro)
3. **Knowledge-based**: Reglas de negocio

**Factores de Ranking**:
- Especialización del abogado
- Calificación y experiencia
- Proximidad geográfica
- Disponibilidad
- Tarifa

**Algoritmo de Ranking**:
```
Score = (0.4 × especialización) + (0.3 × calificación) +
        (0.2 × proximidad) + (0.1 × disponibilidad)
```

### Búsqueda Semántica

**Motor**: Fuse.js (fuzzy search)
- Búsqueda difusa para manejar typos
- Scoring basado en relevancia
- Búsqueda en múltiples campos

**Índices**:
- Artículos legales
- Abogados
- Servicios complementarios

**Optimizaciones**:
- Cache de búsquedas frecuentes
- Índices invertidos
- Paginación de resultados

## Flujo de Datos

### Flujo Principal: Consulta de Usuario

```
1. Usuario → Auth Service
   └─ Validación de token JWT

2. Auth Service → NLP Service
   └─ Procesar texto de consulta

3. NLP Service → Clustering Service
   └─ Clasificar en cluster

4. Clustering Service → OLAP Service
   └─ Guardar consulta clasificada

5. Clustering Service → Search Service
   └─ Buscar artículos relevantes

6. Clustering Service → Recommendations Service
   └─ Obtener recomendaciones

7. Recommendations Service → Explanation Service
   └─ Generar explicación

8. Explanation Service → Geo Service
   └─ Encontrar dependencias cercanas

9. Geo Service → Usuario
   └─ Respuesta completa
```

### Flujo de Entrenamiento ML

```
1. OLAP Service
   └─ Acumular datos de consultas

2. Clustering Service (scheduled job)
   └─ Solicitar dataset al OLAP

3. Clustering Service
   └─ Entrenar modelo K-means

4. Clustering Service
   └─ Validar modelo

5. Clustering Service
   └─ Actualizar modelo en producción
```

## Patrones de Diseño

### 1. API Gateway (Futuro)
- Punto único de entrada
- Rate limiting
- Autenticación centralizada
- Routing inteligente

### 2. Circuit Breaker
- Protección contra fallos en cascada
- Fallback a respuestas por defecto
- Recuperación automática

### 3. Service Discovery
- Registro automático de servicios
- Health checks periódicos
- Load balancing

### 4. CQRS (Command Query Responsibility Segregation)
- Separación de lecturas y escrituras
- Optimización de consultas
- Mejor escalabilidad

## Seguridad

### Autenticación y Autorización

**JWT (JSON Web Tokens)**:
```
Header: { alg: "HS256", typ: "JWT" }
Payload: { userId, email, tipo, exp }
Signature: HMACSHA256(header + payload, secret)
```

**Flujo de Autenticación**:
1. Usuario envía credenciales
2. Auth Service valida
3. Genera JWT con expiración (24h)
4. Cliente incluye JWT en header Authorization
5. Cada servicio valida JWT

**Middleware de Autenticación**:
```typescript
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado' });

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
};
```

### Protección de Datos

- **Encriptación en tránsito**: HTTPS/TLS
- **Encriptación en reposo**: AES-256
- **Hashing de passwords**: bcrypt (10 rounds)
- **Sanitización de inputs**: Prevención de XSS y SQL injection
- **Rate limiting**: Prevención de DDoS

## Escalabilidad

### Estrategias de Escalado

**Horizontal Scaling**:
- Múltiples instancias de cada servicio
- Load balancer (Nginx/HAProxy)
- Session affinity si es necesario

**Vertical Scaling**:
- Incrementar recursos (CPU, RAM)
- Optimización de código
- Profiling de performance

**Database Scaling**:
- Read replicas para consultas
- Sharding por ciudad/región
- Cache con Redis

### Optimizaciones

1. **Caching**:
   - Redis para datos frecuentes
   - Cache de consultas OLAP
   - Cache de resultados de ML

2. **Async Processing**:
   - Message queues (RabbitMQ/Kafka)
   - Background jobs
   - Event-driven architecture

3. **CDN**:
   - Contenido estático
   - Imágenes y assets
   - Distribución geográfica

## Monitoreo y Observabilidad

### Métricas

**Application Metrics**:
- Request rate (requests/second)
- Response time (p50, p95, p99)
- Error rate
- Throughput

**Infrastructure Metrics**:
- CPU usage
- Memory usage
- Disk I/O
- Network traffic

**Business Metrics**:
- Consultas por cluster
- Accuracy del modelo ML
- Tasa de conversión (consulta → abogado)
- Satisfacción del usuario

### Logging

**Structured Logging** (JSON):
```json
{
  "timestamp": "2025-01-17T10:30:00Z",
  "level": "INFO",
  "service": "clustering-ml",
  "message": "Predicción exitosa",
  "metadata": {
    "cluster": "C1",
    "confianza": 0.89,
    "userId": "user123"
  }
}
```

**Log Levels**:
- ERROR: Errores críticos
- WARN: Advertencias
- INFO: Información general
- DEBUG: Debugging detallado

### Tracing

**Distributed Tracing**:
- Trace ID único por request
- Span ID por cada servicio
- Propagación de contexto
- Visualización con Jaeger/Zipkin

## Despliegue

### CI/CD Pipeline

```
Código → Git Push → GitHub Actions
  ↓
Tests (unit, integration)
  ↓
Build Docker Images
  ↓
Push to Registry
  ↓
Deploy to Staging
  ↓
Smoke Tests
  ↓
Deploy to Production
  ↓
Health Checks
```

### Ambientes

1. **Development**: Local con docker-compose
2. **Staging**: Réplica de producción
3. **Production**: Kubernetes cluster

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: clustering-ml
spec:
  replicas: 3
  selector:
    matchLabels:
      app: clustering-ml
  template:
    metadata:
      labels:
        app: clustering-ml
    spec:
      containers:
      - name: clustering-ml
        image: lexia/clustering-ml:latest
        ports:
        - containerPort: 3002
        env:
        - name: OLAP_SERVICE_URL
          value: http://olap-cube:3001
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## Roadmap Técnico

### Fase 1 (Actual): MVP
- ✅ 8 microservicios funcionales
- ✅ Clustering básico
- ✅ Dataset de entrenamiento

### Fase 2: Optimización
- [ ] Base de datos PostgreSQL
- [ ] Redis para cache
- [ ] API Gateway
- [ ] Mejora del modelo ML

### Fase 3: Producción
- [ ] Kubernetes deployment
- [ ] Monitoreo completo
- [ ] CI/CD automatizado
- [ ] Backup y disaster recovery

### Fase 4: Avanzado
- [ ] Modelo de Deep Learning
- [ ] Chatbot integrado
- [ ] App móvil
- [ ] Analytics dashboard

## Conclusión

Esta arquitectura proporciona:
- **Escalabilidad**: Cada componente puede escalar independientemente
- **Mantenibilidad**: Código modular y bien organizado
- **Resiliencia**: Tolerancia a fallos
- **Flexibilidad**: Fácil de extender y modificar
- **Performance**: Optimizado para alta concurrencia

La arquitectura está diseñada para evolucionar y adaptarse a las necesidades futuras del negocio.
