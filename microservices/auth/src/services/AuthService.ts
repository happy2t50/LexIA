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

        // Crear código de verificación de 6 dígitos
        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
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
                console.log(`📧 Código de verificación enviado a ${user.email}: ${verificationToken}`);
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

        // Crear código de verificación de 6 dígitos
        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
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
            console.log(`📧 Código de verificación reenviado a ${user.email}: ${verificationToken}`);
        }
    }

    /**
     * Solicitar recuperación de contraseña - Genera código de 6 dígitos
     */
    async requestPasswordReset(email: string, ipAddress?: string): Promise<void> {
        const user = await UserRepository.findByEmail(email);
        if (!user) {
            // No revelar si el email existe o no (seguridad)
            return;
        }

        // Verificar si ya hay un código reciente (anti-spam)
        const hasRecentToken = await PasswordResetRepository.hasRecentToken(user.id, 2);
        if (hasRecentToken) {
            throw new Error('Ya se envió un código recientemente. Espera 2 minutos.');
        }

        // Invalidar códigos anteriores
        await PasswordResetRepository.invalidateUserTokens(user.id);

        // Generar código de 6 dígitos
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Calcular expiración (10 minutos)
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        await PasswordResetRepository.create({
            usuario_id: user.id,
            token: code,
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

        // Enviar email con el código
        if (process.env.SMTP_USER) {
            try {
                const emailContent = emailTemplates.passwordReset(code, user.nombre);
                await transporter.sendMail({
                    from: process.env.SMTP_USER,
                    to: user.email,
                    subject: emailContent.subject,
                    html: emailContent.html
                });
                console.log(`✉️  Código de recuperación enviado a ${email}: ${code}`);
            } catch (error) {
                console.error('Error al enviar email de recuperación:', error);
                throw new Error('Error al enviar el email de recuperación');
            }
        } else {
            // En desarrollo, mostrar el código en consola
            console.log(`🔑 Código de recuperación para ${email}: ${code} (expira en 10 minutos)`);
        }
    }

    /**
     * Verificar código de recuperación
     */
    async verifyResetCode(email: string, code: string): Promise<boolean> {
        const user = await UserRepository.findByEmail(email);
        if (!user) {
            return false;
        }

        const resetToken = await PasswordResetRepository.findByToken(code);
        if (!resetToken || resetToken.usuario_id !== user.id) {
            return false;
        }

        return true;
    }

    /**
     * Resetear contraseña con código verificado
     */
    async resetPassword(email: string, code: string, newPassword: string): Promise<boolean> {
        const user = await UserRepository.findByEmail(email);
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        const resetToken = await PasswordResetRepository.findByToken(code);
        if (!resetToken || resetToken.usuario_id !== user.id) {
            throw new Error('Código de recuperación inválido o expirado');
        }

        // Validar fortaleza de contraseña
        const passwordValidation = validatePasswordStrength(newPassword);
        if (!passwordValidation.valid) {
            throw new Error(passwordValidation.errors.join(', '));
        }

        // Hashear nueva contraseña
        const password_hash = await hashPassword(newPassword);

        // Actualizar contraseña
        await UserRepository.updatePassword(user.id, password_hash);

        // Marcar código como usado
        await PasswordResetRepository.markAsUsed(code);

        // Revocar todas las sesiones (por seguridad)
        await RefreshTokenRepository.revokeAllForUser(user.id);

        // Log del evento
        await AuthLogRepository.create({
            usuario_id: user.id,
            email: user.email,
            event_type: 'password_reset_completed',
            success: true
        });

        console.log(`✅ Contraseña restablecida exitosamente para ${email}`);
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

    // =====================================================
    // ADMIN METHODS
    // =====================================================

    /**
     * Obtener estadísticas generales del sistema (solo admin)
     */
    async getAdminStats() {
        try {
            // Obtener conteo total de usuarios
            const allUsers = await UserRepository.findAll();
            const totalUsers = allUsers.length;
            
            // Contar usuarios por rol
            const lawyers = allUsers.filter(u => u.rol === 'lawyer' || u.rol === 'abogado').length;
            const regularUsers = allUsers.filter(u => u.rol === 'user').length;
            
            // Contar usuarios activos (última actividad en los últimos 30 días)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const activeUsers = allUsers.filter(u => 
                u.ultimo_acceso && new Date(u.ultimo_acceso) >= thirtyDaysAgo
            ).length;

            // Contar perfiles verificados
            const verifiedLawyers = allUsers.filter(u => 
                (u.rol === 'lawyer' || u.rol === 'abogado') && u.verificado
            ).length;

            // Calcular crecimiento (mock - en producción esto vendría de métricas históricas)
            const crecimientoUsuarios = 12.5;
            const crecimientoAbogados = 8.3;

            return {
                usuarios_activos: activeUsers,
                abogados_verificados: verifiedLawyers,
                anunciantes_activos: 0, // Por implementar
                consultas_del_mes: 0, // Por implementar - requiere integración con servicio de chat
                crecimiento_usuarios: crecimientoUsuarios,
                crecimiento_abogados: crecimientoAbogados,
                crecimiento_anunciantes: 0,
                crecimiento_consultas: 0,
                total_usuarios: totalUsers,
                usuarios_regulares: regularUsers,
                total_abogados: lawyers
            };
        } catch (error: any) {
            console.error('Error al obtener estadísticas de admin:', error);
            throw new Error('Error al obtener estadísticas del sistema');
        }
    }

    /**
     * Obtener lista de usuarios con paginación y filtros
     */
    async getUsers(options: {
        page?: number;
        limit?: number;
        role?: string;
        status?: string;
    }) {
        try {
            const { page = 1, limit = 20, role, status } = options;
            
            let users = await UserRepository.findAll();

            // Aplicar filtros
            if (role) {
                users = users.filter(u => u.rol === role);
            }

            if (status === 'active') {
                users = users.filter(u => !u.suspended);
            } else if (status === 'suspended') {
                users = users.filter(u => u.suspended);
            }

            // Calcular paginación
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedUsers = users.slice(startIndex, endIndex);

            // Eliminar password_hash de los resultados
            const sanitizedUsers = paginatedUsers.map(user => {
                const { password_hash, ...userWithoutPassword } = user;
                return userWithoutPassword;
            });

            return {
                users: sanitizedUsers,
                pagination: {
                    page,
                    limit,
                    total: users.length,
                    totalPages: Math.ceil(users.length / limit)
                }
            };
        } catch (error: any) {
            console.error('Error al obtener usuarios:', error);
            throw new Error('Error al obtener lista de usuarios');
        }
    }

    /**
     * Obtener perfiles pendientes de validación
     */
    async getPendingProfiles() {
        try {
            const allUsers = await UserRepository.findAll();
            
            // Filtrar abogados no verificados
            const pendingProfiles = allUsers
                .filter(u => (u.rol === 'lawyer' || u.rol === 'abogado') && !u.verificado)
                .map(user => {
                    const { password_hash, ...userWithoutPassword } = user;
                    return {
                        id: user.id,
                        nombre: user.nombre,
                        apellido: user.apellido,
                        email: user.email,
                        telefono: user.telefono,
                        fecha_registro: user.created_at,
                        rol: user.rol,
                        verificado: user.verificado,
                        // Datos adicionales que vendrían del perfil de abogado
                        cedula_profesional: null,
                        especialidad: null,
                        tipo: 'abogado'
                    };
                });

            return pendingProfiles;
        } catch (error: any) {
            console.error('Error al obtener perfiles pendientes:', error);
            throw new Error('Error al obtener perfiles pendientes');
        }
    }

    /**
     * Validar o rechazar perfil de abogado
     */
    async validateProfile(profileId: string, approved: boolean, motivo?: string) {
        try {
            const userId = parseInt(profileId, 10);
            
            if (isNaN(userId)) {
                throw new Error('ID de perfil inválido');
            }

            const user = await UserRepository.findById(userId);
            if (!user) {
                throw new Error('Usuario no encontrado');
            }

            if (user.rol !== 'lawyer' && user.rol !== 'abogado') {
                throw new Error('El usuario no es un abogado');
            }

            // Actualizar estado de verificación
            const updatedUser = await UserRepository.update(userId, {
                verificado: approved
            });

            // Enviar email de notificación
            if (process.env.SMTP_USER && updatedUser) {
                try {
                    const subject = approved 
                        ? 'Tu perfil ha sido aprobado - LexIA'
                        : 'Actualización sobre tu perfil - LexIA';
                    
                    const message = approved
                        ? `¡Felicidades ${user.nombre}! Tu perfil de abogado ha sido verificado y aprobado.`
                        : `Hola ${user.nombre}, tu perfil requiere correcciones. ${motivo || ''}`;

                    await transporter.sendMail({
                        from: process.env.SMTP_USER,
                        to: user.email,
                        subject,
                        html: `<p>${message}</p>`
                    });
                } catch (emailError) {
                    console.error('Error al enviar email de validación:', emailError);
                }
            }

            return {
                success: true,
                profileId: userId,
                approved,
                verificado: approved
            };
        } catch (error: any) {
            console.error('Error al validar perfil:', error);
            throw error;
        }
    }

    /**
     * Suspender o reactivar cuenta de usuario
     */
    async suspendUser(userId: string, suspended: boolean, motivo?: string) {
        try {
            const userIdNum = parseInt(userId, 10);
            
            if (isNaN(userIdNum)) {
                throw new Error('ID de usuario inválido');
            }

            const user = await UserRepository.findById(userIdNum);
            if (!user) {
                throw new Error('Usuario no encontrado');
            }

            // Actualizar estado de suspensión
            const updatedUser = await UserRepository.update(userIdNum, {
                suspended
            });

            // Enviar email de notificación
            if (process.env.SMTP_USER && updatedUser) {
                try {
                    const subject = suspended 
                        ? 'Tu cuenta ha sido suspendida - LexIA'
                        : 'Tu cuenta ha sido reactivada - LexIA';
                    
                    const message = suspended
                        ? `Hola ${user.nombre}, tu cuenta ha sido suspendida. ${motivo || ''}`
                        : `Hola ${user.nombre}, tu cuenta ha sido reactivada. Puedes continuar usando LexIA.`;

                    await transporter.sendMail({
                        from: process.env.SMTP_USER,
                        to: user.email,
                        subject,
                        html: `<p>${message}</p>`
                    });
                } catch (emailError) {
                    console.error('Error al enviar email de suspensión:', emailError);
                }
            }

            return {
                success: true,
                userId: userIdNum,
                suspended
            };
        } catch (error: any) {
            console.error('Error al suspender/reactivar usuario:', error);
            throw error;
        }
    }

    /**
     * Obtener detalles completos de un usuario
     */
    async getUserDetails(userId: string) {
        try {
            const userIdNum = parseInt(userId, 10);
            
            if (isNaN(userIdNum)) {
                throw new Error('ID de usuario inválido');
            }

            const user = await UserRepository.findById(userIdNum);
            if (!user) {
                throw new Error('Usuario no encontrado');
            }

            // Obtener sesiones activas
            const sessions = await this.getActiveSessions(userIdNum);
            
            // Obtener historial de autenticación (últimos 10 registros)
            const authHistory = await this.getAuthHistory(userIdNum, 10);

            // Eliminar password_hash
            const { password_hash, ...userWithoutPassword } = user;

            return {
                user: userWithoutPassword,
                sessions,
                authHistory,
                statistics: {
                    totalSessions: sessions.length,
                    lastLogin: user.ultimo_acceso,
                    accountAge: this.calculateAccountAge(user.created_at)
                }
            };
        } catch (error: any) {
            console.error('Error al obtener detalles de usuario:', error);
            throw error;
        }
    }

    /**
     * Calcular edad de la cuenta en días
     */
    private calculateAccountAge(createdAt: Date): number {
        const now = new Date();
        const created = new Date(createdAt);
        const diffTime = Math.abs(now.getTime() - created.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }
}

export default new AuthService();