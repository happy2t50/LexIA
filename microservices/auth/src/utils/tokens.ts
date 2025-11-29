import crypto from 'crypto';

/**
 * Genera un token aleatorio seguro para verificación de email o reset de contraseña
 */
export function generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Genera códigos de respaldo para 2FA (8 códigos de 8 caracteres cada uno)
 */
export function generateBackupCodes(count: number = 8): string[] {
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
        // Generar código alfanumérico de 8 caracteres
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        // Formatear como XXXX-XXXX
        codes.push(`${code.substring(0, 4)}-${code.substring(4, 8)}`);
    }

    return codes;
}

/**
 * Hashea un código de respaldo para almacenarlo en la base de datos
 */
export function hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Verifica si un código de respaldo coincide con su hash
 */
export function verifyBackupCode(code: string, hash: string): boolean {
    const codeHash = hashBackupCode(code);
    return codeHash === hash;
}

/**
 * Calcula la fecha de expiración para un token
 * @param hours Horas hasta la expiración
 */
export function calculateExpiration(hours: number): Date {
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + hours);
    return expiration;
}

/**
 * Verifica si un token ha expirado
 */
export function isTokenExpired(expiresAt: Date): boolean {
    return new Date() > new Date(expiresAt);
}