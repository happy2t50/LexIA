# Guía Completa: Configurar Google OAuth2 para LexIA 2.0

Esta guía te muestra **paso a paso** cómo configurar Google OAuth2 para que los usuarios puedan hacer login con su cuenta de Google.

Tienes **2 opciones**:
1. **Google Cloud Console** (Recomendado para apps web)
2. **Firebase Authentication** (Más fácil, incluye más proveedores)

---

## 🎯 OPCIÓN 1: Google Cloud Console (OAuth2 Directo)

### **Paso 1: Crear Proyecto en Google Cloud**

1. **Ir a Google Cloud Console:**
   - https://console.cloud.google.com/

2. **Crear nuevo proyecto:**
   - Click en el selector de proyectos (arriba a la izquierda, al lado del logo de Google Cloud)
   - Click en "Nuevo Proyecto" (NEW PROJECT)
   - **Nombre del proyecto:** `LexIA` o `LexIA-Auth`
   - **Organización:** Dejar en "Sin organización" (o tu organización si tienes)
   - Click "CREAR" (CREATE)

3. **Esperar a que se cree el proyecto** (tarda ~10 segundos)

4. **Seleccionar el proyecto recién creado**

---

### **Paso 2: Configurar Pantalla de Consentimiento OAuth**

1. **Ir a OAuth consent screen:**
   - Menú hamburguesa (☰) → "APIs & Services" → "OAuth consent screen"
   - O directo: https://console.cloud.google.com/apis/credentials/consent

2. **Seleccionar tipo de usuario:**
   - **Externo** (External): Para que cualquier usuario con cuenta de Google pueda hacer login
   - Click "CREAR" (CREATE)

3. **Configurar información de la app:**

   **Paso 1 - Información de la aplicación:**
   - **Nombre de la aplicación:** `LexIA`
   - **Correo electrónico de asistencia del usuario:** Tu email (ej: `tu-email@gmail.com`)
   - **Logo de la aplicación:** (Opcional) Puedes subir tu logo después

   **Dominios autorizados:** (dejar vacío por ahora)

   **Información de contacto del desarrollador:**
   - **Correos electrónicos:** Tu email (ej: `tu-email@gmail.com`)

   - Click "GUARDAR Y CONTINUAR" (SAVE AND CONTINUE)

   **Paso 2 - Scopes (Permisos):**
   - Click "ADD OR REMOVE SCOPES"
   - Seleccionar los siguientes scopes:
     - ✅ `.../auth/userinfo.email` - Ver tu dirección de correo electrónico
     - ✅ `.../auth/userinfo.profile` - Ver tu información personal
     - ✅ `openid` - Asociar tu cuenta con Google
   - Click "UPDATE"
   - Click "GUARDAR Y CONTINUAR"

   **Paso 3 - Test users (solo para modo Testing):**
   - Click "ADD USERS"
   - Agregar emails de prueba (tu email personal para probar)
   - Click "ADD"
   - Click "GUARDAR Y CONTINUAR"

   **Paso 4 - Resumen:**
   - Revisar configuración
   - Click "VOLVER AL PANEL" (BACK TO DASHBOARD)

---

### **Paso 3: Crear Credenciales OAuth 2.0**

1. **Ir a Credentials:**
   - Menú hamburguesa (☰) → "APIs & Services" → "Credentials"
   - O directo: https://console.cloud.google.com/apis/credentials

2. **Crear credenciales:**
   - Click en "CREATE CREDENTIALS" (arriba)
   - Seleccionar "OAuth client ID"

3. **Configurar el cliente OAuth:**

   **Application type (Tipo de aplicación):**
   - Seleccionar: **Web application**

   **Name (Nombre):**
   - `LexIA Auth` o `LexIA Web Client`

   **Authorized JavaScript origins (Orígenes autorizados):**
   ```
   http://localhost
   http://localhost:3000
   ```

   **Authorized redirect URIs (URIs de redirección autorizadas):**
   ```
   http://localhost/api/auth/google/callback
   http://localhost:3000/auth/callback
   ```

   > **Nota:** Más adelante agregarás tu dominio de producción (ej: `https://lexia.com`)

   - Click "CREATE"

4. **Copiar credenciales:**

   Se mostrará un modal con:
   - ✅ **Client ID:** `123456789-abcdefghijklmnop.apps.googleusercontent.com`
   - ✅ **Client Secret:** `GOCSPX-abcd1234efgh5678`

   **¡GUÁRDALOS EN UN LUGAR SEGURO!**

---

### **Paso 4: Configurar en docker-compose.yml**

1. **Abrir archivo:** [docker-compose.yml](docker-compose.yml)

2. **Ir a las líneas 48-51** (servicio `auth`)

3. **Reemplazar con tus credenciales:**

```yaml
# OAuth2 Google (configurar con tus credenciales)
GOOGLE_CLIENT_ID: "TU_CLIENT_ID_AQUI.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET: "TU_CLIENT_SECRET_AQUI"
GOOGLE_CALLBACK_URL: http://localhost/api/auth/google/callback
```

