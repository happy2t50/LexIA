import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractTokenFromHeader, TokenPayload } from '../utils/jwt';

// Extender Request de Express para incluir el usuario autenticado
declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
        }
    }
}

/**
 * Middleware para verificar que el usuario esté autenticado
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
    try {
        // Extraer token del header Authorization
        const token = extractTokenFromHeader(req.headers.authorization);

        if (!token) {
            res.status(401).json({
                error: 'No autenticado',
                message: 'Token de acceso requerido'
            });
            return;
        }

        // Verificar token
        const payload = verifyAccessToken(token);

        if (!payload) {
            res.status(401).json({
                error: 'Token inválido',
                message: 'El token de acceso es inválido o ha expirado'
            });
            return;
        }

        // Agregar usuario al request
        req.user = payload;

        next();
    } catch (error) {
        res.status(401).json({
            error: 'Error de autenticación',
            message: 'No se pudo verificar el token'
        });
    }
}

/**
 * Middleware para verificar que el usuario tenga un rol específico
 */
export function requireRole(...allowedRoles: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                error: 'No autenticado',
                message: 'Debes estar autenticado para acceder a este recurso'
            });
            return;
        }

        if (!allowedRoles.includes(req.user.rol)) {
            res.status(403).json({
                error: 'Acceso denegado',
                message: `Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`
            });
            return;
        }

        next();
    };
}

/**
 * Middleware para verificar que el usuario sea admin
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
    return requireRole('admin')(req, res, next);
}

/**
 * Middleware opcional de autenticación (no falla si no hay token)
 */
export function optionalAuthenticate(req: Request, res: Response, next: NextFunction): void {
    try {
        const token = extractTokenFromHeader(req.headers.authorization);

        if (token) {
            const payload = verifyAccessToken(token);
            if (payload) {
                req.user = payload;
            }
        }

        next();
    } catch (error) {
        // Continuar sin autenticación
        next();
    }
}