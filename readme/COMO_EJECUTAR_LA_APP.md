# 🚀 Cómo Ejecutar la App Flutter de LexIA

Esta guía te muestra paso a paso cómo ejecutar la aplicación móvil de LexIA.

---

## ✅ Cambios Realizados

Ya se actualizaron los endpoints para conectar con tu backend:

1. ✅ **Endpoints de Auth actualizados:**
   - `/api/auth/register` - Registro
   - `/api/auth/login` - Login con email/password
   - `/api/auth/google/verify` - Login con Google (móvil)
   - `/api/auth/logout` - Cerrar sesión
   - `/api/auth/me` - Obtener perfil del usuario

2. ✅ **Google Sign-In configurado:**
   - Android Client ID: `928983565489-grjqrrr84m7oje80cgs7kbuvfrgdhqjo.apps.googleusercontent.com`
   - Web Client ID: `928983565489-4lslvnvg8pinho1e5vdh4hv7m32kk1qk.apps.googleusercontent.com`

3. ✅ **Formato de respuesta del backend actualizado:**
   - Espera `accessToken` y `refreshToken`
   - Maneja el objeto `user` correctamente

---

## 📋 Requisitos Previos

### 1. **Instalar Flutter**

Si no tienes Flutter instalado:

```bash
# Descargar Flutter SDK
# https://flutter.dev/docs/get-started/install/windows

# Verificar instalación
flutter doctor
```

### 2. **Backend corriendo**

Asegúrate de que tu backend esté corriendo:

```bash
cd c:\Users\umina\OneDrive\Escritorio\LexIA2.0
docker-compose up -d
```

Verificar que funcione:
```bash
curl http://localhost/api/auth/health
# Debería retornar: {"status":"ok","service":"auth-service",...}
```

---

## 🎯 Opción 1: Ejecutar en Chrome (Web) - MÁS RÁPIDO

Esta es la forma más rápida para probar:

### **Paso 1: Ir a la carpeta de la app**

```bash
cd c:\Users\umina\OneDrive\Escritorio\LexIA2.0\FromIntegrador
```

### **Paso 2: Instalar dependencias**

```bash
flutter pub get
```

### **Paso 3: Ejecutar en Chrome**

```bash
flutter run -d chrome
```

La app se abrirá automáticamente en Chrome en `http://localhost:XXXX`

### **Configuración API (ya está configurada):**

En el archivo `.env` está configurado para usar `http://localhost:80`

```env
API_URL=http://localhost:80
```

---

## 📱 Opción 2: Ejecutar en Android Emulator

### **Paso 1: Crear y ejecutar emulador Android**

Si no tienes un emulador:

1. Abrir Android Studio
2. Tools → Device Manager → Create Device
3. Elegir Pixel 5 o similar
4. Elegir API 33 (Android 13) o superior
5. Finish

Ejecutar el emulador:
```bash
# Listar emuladores disponibles
emulator -list-avds

# Ejecutar emulador (reemplazar con el nombre de tu AVD)
emulator -avd Pixel_5_API_33
```

### **Paso 2: Configurar la URL de la API**

Editar `.env` en la carpeta `FromIntegrador`:

```env
# Descomentar esta línea:
API_URL=http://10.0.2.2:80
```

**¿Por qué `10.0.2.2`?**
- El emulador Android usa `10.0.2.2` para acceder al `localhost` de tu PC

### **Paso 3: Ejecutar la app**

```bash
flutter run
```

Flutter detectará automáticamente el emulador y ejecutará la app ahí.

---

## 📲 Opción 3: Ejecutar en Dispositivo Físico (Android)

### **Paso 1: Habilitar modo desarrollador en tu celular**

1. Settings → About phone → Tap "Build number" 7 veces
2. Settings → Developer options → Enable "USB debugging"

### **Paso 2: Conectar tu celular por USB**

```bash
# Verificar que Flutter detecte el dispositivo
flutter devices

# Deberías ver algo como:
# Android SDK built for x86 • emulator-5554 • android-x86
# SM G960F • 1234567890ABCDEF • android-arm64 ← Tu celular
```

### **Paso 3: Obtener tu IP local**

```powershell
ipconfig

# Buscar tu IPv4 Address, ejemplo:
# IPv4 Address. . . . . . . . . . . : 192.168.1.100
```

### **Paso 4: Configurar la URL de la API con tu IP**

Editar `.env`:

```env
API_URL=http://192.168.1.100:80
```

**IMPORTANTE:** Reemplaza `192.168.1.100` con TU IP real.

### **Paso 5: Ejecutar la app**

```bash
flutter run -d <device-id>

# O simplemente:
flutter run
# Y Flutter te preguntará en qué dispositivo quieres ejecutar
```

