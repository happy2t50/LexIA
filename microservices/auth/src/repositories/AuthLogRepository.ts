import { Pool, QueryResult } from 'pg';
import pool from '../config/database';

export interface AuthLog {
    id: number;
    usuario_id?: number;
    email: string;
    event_type: string;
    success: boolean;
    ip_address?: string;
    user_agent?: string;
    device_info?: string;
    failure_reason?: string;
    metadata?: any;
    created_at: Date;
}

export interface CreateAuthLogData {
    usuario_id?: number;
    email: string;
    event_type: string;
    success: boolean;
    ip_address?: string;
    user_agent?: string;
    device_info?: string;
    failure_reason?: string;
    metadata?: any;
}

export class AuthLogRepository {
    private pool: Pool;

    constructor() {
        this.pool = pool;
    }

    /**
     * Crear log de evento de autenticación
     */
    async create(data: CreateAuthLogData): Promise<AuthLog> {
        const query = `
            INSERT INTO auth_logs (
                usuario_id, email, event_type, success,
                ip_address, user_agent, device_info, failure_reason, metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

        const values = [
            data.usuario_id || null,
            data.email,
            data.event_type,
            data.success,
            data.ip_address || null,
            data.user_agent || null,
            data.device_info || null,
            data.failure_reason || null,
            data.metadata ? JSON.stringify(data.metadata) : null
        ];

        const result: QueryResult<AuthLog> = await this.pool.query(query, values);
        return result.rows[0];
    }

    /**
     * Obtener logs por usuario
     */
    async findByUserId(userId: number, limit: number = 50): Promise<AuthLog[]> {
        const query = `
            SELECT * FROM auth_logs
            WHERE usuario_id = $1
            ORDER BY created_at DESC
            LIMIT $2
        `;

        const result: QueryResult<AuthLog> = await this.pool.query(query, [userId, limit]);
        return result.rows;
    }

    /**
     * Obtener logs por email
     */
    async findByEmail(email: string, limit: number = 50): Promise<AuthLog[]> {
        const query = `
            SELECT * FROM auth_logs
            WHERE email = $1
            ORDER BY created_at DESC
            LIMIT $2
        `;

        const result: QueryResult<AuthLog> = await this.pool.query(query, [email, limit]);
        return result.rows;
    }

    /**
     * Obtener logs por tipo de evento
     */
    async findByEventType(eventType: string, limit: number = 100): Promise<AuthLog[]> {
        const query = `
            SELECT * FROM auth_logs
            WHERE event_type = $1
            ORDER BY created_at DESC
            LIMIT $2
        `;

        const result: QueryResult<AuthLog> = await this.pool.query(query, [eventType, limit]);
        return result.rows;
    }

    /**
     * Contar intentos fallidos recientes desde una IP
     */
    async countFailedAttempts(email: string, ipAddress: string, minutesAgo: number = 15): Promise<number> {
        const query = `
            SELECT COUNT(*) as count
            FROM auth_logs
            WHERE email = $1
              AND ip_address = $2
              AND event_type = 'failed_login'
              AND success = false
              AND created_at > NOW() - INTERVAL '${minutesAgo} minutes'
        `;

        const result = await this.pool.query(query, [email, ipAddress]);
        return parseInt(result.rows[0].count, 10);
    }

    /**
     * Detectar actividad sospechosa (múltiples IPs en poco tiempo)
     */
    async detectSuspiciousActivity(userId: number, hoursAgo: number = 1): Promise<boolean> {
        const query = `
            SELECT COUNT(DISTINCT ip_address) as ip_count
            FROM auth_logs
            WHERE usuario_id = $1
              AND event_type IN ('login', 'successful_login')
              AND created_at > NOW() - INTERVAL '${hoursAgo} hours'
        `;

        const result = await this.pool.query(query, [userId]);
        const ipCount = parseInt(result.rows[0].ip_count, 10);

        // Sospechoso si hay más de 3 IPs diferentes en 1 hora
        return ipCount > 3;
    }

    /**
     * Obtener estadísticas de autenticación
     */
    async getStats(daysAgo: number = 7): Promise<{
        total_logins: number;
        successful_logins: number;
        failed_logins: number;
        unique_users: number;
    }> {
        const query = `
            SELECT
                COUNT(*) FILTER (WHERE event_type IN ('login', 'successful_login', 'failed_login')) as total_logins,
                COUNT(*) FILTER (WHERE event_type IN ('login', 'successful_login') AND success = true) as successful_logins,
                COUNT(*) FILTER (WHERE event_type = 'failed_login' AND success = false) as failed_logins,
                COUNT(DISTINCT usuario_id) as unique_users
            FROM auth_logs
            WHERE created_at > NOW() - INTERVAL '${daysAgo} days'
        `;

        const result = await this.pool.query(query);
        return result.rows[0];
    }

    /**
     * Limpiar logs antiguos
     */
    async cleanupOld(daysAgo: number = 90): Promise<number> {
        const query = `
            DELETE FROM auth_logs
            WHERE created_at < NOW() - INTERVAL '${daysAgo} days'
        `;

        const result = await this.pool.query(query);
        return result.rowCount || 0;
    }
}

export default new AuthLogRepository();