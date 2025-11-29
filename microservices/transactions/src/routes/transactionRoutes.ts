/**
 * Rutas para el microservicio de transacciones
 */

import { Router } from 'express';
import TransactionController from '../controllers/TransactionController';
import express from 'express';

const router = Router();
const controller = new TransactionController();

/**
 * POST /create-checkout
 * Crear sesión de checkout en Stripe
 */
router.post('/create-checkout', controller.createCheckout);

/**
 * POST /webhook/stripe
 * Recibir webhooks de Stripe (requiere raw body)
 */
router.post(
  '/webhook/stripe',
  express.raw({ type: 'application/json' }),
  controller.handleStripeWebhook
);

/**
 * GET /user/:usuario_id
 * Obtener todas las transacciones de un usuario
 */
router.get('/user/:usuario_id', controller.getUserTransactions);

/**
 * GET /:transaccion_id
 * Obtener una transacción específica
 */
router.get('/:transaccion_id', controller.getTransaction);

export default router;
