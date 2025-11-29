-- Eliminar foreign keys de transacciones para permitir IDs de usuarios que no existen localmente
-- (ya que usuarios está en otro microservicio)

-- Verificar constraints existentes
SELECT conname, contype FROM pg_constraint WHERE conrelid = 'transacciones'::regclass;

-- Eliminar FK de usuario_id
ALTER TABLE transacciones DROP CONSTRAINT IF EXISTS transacciones_usuario_id_fkey;

-- Eliminar FKs de suscripciones (si existen)
ALTER TABLE transacciones DROP CONSTRAINT IF EXISTS transacciones_suscripcion_anterior_fkey;
ALTER TABLE transacciones DROP CONSTRAINT IF EXISTS transacciones_suscripcion_nueva_fkey;

-- Verificar que se eliminaron
SELECT conname, contype FROM pg_constraint WHERE conrelid = 'transacciones'::regclass;

COMMENT ON COLUMN transacciones.usuario_id IS 'UUID del usuario (referencia a microservicio usuarios)';
