# Flujo de Procesamiento de PDFs - LexIA 2.0

## Diagrama del Flujo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│  PDFs de Leyes (leyes-transito/)                                │
│  - Ley 769 de 2002.pdf                                          │
│  - Ley 1383 de 2010.pdf                                         │
│  - Decreto 2251 de 2017.pdf                                     │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────────────────┐
│  Script: process-pdf-laws.js                                    │
│  ┌──────────────────────────────────────────────────┐          │
│  │ 1. Lee PDF con pdf-parse                         │          │
│  │ 2. Extrae texto completo                         │          │
│  │ 3. Usa regex para encontrar artículos            │          │
│  │ 4. Clasifica por categoría                       │          │
│  │ 5. Asigna cluster (C1-C5)                        │          │
│  └──────────────────────────────────────────────────┘          │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────────────────┐
│  POST http://localhost/api/rag/index                            │
│  {                                                               │
│    "titulo": "Artículo 135 - Estacionamiento Prohibido",       │
│    "contenido": "Estacionar un vehículo...",                   │
│    "categoria": "Multas Menores",                              │
│    "clusterRelacionado": "C2"                                  │
│  }                                                               │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────────────────┐
│  RAG Service (:3009)                                            │
│  ┌──────────────────────────────────────────────────┐          │
│  │ 1. Valida datos                                   │          │
│  │ 2. Divide contenido en chunks (512 tokens)       │          │
│  │ 3. Genera embeddings con Xenova/all-MiniLM-L6-v2│          │
│  │ 4. Guarda en PostgreSQL                          │          │
│  └──────────────────────────────────────────────────┘          │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────────────────┐
│  PostgreSQL + pgvector                                          │
│  ┌──────────────────────────────────────────────────┐          │
│  │ documentos_legales                                │          │
│  │ ├─ id                                             │          │
│  │ ├─ titulo                                         │          │
│  │ ├─ contenido                                      │          │
│  │ ├─ categoria                                      │          │
│  │ └─ cluster_relacionado                            │          │
│  │                                                    │          │
│  │ documento_chunks                                  │          │
│  │ ├─ id                                             │          │
│  │ ├─ documento_id                                   │          │
│  │ ├─ contenido                                      │          │
│  │ └─ embedding (vector 384D)                       │          │
│  └──────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘

                        ↓  ↓  ↓  ↓

        Ahora los datos están listos para usarse en:

┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Chat Service │  │  Clustering  │  │  OLAP Cube   │  │ NLP Service  │
│              │  │              │  │              │  │              │
│ Busca        │  │ Aprende de   │  │ Analiza      │  │ Extrae       │
│ artículos    │  │ categorías   │  │ métricas     │  │ keywords     │
│ relevantes   │  │ para         │  │ de consultas │  │ y entidades  │
│              │  │ clasificar   │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

---

## Ejemplo Paso a Paso

### Entrada: PDF de la Ley 769

```pdf
CÓDIGO NACIONAL DE TRÁNSITO TERRESTRE
LEY 769 DE 2002

ARTÍCULO 135. Estacionamiento en sitio prohibido.

El conductor que estacione un vehículo en sitios prohibidos
como zonas de carga, frente a hidrantes, en vías de alto flujo
o sobre andenes peatonales, será sancionado con multa
equivalente a quince (15) salarios mínimos legales diarios
vigentes.

ARTÍCULO 140. Conducir sin documentos...
```

### Procesamiento

```javascript
// 1. Extracción
const text = await pdfParse(buffer);

// 2. Regex encuentra artículos
const match = /ARTÍCULO\s+(\d+)[.\s]*([^\n]+)\n([\s\S]*?)(?=ARTÍCULO|\$)/

// 3. Parse
{
  numero: "135",
  titulo: "Artículo 135 - Estacionamiento en sitio prohibido",
  contenido: "El conductor que estacione un vehículo...",
  fuente: "Ley 769 de 2002",
  categoria: "Multas Menores",  // Detectado por keywords
  cluster: "C2"                 // Detectado por contenido
}

// 4. API Call
POST /api/rag/index
```

### Almacenamiento en BD

```sql
-- Tabla: documentos_legales
INSERT INTO documentos_legales
VALUES (
  uuid_generate_v4(),
  'Artículo 135 - Estacionamiento en sitio prohibido',
  'El conductor que estacione...',
  'Ley 769 de 2002',
  'Multas Menores',
  'C2',
  true
);

-- Tabla: documento_chunks (generado por RAG)
INSERT INTO documento_chunks
VALUES (
  uuid_generate_v4(),
  '<documento_id>',
  0,  -- chunk index
  'El conductor que estacione un vehículo en sitios prohibidos...',
  '[0.019, 0.102, -0.021, ...]'::vector  -- 384 dimensiones
);
```

---

## Uso de los Datos Indexados

