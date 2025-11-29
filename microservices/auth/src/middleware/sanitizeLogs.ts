/**
 * MSTG-STORAGE-3: No se escribe información sensible en los logs
 *
 * Middleware para sanitizar logs y prevenir exposición de datos sensibles
 */

export interface SanitizeConfig {
    sensitiveFields: string[];
    replacementText: string;
}

const DEFAULT_SENSITIVE_FIELDS = [
    'password',
    'passwordHash',
    'password_hash',
    'newPassword',
    'oldPassword',
    'token',
    'refreshToken',
    'accessToken',
    'secret',
    'apiKey',
    'api_key',
    'privateKey',
    'private_key',
    'creditCard',
    'credit_card',
    'cvv',
    'ssn',
    'authorization',
    'cookie',
    'session',
    'smtp_password',
    'SMTP_PASSWORD',
    'db_password',
    'DB_PASSWORD',
    'jwt_secret',
    'JWT_SECRET',
    'backup_codes',
    'backupCodes'
];

const DEFAULT_REPLACEMENT = '[REDACTED]';

/**
 * Sanitiza un objeto removiendo campos sensibles
 */
export function sanitizeObject(
    obj: any,
    config: Partial<SanitizeConfig> = {}
): any {
    const sensitiveFields = config.sensitiveFields || DEFAULT_SENSITIVE_FIELDS;
    const replacement = config.replacementText || DEFAULT_REPLACEMENT;

    if (obj === null || obj === undefined) {
        return obj;
    }

    if (typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item, config));
    }

    const sanitized: any = {};

    for (const [key, value] of Object.entries(obj)) {
        // Verificar si el campo es sensible (case-insensitive)
        const isSensitive = sensitiveFields.some(
            field => key.toLowerCase().includes(field.toLowerCase())
        );

        if (isSensitive) {
            sanitized[key] = replacement;
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value, config);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}

/**
 * Sanitiza parámetros de URL removiendo tokens y claves
 */
export function sanitizeUrl(url: string): string {
    try {
        const urlObj = new URL(url, 'http://dummy.com');
        const params = urlObj.searchParams;

        // Sanitizar parámetros sensibles
        for (const key of params.keys()) {
            if (DEFAULT_SENSITIVE_FIELDS.some(field =>
                key.toLowerCase().includes(field.toLowerCase())
            )) {
                params.set(key, DEFAULT_REPLACEMENT);
            }
        }

        return url.split('?')[0] + (params.toString() ? '?' + params.toString() : '');
    } catch (error) {
        return url;
    }
}

/**
 * Sanitiza headers HTTP removiendo Authorization, Cookie, etc.
 */
export function sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };

    const sensitiveHeaders = [
        'authorization',
        'cookie',
        'set-cookie',
        'x-api-key',
        'x-auth-token'
    ];

    for (const header of sensitiveHeaders) {
        if (sanitized[header]) {
            sanitized[header] = DEFAULT_REPLACEMENT;
        }
    }

    return sanitized;
}

/**
 * Logger seguro que sanitiza automáticamente
 */
export class SecureLogger {
    private prefix: string;

    constructor(prefix: string = '') {
        this.prefix = prefix;
    }

    private formatMessage(level: string, message: string, data?: any): string {
        const timestamp = new Date().toISOString();
        const prefix = this.prefix ? `[${this.prefix}]` : '';
        let logMessage = `[${timestamp}] ${level.toUpperCase()} ${prefix} ${message}`;

        if (data) {
            const sanitized = sanitizeObject(data);
            logMessage += '\n' + JSON.stringify(sanitized, null, 2);
        }

        return logMessage;
    }

    info(message: string, data?: any): void {
        console.log(this.formatMessage('info', message, data));
    }

    warn(message: string, data?: any): void {
        console.warn(this.formatMessage('warn', message, data));
    }

    error(message: string, data?: any): void {
        console.error(this.formatMessage('error', message, data));
    }

    debug(message: string, data?: any): void {
        if (process.env.NODE_ENV !== 'production') {
            console.debug(this.formatMessage('debug', message, data));
        }
    }

    /**
     * Log específico para eventos de seguridad
     */
    security(event: string, data?: any): void {
        const sanitized = sanitizeObject(data);
        console.log(this.formatMessage('security', event, sanitized));
    }
}

/**
 * Instancia global del logger seguro
 */
export const logger = new SecureLogger('AUTH');

/**
 * Middleware Express para logging seguro de requests
 */
export function requestLogger(req: any, res: any, next: any): void {
    const start = Date.now();

    // Log de request (sanitizado)
    logger.info('Incoming request', {
        method: req.method,
        path: sanitizeUrl(req.originalUrl || req.url),
        ip: req.ip,
        userAgent: req.headers['user-agent']
        // NO incluimos headers completos para evitar tokens
    });

    // Log de response cuando termine
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('Response sent', {
            method: req.method,
            path: sanitizeUrl(req.originalUrl || req.url),
            statusCode: res.statusCode,
            duration: `${duration}ms`
        });
    });

    next();
}

export default logger;