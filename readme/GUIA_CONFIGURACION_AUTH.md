# 📝 Guía de Configuración - Sistema de Autenticación

Esta guía te ayudará a configurar todas las funcionalidades del sistema de autenticación mejorado de LexIA 2.0.

---

## 🔐 JWT (Ya Configurado)

El sistema JWT está **listo para usar** sin configuración adicional. Solo cambia los secrets en producción.

### Variables en `docker-compose.yml`:

```yaml
JWT_ACCESS_SECRET: lexia_jwt_access_secret_2024_change_in_production
JWT_REFRESH_SECRET: lexia_jwt_refresh_secret_2024_change_in_production
JWT_ACCESS_EXPIRES: 15m   # Access token dura 15 minutos
JWT_REFRESH_EXPIRES: 7d   # Refresh token dura 7 días
```

### ⚠️ En Producción:

Genera secrets seguros:

```bash
# Linux/Mac
openssl rand -base64 32

# Windows (PowerShell)
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

---

## 📧 Configurar Verificación de Email

Para habilitar la verificación de email y recuperación de contraseñas, necesitas configurar un servidor SMTP.

### Opción 1: Gmail (Recomendado para desarrollo)

1. **Habilitar "Contraseñas de aplicación" en Gmail**:
   - Ve a https://myaccount.google.com/security
   - Activa "Verificación en 2 pasos"
   - Ve a https://myaccount.google.com/apppasswords
   - Genera una contraseña de aplicación

2. **Configurar en `docker-compose.yml`**:

```yaml
SMTP_HOST: smtp.gmail.com
SMTP_PORT: 587
SMTP_SECURE: "false"
SMTP_USER: tu-email@gmail.com
SMTP_PASSWORD: tu-contraseña-de-aplicación
```

### Opción 2: SendGrid (Recomendado para producción)

1. Crea una cuenta en https://sendgrid.com
2. Genera una API Key
3. Configura:

```yaml
SMTP_HOST: smtp.sendgrid.net
SMTP_PORT: 587
SMTP_SECURE: "false"
SMTP_USER: apikey
SMTP_PASSWORD: tu-api-key-de-sendgrid
```

### Opción 3: Mailgun

```yaml
SMTP_HOST: smtp.mailgun.org
SMTP_PORT: 587
SMTP_SECURE: "false"
SMTP_USER: postmaster@tu-dominio.mailgun.org
SMTP_PASSWORD: tu-password-mailgun
```

### Opción 4: Mailtrap (Solo para testing)

```yaml
SMTP_HOST: smtp.mailtrap.io
SMTP_PORT: 2525
SMTP_SECURE: "false"
SMTP_USER: tu-username-mailtrap
SMTP_PASSWORD: tu-password-mailtrap
```

### ✅ Verificar Configuración de Email

Después de levantar el sistema:

```bash
# Registrar un usuario de prueba
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "nombre": "Usuario",
    "apellido": "Prueba"
  }'

# Si está configurado correctamente, recibirás un email de verificación
```

---

## 🔑 Configurar OAuth2 Google

### Paso 1: Crear Proyecto en Google Cloud Console

1. Ve a https://console.cloud.google.com
2. Crea un nuevo proyecto (o selecciona uno existente)
3. Nombre del proyecto: `LexIA`

### Paso 2: Habilitar Google+ API

1. En el menú lateral, ve a **APIs & Services** > **Library**
2. Busca **Google+ API**
3. Haz clic en **Enable**

### Paso 3: Crear Credenciales OAuth

1. Ve a **APIs & Services** > **Credentials**
2. Haz clic en **Create Credentials** > **OAuth client ID**
3. Tipo de aplicación: **Web application**
4. Nombre: `LexIA Auth`
5. **Authorized JavaScript origins**:
   - `http://localhost`
   - `http://localhost:3000` (si tienes frontend)
   - Tu dominio en producción (ej: `https://lexia.com`)
6. **Authorized redirect URIs**:
   - `http://localhost/api/auth/google/callback`
   - `http://localhost:3000/auth/callback` (si tienes frontend)
   - Tu dominio en producción (ej: `https://lexia.com/api/auth/google/callback`)
