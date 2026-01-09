# Guía de Integración Frontend - LexIA 2.0

Esta guía te muestra cómo integrar tu aplicación frontend (React, Vue, Angular, etc.) con el servicio de autenticación de LexIA 2.0.

## 📋 Tabla de Contenidos

1. [Configuración Inicial](#configuración-inicial)
2. [Autenticación Básica](#autenticación-básica)
3. [Login con Google (OAuth2)](#login-con-google-oauth2)
4. [Verificación de Email](#verificación-de-email)
5. [Recuperación de Contraseña](#recuperación-de-contraseña)
6. [Autenticación de 2 Factores (2FA)](#autenticación-de-2-factores-2fa)
7. [Gestión de Tokens](#gestión-de-tokens)
8. [Ejemplos de Código](#ejemplos-de-código)

---

## 🔧 Configuración Inicial

### URLs Base

**Desarrollo:**
```javascript
const API_URL = 'http://localhost/api/auth';
```

**Producción:**
```javascript
const API_URL = 'https://tu-dominio.com/api/auth';
```

### Headers Comunes

```javascript
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${accessToken}` // Solo para rutas protegidas
};
```

---

## 🔐 Autenticación Básica

### 1. Registro de Usuario

**Endpoint:** `POST /api/auth/register`

**Request:**
```javascript
const register = async (userData) => {
  const response = await fetch('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre: userData.firstName,
      apellido: userData.lastName,
      email: userData.email,
      password: userData.password,
      telefono: userData.phone, // Opcional
      rol_id: 1 // 1=Ciudadano, 2=Abogado, 3=Anunciante
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Error en el registro');
  }

  return data;
  // Retorna: { message, user: { id, email, nombre, apellido } }
};
```

**Respuesta exitosa:**
```json
{
  "message": "Usuario registrado exitosamente. Revisa tu email para verificar tu cuenta.",
  "user": {
    "id": "uuid-here",
    "email": "usuario@ejemplo.com",
    "nombre": "Juan",
    "apellido": "Pérez"
  }
}
```

**Nota:** Después del registro, el usuario recibirá un email con un enlace de verificación.

---

### 2. Login (Inicio de Sesión)

**Endpoint:** `POST /api/auth/login`

**Request:**
```javascript
const login = async (email, password) => {
  const response = await fetch('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Error en el login');
  }

  // Verificar si requiere 2FA
  if (data.requires2FA) {
    return {
      requires2FA: true,
      tempToken: data.tempToken,
      userId: data.userId
    };
  }

  // Login exitoso sin 2FA
  // Guardar tokens en localStorage o sessionStorage
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);

  return data;
};
```

**Respuesta sin 2FA:**
```json
{
  "message": "Login exitoso",
  "user": {
    "id": "uuid",
    "email": "usuario@ejemplo.com",
    "nombre": "Juan",
    "apellido": "Pérez",
    "rol": {
      "id": 1,
      "nombre": "Ciudadano"
    },
    "emailVerified": true
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900
}
```

**Respuesta con 2FA habilitado:**
```json
{
  "message": "Código 2FA requerido",
  "requires2FA": true,
  "userId": "uuid",
  "tempToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### 3. Obtener Perfil del Usuario

**Endpoint:** `GET /api/auth/me`

**Request:**
```javascript
const getProfile = async () => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch('http://localhost/api/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Error al obtener perfil');
  }

  return data.user;
};
```

**Respuesta:**
```json
{
  "user": {
    "id": "uuid",
    "email": "usuario@ejemplo.com",
    "nombre": "Juan",
    "apellido": "Pérez",
    "telefono": "+525512345678",
    "rol": {
      "id": 2,
      "nombre": "Abogado"
    },
    "emailVerified": true,
    "twoFactorEnabled": true,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 4. Logout (Cerrar Sesión)

**Endpoint:** `POST /api/auth/logout`

**Request:**
```javascript
const logout = async () => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch('http://localhost/api/auth/logout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  // Limpiar localStorage
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');

  return await response.json();
};
```

---

## 🌐 Login con Google (OAuth2)

### Flujo de OAuth2

```
1. Usuario hace clic en "Login con Google"
2. Redirigir a: http://localhost/api/auth/google
3. Google autentica al usuario
4. Google redirige a: http://localhost/api/auth/google/callback
5. Backend redirige a frontend con tokens en la URL
6. Frontend captura tokens y almacena
```

### Implementación en Frontend

**Opción 1: Redirigir directamente**

```javascript
const loginWithGoogle = () => {
  // Redirigir al endpoint de Google OAuth
  window.location.href = 'http://localhost/api/auth/google';
};
```

```html
<button onClick={loginWithGoogle}>
  Continuar con Google
</button>
```

**Opción 2: Popup (más moderno)**

```javascript
const loginWithGooglePopup = () => {
  const width = 500;
  const height = 600;
  const left = (window.innerWidth - width) / 2;
  const top = (window.innerHeight - height) / 2;

  const popup = window.open(
    'http://localhost/api/auth/google',
    'Google Login',
    `width=${width},height=${height},left=${left},top=${top}`
  );

  // Escuchar mensaje del popup
  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;

    if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
      const { accessToken, refreshToken, user } = event.data;

      // Guardar tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      // Cerrar popup
      popup.close();

      // Redirigir o actualizar UI
      window.location.href = '/dashboard';
    }
  }, { once: true });
};
```

### Página de Callback (ejemplo React)

```javascript
// pages/auth/callback.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function GoogleCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Obtener tokens de la URL
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const error = params.get('error');

    if (error) {
      console.error('Error en OAuth:', error);
      navigate('/login');
      return;
    }

    if (accessToken && refreshToken) {
      // Guardar tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      // Si es popup, enviar mensaje a la ventana padre
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_AUTH_SUCCESS',
          accessToken,
          refreshToken
        }, window.location.origin);
        window.close();
      } else {
        // Redirigir al dashboard
        navigate('/dashboard');
      }
    }
  }, [navigate]);

  return <div>Autenticando con Google...</div>;
}

