# 💳 Microservicio de Transacciones - LexIA

Microservicio para gestionar pagos con Stripe y actualizaciones de suscripciones.

## 🎯 Funcionalidades

- ✅ Crear sesiones de checkout de Stripe
- ✅ Procesar webhooks de Stripe
- ✅ Actualizar suscripciones automáticamente después del pago
- ✅ Historial de transacciones por usuario
- ✅ Soporte para planes mensuales y anuales
- ✅ Reembolsos y cancelaciones

## 📊 Endpoints Principales

### Crear Checkout
```http
POST /transactions/create-checkout
Content-Type: application/json

{
  "usuario_id": "uuid-del-usuario",
  "plan": "pro_monthly"  // o "pro_yearly"
}
```

**Respuesta:**
```json
{
  "transaccion_id": "uuid",
  "checkout_url": "https://checkout.stripe.com/...",
  "session_id": "cs_...",
  "expires_at": "2025-11-07T00:00:00"
}
```

### Webhook de Stripe
```http
POST /transactions/webhook/stripe
Stripe-Signature: <firma>

{ ... evento de Stripe ... }
```

### Historial de Transacciones
```http
GET /transactions/user/{usuario_id}?skip=0&limit=100
```

## 🔑 Configuración

### Variables de Entorno Requeridas

```env
# Stripe (GRATIS modo test)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Base de Datos
DATABASE_URL=postgresql+asyncpg://...

# Servicios
USUARIOS_SERVICE_URL=http://usuarios:8000
FRONTEND_URL=http://localhost:3000
```

### Obtener Credenciales de Stripe

1. Crear cuenta en https://dashboard.stripe.com/register
2. Modo test (GRATIS ilimitado)
3. Developers → API Keys
4. Copiar Secret Key y Publishable Key
5. Webhooks → Add endpoint
6. URL: `https://tu-dominio.com/transactions/webhook/stripe`
7. Eventos: `checkout.session.completed`, `payment_intent.succeeded`
8. Copiar Webhook Secret

## 🚀 Ejecución

### Con Docker
```bash
docker compose up transacciones
```

### Local
```bash
cd microservicio_transacciones
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8002
```

## 📝 Flujo de Pago

```
1. Usuario FREE → Botón "Upgrade a PRO"
2. App → POST /transactions/create-checkout
3. Backend → Crea transacción (pendiente)
4. Backend → Crea sesión Stripe
5. Backend → Retorna checkout_url
6. App → Redirige a checkout_url
7. Usuario → Completa pago en Stripe
8. Stripe → POST /webhook/stripe (checkout.session.completed)
9. Backend → Actualiza transacción (completado)
10. Backend → Llama a /users/{id}/upgrade
11. Usuario → Ahora es PRO ✅
```

## 💰 Planes Disponibles

| Plan | Precio | Stripe Price ID |
|------|--------|----------------|
| Pro Monthly | $9.99/mes | `price_...` (crear en Stripe) |
| Pro Yearly | $99.99/año | `price_...` (crear en Stripe) |

## 🔒 Seguridad

- ✅ Verificación de firma de webhooks
- ✅ Validación de eventos de Stripe
- ✅ IDs de transacción únicos (UUID)
- ✅ Actualización de suscripción SOLO después de pago confirmado

## 📚 Documentación

- Swagger UI: http://localhost:8002/docs
- ReDoc: http://localhost:8002/redoc
