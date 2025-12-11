"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireRole = requireRole;
exports.requireAdmin = requireAdmin;
exports.optionalAuthenticate = optionalAuthenticate;
var jwt_1 = require("../utils/jwt");
/**
 * Middleware para verificar que el usuario esté autenticado
 */
function authenticate(req, res, next) {
    try {
        // Extraer token del header Authorization
        var token = (0, jwt_1.extractTokenFromHeader)(req.headers.authorization);
        if (!token) {
            res.status(401).json({
                error: 'No autenticado',
                message: 'Token de acceso requerido'
            });
            return;
        }
        // Verificar token
        var payload = (0, jwt_1.verifyAccessToken)(token);
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
function requireRole() {
    var allowedRoles = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        allowedRoles[_i] = arguments[_i];
    }
    return function (req, res, next) {
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
                message: "Se requiere uno de los siguientes roles: ".concat(allowedRoles.join(', '))
            });
            return;
        }
        next();
    };
}
/**
 * Middleware para verificar que el usuario sea admin
 */
function requireAdmin(req, res, next) {
    return requireRole('admin')(req, res, next);
}
/**
 * Middleware opcional de autenticación (no falla si no hay token)
 */
function optionalAuthenticate(req, res, next) {
    try {
        var token = (0, jwt_1.extractTokenFromHeader)(req.headers.authorization);
        if (token) {
            var payload = (0, jwt_1.verifyAccessToken)(token);
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
