"""
Microservicio de Transacciones y Pagos
Gestiona pagos con Stripe y upgrades de suscripciones
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from .infrastructure.db.database import init_db, close_db
from .infrastructure.api import router as transaction_router

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Ciclo de vida de la aplicación
    """
    logger.info("🚀 Iniciando Microservicio de Transacciones...")
    
    try:
        await init_db()
        logger.info("✅ Base de datos inicializada correctamente")
    except Exception as e:
        logger.error(f"❌ Error al inicializar la base de datos: {e}")
        raise e
    
    yield
    
    logger.info("🛑 Cerrando Microservicio de Transacciones...")
    try:
        await close_db()
        logger.info("✅ Conexión a la base de datos cerrada correctamente")
    except Exception as e:
        logger.error(f"❌ Error al cerrar la conexión: {e}")


# Inicializar FastAPI
app = FastAPI(
    title="Microservicio de Transacciones - LexIA",
    description="Gestión de pagos con Stripe y actualizaciones de suscripciones",
    version="1.0.0",
    lifespan=lifespan
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar orígenes permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar routers
app.include_router(transaction_router)


# Endpoints de salud
@app.get("/")
async def root():
    """Endpoint raíz"""
    return {
        "message": "Microservicio de Transacciones LexIA está activo",
        "version": "1.0.0",
        "status": "healthy"
    }


@app.get("/health")
async def health_check():
    """Health check"""
    return {
        "status": "healthy",
        "service": "transacciones",
        "version": "1.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=8002,
        reload=True
    )
