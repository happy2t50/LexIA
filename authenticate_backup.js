"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
exports.authenticate = authenticate;
exports.requireRole = requireRole;
exports.requireAdmin = requireAdmin;
exports.optionalAuthenticate = optionalAuthenticate;
const jwt_1 = require("../utils/jwt");
/**
 * Middleware para verificar que el usuario esté autenticado
 */
function authenticate(req, res, next) {
    try {
        // Extraer token del header Authorization
        const token = (0, jwt_1.extractTokenFromHeader)(req.headers.authorization);
        if (!token) {
            res.status(401).json({
                error: 'No autenticado',
                message: 'Token de acceso requerido'
            });
            return;
        }
        // Verificar token
        const payload = (0, jwt_1.verifyAccessToken)(token);
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
    }
    catch (error) {
        res.status(401).json({
            error: 'Error de autenticación',
            message: 'No se pudo verificar el token'
        });
    }
}
/**
 * Middleware para verificar que el usuario tenga un rol específico
 */
function requireRole(...allowedRoles) {
    return (req, res, next) => {
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
 * Alias para authenticate (compatibilidad)
 */
exports.requireAuth = authenticate;
/**
 * Middleware combinado para autenticar Y verificar que sea admin
 */
function requireAdmin(req, res, next) {
    authenticate(req, res, () => {
        if (!req.user) {
            res.status(401).json({
                error: 'No autenticado',
                message: 'Debes estar autenticado'
            });
            return;
        }
        if (req.user.rol !== 'admin') {
            res.status(403).json({
                error: 'Acceso denegado',
                message: 'Se requiere rol de administrador'
            });
            return;
        }
        next();
    });
}
/**
 * Middleware opcional de autenticación (no falla si no hay token)
 */
function optionalAuthenticate(req, res, next) {
    try {
        const token = (0, jwt_1.extractTokenFromHeader)(req.headers.authorization);
        if (token) {
            const payload = (0, jwt_1.verifyAccessToken)(token);
            if (payload) {
                req.user = payload;
            }
        }
        next();
    }
    catch (error) {
        // Continuar sin autenticación
        next();
    }
}
