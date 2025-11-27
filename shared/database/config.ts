// Configuración compartida de PostgreSQL para todos los microservicios

import { Pool, PoolConfig } from 'pg';

export interface DatabaseConfig extends PoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export class DatabaseConnection {
  private static pool: Pool | null = null;

  static initialize(config: DatabaseConfig): Pool {
    if (!this.pool) {
      this.pool = new Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        max: config.max || 20, // máximo de conexiones en el pool
        idleTimeoutMillis: config.idleTimeoutMillis || 30000,
        connectionTimeoutMillis: config.connectionTimeoutMillis || 2000,
      });

      // Manejar errores del pool
      this.pool.on('error', (err) => {
        console.error('Error inesperado en el pool de PostgreSQL', err);
      });

      console.log('✅ Pool de PostgreSQL inicializado correctamente');
    }

    return this.pool;
  }

  static getPool(): Pool {
    if (!this.pool) {
      throw new Error('El pool de PostgreSQL no ha sido inicializado. Llama a initialize() primero.');
    }
    return this.pool;
  }

  static async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('🔌 Pool de PostgreSQL cerrado');
    }
  }

  static async healthCheck(): Promise<boolean> {
    try {
      const pool = this.getPool();
      const result = await pool.query('SELECT NOW()');
      return !!result;
    } catch (error) {
      console.error('❌ Health check de PostgreSQL falló:', error);
      return false;
    }
  }
}

// Función helper para obtener la configuración desde variables de entorno
export function getDatabaseConfigFromEnv(): DatabaseConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'lexia_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  };
}
