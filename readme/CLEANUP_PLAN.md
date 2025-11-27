# 🧹 LexIA 2.0 - Plan de Limpieza del Proyecto

## 📋 Servicios a Deprecar/Eliminar

### 1. ❌ Search Service (Puerto 3005)
**Ubicación:** `microservices/IA/search/`

**Razón para eliminar:**
- Usa búsqueda por keywords con Fuse.js (búsqueda básica)
- **Reemplazado por:** RAG Service (Puerto 3009) con búsqueda semántica usando embeddings
- RAG es superior: entiende el significado, no solo keywords
- Búsqueda vectorial con pgvector es más precisa

**Funcionalidad reemplazada:**
```
Search Service: "multa estacionamiento" → busca keyword "multa" + "estacionamiento"
RAG Service: "me multaron por estacionarme mal" → entiende contexto y encuentra artículos relevantes
```

---

### 2. ❌ Recommendations Service (Puerto 3006)
**Ubicación:** `microservices/recommendations/`

**Razón para eliminar:**
- Recomendaciones básicas sin contexto del usuario
- **Reemplazado por:** Chat Service > LawyerRecommendationService (Puerto 3010)
- Nueva versión incluye:
  - Scoring dinámico con Machine Learning
  - Aprende de feedback de usuarios
  - Recomendaciones personalizadas por cluster
  - Top 10 abogados especializados

**Funcionalidad reemplazada:**
```
Old: GET /recommend → lista genérica de abogados
New: POST /recommend-lawyers con cluster, ciudad → Top 10 con ML scoring personalizado
```

---

### 3. ❌ Explanation Service (Puerto 3007)
**Ubicación:** `microservices/explanation/`

**Razón para eliminar:**
- Explicaciones genéricas sin contexto emocional
- **Reemplazado por:** Chat Service > ResponseGenerator (Puerto 3010)
- Nueva versión incluye:
  - Respuestas empáticas según sentimiento del usuario
  - Templates personalizados (preocupado, frustrado, confundido, etc.)
  - Incluye artículos legales relevantes del RAG
  - Mantiene contexto de conversación

**Funcionalidad reemplazada:**
```
Old: GET /explain → explicación genérica
New: POST /message → respuesta empática con contexto + artículos legales + sugerencias
```

---

### 4. ⚠️ Shared Database (Opcional)
**Ubicación:** `shared/database/`

**Razón para considerar eliminar:**
- Actualmente NO se está usando
- Cada servicio crea su propio Pool de PostgreSQL
- Ver: `microservices/IA/olap-cube/src/infrastructure/config/container.ts` (líneas 26-33)
- Ver: `microservices/chat/src/index.ts` (líneas 26-33)

**Recomendación:**
- Mantener por ahora si planeas centralizarlo en el futuro
- Eliminar si prefieres que cada servicio maneje su propia conexión

---

## ✅ Servicios Esenciales (MANTENER)

### Arquitectura Limpia Final:

```
┌─────────────────────────────────────────────────────────┐
│                   LEXIA 2.0 - ARQUITECTURA LIMPIA       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ Auth Service│  │ OLAP Cube   │  │ Clustering  │   │
│  │  (3003)     │  │  (3001)     │  │ ML (3002)   │   │
│  │             │  │             │  │             │   │
│  │ JWT Auth    │  │ PostgreSQL  │  │ K-means     │   │
│  │ Usuarios    │  │ Analytics   │  │ Predicción  │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ NLP Service │  │ RAG Service │  │Chat Service │   │
│  │  (3004)     │  │  (3009)     │  │  (3010)     │   │
│  │             │  │             │  │             │   │
│  │ Sentimiento │  │ Embeddings  │  │ Conversación│   │
│  │ Intención   │  │ pgvector    │  │ Recomendación│  │
│  │             │  │ Semántica   │  │ Aprendizaje │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘

          ┌─────────────────────────┐
          │   PostgreSQL Database   │
          │                         │
          │  • lexia_db             │
          │  • pgvector extension   │
          │  • Todas las tablas     │
          └─────────────────────────┘
```

