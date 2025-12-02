import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';
import { generateTokens, verifyRefreshToken, Tokens, TokenPayload } from '../utils/jwt';
import { generateSecureToken, calculateExpiration } from '../utils/tokens';
import UserRepository, { CreateUserData, User } from '../repositories/UserRepository';
import RefreshTokenRepository from '../repositories/RefreshTokenRepository';
import EmailVerificationRepository from '../repositories/EmailVerificationRepository';
import PasswordResetRepository from '../repositories/PasswordResetRepository';
import AuthLogRepository from '../repositories/AuthLogRepository';
import { transporter, emailTemplates } from '../config/email';

export interface RegisterData {
    email: string;
    password: string;
    nombre: string;
    apellido: string;
    telefono?: string;
}

export interface UpdateProfileData {
    nombre?: string;
    apellidos?: string;
    email?: string;
    telefono?: string;
}

export interface LoginData {
    email: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
}

export interface AuthResult {
    user: Omit<User, 'password_hash'>;
    tokens: Tokens;
}

export class AuthService {
    /**
     * Registrar nuevo usuario
     */
    async register(data: RegisterData, ipAddress?: string): Promise<{user: User; verificationToken: string}> {
        // Validar que el email no esté en uso
        const existingUser = await UserRepository.findByEmail(data.email);
        if (existingUser) {
            throw new Error('El email ya está registrado');
        }

        // Validar fortaleza de contraseña
        const passwordValidation = validatePasswordStrength(data.password);
        if (!passwordValidation.valid) {
            throw new Error(passwordValidation.errors.join(', '));
        }

        // Hashear contraseña
        const password_hash = await hashPassword(data.password);

        // Crear usuario
        const userData: CreateUserData = {
            email: data.email,
            nombre: data.nombre,
            apellido: data.apellido,
            telefono: data.telefono,
            password_hash,
            rol: 'user',
            account_type: 'local'
        };

        const user = await UserRepository.create(userData);

        // Crear token de verificación de email
        const verificationToken = generateSecureToken();
        const expiresAt = calculateExpiration(24); // 24 horas

        await EmailVerificationRepository.create({
            usuario_id: user.id,
            token: verificationToken,
            expires_at: expiresAt,
            ip_address: ipAddress
        });

        // Log del evento
        await AuthLogRepository.create({
            usuario_id: user.id,
            email: user.email,
            event_type: 'register',
            success: true,
            ip_address: ipAddress
        });

        // Enviar email de verificación
        if (process.env.SMTP_USER) {
            try {
                const emailContent = emailTemplates.verification(verificationToken, user.nombre);
                await transporter.sendMail({
                    from: process.env.SMTP_USER,
                    to: user.email,
                    subject: emailContent.subject,
                    html: emailContent.html
                });
            } catch (error) {
                console.error('Error al enviar email de verificación:', error);
            }
        }

        return { user, verificationToken };
    }

    /**
     * Login de usuario
     */
    async login(data: LoginData): Promise<AuthResult> {
        const { email, password, ipAddress, userAgent } = data;

        // Buscar usuario
        const user = await UserRepository.findByEmail(email);
        if (!user) {
            // Log del intento fallido
            await AuthLogRepository.create({
                email,
                event_type: 'failed_login',
                success: false,
                failure_reason: 'Email no encontrado',
                ip_address: ipAddress,
                user_agent: userAgent
            });

            throw new Error('Credenciales inválidas');
        }

        // Verificar si está bloqueado
        const isLocked = await UserRepository.isLocked(user.id);
        if (isLocked) {
            await AuthLogRepository.create({
                usuario_id: user.id,
                email,
                event_type: 'failed_login',
                success: false,
                failure_reason: 'Cuenta bloqueada',
                ip_address: ipAddress,
                user_agent: userAgent
            });

            throw new Error('Cuenta bloqueada temporalmente. Intenta más tarde.');
        }

        // Verificar contraseña
        if (!user.password_hash) {
            await AuthLogRepository.create({
                usuario_id: user.id,
                email,
                event_type: 'failed_login',
                success: false,
                failure_reason: 'Cuenta OAuth sin contraseña',
                ip_address: ipAddress,
                user_agent: userAgent
            });

            throw new Error('Esta cuenta usa autenticación de terceros (Google)');
        }

        const isPasswordValid = await comparePassword(password, user.password_hash);
        if (!isPasswordValid) {
            // Incrementar intentos fallidos
            await UserRepository.incrementFailedAttempts(user.id);

            await AuthLogRepository.create({
                usuario_id: user.id,
                email,
                event_type: 'failed_login',
                success: false,
                failure_reason: 'Contraseña incorrecta',
                ip_address: ipAddress,
                user_agent: userAgent
            });

            throw new Error('Credenciales inválidas');
        }

        // Verificar si la cuenta está activa
        if (!user.activo) {
            await AuthLogRepository.create({
                usuario_id: user.id,
                email,
                event_type: 'failed_login',
                success: false,
                failure_reason: 'Cuenta desactivada',
                ip_address: ipAddress,
                user_agent: userAgent
            });

            throw new Error('Cuenta desactivada');
        }

        // Generar tokens JWT
        const tokenPayload: TokenPayload = {
            userId: user.id,
            email: user.email,
            rol: user.rol,
            twoFactorEnabled: user.two_factor_enabled
        };

        const tokens = generateTokens(tokenPayload);

        // Guardar refresh token en BD
        await RefreshTokenRepository.create({
            usuario_id: user.id,
            token: tokens.refreshToken,
            expires_at: new Date(Date.now() + tokens.refreshTokenExpiresIn * 1000),
            ip_address: ipAddress,
            user_agent: userAgent
        });

        // Resetear intentos fallidos y actualizar último login
        await UserRepository.resetFailedAttempts(user.id, ipAddress);

        // Log de login exitoso
        await AuthLogRepository.create({
            usuario_id: user.id,
            email,
            event_type: 'successful_login',
            success: true,
            ip_address: ipAddress,
            user_agent: userAgent
        });

        // Remover password_hash de la respuesta
        const { password_hash, ...userWithoutPassword } = user;

        return {
            user: userWithoutPassword,
            tokens
        };
    }

