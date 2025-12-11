"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var AuthController_1 = require("../controllers/AuthController");
var TwoFactorController_1 = require("../controllers/TwoFactorController");
var OAuthController_1 = require("../controllers/OAuthController");
var authenticate_1 = require("../middleware/authenticate");
var validation_1 = require("../middleware/validation");
var router = (0, express_1.Router)();
// =====================================================
// RUTAS PÚBLICAS (sin autenticación)
// =====================================================
/**
 * @route POST /api/auth/register
 * @desc Registrar nuevo usuario
 * @access Public
 */
router.post('/register', validation_1.registerValidation, AuthController_1.default.register);
/**
 * @route POST /api/auth/login
 * @desc Iniciar sesión
 * @access Public
 */
router.post('/login', validation_1.loginValidation, AuthController_1.default.login);
/**
 * @route POST /api/auth/refresh
 * @desc Refrescar access token
 * @access Public
 */
router.post('/refresh', validation_1.refreshTokenValidation, AuthController_1.default.refresh);
/**
 * @route POST /api/auth/verify-email
 * @desc Verificar email con token (POST)
 * @access Public
 */
router.post('/verify-email', validation_1.verifyEmailValidation, AuthController_1.default.verifyEmail);
/**
 * @route GET /api/auth/verify-email
 * @desc Verificar email desde enlace (GET)
 * @access Public
 */
router.get('/verify-email', AuthController_1.default.verifyEmailFromLink);
/**
 * @route POST /api/auth/resend-verification
 * @desc Reenviar email de verificación
 * @access Public
 */
router.post('/resend-verification', AuthController_1.default.resendVerification);
/**
 * @route POST /api/auth/forgot-password
 * @desc Solicitar recuperación de contraseña - envía código de 6 dígitos
 * @access Public
 */
router.post('/forgot-password', validation_1.requestPasswordResetValidation, AuthController_1.default.forgotPassword);
/**
 * @route POST /api/auth/verify-reset-code
 * @desc Verificar código de recuperación
 * @access Public
 */
router.post('/verify-reset-code', AuthController_1.default.verifyResetCode);
/**
 * @route POST /api/auth/reset-password
 * @desc Resetear contraseña con código verificado
 * @access Public
 */
router.post('/reset-password', validation_1.passwordResetValidation, AuthController_1.default.resetPassword);
// =====================================================
// OAUTH ROUTES
// =====================================================
/**
 * @route GET /api/auth/google
 * @desc Iniciar login con Google
 * @access Public
 */
router.get('/google', OAuthController_1.default.googleLogin);
/**
 * @route GET /api/auth/google/callback
 * @desc Callback de Google OAuth
 * @access Public
 */
router.get('/google/callback', OAuthController_1.default.googleCallback);
/**
 * @route POST /api/auth/google/verify
 * @desc Verificar token de Google (para apps móviles)
 * @access Public
 */
router.post('/google/verify', OAuthController_1.default.verifyGoogleToken);
// =====================================================
// RUTAS PROTEGIDAS (requieren autenticación)
// =====================================================
/**
 * @route POST /api/auth/logout
 * @desc Cerrar sesión actual
 * @access Private
 */
router.post('/logout', authenticate_1.authenticate, AuthController_1.default.logout);
/**
 * @route POST /api/auth/logout-all
 * @desc Cerrar todas las sesiones
 * @access Private
 */
router.post('/logout-all', authenticate_1.authenticate, AuthController_1.default.logoutAll);
/**
 * @route GET /api/auth/me
 * @desc Obtener perfil del usuario autenticado
 * @access Private
 */
router.get('/me', authenticate_1.authenticate, AuthController_1.default.getProfile);
/**
 * @route PUT /api/auth/me
 * @desc Actualizar perfil del usuario autenticado
 * @access Private
 */
router.put('/me', authenticate_1.authenticate, AuthController_1.default.updateProfile);
/**
 * @route GET /api/auth/sessions
 * @desc Obtener sesiones activas
 * @access Private
 */
router.get('/sessions', authenticate_1.authenticate, AuthController_1.default.getSessions);
/**
 * @route GET /api/auth/history
 * @desc Obtener historial de autenticación
 * @access Private
 */
router.get('/history', authenticate_1.authenticate, AuthController_1.default.getHistory);
/**
 * @route GET /api/auth/linked-accounts
 * @desc Obtener cuentas OAuth vinculadas
 * @access Private
 */
router.get('/linked-accounts', authenticate_1.authenticate, OAuthController_1.default.getLinkedAccounts);
/**
 * @route POST /api/auth/google/unlink
 * @desc Desvincular cuenta Google
 * @access Private
 */
router.post('/google/unlink', authenticate_1.authenticate, OAuthController_1.default.unlinkGoogle);
// =====================================================
// 2FA ROUTES (protegidas)
// =====================================================
/**
 * @route POST /api/auth/2fa/setup
 * @desc Configurar 2FA (genera QR y backup codes)
 * @access Private
 */
router.post('/2fa/setup', authenticate_1.authenticate, TwoFactorController_1.default.setup);
/**
 * @route POST /api/auth/2fa/enable
 * @desc Habilitar 2FA (después de verificar código)
 * @access Private
 */
router.post('/2fa/enable', authenticate_1.authenticate, validation_1.twoFactorCodeValidation, TwoFactorController_1.default.enable);
/**
 * @route POST /api/auth/2fa/disable
 * @desc Deshabilitar 2FA
 * @access Private
 */
router.post('/2fa/disable', authenticate_1.authenticate, TwoFactorController_1.default.disable);
/**
 * @route POST /api/auth/2fa/verify
 * @desc Verificar código 2FA durante login
 * @access Private (requiere token temporal)
 */
router.post('/2fa/verify', authenticate_1.authenticate, validation_1.twoFactorCodeValidation, TwoFactorController_1.default.verify);
/**
 * @route POST /api/auth/2fa/verify-backup
 * @desc Verificar código de respaldo
 * @access Private
 */
router.post('/2fa/verify-backup', authenticate_1.authenticate, TwoFactorController_1.default.verifyBackup);
/**
 * @route POST /api/auth/2fa/regenerate-backup-codes
 * @desc Regenerar códigos de respaldo
 * @access Private
 */
router.post('/2fa/regenerate-backup-codes', authenticate_1.authenticate, TwoFactorController_1.default.regenerateBackupCodes);
/**
 * @route GET /api/auth/2fa/status
 * @desc Obtener estado de 2FA
 * @access Private
 */
router.get('/2fa/status', authenticate_1.authenticate, TwoFactorController_1.default.getStatus);
// =====================================================
// HEALTH CHECK
// =====================================================
/**
 * @route GET /api/auth/health
 * @desc Health check
 * @access Public
 */
router.get('/health', function (req, res) {
    res.json({
        status: 'ok',
        service: 'auth-service',
        timestamp: new Date().toISOString()
    });
});
exports.default = router;
