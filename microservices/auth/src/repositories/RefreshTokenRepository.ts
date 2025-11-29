import { Pool, QueryResult } from 'pg';
import pool from '../config/database';

export interface RefreshToken {
    id: number;
    usuario_id: number;
    token: string;
    expires_at: Date;
    created_at: Date;
    revoked: boolean;
    revoked_at?: Date;
    ip_address?: string;
    user_agent?: string;
    device_info?: string;
}

export interface CreateRefreshTokenData {
    usuario_id: number;
    token: string;
    expires_at: Date;
    ip_address?: string;
    user_agent?: string;
    device_info?: string;
}

export class RefreshTokenRepository {
    private pool: Pool;

    constructor() {
        this.pool = pool;
    }

    /**
     * Crear nuevo refresh token
     */
    async create(data: CreateRefreshTokenData): Promise<RefreshToken> {
        const query = `
            INSERT INTO refresh_tokens (
                usuario_id, token, expires_at, ip_address, user_agent, device_info
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const values = [
            data.usuario_id,
            data.token,
            data.expires_at,
            data.ip_address || null,
            data.user_agent || null,
            data.device_info || null
        ];

        const result: QueryResult<RefreshToken> = await this.pool.query(query, values);
        return result.rows[0];
    }

    /**
     * Buscar refresh token por token string
     */
    async findByToken(token: string): Promise<RefreshToken | null> {
        const query = 'SELECT * FROM refresh_tokens WHERE token = $1 AND revoked = false';
        const result: QueryResult<RefreshToken> = await this.pool.query(query, [token]);
        return result.rows[0] || null;
    }

    /**
     * Obtener todos los tokens activos de un usuario
     */
    async findByUserId(userId: number): Promise<RefreshToken[]> {
        const query = `
            SELECT * FROM refresh_tokens
            WHERE usuario_id = $1
              AND revoked = false
              AND expires_at > NOW()
            ORDER BY created_at DESC
        `;

        const result: QueryResult<RefreshToken> = await this.pool.query(query, [userId]);
        return result.rows;
    }

    /**
     * Revocar un token específico
     */
    async revoke(token: string): Promise<boolean> {
        const query = `
            UPDATE refresh_tokens
            SET revoked = true,
                revoked_at = NOW()
            WHERE token = $1
        `;

        const result = await this.pool.query(query, [token]);
        return result.rowCount ? result.rowCount > 0 : false;
    }

    /**
     * Revocar todos los tokens de un usuario
     */
    async revokeAllForUser(userId: number): Promise<number> {
        const query = `
            UPDATE refresh_tokens
            SET revoked = true,
                revoked_at = NOW()
            WHERE usuario_id = $1
              AND revoked = false
        `;

        const result = await this.pool.query(query, [userId]);
        return result.rowCount || 0;
    }

    /**
     * Verificar si un token es válido (no expirado y no revocado)
     */
    async isValid(token: string): Promise<boolean> {
        const query = `
            SELECT COUNT(*) as count
            FROM refresh_tokens
            WHERE token = $1
              AND revoked = false
              AND expires_at > NOW()
        `;

        const result = await this.pool.query(query, [token]);
        return parseInt(result.rows[0].count, 10) > 0;
    }

    /**
     * Eliminar tokens expirados (limpieza automática)
     */
    async cleanupExpired(): Promise<number> {
        const query = `
            DELETE FROM refresh_tokens
            WHERE expires_at < NOW() - INTERVAL '30 days'
        `;

        const result = await this.pool.query(query);
        return result.rowCount || 0;
    }

    /**
     * Contar sesiones activas de un usuario
     */
    async countActiveSessions(userId: number): Promise<number> {
        const query = `
            SELECT COUNT(*) as count
            FROM refresh_tokens
            WHERE usuario_id = $1
              AND revoked = false
              AND expires_at > NOW()
        `;

        const result = await this.pool.query(query, [userId]);
        return parseInt(result.rows[0].count, 10);
    }

    /**
     * Obtener información de sesiones activas
     */
    async getActiveSessions(userId: number): Promise<Array<{
        created_at: Date;
        expires_at: Date;
        ip_address: string;
        device_info: string;
    }>> {
        const query = `
            SELECT created_at, expires_at, ip_address, device_info
            FROM refresh_tokens
            WHERE usuario_id = $1
              AND revoked = false
              AND expires_at > NOW()
            ORDER BY created_at DESC
        `;

        const result = await this.pool.query(query, [userId]);
        return result.rows;
    }
}

export default new RefreshTokenRepository();