-- Tabla para reportes de profesionistas
CREATE TABLE IF NOT EXISTS reportes_profesionistas (
  id SERIAL PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  profesionista_id TEXT NOT NULL,
  motivo VARCHAR(100) NOT NULL,
  descripcion TEXT,
  fecha_reporte TIMESTAMP NOT NULL DEFAULT NOW(),
  estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, revisado, resuelto
  notas_admin TEXT
);

CREATE INDEX idx_reportes_usuario ON reportes_profesionistas(usuario_id);
CREATE INDEX idx_reportes_profesionista ON reportes_profesionistas(profesionista_id);
CREATE INDEX idx_reportes_estado ON reportes_profesionistas(estado);
CREATE INDEX idx_reportes_fecha ON reportes_profesionistas(fecha_reporte DESC);


-- Tabla para bloqueos de profesionistas por usuario
CREATE TABLE IF NOT EXISTS bloqueos_profesionistas (
  id SERIAL PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  profesionista_id TEXT NOT NULL,
  motivo TEXT,
  ultimos_mensajes JSONB, -- últimos 10 mensajes de la conversación
  fecha_bloqueo TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (usuario_id, profesionista_id) -- Un usuario solo puede bloquear una vez al mismo profesionista
);

CREATE INDEX idx_bloqueos_usuario ON bloqueos_profesionistas(usuario_id);
CREATE INDEX idx_bloqueos_profesionista ON bloqueos_profesionistas(profesionista_id);
CREATE INDEX idx_bloqueos_fecha ON bloqueos_profesionistas(fecha_bloqueo DESC);


-- Comentarios
COMMENT ON TABLE reportes_profesionistas IS 'Reportes de usuarios sobre profesionistas';
COMMENT ON TABLE bloqueos_profesionistas IS 'Bloqueos de profesionistas por usuarios con contexto de mensajes';