export default GoogleCallback;
```

---

## ✉️ Verificación de Email

### 1. Reenviar Email de Verificación

**Endpoint:** `POST /api/auth/resend-verification`

```javascript
const resendVerification = async (email) => {
  const response = await fetch('http://localhost/api/auth/resend-verification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  return await response.json();
};
```

### 2. Verificar Email con Token

**Endpoint:** `POST /api/auth/verify-email`

El usuario recibe un email con un enlace como:
```
http://localhost:3000/verify-email?token=ABC123XYZ...
```

**Página de Verificación (React):**

```javascript
// pages/verify-email.jsx
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying | success | error

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token) => {
    try {
      const response = await fetch('http://localhost/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        // Redirigir al login después de 3 segundos
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    }
  };

  return (
    <div>
      {status === 'verifying' && <p>Verificando tu email...</p>}
      {status === 'success' && (
        <div>
          <h2>✅ Email Verificado</h2>
          <p>Tu email ha sido verificado exitosamente. Redirigiendo al login...</p>
        </div>
      )}
      {status === 'error' && (
        <div>
          <h2>❌ Error</h2>
          <p>El enlace de verificación es inválido o ha expirado.</p>
        </div>
      )}
    </div>
  );
}

export default VerifyEmail;
```

---

## 🔑 Recuperación de Contraseña

### 1. Solicitar Reset de Contraseña

**Endpoint:** `POST /api/auth/forgot-password`

**Formulario de "Olvidé mi contraseña":**

```javascript
// components/ForgotPasswordForm.jsx
import { useState } from 'react';

