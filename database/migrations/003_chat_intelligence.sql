-- ============================================================
-- MIGRACIÓN: Sistema de Chat Inteligente con IA
-- ============================================================

-- ============================================================
-- TABLA: Conversaciones (Chat con memoria)
-- ============================================================
CREATE TABLE IF NOT EXISTS conversaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL,
  sesion_id UUID NOT NULL,
  mensaje TEXT NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('user', 'assistant', 'system')),
  cluster_detectado VARCHAR(10),
  embedding vector(384),
  sentimiento VARCHAR(20),
  intencion VARCHAR(50),
  contexto JSONB,
  metadata JSONB,
  fecha TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_conv_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT chk_conv_cluster CHECK (cluster_detectado IN ('C1', 'C2', 'C3', 'C4', 'C5'))
);

CREATE INDEX idx_conv_sesion ON conversaciones(sesion_id);
CREATE INDEX idx_conv_usuario ON conversaciones(usuario_id);
CREATE INDEX idx_conv_fecha ON conversaciones(fecha DESC);
CREATE INDEX idx_conv_cluster ON conversaciones(cluster_detectado);
CREATE INDEX idx_conv_embedding ON conversaciones USING hnsw (embedding vector_cosine_ops);

COMMENT ON TABLE conversaciones IS 'Historial completo de conversaciones del chat con embeddings';
COMMENT ON COLUMN conversaciones.contexto IS 'Documentos RAG, artículos encontrados, etc.';

-- ============================================================
-- TABLA: Sesiones de Chat
-- ============================================================
CREATE TABLE IF NOT EXISTS sesiones_chat (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL,
  titulo VARCHAR(255),
  cluster_principal VARCHAR(10),
  total_mensajes INT DEFAULT 0,
  fecha_inicio TIMESTAMP DEFAULT NOW(),
  fecha_ultimo_mensaje TIMESTAMP DEFAULT NOW(),
  activa BOOLEAN DEFAULT TRUE,

  CONSTRAINT fk_sesion_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX idx_sesion_usuario ON sesiones_chat(usuario_id);
CREATE INDEX idx_sesion_activa ON sesiones_chat(activa);

COMMENT ON TABLE sesiones_chat IS 'Sesiones de conversación del chat';

-- ============================================================
-- TABLA: Perfil de Usuario por Cluster
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios_clusters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL,
  cluster VARCHAR(10) NOT NULL,
  total_consultas INT DEFAULT 1,
  primera_consulta TIMESTAMP DEFAULT NOW(),
  ultima_consulta TIMESTAMP DEFAULT NOW(),
  embedding_promedio vector(384),
  temas_frecuentes TEXT[],

  CONSTRAINT fk_uc_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT chk_uc_cluster CHECK (cluster IN ('C1', 'C2', 'C3', 'C4', 'C5')),
  UNIQUE(usuario_id, cluster)
);

CREATE INDEX idx_uc_usuario ON usuarios_clusters(usuario_id);
CREATE INDEX idx_uc_cluster ON usuarios_clusters(cluster);
CREATE INDEX idx_uc_embedding ON usuarios_clusters USING hnsw (embedding_promedio vector_cosine_ops);

COMMENT ON TABLE usuarios_clusters IS 'Perfil de cada usuario por cluster de consultas';
COMMENT ON COLUMN usuarios_clusters.embedding_promedio IS 'Promedio de embeddings de consultas del usuario en este cluster';

-- ============================================================
-- TABLA: Grupos de Usuarios Similares (Para Foro)
-- ============================================================
CREATE TABLE IF NOT EXISTS grupos_usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cluster VARCHAR(10) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  total_miembros INT DEFAULT 0,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  activo BOOLEAN DEFAULT TRUE,

  CONSTRAINT chk_grupo_cluster CHECK (cluster IN ('C1', 'C2', 'C3', 'C4', 'C5'))
);

CREATE INDEX idx_grupos_cluster ON grupos_usuarios(cluster);
CREATE INDEX idx_grupos_activo ON grupos_usuarios(activo);

COMMENT ON TABLE grupos_usuarios IS 'Grupos de usuarios con problemas similares';

-- Insertar grupos por defecto
INSERT INTO grupos_usuarios (id, cluster, nombre, descripcion) VALUES
  (uuid_generate_v4(), 'C1', 'Infracciones de Velocidad y Semáforos', 'Usuarios con multas por exceso de velocidad o violación de semáforos'),
  (uuid_generate_v4(), 'C2', 'Problemas de Estacionamiento', 'Usuarios con infracciones por estacionamiento indebido'),
  (uuid_generate_v4(), 'C3', 'Controles de Alcoholemia', 'Usuarios con problemas relacionados con alcoholímetro'),
  (uuid_generate_v4(), 'C4', 'Documentación Vehicular', 'Usuarios con faltas de documentos (SOAT, licencia, etc.)'),
  (uuid_generate_v4(), 'C5', 'Accidentes de Tránsito', 'Usuarios involucrados en accidentes')