    /**
     * Refrescar access token usando refresh token
     */
    async refreshAccessToken(refreshToken: string): Promise<Tokens> {
        // Verificar refresh token
        const payload = verifyRefreshToken(refreshToken);
        if (!payload) {
            throw new Error('Refresh token inválido o expirado');
        }

        // Verificar que el refresh token esté en la BD y sea válido
        const isValid = await RefreshTokenRepository.isValid(refreshToken);
        if (!isValid) {
            throw new Error('Refresh token revocado o expirado');
        }

        // Buscar usuario
        const user = await UserRepository.findById(payload.userId);
        if (!user || !user.activo) {
            throw new Error('Usuario no encontrado o inactivo');
        }

        // Generar nuevos tokens
        const tokenPayload: TokenPayload = {
            userId: user.id,
            email: user.email,
            rol: user.rol,
            twoFactorEnabled: user.two_factor_enabled
        };

        const newTokens = generateTokens(tokenPayload);

        // Guardar nuevo refresh token
        await RefreshTokenRepository.create({
            usuario_id: user.id,
            token: newTokens.refreshToken,
            expires_at: new Date(Date.now() + newTokens.refreshTokenExpiresIn * 1000)
        });

        // Revocar el refresh token anterior
        await RefreshTokenRepository.revoke(refreshToken);

        return newTokens;
    }

    /**
     * Logout
     */
    async logout(refreshToken: string, userId: number, ipAddress?: string): Promise<void> {
        // Revocar refresh token
        await RefreshTokenRepository.revoke(refreshToken);

        // Log del evento
        const user = await UserRepository.findById(userId);
        if (user) {
            await AuthLogRepository.create({
                usuario_id: userId,
                email: user.email,
                event_type: 'logout',
                success: true,
                ip_address: ipAddress
            });
        }
    }

    /**
     * Logout de todas las sesiones
     */
    async logoutAll(userId: number, ipAddress?: string): Promise<void> {
        // Revocar todos los refresh tokens
        await RefreshTokenRepository.revokeAllForUser(userId);

        // Log del evento
        const user = await UserRepository.findById(userId);
        if (user) {
            await AuthLogRepository.create({
                usuario_id: userId,
                email: user.email,
                event_type: 'logout_all',
                success: true,
                ip_address: ipAddress
            });
        }
    }

    /**
     * Verificar email
     */
    async verifyEmail(token: string): Promise<boolean> {
        const verificationToken = await EmailVerificationRepository.findByToken(token);
        if (!verificationToken) {
            throw new Error('Token de verificación inválido o expirado');
        }

        // Marcar email como verificado
        await UserRepository.verifyEmail(verificationToken.usuario_id);

        // Marcar token como usado
        await EmailVerificationRepository.markAsVerified(token);

        // Invalidar otros tokens del usuario
        await EmailVerificationRepository.invalidateUserTokens(verificationToken.usuario_id);

        // Log del evento
        const user = await UserRepository.findById(verificationToken.usuario_id);
        if (user) {
            await AuthLogRepository.create({
                usuario_id: user.id,
                email: user.email,
                event_type: 'email_verified',
                success: true
            });
        }

        return true;
    }

    /**
     * Reenviar email de verificación
     */
    async resendVerificationEmail(email: string, ipAddress?: string): Promise<void> {
        const user = await UserRepository.findByEmail(email);
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        if (user.email_verified) {
            throw new Error('El email ya está verificado');
        }

        // Invalidar tokens anteriores
        await EmailVerificationRepository.invalidateUserTokens(user.id);

        // Crear nuevo token
        const verificationToken = generateSecureToken();
        const expiresAt = calculateExpiration(24);

        await EmailVerificationRepository.create({
            usuario_id: user.id,
            token: verificationToken,
            expires_at: expiresAt,
            ip_address: ipAddress
        });

        // Enviar email
        if (process.env.SMTP_USER) {
            const emailContent = emailTemplates.verification(verificationToken, user.nombre);
            await transporter.sendMail({
                from: process.env.SMTP_USER,
                to: user.email,
                subject: emailContent.subject,
                html: emailContent.html
            });
        }
    }

