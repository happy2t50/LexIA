import { Request, Response } from 'express';
import AuthService from '../services/AuthService';

export class AuthController {
    /**
     * POST /api/auth/register
     * Registrar nuevo usuario
     */
    async register(req: Request, res: Response): Promise<void> {
        try {
            const { email, password, nombre, apellido: apellidoRaw, apellidos, telefono } = req.body;
            // Aceptar tanto "apellido" como "apellidos" del cliente
            const apellido = (apellidoRaw ?? apellidos ?? '').toString().trim();
            const ipAddress = req.ip || req.socket.remoteAddress;

            const result = await AuthService.register(
                { email, password, nombre, apellido, telefono },
                ipAddress
            );

            // En entorno de desarrollo, devolver URL de verificación para pruebas rápidas
            const isProd = process.env.NODE_ENV === 'production';
            const hasSmtp = !!process.env.SMTP_USER;

            res.status(201).json({
                message: 'Usuario registrado exitosamente. Revisa tu email para verificar tu cuenta.',
                user: {
                    id: result.user.id,
                    email: result.user.email,
                    nombre: result.user.nombre,
                    apellido: result.user.apellido
                },
                ...(isProd || hasSmtp
                    ? {}
                    : { devVerificationUrl: `${req.protocol}://${req.get('host')}/api/auth/verify-email?token=${result.verificationToken}` })
            });
        } catch (error: any) {
            res.status(400).json({
                error: 'Error en el registro',
                message: error.message
            });
        }
    }

    /**
     * POST /api/auth/login
     * Iniciar sesión
     */
    async login(req: Request, res: Response): Promise<void> {
        try {
            const { email, password } = req.body;
            const ipAddress = req.ip || req.socket.remoteAddress;
            const userAgent = req.headers['user-agent'];

            const result = await AuthService.login({
                email,
                password,
                ipAddress,
                userAgent
            });

            // Si el usuario tiene 2FA habilitado, NO devolver tokens todavía
            if (result.user.two_factor_enabled) {
                res.json({
                    message: 'Código 2FA requerido',
                    requires2FA: true,
                    userId: result.user.id,
                    tempToken: result.tokens.accessToken // Token temporal para el paso de 2FA
                });
                return;
            }

            res.json({
                message: 'Login exitoso',
                user: {
                    id: result.user.id,
                    email: result.user.email,
                    nombre: result.user.nombre,
                    apellido: result.user.apellido,
                    rol: result.user.rol,
                    emailVerified: result.user.email_verified
                },
                accessToken: result.tokens.accessToken,
                refreshToken: result.tokens.refreshToken,
                expiresIn: result.tokens.accessTokenExpiresIn
            });
        } catch (error: any) {
            res.status(401).json({
                error: 'Error en el login',
                message: error.message
            });
        }
    }

    /**
     * POST /api/auth/refresh
     * Refrescar access token
     */
    async refresh(req: Request, res: Response): Promise<void> {
        try {
            const { refreshToken } = req.body;

            const tokens = await AuthService.refreshAccessToken(refreshToken);

            res.json({
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresIn: tokens.accessTokenExpiresIn
            });
        } catch (error: any) {
            res.status(401).json({
                error: 'Error al refrescar token',
                message: error.message
            });
        }
    }

    /**
     * POST /api/auth/logout
     * Cerrar sesión
     */
    async logout(req: Request, res: Response): Promise<void> {
        try {
            const { refreshToken } = req.body;
            const userId = req.user?.userId;
            const ipAddress = req.ip || req.socket.remoteAddress;

            if (!userId) {
                res.status(401).json({ error: 'No autenticado' });
                return;
            }

            await AuthService.logout(refreshToken, userId, ipAddress);

            res.json({ message: 'Logout exitoso' });
        } catch (error: any) {
            res.status(400).json({
                error: 'Error en el logout',
                message: error.message
            });
        }
    }

