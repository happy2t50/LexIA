# 🤖 Chat Service - Asistente Legal Inteligente

Sistema de chat conversacional con IA que integra:
- 💬 Memoria de conversación contextual
- 🧠 Procesamiento de lenguaje natural
- 🎯 Clustering automático de consultas
- 📚 RAG (Retrieval-Augmented Generation)
- 👨‍⚖️ Recomendación inteligente de abogados
- 👥 Agrupación automática de usuarios
- 📈 Aprendizaje continuo por feedback

---

## 📦 Instalación

```bash
cd microservices/chat
npm install
```

---

## ⚙️ Configuración

Archivo `.env`:

```env
PORT=3010
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lexia_db
DB_USER=postgres
DB_PASSWORD=password

RAG_SERVICE_URL=http://localhost:3009
NLP_SERVICE_URL=http://localhost:3004
CLUSTERING_SERVICE_URL=http://localhost:3002
```

---

## 🚀 Iniciar Servicio

```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm start
```

---

## 💬 Ejemplo de Conversación Completa

### 1. Iniciar Sesión

```bash
curl -X POST http://localhost:3010/session/start \
  -H "Content-Type: application/json" \
  -d '{
    "usuarioId": "juan123",
    "nombre": "Juan"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "sessionId": "session-uuid-123",
  "mensaje": "¡Hola Juan! 👋\n\nSoy LexIA, tu asistente legal inteligente...\n\n¿En qué puedo ayudarte hoy?"
}
```

---

### 2. Usuario Pregunta (Mensaje 1)

```bash
curl -X POST http://localhost:3010/message \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-uuid-123",
    "usuarioId": "juan123",
    "nombre": "Juan",
    "mensaje": "Oye fíjate que me multaron por estacionarme como 30 cm separado de la banqueta"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "mensaje": "Hola Juan, entiendo tu preocupación.\n\nEs importante que sepas que tienes opciones para resolver esta situación.\n\n📋 **Información Legal Aplicable:**\n\n**1. Artículo 138 - Estacionamiento Prohibido**\n🏛️ Fuente: Código Nacional de Tránsito\n📄 Estacionar en zonas prohibidas o que obstruyan la vía pública es infracción. Multa de 15 SMLV e inmovilización del vehículo. No se puede estacionar: en vías rápidas...\n✓ Relevancia: 92%\n\n¿Te gustaría que te ayude con algo más específico?",
  "articulos": [
    {
      "titulo": "Artículo 138 - Estacionamiento Prohibido",
      "contenido": "Estacionar en zonas prohibidas...",
      "fuente": "Código Nacional de Tránsito",
      "similitud": 0.92
    }
  ],
  "sugerencias": [
    {
      "tipo": "abogados",
      "texto": "👨‍⚖️ Ver abogados especializados",
      "accion": "show_lawyers"
    },
    {
      "tipo": "impugnar",
      "texto": "⚖️ ¿Cómo impugnar esta multa?",
      "accion": "show_impugnation_guide"
    },
    {
      "tipo": "pagar",
      "texto": "💰 Ver opciones de pago con descuento",
      "accion": "show_payment_options"
    },
    {
      "tipo": "foro",
      "texto": "👥 Conectar con usuarios en situación similar",
      "accion": "show_forum"
    }
  ],
  "cluster": "C2",
  "sentimiento": "preocupado",
  "sessionId": "session-uuid-123"
}
```

---

### 3. Usuario Sigue Conversación (Mensaje 2)

```bash
curl -X POST http://localhost:3010/message \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-uuid-123",
    "usuarioId": "juan123",
    "nombre": "Juan",
    "mensaje": "No entiendo, me parece una locura"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "mensaje": "Comprendo tu frustración Juan.\n\nEs común que estos cambios en las normativas generen confusión. La buena noticia es que tienes varias alternativas.\n\nTienes derecho a:\n• Impugnar la multa si consideras que fue injusta\n• Consultar con un experto para conocer tus derechos\n• Pagar con descuento dentro de los primeros 5 días\n\n¿Quieres que te muestre las opciones disponibles?",
  "cluster": "C2",
  "sentimiento": "frustrado",
  "sessionId": "session-uuid-123"
}
```

---

