# Sistema de Autenticación Mejorado - LexIA 2.0

## Resumen

Diseño completo del sistema de autenticación con:
- ✅ JWT Authentication
- ✅ OAuth2 Google Sign-In
- ✅ 2FA (Two-Factor Authentication) con TOTP
- ✅ Recuperación de contraseñas
- ✅ Verificación de email
- ✅ Rate limiting en Nginx
- ✅ PostgreSQL como almacenamiento

---

## Arquitectura

```
Cliente (Web/Mobile)
        ↓
  Nginx (Rate Limiting)
        ↓
  Auth Service (:3003)
        ↓
   ┌────┴────┬──────────┬────────────┐
   ↓         ↓          ↓            ↓
PostgreSQL  Redis   Nodemailer  Google OAuth
  (Users)   (2FA)   (Emails)    (Sign-In)
```

---

## 1. Autenticación JWT

### Tokens
```typescript
// Access Token (corta duración)
{
  id: uuid,
  email: string,
  rol_id: number,
  exp: 15min
}

// Refresh Token (larga duración)
{
  id: uuid,
  token_id: uuid,
  exp: 7days
}
```

### Endpoints JWT
```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh-token
POST /api/auth/logout
POST /api/auth/validate-token
```

### Flujo JWT
1. User login → genera access + refresh token
2. Access token expira → usa refresh para obtener nuevo access
3. Refresh token expira → requiere re-login
4. Logout → invalida refresh token en BD

---

## 2. OAuth2 Google Sign-In

### Configuración
```env
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_secret
GOOGLE_REDIRECT_URI=http://localhost/api/auth/google/callback
```

### Endpoints OAuth2
```
GET  /api/auth/google              # Inicia flujo OAuth
GET  /api/auth/google/callback     # Callback de Google
POST /api/auth/google/verify       # Verifica token de Google
```

### Flujo OAuth2
1. Cliente redirige a `/api/auth/google`
2. Google autentica usuario
3. Google redirige a `/callback` con code
4. Backend intercambia code por access token
5. Backend obtiene info del usuario de Google
6. Backend crea/actualiza usuario en BD
7. Backend genera JWT propio
8. Retorna JWT al cliente

### Tabla usuarios
```sql
ALTER TABLE usuarios ADD COLUMN google_id VARCHAR(255) UNIQUE;
ALTER TABLE usuarios ADD COLUMN auth_provider VARCHAR(20) DEFAULT 'local';
ALTER TABLE usuarios ADD COLUMN email_verified BOOLEAN DEFAULT false;
```

---

## 3. 2FA (Two-Factor Authentication)

### Tecnología
- **TOTP** (Time-based One-Time Password)
- Librería: `speakeasy` + `qrcode`
- Almacenamiento: PostgreSQL

### Tabla 2FA
```sql
CREATE TABLE two_factor_auth (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    secret VARCHAR(255) NOT NULL,
    backup_codes TEXT[], -- 10 códigos de respaldo
    enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    enabled_at TIMESTAMP,
    UNIQUE(usuario_id)
);

CREATE INDEX idx_2fa_usuario ON two_factor_auth(usuario_id);
```

### Endpoints 2FA
```
POST /api/auth/2fa/setup          # Genera secret + QR code
POST /api/auth/2fa/verify-setup   # Verifica código y activa 2FA
POST /api/auth/2fa/verify         # Verifica código en login
POST /api/auth/2fa/disable        # Desactiva 2FA
POST /api/auth/2fa/regenerate-backup  # Regenera códigos de respaldo
```

### Flujo 2FA Setup
1. Usuario solicita activar 2FA
2. Backend genera secret con `speakeasy`
3. Backend genera 10 códigos de respaldo
4. Backend genera QR code con secret
5. Usuario escanea QR con Google Authenticator/Authy
6. Usuario ingresa código de verificación
7. Si código es válido, se activa 2FA
8. Se muestran códigos de respaldo (solo una vez)

### Flujo 2FA Login
1. Usuario ingresa email + password
2. Si 2FA está activado, backend responde:
   ```json
   {
     "requires2FA": true,
     "tempToken": "temp_jwt_token"
   }
   ```
3. Cliente solicita código 2FA
4. Usuario ingresa código de Google Authenticator
5. Backend verifica código con `speakeasy.verify()`
6. Si válido, genera access + refresh tokens completos
7. Usuario autenticado

### Códigos de Respaldo
- 10 códigos alfanuméricos de 8 caracteres
- Se muestran solo al activar 2FA o regenerar
- Se invalidan después de usarse
- Permiten login si se pierde el dispositivo 2FA

---

## 4. Recuperación de Contraseñas

### Tabla Password Reset
```sql
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    used_at TIMESTAMP
);

CREATE INDEX idx_reset_token ON password_reset_tokens(token);
CREATE INDEX idx_reset_usuario ON password_reset_tokens(usuario_id);
```

### Endpoints
```
POST /api/auth/forgot-password       # Solicita reset
POST /api/auth/reset-password        # Confirma reset con token
POST /api/auth/validate-reset-token  # Valida si token es válido
```

