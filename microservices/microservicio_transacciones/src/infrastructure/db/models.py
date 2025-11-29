"""
Modelos SQLAlchemy para Transacciones
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, DECIMAL, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from .database import Base


class Transaccion(Base):
    __tablename__ = "transacciones"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # Sin FK, apunta a microservicio usuarios
    
    # Información del pago
    monto = Column(DECIMAL(10, 2), nullable=False)
    moneda = Column(String(3), default="USD")
    metodo_pago = Column(String(50))  # 'stripe', 'mercadopago'
    
    # Estado
    estado = Column(String(50), nullable=False, default="pendiente", index=True)
    
    # IDs externos
    stripe_payment_id = Column(String(255), index=True)
    stripe_session_id = Column(String(255), index=True)
    stripe_customer_id = Column(String(255))
    
    # Cambio de suscripción (sin FK ya que suscripciones está en otra BD)
    suscripcion_anterior = Column(Integer)
    suscripcion_nueva = Column(Integer)
    
    # Timestamps
    fecha_transaccion = Column(DateTime, default=datetime.utcnow, index=True)
    fecha_completado = Column(DateTime)
    
    # Metadata (renombrado a metadata_json para evitar conflicto con SQLAlchemy)
    metadata_json = Column("metadata", JSONB)
    notas = Column(Text)
