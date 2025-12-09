# Configuración Google Sign-In para LexIA

## Estado Actual del Problema

✅ **Google Sign-In funciona** - Se puede obtener la cuenta de usuario
❌ **Falta ID Token** - No se puede obtener el token para autenticar con el backend

## Error observado:
```
✅ Google Sign-In exitoso: moracordovaj6@gmail.com
❌ No se pudo obtener el ID token de Google
```

## Solución Paso a Paso

### 1. Ir a Google Cloud Console
- Visita: https://console.cloud.google.com/
- Crea un proyecto nuevo o usa uno existente para LexIA

### 2. Habilitar Google Sign-In API
- Ve a: **APIs & Services > Library**
- Busca "Google Sign-In API" y habilítala
- También habilita "Google+ API" si está disponible

### 3. Configurar OAuth 2.0 Consent Screen
- Ve a: **APIs & Services > OAuth consent screen**
- Selecciona "External" (para testing)
- Completa:
  - App name: "LexIA"
  - User support email: tu email
  - Developer contact information: tu email
- Guarda y continúa

### 4. Crear OAuth 2.0 Client IDs
Ve a: **APIs & Services > Credentials > Create Credentials > OAuth 2.0 Client ID**

#### A. Cliente Android:
- Application type: **Android**
- Name: "LexIA Android"
- Package name: `com.example.flutter_application_1`
- SHA-1 certificate fingerprint: [Ver paso 5]

#### B. Cliente Web (importante para ID tokens):
- Application type: **Web application** 
- Name: "LexIA Web"
- Authorized redirect URIs: (puede dejarse vacío por ahora)

### 5. Obtener SHA-1 Certificate Fingerprint

#### Para Debug (desarrollo):
```bash
# En Windows PowerShell, navega a la carpeta del proyecto
cd C:\Users\umina\OneDrive\Escritorio\LexIA1.0\appMovil\FromIntegrador

# Obtener SHA-1 para debug
keytool -list -v -alias androiddebugkey -keystore %USERPROFILE%\.android\debug.keystore -storepass android -keypass android
```

#### Para Release (producción):
```bash
# Usar tu keystore de producción
keytool -list -v -alias your-key-alias -keystore path-to-your-keystore.jks
```

Copia la línea que dice `SHA1: XX:XX:XX:...` (sin "SHA1: ")

### 6. Descargar google-services.json
- Después de crear las credenciales Android
- Ve a **Project Settings** (ícono de engranaje)
- Selecciona tu app Android
- Descarga `google-services.json`
- **REEMPLAZA** el archivo en: `android/app/google-services.json`

### 7. Actualizar configuración en el código

Edita `lib/core/services/google_sign_in_service.dart`:

```dart
GoogleSignInService() {
  _googleSignIn = GoogleSignIn(
    scopes: ['email', 'profile', 'openid'],
    // Agrega tu Web Client ID aquí:
    clientId: 'TU_WEB_CLIENT_ID.apps.googleusercontent.com',
  );
}
```

### 8. Verificar AndroidManifest.xml
Asegúrate de que `android/app/src/main/AndroidManifest.xml` tenga:

```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
```

### 9. Limpiar y reconstruir
```bash
flutter clean
flutter pub get
flutter run
```

## Solución Temporal (mientras configuras)

Por ahora, puedes:
1. **Usar login con email/password** (que ya funciona)
2. **Editar perfil** (que ahora debería funcionar mejor)
3. Configurar Google Sign-In siguiendo los pasos de arriba

## Test de Verificación

Cuando funcione correctamente, verás en la consola:
```
🔄 Iniciando proceso de login con Google...
✅ Google Sign-In exitoso: usuario@gmail.com
✅ Cuenta de Google obtenida: usuario@gmail.com
✅ ID token obtenido exitosamente
✅ Login con Google completado exitosamente
```

## Enlaces Útiles

- [Google Cloud Console](https://console.cloud.google.com/)
- [Flutter Google Sign-In Plugin](https://pub.dev/packages/google_sign_in)
- [Android App Signing](https://developer.android.com/studio/publish/app-signing)