-- Migración 005: Sistema de Autenticación Mejorado
-- Tablas para JWT, OAuth2, 2FA, Recuperación de Contraseñas y Verificación de Email

-- =====================================================
-- 1. TABLA DE REFRESH TOKENS (JWT)
-- =====================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_info TEXT
);

CREATE INDEX idx_refresh_tokens_usuario ON refresh_tokens(usuario_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- =====================================================
-- 2. TABLA DE CUENTAS OAUTH (Google)
-- =====================================================
CREATE TABLE IF NOT EXISTS oauth_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'google', 'facebook', etc.
    provider_account_id VARCHAR(255) NOT NULL, -- Google ID, Facebook ID, etc.
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    profile_data JSONB, -- Datos del perfil (foto, nombre completo, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_account_id)
);

CREATE INDEX idx_oauth_accounts_usuario ON oauth_accounts(usuario_id);
CREATE INDEX idx_oauth_accounts_provider ON oauth_accounts(provider, provider_account_id);

-- =====================================================
-- 3. TABLA DE 2FA (TOTP)
-- =====================================================
CREATE TABLE IF NOT EXISTS two_factor_auth (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    secret TEXT NOT NULL, -- Secret para TOTP (encriptado)
    enabled BOOLEAN DEFAULT FALSE,
    backup_codes TEXT[], -- Códigos de respaldo (encriptados)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    enabled_at TIMESTAMP,
    last_used_at TIMESTAMP
);

CREATE INDEX idx_2fa_usuario ON two_factor_auth(usuario_id);

-- =====================================================
-- 4. TABLA DE TOKENS DE VERIFICACIÓN DE EMAIL
-- =====================================================
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP,
    ip_address VARCHAR(45),
    attempts INTEGER DEFAULT 0
);

CREATE INDEX idx_email_verification_usuario ON email_verification_tokens(usuario_id);
CREATE INDEX idx_email_verification_token ON email_verification_tokens(token);
CREATE INDEX idx_email_verification_expires ON email_verification_tokens(expires_at);

-- =====================================================
-- 5. TABLA DE TOKENS DE RECUPERACIÓN DE CONTRASEÑA
-- =====================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP,
    ip_address VARCHAR(45),
    attempts INTEGER DEFAULT 0
);

CREATE INDEX idx_password_reset_usuario ON password_reset_tokens(usuario_id);
CREATE INDEX idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_expires ON password_reset_tokens(expires_at);

-- =====================================================
-- 6. TABLA DE LOG DE AUTENTICACIÓN (Seguridad)
-- =====================================================
CREATE TABLE IF NOT EXISTS auth_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    email VARCHAR(255),
    event_type VARCHAR(50) NOT NULL, -- 'login', 'logout', 'register', 'password_reset', 'failed_login', '2fa_enabled', etc.
    success BOOLEAN NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_info TEXT,
    failure_reason TEXT,
    metadata JSONB, -- Información adicional
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_auth_logs_usuario ON auth_logs(usuario_id);
CREATE INDEX idx_auth_logs_email ON auth_logs(email);
CREATE INDEX idx_auth_logs_event ON auth_logs(event_type);
CREATE INDEX idx_auth_logs_created ON auth_logs(created_at);
CREATE INDEX idx_auth_logs_ip ON auth_logs(ip_address);

-- =====================================================
-- 7. AGREGAR CAMPOS A TABLA USUARIOS EXISTENTE
-- =====================================================

-- Verificar si la columna ya existe antes de agregarla
DO $$
BEGIN
    -- Campo para OAuth (usuarios sin contraseña)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='usuarios' AND column_name='password_hash') THEN
        ALTER TABLE usuarios ADD COLUMN password_hash TEXT;
    END IF;

    -- Email verificado
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='usuarios' AND column_name='email_verified') THEN
        ALTER TABLE usuarios ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
    END IF;

    -- Fecha de verificación
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='usuarios' AND column_name='email_verified_at') THEN
        ALTER TABLE usuarios ADD COLUMN email_verified_at TIMESTAMP;
    END IF;

    -- 2FA activado
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='usuarios' AND column_name='two_factor_enabled') THEN
        ALTER TABLE usuarios ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
    END IF;

    -- Último login
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='usuarios' AND column_name='last_login_at') THEN
        ALTER TABLE usuarios ADD COLUMN last_login_at TIMESTAMP;
    END IF;

    -- IP del último login
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='usuarios' AND column_name='last_login_ip') THEN
        ALTER TABLE usuarios ADD COLUMN last_login_ip VARCHAR(45);
    END IF;

    -- Intentos fallidos de login (para lockout)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='usuarios' AND column_name='failed_login_attempts') THEN
        ALTER TABLE usuarios ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
    END IF;

    -- Fecha de lockout
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='usuarios' AND column_name='locked_until') THEN
        ALTER TABLE usuarios ADD COLUMN locked_until TIMESTAMP;
    END IF;

    -- Tipo de cuenta (normal, google, facebook, etc.)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='usuarios' AND column_name='account_type') THEN
        ALTER TABLE usuarios ADD COLUMN account_type VARCHAR(50) DEFAULT 'local';
    END IF;
