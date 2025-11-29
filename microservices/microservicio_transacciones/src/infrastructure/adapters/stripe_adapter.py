"""
Adaptador para integración con Stripe
Modo test GRATIS - sin costo hasta que actives modo producción
"""

import os
import stripe
from typing import Optional, Dict
from datetime import datetime, timedelta

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")


class StripeAdapter:
    """Adaptador para procesar pagos con Stripe"""
    
    def __init__(self):
        self.publishable_key = os.getenv("STRIPE_PUBLISHABLE_KEY")
        self.webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
        
        # Precios configurados en Stripe Dashboard
        self.prices = {
            "pro_monthly": os.getenv("STRIPE_PRICE_ID_PRO_MONTHLY"),
            "pro_yearly": os.getenv("STRIPE_PRICE_ID_PRO_YEARLY")
        }
    
    async def create_checkout_session(
        self,
        usuario_id: str,
        plan: str,
        success_url: str,
        cancel_url: str,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """
        Crea una sesión de Stripe Checkout
        
        Args:
            usuario_id: ID del usuario que va a pagar
            plan: 'pro_monthly' o 'pro_yearly'
            success_url: URL de redirección después del pago exitoso
            cancel_url: URL si el usuario cancela
            metadata: Datos adicionales para guardar
            
        Returns:
            Dict con session_id, url, expires_at
        """
        try:
            price_id = self.prices.get(plan)
            if not price_id:
                raise ValueError(f"Plan {plan} no configurado en Stripe")
            
            # Crear sesión de checkout
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[{
                    "price": price_id,
                    "quantity": 1
                }],
                mode="subscription" if "monthly" in plan or "yearly" in plan else "payment",
                success_url=success_url,
                cancel_url=cancel_url,
                client_reference_id=usuario_id,
                metadata=metadata or {}
            )
            
            return {
                "session_id": session.id,
                "checkout_url": session.url,
                "expires_at": datetime.fromtimestamp(session.expires_at) if session.expires_at else datetime.utcnow() + timedelta(hours=1)
            }
            
        except stripe.error.StripeError as e:
            print(f"Error de Stripe: {e}")
            raise Exception(f"Error al crear sesión de pago: {str(e)}")
    
    async def get_session(self, session_id: str) -> Optional[Dict]:
        """
        Obtiene información de una sesión de checkout
        
        Args:
            session_id: ID de la sesión de Stripe
            
        Returns:
            Dict con información de la sesión
        """
        try:
            session = stripe.checkout.Session.retrieve(session_id)
            return {
                "id": session.id,
                "payment_status": session.payment_status,
                "customer_id": session.customer,
                "payment_intent": session.payment_intent,
                "amount_total": session.amount_total / 100,  # Convertir centavos a dólares
                "currency": session.currency,
                "metadata": session.metadata
            }
        except stripe.error.StripeError as e:
            print(f"Error obteniendo sesión: {e}")
            return None
    
    def verify_webhook_signature(self, payload: bytes, sig_header: str) -> Optional[Dict]:
        """
        Verifica la firma del webhook de Stripe (seguridad)
        
        Args:
            payload: Cuerpo de la petición (bytes)
            sig_header: Header 'Stripe-Signature'
            
        Returns:
            Dict con el evento si es válido, None si no
        """
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, self.webhook_secret
            )
            return event
        except ValueError as e:
            print(f"Payload inválido: {e}")
            return None
        except stripe.error.SignatureVerificationError as e:
            print(f"Firma inválida: {e}")
            return None
    
    async def create_refund(self, payment_intent_id: str, amount: Optional[float] = None) -> Dict:
        """
        Crea un reembolso
        
        Args:
            payment_intent_id: ID del payment intent
            amount: Monto a reembolsar (None = total)
            
        Returns:
            Dict con información del reembolso
        """
        try:
            refund_data = {"payment_intent": payment_intent_id}
            if amount:
                refund_data["amount"] = int(amount * 100)  # Convertir a centavos
            
            refund = stripe.Refund.create(**refund_data)
            
            return {
                "id": refund.id,
                "status": refund.status,
                "amount": refund.amount / 100,
                "currency": refund.currency
            }
        except stripe.error.StripeError as e:
            print(f"Error creando reembolso: {e}")
            raise Exception(f"Error al procesar reembolso: {str(e)}")
    
    async def cancel_subscription(self, subscription_id: str) -> bool:
        """
        Cancela una suscripción
        
        Args:
            subscription_id: ID de la suscripción en Stripe
            
        Returns:
            True si se canceló exitosamente
        """
        try:
            stripe.Subscription.delete(subscription_id)
            return True
        except stripe.error.StripeError as e:
            print(f"Error cancelando suscripción: {e}")
            return False
