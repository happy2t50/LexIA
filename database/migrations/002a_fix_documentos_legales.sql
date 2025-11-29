-- ============================================================
-- MIGRACIÓN: Agregar columna fecha_publicacion a documentos_legales
-- ============================================================

-- Agregar columna fecha_publicacion si no existe
ALTER TABLE documentos_legales
ADD COLUMN IF NOT EXISTS fecha_publicacion DATE;

COMMENT ON COLUMN documentos_legales.fecha_publicacion IS 'Fecha de publicación del documento legal';

-- Crear índice para ordenar por fecha
CREATE INDEX IF NOT EXISTS idx_documentos_fecha_publicacion
ON documentos_legales(fecha_publicacion DESC);