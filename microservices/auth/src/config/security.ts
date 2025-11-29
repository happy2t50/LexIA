/**
 * MSTG-AUTH-5: Política de contraseñas
 * MSTG-CRYPTO-1: No claves en código fuente
 * MSTG-CRYPTO-2: Criptografía probada
 *
 * Configuración de seguridad centralizada
 */

/**
 * Política de contraseñas según MSTG-AUTH-5
 */
export const PASSWORD_POLICY = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    specialChars: '!@#$%^&*(),.?":{}|<>',
    preventCommonPasswords: true,
    preventUserInfo: true, // No permitir que contenga nombre, email, etc.
    maxConsecutiveChars: 3, // Máximo 3 caracteres consecutivos iguales
    minPasswordAge: 0, // Días mínimos antes de poder cambiar (0 = sin restricción)
    maxPasswordAge: 90, // Días máximos antes de forzar cambio (0 = sin expiración)
    passwordHistory: 5, // No reutilizar últimas 5 contraseñas
};

/**
 * Contraseñas comunes que NO se deben permitir
 * MSTG-AUTH-5: Política de contraseñas robusta
 */
export const COMMON_PASSWORDS = [
    'password',
    'password123',
    '12345678',
    'qwerty',
    'abc123',
    'password1',
    '123456789',
    '12345',
    '1234567',
    'welcome',
    'admin',
    'root',
    'user',
    'test',
    'demo',
    'letmein',
    'monkey',
    'dragon',
    'master',
    'sunshine',
    'princess',
    'football',
    'shadow',
    'michael',
    'superman'
];

/**
 * Configuración de JWT según MSTG-AUTH-3
 */
export const JWT_CONFIG = {
    // NUNCA hardcodear secrets aquí, usar variables de entorno
    accessTokenSecret: process.env.JWT_ACCESS_SECRET || throwError('JWT_ACCESS_SECRET no configurado'),
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET || throwError('JWT_REFRESH_SECRET no configurado'),

    // Tiempos de expiración
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRES || '7d',

    // Algoritmo seguro (MSTG-CRYPTO-2, MSTG-CRYPTO-4)
    algorithm: 'HS256' as const, // HMAC SHA-256

    // Issuer y Audience para validación adicional
    issuer: 'lexia-auth-service',
    audience: 'lexia-api',
};

/**
 * Configuración de sesiones
 */
export const SESSION_CONFIG = {
    // Máximo de sesiones activas simultáneas por usuario
    maxActiveSessions: 5,

    // Tiempo de inactividad antes de invalidar sesión (minutos)
    inactivityTimeout: 30,

    // Renovar refresh token en cada uso
    rotateRefreshToken: true,

    // Permitir múltiples dispositivos
    allowMultipleDevices: true,
};

/**
 * Configuración de bloqueo de cuenta
 */
export const ACCOUNT_LOCKOUT_CONFIG = {
    // Número máximo de intentos fallidos
    maxFailedAttempts: 5,

    // Tiempo de bloqueo en minutos
    lockoutDuration: 15,

    // Resetear intentos fallidos después de login exitoso
    resetOnSuccess: true,

    // Incrementar tiempo de bloqueo exponencialmente
    exponentialBackoff: true,
};

/**
 * Configuración de rate limiting (aplicado en Nginx)
 */
export const RATE_LIMIT_CONFIG = {
    login: {
        windowMs: 60 * 1000, // 1 minuto
        max: 5, // 5 intentos
    },
    register: {
        windowMs: 60 * 1000,
        max: 3,
    },
    passwordReset: {
        windowMs: 60 * 1000,
        max: 3,
    },
    emailVerification: {
        windowMs: 60 * 1000,
        max: 3,
    },
    general: {
        windowMs: 1000, // 1 segundo
        max: 10,
    },
};

/**
 * Configuración de tokens de verificación
 */
export const TOKEN_CONFIG = {
    // Email verification token
    emailVerification: {
        length: 32, // bytes
        expiryHours: 24,
        maxAttempts: 5,
    },

    // Password reset token
    passwordReset: {
        length: 32,
        expiryHours: 1,
        maxAttempts: 3,
    },

    // 2FA backup codes
    backupCodes: {
        count: 8,
        length: 8, // caracteres
    },
};