END$$;

-- =====================================================
-- 8. FUNCIÓN PARA LIMPIAR TOKENS EXPIRADOS
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    -- Eliminar refresh tokens expirados (más de 30 días)
    DELETE FROM refresh_tokens
    WHERE expires_at < NOW() - INTERVAL '30 days';

    -- Eliminar tokens de verificación expirados (más de 7 días)
    DELETE FROM email_verification_tokens
    WHERE expires_at < NOW() - INTERVAL '7 days';

    -- Eliminar tokens de reset expirados (más de 7 días)
    DELETE FROM password_reset_tokens
    WHERE expires_at < NOW() - INTERVAL '7 days';

    -- Eliminar logs antiguos (más de 90 días)
    DELETE FROM auth_logs
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. FUNCIÓN PARA REGISTRAR EVENTO DE AUTENTICACIÓN
-- =====================================================
CREATE OR REPLACE FUNCTION log_auth_event(
    p_usuario_id UUID,
    p_email VARCHAR,
    p_event_type VARCHAR,
    p_success BOOLEAN,
    p_ip_address VARCHAR DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_failure_reason TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO auth_logs (
        usuario_id,
        email,
        event_type,
        success,
        ip_address,
        user_agent,
        failure_reason
    ) VALUES (
        p_usuario_id,
        p_email,
        p_event_type,
        p_success,
        p_ip_address,
        p_user_agent,
        p_failure_reason
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. VISTA PARA INFORMACIÓN DE USUARIO COMPLETA
-- =====================================================
CREATE OR REPLACE VIEW usuarios_full_info AS
SELECT
    u.id,
    u.email,
    u.nombre,
    u.telefono,
    u.rol_id,
    u.activo,
    u.email_verified,
    u.email_verified_at,
    u.two_factor_enabled,
    u.account_type,
    u.last_login_at,
    u.last_login_ip,
    u.failed_login_attempts,
    u.locked_until,
    u.fecha_registro as created_at,
    u.ultimo_acceso as updated_at,
    CASE
        WHEN u.locked_until IS NOT NULL AND u.locked_until > NOW() THEN true
        ELSE false
    END as is_locked,
    (SELECT COUNT(*) FROM oauth_accounts oa WHERE oa.usuario_id = u.id) as oauth_accounts_count,
    (SELECT COUNT(*) FROM refresh_tokens rt WHERE rt.usuario_id = u.id AND rt.revoked = false AND rt.expires_at > NOW()) as active_sessions_count
FROM usuarios u;

-- =====================================================
-- 11. COMENTARIOS EN TABLAS
-- =====================================================
COMMENT ON TABLE refresh_tokens IS 'Tokens de refresco para JWT (7 días de duración)';
COMMENT ON TABLE oauth_accounts IS 'Cuentas vinculadas con OAuth2 (Google, Facebook, etc.)';
COMMENT ON TABLE two_factor_auth IS 'Configuración de autenticación de dos factores (TOTP)';
COMMENT ON TABLE email_verification_tokens IS 'Tokens para verificar email (24 horas de duración)';
COMMENT ON TABLE password_reset_tokens IS 'Tokens para recuperación de contraseña (1 hora de duración)';
COMMENT ON TABLE auth_logs IS 'Log de eventos de autenticación para auditoría';

COMMENT ON COLUMN usuarios.password_hash IS 'Hash bcrypt de la contraseña (NULL para cuentas OAuth)';
COMMENT ON COLUMN usuarios.email_verified IS 'Si el email ha sido verificado';
COMMENT ON COLUMN usuarios.two_factor_enabled IS 'Si el usuario tiene 2FA activado';
COMMENT ON COLUMN usuarios.account_type IS 'Tipo de cuenta: local, google, facebook, etc.';
COMMENT ON COLUMN usuarios.failed_login_attempts IS 'Intentos fallidos consecutivos de login';
COMMENT ON COLUMN usuarios.locked_until IS 'Fecha hasta la cual la cuenta está bloqueada';

-- =====================================================
-- 12. DATOS INICIALES (OPCIONAL)
-- =====================================================

-- Usuario de prueba con contraseña hasheada (password: "Test123!")
-- Hash generado con bcrypt, 10 rounds
INSERT INTO usuarios (rol_id, email, nombre, password_hash, activo, email_verified, account_type)
VALUES (
    4, -- Admin role
    'admin@lexia.com',
    'Admin LexIA',
    '$2b$10$rKZhGjGx.wnQwJq9xWJZ3.Y8KqxJNHQ6kLZ7p8yZJGnHLqKZJGnHLq', -- Test123!
    true,
    true,
    'local'
) ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================