import { Pool, QueryResult } from 'pg';
import pool from '../config/database';

export interface PasswordResetToken {
    id: number;
    usuario_id: number;
    token: string;
    expires_at: Date;
    created_at: Date;
    used_at?: Date;
    ip_address?: string;
    attempts: number;
}

export interface CreatePasswordResetTokenData {
    usuario_id: number;
    token: string;
    expires_at: Date;
    ip_address?: string;
}

export class PasswordResetRepository {
    private pool: Pool;

    constructor() {
        this.pool = pool;
    }

    /**
     * Crear token de reset de contraseña
     */
    async create(data: CreatePasswordResetTokenData): Promise<PasswordResetToken> {
        const query = `
            INSERT INTO password_reset_tokens (
                usuario_id, token, expires_at, ip_address
            )
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;

        const values = [data.usuario_id, data.token, data.expires_at, data.ip_address || null];
        const result: QueryResult<PasswordResetToken> = await this.pool.query(query, values);
        return result.rows[0];
    }

    /**
     * Buscar token por string
     */
    async findByToken(token: string): Promise<PasswordResetToken | null> {
        const query = `
            SELECT * FROM password_reset_tokens
            WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()
        `;

        const result: QueryResult<PasswordResetToken> = await this.pool.query(query, [token]);
        return result.rows[0] || null;
    }

    /**
     * Marcar token como usado
     */
    async markAsUsed(token: string): Promise<boolean> {
        const query = `
            UPDATE password_reset_tokens
            SET used_at = NOW()
            WHERE token = $1
        `;

        const result = await this.pool.query(query, [token]);
        return result.rowCount ? result.rowCount > 0 : false;
    }

    /**
     * Incrementar intentos
     */
    async incrementAttempts(token: string): Promise<boolean> {
        const query = `
            UPDATE password_reset_tokens
            SET attempts = attempts + 1
            WHERE token = $1
        `;

        const result = await this.pool.query(query, [token]);
        return result.rowCount ? result.rowCount > 0 : false;
    }

    /**
     * Invalidar tokens anteriores de un usuario
     */
    async invalidateUserTokens(userId: number): Promise<number> {
        const query = `
            UPDATE password_reset_tokens
            SET used_at = NOW()
            WHERE usuario_id = $1 AND used_at IS NULL
        `;

        const result = await this.pool.query(query, [userId]);
        return result.rowCount || 0;
    }

    /**
     * Verificar si un usuario tiene un token activo reciente (anti-spam)
     */
    async hasRecentToken(userId: number, minutesAgo: number = 5): Promise<boolean> {
        const query = `
            SELECT COUNT(*) as count
            FROM password_reset_tokens
            WHERE usuario_id = $1
              AND created_at > NOW() - INTERVAL '${minutesAgo} minutes'
        `;

        const result = await this.pool.query(query, [userId]);
        return parseInt(result.rows[0].count, 10) > 0;
    }

    /**
     * Eliminar tokens expirados
     */
    async cleanupExpired(): Promise<number> {
        const query = `
            DELETE FROM password_reset_tokens
            WHERE expires_at < NOW() - INTERVAL '7 days'
        `;

        const result = await this.pool.query(query);
        return result.rowCount || 0;
    }
}

export default new PasswordResetRepository();