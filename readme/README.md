# LexIA 2.0 - Sistema de Asistencia Legal con Machine Learning

Sistema completo de microservicios para asistencia legal en incidentes de tránsito, con integración de Machine Learning (Clustering), Cubo OLAP, procesamiento de lenguaje natural y **Arquitectura Hexagonal**.

## 🏗️ Arquitectura

- ✅ **Arquitectura Hexagonal** (Puertos y Adaptadores)
- ✅ **Microservicios** independientes y escalables
- ✅ **PostgreSQL** para persistencia de datos
- ✅ **Machine Learning** con K-means clustering
- ✅ **NLP** para procesamiento de lenguaje natural
- ✅ **OLAP** para análisis multidimensional

## Arquitectura del Sistema

El sistema está compuesto por 8 microservicios independientes que se comunican entre sí vía API REST:

```
[Usuario]
    ↓
[Microservicio de Autenticación] (Puerto 3003)
    ↓
[Microservicio de NLP] (Puerto 3004)
    ↓
[Microservicio de Clustering ML] (Puerto 3002) ←→ [Cubo OLAP] (Puerto 3001)
    ↓
[Microservicio de Búsqueda] (Puerto 3005)
    ↓
[Microservicio de Recomendaciones] (Puerto 3006)
    ↓
[Microservicio de Explicación] (Puerto 3007)
    ↓
[Microservicio de Asistencia Geográfica] (Puerto 3008)
```

## Microservicios

### 1. Cubo OLAP (Puerto 3001)
Base de datos multidimensional para análisis de incidentes.

**Funcionalidades:**
- Almacenamiento de consultas de incidentes
- Consultas multidimensionales (por ubicación, tiempo, cluster, etc.)
- Generación de dataset para entrenamiento ML
- Análisis estadístico

**Endpoints principales:**
- `POST /consultas` - Agregar nueva consulta
- `POST /query` - Ejecutar consulta OLAP
- `GET /dataset` - Obtener dataset completo
- `GET /consultas/cluster/:cluster` - Consultas por cluster

### 2. Clustering ML (Puerto 3002)
Modelo de Machine Learning para clasificación de consultas.

**Funcionalidades:**
- Clasificación de consultas en 5 clusters (C1-C5)
- Vectorización de texto (TF-IDF y embeddings)
- Entrenamiento del modelo K-means
- Predicción de clusters para nuevas consultas

**Clusters:**
- **C1**: Exceso de velocidad / Semáforo
- **C2**: Estacionamiento indebido
- **C3**: Alcoholímetro
- **C4**: Falta de documentos
- **C5**: Accidentes

**Endpoints principales:**
- `POST /predict` - Predecir cluster para consulta
- `POST /train` - Entrenar modelo
- `GET /clusters` - Obtener información de clusters
- `GET /metrics` - Métricas del modelo

### 3. Autenticación (Puerto 3003)
Gestión de usuarios y autenticación JWT.

**Funcionalidades:**
- Registro de usuarios
- Login con JWT
- Verificación de tokens
- Gestión de perfiles

**Endpoints principales:**
- `POST /register` - Registrar usuario
- `POST /login` - Iniciar sesión
- `POST /verify` - Verificar token
- `GET /profile` - Obtener perfil

### 4. NLP (Puerto 3004)
Procesamiento de lenguaje natural.

**Funcionalidades:**
- Normalización de texto
- Tokenización
- Extracción de entidades (lugares, fechas, números)
- Clasificación de intención
- Análisis de sentimiento

**Endpoints principales:**
- `POST /process` - Procesar consulta completa
- `POST /sentiment` - Análisis de sentimiento

### 5. Búsqueda (Puerto 3005)
Motor de búsqueda de artículos legales.

**Funcionalidades:**
- Búsqueda difusa de artículos legales
- Filtrado por cluster y categoría
- Base de conocimiento legal

**Endpoints principales:**
- `POST /search` - Buscar artículos
- `GET /search/cluster/:cluster` - Artículos por cluster
- `GET /articles` - Todos los artículos

### 6. Recomendaciones (Puerto 3006)
Sistema de recomendación de abogados y servicios.

**Funcionalidades:**
- Recomendación de abogados especializados
- Servicios complementarios (grúas, talleres, seguros)
- Filtrado por ubicación y cluster

**Endpoints principales:**
- `POST /recommend` - Recomendaciones por cluster
- `POST /recommend/personalized` - Recomendación personalizada
- `GET /lawyers` - Lista de abogados
- `GET /services` - Servicios complementarios

### 7. Explicación (Puerto 3007)
Generación de explicaciones legales.

**Funcionalidades:**
- Explicaciones predefinidas por cluster
- Integración con ChatGPT (fallback)
- Análisis completo de consultas

**Endpoints principales:**
- `POST /explain` - Explicación por cluster
- `POST /explain/ai` - Explicación con IA
- `POST /analyze` - Análisis completo

### 8. Asistencia Geográfica (Puerto 3008)
Localización de dependencias gubernamentales.

**Funcionalidades:**
- Búsqueda de dependencias cercanas
- Cálculo de distancias
- Recomendaciones geográficas por cluster
- Tipos: policía, juzgados, tránsito, fiscalía, hospitales, patios de grúas

**Endpoints principales:**
- `POST /nearby` - Dependencias cercanas
- `GET /dependencies` - Todas las dependencias
- `POST /route` - Calcular ruta

## Instalación

### Requisitos Previos
- Node.js 18+
- npm o yarn
- TypeScript

### Instalación de Dependencias

Para cada microservicio, ejecutar:

```bash
cd microservices/[nombre-microservicio]
npm install
```

### Configuración

Copiar los archivos `.env.example` a `.env` en cada microservicio y configurar las variables:

```bash
cp .env.example .env
```