### 4. Solicitar Recomendación de Abogados

```bash
curl -X POST http://localhost:3010/recommend-lawyers \
  -H "Content-Type: application/json" \
  -d '{
    "usuarioId": "juan123",
    "cluster": "C2",
    "ciudad": "Chiapas",
    "limit": 10
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "cluster": "C2",
  "totalAbogados": 10,
  "abogados": [
    {
      "id": "abogado1",
      "nombre": "Lic. María González",
      "especialidades": ["Infracciones de Tránsito", "Estacionamiento"],
      "rating": 4.9,
      "experiencia": 15,
      "casosGanados": 89,
      "ciudad": "Chiapas",
      "scorePersonalizado": 0.95,
      "razonRecomendacion": "Alta tasa de éxito en casos similares • Excelentes valoraciones de clientes • 15 años de experiencia • 89 casos exitosos • Especialista en Estacionamiento"
    },
    {
      "id": "abogado2",
      "nombre": "Lic. Carlos Ramírez",
      "especialidades": ["Infracciones de Tránsito"],
      "rating": 4.8,
      "experiencia": 12,
      "casosGanados": 76,
      "ciudad": "Chiapas",
      "scorePersonalizado": 0.88,
      "razonRecomendacion": "Excelentes valoraciones de clientes • 12 años de experiencia • 76 casos exitosos"
    }
  ]
}
```

---

### 5. Buscar Usuarios Similares (Para Foro)

```bash
curl -X POST http://localhost:3010/find-similar-users \
  -H "Content-Type: application/json" \
  -d '{
    "usuarioId": "juan123",
    "cluster": "C2",
    "limit": 10
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "cluster": "C2",
  "totalUsuarios": 3,
  "usuarios": [
    {
      "usuarioId": "juana456",
      "nombre": "Juana Pérez",
      "cluster": "C2",
      "similitud": 0.94,
      "totalConsultas": 5
    },
    {
      "usuarioId": "pedro789",
      "nombre": "Pedro López",
      "cluster": "C2",
      "similitud": 0.87,
      "totalConsultas": 3
    }
  ]
}
```

---

### 6. Registrar Feedback (Valorar Abogado)

```bash
curl -X POST http://localhost:3010/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "usuarioId": "juan123",
    "tipo": "valoracion_abogado",
    "data": {
      "abogadoId": "abogado1",
      "cluster": "C2",
      "valoracion": 5,
      "comentario": "Excelente, me ayudó a impugnar la multa exitosamente"
    }
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Feedback registrado exitosamente"
}
```

**El sistema aprende:**
- ✅ Actualiza rating del abogado
- ✅ Incrementa score de recomendación para cluster C2
- ✅ Registra caso exitoso
- ✅ Próximas recomendaciones priorizarán este abogado

---

### 7. Obtener Historial de Conversación

```bash
curl http://localhost:3010/session/session-uuid-123/history
```

**Respuesta:**
```json
{
  "success": true,
  "sessionId": "session-uuid-123",
  "totalMensajes": 5,
  "mensajes": [
    {
      "id": "msg1",
      "rol": "system",
      "mensaje": "¡Hola Juan! Soy LexIA...",
      "fecha": "2025-01-22T10:00:00Z"
    },
    {
      "id": "msg2",
      "rol": "user",
      "mensaje": "me multaron por estacionarme...",
      "cluster": "C2",
      "fecha": "2025-01-22T10:01:00Z"
    },
    {
      "id": "msg3",
      "rol": "assistant",
      "mensaje": "Hola Juan, entiendo tu preocupación...",
      "fecha": "2025-01-22T10:01:15Z"
    }
  ]
}
```

---

## 📊 API Endpoints

### Chat

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/session/start` | Iniciar nueva sesión de chat |
| POST | `/message` | Enviar mensaje al chat |
| GET | `/session/:sessionId/history` | Obtener historial |
| POST | `/session/:sessionId/close` | Cerrar sesión |
| GET | `/user/:usuarioId/sessions` | Sesiones del usuario |

### Abogados

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/recommend-lawyers` | Recomendar abogados |
| POST | `/contact-lawyer` | Registrar contacto |
| GET | `/top-lawyers/:cluster` | Top abogados por cluster |