---

## 🧪 Probar la App

### **1. Login con Email/Password**

Usar las credenciales del usuario que registramos:

- **Email:** `lexia1388@gmail.com`
- **Password:** `Test123456!`

O registrar un nuevo usuario desde la app.

### **2. Login con Google**

Click en "Continuar con Google" y selecciona tu cuenta.

El backend debería:
- Verificar el token con Google
- Crear el usuario si no existe
- Retornar `accessToken` y `refreshToken`

### **3. Ver logs de la app**

Los logs aparecerán automáticamente en la terminal donde ejecutaste `flutter run`.

Para ver más detalles:

```bash
flutter logs
```

---

## 🐛 Problemas Comunes

### **Error: "No se puede conectar al backend"**

**Causa:** La URL de la API no es correcta.

**Solución:**

1. **En Web (Chrome):** Usar `http://localhost:80`
2. **En Emulator:** Usar `http://10.0.2.2:80`
3. **En Dispositivo físico:** Usar tu IP local `http://192.168.X.X:80`

Verificar que el backend esté corriendo:
```bash
curl http://localhost/api/auth/health
```

---

### **Error: "DeveloperError" en Google Sign-In (Android)**

**Causa:** El SHA-1 fingerprint no coincide con el configurado en Google Cloud Console.

**Solución:**

1. Obtener tu SHA-1:
```bash
cd FromIntegrador/android
./gradlew signingReport
```

2. Copiar el SHA-1 de la sección "debugAndroidTest"

3. Agregarlo en Google Cloud Console:
   - https://console.cloud.google.com/apis/credentials
   - Click en "Cliente de Android 1"
   - Agregar el SHA-1

---

### **Error: "CERTIFICATE_VERIFY_FAILED" en iOS**

**Causa:** Problema con certificados SSL en desarrollo.

**Solución:** Por ahora usa HTTP (no HTTPS) en desarrollo.

---

### **Error: "Build failed" en Android**

**Causa:** Dependencias no instaladas.

**Solución:**

```bash
cd FromIntegrador/android
./gradlew clean
cd ..
flutter clean
flutter pub get
flutter run
```

---

## 📊 Endpoints Disponibles

La app Flutter puede acceder a todos estos endpoints:

### **Autenticación:**
- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/login` - Login con email/password
- `POST /api/auth/google/verify` - Login con Google (móvil)
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/me` - Obtener perfil del usuario
- `POST /api/auth/refresh` - Refrescar access token

### **Verificación Email:**
- `POST /api/auth/verify-email` - Verificar email
- `POST /api/auth/resend-verification` - Reenviar email
- `POST /api/auth/forgot-password` - Recuperar contraseña
- `POST /api/auth/reset-password` - Resetear contraseña

---

## 🔧 Hot Reload

Cuando la app esté corriendo, puedes hacer cambios en el código y presionar `r` en la terminal para recargar:

```bash
r - Hot reload
R - Hot restart (reconstruye todo)
q - Quit (cerrar la app)
```

---

## 🎨 Estructura de la App

```
FromIntegrador/
├── lib/
│   ├── core/
│   │   ├── network/
│   │   │   ├── api_client.dart
│   │   │   └── api_endpoints.dart  ← Endpoints actualizados
│   │   ├── services/
│   │   │   └── google_sign_in_service.dart
│   │   └── storage/
│   ├── features/
│   │   ├── login/  ← Pantalla de login
│   │   ├── register/  ← Pantalla de registro
│   │   ├── home/  ← Dashboard principal
│   │   └── ...
│   └── main.dart
├── .env  ← Configuración de API URL y Google Client IDs
└── pubspec.yaml
```

---

## ✅ Checklist Final

- [ ] Backend corriendo (`docker-compose up -d`)
- [ ] Backend accesible (`curl http://localhost/api/auth/health`)
- [ ] Flutter instalado (`flutter doctor`)
- [ ] Dependencias instaladas (`flutter pub get`)
- [ ] `.env` configurado con la API_URL correcta
- [ ] App ejecutándose (`flutter run`)
- [ ] Login funcionando ✅
- [ ] Google Sign-In funcionando ✅

---

## 🚀 Siguiente Paso

Una vez que la app funcione, puedes:

1. **Crear build de producción:**
```bash
flutter build apk --release
```

2. **Instalar en dispositivo físico:**
```bash
flutter install
```

3. **Publicar en Play Store** (requiere cuenta de desarrollador)

---

**¿Necesitas ayuda?**

Si encuentras algún error, revisa los logs con `flutter logs` y comparte el error para ayudarte a resolverlo.