import { Request, Response, NextFunction } from 'express';
import { validationResult, body } from 'express-validator';

/**
 * Middleware para manejar errores de validación
 */
export function handleValidationErrors(req: Request, res: Response, next: NextFunction): void {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        res.status(400).json({
            error: 'Errores de validación',
            errors: errors.array().map(err => ({
                field: err.type === 'field' ? err.path : undefined,
                message: err.msg
            }))
        });
        return;
    }

    next();
}

/**
 * Reglas de validación para registro
 */
export const registerValidation = [
    body('email')
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 8 })
        .withMessage('La contraseña debe tener al menos 8 caracteres'),
    body('nombre')
        .trim()
        .notEmpty()
        .withMessage('El nombre es requerido')
        .isLength({ min: 2, max: 50 })
        .withMessage('El nombre debe tener entre 2 y 50 caracteres'),
    body('apellido')
        .trim()
        .notEmpty()
        .withMessage('El apellido es requerido')
        .isLength({ min: 2, max: 50 })
        .withMessage('El apellido debe tener entre 2 y 50 caracteres'),
    body('telefono')
        .optional()
        .trim()
        .matches(/^[0-9]{10}$/)
        .withMessage('El teléfono debe tener 10 dígitos'),
    handleValidationErrors
];

/**
 * Reglas de validación para login
 */
export const loginValidation = [
    body('email')
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('La contraseña es requerida'),
    handleValidationErrors
];

/**
 * Reglas de validación para refresh token
 */
export const refreshTokenValidation = [
    body('refreshToken')
        .notEmpty()
        .withMessage('Refresh token es requerido'),
    handleValidationErrors
];

/**
 * Reglas de validación para reset de contraseña
 */
export const passwordResetValidation = [
    body('token')
        .notEmpty()
        .withMessage('Token es requerido'),
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('La contraseña debe tener al menos 8 caracteres'),
    handleValidationErrors
];

/**
 * Reglas de validación para solicitar reset de contraseña
 */
export const requestPasswordResetValidation = [
    body('email')
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail(),
    handleValidationErrors
];

/**
 * Reglas de validación para verificar email
 */
export const verifyEmailValidation = [
    body('token')
        .notEmpty()
        .withMessage('Token es requerido'),
    handleValidationErrors
];

/**
 * Reglas de validación para código 2FA
 */
export const twoFactorCodeValidation = [
    body('code')
        .notEmpty()
        .withMessage('Código 2FA es requerido')
        .isLength({ min: 6, max: 6 })
        .withMessage('El código debe tener 6 dígitos'),
    handleValidationErrors
];