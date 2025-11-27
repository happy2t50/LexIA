-- ============================================================
-- MIGRACIÓN: Soporte para RAG con pgvector
-- ============================================================

-- Habilitar extensión pgvector para embeddings vectoriales
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- TABLA: Documentos Legales para RAG
-- ============================================================
CREATE TABLE IF NOT EXISTS documentos_legales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo VARCHAR(500) NOT NULL,
  contenido TEXT NOT NULL,
  fuente VARCHAR(255),
  categoria VARCHAR(100),
  cluster_relacionado VARCHAR(10), -- C1-C5
  metadatos JSONB,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP DEFAULT NOW(),
  activo BOOLEAN DEFAULT TRUE,

  CONSTRAINT chk_cluster_doc CHECK (cluster_relacionado IN ('C1', 'C2', 'C3', 'C4', 'C5'))
);

CREATE INDEX idx_documentos_categoria ON documentos_legales(categoria);
CREATE INDEX idx_documentos_cluster ON documentos_legales(cluster_relacionado);
CREATE INDEX idx_documentos_activo ON documentos_legales(activo);

COMMENT ON TABLE documentos_legales IS 'Base de conocimiento legal para RAG';

-- ============================================================
-- TABLA: Chunks de Documentos con Embeddings
-- ============================================================
CREATE TABLE IF NOT EXISTS documento_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  documento_id UUID NOT NULL,
  chunk_index INT NOT NULL,
  contenido TEXT NOT NULL,
  embedding vector(384), -- Dimensión del modelo all-MiniLM-L6-v2
  metadatos JSONB,
  fecha_creacion TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_chunk_documento FOREIGN KEY (documento_id) REFERENCES documentos_legales(id) ON DELETE CASCADE,
  CONSTRAINT chk_chunk_index CHECK (chunk_index >= 0)
);

CREATE INDEX idx_chunk_documento ON documento_chunks(documento_id);

-- Índice HNSW para búsqueda vectorial rápida (cosine similarity)
CREATE INDEX ON documento_chunks USING hnsw (embedding vector_cosine_ops);

-- Índice IVFFlat alternativo (más rápido para conjuntos grandes)
-- CREATE INDEX ON documento_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

COMMENT ON TABLE documento_chunks IS 'Chunks de documentos con embeddings vectoriales para búsqueda semántica';
COMMENT ON COLUMN documento_chunks.embedding IS 'Vector de embedding (384 dimensiones) del chunk';

-- ============================================================
-- TABLA: Historial de Consultas RAG
-- ============================================================
CREATE TABLE IF NOT EXISTS rag_consultas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consulta_id UUID, -- Relacionado con tabla consultas
  texto_consulta TEXT NOT NULL,
  embedding_consulta vector(384),
  chunks_recuperados JSONB, -- Array de IDs de chunks encontrados
  scores FLOAT[], -- Scores de similitud
  respuesta_generada TEXT,
  cluster_asignado VARCHAR(10),
  tiempo_busqueda_ms INT,
  fecha TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_rag_consulta FOREIGN KEY (consulta_id) REFERENCES consultas(id) ON DELETE SET NULL
);

CREATE INDEX idx_rag_consultas_fecha ON rag_consultas(fecha DESC);
CREATE INDEX idx_rag_consultas_cluster ON rag_consultas(cluster_asignado);

COMMENT ON TABLE rag_consultas IS 'Historial de consultas RAG con chunks recuperados';

