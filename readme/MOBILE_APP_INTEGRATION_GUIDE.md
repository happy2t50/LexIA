# Guía de Integración para Apps Móviles - LexIA 2.0

Esta guía te muestra cómo integrar tu aplicación móvil (React Native, Flutter, Android nativo, iOS nativo) con el backend de LexIA 2.0.

## 📋 Tabla de Contenidos

1. [Tecnologías Soportadas](#tecnologías-soportadas)
2. [Configuración de Google OAuth para Móvil](#configuración-de-google-oauth-para-móvil)
3. [React Native](#react-native)
4. [Flutter](#flutter)
5. [Android Nativo (Kotlin/Java)](#android-nativo)
6. [iOS Nativo (Swift)](#ios-nativo)
7. [Endpoints de la API](#endpoints-de-la-api)
8. [Flujos de Autenticación](#flujos-de-autenticación)

---

## 📱 Tecnologías Soportadas

Tu backend funciona con cualquier tecnología móvil:

- ✅ **React Native** (Recomendado - código compartido con web)
- ✅ **Flutter** (Una sola codebase para Android + iOS)
- ✅ **Android Nativo** (Kotlin/Java)
- ✅ **iOS Nativo** (Swift/Objective-C)
- ✅ **Ionic/Capacitor** (Híbridas)

---

## 🔐 Configuración de Google OAuth para Móvil

### **Paso 1: Crear credenciales para Android**

Ya tienes una credencial de Android creada: `Cliente de Android 1`

**Client ID de Android (YA CONFIGURADO):**
```
928983565489-grjqrrr84m7oje80cgs7kbuvfrgdhqjo.apps.googleusercontent.com
```

**Para verificar tu configuración:**

1. Ir a Google Cloud Console:
   ```
   https://console.cloud.google.com/apis/credentials?project=astral-digit-477817-b7
   ```

2. Click en **"Cliente de Android 1"**

3. Verás:
   - **Client ID:** `928983565489-grjqrrr84m7oje80cgs7kbuvfrgdhqjo.apps.googleusercontent.com`
   - **Package name:** El nombre de tu app (ej: `com.lexia.app`)
   - **SHA-1 fingerprint:** Huella digital de tu app

**Si necesitas crear una nueva credencial de Android:**

1. Click "CREAR CREDENCIALES" → "ID de cliente de OAuth"
2. Tipo: **Android**
3. Nombre: `LexIA Mobile Android`
4. Package name: `com.lexia.app` (tu package)
5. SHA-1 fingerprint:

**Para obtener el SHA-1:**

```bash
# En tu proyecto Android
cd android
./gradlew signingReport

# Busca la línea:
# SHA1: AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12
```

6. Click "CREAR"
7. Copiar el **Client ID** generado

---

### **Paso 2: Crear credenciales para iOS**

1. Ir a Google Cloud Console Credentials

2. Click "CREAR CREDENCIALES" → "ID de cliente de OAuth"

3. Tipo: **iOS**

4. Nombre: `LexIA Mobile iOS`

5. Bundle ID: Tu bundle ID de iOS (ej: `com.lexia.app`)

   **Para encontrar tu Bundle ID:**
   - Abrir Xcode
   - Seleccionar tu proyecto
   - General tab → Identity → Bundle Identifier

6. Click "CREAR"

7. Copiar el **Client ID** generado (empieza con tu número y termina en `.apps.googleusercontent.com`)

---

## ⚛️ React Native

### **Opción 1: Usar @react-native-google-signin/google-signin** (RECOMENDADO)

Esta librería maneja todo el flujo OAuth automáticamente.

### **Instalación:**

```bash
npm install @react-native-google-signin/google-signin
```

**iOS:**
```bash
cd ios
pod install
cd ..
```

**Android:** Configurar automáticamente con autolinking

---

### **Configuración:**

**1. Configurar Google Sign In:**

```javascript
// src/config/googleSignIn.js
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  // Tu Web Client ID (NO el de Android/iOS)
  webClientId: '928983565489-4lslvnvg8pinho1e5vdh4hv7m32kk1qk.apps.googleusercontent.com',

  // Solo para iOS
  iosClientId: 'TU_IOS_CLIENT_ID.apps.googleusercontent.com',

  // Permisos
  scopes: ['profile', 'email'],

  // Para obtener tokens del backend
  offlineAccess: true,
});
```

---

### **2. Componente de Login:**

```javascript
// src/screens/LoginScreen.jsx
import React, { useState } from 'react';
import { View, Button, Text, StyleSheet } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login con Google
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Verificar que Google Play Services esté disponible
      await GoogleSignin.hasPlayServices();

      // 2. Hacer sign in con Google
      const userInfo = await GoogleSignin.signIn();

      // 3. Obtener el ID token
      const tokens = await GoogleSignin.getTokens();
      const googleIdToken = tokens.idToken;

      // 4. Enviar el token a TU backend
      const response = await fetch('http://TU_IP:3003/google/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: googleIdToken,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // 5. Guardar tokens de TU backend
        await AsyncStorage.setItem('accessToken', data.accessToken);
        await AsyncStorage.setItem('refreshToken', data.refreshToken);

        // 6. Navegar al home
        navigation.replace('Home');
      } else {
        setError(data.message || 'Error al autenticar');
      }
    } catch (err) {
      console.error('Error en Google Sign In:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Login tradicional con email/password
  const handleEmailLogin = async (email, password) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://TU_IP:3003/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Verificar si requiere 2FA
        if (data.requires2FA) {
          navigation.navigate('TwoFactor', {
            tempToken: data.tempToken,
          });
          return;
        }

        // Guardar tokens
        await AsyncStorage.setItem('accessToken', data.accessToken);
        await AsyncStorage.setItem('refreshToken', data.refreshToken);

        navigation.replace('Home');
      } else {
        setError(data.message || 'Error en login');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LexIA</Text>

      {/* Login con Google */}
      <Button
        title="Continuar con Google"
        onPress={handleGoogleLogin}
        disabled={loading}
      />

      {/* Separador */}
      <Text style={styles.separator}>o</Text>

      {/* Email/Password inputs aquí */}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
  },
  separator: {
    textAlign: 'center',
    marginVertical: 20,
  },
  error: {
    color: 'red',
    marginTop: 10,
  },
});

export default LoginScreen;
```

---

### **3. Endpoint en tu backend para verificar token de Google:**

Necesitas crear este endpoint en tu backend para validar el token de Google:

```typescript
// microservices/auth/src/controllers/OAuthController.ts

/**
 * POST /api/auth/google/verify
 * Verificar token de Google desde apps móviles
 */
async verifyGoogleToken(req: Request, res: Response): Promise<void> {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      res.status(400).json({ error: 'Token requerido' });
      return;
    }

    // Verificar token con Google
    const ticket = await OAuthService.verifyGoogleIdToken(idToken);
    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      res.status(401).json({ error: 'Token inválido' });
      return;
    }

    // Buscar o crear usuario
    let user = await UserRepository.findByEmail(payload.email);

    if (!user) {
      // Crear usuario nuevo
      user = await UserRepository.create({
        email: payload.email,
        nombre: payload.given_name || '',
        apellido: payload.family_name || '',
        email_verified: true,
        provider: 'google',
        provider_id: payload.sub,
      });
    }

    // Generar tus propios tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
```

---

### **4. Configuración de red (IMPORTANTE):**

**Para desarrollo local:**

```javascript
// src/config/api.js
import { Platform } from 'react-native';

// Android emulator usa 10.0.2.2 para conectarse a localhost de tu PC
// iOS simulator usa localhost directamente
const API_URL = Platform.select({
  android: 'http://10.0.2.2',
  ios: 'http://localhost',
});

export default API_URL;
```

**Para dispositivos físicos:**

Necesitas la IP de tu computadora en la red local:

```bash
# Windows
ipconfig
# Buscar: IPv4 Address (ej: 192.168.1.100)

# Mac/Linux
ifconfig
# Buscar: inet (ej: 192.168.1.100)
```

Luego:
```javascript
const API_URL = 'http://192.168.1.100';
```

---

## 🎯 Flutter

### **Instalación:**

```yaml
# pubspec.yaml
dependencies:
  google_sign_in: ^6.1.0
  http: ^1.1.0
  shared_preferences: ^2.2.0
```

### **Configuración Android:**

```groovy
// android/app/build.gradle
android {
    defaultConfig {
        // Tu package name debe coincidir con el de Google Cloud Console
        applicationId "com.lexia.app"
    }
}
```

### **Configuración iOS:**

```xml
<!-- ios/Runner/Info.plist -->
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleTypeRole</key>
    <string>Editor</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.googleusercontent.apps.TU_IOS_CLIENT_ID_INVERTIDO</string>
    </array>
  </dict>
</array>
```

### **Código Flutter:**

```dart
// lib/services/auth_service.dart
import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class AuthService {
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: ['email', 'profile'],
    serverClientId: '928983565489-4lslvnvg8pinho1e5vdh4hv7m32kk1qk.apps.googleusercontent.com',
  );

  Future<Map<String, dynamic>?> signInWithGoogle() async {
    try {
      // 1. Sign in con Google
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();

      if (googleUser == null) {
        return null; // Usuario canceló
      }

      // 2. Obtener token
      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      final String? idToken = googleAuth.idToken;

      if (idToken == null) {
        throw Exception('No se pudo obtener el token');
      }

      // 3. Enviar a tu backend
      final response = await http.post(
        Uri.parse('http://TU_IP:3003/google/verify'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'idToken': idToken}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);

        // 4. Guardar tokens
        // Usar shared_preferences aquí

        return data;
      } else {
        throw Exception('Error al autenticar con el servidor');
      }
    } catch (error) {
      print('Error en Google Sign In: $error');
      rethrow;
    }
  }

  Future<void> signOut() async {
    await _googleSignIn.signOut();
  }
}
```

### **Widget de Login:**

```dart
// lib/screens/login_screen.dart
import 'package:flutter/material.dart';
import 'auth_service.dart';

class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final AuthService _authService = AuthService();
  bool _isLoading = false;

  Future<void> _handleGoogleSignIn() async {
    setState(() => _isLoading = true);

    try {
      final result = await _authService.signInWithGoogle();

      if (result != null) {
        // Navegar a home
        Navigator.pushReplacementNamed(context, '/home');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('LexIA', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold)),
            SizedBox(height: 40),

            ElevatedButton.icon(
              onPressed: _isLoading ? null : _handleGoogleSignIn,
              icon: Icon(Icons.login),
              label: Text('Continuar con Google'),
            ),
          ],
        ),
      ),
    );
  }
}
```

---

## 📱 Android Nativo (Kotlin)

### **build.gradle (app):**

```gradle
dependencies {
    implementation 'com.google.android.gms:play-services-auth:20.7.0'
    implementation 'com.squareup.okhttp3:okhttp:4.11.0'
}
```

### **Código Kotlin:**

```kotlin
// LoginActivity.kt
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException

class LoginActivity : AppCompatActivity() {

    private lateinit var googleSignInClient: GoogleSignInClient
    private val RC_SIGN_IN = 9001

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        // Configurar Google Sign In
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken("928983565489-4lslvnvg8pinho1e5vdh4hv7m32kk1qk.apps.googleusercontent.com")
            .requestEmail()
            .build()

        googleSignInClient = GoogleSignIn.getClient(this, gso)

        // Botón de Google Sign In
        findViewById<Button>(R.id.btnGoogleSignIn).setOnClickListener {
            signInWithGoogle()
        }
    }

    private fun signInWithGoogle() {
        val signInIntent = googleSignInClient.signInIntent
        startActivityForResult(signInIntent, RC_SIGN_IN)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

        if (requestCode == RC_SIGN_IN) {
            val task = GoogleSignIn.getSignedInAccountFromIntent(data)
            try {
                val account = task.getResult(ApiException::class.java)
                handleSignInResult(account)
            } catch (e: ApiException) {
                Log.w(TAG, "Google sign in failed", e)
            }
        }
    }

    private fun handleSignInResult(account: GoogleSignInAccount) {
        val idToken = account.idToken ?: return

        // Enviar token a tu backend
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val client = OkHttpClient()
                val json = JSONObject().apply {
                    put("idToken", idToken)
                }

                val body = RequestBody.create(
                    "application/json".toMediaType(),
                    json.toString()
                )

                val request = Request.Builder()
                    .url("http://TU_IP:3003/google/verify")
                    .post(body)
                    .build()

                val response = client.newCall(request).execute()
                val responseData = JSONObject(response.body?.string() ?: "")

                // Guardar tokens en SharedPreferences
                val prefs = getSharedPreferences("auth", MODE_PRIVATE)
                prefs.edit().apply {
                    putString("accessToken", responseData.getString("accessToken"))
                    putString("refreshToken", responseData.getString("refreshToken"))
                    apply()
                }

                // Navegar a MainActivity
                withContext(Dispatchers.Main) {
                    startActivity(Intent(this@LoginActivity, MainActivity::class.java))
                    finish()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error al autenticar", e)
            }
        }
    }
}
```

---

## 🍎 iOS Nativo (Swift)

### **Podfile:**

```ruby
pod 'GoogleSignIn'
pod 'Alamofire'
```

### **Código Swift:**

```swift
// LoginViewController.swift
import UIKit
import GoogleSignIn

class LoginViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()

        // Configurar Google Sign In
        GIDSignIn.sharedInstance.configuration = GIDConfiguration(
            clientID: "TU_IOS_CLIENT_ID.apps.googleusercontent.com"
        )
    }

    @IBAction func googleSignInTapped(_ sender: UIButton) {
        GIDSignIn.sharedInstance.signIn(withPresenting: self) { result, error in
            guard error == nil else {
                print("Error al hacer sign in: \(error!.localizedDescription)")
                return
            }

            guard let user = result?.user,
                  let idToken = user.idToken?.tokenString else {
                return
            }

            self.sendTokenToBackend(idToken: idToken)
        }
    }

    func sendTokenToBackend(idToken: String) {
        let url = URL(string: "http://TU_IP:3003/google/verify")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = ["idToken": idToken]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { data, response, error in
            guard let data = data, error == nil else {
                print("Error: \(error?.localizedDescription ?? "Unknown error")")
                return
            }

            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let accessToken = json["accessToken"] as? String {

                // Guardar token en UserDefaults
                UserDefaults.standard.set(accessToken, forKey: "accessToken")

                // Navegar a home
                DispatchQueue.main.async {
                    // Cambiar a pantalla principal
                }
            }
        }.resume()
    }
}
```

---

## 🔌 Endpoints de la API

### **Base URL:**

**Desarrollo:**
```
http://TU_IP_LOCAL/api/auth
```

**Producción:**
```
https://lexia.com/api/auth
```

### **Endpoints disponibles:**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/register` | Registro con email/password |
| POST | `/login` | Login con email/password |
| POST | `/google/verify` | Verificar token de Google (móvil) |
| POST | `/refresh` | Refrescar access token |
| POST | `/logout` | Cerrar sesión |
| GET | `/me` | Obtener perfil del usuario |
| POST | `/verify-email` | Verificar email |
| POST | `/forgot-password` | Solicitar reset de contraseña |
| POST | `/reset-password` | Resetear contraseña |
| POST | `/2fa/setup` | Configurar 2FA |
| POST | `/2fa/enable` | Habilitar 2FA |
| POST | `/2fa/verify` | Verificar código 2FA |

---

## 🔄 Flujos de Autenticación

### **Flujo 1: Login con Google (Móvil)**

```
1. Usuario hace tap en "Continuar con Google"
2. App abre Google Sign In nativo
3. Usuario selecciona su cuenta de Google
4. Google retorna ID Token
5. App envía ID Token a tu backend: POST /google/verify
6. Backend verifica token con Google
7. Backend busca/crea usuario
8. Backend retorna accessToken + refreshToken
9. App guarda tokens en AsyncStorage/SharedPreferences
10. App navega a pantalla principal
```

### **Flujo 2: Login con Email/Password**

```
1. Usuario ingresa email y contraseña
2. App envía: POST /login con { email, password }
3. Backend valida credenciales
4. Si tiene 2FA:
   - Backend retorna { requires2FA: true, tempToken }
   - App muestra pantalla de 2FA
   - Usuario ingresa código
   - App envía: POST /2fa/verify con { tempToken, code }
5. Backend retorna accessToken + refreshToken
6. App guarda tokens
7. App navega a pantalla principal
```

### **Flujo 3: Refresh Token**

```
1. Access token expira (15 minutos)
2. App recibe error 401
3. App envía: POST /refresh con { refreshToken }
4. Backend retorna nuevo accessToken
5. App guarda nuevo token
6. App reintenta request original
```

---

## 🔒 Seguridad

### **Almacenamiento seguro de tokens:**

**React Native:**
```bash
npm install @react-native-async-storage/async-storage
# O para mayor seguridad:
npm install react-native-keychain
```

**Flutter:**
```yaml
flutter_secure_storage: ^9.0.0
```

**Android:**
```kotlin
// Usar EncryptedSharedPreferences
```

**iOS:**
```swift
// Usar Keychain
```

### **Interceptor para refresh automático:**

**React Native (Axios):**
```javascript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: 'http://TU_IP/api',
});

// Agregar token a cada request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh automático en 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = await AsyncStorage.getItem('refreshToken');

      try {
        const { data } = await axios.post('http://TU_IP/api/auth/refresh', {
          refreshToken,
        });

        await AsyncStorage.setItem('accessToken', data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

        return api(originalRequest);
      } catch (err) {
        // Refresh token expirado, redirigir a login
        await AsyncStorage.clear();
        // navigation.navigate('Login');
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

---

## 📝 Resumen de Pasos

### **Para empezar:**

1. ✅ Ya tienes el **Web Client ID** configurado
2. ✅ Ya tienes el **Android Client ID** creado
3. ⚠️ Crear **iOS Client ID** (si vas a soportar iOS)
4. ⚠️ Agregar endpoint `/google/verify` en el backend
5. ⚠️ Elegir tecnología (React Native recomendado)
6. ⚠️ Seguir la guía de tu tecnología elegida

---

## 🎯 Recomendación

**Te recomiendo React Native** porque:
- ✅ Compartes código con tu futura web (si usas React)
- ✅ Una sola codebase para Android + iOS
- ✅ Gran comunidad y librerías
- ✅ Hot reload rápido
- ✅ Puedes usar Expo para desarrollo más rápido

**Comando para empezar:**
```bash
npx create-expo-app lexia-mobile
cd lexia-mobile
npm install @react-native-google-signin/google-signin axios @react-native-async-storage/async-storage
```

---

## 🆘 Troubleshooting

### **Error: "DEVELOPER_ERROR" en Google Sign In**

**Causa:** SHA-1 fingerprint no coincide

**Solución:**
```bash
cd android
./gradlew signingReport
# Copiar el SHA1 y agregarlo en Google Cloud Console
```

### **Error: "The app is not authorized to use Google Sign-In"**

**Causa:** Package name no coincide

**Solución:** Verificar que el package name en Google Cloud Console sea exactamente el mismo que en tu `build.gradle`

### **Error de conexión a localhost**

**Causa:** Emulador no puede conectarse a localhost

**Solución:** Usar `10.0.2.2` en Android emulator o la IP local para dispositivos físicos

---

**¿Con qué tecnología quieres empezar?**
- React Native
- Flutter
- Android Nativo
- iOS Nativo