**Variables importantes:**
- `PORT`: Puerto del microservicio
- `OPENAI_API_KEY`: API key de OpenAI (solo para servicio de explicación)
- URLs de otros microservicios para comunicación

## Ejecución

### Modo Desarrollo

Ejecutar cada microservicio en modo desarrollo:

```bash
cd microservices/[nombre-microservicio]
npm run dev
```

### Modo Producción

```bash
cd microservices/[nombre-microservicio]
npm run build
npm start
```

### Orden de Inicio Recomendado

1. OLAP Cube (3001)
2. Clustering ML (3002)
3. Auth (3003)
4. NLP (3004)
5. Search (3005)
6. Recommendations (3006)
7. Explanation (3007)
8. Geo Assistance (3008)

## Dataset

### Generar Dataset de Entrenamiento

El proyecto incluye un generador de dataset con 10,000 registros simulados:

```bash
cd dataset
npm install
npm run generate
```

Esto generará el archivo `training_dataset.csv` con:
- Consultas variadas por cluster
- Datos de ubicación (8 ciudades colombianas)
- Metadatos (tipo de usuario, gravedad, artículos, etc.)

### Estructura del Dataset

| Campo | Descripción |
|-------|-------------|
| id | Identificador único |
| texto_consulta | Consulta del usuario |
| categoria_legal_original | Categoría legal |
| ciudad_usuario | Ciudad del incidente |
| tipo_usuario | conductor/peaton/pasajero |
| hora_incidente | Timestamp del incidente |
| ubicacion_lat | Latitud GPS |
| ubicacion_lng | Longitud GPS |
| historial_usuario | Número de consultas previas |
| articulo_sugerido | Artículo legal aplicable |
| gravedad_estimada | baja/media/alta |
| cluster_asignado | C1-C5 |

## Flujo de Uso del Sistema

### Flujo Completo de una Consulta

1. **Usuario** escribe su problema: "me pasé un semáforo en rojo"

2. **Autenticación** verifica el token JWT

3. **NLP** procesa el texto:
   - Normaliza y tokeniza
   - Extrae entidades
   - Clasifica intención

4. **Clustering ML** predice el cluster:
   - Vectoriza el texto
   - Aplica modelo K-means
   - Asigna cluster (ej: C1)

5. **Búsqueda** obtiene artículos legales relevantes

6. **Recomendaciones** sugiere:
   - Abogados especializados en tránsito
   - Servicios (grúas si aplica)

7. **Explicación** genera:
   - Explicación del problema
   - Pasos a seguir
   - Consecuencias legales

8. **Asistencia Geográfica** ubica:
   - Juzgados cercanos
   - Oficinas de tránsito
   - Dependencias relevantes

9. **OLAP** almacena la consulta para:
   - Análisis posterior
   - Reentrenamiento del modelo

## Machine Learning

### Modelo de Clustering

**Algoritmo:** K-means
**Alternativa:** DBSCAN (para clusters irregulares)

**Características:**
- 5 clusters predefinidos
- Vectorización TF-IDF
- Embeddings simulados (128 dimensiones)
- Entrenamiento offline
- Actualización periódica

### Entrenamiento del Modelo

```bash
# Desde el microservicio de clustering
curl -X POST http://localhost:3002/train-from-olap
```

### Métricas del Modelo

```bash
curl http://localhost:3002/metrics
```

## API Documentation

### Ejemplo de Flujo Completo

```javascript
// 1. Login
const loginResponse = await fetch('http://localhost:3003/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password'
  })
});
const { token } = await loginResponse.json();

// 2. Análisis completo de consulta
const analysisResponse = await fetch('http://localhost:3007/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    textoConsulta: 'me pasé un semáforo en rojo',
    usuarioId: 'user123'
  })
});

const result = await analysisResponse.json();
// result contiene: explicación, recomendaciones, cluster, artículos
```

## Tecnologías Utilizadas

- **Backend:** Node.js + Express + TypeScript
- **ML:** Natural (NLP), TensorFlow.js (futuro)
- **Búsqueda:** Fuse.js
- **Geolocalización:** Geolib
- **Autenticación:** JWT + bcrypt
- **IA:** OpenAI GPT (opcional)

## Estructura del Proyecto

```
LexIA2.0/
├── microservices/
│   ├── olap-cube/          # Cubo OLAP
│   ├── clustering-ml/       # Machine Learning
│   ├── auth/               # Autenticación
│   ├── nlp/                # Procesamiento NLP
│   ├── search/             # Búsqueda
│   ├── recommendations/    # Recomendaciones
│   ├── explanation/        # Explicaciones
│   └── geo-assistance/     # Asistencia Geográfica
├── dataset/                # Generador de dataset
│   ├── generate-dataset.ts
│   └── training_dataset.csv
└── README.md
```

## Testing

```bash
# Ejemplo de test con curl
curl http://localhost:3002/health
curl -X POST http://localhost:3002/predict \
  -H "Content-Type: application/json" \
  -d '{"textoConsulta": "me pasé un semáforo"}'
```

## Producción

### Consideraciones

1. **Base de Datos:** Reemplazar almacenamiento en memoria por PostgreSQL/MongoDB
2. **Cache:** Implementar Redis para cacheo
3. **Load Balancer:** Nginx para distribución de carga
4. **Monitoreo:** Prometheus + Grafana
5. **Logs:** Winston + ELK Stack
6. **Contenedores:** Docker + Kubernetes

### Docker (Futuro)

```dockerfile
# Ejemplo de Dockerfile para cada microservicio
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

## Contribución

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## Licencia

MIT License

## Contacto

Para soporte o consultas sobre el proyecto, contactar al equipo de desarrollo.

---

**Versión:** 2.0
**Última actualización:** 2025
