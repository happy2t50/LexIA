# Leyes de Tránsito - Chiapas, México

Esta carpeta contiene los PDFs de leyes y reglamentos de tránsito de Chiapas, México.

## 📚 Documentos Actuales

### Leyes Estatales
- ✅ `Ley_Movilidad_Chiapas.pdf` - Ley de Movilidad del Estado de Chiapas

### Reglamentos Estatales
- ✅ `Reglamento_Movilidad_Chiapas.pdf` - Reglamento de la Ley de Movilidad

### Reglamentos Municipales
- ✅ `Reglamento_Transito_Comitan.pdf` - Reglamento de Tránsito de Comitán
- ✅ `Reglamento_Transito_Palenque.pdf` - Reglamento de Tránsito de Palenque
- ✅ `Reglamento_Transito_San_Cristobal.pdf` - Reglamento de San Cristóbal de las Casas
- ✅ `Reglamento_Transito_Tapachula.pdf` - Reglamento de Tránsito de Tapachula
- ✅ `Reglamento_Transito_Tuxtla_Gutierrez.pdf` - Reglamento de Tuxtla Gutiérrez

**Total**: 7 PDFs listos para procesar

---

## 🚀 Cómo Procesar los PDFs

### Paso 1: Verificar Docker
```bash
docker ps
```

Si no está corriendo:
```bash
docker-compose up -d
```

### Paso 2: Instalar Dependencias (solo primera vez)
```bash
cd scripts
npm install
```

Esto instala:
- `pdf-parse` - Para extraer texto de PDFs
- `axios` - Para llamar al API RAG

### Paso 3: Ejecutar Procesamiento
```bash
cd scripts
node process-pdf-laws.js
```

### Salida Esperada
```
🚀 Iniciando procesamiento de PDFs...

📚 Encontrados 7 archivos PDF

📖 Procesando: Ley_Movilidad_Chiapas.pdf
──────────────────────────────────────────────────
📄 Extrayendo texto...
🔍 Buscando artículos...
📄 Extraídos 145 artículos de Ley_Movilidad_Chiapas.pdf
📤 Indexando 145 artículos en RAG...
  ✅ Artículo 1 - Objeto de la Ley...
  ✅ Artículo 2 - Glosario de términos...
  ...

==================================================
📊 RESUMEN DE PROCESAMIENTO
==================================================
📚 PDFs procesados: 7
📄 Artículos extraídos: 847
✅ Artículos indexados: 847
❌ Fallos: 0
==================================================
```

---

## 🎯 ¿Qué hace el script?

### 1. Extracción de Texto
Lee cada PDF y extrae todo el texto usando `pdf-parse`.

### 2. Detección de Artículos
Busca patrones como:
- "ARTÍCULO 123"
- "Artículo 123"
- "Art. 123"
- "Artículo Número 123"

### 3. Clasificación Automática

**Por Categoría**:
- Infracciones Graves
- Multas Menores
- Accidentes
- Vehículos
- Transporte Público
- Señalización
- Documentación
- General

**Por Cluster** (para ML):
- **C1**: Infracciones graves (alcohol, drogas, velocidad extrema)
- **C2**: Multas menores (estacionamiento, señales, documentos)
- **C3**: Accidentes (choques, fugas, procedimientos)
- **C4**: Vehículos (modificaciones, revisión técnica)
- **C5**: Transporte (público, carga, pasajeros)

### 4. Indexación en RAG
Cada artículo se envía al RAG Service:
```javascript
POST http://localhost/api/rag/index
{
  "titulo": "Artículo 135 - Estacionamiento Prohibido",
  "contenido": "El conductor que estacione...",
  "fuente": "Reglamento de Tránsito de Tuxtla Gutiérrez",
  "categoria": "Multas Menores",
  "clusterRelacionado": "C2"
}
```

### 5. Generación de Embeddings
RAG Service genera vectores de 384 dimensiones con el modelo:
- `Xenova/all-MiniLM-L6-v2` (100% local, sin OpenAI)

### 6. Almacenamiento en PostgreSQL
Los artículos y sus embeddings se guardan en:
- `documentos_legales` - Artículos completos
- `documento_chunks` - Chunks con embeddings vectoriales

---

## 📊 Cómo se Usan los Datos

