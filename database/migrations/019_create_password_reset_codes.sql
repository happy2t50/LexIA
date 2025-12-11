-- Tabla para códigos de recuperación de contraseña
CREATE TABLE IF NOT EXISTS password_reset_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para búsquedas rápidas por email y código
CREATE INDEX IF NOT EXISTS idx_password_reset_email_code ON password_reset_codes(email, code);

-- Índice para búsquedas por expiración
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_codes(expires_at);

COMMENT ON TABLE password_reset_codes IS 'Códigos de verificación para recuperación de contraseña';
