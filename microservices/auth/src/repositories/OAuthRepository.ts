import { Pool, QueryResult } from 'pg';
import pool from '../config/database';

export interface OAuthAccount {
    id: number;
    usuario_id: number;
    provider: string;
    provider_account_id: string;
    access_token?: string;
    refresh_token?: string;
    token_expires_at?: Date;
    profile_data?: any;
    created_at: Date;
    updated_at: Date;
}

export interface CreateOAuthAccountData {
    usuario_id: number;
    provider: string;
    provider_account_id: string;
    access_token?: string;
    refresh_token?: string;
    token_expires_at?: Date;
    profile_data?: any;
}

export class OAuthRepository {
    private pool: Pool;

    constructor() {
        this.pool = pool;
    }

    /**
     * Crear o actualizar cuenta OAuth
     */
    async upsert(data: CreateOAuthAccountData): Promise<OAuthAccount> {
        const query = `
            INSERT INTO oauth_accounts (
                usuario_id, provider, provider_account_id,
                access_token, refresh_token, token_expires_at, profile_data
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (provider, provider_account_id)
            DO UPDATE SET
                usuario_id = EXCLUDED.usuario_id,
                access_token = EXCLUDED.access_token,
                refresh_token = EXCLUDED.refresh_token,
                token_expires_at = EXCLUDED.token_expires_at,
                profile_data = EXCLUDED.profile_data,
                updated_at = NOW()
            RETURNING *
        `;

        const values = [
            data.usuario_id,
            data.provider,
            data.provider_account_id,
            data.access_token || null,
            data.refresh_token || null,
            data.token_expires_at || null,
            data.profile_data ? JSON.stringify(data.profile_data) : null
        ];

        const result: QueryResult<OAuthAccount> = await this.pool.query(query, values);
        return result.rows[0];
    }

    /**
     * Buscar cuenta OAuth por provider y provider_account_id
     */
    async findByProvider(provider: string, providerAccountId: string): Promise<OAuthAccount | null> {
        const query = `
            SELECT * FROM oauth_accounts
            WHERE provider = $1 AND provider_account_id = $2
        `;

        const result: QueryResult<OAuthAccount> = await this.pool.query(query, [provider, providerAccountId]);
        return result.rows[0] || null;
    }

    /**
     * Buscar todas las cuentas OAuth de un usuario
     */
    async findByUserId(userId: number): Promise<OAuthAccount[]> {
        const query = 'SELECT * FROM oauth_accounts WHERE usuario_id = $1';
        const result: QueryResult<OAuthAccount> = await this.pool.query(query, [userId]);
        return result.rows;
    }

    /**
     * Verificar si un usuario tiene cuenta OAuth vinculada
     */
    async hasOAuthAccount(userId: number, provider: string): Promise<boolean> {
        const query = `
            SELECT COUNT(*) as count
            FROM oauth_accounts
            WHERE usuario_id = $1 AND provider = $2
        `;

        const result = await this.pool.query(query, [userId, provider]);
        return parseInt(result.rows[0].count, 10) > 0;
    }

    /**
     * Actualizar tokens de OAuth
     */
    async updateTokens(
        provider: string,
        providerAccountId: string,
        accessToken: string,
        refreshToken?: string,
        expiresAt?: Date
    ): Promise<boolean> {
        const query = `
            UPDATE oauth_accounts
            SET access_token = $3,
                refresh_token = COALESCE($4, refresh_token),
                token_expires_at = $5,
                updated_at = NOW()
            WHERE provider = $1 AND provider_account_id = $2
        `;

        const result = await this.pool.query(query, [
            provider,
            providerAccountId,
            accessToken,
            refreshToken || null,
            expiresAt || null
        ]);

        return result.rowCount ? result.rowCount > 0 : false;
    }

    /**
     * Eliminar cuenta OAuth
     */
    async delete(provider: string, providerAccountId: string): Promise<boolean> {
        const query = `
            DELETE FROM oauth_accounts
            WHERE provider = $1 AND provider_account_id = $2
        `;

        const result = await this.pool.query(query, [provider, providerAccountId]);
        return result.rowCount ? result.rowCount > 0 : false;
    }

    /**
     * Eliminar todas las cuentas OAuth de un usuario
     */
    async deleteAllForUser(userId: number): Promise<number> {
        const query = 'DELETE FROM oauth_accounts WHERE usuario_id = $1';
        const result = await this.pool.query(query, [userId]);
        return result.rowCount || 0;
    }
}

export default new OAuthRepository();