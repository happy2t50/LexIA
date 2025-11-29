"""
Router principal de transacciones y pagos
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from fastapi.responses import RedirectResponse, HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
import uuid
from datetime import datetime
import os
import httpx

from ..db.database import get_db
from ...domain.entities.transaccion import (
    TransaccionCreate,
    CheckoutSession,
    Transaccion,
    TransaccionResponse
)
from ..adapters.stripe_adapter import StripeAdapter
from ..adapters.transaccion_repository import TransaccionRepository
from ..db.models import Transaccion as DBTransaccion


router = APIRouter(prefix="/transactions", tags=["Transacciones"])


# ========================================
# Dependencias
# ========================================

def get_stripe_adapter() -> StripeAdapter:
    """Proporciona el adaptador de Stripe"""
    return StripeAdapter()


# ========================================
# Endpoints de Checkout
# ========================================

@router.post("/create-checkout", response_model=CheckoutSession)
async def create_checkout(
    data: TransaccionCreate,
    session: AsyncSession = Depends(get_db),
    stripe_adapter: StripeAdapter = Depends(get_stripe_adapter)
):
    """
    Crea una sesión de checkout de Stripe para upgrade a PRO
    
    **Flujo:**
    1. Crea registro en DB con estado='pendiente'
    2. Crea sesión de Stripe Checkout
    3. Retorna URL para que el usuario complete el pago
    
    **Planes disponibles:**
    - pro_monthly: $9.99/mes
    - pro_yearly: $99.99/año (ahorra 2 meses)
    """
    repo = TransaccionRepository(session)
    
    # Determinar monto según el plan
    montos = {
        "pro_monthly": 9.99,
        "pro_yearly": 99.99
    }
    
    if data.plan not in montos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Plan inválido. Usa 'pro_monthly' o 'pro_yearly'"
        )
    
    # Crear transacción pendiente
    nueva_transaccion = DBTransaccion(
        id=uuid.uuid4(),
        usuario_id=data.usuario_id,
        monto=montos[data.plan],
        moneda="MXN",
        metodo_pago="stripe",
        estado="pendiente",
        suscripcion_anterior=1,  # Free
        suscripcion_nueva=2,     # Pro
        fecha_transaccion=datetime.utcnow(),
        metadata_json={"plan": data.plan}
    )
    
    transaccion = await repo.create(nueva_transaccion)
    
    # Crear sesión de Stripe
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    try:
        checkout_data = await stripe_adapter.create_checkout_session(
            usuario_id=str(data.usuario_id),
            plan=data.plan,
            success_url=f"{frontend_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend_url}/payment/cancel",
            metadata={
                "transaccion_id": str(transaccion.id),
                "usuario_id": str(data.usuario_id)
            }
        )
        
        # Actualizar transacción con session_id usando el modelo ORM
        transaccion_db = await session.get(DBTransaccion, transaccion.id)
        if transaccion_db:
            transaccion_db.stripe_session_id = checkout_data['session_id']
            await session.commit()
        
        return CheckoutSession(
            transaccion_id=transaccion.id,
            checkout_url=checkout_data["checkout_url"],
            session_id=checkout_data["session_id"],
            expires_at=checkout_data["expires_at"]
        )
        
    except Exception as e:
        # Marcar transacción como fallida
        await repo.update_estado(transaccion.id, "fallido")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear checkout: {str(e)}"
        )


@router.post("/create-checkout-redirect")
async def create_checkout_redirect(
    data: TransaccionCreate,
    session: AsyncSession = Depends(get_db),
    stripe_adapter: StripeAdapter = Depends(get_stripe_adapter)
):
    """
    Crea una sesión de checkout de Stripe y redirige automáticamente al usuario.
    
    **Flujo:**
    1. Crea registro en DB con estado='pendiente'
    2. Crea sesión de Stripe Checkout
    3. Redirige al usuario a la página de pago de Stripe
    
    **Planes disponibles:**
    - pro_monthly: MXN 200/mes
    - pro_yearly: MXN 2,400/año
    """
    repo = TransaccionRepository(session)
    
    # Determinar monto según el plan
    montos = {
        "pro_monthly": 9.99,
        "pro_yearly": 99.99
    }
    
    if data.plan not in montos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Plan inválido. Usa 'pro_monthly' o 'pro_yearly'"
        )
    
    # Crear transacción pendiente
    nueva_transaccion = DBTransaccion(
        id=uuid.uuid4(),
        usuario_id=data.usuario_id,
        monto=montos[data.plan],
        moneda="MXN",
        metodo_pago="stripe",
        estado="pendiente",
        suscripcion_anterior=1,
        suscripcion_nueva=2,
        fecha_transaccion=datetime.utcnow(),
        metadata_json={"plan": data.plan}
    )
    
    transaccion = await repo.create(nueva_transaccion)
    
    # Crear sesión de Stripe
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    try:
        checkout_data = await stripe_adapter.create_checkout_session(
            usuario_id=str(data.usuario_id),
            plan=data.plan,
            success_url=f"{frontend_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend_url}/payment/cancel",
            metadata={
                "transaccion_id": str(transaccion.id),
                "usuario_id": str(data.usuario_id)
            }
        )
        
        # Actualizar transacción con session_id
        transaccion_db = await session.get(DBTransaccion, transaccion.id)
        if transaccion_db:
            transaccion_db.stripe_session_id = checkout_data['session_id']
            await session.commit()
        
        # Redirigir automáticamente a Stripe
        return RedirectResponse(url=checkout_data["checkout_url"], status_code=303)
        
    except Exception as e:
        # Marcar transacción como fallida
        await repo.update_estado(transaccion.id, "fallido")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear checkout: {str(e)}"
        )


# ========================================
# Webhook de Stripe
# ========================================

@router.post("/webhook/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_db),
    stripe_adapter: StripeAdapter = Depends(get_stripe_adapter)
):
    """
    Webhook de Stripe para recibir eventos de pago
    
    **Eventos soportados:**
    - checkout.session.completed: Pago exitoso
    - payment_intent.succeeded: Confirmación de pago
    - payment_intent.payment_failed: Pago fallido
    """
    payload = await request.body()
    
    # Verificar firma del webhook (seguridad)
    event = stripe_adapter.verify_webhook_signature(payload, stripe_signature)
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Firma de webhook inválida"
        )
    
    event_type = event["type"]
    data = event["data"]["object"]
    
    repo = TransaccionRepository(session)
    
    # Procesar según el tipo de evento
    if event_type == "checkout.session.completed":
        # El usuario completó el pago
        session_id = data["id"]
        transaccion = await repo.get_by_session_id(session_id)
        
        if transaccion:
            # Actualizar estado a completado
            await repo.update_estado(
                transaccion.id,
                "completado",
                data.get("payment_intent")
            )
            
            # Actualizar suscripción del usuario en microservicio usuarios
            await actualizar_suscripcion_usuario(
                usuario_id=transaccion.usuario_id,
                nueva_suscripcion_id=2  # Pro
            )
            
            return {"status": "success", "message": "Pago procesado"}
    
    elif event_type == "payment_intent.payment_failed":
        # El pago falló
        session_id = data.get("metadata", {}).get("session_id")
        if session_id:
            transaccion = await repo.get_by_session_id(session_id)
            if transaccion:
                await repo.update_estado(transaccion.id, "fallido")
    
    return {"status": "received"}


async def actualizar_suscripcion_usuario(usuario_id: uuid.UUID, nueva_suscripcion_id: int):
    """
    Llama al microservicio de usuarios para actualizar la suscripción
    """
    usuarios_url = os.getenv("USUARIOS_SERVICE_URL", "http://localhost:8001")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{usuarios_url}/users/{usuario_id}/upgrade",
                json={"suscripcion_id": nueva_suscripcion_id}
            )
            return response.status_code == 200
        except Exception as e:
            print(f"Error actualizando suscripción: {e}")
            return False


# ========================================
# Endpoints de Consulta
# ========================================

@router.get("/user/{usuario_id}", response_model=List[Transaccion])
async def get_user_transactions(
    usuario_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
    session: AsyncSession = Depends(get_db)
):
    """
    Obtiene el historial de transacciones de un usuario
    
    **Paginación:**
    - skip: Registros a saltar
    - limit: Máximo de registros (default: 100)
    """
    repo = TransaccionRepository(session)
    transacciones = await repo.get_by_usuario(usuario_id, skip, limit)
    return transacciones


@router.get("/{transaccion_id}", response_model=Transaccion)
async def get_transaction(
    transaccion_id: uuid.UUID,
    session: AsyncSession = Depends(get_db)
):
    """
    Obtiene una transacción específica por ID
    """
    repo = TransaccionRepository(session)
    transaccion = await repo.get_by_id(transaccion_id)
    
    if not transaccion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transacción no encontrada"
        )
    
    return transaccion


@router.get("/", response_model=List[Transaccion])
async def get_all_transactions(
    skip: int = 0,
    limit: int = 100,
    session: AsyncSession = Depends(get_db)
):
    """
    Obtiene todas las transacciones (admin)
    """
    repo = TransaccionRepository(session)
    transacciones = await repo.get_all(skip, limit)
    return transacciones
