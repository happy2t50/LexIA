import { Request, Response } from 'express';
import TwoFactorService from '../services/TwoFactorService';

export class TwoFactorController {
    /**
     * POST /api/auth/2fa/setup
     * Configurar 2FA (genera QR y códigos de respaldo)
     */
    async setup(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;

            if (!userId) {
                res.status(401).json({ error: 'No autenticado' });
                return;
            }

            const result = await TwoFactorService.setup(userId);

            res.json({
                message: 'Escanea el código QR con tu app de autenticación (Google Authenticator, Authy, etc.)',
                qrCodeUrl: result.qrCodeUrl,
                secret: result.secret,
                backupCodes: result.backupCodes,
                note: 'Guarda los códigos de respaldo en un lugar seguro. Después debes verificar el código para habilitar 2FA.'
            });
        } catch (error: any) {
            res.status(400).json({
                error: 'Error al configurar 2FA',
                message: error.message
            });
        }
    }

    /**
     * POST /api/auth/2fa/enable
     * Habilitar 2FA (verificar código después de setup)
     */
    async enable(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            const { code } = req.body;

            if (!userId) {
                res.status(401).json({ error: 'No autenticado' });
                return;
            }

            await TwoFactorService.enable(userId, code);

            res.json({
                message: '2FA habilitado exitosamente',
                enabled: true
            });
        } catch (error: any) {
            res.status(400).json({
                error: 'Error al habilitar 2FA',
                message: error.message
            });
        }
    }

    /**
     * POST /api/auth/2fa/disable
     * Deshabilitar 2FA
     */
    async disable(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            const { password } = req.body;

            if (!userId) {
                res.status(401).json({ error: 'No autenticado' });
                return;
            }

            await TwoFactorService.disable(userId, password);

            res.json({
                message: '2FA deshabilitado',
                enabled: false
            });
        } catch (error: any) {
            res.status(400).json({
                error: 'Error al deshabilitar 2FA',
                message: error.message
            });
        }
    }

    /**
     * POST /api/auth/2fa/verify
     * Verificar código 2FA durante login
     */
    async verify(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            const { code } = req.body;

            if (!userId) {
                res.status(401).json({ error: 'No autenticado' });
                return;
            }

            const isValid = await TwoFactorService.verifyCode(userId, code);

            if (!isValid) {
                res.status(401).json({
                    error: 'Código inválido',
                    message: 'El código 2FA es incorrecto'
                });
                return;
            }

            res.json({
                message: '2FA verificado',
                verified: true
            });
        } catch (error: any) {
            res.status(400).json({
                error: 'Error al verificar 2FA',
                message: error.message
            });
        }
    }

    /**
     * POST /api/auth/2fa/verify-backup
     * Verificar código de respaldo
     */
    async verifyBackup(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            const { code } = req.body;

            if (!userId) {
                res.status(401).json({ error: 'No autenticado' });
                return;
            }

            const isValid = await TwoFactorService.verifyBackupCode(userId, code);

            if (!isValid) {
                res.status(401).json({
                    error: 'Código inválido',
                    message: 'El código de respaldo es incorrecto o ya fue usado'
                });
                return;
            }

            res.json({
                message: 'Código de respaldo verificado',
                verified: true,
                warning: 'Este código de respaldo ya no se puede usar de nuevo'
            });
        } catch (error: any) {
            res.status(400).json({
                error: 'Error al verificar código de respaldo',
                message: error.message
            });
        }
    }

    /**
     * POST /api/auth/2fa/regenerate-backup-codes
     * Regenerar códigos de respaldo
     */
    async regenerateBackupCodes(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            const { password } = req.body;

            if (!userId) {
                res.status(401).json({ error: 'No autenticado' });
                return;
            }

            const newCodes = await TwoFactorService.regenerateBackupCodes(userId, password);

            res.json({
                message: 'Códigos de respaldo regenerados',
                backupCodes: newCodes,
                warning: 'Los códigos anteriores ya no son válidos. Guarda estos nuevos códigos en un lugar seguro.'
            });
        } catch (error: any) {
            res.status(400).json({
                error: 'Error al regenerar códigos',
                message: error.message
            });
        }
    }

    /**
     * GET /api/auth/2fa/status
     * Obtener estado de 2FA
     */
    async getStatus(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;

            if (!userId) {
                res.status(401).json({ error: 'No autenticado' });
                return;
            }

            const info = await TwoFactorService.getInfo(userId);

            res.json({
                enabled: info.enabled,
                backupCodesCount: info.backupCodesCount,
                lastUsedAt: info.lastUsedAt
            });
        } catch (error: any) {
            res.status(400).json({
                error: 'Error al obtener estado',
                message: error.message
            });
        }
    }
}

export default new TwoFactorController();