# 📚 Estructura MVVM - Clean Architecture - LexIA

## 🏗️ Arquitectura Implementada

Tu proyecto ahora utiliza **MVVM + Clean Architecture** con las siguientes capas:

```
lib/
├── core/
│   ├── network/              # 🌐 Capa de Red
│   │   ├── api_client.dart         # Cliente HTTP con manejo de errores
│   │   └── api_endpoints.dart      # Endpoints de la API
│   │
│   ├── di/                   # 💉 Dependency Injection
│   │   └── injection_container.dart # GetIt - Service Locator
│   │
│   ├── application/          # 🔧 Estado global (legacy)
│   └── router/              # 🧭 Navegación
│
└── features/
    └── auth/                # 🔐 Feature de Autenticación
        ├── data/
        │   ├── datasource/
        │   │   └── auth_datasource.dart      # Llamadas HTTP
        │   ├── models/
        │   │   ├── user_model.dart           # Modelo de datos
        │   │   ├── login_request.dart
        │   │   ├── register_request.dart
        │   │   └── auth_response.dart
        │   └── repository/
        │       └── auth_repository_impl.dart # Implementación
        │
        ├── domain/
        │   ├── entities/
        │   │   └── user.dart                 # Entidad del dominio
        │   ├── repository/
        │   │   └── auth_repository.dart      # Interface
        │   └── usecase/
        │       ├── login_usecase.dart        # Lógica de negocio
        │       ├── register_usecase.dart
        │       └── logout_usecase.dart
        │
        └── presentation/
            ├── providers/
            │   └── auth_notifier.dart        # State Management
            └── pages/
                ├── login_page.dart
                └── register_page.dart
```

---

## 📦 Nuevas Dependencias Agregadas

```yaml
dependencies:
  equatable: ^2.0.5              # Comparación de objetos
  get_it: ^7.6.0                 # Dependency Injection
  shared_preferences: ^2.2.2     # Almacenamiento local
```

---

## 🔄 Flujo de Datos (MVVM)

### 1. **Presentation Layer** (UI)
```dart
RegisterPage (View)
    ↓ user action
AuthNotifier (ViewModel)
    ↓ calls
LoginUseCase / RegisterUseCase (Domain)
```

### 2. **Domain Layer** (Business Logic)
```dart
UseCase
    ↓ calls
AuthRepository (Interface)
```

### 3. **Data Layer** (Data Sources)
```dart
AuthRepositoryImpl
    ↓ calls
AuthDataSource
    ↓ HTTP
ApiClient
    ↓ API
Backend Server
```

---

## 🚀 Cómo Funciona

### **1. Registro de Usuario**

```dart
// Usuario llena el formulario en RegisterPage
final success = await authNotifier.register(
  email: 'user@example.com',
  password: '123456',
  name: 'Juan',
);

// Flujo interno:
// 1. AuthNotifier → RegisterUseCase
// 2. RegisterUseCase → valida datos → AuthRepository
// 3. AuthRepository → AuthDataSource
// 4. AuthDataSource → ApiClient.post('/api/v1/auth/register')
// 5. Backend responde con {user, token}
// 6. Token se guarda en SharedPreferences
// 7. Usuario queda autenticado
```

### **2. Login de Usuario**

```dart
final success = await authNotifier.login('email', 'password');

// Similar al registro, pero llama a /api/v1/auth/login
```

### **3. Logout**

```dart
await authNotifier.logout();

// Limpia el token y marca al usuario como no autenticado
```

---

## 💉 Dependency Injection con GetIt

### Registro de Dependencias

Todas las dependencias se registran en `injection_container.dart`:

```dart
// Singleton - Una sola instancia en toda la app
sl.registerSingleton<SharedPreferences>(sharedPreferences);

// Lazy Singleton - Se crea cuando se usa por primera vez
sl.registerLazySingleton<ApiClient>(() => ApiClient());

// Factory - Nueva instancia cada vez
sl.registerFactory(() => AuthNotifier(...));
```

### Uso en la App

```dart
// En main.dart
await di.initializeDependencies();

// En providers
ChangeNotifierProvider(create: (_) => di.sl<AuthNotifier>())

// En cualquier parte del código
final authNotifier = di.sl<AuthNotifier>();
```

---

## 🌐 ApiClient - Cliente HTTP

### Características