### Flujo Recuperación
1. Usuario ingresa email en `/forgot-password`
2. Backend verifica que email existe
3. Backend genera token único (UUID + hash)
4. Token expira en 1 hora
5. Backend envía email con link:
   ```
   http://frontend.com/reset-password?token=abc123
   ```
6. Usuario hace click en link
7. Frontend valida token con `/validate-reset-token`
8. Usuario ingresa nueva contraseña
9. Frontend envía a `/reset-password` con token + nueva contraseña
10. Backend valida token no expirado ni usado
11. Backend actualiza contraseña
12. Backend marca token como usado
13. Backend invalida todas las sesiones activas
14. Usuario debe hacer login nuevamente

### Seguridad
- Rate limit: 3 solicitudes por hora por IP
- Token expira en 1 hora
- Token se invalida después de usarse
- Se invalidan todas las sesiones activas
- Email debe existir (no revelar si existe o no)

---

## 5. Verificación de Email

### Tabla Email Verification
```sql
CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    verified_at TIMESTAMP
);

CREATE INDEX idx_verify_token ON email_verification_tokens(token);
CREATE INDEX idx_verify_usuario ON email_verification_tokens(usuario_id);

ALTER TABLE usuarios ADD COLUMN email_verified BOOLEAN DEFAULT false;
ALTER TABLE usuarios ADD COLUMN email_verified_at TIMESTAMP;
```

### Endpoints
```
POST /api/auth/send-verification-email  # Reenviar email
POST /api/auth/verify-email             # Verificar con token
GET  /api/auth/verification-status      # Estado de verificación
```

### Flujo Verificación
1. Al registrarse, usuario recibe email de verificación
2. Email contiene link:
   ```
   http://frontend.com/verify-email?token=xyz789
   ```
3. Usuario hace click en link
4. Frontend llama `/verify-email` con token
5. Backend valida token no expirado
6. Backend marca `email_verified = true`
7. Backend marca token como verificado
8. Usuario puede acceder a todas las funciones

### Restricciones sin verificación
- Puede hacer login
- No puede enviar mensajes al chat
- No puede ver información sensible
- Puede reenviar email de verificación

### Seguridad
- Token expira en 24 horas
- Rate limit: 3 emails por hora por usuario
- Token se invalida después de usarse

---

## 6. Servicio de Email (Nodemailer)

### Configuración
```env
# Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SendGrid (alternativa)
SENDGRID_API_KEY=your_key
EMAIL_FROM=noreply@lexia.com
```

### Templates de Email

#### Verificación de Email
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Verifica tu email - LexIA</title>
</head>
<body>
    <h1>¡Bienvenido a LexIA!</h1>
    <p>Hola {{nombre}},</p>
    <p>Gracias por registrarte. Por favor verifica tu email haciendo click en el siguiente botón:</p>
    <a href="{{verificationLink}}" style="background:#4CAF50;color:white;padding:10px 20px;text-decoration:none;">
        Verificar Email
    </a>
    <p>O copia y pega este link: {{verificationLink}}</p>
    <p>Este link expira en 24 horas.</p>
    <p>Si no creaste esta cuenta, ignora este email.</p>
</body>
</html>
```

#### Recuperación de Contraseña
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Recuperar contraseña - LexIA</title>
</head>
<body>
    <h1>Recuperación de Contraseña</h1>
    <p>Hola {{nombre}},</p>
    <p>Recibimos una solicitud para restablecer tu contraseña.</p>
    <a href="{{resetLink}}" style="background:#2196F3;color:white;padding:10px 20px;text-decoration:none;">
        Restablecer Contraseña
    </a>
    <p>O copia y pega este link: {{resetLink}}</p>
    <p>Este link expira en 1 hora.</p>
    <p>Si no solicitaste esto, ignora este email y tu contraseña permanecerá sin cambios.</p>
</body>
</html>
```

#### 2FA Activado
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>2FA Activado - LexIA</title>
</head>
<body>
    <h1>Autenticación de Dos Factores Activada</h1>
    <p>Hola {{nombre}},</p>
    <p>La autenticación de dos factores ha sido activada en tu cuenta.</p>
    <p>A partir de ahora, necesitarás un código de verificación al iniciar sesión.</p>
    <p>Tus códigos de respaldo son:</p>
    <pre>{{backupCodes}}</pre>
    <p><strong>Guarda estos códigos en un lugar seguro. No los volverás a ver.</strong></p>
    <p>Si no fuiste tú quien activó esto, contacta soporte inmediatamente.</p>