### 6 Servicios Esenciales:

1. **Auth Service (3003)** - Autenticación JWT
2. **OLAP Cube (3001)** - Análisis multidimensional
3. **Clustering ML (3002)** - Clasificación automática C1-C5
4. **NLP Service (3004)** - Procesamiento lenguaje natural
5. **RAG Service (3009)** - Búsqueda semántica con embeddings locales
6. **Chat Service (3010)** - Orquestador principal + ML + Recomendaciones

---

## 🚀 Pasos de Limpieza

### Opción A: Mover a carpeta `_deprecated/`
Mantener código para referencia futura pero marcarlo como obsoleto.

```bash
# Crear carpeta deprecated
mkdir _deprecated

# Mover servicios obsoletos
mv microservices/IA/search _deprecated/search
mv microservices/recommendations _deprecated/recommendations
mv microservices/explanation _deprecated/explanation
```

### Opción B: Eliminar completamente
Si estás seguro de no necesitar el código antiguo.

```bash
# Eliminar servicios obsoletos
rm -rf microservices/IA/search
rm -rf microservices/recommendations
rm -rf microservices/explanation
```

---

## 📝 Documentación a Actualizar

### Archivos que necesitan actualización:

1. **README.md principal** - Actualizar lista de servicios
2. **ARQUITECTURA.md** - Actualizar diagrama de arquitectura
3. **docker-compose.yml** (si existe) - Remover servicios obsoletos
4. **package.json** - Remover scripts de servicios eliminados

---

## 🎯 Beneficios de la Limpieza

### Antes (10 servicios):
```
✓ Auth (3003)
✓ OLAP Cube (3001)
✓ Clustering ML (3002)
✓ NLP (3004)
✓ Search (3005)          ← REDUNDANTE
✓ Recommendations (3006) ← REDUNDANTE
✓ Explanation (3007)     ← REDUNDANTE
✓ Geo Assistance (3008)  ← OPCIONAL
✓ RAG (3009)
✓ Chat (3010)
```

### Después (6 servicios esenciales):
```
✓ Auth (3003)
✓ OLAP Cube (3001)
✓ Clustering ML (3002)
✓ NLP (3004)
✓ RAG (3009)
✓ Chat (3010)          ← Incluye recomendaciones + explicaciones + ML
```

### Ventajas:
- ✅ **Menos complejidad** - 6 servicios en vez de 10
- ✅ **Más fácil de mantener** - Un solo punto de entrada (Chat)
- ✅ **Mejor rendimiento** - Menos overhead de comunicación entre servicios
- ✅ **Código más limpio** - Sin duplicación de funcionalidad
- ✅ **Más fácil de entender** - Arquitectura clara y simple

---

## ⚠️ Consideraciones

### Geo Assistance (Puerto 3008)
**Ubicación:** `microservices/geo-assistance/`

**Status:** MANTENER (Opcional)

**Razón:**
- No está duplicado
- Funcionalidad única: localización de dependencias
- Útil para encontrar oficinas de tránsito cercanas
- Puede integrarse con Chat Service en el futuro

**Recomendación:** Mantener pero no incluir en arquitectura principal por ahora.

---

## 📊 Resumen Ejecutivo

| Servicio | Acción | Razón |
|----------|--------|-------|
| Search (3005) | ❌ ELIMINAR | Reemplazado por RAG Service |
| Recommendations (3006) | ❌ ELIMINAR | Reemplazado por Chat > LawyerService |
| Explanation (3007) | ❌ ELIMINAR | Reemplazado por Chat > ResponseGenerator |
| Geo Assistance (3008) | ⚠️ MANTENER | Funcionalidad única, útil en futuro |
| shared/database/ | ⚠️ OPCIONAL | No se usa, pero podría centralizarse |

---

**Última actualización:** 22 de Noviembre, 2025
**Autor:** Claude Code - LexIA 2.0 Project Cleanup