7. Haz clic en **Create**

### Paso 4: Copiar Credenciales

Después de crear el OAuth client, verás:
- **Client ID**: algo como `123456789-abc123def456.apps.googleusercontent.com`
- **Client Secret**: algo como `GOCSPX-AbCdEf123456`

### Paso 5: Configurar en `docker-compose.yml`

```yaml
GOOGLE_CLIENT_ID: "123456789-abc123def456.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET: "GOCSPX-AbCdEf123456"
GOOGLE_CALLBACK_URL: "http://localhost/api/auth/google/callback"
```

### Paso 6: Configurar Pantalla de Consentimiento OAuth

1. Ve a **APIs & Services** > **OAuth consent screen**
2. Tipo de usuario: **External** (para testing) o **Internal** (solo para tu organización)
3. Información de la aplicación:
   - Nombre: `LexIA`
   - Email de soporte: tu email
   - Logo: (opcional)
4. Scopes: No necesitas agregar scopes manualmente, el código ya solicita `profile` y `email`
5. Usuarios de prueba (si es External):
   - Agrega los emails que usarás para probar

### ✅ Verificar OAuth2 Google

```bash
# Probar el flujo OAuth
curl http://localhost/api/auth/google

# Te redirigirá a Google para iniciar sesión
# Después de autenticarte, te redirigirá de vuelta con los tokens
```

---

## 🔒 Configurar 2FA (TOTP)

El 2FA está **listo para usar** sin configuración adicional. Los usuarios pueden habilitarlo desde su perfil.

### Probar 2FA:

1. **Setup 2FA**:
```bash
curl -X POST http://localhost/api/auth/2fa/setup \
  -H "Authorization: Bearer TU_ACCESS_TOKEN"
```

Respuesta incluirá:
- `qrCodeUrl`: Escanea con Google Authenticator o Authy
- `backupCodes`: Guárdalos en lugar seguro

2. **Habilitar 2FA** (verificar código):
```bash
curl -X POST http://localhost/api/auth/2fa/enable \
  -H "Authorization: Bearer TU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code": "123456"}'
```

---

## 🌐 Variables de Entorno Completas

### Archivo `.env` (opcional, alternativa a docker-compose.yml)

Crea un archivo `.env` en la raíz del proyecto:

```env
# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=lexia_db
DB_USER=lexia_user
DB_PASSWORD=lexia_password_2024

# JWT
JWT_ACCESS_SECRET=lexia_jwt_access_secret_2024_change_in_production
JWT_REFRESH_SECRET=lexia_jwt_refresh_secret_2024_change_in_production
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# OAuth2 Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost/api/auth/google/callback

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=

# URLs
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=*

# Node
NODE_ENV=production
PORT=3008
```

---

## 🧪 Ejemplos de Uso

### 1. Registro de Usuario

```bash
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@example.com",
    "password": "MiPassword123!",
    "nombre": "Juan",
    "apellido": "Pérez",
    "telefono": "9999999999"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@example.com",
    "password": "MiPassword123!"
  }'
```

Respuesta:
```json
{
  "message": "Login exitoso",
  "user": {...},
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

### 3. Obtener Perfil

```bash
curl http://localhost/api/auth/me \
  -H "Authorization: Bearer TU_ACCESS_TOKEN"
```

### 4. Refrescar Token

```bash
curl -X POST http://localhost/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "TU_REFRESH_TOKEN"
  }'
```

### 5. Recuperación de Contraseña

```bash
# Solicitar reset
curl -X POST http://localhost/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "usuario@example.com"}'

# Resetear con token (del email)
curl -X POST http://localhost/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN_DEL_EMAIL",
    "newPassword": "NuevaPassword123!"
  }'
