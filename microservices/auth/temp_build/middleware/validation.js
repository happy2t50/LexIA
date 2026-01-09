"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.twoFactorCodeValidation = exports.verifyEmailValidation = exports.requestPasswordResetValidation = exports.passwordResetValidation = exports.refreshTokenValidation = exports.loginValidation = exports.registerValidation = void 0;
exports.handleValidationErrors = handleValidationErrors;
exports.normalizeApellidosField = normalizeApellidosField;
var express_validator_1 = require("express-validator");
/**
 * Middleware para manejar errores de validación
 */
function handleValidationErrors(req, res, next) {
    var errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({
            error: 'Errores de validación',
            errors: errors.array().map(function (err) { return ({
                field: err.type === 'field' ? err.path : undefined,
                message: err.msg
            }); })
        });
        return;
    }
    next();
}
/**
 * Middleware para normalizar campos de apellidos
 * Convierte 'apellidos' a 'apellido' si no existe
 */
function normalizeApellidosField(req, res, next) {
    console.log('🔄 Normalizando apellidos:', JSON.stringify(req.body, null, 2));
    if (req.body.apellidos && !req.body.apellido) {
        req.body.apellido = req.body.apellidos;
        console.log('✅ Convertido apellidos -> apellido:', req.body.apellido);
    }
    else if (req.body.apellidos && req.body.apellido) {
        console.log('ℹ️ Ambos campos presentes, usando apellido:', req.body.apellido);
    }
    console.log('📦 Body después de normalización:', JSON.stringify(req.body, null, 2));
    next();
}
/**
 * Reglas de validación para registro
 */
exports.registerValidation = [
    normalizeApellidosField, // Normalizar apellidos -> apellido
    (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail(),
    (0, express_validator_1.body)('password')
        .isLength({ min: 8 })
        .withMessage('La contraseña debe tener al menos 8 caracteres'),
    (0, express_validator_1.body)('nombre')
        .trim()
        .notEmpty()
        .withMessage('El nombre es requerido')
        .isLength({ min: 2, max: 50 })
        .withMessage('El nombre debe tener entre 2 y 50 caracteres'),
    (0, express_validator_1.body)('apellido')
        .trim()
        .notEmpty()
        .withMessage('El apellido es requerido')
        .isLength({ min: 2, max: 50 })
        .withMessage('El apellido debe tener entre 2 y 50 caracteres'),
    (0, express_validator_1.body)('apellidos')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Los apellidos deben tener entre 2 y 50 caracteres'),
    (0, express_validator_1.body)('telefono')
        .optional()
        .trim()
        .matches(/^[0-9]{10}$/)
        .withMessage('El teléfono debe tener 10 dígitos'),
    handleValidationErrors
];
/**
 * Reglas de validación para login
 */
exports.loginValidation = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail(),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('La contraseña es requerida'),
    handleValidationErrors
];
/**
 * Reglas de validación para refresh token
 */
exports.refreshTokenValidation = [
    (0, express_validator_1.body)('refreshToken')
        .notEmpty()
        .withMessage('Refresh token es requerido'),
    handleValidationErrors
];
/**
 * Reglas de validación para reset de contraseña
 */
exports.passwordResetValidation = [
    (0, express_validator_1.body)('token')
        .notEmpty()
        .withMessage('Token es requerido'),
    (0, express_validator_1.body)('newPassword')
        .isLength({ min: 8 })
        .withMessage('La contraseña debe tener al menos 8 caracteres'),
    handleValidationErrors
];
/**
 * Reglas de validación para solicitar reset de contraseña
 */
exports.requestPasswordResetValidation = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail(),
    handleValidationErrors
];
/**
 * Reglas de validación para verificar email
 */
exports.verifyEmailValidation = [
    (0, express_validator_1.body)('token')
        .notEmpty()
        .withMessage('Token es requerido'),
    handleValidationErrors
];
/**
 * Reglas de validación para código 2FA
 */
exports.twoFactorCodeValidation = [
    (0, express_validator_1.body)('code')
        .notEmpty()
        .withMessage('Código 2FA es requerido')
        .isLength({ min: 6, max: 6 })
        .withMessage('El código debe tener 6 dígitos'),
    handleValidationErrors
];
