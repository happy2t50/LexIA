-- Agregar columna parent_id para comentarios anidados en el foro
ALTER TABLE foro_comentarios 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES foro_comentarios(id) ON DELETE CASCADE;

-- Crear índice para mejorar rendimiento de consultas de comentarios hijos
CREATE INDEX IF NOT EXISTS idx_foro_comentarios_parent_id ON foro_comentarios(parent_id);

COMMENT ON COLUMN foro_comentarios.parent_id IS 'ID del comentario padre para respuestas anidadas';
