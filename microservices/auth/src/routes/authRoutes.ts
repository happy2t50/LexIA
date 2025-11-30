import { Router } from 'express';
import AuthController from '../controllers/AuthController';
import TwoFactorController from '../controllers/TwoFactorController';
import OAuthController from '../controllers/OAuthController';
import { authenticate } from '../middleware/authenticate';
import {
    registerValidation,
    loginValidation,
    refreshTokenValidation,
    passwordResetValidation,
    requestPasswordResetValidation,
    verifyEmailValidation,
    twoFactorCodeValidation
} from '../middleware/validation';

const router = Router();

// =====================================================
// RUTAS PÚBLICAS (sin autenticación)
// =====================================================

/**
 * @route POST /api/auth/register
 * @desc Registrar nuevo usuario
 * @access Public
 */
router.post('/register', registerValidation, AuthController.register);

/**
 * @route POST /api/auth/login
 * @desc Iniciar sesión
 * @access Public
 */
router.post('/login', loginValidation, AuthController.login);

/**
 * @route POST /api/auth/refresh
 * @desc Refrescar access token
 * @access Public
 */
router.post('/refresh', refreshTokenValidation, AuthController.refresh);

/**
 * @route POST /api/auth/verify-email
 * @desc Verificar email con token
 * @access Public
 */
router.post('/verify-email', verifyEmailValidation, AuthController.verifyEmail);

/**
 * @route POST /api/auth/resend-verification
 * @desc Reenviar email de verificación
 * @access Public
 */
router.post('/resend-verification', AuthController.resendVerification);

/**
 * @route POST /api/auth/forgot-password
 * @desc Solicitar recuperación de contraseña
 * @access Public
 */
router.post('/forgot-password', requestPasswordResetValidation, AuthController.forgotPassword);

/**
 * @route POST /api/auth/reset-password
 * @desc Resetear contraseña con token
 * @access Public
 */
router.post('/reset-password', passwordResetValidation, AuthController.resetPassword);

// =====================================================
// OAUTH ROUTES
// =====================================================

/**
 * @route GET /api/auth/google
 * @desc Iniciar login con Google
 * @access Public
 */
router.get('/google', OAuthController.googleLogin);

/**
 * @route GET /api/auth/google/callback
 * @desc Callback de Google OAuth
 * @access Public
 */
router.get('/google/callback', OAuthController.googleCallback);

/**
 * @route POST /api/auth/google/verify
 * @desc Verificar token de Google (para apps móviles)
 * @access Public
 */
router.post('/google/verify', OAuthController.verifyGoogleToken);

// =====================================================
// RUTAS PROTEGIDAS (requieren autenticación)
// =====================================================

/**
 * @route POST /api/auth/logout
 * @desc Cerrar sesión actual
 * @access Private
 */
router.post('/logout', authenticate, AuthController.logout);

/**
 * @route POST /api/auth/logout-all
 * @desc Cerrar todas las sesiones
 * @access Private
 */
router.post('/logout-all', authenticate, AuthController.logoutAll);

/**
 * @route GET /api/auth/me
 * @desc Obtener perfil del usuario autenticado
 * @access Private
 */
router.get('/me', authenticate, AuthController.getProfile);

/**
 * @route GET /api/auth/sessions
 * @desc Obtener sesiones activas
 * @access Private
 */
router.get('/sessions', authenticate, AuthController.getSessions);

/**
 * @route GET /api/auth/history
 * @desc Obtener historial de autenticación
 * @access Private
 */
router.get('/history', authenticate, AuthController.getHistory);

/**
 * @route GET /api/auth/linked-accounts
 * @desc Obtener cuentas OAuth vinculadas
 * @access Private
 */
router.get('/linked-accounts', authenticate, OAuthController.getLinkedAccounts);

/**
 * @route POST /api/auth/google/unlink
 * @desc Desvincular cuenta Google
 * @access Private
 */
router.post('/google/unlink', authenticate, OAuthController.unlinkGoogle);

// =====================================================
// 2FA ROUTES (protegidas)
// =====================================================

/**
 * @route POST /api/auth/2fa/setup
 * @desc Configurar 2FA (genera QR y backup codes)
 * @access Private
 */
router.post('/2fa/setup', authenticate, TwoFactorController.setup);

/**
 * @route POST /api/auth/2fa/enable
 * @desc Habilitar 2FA (después de verificar código)
 * @access Private
 */
router.post('/2fa/enable', authenticate, twoFactorCodeValidation, TwoFactorController.enable);

/**
 * @route POST /api/auth/2fa/disable
 * @desc Deshabilitar 2FA
 * @access Private
 */
router.post('/2fa/disable', authenticate, TwoFactorController.disable);

/**
 * @route POST /api/auth/2fa/verify
 * @desc Verificar código 2FA durante login
 * @access Private (requiere token temporal)
 */
router.post('/2fa/verify', authenticate, twoFactorCodeValidation, TwoFactorController.verify);

/**
 * @route POST /api/auth/2fa/verify-backup
 * @desc Verificar código de respaldo
 * @access Private
 */
router.post('/2fa/verify-backup', authenticate, TwoFactorController.verifyBackup);

/**
 * @route POST /api/auth/2fa/regenerate-backup-codes
 * @desc Regenerar códigos de respaldo
 * @access Private
 */
router.post('/2fa/regenerate-backup-codes', authenticate, TwoFactorController.regenerateBackupCodes);

/**
 * @route GET /api/auth/2fa/status
 * @desc Obtener estado de 2FA
 * @access Private
 */
router.get('/2fa/status', authenticate, TwoFactorController.getStatus);

// =====================================================
// HEALTH CHECK
// =====================================================

/**
 * @route GET /api/auth/health
 * @desc Health check
 * @access Public
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'auth-service',
        timestamp: new Date().toISOString()
    });
});

export default router;