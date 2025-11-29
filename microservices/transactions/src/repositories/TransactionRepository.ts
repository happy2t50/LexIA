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
    stripeSessionId?: string,
    suscripcionAnterior?: number,
    suscripcionNueva?: number,
    metadata?: Record<string, any>
  ): Promise<Transaction> {
    const query = `
      INSERT INTO transacciones (
        usuario_id, monto, moneda, estado, stripe_session_id,
        suscripcion_anterior, suscripcion_nueva, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      usuarioId,
      monto,
      moneda,
      estado,
      stripeSessionId,
      suscripcionAnterior,
      suscripcionNueva,
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
   * Actualizar suscripción del usuario
   */
  async updateUserSubscription(
    usuarioId: string,
    suscripcionId: number
  ): Promise<void> {
    const query = `
      UPDATE usuarios
      SET suscripcion_id = $1, updated_at = NOW()
      WHERE id = $2
    `;

    await this.pool.query(query, [suscripcionId, usuarioId]);
    console.log(`✅ Suscripción actualizada para usuario ${usuarioId} a plan ${suscripcionId}`);
  }

  /**
   * Obtener suscripción actual del usuario
   */
  async getUserCurrentSubscription(usuarioId: string): Promise<number | null> {
    const query = 'SELECT suscripcion_id FROM usuarios WHERE id = $1';
    const result = await this.pool.query(query, [usuarioId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].suscripcion_id;
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
      suscripcion_anterior: row.suscripcion_anterior,
      suscripcion_nueva: row.suscripcion_nueva,
      metadata: row.metadata,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

export default TransactionRepository;
