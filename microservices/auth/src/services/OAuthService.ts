import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { OAuth2Client } from 'google-auth-library';
import UserRepository, { CreateUserData } from '../repositories/UserRepository';
import OAuthRepository from '../repositories/OAuthRepository';
import AuthLogRepository from '../repositories/AuthLogRepository';
import RefreshTokenRepository from '../repositories/RefreshTokenRepository';
import { generateTokens, TokenPayload, Tokens } from '../utils/jwt';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost/api/auth/google/callback';

export interface OAuthLoginResult {
    user: any;
    tokens: Tokens;
    isNewUser: boolean;
}

export class OAuthService {
    constructor() {
        this.initializeGoogleStrategy();
    }

    /**
     * Configurar estrategia de Google OAuth
     */
    private initializeGoogleStrategy(): void {
        if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
            console.warn('⚠️  OAuth2 Google no configurado. Variables GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET faltantes.');
            return;
        }

        passport.use(
            new GoogleStrategy(
                {
                    clientID: GOOGLE_CLIENT_ID,
                    clientSecret: GOOGLE_CLIENT_SECRET,
                    callbackURL: GOOGLE_CALLBACK_URL,
                    scope: ['profile', 'email']
                },
                async (
                    accessToken: string,
                    refreshToken: string,
                    profile: Profile,
                    done: VerifyCallback
                ) => {
                    try {
                        const result = await this.handleGoogleCallback(
                            accessToken,
                            refreshToken,
                            profile
                        );
                        done(null, result);
                    } catch (error) {
                        done(error as Error);
                    }
                }
            )
        );

        passport.serializeUser((user: any, done) => {
            done(null, user);
        });

        passport.deserializeUser((user: any, done) => {
            done(null, user);
        });