function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('✅ ' + data.message);
      } else {
        setMessage('❌ ' + data.message);
      }
    } catch (error) {
      setMessage('❌ Error al enviar email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Recuperar Contraseña</h2>
      <input
        type="email"
        placeholder="Tu email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Enviando...' : 'Enviar Email'}
      </button>
      {message && <p>{message}</p>}
    </form>
  );
}
```

### 2. Resetear Contraseña con Token

**Endpoint:** `POST /api/auth/reset-password`

El usuario recibe un email con un enlace como:
```
http://localhost:3000/reset-password?token=XYZ789ABC...
```

**Página de Reset (React):**

```javascript
// pages/reset-password.jsx
import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const token = searchParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage('❌ Las contraseñas no coinciden');
      return;
    }

    if (password.length < 8) {
      setMessage('❌ La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword: password
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('✅ Contraseña actualizada exitosamente. Redirigiendo...');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setMessage('❌ ' + data.message);
      }
    } catch (error) {
      setMessage('❌ Error al resetear contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return <div>❌ Token inválido</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Restablecer Contraseña</h2>

      <input
        type="password"
        placeholder="Nueva contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
      />

      <input
        type="password"
        placeholder="Confirmar contraseña"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        minLength={8}
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Guardando...' : 'Restablecer Contraseña'}
      </button>

      {message && <p>{message}</p>}
    </form>
  );
}

export default ResetPassword;
```

---

## 🔐 Autenticación de 2 Factores (2FA)

### 1. Configurar 2FA (Obtener QR Code)

**Endpoint:** `POST /api/auth/2fa/setup`

```javascript
// components/Setup2FA.jsx
import { useState } from 'react';

function Setup2FA() {
  const [qrCode, setQrCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const setup2FA = async () => {
    setLoading(true);
    const token = localStorage.getItem('accessToken');

    try {
      const response = await fetch('http://localhost/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (response.ok) {
        setQrCode(data.qrCodeUrl); // Data URL de la imagen
        setBackupCodes(data.backupCodes);
      }
    } catch (error) {
      console.error('Error al configurar 2FA:', error);
    } finally {
      setLoading(false);
    }
  };

  const enable2FA = async () => {
    const token = localStorage.getItem('accessToken');

    try {
      const response = await fetch('http://localhost/api/auth/2fa/enable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      });

      const data = await response.json();

      if (response.ok) {
        alert('✅ 2FA habilitado exitosamente');
      } else {
        alert('❌ Código inválido');
      }
    } catch (error) {
      alert('❌ Error al habilitar 2FA');
    }
  };

  return (
    <div>
      <h2>Configurar Autenticación de 2 Factores</h2>

      {!qrCode ? (
        <button onClick={setup2FA} disabled={loading}>
          {loading ? 'Configurando...' : 'Configurar 2FA'}
        </button>
      ) : (
        <div>
          <h3>Paso 1: Escanea este código QR</h3>
          <img src={qrCode} alt="QR Code 2FA" />
          <p>Usa Google Authenticator, Authy o similar</p>

          <h3>Paso 2: Códigos de Respaldo (GUÁRDALOS)</h3>
          <div style={{ backgroundColor: '#f0f0f0', padding: '10px' }}>
            {backupCodes.map((code, i) => (
              <div key={i}>{code}</div>
            ))}
          </div>

          <h3>Paso 3: Verifica el código</h3>
          <input
            type="text"
            placeholder="Código de 6 dígitos"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
          />
          <button onClick={enable2FA}>Habilitar 2FA</button>
        </div>
      )}
    </div>
  );
}

export default Setup2FA;
```

### 2. Login con 2FA

**Flujo:**
1. Usuario ingresa email/password → Backend responde `requires2FA: true`
2. Frontend muestra campo para código 2FA
3. Usuario ingresa código → Backend verifica y retorna tokens

```javascript
// components/LoginWith2FA.jsx
import { useState } from 'react';

function LoginWith2FA() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [code, setCode] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();

    const response = await fetch('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (data.requires2FA) {
      setRequires2FA(true);
      setTempToken(data.tempToken);
    } else {
      // Login exitoso sin 2FA
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      window.location.href = '/dashboard';
    }
  };

  const verify2FA = async (e) => {
    e.preventDefault();

    const response = await fetch('http://localhost/api/auth/2fa/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tempToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      window.location.href = '/dashboard';
    } else {
      alert('Código inválido');
    }
  };

  if (requires2FA) {
    return (
      <form onSubmit={verify2FA}>
        <h2>Código de Verificación</h2>
        <p>Ingresa el código de tu app de autenticación</p>
        <input
          type="text"
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={6}
        />
        <button type="submit">Verificar</button>
      </form>
    );
  }

  return (
    <form onSubmit={handleLogin}>
      <h2>Iniciar Sesión</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Ingresar</button>
    </form>
  );
}

