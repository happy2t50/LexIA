# 🔌 Microservicios Conectados - App Flutter

## ✅ Estado: TODOS LOS MICROSERVICIOS CONECTADOS

Tu app Flutter ahora está completamente conectada a todos los microservicios del backend LexIA 2.0 a través de Nginx.

---

## 📊 Arquitectura

```
┌─────────────────┐
│  App Flutter    │
│  (Puerto 8080)  │
└────────┬────────┘
         │
         │ HTTP Requests
         ▼
┌─────────────────┐
│  Nginx Gateway  │  ← Rate limiting, CORS, routing
│  (Puerto 80)    │
└────────┬────────┘
         │
         ├──────────────────────────────────────────────┐
         │                                              │
         ▼                                              ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ...
│ Auth Service │  │ Chat Service │  │  Geo Service │
│ (Puerto 3003)│  │ (Puerto 3010)│  │ (Puerto 3006)│
└──────────────┘  └──────────────┘  └──────────────┘
         │
         ▼
┌──────────────┐
│  PostgreSQL  │
│ (Puerto 5432)│
└──────────────┘
```

---

## 🎯 Microservicios Disponibles

### **1. Auth Service** ✅
**Puerto:** 3003
**Ruta Nginx:** `/api/auth`
**Endpoints Flutter:**

```dart
// Login y Registro
ApiEndpoints.login              // POST /api/auth/login
ApiEndpoints.register           // POST /api/auth/register
ApiEndpoints.googleLogin        // POST /api/auth/google/verify
ApiEndpoints.logout             // POST /api/auth/logout

// Perfil de Usuario
ApiEndpoints.me                 // GET /api/auth/me
ApiEndpoints.updateProfile      // PUT /api/auth/me

// Tokens
ApiEndpoints.refreshToken       // POST /api/auth/refresh

// Email Verification
ApiEndpoints.verifyEmail        // POST /api/auth/verify-email
ApiEndpoints.sendVerificationCode // POST /api/auth/resend-verification

// Password Recovery
ApiEndpoints.forgotPassword     // POST /api/auth/forgot-password
ApiEndpoints.resetPassword      // POST /api/auth/reset-password
```

**Funciones:**
- ✅ Login con email/password
- ✅ Login con Google OAuth
- ✅ Registro de usuarios
- ✅ Verificación de email
- ✅ Recuperación de contraseña
- ✅ 2FA (TOTP)
- ✅ Gestión de sesiones
- ✅ Refresh tokens

---

### **2. Chat Service** ✅
**Puerto:** 3010
**Ruta Nginx:** `/api/chat`
**Endpoints Flutter:**

```dart
// Mensajes
ApiEndpoints.chatMessage        // POST /api/chat/message
ApiEndpoints.chatSessions       // GET /api/chat/sessions
ApiEndpoints.chatSessionById(id) // GET /api/chat/sessions/:id
ApiEndpoints.chatHistory(userId) // GET /api/chat/history/:userId
```

**Funciones:**
- ✅ Enviar mensajes de consulta legal
- ✅ Recibir respuestas procesadas con NLP + RAG
- ✅ Historial de conversaciones
- ✅ Sesiones de chat
- ✅ Integración con clustering automático de usuarios

**Rate Limit:** 20 mensajes/minuto

---

### **3. NLP Service** ✅
**Puerto:** 3004
**Ruta Nginx:** `/api/nlp`
**Endpoints Flutter:**

```dart
// Procesamiento de lenguaje
ApiEndpoints.nlp                // GET /api/nlp
ApiEndpoints.nlpAnalyze         // POST /api/nlp/analyze
ApiEndpoints.nlpClassify        // POST /api/nlp/classify
```

**Funciones:**
- ✅ Análisis de texto legal
- ✅ Clasificación de consultas
- ✅ Extracción de entidades
- ✅ Procesamiento de lenguaje natural

---

### **4. RAG Service** ✅
**Puerto:** 3009
**Ruta Nginx:** `/api/rag`
**Endpoints Flutter:**

```dart
// Retrieval-Augmented Generation
ApiEndpoints.rag                // GET /api/rag
ApiEndpoints.ragQuery           // POST /api/rag/query
ApiEndpoints.ragIngest          // POST /api/rag/ingest
ApiEndpoints.ragDocuments       // GET /api/rag/documents
```

