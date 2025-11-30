# Guía Completa: Configurar Gmail SMTP para Emails

Esta guía te muestra **paso a paso con capturas** cómo configurar Gmail para enviar emails desde LexIA 2.0.

Los emails se usan para:
- ✉️ Verificación de cuenta (email de bienvenida)
- 🔑 Recuperación de contraseña
- 🔒 Notificación de 2FA habilitado
- 🚨 Alertas de login sospechoso

---

## 📋 Requisitos Previos

- ✅ Tener una cuenta de Gmail (puede ser personal o crear una específica para la app)
- ✅ Acceso a la configuración de seguridad de Google

---

## 🔐 OPCIÓN 1: Gmail con Contraseña de Aplicación (RECOMENDADO)

Esta es la forma más segura y recomendada por Google.

### **Paso 1: Activar Verificación en 2 Pasos**

**¿Por qué?** Google solo permite contraseñas de aplicación si tienes 2FA activado.

1. **Ir a tu cuenta de Google:**
   ```
   https://myaccount.google.com/security
   ```

2. **Buscar "Verificación en 2 pasos"**
   - En la sección "Cómo accedes a Google"
   - Click en "Verificación en 2 pasos"

3. **Si NO está activada:**
   - Click en "Comenzar"
   - Sigue los pasos:
     1. Confirma tu número de teléfono
     2. Elige cómo recibir códigos (SMS o llamada)
     3. Ingresa el código que recibiste
     4. Click "Activar"

4. **Si YA está activada:**
   - ✅ Listo, continúa al siguiente paso

---

### **Paso 2: Generar Contraseña de Aplicación**

1. **Ir a Contraseñas de Aplicación:**
   ```
   https://myaccount.google.com/apppasswords
   ```

   O manualmente:
   - Cuenta de Google → Seguridad
   - Scroll hasta "Cómo accedes a Google"
   - Click en "Contraseñas de aplicación"

2. **Si te pide iniciar sesión nuevamente:**
   - Ingresa tu contraseña de Gmail
   - Continúa

3. **Seleccionar la app y dispositivo:**

   **App:** Selecciona "Correo" (Mail)

   **Dispositivo:** Selecciona tu tipo de dispositivo:
   - Windows Computer
   - Mac
   - Otro (personalizado)

   O puedes usar **"Otro (nombre personalizado)"** y escribir: `LexIA Backend`

4. **Click en "Generar"**

5. **Copiar la contraseña:**

   Google te mostrará una contraseña de 16 caracteres como:
   ```
   abcd efgh ijkl mnop
   ```

   **¡CÓPIALA AHORA! No la podrás ver de nuevo.**

   > **Nota:** Los espacios son opcionales, puedes escribirla con o sin espacios.

6. **Click en "Listo"**

---

### **Paso 3: Configurar en docker-compose.yml**

1. **Abrir:** [docker-compose.yml](docker-compose.yml)

2. **Ir a las líneas 53-58** (servicio `auth`)

3. **Reemplazar con tu información:**

```yaml
# Email (SMTP - configurar para producción)
SMTP_HOST: smtp.gmail.com
SMTP_PORT: 587
SMTP_SECURE: "false"
SMTP_USER: "tu-email@gmail.com"              # ← TU EMAIL
SMTP_PASSWORD: "abcd efgh ijkl mnop"          # ← LA CONTRASEÑA DE APLICACIÓN
```

**Ejemplo real:**
```yaml
SMTP_USER: "lexia.asistente@gmail.com"
SMTP_PASSWORD: "xmtp qwer tyui asdf"
```

> **Importante:** La contraseña puede tener espacios o no, ambos funcionan:
> - ✅ `"abcd efgh ijkl mnop"`
> - ✅ `"abcdefghijklmnop"`

---

### **Paso 4: Configurar Frontend URL**

Esta URL se usa en los emails para los links de verificación y recuperación.

**Línea 61 del docker-compose.yml:**

```yaml
# Frontend URL (para emails y redirects)
FRONTEND_URL: http://localhost:3000
```

**En desarrollo:**
```yaml
FRONTEND_URL: http://localhost:3000
```

**En producción:**
```yaml
FRONTEND_URL: https://tu-dominio.com
```

---

### **Paso 5: Reiniciar servicio Auth**

```bash
docker-compose restart auth
```

---

### **Paso 6: Verificar configuración**

```bash
# Ver logs
docker logs lexia-auth

# Deberías ver:
# ✅ Servidor de email listo para enviar mensajes
```

Si ves error:
```
❌ Error en configuración de email: Invalid login
```

Verifica:
1. Email correcto
2. Contraseña de aplicación correcta (sin espacios extra)
3. 2FA activado en Google