    /**
     * Solicitar recuperación de contraseña
     */
    async requestPasswordReset(email: string, ipAddress?: string): Promise<void> {
        const user = await UserRepository.findByEmail(email);
        if (!user) {
            // No revelar si el email existe o no (seguridad)
            return;
        }

        // Verificar si ya hay un token reciente (anti-spam)
        const hasRecentToken = await PasswordResetRepository.hasRecentToken(user.id, 5);
        if (hasRecentToken) {
            throw new Error('Ya se envió un email recientemente. Espera 5 minutos.');
        }

        // Invalidar tokens anteriores
        await PasswordResetRepository.invalidateUserTokens(user.id);

        // Crear token de reset
        const resetToken = generateSecureToken();
        const expiresAt = calculateExpiration(1); // 1 hora

        await PasswordResetRepository.create({
            usuario_id: user.id,
            token: resetToken,
            expires_at: expiresAt,
            ip_address: ipAddress
        });

        // Log del evento
        await AuthLogRepository.create({
            usuario_id: user.id,
            email: user.email,
            event_type: 'password_reset_requested',
            success: true,
            ip_address: ipAddress
        });

        // Enviar email
        if (process.env.SMTP_USER) {
            const emailContent = emailTemplates.passwordReset(resetToken, user.nombre);
            await transporter.sendMail({
                from: process.env.SMTP_USER,
                to: user.email,
                subject: emailContent.subject,
                html: emailContent.html
            });
        }
    }

    /**
     * Resetear contraseña
     */
    async resetPassword(token: string, newPassword: string): Promise<boolean> {
        const resetToken = await PasswordResetRepository.findByToken(token);
        if (!resetToken) {
            throw new Error('Token de recuperación inválido o expirado');
        }

        // Validar fortaleza de contraseña
        const passwordValidation = validatePasswordStrength(newPassword);
        if (!passwordValidation.valid) {
            throw new Error(passwordValidation.errors.join(', '));
        }

        // Hashear nueva contraseña
        const password_hash = await hashPassword(newPassword);

        // Actualizar contraseña
        await UserRepository.updatePassword(resetToken.usuario_id, password_hash);

        // Marcar token como usado
        await PasswordResetRepository.markAsUsed(token);

        // Revocar todas las sesiones (por seguridad)
        await RefreshTokenRepository.revokeAllForUser(resetToken.usuario_id);

        // Log del evento
        const user = await UserRepository.findById(resetToken.usuario_id);
        if (user) {
            await AuthLogRepository.create({
                usuario_id: user.id,
                email: user.email,
                event_type: 'password_reset_completed',
                success: true
            });
        }

        return true;
    }

    /**
     * Obtener perfil de usuario
     */
    async getProfile(userId: number): Promise<Omit<User, 'password_hash'>> {
        const user = await UserRepository.findById(userId);
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    /**
     * Actualizar perfil de usuario
     */
    async updateProfile(userId: number, data: UpdateProfileData): Promise<Omit<User, 'password_hash'>> {
        // Verificar que el usuario existe
        const existingUser = await UserRepository.findById(userId);
        if (!existingUser) {
            throw new Error('Usuario no encontrado');
        }

        // Si se quiere cambiar el email, verificar que no esté en uso por otro usuario
        if (data.email && data.email !== existingUser.email) {
            const emailExists = await UserRepository.findByEmail(data.email);
            if (emailExists && emailExists.id !== userId) {
                throw new Error('El email ya está en uso por otro usuario');
            }
        }

        // Preparar datos para actualizar
        const updateData: Partial<User> = {};
        
        if (data.nombre !== undefined) {
            updateData.nombre = data.nombre.trim();
        }
        
        if (data.apellidos !== undefined) {
            updateData.apellido = data.apellidos.trim(); // Mapear apellidos -> apellido
        }
        
        if (data.email !== undefined) {
            updateData.email = data.email.toLowerCase().trim();
        }
        
        if (data.telefono !== undefined) {
            updateData.telefono = data.telefono.trim();
        }

        // Actualizar usuario
        const updatedUser = await UserRepository.update(userId, updateData);
        if (!updatedUser) {
            throw new Error('Error al actualizar el perfil');
        }

        // Retornar usuario sin password
        const { password_hash, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
    }

    /**
     * Obtener sesiones activas
     */
    async getActiveSessions(userId: number) {
        return await RefreshTokenRepository.getActiveSessions(userId);
    }

    /**
     * Obtener historial de autenticación
     */
    async getAuthHistory(userId: number, limit: number = 50) {
        return await AuthLogRepository.findByUserId(userId, limit);
    }
}

export default new AuthService();