**Funciones:**
- ✅ Búsqueda semántica en documentos legales
- ✅ Generación de respuestas basadas en contexto
- ✅ Embeddings de documentos
- ✅ Similarity search

**Timeout:** 60 segundos (procesamiento de embeddings)

---

### **5. Geo-Assistance Service** ✅
**Puerto:** 3006
**Ruta Nginx:** `/api/geo`
**Endpoints Flutter:**

```dart
// Geolocalización
ApiEndpoints.geo                    // GET /api/geo
ApiEndpoints.geoAdvisory            // GET /api/geo/advisory
ApiEndpoints.geoNearby              // GET /api/geo/nearby
ApiEndpoints.geoLocations           // GET /api/geo/locations
ApiEndpoints.geoLocationById(id)    // GET /api/geo/locations/:id
ApiEndpoints.geoLocationsByCity(city) // GET /api/geo/locations?city=...
ApiEndpoints.geoLocationsByType(type) // GET /api/geo/locations?type=...
```

**Funciones:**
- ✅ Encontrar ubicaciones legales cercanas
- ✅ Asesoría legal por ubicación
- ✅ Búsqueda por ciudad
- ✅ Búsqueda por tipo (abogado, tribunal, etc.)

---

### **6. Transactions Service** ✅
**Puerto:** 3005
**Ruta Nginx:** `/api/transactions`
**Endpoints Flutter:**

```dart
// Pagos y Suscripciones
ApiEndpoints.transactions               // GET /api/transactions
ApiEndpoints.createCheckout             // POST /api/transactions/create-checkout
ApiEndpoints.userTransactions(userId)   // GET /api/transactions/user/:userId
ApiEndpoints.transactionById(id)        // GET /api/transactions/:id
ApiEndpoints.stripeWebhook              // POST /api/transactions/webhook/stripe
```

**Funciones:**
- ✅ Crear checkout sessions (Stripe)
- ✅ Historial de transacciones
- ✅ Webhooks de Stripe
- ✅ Gestión de suscripciones

**Nota:** Requiere configurar `STRIPE_SECRET_KEY` en docker-compose.yml

---

### **7. OLAP Cube Service** ✅
**Puerto:** 3001
**Ruta Nginx:** `/api/olap`
**Endpoints Flutter:**

```dart
// Analytics
ApiEndpoints.olap               // GET /api/olap
ApiEndpoints.olapQuery          // POST /api/olap/query
ApiEndpoints.olapReport         // GET /api/olap/report
```

**Funciones:**
- ✅ Análisis multidimensional
- ✅ Reportes de uso
- ✅ Estadísticas de consultas
- ✅ Dashboards analíticos

---

### **8. Clustering Service** ✅
**Puerto:** 3002
**Ruta Nginx:** `/api/clustering`
**Endpoints Flutter:**

```dart
// Machine Learning
ApiEndpoints.clustering         // GET /api/clustering
ApiEndpoints.clusteringAnalyze  // POST /api/clustering/analyze
ApiEndpoints.clusteringGroups   // GET /api/clustering/groups
```

**Funciones:**
- ✅ Agrupación automática de usuarios
- ✅ Análisis de patrones
- ✅ Segmentación de consultas
- ✅ Recomendaciones personalizadas

---

## 🔒 Rate Limiting (Protección)

Nginx implementa rate limiting para prevenir abusos:

| Endpoint | Límite | Burst |
|----------|--------|-------|
| **Login** | 5 req/min | 2 |
| **Register** | 3 req/min | 1 |
| **Forgot Password** | 3 req/min | 1 |
| **Chat Message** | 20 msg/min | 5 |
| **General** | 10 req/s | 20 |
| **Stripe Webhook** | Sin límite | - |

---

## 📡 CORS Configurado

Nginx permite todas las peticiones CORS para desarrollo:

```nginx
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: DNT, User-Agent, X-Requested-With,
                              If-Modified-Since, Cache-Control,
                              Content-Type, Range, Authorization
```

---

## 🧪 Cómo Probar Cada Microservicio

