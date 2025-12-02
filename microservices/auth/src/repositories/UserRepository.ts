import { Pool, QueryResult } from 'pg';
import pool from '../config/database';

export interface User {
    id: number;
    email: string;
    nombre: string;
    apellido: string;
    telefono?: string;
    rol: string;
    password_hash?: string;
    activo: boolean;
    email_verified: boolean;
    email_verified_at?: Date;
    two_factor_enabled: boolean;
    last_login_at?: Date;
    last_login_ip?: string;
    failed_login_attempts: number;
    locked_until?: Date;
    account_type: string;
    created_at: Date;
    updated_at: Date;
}

export interface CreateUserData {
    email: string;
    nombre: string;
    apellido: string;
    telefono?: string;
    password_hash?: string;
    rol?: string;
    account_type?: string;
}

export class UserRepository {
    private pool: Pool;

    constructor() {
        this.pool = pool;
    }

    /**
     * Crear un nuevo usuario
     */
    async create(data: CreateUserData): Promise<User> {
        const query = `
            INSERT INTO usuarios (
                email, nombre, apellido, telefono, password_hash, rol, account_type
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const values = [
            data.email,
            data.nombre,
            data.apellido,
            data.telefono || null,
            data.password_hash || null,
            data.rol || 'user',
            data.account_type || 'local'
        ];

        const result: QueryResult<User> = await this.pool.query(query, values);
        return result.rows[0];
    }

    /**
     * Buscar usuario por ID
     */
    async findById(id: number): Promise<User | null> {
        const query = 'SELECT * FROM usuarios WHERE id = $1';
        const result: QueryResult<User> = await this.pool.query(query, [id]);
        return result.rows[0] || null;
    }

    /**
     * Buscar usuario por email
     */
    async findByEmail(email: string): Promise<User | null> {
        const query = 'SELECT * FROM usuarios WHERE email = $1';
        const result: QueryResult<User> = await this.pool.query(query, [email]);
        return result.rows[0] || null;
    }

    /**
     * Actualizar usuario
     */
    async update(id: number, data: Partial<User>): Promise<User | null> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        // Construir query dinámica
        Object.keys(data).forEach((key) => {
            if (key !== 'id' && key !== 'created_at') {
                fields.push(`${key} = $${paramCount}`);
                values.push((data as any)[key]);
                paramCount++;
            }
        });

        if (fields.length === 0) {
            return await this.findById(id);
        }

        // No establecer updated_at aquí, ya que la columna puede no existir en la tabla `usuarios`.
        // Si se requiere auditoría de actualizaciones, usar una columna existente o un trigger a futuro.
        values.push(id);

        const query = `
            UPDATE usuarios
            SET ${fields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result: QueryResult<User> = await this.pool.query(query, values);
        return result.rows[0] || null;
    }

    /**
     * Verificar email del usuario
     */
    async verifyEmail(userId: number): Promise<boolean> {
        const query = `
            UPDATE usuarios
            SET email_verified = true,
                email_verified_at = NOW()
            WHERE id = $1
        `;

        const result = await this.pool.query(query, [userId]);
        return result.rowCount ? result.rowCount > 0 : false;
    }

    /**
     * Incrementar intentos fallidos de login
     */
    async incrementFailedAttempts(userId: number): Promise<void> {
        const query = `
            UPDATE usuarios
            SET failed_login_attempts = failed_login_attempts + 1,
                locked_until = CASE
                    WHEN failed_login_attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes'
                    ELSE locked_until
                END
            WHERE id = $1
        `;

        await this.pool.query(query, [userId]);
    }

    /**
     * Resetear intentos fallidos de login (después de login exitoso)
     */
    async resetFailedAttempts(userId: number, ipAddress?: string): Promise<void> {
        const query = `
            UPDATE usuarios
            SET failed_login_attempts = 0,
                locked_until = NULL,
                last_login_at = NOW(),
                last_login_ip = $2
            WHERE id = $1
        `;

        await this.pool.query(query, [userId, ipAddress || null]);
    }

    /**
     * Verificar si el usuario está bloqueado
     */
    async isLocked(userId: number): Promise<boolean> {
        const user = await this.findById(userId);
        if (!user || !user.locked_until) {
            return false;
        }

        return new Date(user.locked_until) > new Date();
    }

    /**
     * Habilitar 2FA
     */
    async enable2FA(userId: number): Promise<boolean> {
        const query = `
            UPDATE usuarios
            SET two_factor_enabled = true
            WHERE id = $1
        `;

        const result = await this.pool.query(query, [userId]);
        return result.rowCount ? result.rowCount > 0 : false;
    }

    /**
     * Deshabilitar 2FA
     */
    async disable2FA(userId: number): Promise<boolean> {
        const query = `
            UPDATE usuarios
            SET two_factor_enabled = false
            WHERE id = $1
        `;

        const result = await this.pool.query(query, [userId]);
        return result.rowCount ? result.rowCount > 0 : false;
    }

    /**
     * Eliminar usuario (soft delete)
     */
    async delete(id: number): Promise<boolean> {
        const query = `
            UPDATE usuarios
            SET activo = false
            WHERE id = $1
        `;

        const result = await this.pool.query(query, [id]);
        return result.rowCount ? result.rowCount > 0 : false;
    }

    /**
     * Eliminar usuario permanentemente
     */
    async hardDelete(id: number): Promise<boolean> {
        const query = 'DELETE FROM usuarios WHERE id = $1';
        const result = await this.pool.query(query, [id]);
        return result.rowCount ? result.rowCount > 0 : false;
    }

    /**
     * Listar usuarios con paginación
     */
    async list(page: number = 1, limit: number = 10): Promise<{ users: User[]; total: number }> {
        const offset = (page - 1) * limit;

        const countQuery = 'SELECT COUNT(*) FROM usuarios WHERE activo = true';
        const countResult = await this.pool.query(countQuery);
        const total = parseInt(countResult.rows[0].count, 10);

        const query = `
            SELECT * FROM usuarios
            WHERE activo = true
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
        `;

        const result: QueryResult<User> = await this.pool.query(query, [limit, offset]);

        return {
            users: result.rows,
            total
        };
    }

    /**
     * Buscar usuarios por rol
     */
    async findByRole(rol: string): Promise<User[]> {
        const query = 'SELECT * FROM usuarios WHERE rol = $1 AND activo = true';
        const result: QueryResult<User> = await this.pool.query(query, [rol]);
        return result.rows;
    }

    /**
     * Actualizar contraseña
     */
    async updatePassword(userId: number, newPasswordHash: string): Promise<boolean> {
        const query = `
            UPDATE usuarios
            SET password_hash = $1
            WHERE id = $2
        `;

        const result = await this.pool.query(query, [newPasswordHash, userId]);
        return result.rowCount ? result.rowCount > 0 : false;
    }
}

export default new UserRepository();