</body>
</html>
```

---

## 7. Implementación por Fases

### Fase 1: JWT + PostgreSQL ✅
- [x] Migrar auth de memoria a PostgreSQL
- [x] Implementar JWT con access + refresh tokens
- [x] Endpoints: login, register, refresh, logout
- [x] Middleware de autenticación
- [x] Rate limiting en Nginx

### Fase 2: Verificación de Email 📧
- [ ] Tabla email_verification_tokens
- [ ] Configurar Nodemailer
- [ ] Templates de email
- [ ] Endpoints de verificación
- [ ] Restricciones sin verificación

### Fase 3: Recuperación de Contraseñas 🔐
- [ ] Tabla password_reset_tokens
- [ ] Endpoints de reset
- [ ] Template de email
- [ ] Validación de tokens
- [ ] Invalidación de sesiones

### Fase 4: OAuth2 Google 🔵
- [ ] Configurar Google Cloud Console
- [ ] Implementar flujo OAuth
- [ ] Callback handling
- [ ] Vincular/crear usuario
- [ ] Login con Google button

### Fase 5: 2FA con TOTP 🔐
- [ ] Tabla two_factor_auth
- [ ] Implementar speakeasy
- [ ] Generar QR codes
- [ ] Códigos de respaldo
- [ ] Flujo de login con 2FA

---

## 8. Dependencias Necesarias

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "pg": "^8.11.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "uuid": "^9.0.0",

    // OAuth2 Google
    "passport": "^0.6.0",
    "passport-google-oauth20": "^2.0.0",
    "google-auth-library": "^9.0.0",

    // 2FA
    "speakeasy": "^2.0.0",
    "qrcode": "^1.5.3",

    // Email
    "nodemailer": "^6.9.7",
    "@sendgrid/mail": "^7.7.0",
    "handlebars": "^4.7.8"
  },
  "devDependencies": {
    "@types/express": "^4.17.20",
    "@types/cors": "^2.8.15",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/uuid": "^9.0.7",
    "@types/passport": "^1.0.16",
    "@types/passport-google-oauth20": "^2.0.14",
    "@types/speakeasy": "^2.0.10",
    "@types/qrcode": "^1.5.5",
    "@types/nodemailer": "^6.4.14",
    "typescript": "^5.2.2"
  }
}
```

---

## 9. Variables de Entorno

```env
# Server
PORT=3003

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=lexia_db
DB_USER=postgres
DB_PASSWORD=lexia_password_2024

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost/api/auth/google/callback

# Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=LexIA <noreply@lexia.com>

# Frontend URLs
FRONTEND_URL=http://localhost:3000
EMAIL_VERIFICATION_URL=http://localhost:3000/verify-email
PASSWORD_RESET_URL=http://localhost:3000/reset-password

# Security
BCRYPT_ROUNDS=10
PASSWORD_MIN_LENGTH=8
TOKEN_EXPIRATION_HOURS=1
VERIFICATION_TOKEN_EXPIRATION_HOURS=24
```

---

## 10. Migraciones SQL

### 005_auth_enhancements.sql
```sql
-- Refresh Tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMP
);

CREATE INDEX idx_refresh_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_usuario ON refresh_tokens(usuario_id);

-- Email Verification
CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    verified_at TIMESTAMP
);

CREATE INDEX idx_verify_token ON email_verification_tokens(token);
CREATE INDEX idx_verify_usuario ON email_verification_tokens(usuario_id);

-- Password Reset
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    used_at TIMESTAMP
);

CREATE INDEX idx_reset_token ON password_reset_tokens(token);
CREATE INDEX idx_reset_usuario ON password_reset_tokens(usuario_id);

-- Two Factor Auth
CREATE TABLE two_factor_auth (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    secret VARCHAR(255) NOT NULL,
    backup_codes TEXT[],
    enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    enabled_at TIMESTAMP,
    UNIQUE(usuario_id)
);

CREATE INDEX idx_2fa_usuario ON two_factor_auth(usuario_id);

-- Actualizar tabla usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'local';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;

CREATE INDEX idx_usuarios_google ON usuarios(google_id);
CREATE INDEX idx_usuarios_provider ON usuarios(auth_provider);
```

---

## 11. Seguridad

### Rate Limiting (Nginx)
- Login: 5 intentos/minuto
- Register: 3 registros/minuto
- Forgot Password: 3 solicitudes/hora
- Verify Email: 3 emails/hora
- 2FA Setup: 5 intentos/hora

### Protección contra Ataques
- **Fuerza Bruta**: Rate limiting + bloqueo temporal (5 intentos fallidos = 15 min bloqueado)
- **SQL Injection**: Prepared statements con pg
- **XSS**: Sanitización de inputs
- **CSRF**: CORS configurado
- **Session Hijacking**: Tokens expiran, refresh token rotation

### Buenas Prácticas
- Contraseñas hasheadas con bcrypt (10 rounds)
- JWT con expiración corta (15min)
- HTTPS en producción
- Secrets en variables de entorno
- Logs de auditoría
- Validación de inputs

---

## 12. Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### Endpoints a Testear
- [ ] POST /api/auth/register
- [ ] POST /api/auth/login
- [ ] POST /api/auth/refresh-token
- [ ] POST /api/auth/logout
- [ ] POST /api/auth/forgot-password
- [ ] POST /api/auth/reset-password
- [ ] POST /api/auth/send-verification-email
- [ ] POST /api/auth/verify-email
- [ ] GET  /api/auth/google
- [ ] POST /api/auth/2fa/setup
- [ ] POST /api/auth/2fa/verify

---

**Última actualización**: 2025-11-26
**Estado**: En diseño
**Prioridad**: Alta