---

### **Paso 7: Probar enviando un email**

**Registrar un usuario:**
```bash
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Test",
    "apellido": "Usuario",
    "email": "tu-email-personal@gmail.com",
    "password": "Test123456!",
    "rol_id": 1
  }'
```

**Deberías recibir un email** en tu bandeja de entrada con:
- ✅ Asunto: "Verifica tu cuenta - LexIA"
- ✅ Enlace de verificación
- ✅ Remitente: El email que configuraste en SMTP_USER

---

## 📧 OPCIÓN 2: Gmail con "Acceso de Apps Menos Seguras" (NO RECOMENDADO)

⚠️ **Google deshabilitó esta opción el 30 de mayo de 2022.**

Ya **NO funciona** usar tu contraseña normal de Gmail directamente.

**Debes usar Contraseña de Aplicación (Opción 1).**

---

## 🔧 OPCIÓN 3: Usar otros proveedores SMTP

Si no quieres usar Gmail, tienes alternativas:

### **A) Outlook / Hotmail**

```yaml
SMTP_HOST: smtp-mail.outlook.com
SMTP_PORT: 587
SMTP_SECURE: "false"
SMTP_USER: "tu-email@outlook.com"
SMTP_PASSWORD: "tu-contraseña"
```

### **B) SendGrid (para producción - GRATIS hasta 100 emails/día)**

1. **Crear cuenta:** https://sendgrid.com/
2. **Verificar email**
3. **Crear API Key:**
   - Settings → API Keys
   - Create API Key
   - Name: `LexIA Backend`
   - Permissions: Full Access
   - Copy API Key

```yaml
SMTP_HOST: smtp.sendgrid.net
SMTP_PORT: 587
SMTP_SECURE: "false"
SMTP_USER: "apikey"                          # ← Literal "apikey"
SMTP_PASSWORD: "SG.abc123xyz..."             # ← Tu API Key
```

### **C) Mailgun (para producción)**

```yaml
SMTP_HOST: smtp.mailgun.org
SMTP_PORT: 587
SMTP_SECURE: "false"
SMTP_USER: "postmaster@tu-dominio.mailgun.org"
SMTP_PASSWORD: "tu-contraseña-de-mailgun"
```

### **D) Amazon SES (AWS)**

```yaml
SMTP_HOST: email-smtp.us-east-1.amazonaws.com
SMTP_PORT: 587
SMTP_SECURE: "false"
SMTP_USER: "tu-access-key"
SMTP_PASSWORD: "tu-secret-key"
```

---

## 📊 Comparación de Proveedores

| Proveedor | Gratis hasta | Configuración | Reputación |
|-----------|--------------|---------------|------------|
| **Gmail** | ~100-500/día | Fácil | ⭐⭐⭐⭐ |
| **SendGrid** | 100/día | Fácil | ⭐⭐⭐⭐⭐ |
| **Mailgun** | 5,000/mes | Media | ⭐⭐⭐⭐⭐ |
| **Amazon SES** | 62,000/mes* | Compleja | ⭐⭐⭐⭐⭐ |
| **Outlook** | ~100-300/día | Fácil | ⭐⭐⭐ |

*Requiere EC2 de AWS

---

## 🎯 Recomendación según tu caso

### **Para desarrollo/testing:**
✅ **Gmail** (Opción 1)
- Gratis
- Fácil de configurar
- Suficiente para pruebas

### **Para producción (pocos emails):**
✅ **SendGrid Free Tier**
- 100 emails/día gratis
- Excelente reputación (no cae en spam)
- Dashboard con estadísticas

### **Para producción (muchos emails):**
✅ **Mailgun** o **Amazon SES**
- Miles de emails al mes
- Mejor deliverability
- Soporte profesional

---

## 📧 Emails que se enviarán

Con la configuración completa, tu app enviará:

### 1️⃣ **Email de Verificación** (al registrarse)
```
Asunto: Verifica tu cuenta - LexIA
Contenido:
  ¡Bienvenido a LexIA, Juan!
  [Botón: Verificar Email]
  Enlace: http://localhost:3000/verify-email?token=ABC123...
```

### 2️⃣ **Email de Recuperación de Contraseña**
```
Asunto: Recuperación de Contraseña - LexIA
Contenido:
  Hola Juan,
  [Botón: Restablecer Contraseña]
  Enlace: http://localhost:3000/reset-password?token=XYZ789...
```

### 3️⃣ **Email de 2FA Habilitado**
```
Asunto: Autenticación de Dos Factores Activada - LexIA
Contenido:
  La autenticación de dos factores ha sido activada en tu cuenta.
  Asegúrate de guardar tus códigos de respaldo.
```