export default LoginWith2FA;
```

---

## 🔄 Gestión de Tokens

### Refrescar Access Token

Los access tokens expiran en 15 minutos. Usa el refresh token para obtener uno nuevo:

```javascript
const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');

  try {
    const response = await fetch('http://localhost/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      return data.accessToken;
    } else {
      // Refresh token inválido, redirigir a login
      localStorage.clear();
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('Error al refrescar token:', error);
    window.location.href = '/login';
  }
};
```

### Interceptor de Axios (Recomendado)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost/api'
});

// Interceptor para agregar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para refrescar token en 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

---

## 📱 Ejemplos de Código Completo

### Context de Autenticación (React)

```javascript
// context/AuthContext.jsx
import { createContext, useState, useEffect, useContext } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      localStorage.clear();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });

    if (response.data.requires2FA) {
      return { requires2FA: true, tempToken: response.data.tempToken };
    }

    localStorage.setItem('accessToken', response.data.accessToken);
    localStorage.setItem('refreshToken', response.data.refreshToken);
    setUser(response.data.user);

    return { requires2FA: false };
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      localStorage.clear();
      setUser(null);
    }
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
```

### Protected Route

```javascript
// components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requiredRole && user.rol.nombre !== requiredRole) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
}

export default ProtectedRoute;
```

### Uso en App

```javascript
// App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import VerifyEmail from './pages/VerifyEmail';
import ResetPassword from './pages/ResetPassword';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="Admin">
                <AdminPanel />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
```

---

## 🎯 Checklist de Implementación

### Backend (Ya está listo ✅)
- ✅ Todos los endpoints implementados
- ✅ Validación de datos
- ✅ Seguridad (JWT, bcrypt, rate limiting)
- ⚠️ Pendiente: Configurar credenciales SMTP y Google OAuth

### Frontend (Por implementar)
- [ ] Instalar dependencias (axios, react-router-dom, etc.)
- [ ] Crear AuthContext
- [ ] Crear páginas: Login, Register, VerifyEmail, ResetPassword
- [ ] Implementar interceptores de Axios
- [ ] Crear componente ProtectedRoute
- [ ] Implementar login con Google (botón + callback)
- [ ] Implementar 2FA (setup + verify)
- [ ] Agregar manejo de errores
- [ ] Implementar refresh token automático

---

## 🔒 Seguridad Frontend

### Mejores Prácticas

1. **Nunca almacenar datos sensibles en localStorage sin cifrar**
2. **Usar HTTPS en producción**
3. **Validar datos antes de enviarlos al backend**
4. **Implementar CSRF protection si usas cookies**
5. **No exponer tokens en la URL (excepto callbacks OAuth)**
6. **Limpiar tokens al hacer logout**
7. **Implementar timeout de sesión**

### Ejemplo de Validación Frontend

```javascript
const validatePassword = (password) => {
  const errors = [];

  if (password.length < 8) {
    errors.push('Mínimo 8 caracteres');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Debe contener mayúsculas');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Debe contener minúsculas');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Debe contener números');
  }

  return errors;
};
```

---

## 📚 Recursos Adicionales

- **Documentación de Google OAuth2:** https://developers.google.com/identity/protocols/oauth2
- **Google Authenticator:** https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2
- **Postman Collection:** Puedes importar los endpoints en Postman para probarlos

---

## 🆘 Problemas Comunes

### 1. CORS Error
**Solución:** Asegúrate de configurar `CORS_ORIGIN` en docker-compose.yml con tu URL de frontend.

### 2. Token Expirado
**Solución:** Implementa el refresh token automático con interceptores.

### 3. Email no llega
**Solución:** Verifica que SMTP_USER y SMTP_PASSWORD estén correctos. Revisa spam.

### 4. Google OAuth no funciona
**Solución:** Verifica que la URL de callback esté registrada en Google Cloud Console.

---

**¿Necesitas ayuda adicional?** Consulta los logs del servicio:
```bash
docker logs lexia-auth -f
```