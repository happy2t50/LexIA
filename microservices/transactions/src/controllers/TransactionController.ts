/**
 * Controlador para operaciones de transacciones
 */

import { Request, Response } from 'express';
import StripeService from '../services/StripeService';
import TransactionRepository from '../repositories/TransactionRepository';
import { TransactionStatus, PLANS } from '../models/Transaction';
import Stripe from 'stripe';

export class TransactionController {
  private stripeService: StripeService;
  private transactionRepo: TransactionRepository;

  constructor() {
    this.stripeService = new StripeService();
    this.transactionRepo = new TransactionRepository();
  }

  /**
   * Crear sesión de checkout en Stripe
   */
  createCheckout = async (req: Request, res: Response): Promise<void> => {
    try {
      const { usuario_id, plan, success_url, cancel_url, metadata } = req.body;

      // Validar datos requeridos
      if (!usuario_id || !plan || !success_url || !cancel_url) {
        res.status(400).json({
          error: 'Faltan campos requeridos: usuario_id, plan, success_url, cancel_url',
        });
        return;
      }

      // Validar que el plan existe
      if (!PLANS[plan]) {
        res.status(400).json({
          error: `Plan no válido: ${plan}. Planes disponibles: ${Object.keys(PLANS).join(', ')}`,
        });
        return;
      }

      const planConfig = PLANS[plan];

      // Obtener suscripción actual del usuario
      const suscripcionAnterior = await this.transactionRepo.getUserCurrentSubscription(usuario_id);

      // Crear transacción pendiente en la base de datos
      const transaction = await this.transactionRepo.create(
        usuario_id,
        planConfig.amount,
        planConfig.currency,
        TransactionStatus.PENDING,
        undefined,
        suscripcionAnterior || undefined,
        planConfig.suscripcion_id,
        metadata
      );

      // Crear sesión de checkout en Stripe
      const { sessionId, checkoutUrl } = await this.stripeService.createCheckoutSession(
        usuario_id,
        plan,
        success_url,
        cancel_url,
        {
          transaction_id: transaction.id,
          ...metadata,
        }
      );

      // Actualizar transacción con el session_id de Stripe
      await this.transactionRepo.updateStatus(
        transaction.id,
        TransactionStatus.PENDING,
        undefined,
        undefined
      );

      // Actualizar con session_id
      const query = 'UPDATE transacciones SET stripe_session_id = $1 WHERE id = $2';
      await this.transactionRepo['pool'].query(query, [sessionId, transaction.id]);

      console.log(`✅ Checkout creado: Transaction ${transaction.id}, Session ${sessionId}`);

      res.status(200).json({
        session_id: sessionId,
        checkout_url: checkoutUrl,
        transaction_id: transaction.id,
      });
    } catch (error: any) {
      console.error('❌ Error creando checkout:', error);
      res.status(500).json({
        error: 'Error creando sesión de checkout',
        details: error.message,
      });
    }
  };

  /**
   * Manejar webhooks de Stripe
   */
  handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const signature = req.headers['stripe-signature'] as string;

      if (!signature) {
        res.status(400).json({ error: 'No se encontró la firma de Stripe' });
        return;
      }

      // Verificar la firma del webhook
      const event = this.stripeService.verifyWebhookSignature(req.body, signature);

      console.log(`📥 Webhook recibido: ${event.type}`);

      // Procesar el evento según su tipo
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        default:
          console.log(`⚠️  Evento no manejado: ${event.type}`);
      }

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('❌ Error procesando webhook:', error);
      res.status(400).json({
        error: 'Error procesando webhook',
        details: error.message,
      });
    }
  };

  /**
   * Obtener transacciones de un usuario
   */
  getUserTransactions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { usuario_id } = req.params;

      const transactions = await this.transactionRepo.findByUsuarioId(usuario_id);

      res.status(200).json(transactions);
    } catch (error: any) {
      console.error('❌ Error obteniendo transacciones:', error);
      res.status(500).json({
        error: 'Error obteniendo transacciones',
        details: error.message,
      });
    }
  };

  /**
   * Obtener una transacción específica
   */
  getTransaction = async (req: Request, res: Response): Promise<void> => {
    try {
      const { transaccion_id } = req.params;

      const transaction = await this.transactionRepo.findById(transaccion_id);

      if (!transaction) {
        res.status(404).json({ error: 'Transacción no encontrada' });
        return;
      }

      res.status(200).json(transaction);
    } catch (error: any) {
      console.error('❌ Error obteniendo transacción:', error);
      res.status(500).json({
        error: 'Error obteniendo transacción',
        details: error.message,
      });
    }
  };

  /**
   * Manejar checkout completado
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    console.log(`✅ Checkout completado: ${session.id}`);

    const transaction = await this.transactionRepo.findByStripeSessionId(session.id);

    if (!transaction) {
      console.error(`❌ No se encontró transacción para session ${session.id}`);
      return;
    }

    // Actualizar estado de la transacción
    await this.transactionRepo.updateStatus(
      transaction.id,
      TransactionStatus.COMPLETED,
      session.payment_intent as string,
      session.payment_method_types?.[0]
    );

    // Actualizar suscripción del usuario
    if (transaction.suscripcion_nueva) {
      await this.transactionRepo.updateUserSubscription(
        transaction.usuario_id,
        transaction.suscripcion_nueva
      );
    }

    console.log(`✅ Transacción ${transaction.id} completada y suscripción actualizada`);
  }

  /**
   * Manejar pago exitoso
   */
  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    console.log(`✅ Pago exitoso: ${paymentIntent.id}`);

    const transaction = await this.transactionRepo.findByStripePaymentId(paymentIntent.id);

    if (transaction) {
      await this.transactionRepo.updateStatus(
        transaction.id,
        TransactionStatus.COMPLETED,
        paymentIntent.id
      );
    }
  }

  /**
   * Manejar pago fallido
   */
  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    console.log(`❌ Pago fallido: ${paymentIntent.id}`);

    const transaction = await this.transactionRepo.findByStripePaymentId(paymentIntent.id);

    if (transaction) {
      await this.transactionRepo.updateStatus(
        transaction.id,
        TransactionStatus.FAILED,
        paymentIntent.id
      );
    }
  }

  /**
   * Manejar actualización de suscripción
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    console.log(`🔄 Suscripción actualizada: ${subscription.id}`);
    // Aquí puedes agregar lógica adicional si es necesario
  }

  /**
   * Manejar cancelación de suscripción
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    console.log(`❌ Suscripción cancelada: ${subscription.id}`);
    // Revertir al plan gratuito
    const customerId = subscription.customer as string;
    // Buscar usuario por customer_id y actualizar a suscripción gratuita (1)
  }
}

export default TransactionController;
