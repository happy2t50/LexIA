import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import OAuthService from './services/OAuthService';
import securityHeaders, { forceHTTPS } from './middleware/securityHeaders';
import { requestLogger } from './middleware/sanitizeLogs';
import { validateSecrets, validateCryptoAlgorithms } from './config/security';

// Cargar variables de entorno
dotenv.config();

// =====================================================
// MSTG-CRYPTO-1: Validar que todos los secretos estén configurados
// =====================================================
try {
    validateSecrets();
    validateCryptoAlgorithms();
} catch (error: any) {
    console.error('❌ Error de configuración de seguridad:', error.message);
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3008;

// =====================================================
// MIDDLEWARES DE SEGURIDAD (ORDEN IMPORTANTE)
// =====================================================

// MSTG-ARCH-2: Headers de seguridad HTTP
app.use(securityHeaders);

// MSTG-NETWORK-1: Forzar HTTPS en producción
if (process.env.NODE_ENV === 'production') {
    app.use(forceHTTPS);
}

// MSTG-ARCH-2: CORS está manejado por nginx, no duplicar aquí
// Si el servicio se ejecuta directamente (sin nginx), descomentar esto:
/*
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:8080'];
app.use(validateOrigin(allowedOrigins));

app.use(cors({
    origin: (origin: string | undefined, callback) => {
        if (!origin) return callback(null, true);
        if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('No permitido por CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Total-Count'],
    maxAge: 600
}));
*/

// Body parsers con límite de tamaño (prevenir DoS)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// MSTG-STORAGE-3: Logging seguro (sin información sensible)
app.use(requestLogger);

// Inicializar Passport para OAuth
const passport = OAuthService.getPassport();
app.use(passport.initialize());

// =====================================================
// RUTAS
// =====================================================

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        service: 'auth-service',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        features: {
            jwt: true,
            oauth2: !!process.env.GOOGLE_CLIENT_ID,
            twoFactor: true,
            emailVerification: !!process.env.SMTP_USER,
            passwordReset: !!process.env.SMTP_USER
        }
    });
});

// Rutas de autenticación
app.use('/', authRoutes);

// =====================================================
// MANEJO DE ERRORES
// =====================================================

// Ruta no encontrada
app.use((req: Request, res: Response) => {
    res.status(404).json({
        error: 'Ruta no encontrada',
        path: req.path,
        method: req.method
    });
});

// Manejo global de errores
app.use((err: any, req: Request, res: Response, next: any) => {
    console.error('Error no manejado:', err);

    res.status(err.status || 500).json({
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'production' ? 'Ha ocurrido un error' : err.message
    });
});

// =====================================================
// INICIAR SERVIDOR
// =====================================================

app.listen(PORT, () => {
    console.log('========================================');
    console.log('  🔐 Auth Service v2.0');
    console.log('========================================');
    console.log(`✅ Servidor corriendo en puerto ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('');
    console.log('Funcionalidades:');
    console.log(`  ✅ JWT Authentication (Access + Refresh)`);
    console.log(`  ${process.env.GOOGLE_CLIENT_ID ? '✅' : '⚠️ '} OAuth2 Google`);
    console.log(`  ✅ Two-Factor Authentication (TOTP)`);
    console.log(`  ${process.env.SMTP_USER ? '✅' : '⚠️ '} Email Verification`);
    console.log(`  ${process.env.SMTP_USER ? '✅' : '⚠️ '} Password Recovery`);
    console.log(`  ✅ Rate Limiting (via Nginx)`);
    console.log(`  ✅ Auth Logs & Audit`);
    console.log('');
    console.log('Endpoints:');
    console.log(`  POST   /register`);
    console.log(`  POST   /login`);
    console.log(`  POST   /refresh`);
    console.log(`  POST   /logout`);
    console.log(`  GET    /me`);
    console.log(`  POST   /verify-email`);
    console.log(`  POST   /forgot-password`);
    console.log(`  POST   /reset-password`);
    console.log(`  GET    /google`);
    console.log(`  GET    /google/callback`);
    console.log(`  POST   /2fa/setup`);
    console.log(`  POST   /2fa/enable`);
    console.log(`  POST   /2fa/verify`);
    console.log(`  GET    /health`);
    console.log('========================================');
});

// Manejo de señales de terminación
process.on('SIGTERM', () => {
    console.log('SIGTERM recibido, cerrando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT recibido, cerrando servidor...');
    process.exit(0);
});

export default app;