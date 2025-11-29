/**
 * MSTG-ARCH-2: Controles de seguridad en servidor
 * MSTG-NETWORK-1: Canal seguro consistente
 *
 * Middleware para configurar headers de seguridad HTTP
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Headers de seguridad recomendados
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
    // Prevenir clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevenir MIME-sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // XSS Protection (legacy, pero útil para navegadores viejos)
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Content Security Policy
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'"
    );

    // Referrer Policy - no enviar información sensible en referer
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy (antes Feature-Policy)
    res.setHeader(
        'Permissions-Policy',
        'geolocation=(), microphone=(), camera=(), payment=()'
    );

    // HSTS (HTTP Strict Transport Security) - SOLO si usas HTTPS
    if (process.env.NODE_ENV === 'production' && req.secure) {
        res.setHeader(
            'Strict-Transport-Security',
            'max-age=31536000; includeSubDomains; preload'
        );
    }

    // Prevenir información del servidor
    res.removeHeader('X-Powered-By');

    next();
}

/**
 * MSTG-NETWORK-1: Forzar HTTPS en producción
 */
export function forceHTTPS(req: Request, res: Response, next: NextFunction): void {
    if (process.env.NODE_ENV === 'production') {
        // Verificar si la petición viene por HTTP
        if (!req.secure && req.headers['x-forwarded-proto'] !== 'https') {
            return res.status(403).json({
                error: 'HTTPS requerido',
                message: 'Esta API solo acepta conexiones HTTPS en producción'
            });
        }
    }

    next();
}

/**
 * MSTG-ARCH-2: Validar origen de peticiones
 */
export function validateOrigin(allowedOrigins: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const origin = req.headers.origin;

        // Si no hay origin (peticiones del mismo origen o herramientas como curl), permitir
        if (!origin) {
            return next();
        }

        // Verificar si el origin está en la lista permitida
        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            return next();
        }

        // Origin no autorizado
        res.status(403).json({
            error: 'Origin no autorizado',
            message: 'Tu origen no está autorizado para acceder a esta API'
        });
    };
}

/**
 * Prevenir ataques de timing en comparaciones
 * Útil para validar tokens sin revelar información por tiempo de respuesta
 */
export function constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
}

export default securityHeaders;