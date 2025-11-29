import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import TwoFactorRepository from '../repositories/TwoFactorRepository';
import UserRepository from '../repositories/UserRepository';
import AuthLogRepository from '../repositories/AuthLogRepository';
import { generateBackupCodes, hashBackupCode, verifyBackupCode } from '../utils/tokens';
import { transporter, emailTemplates } from '../config/email';

export interface TwoFactorSetup {
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
}

export class TwoFactorService {
    /**
     * Configurar 2FA para un usuario (paso 1: generar secret y QR)
     */
    async setup(userId: number): Promise<TwoFactorSetup> {
        const user = await UserRepository.findById(userId);
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        // Verificar si ya tiene 2FA habilitado
        const existing2FA = await TwoFactorRepository.findByUserId(userId);
        if (existing2FA && existing2FA.enabled) {
            throw new Error('2FA ya está habilitado. Deshabilítalo primero si quieres reconfigurarlo.');
        }

        // Generar secret
        const secret = speakeasy.generateSecret({
            name: `LexIA (${user.email})`,
            issuer: 'LexIA',
            length: 32
        });

        // Generar códigos de respaldo
        const backupCodesPlain = generateBackupCodes(8);
        const backupCodesHashed = backupCodesPlain.map(code => hashBackupCode(code));

        // Guardar en BD (pero no habilitar todavía)
        await TwoFactorRepository.create({
            usuario_id: userId,
            secret: secret.base32,
            backup_codes: backupCodesHashed
        });

        // Generar QR code
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

        return {
            secret: secret.base32,
            qrCodeUrl,
            backupCodes: backupCodesPlain
        };
    }

    /**
     * Habilitar 2FA después de verificar el código (paso 2)
     */
    async enable(userId: number, code: string): Promise<boolean> {
        const twoFactor = await TwoFactorRepository.findByUserId(userId);
        if (!twoFactor) {
            throw new Error('Primero debes configurar 2FA usando /setup-2fa');
        }

        if (twoFactor.enabled) {
            throw new Error('2FA ya está habilitado');
        }

        // Verificar código TOTP
        const isValid = speakeasy.totp.verify({
            secret: twoFactor.secret,
            encoding: 'base32',
            token: code,
            window: 2 // Permitir 2 intervalos de tiempo antes/después
        });

        if (!isValid) {
            throw new Error('Código 2FA inválido');
        }

        // Habilitar 2FA
        await TwoFactorRepository.enable(userId);
        await UserRepository.enable2FA(userId);

        // Log del evento
        const user = await UserRepository.findById(userId);
        if (user) {
            await AuthLogRepository.create({
                usuario_id: userId,
                email: user.email,
                event_type: '2fa_enabled',
                success: true
            });

            // Enviar email de confirmación
            if (process.env.SMTP_USER) {
                try {
                    const emailContent = emailTemplates.twoFactorEnabled(user.nombre);
                    await transporter.sendMail({
                        from: process.env.SMTP_USER,
                        to: user.email,
                        subject: emailContent.subject,
                        html: emailContent.html
                    });
                } catch (error) {
                    console.error('Error al enviar email de 2FA:', error);
                }
            }
        }

        return true;
    }

    /**
     * Deshabilitar 2FA
     */
    async disable(userId: number, password: string): Promise<boolean> {
        const user = await UserRepository.findById(userId);
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        // Verificar contraseña para seguridad
        const bcrypt = await import('bcryptjs');
        if (!user.password_hash) {
            throw new Error('Esta cuenta usa OAuth y no puede deshabilitar 2FA de esta forma');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            throw new Error('Contraseña incorrecta');
        }

        // Deshabilitar 2FA
        await TwoFactorRepository.disable(userId);
        await UserRepository.disable2FA(userId);

        // Log del evento
        await AuthLogRepository.create({
            usuario_id: userId,
            email: user.email,
            event_type: '2fa_disabled',
            success: true
        });

        return true;
    }

    /**
     * Verificar código TOTP
     */
    async verifyCode(userId: number, code: string): Promise<boolean> {
        const twoFactor = await TwoFactorRepository.findByUserId(userId);
        if (!twoFactor || !twoFactor.enabled) {
            throw new Error('2FA no está habilitado');
        }

        // Verificar código TOTP
        const isValid = speakeasy.totp.verify({
            secret: twoFactor.secret,
            encoding: 'base32',
            token: code,
            window: 2
        });

        if (isValid) {
            // Actualizar timestamp de último uso
            await TwoFactorRepository.updateLastUsed(userId);
            return true;
        }

        return false;
    }

    /**
     * Verificar código de respaldo
     */
    async verifyBackupCode(userId: number, code: string): Promise<boolean> {
        const twoFactor = await TwoFactorRepository.findByUserId(userId);
        if (!twoFactor || !twoFactor.enabled) {
            throw new Error('2FA no está habilitado');
        }

        // Verificar contra cada código de respaldo hasheado
        for (const hashedCode of twoFactor.backup_codes) {
            if (verifyBackupCode(code, hashedCode)) {
                // Código válido, removerlo para que no se pueda usar de nuevo
                await TwoFactorRepository.removeBackupCode(userId, hashedCode);

                // Actualizar timestamp
                await TwoFactorRepository.updateLastUsed(userId);

                // Log del evento
                const user = await UserRepository.findById(userId);
                if (user) {
                    await AuthLogRepository.create({
                        usuario_id: userId,
                        email: user.email,
                        event_type: '2fa_backup_code_used',
                        success: true
                    });
                }

                return true;
            }
        }

        return false;
    }

    /**
     * Regenerar códigos de respaldo
     */
    async regenerateBackupCodes(userId: number, password: string): Promise<string[]> {
        const user = await UserRepository.findById(userId);
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        // Verificar contraseña
        const bcrypt = await import('bcryptjs');
        if (!user.password_hash) {
            throw new Error('Esta cuenta usa OAuth');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            throw new Error('Contraseña incorrecta');
        }

        // Generar nuevos códigos
        const backupCodesPlain = generateBackupCodes(8);
        const backupCodesHashed = backupCodesPlain.map(code => hashBackupCode(code));

        // Actualizar en BD
        await TwoFactorRepository.regenerateBackupCodes(userId, backupCodesHashed);

        // Log del evento
        await AuthLogRepository.create({
            usuario_id: userId,
            email: user.email,
            event_type: '2fa_backup_codes_regenerated',
            success: true
        });

        return backupCodesPlain;
    }

    /**
     * Obtener cantidad de códigos de respaldo restantes
     */
    async getBackupCodesCount(userId: number): Promise<number> {
        return await TwoFactorRepository.countBackupCodes(userId);
    }

    /**
     * Verificar si el usuario tiene 2FA habilitado
     */
    async isEnabled(userId: number): Promise<boolean> {
        return await TwoFactorRepository.isEnabled(userId);
    }

    /**
     * Obtener información de 2FA (sin el secret)
     */
    async getInfo(userId: number): Promise<{
        enabled: boolean;
        backupCodesCount: number;
        lastUsedAt?: Date;
    }> {
        const twoFactor = await TwoFactorRepository.findByUserId(userId);

        if (!twoFactor) {
            return {
                enabled: false,
                backupCodesCount: 0
            };
        }

        return {
            enabled: twoFactor.enabled,
            backupCodesCount: twoFactor.backup_codes.length,
            lastUsedAt: twoFactor.last_used_at
        };
    }
}

export default new TwoFactorService();