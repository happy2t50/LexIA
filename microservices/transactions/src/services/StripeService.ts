/**
 * Servicio de integración con Stripe
 */

import Stripe from 'stripe';
import { PlanConfig, PLANS } from '../models/Transaction';

export class StripeService {
  private stripe: Stripe;

  constructor() {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY no está configurada en las variables de entorno');
    }

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
    });

    console.log('✅ Stripe inicializado correctamente');
  }

  /**
   * Crear sesión de checkout en Stripe
   */
  async createCheckoutSession(
    usuarioId: string,
    plan: string,
    successUrl: string,
    cancelUrl: string,
    metadata?: Record<string, any>
  ): Promise<{ sessionId: string; checkoutUrl: string }> {
    const planConfig = PLANS[plan];

    if (!planConfig) {
      throw new Error(`Plan no válido: ${plan}`);
    }

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: planConfig.price_id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: usuarioId,
      metadata: {
        usuario_id: usuarioId,
        plan: plan,
        suscripcion_nueva: planConfig.suscripcion_id.toString(),
        ...metadata,
      },
    });

    if (!session.url) {
      throw new Error('No se pudo generar URL de checkout');
    }

    console.log(`✅ Sesión de checkout creada: ${session.id} para usuario ${usuarioId}`);

    return {
      sessionId: session.id,
      checkoutUrl: session.url,
    };
  }

  /**
   * Obtener información de una sesión de checkout
   */
  async getSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);
    return session;
  }

  /**
   * Verificar firma de webhook de Stripe
   */
  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string
  ): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET no está configurada');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );
      return event;
    } catch (err: any) {
      console.error('❌ Error verificando firma del webhook:', err.message);
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }
  }

  /**
   * Crear reembolso
   */
  async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ): Promise<Stripe.Refund> {
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    };

    if (amount) {
      refundParams.amount = Math.round(amount * 100); // Convertir a centavos
    }

    if (reason) {
      refundParams.reason = reason as Stripe.RefundCreateParams.Reason;
    }

    const refund = await this.stripe.refunds.create(refundParams);

    console.log(`✅ Reembolso creado: ${refund.id} para payment intent ${paymentIntentId}`);

    return refund;
  }

  /**
   * Cancelar suscripción
   */
  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    const subscription = await this.stripe.subscriptions.cancel(subscriptionId);

    console.log(`✅ Suscripción cancelada: ${subscriptionId}`);

    return subscription;
  }

  /**
   * Obtener información de suscripción
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  }

  /**
   * Listar suscripciones de un cliente
   */
  async listCustomerSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
    const subscriptions = await this.stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
    });

    return subscriptions.data;
  }
}

export default StripeService;
