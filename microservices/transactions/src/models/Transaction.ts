/**
 * Modelos de dominio para el microservicio de transacciones
 */

export interface Transaction {
  id: string;
  usuario_id: string;
  monto: number;
  moneda: string;
  metodo_pago?: string;
  estado: TransactionStatus;
  stripe_payment_id?: string;
  stripe_session_id?: string;
  suscripcion_anterior?: number;
  suscripcion_nueva?: number;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export enum TransactionStatus {
  PENDING = 'pendiente',
  COMPLETED = 'completado',
  FAILED = 'fallido',
  REFUNDED = 'reembolsado'
}

export interface TransactionCreate {
  usuario_id: string;
  plan: string;
  success_url: string;
  cancel_url: string;
  metadata?: Record<string, any>;
}

export interface CheckoutSession {
  session_id: string;
  checkout_url: string;
  transaction_id: string;
}

export interface TransactionResponse {
  id: string;
  usuario_id: string;
  monto: number;
  moneda: string;
  metodo_pago?: string;
  estado: TransactionStatus;
  stripe_payment_id?: string;
  stripe_session_id?: string;
  suscripcion_anterior?: number;
  suscripcion_nueva?: number;
  created_at: Date;
  updated_at: Date;
}

export interface StripeWebhookEvent {
  type: string;
  data: {
    object: any;
  };
}

export interface PlanConfig {
  name: string;
  price_id: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  suscripcion_id: number;
}

export const PLANS: Record<string, PlanConfig> = {
  pro_monthly: {
    name: 'Plan Pro Mensual',
    price_id: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
    amount: 9.99,
    currency: 'USD',
    interval: 'month',
    suscripcion_id: 2
  },
  pro_yearly: {
    name: 'Plan Pro Anual',
    price_id: process.env.STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly',
    amount: 99.99,
    currency: 'USD',
    interval: 'year',
    suscripcion_id: 2
  }
};