### 4️⃣ **Alerta de Nuevo Login**
```
Asunto: Nuevo inicio de sesión detectado - LexIA
Contenido:
  Detectamos un nuevo inicio de sesión:
  - IP: 192.168.1.100
  - Dispositivo: Chrome on Windows
  - Fecha: 15/01/2024 10:30 AM
```

---

## 🎨 Personalizar Templates de Email

Los templates están en: [microservices/auth/src/config/email.ts](microservices/auth/src/config/email.ts)

**Ejemplo de cómo personalizarlos:**

```typescript
// Línea 40-63
verification: (token: string, nombre: string) => ({
  subject: 'Verifica tu cuenta - LexIA',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">¡Bienvenido a LexIA, ${nombre}!</h2>
      <p>Gracias por registrarte...</p>
      <!-- Aquí puedes agregar tu logo, colores, etc. -->
    </div>
  `
})
```

---

## ⚠️ Límites de Gmail

Gmail tiene límites para prevenir spam:

| Tipo de cuenta | Límite diario |
|----------------|---------------|
| Gmail gratuito | ~500 emails/día |
| Google Workspace | 2,000 emails/día |

**Si superas el límite:**
- Recibirás error: "Daily user sending quota exceeded"
- Esperar 24 horas
- O usar otro proveedor (SendGrid, Mailgun)

---

## 🔒 Seguridad

### ✅ Buenas prácticas:

1. **Usar contraseña de aplicación** (no tu contraseña normal)
2. **No compartir las credenciales** en Git
3. **Rotar contraseñas** cada 6 meses
4. **Usar email dedicado** para la app (ej: `noreply@lexia.com`)
5. **En producción:** Usar proveedor profesional (SendGrid, Mailgun)

### ❌ NO hacer:

1. ❌ Usar tu email personal principal
2. ❌ Compartir la contraseña de aplicación
3. ❌ Dejar credenciales en el código
4. ❌ Usar "Acceso de apps menos seguras" (ya no funciona)

---

## 🆘 Problemas Comunes

### Error: "Invalid login: 535-5.7.8 Username and Password not accepted"

**Causa:** Contraseña incorrecta o no es contraseña de aplicación.

**Solución:**
1. Verificar que usas **contraseña de aplicación** (no tu contraseña normal)
2. Generar nueva contraseña de aplicación
3. Copiarla exactamente (con o sin espacios)
4. Reiniciar servicio: `docker-compose restart auth`

---

### Error: "Missing credentials"

**Causa:** SMTP_USER o SMTP_PASSWORD vacíos.

**Solución:**
1. Verificar que las variables estén entre comillas en docker-compose.yml
2. No dejar espacios al inicio/final
3. Reiniciar: `docker-compose restart auth`

---

### Los emails llegan a SPAM

**Causa:** Gmail personal tiene baja reputación como remitente.

**Soluciones:**
1. **Para desarrollo:** Está bien, revisa la carpeta de spam
2. **Para producción:** Usar SendGrid, Mailgun o Amazon SES
3. Configurar registros SPF, DKIM y DMARC en tu dominio
4. Usar dominio personalizado (ej: noreply@lexia.com)

---

### Error: "Connection timeout"

**Causa:** Puerto bloqueado por firewall.

**Solución:**
1. Verificar que el puerto 587 esté abierto
2. O cambiar a puerto 465 con SMTP_SECURE: "true"

```yaml
SMTP_PORT: 465
SMTP_SECURE: "true"
```

---

## ✅ Checklist Final

- [ ] Cuenta de Gmail lista
- [ ] Verificación en 2 pasos activada en Google
- [ ] Contraseña de aplicación generada
- [ ] Contraseña copiada (sin perderla)
- [ ] docker-compose.yml editado con credenciales
- [ ] FRONTEND_URL configurada
- [ ] Servicio auth reiniciado
- [ ] Logs verificados: `docker logs lexia-auth`
- [ ] Email de prueba enviado exitosamente ✅

---

## 🚀 Siguiente Paso

Una vez configurado el SMTP, puedes probar:

1. **Registro de usuario** → Recibirás email de verificación
2. **Olvidé mi contraseña** → Recibirás email de recuperación
3. **Habilitar 2FA** → Recibirás email de confirmación

**Ver guía completa de integración:**
- [FRONTEND_INTEGRATION_GUIDE.md](FRONTEND_INTEGRATION_GUIDE.md)

---

**¿Necesitas ayuda?**
- Problemas con Gmail
- Configurar otro proveedor
- Personalizar templates de email
- Configurar dominio personalizado