```

---

## 📊 Endpoints Disponibles

### Públicos (sin autenticación):
- `POST /register` - Registrar usuario
- `POST /login` - Iniciar sesión
- `POST /refresh` - Refrescar access token
- `POST /verify-email` - Verificar email
- `POST /resend-verification` - Reenviar email de verificación
- `POST /forgot-password` - Solicitar recuperación
- `POST /reset-password` - Resetear contraseña
- `GET /google` - Login con Google
- `GET /google/callback` - Callback de Google
- `GET /health` - Health check

### Protegidos (requieren Authorization: Bearer TOKEN):
- `POST /logout` - Cerrar sesión
- `POST /logout-all` - Cerrar todas las sesiones
- `GET /me` - Obtener perfil
- `GET /sessions` - Ver sesiones activas
- `GET /history` - Historial de autenticación
- `GET /linked-accounts` - Cuentas OAuth vinculadas
- `POST /google/unlink` - Desvincular Google
- `POST /2fa/setup` - Configurar 2FA
- `POST /2fa/enable` - Habilitar 2FA
- `POST /2fa/disable` - Deshabilitar 2FA
- `POST /2fa/verify` - Verificar código 2FA
- `POST /2fa/verify-backup` - Usar código de respaldo
- `POST /2fa/regenerate-backup-codes` - Regenerar códigos
- `GET /2fa/status` - Estado de 2FA

---

## 🔒 Seguridad

### Funcionalidades Implementadas:

✅ **JWT con Access + Refresh Tokens**
- Access tokens de corta duración (15 minutos)
- Refresh tokens de larga duración (7 días)
- Rotación automática de refresh tokens

✅ **Rate Limiting** (en Nginx)
- Login: 5 intentos/minuto
- Register: 3 intentos/minuto
- Chat: 20 mensajes/minuto
- General: 10 requests/segundo

✅ **Bloqueo de Cuenta**
- 5 intentos fallidos = bloqueo de 15 minutos

✅ **Logs de Auditoría**
- Todos los eventos de autenticación se registran
- Incluye IP, user agent, timestamps

✅ **2FA con TOTP**
- Compatible con Google Authenticator, Authy, etc.
- Códigos de respaldo para recuperación

✅ **Email Verification**
- Tokens de 24 horas
- Previene cuentas falsas

✅ **Password Recovery**
- Tokens de 1 hora
- Validación de fortaleza de contraseña

✅ **OAuth2 Google**
- Sign up/Login con Google
- Email pre-verificado

---

## ⚠️ IMPORTANTE para Producción

1. **Cambiar JWT Secrets**: Genera secrets únicos y seguros
2. **Configurar HTTPS**: Usa Let's Encrypt o certificados SSL
3. **Email Profesional**: Usa SendGrid o Mailgun (no Gmail)
4. **OAuth Callback**: Actualiza las URLs de callback en Google Cloud
5. **CORS**: Restringe `CORS_ORIGIN` a tu dominio frontend
6. **Variables de Entorno**: Usa secretos en vez de plain text
7. **Base de Datos**: Password seguro de PostgreSQL
8. **Backups**: Configura backups automáticos de la BD
9. **Monitoring**: Implementa logs centralizados

---

## 🎯 Próximos Pasos

1. Configura Email (SMTP)
2. Configura OAuth2 Google (opcional)
3. Levanta el sistema: `docker-compose up -d`
4. Prueba los endpoints
5. Integra con tu frontend

---

## 🐛 Troubleshooting

### Email no se envía

1. Verifica las credenciales SMTP
2. Verifica que el puerto 587 esté abierto
3. Revisa los logs: `docker logs lexia-auth`

### OAuth Google falla

1. Verifica que el Client ID y Secret sean correctos
2. Verifica que las URLs de callback coincidan exactamente
3. Asegúrate de haber habilitado Google+ API
4. Verifica que el email del usuario esté en "Usuarios de prueba" (si es External)

### 2FA no funciona

1. Verifica que el reloj del servidor esté sincronizado
2. Los códigos TOTP expiran cada 30 segundos
3. Usa el código de respaldo si el TOTP no funciona

### Tokens inválidos

1. Verifica que los JWT secrets coincidan
2. Los access tokens expiran en 15 minutos (refresca con refresh token)
3. Los refresh tokens expiran en 7 días

---

¿Necesitas ayuda? Revisa los logs:

```bash
docker logs lexia-auth --tail 100 -f
```