-- ============================================================
-- FUNCIÓN: Búsqueda semántica de chunks
-- ============================================================
CREATE OR REPLACE FUNCTION buscar_chunks_similares(
  query_embedding vector(384),
  limite INT DEFAULT 5,
  umbral_similitud FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  chunk_id UUID,
  documento_id UUID,
  contenido TEXT,
  similitud FLOAT,
  titulo_documento VARCHAR,
  categoria VARCHAR,
  cluster VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id AS chunk_id,
    dc.documento_id,
    dc.contenido,
    1 - (dc.embedding <=> query_embedding) AS similitud,
    dl.titulo AS titulo_documento,
    dl.categoria,
    dl.cluster_relacionado AS cluster
  FROM documento_chunks dc
  JOIN documentos_legales dl ON dc.documento_id = dl.id
  WHERE dl.activo = TRUE
    AND (1 - (dc.embedding <=> query_embedding)) >= umbral_similitud
  ORDER BY dc.embedding <=> query_embedding
  LIMIT limite;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION buscar_chunks_similares IS 'Búsqueda semántica usando similitud coseno';

-- ============================================================
-- FUNCIÓN: Búsqueda híbrida (vectorial + filtros)
-- ============================================================
CREATE OR REPLACE FUNCTION buscar_chunks_hibrida(
  query_embedding vector(384),
  p_cluster VARCHAR DEFAULT NULL,
  p_categoria VARCHAR DEFAULT NULL,
  limite INT DEFAULT 5,
  umbral_similitud FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  chunk_id UUID,
  documento_id UUID,
  contenido TEXT,
  similitud FLOAT,
  titulo_documento VARCHAR,
  categoria VARCHAR,
  cluster VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id AS chunk_id,
    dc.documento_id,
    dc.contenido,
    1 - (dc.embedding <=> query_embedding) AS similitud,
    dl.titulo AS titulo_documento,
    dl.categoria,
    dl.cluster_relacionado AS cluster
  FROM documento_chunks dc
  JOIN documentos_legales dl ON dc.documento_id = dl.id
  WHERE dl.activo = TRUE
    AND (p_cluster IS NULL OR dl.cluster_relacionado = p_cluster)
    AND (p_categoria IS NULL OR dl.categoria = p_categoria)
    AND (1 - (dc.embedding <=> query_embedding)) >= umbral_similitud
  ORDER BY dc.embedding <=> query_embedding
  LIMIT limite;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION buscar_chunks_hibrida IS 'Búsqueda híbrida con filtros por cluster y categoría';

-- ============================================================
-- DATOS INICIALES: Artículos Legales Base
-- ============================================================

-- Insertar documentos legales iniciales
INSERT INTO documentos_legales (id, titulo, contenido, fuente, categoria, cluster_relacionado) VALUES
  (
    uuid_generate_v4(),
    'Artículo 123 - Violación de Semáforo en Rojo',
    'Todo conductor que no respete la señal de semáforo en rojo incurrirá en infracción grave. La multa será de 15 SMLV (Salarios Mínimos Legales Vigentes). Esta infracción implica puntos en la licencia de conducción y puede llevar a su suspensión temporal. El conductor debe detenerse completamente antes de la línea de detención cuando la luz esté en rojo.',
    'Código Nacional de Tránsito - Ley 769',
    'Señalización',
    'C1'
  ),
  (
    uuid_generate_v4(),
    'Artículo 106 - Exceso de Velocidad',
    'Conducir a velocidad superior a la permitida constituye infracción según el grado de exceso. Las multas varían de 8 a 30 SMLV dependiendo de cuánto se exceda el límite. En zonas escolares el límite es 30 km/h. En vías urbanas 60 km/h. En autopistas 100-120 km/h. El exceso grave (más de 30 km/h) puede resultar en suspensión de licencia.',
    'Código Nacional de Tránsito',
    'Velocidad',
    'C1'
  ),
  (
    uuid_generate_v4(),
    'Artículo 138 - Estacionamiento Prohibido',
    'Estacionar en zonas prohibidas o que obstruyan la vía pública es infracción. Multa de 15 SMLV e inmovilización del vehículo. No se puede estacionar: en vías rápidas, cerca de hidrantes, en espacios para discapacitados sin permiso, en zonas de carga y descarga fuera del horario permitido, en andenes peatonales.',
    'Código Nacional de Tránsito',
    'Estacionamiento',
    'C2'
  ),
  (
    uuid_generate_v4(),
    'Artículo 152 - Conducción bajo Efectos del Alcohol',
    'Conducir en estado de embriaguez o bajo efectos de sustancias psicoactivas. Grado de alcoholemia: 0 para conductores novatos, 20mg/100ml para particulares, 0 para transporte público. Multa de 30 SMLV, suspensión de licencia de 1-3 años e inmovilización del vehículo. Puede haber responsabilidad penal si causa accidente.',
    'Código Nacional de Tránsito',
    'Alcoholemia',
    'C3'
  ),
  (
    uuid_generate_v4(),
    'Artículo 131 - Conducir sin Licencia',
    'Conducir un vehículo sin portar la licencia de conducción correspondiente o con licencia vencida. Multa de 40 SMLV e inmovilización del vehículo hasta presentar licencia válida. La licencia debe corresponder a la categoría del vehículo. Conducir sin haber obtenido nunca licencia es falta más grave.',
    'Código Nacional de Tránsito',
    'Documentación',
    'C4'
  ),
  (
    uuid_generate_v4(),
    'Artículo 109 - No Portar SOAT',
    'Circular sin el Seguro Obligatorio de Accidentes de Tránsito (SOAT) vigente. Multa de 30 SMLV e inmovilización del vehículo. El SOAT es obligatorio para todos los vehículos. Cubre lesiones y muerte de personas en accidentes de tránsito. Se debe renovar anualmente. Sin SOAT no se puede transitar legalmente.',
    'Código Nacional de Tránsito',
    'Documentación',
    'C4'
  ),
  (
    uuid_generate_v4(),
    'Artículo 110 - Obligaciones en caso de Accidente',
    'Normas aplicables en caso de accidente de tránsito. El conductor debe: detenerse inmediatamente, prestar auxilio a los heridos, dar aviso a las autoridades, no mover el vehículo hasta que lleguen las autoridades (salvo que obstruya gravemente el tránsito), intercambiar información con otros involucrados, esperar el parte policial.',
    'Código Nacional de Tránsito',
    'Accidentes',
    'C5'
  )
ON CONFLICT DO NOTHING;

-- ============================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================