    /**
     * POST /api/auth/logout-all
     * Cerrar todas las sesiones
     */
    async logoutAll(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            const ipAddress = req.ip || req.socket.remoteAddress;

            if (!userId) {
                res.status(401).json({ error: 'No autenticado' });
                return;
            }

            await AuthService.logoutAll(userId, ipAddress);

            res.json({ message: 'Todas las sesiones cerradas' });
        } catch (error: any) {
            res.status(400).json({
                error: 'Error al cerrar sesiones',
                message: error.message
            });
        }
    }

    /**
     * POST /api/auth/verify-email
     * Verificar email (POST)
     */
    async verifyEmail(req: Request, res: Response): Promise<void> {
        try {
            const { token } = req.body;

            await AuthService.verifyEmail(token);

            res.json({ message: 'Email verificado exitosamente' });
        } catch (error: any) {
            res.status(400).json({
                error: 'Error en la verificación',
                message: error.message
            });
        }
    }

    /**
     * GET /api/auth/verify-email
     * Verificar email desde enlace (GET)
     */
    async verifyEmailFromLink(req: Request, res: Response): Promise<void> {
        try {
            const { token } = req.query;

            if (!token || typeof token !== 'string') {
                res.status(400).json({
                    error: 'Token requerido',
                    message: 'El token de verificación es obligatorio'
                });
                return;
            }

            await AuthService.verifyEmail(token);

            // Responder con HTML para mostrar en el navegador
            res.send(`
                <html>
                    <head>
                        <title>Email Verificado - LexIA</title>
                        <meta charset="utf-8">
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; margin: 50px; }
                            .success { color: #16a34a; }
                            .container { max-width: 500px; margin: 0 auto; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1 class="success">✅ Email Verificado</h1>
                            <p>Tu correo electrónico ha sido verificado exitosamente.</p>
                            <p>Ya puedes cerrar esta ventana y continuar usando LexIA.</p>
                        </div>
                    </body>
                </html>
            `);
        } catch (error: any) {
            res.status(400).send(`
                <html>
                    <head>
                        <title>Error de Verificación - LexIA</title>
                        <meta charset="utf-8">
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; margin: 50px; }
                            .error { color: #dc2626; }
                            .container { max-width: 500px; margin: 0 auto; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1 class="error">❌ Error de Verificación</h1>
                            <p>No se pudo verificar tu correo electrónico.</p>
                            <p><strong>Error:</strong> ${error.message}</p>
                            <p>El enlace puede haber expirado. Intenta solicitar un nuevo enlace de verificación.</p>
                        </div>
                    </body>
                </html>
            `);
        }
    }

    /**
     * POST /api/auth/resend-verification
     * Reenviar email de verificación
     */
    async resendVerification(req: Request, res: Response): Promise<void> {
        try {
            const { email } = req.body;
            const ipAddress = req.ip || req.socket.remoteAddress;

            await AuthService.resendVerificationEmail(email, ipAddress);

            res.json({ message: 'Email de verificación enviado' });
        } catch (error: any) {
            res.status(400).json({
                error: 'Error al reenviar verificación',
                message: error.message
            });
        }
    }

    /**
     * POST /api/auth/forgot-password
     * Solicitar recuperación de contraseña
     */
    async forgotPassword(req: Request, res: Response): Promise<void> {
        try {
            const { email } = req.body;
            const ipAddress = req.ip || req.socket.remoteAddress;

            await AuthService.requestPasswordReset(email, ipAddress);

            res.json({
                message: 'Si el email existe, recibirás instrucciones para recuperar tu contraseña'
            });
        } catch (error: any) {
            res.status(400).json({
                error: 'Error al solicitar recuperación',
                message: error.message
            });
        }
    }

    /**
     * POST /api/auth/reset-password
     * Resetear contraseña
     */
    async resetPassword(req: Request, res: Response): Promise<void> {
        try {
            const { token, newPassword } = req.body;

            await AuthService.resetPassword(token, newPassword);

            res.json({ message: 'Contraseña actualizada exitosamente' });
        } catch (error: any) {
            res.status(400).json({
                error: 'Error al resetear contraseña',
                message: error.message
            });
        }
    }

    /**
     * GET /api/auth/me
     * Obtener perfil del usuario autenticado
     */
    async getProfile(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;

            if (!userId) {
                res.status(401).json({ error: 'No autenticado' });
                return;
            }

            const user = await AuthService.getProfile(userId);

            res.json({ user });
        } catch (error: any) {
            res.status(400).json({
                error: 'Error al obtener perfil',
                message: error.message
            });
        }
    }

    /**
     * PUT /api/auth/me
     * Actualizar perfil del usuario autenticado
     */
    async updateProfile(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;

            if (!userId) {
                res.status(401).json({ error: 'No autenticado' });
                return;
            }

            const { nombre, apellidos, email, telefono } = req.body;

            const user = await AuthService.updateProfile(userId, {
                nombre,
                apellidos,
                email,
                telefono
            });

            res.json({ 
                message: 'Perfil actualizado exitosamente',
                user 
            });
        } catch (error: any) {
            res.status(400).json({
                error: 'Error al actualizar perfil',
                message: error.message
            });
        }
    }

    /**
     * GET /api/auth/sessions
     * Obtener sesiones activas
     */
    async getSessions(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;

            if (!userId) {
                res.status(401).json({ error: 'No autenticado' });
                return;
            }

            const sessions = await AuthService.getActiveSessions(userId);

            res.json({ sessions });
        } catch (error: any) {
            res.status(400).json({
                error: 'Error al obtener sesiones',
                message: error.message
            });
        }
    }

    /**
     * GET /api/auth/history
     * Obtener historial de autenticación
     */
    async getHistory(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            const limit = parseInt(req.query.limit as string) || 50;

            if (!userId) {
                res.status(401).json({ error: 'No autenticado' });
                return;
            }

            const history = await AuthService.getAuthHistory(userId, limit);

            res.json({ history });
        } catch (error: any) {
            res.status(400).json({
                error: 'Error al obtener historial',
                message: error.message
            });
        }
    }
}

export default new AuthController();