### 1. Chat Inteligente
Cuando un usuario pregunta:
```
"¿Cuál es la multa por estacionarse en doble fila en Tuxtla?"
```

El sistema:
1. Genera embedding de la pregunta
2. Busca artículos similares con búsqueda vectorial
3. Filtra por municipio (Tuxtla)
4. Encuentra el artículo relevante
5. Responde con información precisa

### 2. Clustering ML
El sistema aprende patrones:
```
"estacionamiento prohibido" → C2 (Multas Menores)
"conducir ebrio" → C1 (Infracciones Graves)
```

### 3. OLAP Analytics
Métricas como:
- Artículos más consultados por municipio
- Categorías de infracciones más frecuentes
- Comparación entre reglamentos municipales

### 4. NLP
Extrae terminología legal específica:
- "salarios mínimos diarios"
- "suspensión de licencia"
- "inmovilización del vehículo"

---

## 🔍 Verificar Resultados

### Ver estadísticas
```bash
curl http://localhost/api/rag/stats
```

### Buscar artículos
```bash
curl -X POST http://localhost/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query":"multa estacionamiento Tuxtla","topK":5}'
```

### Probar en el chat
```bash
curl -X POST http://localhost/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "<tu-session-id>",
    "mensaje": "¿Cuánto cuesta una multa por estacionarse mal en Tuxtla?",
    "usuarioId": "<tu-user-id>",
    "nombre": "Usuario"
  }'
```

---

## 🛠️ Opciones Avanzadas

### Generar SQL en vez de indexar
```bash
node process-pdf-laws.js --sql leyes-chiapas.sql
```

### Procesar carpeta diferente
```bash
node process-pdf-laws.js --folder /otra/carpeta
```

### Usar API diferente
```bash
node process-pdf-laws.js --api http://production/api/rag/index
```

---

## 🐛 Troubleshooting

### Error: "Module pdf-parse not found"
```bash
cd scripts
npm install pdf-parse axios
```

### Error: "Cannot connect to API"
Docker no está corriendo o el servicio RAG no está listo:
```bash
docker-compose up -d
docker logs lexia-rag
```

### PDFs no se procesan
- **PDFs escaneados**: Requieren OCR (no soportado)
- **PDFs protegidos**: Necesitan desbloqueo
- **Formato incorrecto**: Verifica que el texto sea seleccionable

### No se detectan artículos
El regex busca:
- "ARTÍCULO XXX"
- "Artículo XXX"
- "Art. XXX"

Si tu PDF usa otro formato, edita el regex en `process-pdf-laws.js` línea 35.

---

## 📈 Estimación de Resultados

Basado en los PDFs actuales:

| PDF | Artículos Estimados | Chunks | Vectores |
|-----|--------------------:|-------:|---------:|
| Ley Movilidad Chiapas | ~150 | ~450 | ~450 |
| Reglamento Movilidad | ~200 | ~600 | ~600 |
| Reglamento Comitán | ~80 | ~240 | ~240 |
| Reglamento Palenque | ~120 | ~360 | ~360 |
| Reglamento San Cristóbal | ~70 | ~210 | ~210 |
| Reglamento Tapachula | ~50 | ~150 | ~150 |
| Reglamento Tuxtla | ~90 | ~270 | ~270 |
| **TOTAL** | **~760** | **~2,280** | **~2,280** |

Esto le dará a LexIA un conocimiento legal **muy completo** de las leyes de tránsito de Chiapas.

---

## 🎯 Próximos Pasos

1. **Ejecutar el script**: `node process-pdf-laws.js`
2. **Verificar indexación**: Ver logs y stats
3. **Probar el chat**: Hacer consultas específicas de Chiapas
4. **Agregar más PDFs**: Si tienes de otros estados

---

## 📝 Notas Importantes

- ⏱️ **Tiempo estimado**: ~10-15 minutos para procesar los 7 PDFs
- 💾 **Espacio en BD**: ~50-100 MB para vectores
- 🚀 **Rendimiento**: Búsquedas <100ms con índice HNSW
- 🔒 **Privacidad**: Todo procesado localmente, sin APIs externas

---

**¿Listo para empezar?**

```bash
cd scripts
npm install
node process-pdf-laws.js
```

¡Y LexIA tendrá todo el conocimiento legal de Chiapas! 🎉