✅ Manejo automático de headers
✅ Autenticación con Bearer Token
✅ Manejo de errores personalizado
✅ Soporte para GET, POST, PUT, DELETE
✅ Conversión automática JSON

### Uso

```dart
// POST con autenticación
final response = await apiClient.post(
  '/api/v1/auth/login',
  body: {'email': 'user@example.com', 'password': '123456'},
  requiresAuth: false,
);

// GET con token
final user = await apiClient.get(
  '/api/v1/auth/me',
  requiresAuth: true,
);
```

### Excepciones

```dart
try {
  await apiClient.post(...);
} on BadRequestException catch (e) {
  // 400 - Validación fallida
} on UnauthorizedException catch (e) {
  // 401 - Token inválido
} on NotFoundException catch (e) {
  // 404 - Recurso no encontrado
} on ServerException catch (e) {
  // 500 - Error del servidor
}
```

---

## 📝 Modelos vs Entidades

### **Entity** (Domain)
```dart
// Entidad pura del dominio
class User {
  final String id;
  final String email;
  final String name;
}
```

### **Model** (Data)
```dart
// Modelo con métodos de serialización
class UserModel extends User {
  factory UserModel.fromJson(Map<String, dynamic> json) {...}
  Map<String, dynamic> toJson() {...}
}
```

**¿Por qué?** Separación de responsabilidades. La entidad no conoce sobre JSON o APIs.

---

## 🔐 Auth Flow Completo

### Registro + Login automático

```
User fills form → RegisterPage
                      ↓
                AuthNotifier.register()
                      ↓
                RegisterUseCase (valida)
                      ↓
                AuthRepository
                      ↓
                AuthDataSource
                      ↓
                ApiClient.post('/register')
                      ↓
                Backend → {user, token}
                      ↓
                Token guardado en SharedPreferences
                      ↓
                AuthNotifier.state = authenticated
                      ↓
                Navigation → WelcomePage
```

---

## 🧪 Testing (Futuro)

Con esta arquitectura puedes testear cada capa:

```dart
// Test de UseCase (sin depender de la API)
test('should validate email format', () {
  final useCase = LoginUseCase(repository: mockRepository);
  expect(
    () => useCase(email: 'invalid', password: '123'),
    throwsException,
  );
});
```

---

## 📊 Estado de Autenticación

```dart
enum AuthState {
  initial,        // App recién iniciada
  loading,        // Procesando login/register
  authenticated,  // Usuario logueado
  unauthenticated,// Sin sesión
  error          // Error en autenticación
}

// Uso en UI
if (authNotifier.isLoading) {
  return CircularProgressIndicator();
}

if (authNotifier.state == AuthState.error) {
  return Text(authNotifier.errorMessage);
}
```

---

## 🔧 Configuración de API

En tu archivo `.env`:

```env
API_URL=http://localhost:3000
# o
API_URL=https://api.lexia.com
```

---

## 🎯 Próximos Pasos

1. **Conectar con tu Backend Real**
   - Actualiza `API_URL` en `.env`
   - Ajusta los modelos según la respuesta de tu API

2. **Agregar más Features**
   - Copiar la estructura de `auth/` para otras features
   - Ejemplo: `consultations/`, `forum/`, etc.

3. **Implementar Refresh Token**
   - Agregar lógica en `AuthRepository` para renovar tokens

4. **Persistencia del Usuario**
   - Guardar `User` en SharedPreferences o SQLite

---

## 📚 Recursos

- [Clean Architecture by Uncle Bob](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [GetIt Documentation](https://pub.dev/packages/get_it)
- [Provider Documentation](https://pub.dev/packages/provider)

---

## ✅ Checklist de Implementación

- [x] ApiClient con manejo de errores
- [x] Endpoints definidos
- [x] Models (UserModel, LoginRequest, RegisterRequest, AuthResponse)
- [x] Entities (User)
- [x] DataSource (AuthDataSource)
- [x] Repository Interface y Implementation
- [x] UseCases (Login, Register, Logout)
- [x] Dependency Injection con GetIt
- [x] AuthNotifier actualizado
- [x] Login conectado
- [x] Register conectado
- [ ] Implementar UI de login con email/password
- [ ] Conectar con backend real
- [ ] Testing

---

**¡Tu app ahora tiene una arquitectura profesional y escalable! 🚀**