**Ejemplo:**
```yaml
GOOGLE_CLIENT_ID: "123456789-abc123def456.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET: "GOCSPX-xYz9876WvU5432"
GOOGLE_CALLBACK_URL: http://localhost/api/auth/google/callback
```

---

### **Paso 5: Reiniciar servicio Auth**

```bash
docker-compose restart auth
```

---

### **Paso 6: Verificar configuración**

```bash
# Ver logs del servicio
docker logs lexia-auth

# Deberías ver:
# ✅ OAuth2 Google
```

---

### **Paso 7: Probar Login con Google**

**En tu navegador, ir a:**
```
http://localhost/api/auth/google
```

Deberías ver:
1. Pantalla de consentimiento de Google
2. Selección de cuenta
3. Permisos solicitados
4. Redirección a tu app con tokens

---

## 🔥 OPCIÓN 2: Firebase Authentication (MÁS FÁCIL)

Firebase incluye Google, Facebook, Twitter, GitHub, etc. en un solo lugar.

### **Paso 1: Crear Proyecto en Firebase**

1. **Ir a Firebase Console:**
   - https://console.firebase.google.com/

2. **Crear proyecto:**
   - Click "Agregar proyecto" (Add project)
   - **Nombre:** `LexIA`
   - Click "Continuar"

3. **Google Analytics:** (Opcional)
   - Puedes deshabilitarlo para ir más rápido
   - Click "Crear proyecto"

4. **Esperar a que se cree** (~30 segundos)

5. **Click "Continuar"**

---

### **Paso 2: Habilitar Authentication**

1. **En el panel lateral izquierdo:**
   - Click en "Authentication" (🔐)
   - Click "Comenzar" (Get started)

2. **Habilitar Google Sign-In:**
   - En la pestaña "Sign-in method"
   - Click en "Google"
   - **Habilitar:** Toggle ON
   - **Nombre público del proyecto:** `LexIA`
   - **Correo de asistencia:** Tu email
   - Click "Guardar"

3. **Copiar credenciales:**
   - Firebase te muestra automáticamente:
     - ✅ **Web client ID**
     - ✅ **Web client secret**

   **¡GUÁRDALOS!**

---

### **Paso 3: Configurar dominio autorizado**

1. **En Firebase Console:**
   - Authentication → Settings (⚙️)
   - Pestaña "Authorized domains"

2. **Agregar dominios:**
   - `localhost` (ya debería estar)
   - Click "Agregar dominio" para agregar tu dominio de producción después

---

### **Paso 4: Obtener config de Firebase**

1. **Ir a configuración del proyecto:**
   - Click en ⚙️ (al lado de "Project Overview")
   - "Configuración del proyecto" (Project settings)

2. **Scroll down hasta "Tus apps"**
   - Click en el ícono de `</>` (Web)

3. **Registrar app:**
   - **Sobrenombre de la app:** `LexIA Web`
   - No marcar "También configurar Firebase Hosting"
   - Click "Registrar app"

4. **Copiar configuración:**

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAbc123...",
  authDomain: "lexia-xxxxx.firebaseapp.com",
  projectId: "lexia-xxxxx",
  storageBucket: "lexia-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123..."
};
```

---

### **Paso 5A: Usar Firebase en Frontend (Recomendado)**

Si usas Firebase, la autenticación se maneja **directamente en el frontend**.

**Instalar Firebase:**
```bash
npm install firebase
```

**Inicializar Firebase:**
```javascript
// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "lexia-xxxxx.firebaseapp.com",
  projectId: "lexia-xxxxx",
  // ... resto de la config
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
```

**Login con Google (Frontend):**
```javascript
// src/utils/auth.js
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Obtener token de Firebase
    const firebaseToken = await user.getIdToken();

    // Enviar token a TU backend para crear sesión
    const response = await fetch('http://localhost/api/auth/firebase-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firebaseToken })
    });

    const data = await response.json();

    // Guardar tu propio accessToken
    localStorage.setItem('accessToken', data.accessToken);

    return user;
  } catch (error) {
    console.error('Error en login con Google:', error);
    throw error;
  }
};
```

**Componente de Login:**
```javascript
// src/components/LoginButton.jsx
import { loginWithGoogle } from '../utils/auth';

function LoginButton() {
  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      window.location.href = '/dashboard';
    } catch (error) {
      alert('Error al iniciar sesión con Google');
    }
  };

  return (
    <button onClick={handleGoogleLogin}>
      🔐 Continuar con Google
    </button>
  );
}
```

---

### **Paso 5B: Usar Firebase en Backend (Alternativa)**

Si prefieres validar los tokens de Firebase en tu backend:

**Instalar Firebase Admin SDK:**
```bash
cd microservices/auth
npm install firebase-admin
```

**Crear endpoint para verificar token de Firebase:**
```typescript
// src/controllers/FirebaseAuthController.ts
import admin from 'firebase-admin';

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  })
});

