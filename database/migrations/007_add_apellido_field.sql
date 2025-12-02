-- ============================================================
-- MIGRACIÓN: Agregar campo apellido a tabla usuarios
-- Fecha: 2025-11-30
-- Descripción: Agregar campo apellido separado del nombre
-- ============================================================

-- Agregar campo apellido a tabla usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS apellido VARCHAR(255);

-- Actualizar usuarios existentes (dividir nombre en nombre y apellido)
UPDATE usuarios 
SET apellido = CASE 
    WHEN POSITION(' ' IN nombre) > 0 THEN 
        TRIM(SUBSTRING(nombre FROM POSITION(' ' IN nombre) + 1))
    ELSE 
        'Sin apellido'
END
WHERE apellido IS NULL;

-- Actualizar nombre para que solo contenga el primer nombre
UPDATE usuarios 
SET nombre = CASE 
    WHEN POSITION(' ' IN nombre) > 0 THEN 
        TRIM(SUBSTRING(nombre FROM 1 FOR POSITION(' ' IN nombre) - 1))
    ELSE 
        nombre
END
WHERE POSITION(' ' IN nombre) > 0;

-- Hacer que apellido sea NOT NULL después de la migración de datos
ALTER TABLE usuarios ALTER COLUMN apellido SET NOT NULL;

COMMENT ON COLUMN usuarios.apellido IS 'Apellido(s) del usuario';