### 1. Chat Service - Respuesta a Consulta

```javascript
// Usuario pregunta
const query = "Me multaron por estacionarme mal";

// Chat llama a RAG
const ragResponse = await axios.post('/api/rag/search-smart', {
  query: query,
  usuarioId: userId
});

// RAG busca con similitud coseno
SELECT
  dc.contenido,
  dl.titulo,
  1 - (dc.embedding <=> query_embedding) as similitud
FROM documento_chunks dc
JOIN documentos_legales dl ON dc.documento_id = dl.id
WHERE 1 - (dc.embedding <=> query_embedding) > 0.5
  AND dl.cluster_relacionado = 'C2'
ORDER BY similitud DESC
LIMIT 5;

// Resultado
{
  clusterDetectado: "C2",
  chunksRecuperados: [
    {
      titulo: "Artículo 135 - Estacionamiento en sitio prohibido",
      contenido: "El conductor que estacione...",
      similitud: 0.87
    }
  ]
}

// Chat genera respuesta empática
"Entiendo tu situación. Según el Artículo 135 de la Ley 769..."
```

### 2. Clustering ML - Entrenamiento

```javascript
// Sistema de clustering aprende de los artículos
const trainingData = await db.query(`
  SELECT
    titulo,
    contenido,
    cluster_relacionado as label
  FROM documentos_legales
  WHERE activo = true
`);

// K-means aprende patrones
// "estacionamiento" + "prohibido" + "multa" → C2
// "alcohol" + "embriaguez" + "suspensión" → C1

// Cuando llega una nueva consulta:
const prediction = clusterModel.predict("me multaron por parquear mal");
// → C2 (Multas Menores) con 89% confianza
```

### 3. OLAP Cube - Analytics

```sql
-- Análisis de consultas por cluster
SELECT
  c.cluster_relacionado,
  COUNT(*) as total_consultas,
  AVG(rc.tiempo_busqueda_ms) as tiempo_promedio,
  COUNT(DISTINCT rc.usuario_id) as usuarios_unicos
FROM rag_consultas rc
JOIN documentos_legales c ON rc.cluster_detectado = c.cluster_relacionado
WHERE rc.fecha >= NOW() - INTERVAL '30 days'
GROUP BY c.cluster_relacionado;

-- Resultado:
-- C1: 1,234 consultas, 150ms promedio, 456 usuarios
-- C2: 3,456 consultas, 120ms promedio, 892 usuarios
-- C3: 567 consultas, 180ms promedio, 234 usuarios
```

### 4. NLP Service - Análisis de Texto

```javascript
// NLP extrae información de los artículos indexados
const nlpResult = await nlpService.process({
  textoConsulta: "Me multaron por estacionarme mal"
});

// Extrae:
{
  tokens: ["me", "multaron", "estacionarme", "mal"],
  palabrasClave: ["multaron", "estacionarme"],
  entidades: {
    tipo_infraccion: "estacionamiento",
    severidad: "menor"
  },
  intencion: "consulta_multa",
  cluster: "C2",  // Basado en keywords de artículos indexados
  confianza: 0.85
}
```

---

## Beneficios del Sistema

### Para el Chat
✅ Respuestas precisas basadas en leyes reales
✅ Cita artículos específicos con número y contenido
✅ Búsqueda semántica (no solo keywords)
✅ Contexto legal correcto

### Para Clustering
✅ Entrenamiento con datos reales
✅ Mejor clasificación de consultas
✅ Aprendizaje continuo
✅ Detección de nuevos patrones

### Para OLAP
✅ Analytics detallado por categoría legal
✅ Métricas de uso de artículos
✅ Identificación de consultas frecuentes
✅ Insights para mejora del sistema

### Para NLP
✅ Extracción de terminología legal
✅ Keywords específicas del dominio
✅ Mejora en detección de intención
✅ Análisis de sentimiento contextual

---

## Escalabilidad

### Actualmente
- 17 artículos manuales
- 1-2 chunks por artículo
- ~30 vectores en BD

### Con PDFs completos
- ~200+ artículos de Ley 769
- ~300+ artículos de modificaciones
- 3-5 chunks por artículo
- ~1,500+ vectores en BD

### Capacidad
- PostgreSQL + pgvector: Millones de vectores
- Búsqueda: <100ms con índice HNSW
- Escalable horizontalmente

---

## Próximos Pasos

1. **Colocar PDFs**: Agregar PDFs en `leyes-transito/`
2. **Instalar deps**: `cd scripts && npm install`
3. **Procesar**: `node process-pdf-laws.js`
4. **Verificar**: `curl http://localhost/api/rag/stats`
5. **Probar**: Enviar consulta al chat y ver respuesta con artículos

---

**Última actualización**: 2025-11-26
**Estado**: Sistema listo para procesar PDFs