ON CONFLICT DO NOTHING;

-- ============================================================
-- TABLA: Membresía de Grupos
-- ============================================================
CREATE TABLE IF NOT EXISTS grupo_miembros (
  grupo_id UUID NOT NULL,
  usuario_id UUID NOT NULL,
  fecha_union TIMESTAMP DEFAULT NOW(),
  activo BOOLEAN DEFAULT TRUE,
  total_participaciones INT DEFAULT 0,

  CONSTRAINT fk_gm_grupo FOREIGN KEY (grupo_id) REFERENCES grupos_usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_gm_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  PRIMARY KEY (grupo_id, usuario_id)
);

CREATE INDEX idx_gm_usuario ON grupo_miembros(usuario_id);
CREATE INDEX idx_gm_activo ON grupo_miembros(activo);

COMMENT ON TABLE grupo_miembros IS 'Relación usuarios-grupos';

-- ============================================================
-- TABLA: Sistema de Aprendizaje e Interacciones
-- ============================================================
CREATE TABLE IF NOT EXISTS interacciones_aprendizaje (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo VARCHAR(50) NOT NULL,
  usuario_id UUID NOT NULL,
  abogado_id UUID,
  consulta_id UUID,
  conversacion_id UUID,
  valoracion INT CHECK (valoracion >= 1 AND valoracion <= 5),
  feedback TEXT,
  cluster VARCHAR(10),
  metadata JSONB,
  fecha TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_ia_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_ia_abogado FOREIGN KEY (abogado_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_ia_consulta FOREIGN KEY (consulta_id) REFERENCES consultas(id) ON DELETE CASCADE,
  CONSTRAINT fk_ia_conversacion FOREIGN KEY (conversacion_id) REFERENCES conversaciones(id) ON DELETE CASCADE,
  CONSTRAINT chk_ia_tipo CHECK (tipo IN (
    'valoracion_abogado',
    'like_respuesta',
    'dislike_respuesta',
    'contacto_abogado',
    'resolucion_caso',
    'feedback_general'
  ))
);

CREATE INDEX idx_ia_tipo ON interacciones_aprendizaje(tipo);
CREATE INDEX idx_ia_cluster ON interacciones_aprendizaje(cluster);
CREATE INDEX idx_ia_abogado ON interacciones_aprendizaje(abogado_id);
CREATE INDEX idx_ia_usuario ON interacciones_aprendizaje(usuario_id);
CREATE INDEX idx_ia_fecha ON interacciones_aprendizaje(fecha DESC);

COMMENT ON TABLE interacciones_aprendizaje IS 'Sistema de aprendizaje del chatbot basado en interacciones';

-- ============================================================
-- TABLA: Scores de Recomendación Dinámicos
-- ============================================================
CREATE TABLE IF NOT EXISTS recommendation_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  abogado_id UUID NOT NULL,
  cluster VARCHAR(10) NOT NULL,
  score_base FLOAT DEFAULT 0.5,
  score_ajustado FLOAT DEFAULT 0.5,
  total_recomendaciones INT DEFAULT 0,
  total_contactos INT DEFAULT 0,
  total_casos_exitosos INT DEFAULT 0,
  ultima_actualizacion TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_rs_abogado FOREIGN KEY (abogado_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT chk_rs_cluster CHECK (cluster IN ('C1', 'C2', 'C3', 'C4', 'C5')),
  CONSTRAINT chk_rs_score CHECK (score_ajustado >= 0 AND score_ajustado <= 1),
  UNIQUE(abogado_id, cluster)
);

CREATE INDEX idx_rs_cluster ON recommendation_scores(cluster);
CREATE INDEX idx_rs_score ON recommendation_scores(score_ajustado DESC);

COMMENT ON TABLE recommendation_scores IS 'Scores dinámicos de recomendación por abogado y cluster';

-- ============================================================
-- FUNCIONES AUXILIARES
-- ============================================================

-- Función: Buscar usuarios similares
CREATE OR REPLACE FUNCTION buscar_usuarios_similares(
  p_usuario_id UUID,
  p_cluster VARCHAR,
  limite INT DEFAULT 10
)
RETURNS TABLE (
  usuario_id UUID,
  nombre VARCHAR,
  cluster VARCHAR,
  total_consultas INT,
  similitud FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id AS usuario_id,
    u.nombre,
    uc.cluster,
    uc.total_consultas,
    1 - (uc.embedding_promedio <=> (
      SELECT embedding_promedio
      FROM usuarios_clusters
      WHERE usuario_id = p_usuario_id AND cluster = p_cluster
    )) AS similitud
  FROM usuarios_clusters uc
  JOIN usuarios u ON uc.usuario_id = u.id
  WHERE uc.cluster = p_cluster
    AND uc.usuario_id != p_usuario_id
    AND uc.embedding_promedio IS NOT NULL
  ORDER BY uc.embedding_promedio <=> (
    SELECT embedding_promedio
    FROM usuarios_clusters
    WHERE usuario_id = p_usuario_id AND cluster = p_cluster
  )
  LIMIT limite;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION buscar_usuarios_similares IS 'Encuentra usuarios con consultas similares en un cluster';

-- Función: Actualizar score de abogado
CREATE OR REPLACE FUNCTION actualizar_score_abogado(
  p_abogado_id UUID,
  p_cluster VARCHAR,
  p_valoracion INT
)
RETURNS VOID AS $$
DECLARE
  v_factor FLOAT;
BEGIN
  -- Calcular factor de ajuste basado en valoración
  v_factor := CASE
    WHEN p_valoracion >= 4 THEN 1.1  -- Aumentar 10%
    WHEN p_valoracion = 3 THEN 1.0   -- Mantener
    ELSE 0.9                          -- Reducir 10%
  END;

  -- Actualizar o insertar score
  INSERT INTO recommendation_scores (abogado_id, cluster, score_ajustado, total_recomendaciones)
  VALUES (p_abogado_id, p_cluster, 0.5 * v_factor, 1)
  ON CONFLICT (abogado_id, cluster)
  DO UPDATE SET
    score_ajustado = LEAST(1.0, recommendation_scores.score_ajustado * v_factor),
    total_recomendaciones = recommendation_scores.total_recomendaciones + 1,
    ultima_actualizacion = NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION actualizar_score_abogado IS 'Actualiza dinámicamente el score de recomendación de un abogado';

-- Función: Agregar usuario a grupo automáticamente
CREATE OR REPLACE FUNCTION agregar_usuario_a_grupo(
  p_usuario_id UUID,
  p_cluster VARCHAR
)
RETURNS VOID AS $$
DECLARE
  v_grupo_id UUID;
BEGIN
  -- Buscar grupo del cluster
  SELECT id INTO v_grupo_id
  FROM grupos_usuarios
  WHERE cluster = p_cluster AND activo = TRUE
  LIMIT 1;

  -- Agregar usuario al grupo si no está
  IF v_grupo_id IS NOT NULL THEN
    INSERT INTO grupo_miembros (grupo_id, usuario_id)
    VALUES (v_grupo_id, p_usuario_id)
    ON CONFLICT (grupo_id, usuario_id) DO NOTHING;

    -- Actualizar contador de miembros
    UPDATE grupos_usuarios
    SET total_miembros = (
      SELECT COUNT(*) FROM grupo_miembros WHERE grupo_id = v_grupo_id AND activo = TRUE
    )
    WHERE id = v_grupo_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION agregar_usuario_a_grupo IS 'Agrega automáticamente usuario a grupo según cluster';

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger: Auto-agregar a grupo cuando se crea consulta
CREATE OR REPLACE FUNCTION trigger_agregar_a_grupo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cluster_asignado IS NOT NULL THEN
    PERFORM agregar_usuario_a_grupo(NEW.usuario_id, NEW.cluster_asignado);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_insert_consulta
AFTER INSERT ON consultas
FOR EACH ROW
EXECUTE FUNCTION trigger_agregar_a_grupo();

-- Trigger: Actualizar embedding promedio del usuario
CREATE OR REPLACE FUNCTION trigger_actualizar_embedding_usuario()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cluster_detectado IS NOT NULL AND NEW.embedding IS NOT NULL THEN
    INSERT INTO usuarios_clusters (usuario_id, cluster, total_consultas, embedding_promedio)
    VALUES (
      NEW.usuario_id,
      NEW.cluster_detectado,
      1,
      NEW.embedding
    )
    ON CONFLICT (usuario_id, cluster)
    DO UPDATE SET
      total_consultas = usuarios_clusters.total_consultas + 1,
      ultima_consulta = NOW(),
      embedding_promedio = (
        usuarios_clusters.embedding_promedio * usuarios_clusters.total_consultas +
        NEW.embedding
      ) / (usuarios_clusters.total_consultas + 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_insert_conversacion
AFTER INSERT ON conversaciones
FOR EACH ROW
EXECUTE FUNCTION trigger_actualizar_embedding_usuario();

-- ============================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================
