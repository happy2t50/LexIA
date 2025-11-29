import { Request, Response, NextFunction } from 'express';
import OAuthService from '../services/OAuthService';

export class OAuthController {
    /**
     * GET /api/auth/google
     * Iniciar login con Google
     */
    async googleLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
        const passport = OAuthService.getPassport();
        passport.authenticate('google', {
            scope: ['profile', 'email']
        })(req, res, next);
    }

    /**
     * GET /api/auth/google/callback
     * Callback de Google OAuth
     */
    async googleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
        const passport = OAuthService.getPassport();

        passport.authenticate('google', { session: false }, (err: any, user: any) => {
            if (err || !user) {
                // Redirigir al frontend con error
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                res.redirect(`${frontendUrl}/login?error=oauth_failed`);
                return;
            }

            // Redirigir al frontend con tokens en la URL (o usar cookies)
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const params = new URLSearchParams({
                accessToken: user.tokens.accessToken,
                refreshToken: user.tokens.refreshToken,
                isNewUser: user.isNewUser.toString()
            });

            res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
        })(req, res, next);
    }

    /**
     * POST /api/auth/google/link
     * Vincular cuenta Google a usuario actual
     */
    async linkGoogle(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;

            if (!userId) {
                res.status(401).json({ error: 'No autenticado' });
                return;
            }

            // Aquí normalmente usarías un flujo OAuth similar al login
            // Por simplicidad, asumimos que ya tienes los tokens

            res.json({
                message: 'Usa el flujo de OAuth normal para vincular Google',
                note: 'Implementación completa requiere manejo de estado OAuth'
            });
        } catch (error: any) {
            res.status(400).json({
                error: 'Error al vincular Google',
                message: error.message
            });
        }
    }

    /**
     * POST /api/auth/google/unlink
     * Desvincular cuenta Google
     */
    async unlinkGoogle(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;

            if (!userId) {
                res.status(401).json({ error: 'No autenticado' });
                return;
            }

            await OAuthService.unlinkGoogleAccount(userId);

            res.json({
                message: 'Cuenta Google desvinculada exitosamente'
            });
        } catch (error: any) {
            res.status(400).json({
                error: 'Error al desvincular Google',
                message: error.message
            });
        }
    }

    /**
     * GET /api/auth/linked-accounts
     * Obtener cuentas vinculadas
     */
    async getLinkedAccounts(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;

            if (!userId) {
                res.status(401).json({ error: 'No autenticado' });
                return;
            }

            const accounts = await OAuthService.getLinkedAccounts(userId);

            res.json({ accounts });
        } catch (error: any) {
            res.status(400).json({
                error: 'Error al obtener cuentas vinculadas',
                message: error.message
            });
        }
    }
}

export default new OAuthController();