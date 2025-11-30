/**
 * Repositorio para operaciones de transacciones en la base de datos
 */

import { Pool } from 'pg';
import { Transaction, TransactionStatus } from '../models/Transaction';
import pool from '../config/database';

export class TransactionRepository {
  private pool: Pool;

  constructor(dbPool: Pool = pool) {
    this.pool = dbPool;
  }

  /**
   * Crear una nueva transacción
   */
  async create(
    usuarioId: string,
    monto: number,
    moneda: string,
    estado: TransactionStatus,
    plan?: string,
    stripeSessionId?: string,
    rolAnterior?: number,
    rolNuevo?: number,
    metadata?: Record<string, any>
  ): Promise<Transaction> {
    const query = `
      INSERT INTO transacciones (
        usuario_id, monto, moneda, estado, plan, stripe_session_id,
        rol_anterior, rol_nuevo, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      usuarioId,
      monto,
      moneda,
      estado,
      plan,
      stripeSessionId,
      rolAnterior,
      rolNuevo,
      metadata ? JSON.stringify(metadata) : null,
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToTransaction(result.rows[0]);
  }

  /**
   * Obtener transacción por ID
   */
  async findById(transaccionId: string): Promise<Transaction | null> {
    const query = 'SELECT * FROM transacciones WHERE id = $1';
    const result = await this.pool.query(query, [transaccionId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTransaction(result.rows[0]);
  }

  /**
   * Obtener transacción por Stripe Session ID
   */
  async findByStripeSessionId(sessionId: string): Promise<Transaction | null> {
    const query = 'SELECT * FROM transacciones WHERE stripe_session_id = $1';
    const result = await this.pool.query(query, [sessionId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTransaction(result.rows[0]);
  }

  /**
   * Obtener transacción por Stripe Payment ID
   */
  async findByStripePaymentId(paymentId: string): Promise<Transaction | null> {
    const query = 'SELECT * FROM transacciones WHERE stripe_payment_id = $1';
    const result = await this.pool.query(query, [paymentId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTransaction(result.rows[0]);
  }

  /**
   * Obtener todas las transacciones de un usuario
   */
  async findByUsuarioId(usuarioId: string): Promise<Transaction[]> {
    const query = `
      SELECT * FROM transacciones
      WHERE usuario_id = $1
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [usuarioId]);

    return result.rows.map(row => this.mapRowToTransaction(row));
  }

  /**
   * Actualizar estado de una transacción
   */
  async updateStatus(
    transaccionId: string,
    estado: TransactionStatus,
    stripePaymentId?: string,
    metodoPago?: string
  ): Promise<Transaction | null> {
    const query = `
      UPDATE transacciones
      SET estado = $1, stripe_payment_id = $2, metodo_pago = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `;

    const values = [estado, stripePaymentId, metodoPago, transaccionId];
    const result = await this.pool.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTransaction(result.rows[0]);
  }

  /**
   * Actualizar rol del usuario
   */
  async updateUserRole(
    usuarioId: string,
    rolId: number
  ): Promise<void> {
    const query = `
      UPDATE usuarios
      SET rol_id = $1, updated_at = NOW()
      WHERE id = $2
    `;

    await this.pool.query(query, [rolId, usuarioId]);
    console.log(`✅ Rol actualizado para usuario ${usuarioId} a rol ${rolId}`);
  }

  /**
   * Obtener rol actual del usuario
   */
  async getUserCurrentRole(usuarioId: string): Promise<number | null> {
    const query = 'SELECT rol_id FROM usuarios WHERE id = $1';
    const result = await this.pool.query(query, [usuarioId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].rol_id;
  }

  /**
   * Mapear fila de base de datos a objeto Transaction
   */
  private mapRowToTransaction(row: any): Transaction {
    return {
      id: row.id,
      usuario_id: row.usuario_id,
      monto: parseFloat(row.monto),
      moneda: row.moneda,
      metodo_pago: row.metodo_pago,
      estado: row.estado as TransactionStatus,
      stripe_payment_id: row.stripe_payment_id,
      stripe_session_id: row.stripe_session_id,
      stripe_customer_id: row.stripe_customer_id,
      stripe_subscription_id: row.stripe_subscription_id,
      plan: row.plan,
      rol_anterior: row.rol_anterior,
      rol_nuevo: row.rol_nuevo,
      metadata: row.metadata,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

export default TransactionRepository;