### **Desde la App Flutter:**

```dart
// 1. Auth Service
final response = await apiClient.post(
  ApiEndpoints.login,
  body: {'email': 'test@example.com', 'password': 'Test123!'},
);

// 2. Chat Service
final response = await apiClient.post(
  ApiEndpoints.chatMessage,
  body: {'message': '¿Qué hacer si me multan?'},
  requiresAuth: true,
);

// 3. Geo Service
final response = await apiClient.get(
  ApiEndpoints.geoNearby + '?lat=-33.45&lng=-70.65&radius=5000',
  requiresAuth: true,
);

// 4. Transactions Service
final response = await apiClient.post(
  ApiEndpoints.createCheckout,
  body: {'plan': 'pro_monthly'},
  requiresAuth: true,
);
```

### **Desde curl (para debugging):**

```bash
# Health check del API Gateway
curl http://localhost/health

# Login
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Chat (requiere token)
curl -X POST http://localhost/api/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message":"¿Qué hacer si me multan?"}'

# Geo nearby
curl http://localhost/api/geo/nearby?lat=-33.45&lng=-70.65&radius=5000

# Crear checkout
curl -X POST http://localhost/api/transactions/create-checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"plan":"pro_monthly"}'
```

---

## 🔑 Autenticación en Requests

Todos los endpoints (excepto auth públicos) requieren JWT token:

```dart
// El ApiClient automáticamente agrega el header
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Configurado en:
```dart
// lib/core/network/api_client.dart
headers['Authorization'] = 'Bearer $token';
```

---

## 📱 Ejemplo de Flujo Completo

### **Flujo: Usuario hace una consulta legal**

```
1. Usuario hace login
   └─> POST /api/auth/login
   └─> Recibe accessToken + refreshToken

2. Usuario envía mensaje
   └─> POST /api/chat/message
   └─> Chat service procesa:
       ├─> Llama a NLP service (/api/nlp/analyze)
       ├─> Llama a RAG service (/api/rag/query)
       ├─> Llama a Clustering service (/api/clustering/analyze)
       └─> Retorna respuesta procesada

3. Usuario ve ubicaciones cercanas
   └─> GET /api/geo/nearby?lat=X&lng=Y
   └─> Recibe lista de lugares legales

4. Usuario actualiza a plan PRO
   └─> POST /api/transactions/create-checkout
   └─> Stripe crea checkout session
   └─> Usuario completa pago
   └─> Stripe webhook notifica al backend
   └─> Backend actualiza suscripción
```

---

## ✅ Checklist de Conexión

- [x] Auth Service conectado
- [x] Chat Service conectado
- [x] NLP Service conectado
- [x] RAG Service conectado
- [x] Geo-Assistance conectado
- [x] Transactions Service conectado
- [x] OLAP Cube conectado
- [x] Clustering Service conectado
- [x] Nginx configurado como API Gateway
- [x] Rate limiting configurado
- [x] CORS configurado
- [x] Todos los endpoints actualizados en Flutter
- [x] Documentación completa

---

## 🚀 Siguiente Paso

**Ejecutar la app:**

```bash
cd FromIntegrador
flutter run -d chrome
```

**Todos los microservicios ya están listos para usar!**

---

## 🐛 Troubleshooting

### **Error: "Connection refused"**
```bash
# Verificar que todos los servicios estén corriendo
docker-compose ps

# Si alguno está "Exit", reiniciarlo
docker-compose up -d <nombre-servicio>
```

### **Error: "429 Too Many Requests"**
- Estás excediendo el rate limit
- Espera 1 minuto y vuelve a intentar
- Revisa los logs: `docker logs lexia-nginx`

### **Error: "Unauthorized 401"**
- Tu token expiró (15 minutos)
- Llama a `/api/auth/refresh` con el refreshToken
- O haz login nuevamente

### **Ver logs de un microservicio:**
```bash
docker logs lexia-auth          # Auth service
docker logs lexia-chat          # Chat service
docker logs lexia-geo-assistance # Geo service
docker logs lexia-transactions  # Transactions
```

---

**Ahora tienes una arquitectura de microservicios completa y lista para producción!** 🎉