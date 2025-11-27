// Adapter - Repositorio PostgreSQL para usuarios

import { Pool } from 'pg';
import { User } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/ports/IUserRepository';

export class PostgreSQLUserRepository implements IUserRepository {
  constructor(private readonly pool: Pool) {}

  async save(user: User): Promise<User> {
    const query = `
      INSERT INTO usuarios (id, email, password_hash, nombre, rol_id, telefono, foto_perfil, fecha_registro, activo)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      user.id,
      user.email,
      user.passwordHash,
      user.nombre,
      user.rolId,
      user.telefono || null,
      user.fotoPerfil || null,
      user.fechaRegistro || new Date(),
      user.activo
    ];

    try {
      const result = await this.pool.query(query, values);
      return this.mapToEntity(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        throw new Error('El email ya está registrado');
      }
      throw new Error(`Error al guardar usuario: ${error.message}`);
    }
  }

  async findById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM usuarios WHERE id = $1';
    const result = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToEntity(result.rows[0]);
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM usuarios WHERE email = $1';
    const result = await this.pool.query(query, [email]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToEntity(result.rows[0]);
  }

  async findAll(): Promise<User[]> {
    const query = 'SELECT * FROM usuarios ORDER BY fecha_registro DESC';
    const result = await this.pool.query(query);

    return result.rows.map(row => this.mapToEntity(row));
  }

  async update(user: User): Promise<User> {
    const query = `
      UPDATE usuarios
      SET email = $2, password_hash = $3, nombre = $4, rol_id = $5,
          telefono = $6, foto_perfil = $7, ultimo_acceso = $8, activo = $9
      WHERE id = $1
      RETURNING *
    `;

    const values = [
      user.id,
      user.email,
      user.passwordHash,
      user.nombre,
      user.rolId,
      user.telefono || null,
      user.fotoPerfil || null,
      user.ultimoAcceso || null,
      user.activo
    ];

    const result = await this.pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Usuario no encontrado');
    }

    return this.mapToEntity(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM usuarios WHERE id = $1';
    const result = await this.pool.query(query, [id]);

    return (result.rowCount ?? 0) > 0;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const query = 'SELECT EXISTS(SELECT 1 FROM usuarios WHERE email = $1)';
    const result = await this.pool.query(query, [email]);

    return result.rows[0].exists;
  }

  async findByRole(rolId: number): Promise<User[]> {
    const query = 'SELECT * FROM usuarios WHERE rol_id = $1 ORDER BY fecha_registro DESC';
    const result = await this.pool.query(query, [rolId]);

    return result.rows.map(row => this.mapToEntity(row));
  }

  async updateLastAccess(userId: string): Promise<void> {
    const query = 'UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1';
    await this.pool.query(query, [userId]);
  }

  // Helper para mapear de DB row a entidad de dominio
  private mapToEntity(row: any): User {
    return new User(
      row.id,
      row.email,
      row.password_hash,
      row.nombre,
      row.rol_id,
      row.telefono,
      row.foto_perfil,
      row.fecha_registro,
      row.ultimo_acceso,
      row.activo
    );
  }
}
