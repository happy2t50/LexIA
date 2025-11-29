"""
Repositorio para operaciones con Transacciones
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Optional, List
from uuid import UUID
from datetime import datetime

from ..db.models import Transaccion as DBTransaccion
from ...domain.entities.transaccion import Transaccion


class TransaccionRepository:
    """Repositorio para gestionar transacciones en la base de datos"""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def create(self, transaccion: DBTransaccion) -> Transaccion:
        """
        Crea una nueva transacción
        
        Args:
            transaccion: Modelo de transacción a crear
            
        Returns:
            Transaccion entidad de dominio
        """
        self.session.add(transaccion)
        await self.session.commit()
        await self.session.refresh(transaccion)
        return self._to_domain(transaccion)
    
    def _to_domain(self, db_transaccion: DBTransaccion) -> Transaccion:
        """Convierte modelo DB a entidad de dominio"""
        return Transaccion(
            id=db_transaccion.id,
            usuario_id=db_transaccion.usuario_id,
            monto=db_transaccion.monto,
            moneda=db_transaccion.moneda,
            metodo_pago=db_transaccion.metodo_pago,
            estado=db_transaccion.estado,
            stripe_payment_id=db_transaccion.stripe_payment_id,
            stripe_session_id=db_transaccion.stripe_session_id,
            stripe_customer_id=db_transaccion.stripe_customer_id,
            suscripcion_anterior=db_transaccion.suscripcion_anterior,
            suscripcion_nueva=db_transaccion.suscripcion_nueva,
            fecha_transaccion=db_transaccion.fecha_transaccion,
            fecha_completado=db_transaccion.fecha_completado,
            metadata=db_transaccion.metadata_json or {},
            notas=db_transaccion.notas
        )
    
    async def get_by_id(self, transaccion_id: UUID) -> Optional[Transaccion]:
        """
        Obtiene una transacción por su ID
        
        Args:
            transaccion_id: UUID de la transacción
            
        Returns:
            Transaccion o None
        """
        stmt = select(DBTransaccion).where(DBTransaccion.id == transaccion_id)
        result = await self.session.execute(stmt)
        db_transaccion = result.scalars().first()
        
        if not db_transaccion:
            return None
        
        return self._to_domain(db_transaccion)
    
    async def get_by_session_id(self, session_id: str) -> Optional[Transaccion]:
        """
        Obtiene una transacción por stripe_session_id
        
        Args:
            session_id: ID de sesión de Stripe
            
        Returns:
            Transaccion o None
        """
        stmt = select(DBTransaccion).where(DBTransaccion.stripe_session_id == session_id)
        result = await self.session.execute(stmt)
        db_transaccion = result.scalars().first()
        
        if not db_transaccion:
            return None
        
        return self._to_domain(db_transaccion)
    
    async def get_by_usuario(
        self, 
        usuario_id: UUID,
        skip: int = 0,
        limit: int = 100
    ) -> List[Transaccion]:
        """
        Obtiene todas las transacciones de un usuario
        
        Args:
            usuario_id: UUID del usuario
            skip: Registros a saltar (paginación)
            limit: Máximo de registros
            
        Returns:
            Lista de transacciones
        """
        stmt = (
            select(DBTransaccion)
            .where(DBTransaccion.usuario_id == usuario_id)
            .order_by(DBTransaccion.fecha_transaccion.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        db_transacciones = result.scalars().all()
        
        return [self._to_domain(t) for t in db_transacciones]
    
    async def update_estado(
        self,
        transaccion_id: UUID,
        nuevo_estado: str,
        payment_id: Optional[str] = None
    ) -> Optional[Transaccion]:
        """
        Actualiza el estado de una transacción
        
        Args:
            transaccion_id: UUID de la transacción
            nuevo_estado: Nuevo estado ('completado', 'fallido', etc.)
            payment_id: ID del payment intent de Stripe
            
        Returns:
            Transaccion actualizada o None
        """
        stmt = select(DBTransaccion).where(DBTransaccion.id == transaccion_id)
        result = await self.session.execute(stmt)
        db_transaccion = result.scalars().first()
        
        if not db_transaccion:
            return None
        
        db_transaccion.estado = nuevo_estado
        
        if payment_id:
            db_transaccion.stripe_payment_id = payment_id
        
        if nuevo_estado == "completado":
            db_transaccion.fecha_completado = datetime.utcnow()
        
        await self.session.commit()
        await self.session.refresh(db_transaccion)
        
        return self._to_domain(db_transaccion)
    
    async def get_all(self, skip: int = 0, limit: int = 100) -> List[Transaccion]:
        """
        Obtiene todas las transacciones (admin)
        
        Args:
            skip: Registros a saltar
            limit: Máximo de registros
            
        Returns:
            Lista de transacciones
        """
        stmt = (
            select(DBTransaccion)
            .order_by(DBTransaccion.fecha_transaccion.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        db_transacciones = result.scalars().all()
        
        return [self._to_domain(t) for t in db_transacciones]
