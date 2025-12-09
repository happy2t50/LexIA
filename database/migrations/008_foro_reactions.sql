-- ============================================================
-- MIGRACIÓN 008: REACCIONES DEL FORO
-- Agregar tablas para likes de comentarios y marcas "no útil"
-- ============================================================

-- Tabla para likes de publicaciones (ya existe como foro_likes)
-- Solo necesitamos agregar las nuevas tablas

-- ============================================================
-- FORO - MARCAS "NO ÚTIL" EN PUBLICACIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS foro_no_util (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  publicacion_id UUID NOT NULL,
  usuario_id UUID NOT NULL,
  fecha TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_foro_no_util_publicacion FOREIGN KEY (publicacion_id) REFERENCES foro_publicaciones(id) ON DELETE CASCADE,
  CONSTRAINT fk_foro_no_util_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT unique_foro_no_util UNIQUE (publicacion_id, usuario_id)
);

CREATE INDEX idx_foro_no_util_publicacion ON foro_no_util(publicacion_id);
CREATE INDEX idx_foro_no_util_usuario ON foro_no_util(usuario_id);

COMMENT ON TABLE foro_no_util IS 'Marcas de "no útil" en publicaciones del foro';

-- ============================================================
-- FORO - LIKES EN COMENTARIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS foro_comentarios_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comentario_id UUID NOT NULL,
  usuario_id UUID NOT NULL,
  fecha TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_foro_com_likes_comentario FOREIGN KEY (comentario_id) REFERENCES foro_comentarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_foro_com_likes_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT unique_foro_comentario_like UNIQUE (comentario_id, usuario_id)
);

CREATE INDEX idx_foro_com_likes_comentario ON foro_comentarios_likes(comentario_id);
CREATE INDEX idx_foro_com_likes_usuario ON foro_comentarios_likes(usuario_id);

COMMENT ON TABLE foro_comentarios_likes IS 'Likes en comentarios del foro';