export const verifyFirebaseToken = async (req, res) => {
  const { firebaseToken } = req.body;

  try {
    // Verificar token de Firebase
    const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    const { uid, email, name } = decodedToken;

    // Buscar o crear usuario en tu BD
    let user = await UserRepository.findByEmail(email);

    if (!user) {
      user = await UserRepository.create({
        email,
        nombre: name,
        provider: 'google',
        provider_id: uid
      });
    }

    // Generar tus propios tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({ accessToken, refreshToken, user });
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};
```

---

## 🔄 Comparación: Google Cloud vs Firebase

| Característica | Google Cloud OAuth | Firebase Auth |
|----------------|-------------------|---------------|
| **Configuración** | Manual, más pasos | Automática, más rápida |
| **Proveedores** | Solo Google | Google, Facebook, Twitter, GitHub, etc. |
| **SDK Frontend** | No incluido | SDK completo incluido |
| **Complejidad** | Media-Alta | Baja |
| **Control** | Total | Limitado por Firebase |
| **Costo** | Gratis (hasta límites) | Gratis (hasta límites) |
| **Mejor para** | Apps empresariales | MVPs, startups |

---

## 🎯 ¿Cuál usar?

### Usa **Google Cloud Console** si:
- ✅ Solo necesitas login con Google
- ✅ Quieres control total del flujo OAuth
- ✅ Ya tienes tu propio backend de autenticación (como LexIA)
- ✅ No quieres dependencias adicionales

### Usa **Firebase** si:
- ✅ Quieres múltiples proveedores (Google, Facebook, etc.)
- ✅ Quieres setup rápido
- ✅ Prefieres SDK pre-construido
- ✅ Necesitas funciones adicionales (Firestore, Storage, etc.)

---

## 🚀 Recomendación para LexIA

**Para tu caso, te recomiendo:**

### **OPCIÓN 1: Google Cloud Console** ⭐ (Recomendada)

**Ventajas:**
- Ya tienes el backend completo implementado
- No dependes de Firebase
- Más control
- Mismo nivel de seguridad

**Pasos:**
1. Seguir "Opción 1" de esta guía
2. Configurar credenciales en docker-compose.yml
3. En tu frontend, solo un botón que redirija a `/api/auth/google`
4. Listo ✅

---

## 📝 Agregar otros proveedores después

Si más adelante quieres agregar Facebook, GitHub, etc., puedes:

1. **Seguir el mismo patrón de Google Cloud:**
   - Facebook Developers Console
   - GitHub OAuth Apps
   - Microsoft Azure AD

2. **O migrar a Firebase** (si necesitas muchos proveedores)

---

## ⚙️ Configuración en Producción

Cuando tengas tu dominio (ej: `https://lexia.com`):

### Google Cloud Console:
1. Ir a tus credenciales OAuth
2. Editar "Authorized redirect URIs"
3. Agregar: `https://lexia.com/api/auth/google/callback`
4. Agregar: `https://lexia.com` en "Authorized JavaScript origins"

### docker-compose.yml (producción):
```yaml
GOOGLE_CALLBACK_URL: https://lexia.com/api/auth/google/callback
FRONTEND_URL: https://lexia.com
```

---

## 🆘 Problemas Comunes

### Error: "redirect_uri_mismatch"
**Causa:** La URL de callback no coincide con la registrada en Google Console.

**Solución:**
1. Verifica que la URL en docker-compose.yml sea exactamente: `http://localhost/api/auth/google/callback`
2. Verifica que en Google Console hayas agregado esa misma URL
3. No debe tener espacios ni caracteres extra

### Error: "Access blocked: This app's request is invalid"
**Causa:** Pantalla de consentimiento no configurada.

**Solución:**
1. Ir a OAuth consent screen
2. Completar toda la información
3. Agregar tu email en "Test users" si está en modo Testing

### Error: "The OAuth client was not found"
**Causa:** Client ID o Secret incorrectos.

**Solución:**
1. Volver a copiar las credenciales de Google Console
2. Asegurarte de que no tengan espacios al inicio/final
3. Reiniciar el servicio: `docker-compose restart auth`

---

## ✅ Checklist Final

- [ ] Proyecto creado en Google Cloud Console (o Firebase)
- [ ] Pantalla de consentimiento OAuth configurada
- [ ] Credenciales OAuth creadas (Client ID + Secret)
- [ ] URIs de redirección agregadas
- [ ] Credenciales copiadas a docker-compose.yml
- [ ] Servicio auth reiniciado
- [ ] Probado en navegador: `http://localhost/api/auth/google`
- [ ] Login exitoso ✅

---

**¿Necesitas ayuda con algún paso específico?**
- Problemas al crear el proyecto
- Errores de configuración
- Probar el login
- Integrar en tu frontend específico (React, Vue, Angular, etc.)