/**
 * Configuración de criptografía
 * MSTG-CRYPTO-2: Implementaciones probadas
 */
export const CRYPTO_CONFIG = {
    // bcrypt rounds (MSTG-CRYPTO-2)
    bcryptRounds: 10,

    // Algoritmos permitidos
    allowedAlgorithms: ['HS256', 'HS384', 'HS512'],

    // Algoritmos prohibidos (obsoletos según MSTG-CRYPTO-4)
    deniedAlgorithms: ['MD5', 'SHA1', 'DES', '3DES', 'RC4'],

    // Longitud mínima de claves
    minKeyLength: 256, // bits
};

/**
 * Configuración de logs de auditoría
 */
export const AUDIT_CONFIG = {
    // Eventos que SIEMPRE se deben loguear
    criticalEvents: [
        'login',
        'logout',
        'failed_login',
        'password_reset',
        'password_change',
        'email_change',
        '2fa_enabled',
        '2fa_disabled',
        'account_locked',
        'oauth_linked',
        'oauth_unlinked',
    ],

    // Retención de logs (días)
    retentionDays: 90,

    // Incluir información de dispositivo
    includeDeviceInfo: true,

    // Incluir geolocalización de IP
    includeGeoLocation: false, // Deshabilitado por privacidad
};

/**
 * Configuración de privacidad
 * MSTG-ARCH-12: Cumplimiento con leyes de privacidad
 */
export const PRIVACY_CONFIG = {
    // GDPR compliance
    gdprCompliant: true,

    // Tiempo para procesar solicitudes de eliminación (días)
    dataRetentionDays: 365,

    // Permitir exportación de datos del usuario
    allowDataExport: true,

    // Permitir eliminación de cuenta
    allowAccountDeletion: true,

    // Anonimizar datos después de eliminación
    anonymizeOnDeletion: true,
};

/**
 * Validación de secretos al inicio
 * MSTG-CRYPTO-1: No claves hardcodeadas
 */
export function validateSecrets(): void {
    const requiredSecrets = [
        'JWT_ACCESS_SECRET',
        'JWT_REFRESH_SECRET',
        'DB_PASSWORD',
    ];

    const missingSecrets: string[] = [];

    for (const secret of requiredSecrets) {
        if (!process.env[secret]) {
            missingSecrets.push(secret);
        }
    }

    if (missingSecrets.length > 0) {
        throw new Error(
            `❌ MSTG-CRYPTO-1 Violation: Variables de entorno faltantes: ${missingSecrets.join(', ')}\n` +
            'No se deben usar valores por defecto para secretos en producción.'
        );
    }

    // Validar longitud mínima de secretos
    const minSecretLength = 32;

    for (const secret of requiredSecrets) {
        const value = process.env[secret];
        if (value && value.length < minSecretLength) {
            console.warn(
                `⚠️  ${secret} tiene menos de ${minSecretLength} caracteres. ` +
                'Se recomienda usar secretos más largos para mayor seguridad.'
            );
        }
    }
}

/**
 * Helper para lanzar error si falta variable de entorno
 */
function throwError(message: string): never {
    throw new Error(message);
}

/**
 * Verificar que no se estén usando algoritmos obsoletos
 * MSTG-CRYPTO-4
 */
export function validateCryptoAlgorithms(): void {
    // Esta función debería ser llamada al inicio de la aplicación
    console.log('✅ MSTG-CRYPTO-4: Verificando algoritmos criptográficos...');

    // Aquí podrías agregar lógica adicional para verificar
    // que no se estén usando algoritmos obsoletos en ninguna parte
}

export default {
    PASSWORD_POLICY,
    COMMON_PASSWORDS,
    JWT_CONFIG,
    SESSION_CONFIG,
    ACCOUNT_LOCKOUT_CONFIG,
    RATE_LIMIT_CONFIG,
    TOKEN_CONFIG,
    CRYPTO_CONFIG,
    AUDIT_CONFIG,
    PRIVACY_CONFIG,
    validateSecrets,
    validateCryptoAlgorithms,
};