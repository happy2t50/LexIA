# 🗄️ Servicios Deprecados

Esta carpeta contiene servicios que han sido **reemplazados** por versiones más avanzadas en LexIA 2.0.

## ⚠️ NO USAR ESTOS SERVICIOS

Los servicios en esta carpeta están aquí solo para **referencia histórica** y **no deben ser utilizados** en producción.

---

## 📋 Servicios Deprecados

### 1. ❌ Search Service
**Fecha de deprecación:** 22 de Noviembre, 2025
**Puerto original:** 3005
**Reemplazado por:** RAG Service (Puerto 3009)

**Razón:**
- Búsqueda por keywords básica con Fuse.js
- No entiende contexto semántico
- Precisión limitada

**Reemplazo superior:**
- RAG Service usa embeddings locales (Xenova/all-MiniLM-L6-v2)
- Búsqueda semántica con pgvector
- Entiende significado, no solo palabras clave
- Precisión mucho mayor

---

### 2. ❌ Recommendations Service
**Fecha de deprecación:** 22 de Noviembre, 2025
**Puerto original:** 3006
**Reemplazado por:** Chat Service > LawyerRecommendationService (Puerto 3010)

**Razón:**
- Recomendaciones genéricas sin personalización
- No aprende de feedback de usuarios
- Sin contexto del problema del usuario

**Reemplazo superior:**
- Scoring dinámico con Machine Learning
- Aprende de valoraciones de usuarios
- Recomendaciones personalizadas por cluster (C1-C5)
- Top 10 abogados con scoring ajustado
- Tracking de casos exitosos

---

### 3. ❌ Explanation Service
**Fecha de deprecación:** 22 de Noviembre, 2025
**Puerto original:** 3007
**Reemplazado por:** Chat Service > ResponseGenerator (Puerto 3010)

**Razón:**
- Explicaciones genéricas sin empatía
- No adapta tono al estado emocional del usuario
- Sin memoria de conversación

**Reemplazo superior:**
- Respuestas empáticas según sentimiento (preocupado, frustrado, confundido, etc.)
- Templates personalizados
- Incluye artículos legales relevantes del RAG
- Mantiene contexto de conversación completa
- Sugerencias contextuales inteligentes

---

## 🔄 Migración

Si necesitas funcionalidad de estos servicios, usa los nuevos:

### Búsqueda (antes Search)
```bash
# ❌ Antiguo (NO usar)
curl http://localhost:3005/search?query=multa

# ✅ Nuevo
curl -X POST http://localhost:3009/search-smart \
  -H "Content-Type: application/json" \
  -d '{"query": "me multaron por estacionarme mal", "usuarioId": "user123"}'
```

### Recomendaciones (antes Recommendations)
```bash
# ❌ Antiguo (NO usar)
curl http://localhost:3006/recommend

# ✅ Nuevo
curl -X POST http://localhost:3010/recommend-lawyers \
  -H "Content-Type: application/json" \
  -d '{"cluster": "C2", "usuarioId": "user123", "ciudad": "Chiapas", "limit": 10}'
```

### Explicaciones (antes Explanation)
```bash
# ❌ Antiguo (NO usar)
curl http://localhost:3007/explain?topic=estacionamiento

# ✅ Nuevo - usa Chat conversacional
curl -X POST http://localhost:3010/message \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-123",
    "usuarioId": "user123",
    "nombre": "Juan",
    "mensaje": "me multaron por estacionarme 30 cm de la banqueta"
  }'
```

---

## 📊 Comparación de Características

| Característica | Servicios Antiguos | Servicios Nuevos |
|----------------|-------------------|------------------|
| **Búsqueda** | Keywords (Fuse.js) | Semántica (embeddings) |
| **Precisión** | Baja (~60%) | Alta (~90%+) |
| **Recomendaciones** | Genéricas | Personalizadas + ML |
| **Aprendizaje** | No | Sí (aprende con feedback) |
| **Empatía** | No | Sí (adapta tono) |
| **Memoria** | No | Sí (contexto completo) |
| **Clustering** | No | Sí (automático C1-C5) |
| **Artículos legales** | No | Sí (del RAG) |

---

## 🗑️ ¿Puedo eliminar estos servicios?

**Sí**, después de verificar que:
1. ✅ RAG Service (3009) está funcionando correctamente
2. ✅ Chat Service (3010) está operativo
3. ✅ Base de datos tiene migración 003_chat_intelligence.sql aplicada
4. ✅ No hay dependencias en otros servicios

---

## 📚 Documentación de Servicios Nuevos

- [RAG Service](../microservices/IA/rag/README.md)
- [Chat Service](../microservices/chat/README.md)
- [Arquitectura Completa](../CHAT_SERVICE_COMPLETO.md)

---

**Última actualización:** 22 de Noviembre, 2025
**Mantenido por:** LexIA 2.0 Development Team