### Usuarios y Grupos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/find-similar-users` | Buscar usuarios similares |
| GET | `/user/:usuarioId/groups` | Grupos del usuario |
| GET | `/user/:usuarioId/suggest-groups` | Sugerir grupos |

### Aprendizaje

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/feedback` | Registrar feedback |
| GET | `/metrics` | Métricas de aprendizaje |

---

## 🧠 Inteligencia del Sistema

### 1. Memoria Conversacional
- ✅ Recuerda contexto de conversación
- ✅ Detecta cambios de tema
- ✅ Referencia mensajes previos

### 2. Respuestas Empáticas
- ✅ Adapta tono según sentimiento
- ✅ Templates personalizados
- ✅ Respuestas formales pero humanas

### 3. Clustering Automático
- ✅ Detecta cluster automáticamente (C1-C5)
- ✅ Agrupa usuarios con problemas similares
- ✅ Sugiere grupos relevantes

### 4. Machine Learning
- ✅ Aprende de feedback de usuarios
- ✅ Actualiza scores de abogados dinámicamente
- ✅ Mejora recomendaciones con el tiempo

---

## 🔄 Flujo Completo del Sistema

```
Usuario: "me multaron por estacionarme lejos"
       │
       ▼
[Chat Service] - Guarda mensaje
       │
       ├─► [NLP] - Analiza sentimiento/intención
       │            └─► sentimiento: "preocupado"
       │
       ├─► [RAG] - Búsqueda semántica
       │            └─► Artículo 138 (similitud: 0.92)
       │
       ├─► [Clustering] - Detecta cluster
       │            └─► cluster: "C2" (Estacionamiento)
       │
       ├─► [ResponseGenerator] - Genera respuesta empática
       │            └─► "Hola Juan, entiendo tu preocupación..."
       │
       ├─► [LawyerService] - Busca abogados top
       │            └─► 10 abogados especializados
       │
       └─► [UserClustering] - Agrupa usuario
                    └─► Juan agregado a "Grupo Estacionamiento"

Chat responde:
"Hola Juan, entiendo tu preocupación.
📋 Artículo 138...
¿Te gustaría ver abogados especializados?"
```

---

## 📈 Sistema de Aprendizaje

### Cómo Aprende el Sistema:

1. **Usuario valora abogado** (⭐⭐⭐⭐⭐)
   → Sistema aumenta score del abogado en 10%
   → Próximas recomendaciones lo priorizan

2. **Usuario contacta abogado**
   → Sistema registra interés
   → Ajusta score basado en tasa de contacto

3. **Caso exitoso**
   → Score aumenta 15%
   → Abogado sube en ranking

4. **Feedback negativo**
   → Score disminuye 10%
   → Abogado baja en prioridad

### Ejemplo Real:

```
Abogado María - Cluster C2 (Estacionamiento)

Inicio:       score = 0.5 (base)
              ↓
Recomendado:  score = 0.5  (sin cambio)
              ↓
Valoración 5: score = 0.55 (↑10%)
              ↓
Caso exitoso: score = 0.63 (↑15%)
              ↓
3 más casos:  score = 0.75 (top recomendado)
```

---

## 🎯 Ventajas del Sistema

| Característica | Antes | Con Chat Service |
|----------------|-------|------------------|
| **Memoria** | No recordaba contexto | ✅ Recuerda conversación completa |
| **Empatía** | Respuestas genéricas | ✅ Adapta tono a sentimiento |
| **Recomendaciones** | Aleatorias | ✅ ML aprende y mejora |
| **Agrupación** | Manual | ✅ Automática por similitud |
| **Aprendizaje** | Estático | ✅ Mejora con cada interacción |

---

## 🔐 Seguridad

- ✅ Todos los datos en PostgreSQL
- ✅ Sesiones por usuario
- ✅ Tracking de todas las interacciones
- ✅ Privacy-friendly (datos locales)

---

## 📚 Documentos Relacionados

- [ARQUITECTURA_CHAT_INTELIGENTE.md](../../ARQUITECTURA_CHAT_INTELIGENTE.md) - Arquitectura completa
- [003_chat_intelligence.sql](../../database/migrations/003_chat_intelligence.sql) - Base de datos

---

**¡Chat Service listo para producción!** 🚀
