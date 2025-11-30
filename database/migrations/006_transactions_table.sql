-- Migración: Tabla de Transacciones para Stripe
-- Descripción: Manejo de pagos y suscripciones de usuarios
-- Fecha: 2024

-- ============================================================
-- TABLA: transacciones
-- ============================================================

CREATE TABLE IF NOT EXISTS transacciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

    -- Información de pago
    monto DECIMAL(10, 2) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'USD',
    metodo_pago VARCHAR(50),

    -- Estado de la transacción
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    -- Estados: 'pendiente', 'completado', 'fallido', 'reembolsado'

    -- IDs de Stripe
    stripe_payment_id VARCHAR(255),
    stripe_session_id VARCHAR(255) UNIQUE,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),

    -- Plan/Tipo de suscripción
    plan VARCHAR(50), -- 'pro_monthly', 'pro_yearly', etc.
    rol_anterior INTEGER REFERENCES roles(id),
    rol_nuevo INTEGER REFERENCES roles(id),

    -- Metadata adicional
    metadata JSONB,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ÍNDICES para mejorar el rendimiento
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_transacciones_usuario
    ON transacciones(usuario_id);

CREATE INDEX IF NOT EXISTS idx_transacciones_estado
    ON transacciones(estado);

CREATE INDEX IF NOT EXISTS idx_transacciones_stripe_session
    ON transacciones(stripe_session_id);

CREATE INDEX IF NOT EXISTS idx_transacciones_stripe_payment
    ON transacciones(stripe_payment_id);

CREATE INDEX IF NOT EXISTS idx_transacciones_stripe_customer
    ON transacciones(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_transacciones_created_at
    ON transacciones(created_at DESC);

-- ============================================================
-- TRIGGER para actualizar updated_at automáticamente
-- ============================================================

CREATE OR REPLACE FUNCTION update_transacciones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS transacciones_updated_at_trigger ON transacciones;

CREATE TRIGGER transacciones_updated_at_trigger
    BEFORE UPDATE ON transacciones
    FOR EACH ROW
    EXECUTE FUNCTION update_transacciones_updated_at();

-- ============================================================
-- COMENTARIOS para documentación
-- ============================================================

COMMENT ON TABLE transacciones IS 'Registro de transacciones de pagos con Stripe';
COMMENT ON COLUMN transacciones.estado IS 'Estados: pendiente, completado, fallido, reembolsado';
COMMENT ON COLUMN transacciones.stripe_session_id IS 'ID de sesión de checkout de Stripe';
COMMENT ON COLUMN transacciones.stripe_payment_id IS 'ID del payment intent de Stripe';
COMMENT ON COLUMN transacciones.stripe_customer_id IS 'ID del cliente en Stripe';
COMMENT ON COLUMN transacciones.stripe_subscription_id IS 'ID de la suscripción en Stripe';
COMMENT ON COLUMN transacciones.plan IS 'Plan contratado (pro_monthly, pro_yearly, etc.)';
COMMENT ON COLUMN transacciones.rol_anterior IS 'Rol del usuario antes de la transacción';
COMMENT ON COLUMN transacciones.rol_nuevo IS 'Rol del usuario después de la transacción';

-- ============================================================
-- DATOS DE PRUEBA (opcional)
-- ============================================================

-- Nota: Los datos de prueba se insertarán automáticamente cuando
-- se realicen transacciones reales a través del servicio