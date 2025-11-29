import { Pool, QueryResult } from 'pg';
import pool from '../config/database';

export interface TwoFactorAuth {
    id: number;
    usuario_id: number;
    secret: string;
    enabled: boolean;
    backup_codes: string[];
    created_at: Date;
    enabled_at?: Date;
    last_used_at?: Date;
}

export interface CreateTwoFactorData {
    usuario_id: number;
    secret: string;
    backup_codes: string[];
}

export class TwoFactorRepository {
    private pool: Pool;

    constructor() {
        this.pool = pool;
    }

    /**
     * Crear configuración 2FA
     */
    async create(data: CreateTwoFactorData): Promise<TwoFactorAuth> {
        const query = `
            INSERT INTO two_factor_auth (usuario_id, secret, backup_codes, enabled)
            VALUES ($1, $2, $3, false)
            ON CONFLICT (usuario_id)
            DO UPDATE SET
                secret = EXCLUDED.secret,
                backup_codes = EXCLUDED.backup_codes,
                enabled = false
            RETURNING *
        `;

        const values = [data.usuario_id, data.secret, data.backup_codes];
        const result: QueryResult<TwoFactorAuth> = await this.pool.query(query, values);
        return result.rows[0];
    }

    /**
     * Buscar configuración 2FA por usuario
     */
    async findByUserId(userId: number): Promise<TwoFactorAuth | null> {
        const query = 'SELECT * FROM two_factor_auth WHERE usuario_id = $1';
        const result: QueryResult<TwoFactorAuth> = await this.pool.query(query, [userId]);
        return result.rows[0] || null;
    }

    /**
     * Habilitar 2FA
     */
    async enable(userId: number): Promise<boolean> {
        const query = `
            UPDATE two_factor_auth
            SET enabled = true,
                enabled_at = NOW()
            WHERE usuario_id = $1
        `;

        const result = await this.pool.query(query, [userId]);
        return result.rowCount ? result.rowCount > 0 : false;
    }

    /**
     * Deshabilitar 2FA
     */
    async disable(userId: number): Promise<boolean> {
        const query = `
            UPDATE two_factor_auth
            SET enabled = false
            WHERE usuario_id = $1
        `;

        const result = await this.pool.query(query, [userId]);
        return result.rowCount ? result.rowCount > 0 : false;
    }

    /**
     * Actualizar timestamp de último uso
     */
    async updateLastUsed(userId: number): Promise<boolean> {
        const query = `
            UPDATE two_factor_auth
            SET last_used_at = NOW()
            WHERE usuario_id = $1
        `;

        const result = await this.pool.query(query, [userId]);
        return result.rowCount ? result.rowCount > 0 : false;
    }

    /**
     * Remover un código de respaldo usado
     */
    async removeBackupCode(userId: number, usedCode: string): Promise<boolean> {
        const query = `
            UPDATE two_factor_auth
            SET backup_codes = array_remove(backup_codes, $2)
            WHERE usuario_id = $1
        `;

        const result = await this.pool.query(query, [userId, usedCode]);
        return result.rowCount ? result.rowCount > 0 : false;
    }

    /**
     * Regenerar códigos de respaldo
     */
    async regenerateBackupCodes(userId: number, newCodes: string[]): Promise<boolean> {
        const query = `
            UPDATE two_factor_auth
            SET backup_codes = $2
            WHERE usuario_id = $1
        `;

        const result = await this.pool.query(query, [userId, newCodes]);
        return result.rowCount ? result.rowCount > 0 : false;
    }

    /**
     * Verificar si 2FA está habilitado
     */
    async isEnabled(userId: number): Promise<boolean> {
        const query = `
            SELECT enabled
            FROM two_factor_auth
            WHERE usuario_id = $1
        `;

        const result = await this.pool.query(query, [userId]);
        return result.rows[0]?.enabled || false;
    }

    /**
     * Eliminar configuración 2FA
     */
    async delete(userId: number): Promise<boolean> {
        const query = 'DELETE FROM two_factor_auth WHERE usuario_id = $1';
        const result = await this.pool.query(query, [userId]);
        return result.rowCount ? result.rowCount > 0 : false;
    }

    /**
     * Contar códigos de respaldo restantes
     */
    async countBackupCodes(userId: number): Promise<number> {
        const query = `
            SELECT array_length(backup_codes, 1) as count
            FROM two_factor_auth
            WHERE usuario_id = $1
        `;

        const result = await this.pool.query(query, [userId]);
        return result.rows[0]?.count || 0;
    }
}

export default new TwoFactorRepository();