        console.log('✅ OAuth2 Google configurado correctamente');
    }

    /**
     * Manejar callback de Google OAuth
     */
    private async handleGoogleCallback(
        accessToken: string,
        refreshToken: string,
        profile: Profile
    ): Promise<OAuthLoginResult> {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value;

        if (!email) {
            throw new Error('No se pudo obtener el email de Google');
        }

        // Buscar si ya existe cuenta OAuth vinculada
        let oauthAccount = await OAuthRepository.findByProvider('google', googleId);
        let user;
        let isNewUser = false;

        if (oauthAccount) {
            // Usuario existente con cuenta Google
            user = await UserRepository.findById(oauthAccount.usuario_id);

            if (!user) {
                throw new Error('Usuario vinculado no encontrado');
            }

            // Actualizar tokens de OAuth
            await OAuthRepository.updateTokens(
                'google',
                googleId,
                accessToken,
                refreshToken,
                new Date(Date.now() + 3600 * 1000) // 1 hora
            );
        } else {
            // Verificar si existe usuario con ese email
            user = await UserRepository.findByEmail(email);

            if (user) {
                // Usuario existe pero nunca vinculó Google, crear vinculación
                await OAuthRepository.upsert({
                    usuario_id: user.id,
                    provider: 'google',
                    provider_account_id: googleId,
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    token_expires_at: new Date(Date.now() + 3600 * 1000),
                    profile_data: {
                        name: profile.displayName,
                        picture: profile.photos?.[0]?.value,
                        locale: profile._json.locale
                    }
                });

                // Marcar email como verificado (Google ya lo verificó)
                if (!user.email_verified) {
                    await UserRepository.verifyEmail(user.id);
                }
            } else {
                // Nuevo usuario, crear cuenta
                const names = profile.displayName?.split(' ') || ['', ''];
                const nombre = names[0] || profile.name?.givenName || 'Usuario';
                const apellido = names.slice(1).join(' ') || profile.name?.familyName || 'Google';

                const userData: CreateUserData = {
                    email,
                    nombre,
                    apellido,
                    rol: 'user',
                    account_type: 'google'
                    // No password_hash para cuentas OAuth
                };

                user = await UserRepository.create(userData);

                // Marcar email como verificado inmediatamente
                await UserRepository.verifyEmail(user.id);

                // Crear vinculación OAuth
                await OAuthRepository.upsert({
                    usuario_id: user.id,
                    provider: 'google',
                    provider_account_id: googleId,
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    token_expires_at: new Date(Date.now() + 3600 * 1000),
                    profile_data: {
                        name: profile.displayName,
                        picture: profile.photos?.[0]?.value,
                        locale: profile._json.locale
                    }
                });

                isNewUser = true;

                // Log de registro
                await AuthLogRepository.create({
                    usuario_id: user.id,
                    email: user.email,
                    event_type: 'oauth_register',
                    success: true,
                    metadata: { provider: 'google' }
                });
            }
        }

        // Generar JWT tokens
        const tokenPayload: TokenPayload = {
            userId: user.id,
            email: user.email,
            rol: user.rol,
            twoFactorEnabled: user.two_factor_enabled
        };

        const tokens = generateTokens(tokenPayload);

        // Guardar refresh token
        await RefreshTokenRepository.create({
            usuario_id: user.id,
            token: tokens.refreshToken,
            expires_at: new Date(Date.now() + tokens.refreshTokenExpiresIn * 1000)
        });

        // Log de login exitoso
        await AuthLogRepository.create({
            usuario_id: user.id,
            email: user.email,
            event_type: 'oauth_login',
            success: true,
            metadata: { provider: 'google' }
        });

        // Actualizar último login
        await UserRepository.resetFailedAttempts(user.id);

        const { password_hash, ...userWithoutPassword } = user;

        return {
            user: userWithoutPassword,
            tokens,
            isNewUser
        };
    }

    /**
     * Vincular cuenta Google a usuario existente
     */
    async linkGoogleAccount(
        userId: number,
        accessToken: string,
        refreshToken: string,
        profile: Profile
    ): Promise<boolean> {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value;

        if (!email) {
            throw new Error('No se pudo obtener el email de Google');
        }

        // Verificar que el usuario existe
        const user = await UserRepository.findById(userId);
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        // Verificar que el email coincida
        if (user.email !== email) {
            throw new Error('El email de Google no coincide con el email de tu cuenta');
        }

        // Verificar que no esté ya vinculado
        const existing = await OAuthRepository.hasOAuthAccount(userId, 'google');
        if (existing) {
            throw new Error('Esta cuenta ya tiene Google vinculado');
        }

        // Crear vinculación
        await OAuthRepository.upsert({
            usuario_id: userId,
            provider: 'google',
            provider_account_id: googleId,
            access_token: accessToken,
            refresh_token: refreshToken,
            token_expires_at: new Date(Date.now() + 3600 * 1000),
            profile_data: {
                name: profile.displayName,
                picture: profile.photos?.[0]?.value,
                locale: profile._json.locale
            }
        });

        // Marcar email como verificado
        if (!user.email_verified) {
            await UserRepository.verifyEmail(userId);
        }

        // Log del evento
        await AuthLogRepository.create({
            usuario_id: userId,
            email: user.email,
            event_type: 'oauth_linked',
            success: true,
            metadata: { provider: 'google' }
        });

        return true;
    }

    /**
     * Desvincular cuenta Google
     */
    async unlinkGoogleAccount(userId: number): Promise<boolean> {
        const user = await UserRepository.findById(userId);
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        // Verificar que tenga contraseña (no puede quedarse sin forma de login)
        if (!user.password_hash) {
            throw new Error('Debes establecer una contraseña antes de desvincular Google');
        }

        // Buscar cuenta OAuth
        const oauthAccounts = await OAuthRepository.findByUserId(userId);
        const googleAccount = oauthAccounts.find(acc => acc.provider === 'google');

        if (!googleAccount) {
            throw new Error('No hay cuenta Google vinculada');
        }

        // Eliminar vinculación
        await OAuthRepository.delete('google', googleAccount.provider_account_id);

        // Log del evento
        await AuthLogRepository.create({
            usuario_id: userId,
            email: user.email,
            event_type: 'oauth_unlinked',
            success: true,
            metadata: { provider: 'google' }
        });

        return true;
    }

    /**
     * Obtener cuentas OAuth vinculadas
     */
    async getLinkedAccounts(userId: number): Promise<Array<{
        provider: string;
        linkedAt: Date;
        profileData: any;
    }>> {
        const accounts = await OAuthRepository.findByUserId(userId);

        return accounts.map(acc => ({
            provider: acc.provider,
            linkedAt: acc.created_at,
            profileData: acc.profile_data
        }));
    }

    /**
     * Verificar Google Access Token (para web)
     * Recibe el access token de Google y obtiene información del perfil
     */
    private async verifyGoogleAccessToken(accessToken: string): Promise<{
        googleId: string;
        email: string;
        nombre: string;
        apellido: string;
        picture?: string;
    }> {
        try {
            // Obtener información del usuario usando el access token
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Access token inválido');
            }

            const data: any = await response.json();

            if (!data.email || !data.id) {
                throw new Error('Datos incompletos del usuario');
            }

            return {
                googleId: data.id,
                email: data.email,
                nombre: data.given_name || 'Usuario',
                apellido: data.family_name || '',
                picture: data.picture
            };
        } catch (error: any) {
            console.error('Error al verificar Google Access Token:', error);
            throw new Error('Access token de Google inválido o expirado');
        }
    }

    /**
     * Verificar Google Token (idToken o accessToken)
     * Detecta automáticamente el tipo de token y lo procesa
     */
    async verifyGoogleToken(token: string): Promise<OAuthLoginResult> {
        // Intentar primero como idToken (móvil)
        try {
            return await this.verifyGoogleIdToken(token);
        } catch (idTokenError) {
            console.log('No es un idToken válido, intentando como accessToken...');

            // Si falla, intentar como accessToken (web)
            try {
                const userData = await this.verifyGoogleAccessToken(token);
                return await this.handleGoogleUser(userData, 'web');
            } catch (accessTokenError) {
                console.error('Token inválido tanto para idToken como accessToken:', { idTokenError, accessTokenError });
                throw new Error('Token de Google inválido');
            }
        }
    }

    /**
     * Procesar usuario de Google (común para idToken y accessToken)
     */
    private async handleGoogleUser(
        userData: {
            googleId: string;
            email: string;
            nombre: string;
            apellido: string;
            picture?: string;
        },
        platform: 'mobile' | 'web'
    ): Promise<OAuthLoginResult> {
        const { googleId, email, nombre, apellido, picture } = userData;

        // Buscar si ya existe cuenta OAuth vinculada
        let oauthAccount = await OAuthRepository.findByProvider('google', googleId);
        let user;
        let isNewUser = false;

        if (oauthAccount) {
            // Usuario existente con cuenta Google
            user = await UserRepository.findById(oauthAccount.usuario_id);

            if (!user) {
                throw new Error('Usuario vinculado no encontrado');
            }
        } else {
            // Verificar si existe usuario con ese email
            user = await UserRepository.findByEmail(email);

            if (user) {
                // Usuario existe pero nunca vinculó Google, crear vinculación
                await OAuthRepository.upsert({
                    usuario_id: user.id,
                    provider: 'google',
                    provider_account_id: googleId,
                    access_token: '',
                    refresh_token: '',
                    token_expires_at: new Date(Date.now() + 3600 * 1000),
                    profile_data: {
                        name: `${nombre} ${apellido}`,
                        picture,
                        email
                    }
                });

                // Marcar email como verificado (Google ya lo verificó)
                if (!user.email_verified) {
                    await UserRepository.verifyEmail(user.id);
                }
            } else {
                // Nuevo usuario, crear cuenta
                const userData: CreateUserData = {
                    email,
                    nombre,
                    apellido,
                    rol: 'user',
                    account_type: 'google'
                };

                user = await UserRepository.create(userData);

                // Marcar email como verificado inmediatamente
                await UserRepository.verifyEmail(user.id);

                // Crear vinculación OAuth
                await OAuthRepository.upsert({
                    usuario_id: user.id,
                    provider: 'google',
                    provider_account_id: googleId,
                    access_token: '',
                    refresh_token: '',
                    token_expires_at: new Date(Date.now() + 3600 * 1000),
                    profile_data: {
                        name: `${nombre} ${apellido}`,
                        picture,
                        email
                    }
                });

                isNewUser = true;

                // Log de registro
                await AuthLogRepository.create({
                    usuario_id: user.id,
                    email: user.email,
                    event_type: platform === 'mobile' ? 'oauth_register_mobile' : 'oauth_register_web',
                    success: true,
                    metadata: { provider: 'google', platform }
                });
            }
        }

        // Generar JWT tokens
        const tokenPayload: TokenPayload = {
            userId: user.id,
            email: user.email,
            rol: user.rol,
            twoFactorEnabled: user.two_factor_enabled
        };

        const tokens = generateTokens(tokenPayload);

        // Guardar refresh token
        await RefreshTokenRepository.create({
            usuario_id: user.id,
            token: tokens.refreshToken,
            expires_at: new Date(Date.now() + tokens.refreshTokenExpiresIn * 1000)
        });

        // Log de login exitoso
        await AuthLogRepository.create({
            usuario_id: user.id,
            email: user.email,
            event_type: platform === 'mobile' ? 'oauth_login_mobile' : 'oauth_login_web',
            success: true,
            metadata: { provider: 'google', platform }
        });

        // Actualizar último login
        await UserRepository.resetFailedAttempts(user.id);

        const { password_hash, ...userWithoutPassword } = user;

        return {
            user: userWithoutPassword,
            tokens,
            isNewUser
        };
    }

    /**
     * Verificar Google ID Token (para apps móviles)
     * Recibe el ID token de Google Sign-In y retorna los datos del usuario
     */
    async verifyGoogleIdToken(idToken: string): Promise<OAuthLoginResult> {
        const client = new OAuth2Client(GOOGLE_CLIENT_ID);

        try {
            // Verificar el token con Google
            const ticket = await client.verifyIdToken({
                idToken,
                audience: GOOGLE_CLIENT_ID,
            });

            const payload = ticket.getPayload();

            if (!payload || !payload.email || !payload.sub) {
                throw new Error('Token inválido o datos incompletos');
            }

            // Extraer datos del payload
            const googleId = payload.sub;
            const email = payload.email;
            const nombre = payload.given_name || 'Usuario';
            const apellido = payload.family_name || '';
            const picture = payload.picture;

            // Buscar si ya existe cuenta OAuth vinculada
            let oauthAccount = await OAuthRepository.findByProvider('google', googleId);
            let user;
            let isNewUser = false;

            if (oauthAccount) {
                // Usuario existente con cuenta Google
                user = await UserRepository.findById(oauthAccount.usuario_id);

                if (!user) {
                    throw new Error('Usuario vinculado no encontrado');
                }
            } else {
                // Verificar si existe usuario con ese email
                user = await UserRepository.findByEmail(email);

                if (user) {
                    // Usuario existe pero nunca vinculó Google, crear vinculación
                    await OAuthRepository.upsert({
                        usuario_id: user.id,
                        provider: 'google',
                        provider_account_id: googleId,
                        access_token: '', // No tenemos access token en este flujo
                        refresh_token: '',
                        token_expires_at: new Date(Date.now() + 3600 * 1000),
                        profile_data: {
                            name: `${nombre} ${apellido}`,
                            picture,
                            email
                        }
                    });

                    // Marcar email como verificado (Google ya lo verificó)
                    if (!user.email_verified) {
                        await UserRepository.verifyEmail(user.id);
                    }
                } else {
                    // Nuevo usuario, crear cuenta
                    const userData: CreateUserData = {
                        email,
                        nombre,
                        apellido,
                        rol: 'user',
                        account_type: 'google'
                        // No password_hash para cuentas OAuth
                    };

                    user = await UserRepository.create(userData);

                    // Marcar email como verificado inmediatamente
                    await UserRepository.verifyEmail(user.id);

                    // Crear vinculación OAuth
                    await OAuthRepository.upsert({
                        usuario_id: user.id,
                        provider: 'google',
                        provider_account_id: googleId,
                        access_token: '',
                        refresh_token: '',
                        token_expires_at: new Date(Date.now() + 3600 * 1000),
                        profile_data: {
                            name: `${nombre} ${apellido}`,
                            picture,
                            email
                        }
                    });

                    isNewUser = true;

                    // Log de registro
                    await AuthLogRepository.create({
                        usuario_id: user.id,
                        email: user.email,
                        event_type: 'oauth_register_mobile',
                        success: true,
                        metadata: { provider: 'google', platform: 'mobile' }
                    });
                }
            }

            // Generar JWT tokens
            const tokenPayload: TokenPayload = {
                userId: user.id,
                email: user.email,
                rol: user.rol,
                twoFactorEnabled: user.two_factor_enabled
            };

            const tokens = generateTokens(tokenPayload);

            // Guardar refresh token
            await RefreshTokenRepository.create({
                usuario_id: user.id,
                token: tokens.refreshToken,
                expires_at: new Date(Date.now() + tokens.refreshTokenExpiresIn * 1000)
            });

            // Log de login exitoso
            await AuthLogRepository.create({
                usuario_id: user.id,
                email: user.email,
                event_type: 'oauth_login_mobile',
                success: true,
                metadata: { provider: 'google', platform: 'mobile' }
            });

            // Actualizar último login
            await UserRepository.resetFailedAttempts(user.id);

            const { password_hash, ...userWithoutPassword } = user;

            return {
                user: userWithoutPassword,
                tokens,
                isNewUser
            };
        } catch (error: any) {
            console.error('Error al verificar Google ID Token:', error);
            throw new Error('Token de Google inválido o expirado');
        }
    }

    /**
     * Obtener instancia de passport configurada
     */
    getPassport(): typeof passport {
        return passport;
    }
}

export default new OAuthService();