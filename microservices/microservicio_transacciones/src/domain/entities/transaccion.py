"""
Entidades de dominio para Transacciones
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID
from decimal import Decimal


class Transaccion(BaseModel):
    """Entidad de dominio para una transacción de pago"""
    
    id: UUID
    usuario_id: UUID
    monto: Decimal
    moneda: str = "USD"
    metodo_pago: Optional[str] = None  # 'stripe', 'mercadopago'
    estado: str  # 'pendiente', 'completado', 'fallido', 'reembolsado'
    
    # IDs externos
    stripe_payment_id: Optional[str] = None
    stripe_session_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    
    # Cambio de suscripción
    suscripcion_anterior: Optional[int] = None
    suscripcion_nueva: Optional[int] = None
    
    # Timestamps
    fecha_transaccion: datetime
    fecha_completado: Optional[datetime] = None
    
    # Metadata
    metadata: Optional[dict] = None
    notas: Optional[str] = None
    
    class Config:
        from_attributes = True


class TransaccionCreate(BaseModel):
    """Esquema para crear una nueva transacción"""
    
    usuario_id: UUID = Field(..., description="ID del usuario que realiza el pago")
    plan: str = Field(..., description="Plan a comprar: 'pro_monthly', 'pro_yearly'")
    

class CheckoutSession(BaseModel):
    """Respuesta al crear una sesión de checkout"""
    
    transaccion_id: UUID
    checkout_url: str
    session_id: str
    expires_at: datetime


class TransaccionResponse(BaseModel):
    """Respuesta detallada de una transacción"""
    
    transaccion: Transaccion
    usuario_email: Optional[str] = None
    suscripcion_anterior_nombre: Optional[str] = None
    suscripcion_nueva_nombre: Optional[str] = None
