-- ============================================================
-- SISTEMA DE BASE DE DATOS LEXIA 2.0
-- Migración: Creación de todas las tablas
-- ============================================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLA DE ROLES
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) UNIQUE NOT NULL,
  descripcion VARCHAR(255),
  CONSTRAINT chk_rol_nombre CHECK (nombre IN ('Ciudadano', 'Abogado', 'Anunciante', 'Admin'))
);

COMMENT ON TABLE roles IS 'Roles de usuarios en el sistema';
COMMENT ON COLUMN roles.nombre IS 'Ciudadano, Abogado, Anunciante, Admin';

-- ============================================================
-- USUARIOS (BASE)
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rol_id INT NOT NULL,
  nombre VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  telefono VARCHAR(50),
  fecha_registro TIMESTAMP DEFAULT NOW(),
  ultimo_acceso TIMESTAMP,
  foto_perfil VARCHAR(500),
  activo BOOLEAN DEFAULT TRUE,

  CONSTRAINT fk_usuario_rol FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE RESTRICT
);

CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol ON usuarios(rol_id);

COMMENT ON TABLE usuarios IS 'Tabla principal de usuarios del sistema';
COMMENT ON COLUMN usuarios.foto_perfil IS 'Solo obligatorio para abogados y anunciantes';

-- ============================================================
-- PERFIL DE ABOGADOS
-- ============================================================
CREATE TABLE IF NOT EXISTS abogados (
  usuario_id UUID PRIMARY KEY,
  cedula_profesional VARCHAR(100) UNIQUE NOT NULL,
  documento_validacion VARCHAR(500),
  despacho_direccion VARCHAR(500),
  descripcion TEXT,
  experiencia_anios INT,
  foto_profesional VARCHAR(500) NOT NULL,
  verificado BOOLEAN DEFAULT FALSE,
  rating_promedio FLOAT DEFAULT 0,
  total_calificaciones INT DEFAULT 0,
  especialidades TEXT[], -- Array de especialidades
  ciudad VARCHAR(100),
  disponible BOOLEAN DEFAULT TRUE,

  CONSTRAINT fk_abogado_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT chk_experiencia CHECK (experiencia_anios >= 0),
  CONSTRAINT chk_rating CHECK (rating_promedio >= 0 AND rating_promedio <= 5)
);

CREATE INDEX idx_abogados_verificado ON abogados(verificado);
CREATE INDEX idx_abogados_ciudad ON abogados(ciudad);
CREATE INDEX idx_abogados_especialidades ON abogados USING GIN(especialidades);

COMMENT ON TABLE abogados IS 'Perfil extendido de usuarios con rol de abogado';
COMMENT ON COLUMN abogados.documento_validacion IS 'URL del documento de validación profesional';

-- ============================================================
-- PERFIL DE ANUNCIANTES (NEGOCIOS)
-- ============================================================
CREATE TABLE IF NOT EXISTS negocios (
  usuario_id UUID PRIMARY KEY,
  nombre_comercial VARCHAR(255),
  categoria_servicio VARCHAR(100),
  descripcion TEXT,
  ubicacion_lat FLOAT,
  ubicacion_lng FLOAT,
  direccion VARCHAR(500),
  logo_url VARCHAR(500) NOT NULL,
  telefono_comercial VARCHAR(50),
  horario_apertura VARCHAR(255),
  disponible_24h BOOLEAN DEFAULT FALSE,
  rating_promedio FLOAT DEFAULT 0,

  CONSTRAINT fk_negocio_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT chk_categoria_servicio CHECK (categoria_servicio IN ('Grua', 'Taller', 'Seguro', 'Ajustador', 'Otro')),
  CONSTRAINT chk_ubicacion_lat CHECK (ubicacion_lat >= -90 AND ubicacion_lat <= 90),
  CONSTRAINT chk_ubicacion_lng CHECK (ubicacion_lng >= -180 AND ubicacion_lng <= 180)
);

CREATE INDEX idx_negocios_categoria ON negocios(categoria_servicio);
CREATE INDEX idx_negocios_ubicacion ON negocios(ubicacion_lat, ubicacion_lng);

COMMENT ON TABLE negocios IS 'Perfil de negocios anunciantes (grúas, talleres, seguros)';
COMMENT ON COLUMN negocios.categoria_servicio IS 'Grua, Taller, Seguro, Ajustador, Otro';

-- ============================================================
-- CONTENIDO LEGAL (ARTÍCULOS Y MULTAS)
-- ============================================================
CREATE TABLE IF NOT EXISTS contenido_legal (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo VARCHAR(50) NOT NULL,
  titulo VARCHAR(500),
  texto_original TEXT NOT NULL,
  texto_simplificado TEXT,
  numero_articulo INT,
  fecha_publicacion DATE,
  fecha_actualizacion DATE DEFAULT CURRENT_DATE,
  fuente VARCHAR(255),
  activo BOOLEAN DEFAULT TRUE,

  CONSTRAINT chk_tipo_contenido CHECK (tipo IN ('Articulo', 'Multa', 'Reglamento'))
);

CREATE INDEX idx_contenido_tipo ON contenido_legal(tipo);
CREATE INDEX idx_contenido_numero ON contenido_legal(numero_articulo);

COMMENT ON TABLE contenido_legal IS 'Artículos legales, multas y reglamentos de tránsito';
COMMENT ON COLUMN contenido_legal.tipo IS 'Articulo, Multa, Reglamento';

-- ============================================================
-- MULTAS
-- ============================================================
CREATE TABLE IF NOT EXISTS multas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contenido_id UUID NOT NULL,
  descripcion TEXT,
  monto FLOAT,
  tipo_incidente VARCHAR(100),
  cluster_ml VARCHAR(10), -- C1, C2, C3, C4, C5

  CONSTRAINT fk_multa_contenido FOREIGN KEY (contenido_id) REFERENCES contenido_legal(id) ON DELETE CASCADE,
  CONSTRAINT chk_monto CHECK (monto >= 0),
  CONSTRAINT chk_cluster CHECK (cluster_ml IN ('C1', 'C2', 'C3', 'C4', 'C5'))
);

CREATE INDEX idx_multas_tipo ON multas(tipo_incidente);
CREATE INDEX idx_multas_cluster ON multas(cluster_ml);

COMMENT ON TABLE multas IS 'Detalles de multas de tránsito';

-- ============================================================
-- CATEGORÍAS
-- ============================================================
CREATE TABLE IF NOT EXISTS categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  icono VARCHAR(100),
  color VARCHAR(20)
);

COMMENT ON TABLE categorias IS 'Categorías para consultas y publicaciones del foro';

-- ============================================================
-- CONSULTAS DEL CIUDADANO (OLAP)
-- ============================================================
CREATE TABLE IF NOT EXISTS consultas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL,
  texto_original TEXT NOT NULL,
  texto_normalizado TEXT,
  respuesta_llm TEXT,
  categoria_id UUID,
  fecha_consulta TIMESTAMP DEFAULT NOW(),

  -- Dimensiones OLAP
  ciudad VARCHAR(100),
  barrio VARCHAR(100),
  ubicacion_lat FLOAT,
  ubicacion_lng FLOAT,
  tipo_usuario VARCHAR(50),

  -- ML/NLP
  cluster_asignado VARCHAR(10), -- C1-C5
  confianza_cluster FLOAT,
  palabras_clave TEXT[],
  entidades_extraidas JSONB,
  sentimiento VARCHAR(20), -- positivo, negativo, neutral
  gravedad_estimada VARCHAR(20), -- baja, media, alta

  -- Estado
  estado VARCHAR(50) DEFAULT 'pendiente', -- pendiente, en_proceso, resuelto

  CONSTRAINT fk_consulta_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_consulta_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
  CONSTRAINT chk_cluster CHECK (cluster_asignado IN ('C1', 'C2', 'C3', 'C4', 'C5')),
  CONSTRAINT chk_gravedad CHECK (gravedad_estimada IN ('baja', 'media', 'alta')),
  CONSTRAINT chk_estado CHECK (estado IN ('pendiente', 'en_proceso', 'resuelto'))
);

CREATE INDEX idx_consultas_usuario ON consultas(usuario_id);
CREATE INDEX idx_consultas_fecha ON consultas(fecha_consulta);
CREATE INDEX idx_consultas_cluster ON consultas(cluster_asignado);
CREATE INDEX idx_consultas_ciudad ON consultas(ciudad);
CREATE INDEX idx_consultas_estado ON consultas(estado);

COMMENT ON TABLE consultas IS 'Consultas de usuarios - Base del cubo OLAP para ML';

-- ============================================================
-- RECOMENDACIONES DE ABOGADOS (ML)
-- ============================================================
CREATE TABLE IF NOT EXISTS recomendaciones_abogados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consulta_id UUID NOT NULL,
  abogado_id UUID NOT NULL,
  score FLOAT,
  razon_recomendacion TEXT,
  fecha_recomendacion TIMESTAMP DEFAULT NOW(),
  aceptada BOOLEAN,

  CONSTRAINT fk_rec_abog_consulta FOREIGN KEY (consulta_id) REFERENCES consultas(id) ON DELETE CASCADE,
  CONSTRAINT fk_rec_abog_abogado FOREIGN KEY (abogado_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT chk_score CHECK (score >= 0 AND score <= 1)
);

CREATE INDEX idx_rec_abog_consulta ON recomendaciones_abogados(consulta_id);
CREATE INDEX idx_rec_abog_score ON recomendaciones_abogados(score DESC);

COMMENT ON TABLE recomendaciones_abogados IS 'Recomendaciones de abogados generadas por ML';

-- ============================================================
-- RECOMENDACIONES DE NEGOCIOS (ML)
-- ============================================================
CREATE TABLE IF NOT EXISTS recomendaciones_negocios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consulta_id UUID NOT NULL,
  negocio_id UUID NOT NULL,
  score FLOAT,
  razon_recomendacion TEXT,
  fecha_recomendacion TIMESTAMP DEFAULT NOW(),
  contactado BOOLEAN DEFAULT FALSE,

  CONSTRAINT fk_rec_neg_consulta FOREIGN KEY (consulta_id) REFERENCES consultas(id) ON DELETE CASCADE,
  CONSTRAINT fk_rec_neg_negocio FOREIGN KEY (negocio_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT chk_score_neg CHECK (score >= 0 AND score <= 1)
);

CREATE INDEX idx_rec_neg_consulta ON recomendaciones_negocios(consulta_id);
CREATE INDEX idx_rec_neg_score ON recomendaciones_negocios(score DESC);

COMMENT ON TABLE recomendaciones_negocios IS 'Recomendaciones de negocios generadas por ML';

-- ============================================================
-- FORO - PUBLICACIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS foro_publicaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL,
  titulo VARCHAR(500),
  contenido TEXT,
  categoria_id UUID,
  fecha TIMESTAMP DEFAULT NOW(),
  vistas INT DEFAULT 0,
  likes INT DEFAULT 0,

  CONSTRAINT fk_foro_pub_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_foro_pub_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
);

CREATE INDEX idx_foro_pub_usuario ON foro_publicaciones(usuario_id);
CREATE INDEX idx_foro_pub_fecha ON foro_publicaciones(fecha DESC);
CREATE INDEX idx_foro_pub_categoria ON foro_publicaciones(categoria_id);

COMMENT ON TABLE foro_publicaciones IS 'Publicaciones del foro comunitario';

-- ============================================================
-- FORO - COMENTARIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS foro_comentarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  publicacion_id UUID NOT NULL,
  usuario_id UUID NOT NULL,
  contenido TEXT,
  fecha TIMESTAMP DEFAULT NOW(),
  likes INT DEFAULT 0,

  CONSTRAINT fk_foro_com_publicacion FOREIGN KEY (publicacion_id) REFERENCES foro_publicaciones(id) ON DELETE CASCADE,
  CONSTRAINT fk_foro_com_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX idx_foro_com_publicacion ON foro_comentarios(publicacion_id);
CREATE INDEX idx_foro_com_usuario ON foro_comentarios(usuario_id);
CREATE INDEX idx_foro_com_fecha ON foro_comentarios(fecha DESC);

COMMENT ON TABLE foro_comentarios IS 'Comentarios en publicaciones del foro';

-- ============================================================
-- MENSAJES PRIVADOS
-- ============================================================
CREATE TABLE IF NOT EXISTS mensajes_privados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ciudadano_id UUID NOT NULL,
  abogado_id UUID NOT NULL,
  remitente_id UUID NOT NULL, -- quién envió el mensaje
  contenido TEXT,
  fecha TIMESTAMP DEFAULT NOW(),
  leido BOOLEAN DEFAULT FALSE,

  CONSTRAINT fk_mensaje_ciudadano FOREIGN KEY (ciudadano_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_mensaje_abogado FOREIGN KEY (abogado_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_mensaje_remitente FOREIGN KEY (remitente_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX idx_mensajes_ciudadano ON mensajes_privados(ciudadano_id);
CREATE INDEX idx_mensajes_abogado ON mensajes_privados(abogado_id);
CREATE INDEX idx_mensajes_fecha ON mensajes_privados(fecha DESC);
CREATE INDEX idx_mensajes_leido ON mensajes_privados(leido);

COMMENT ON TABLE mensajes_privados IS 'Sistema de mensajería entre ciudadanos y abogados';

-- ============================================================
-- SUSCRIPCIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS suscripciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  plan VARCHAR(50) NOT NULL,
  fecha_inicio TIMESTAMP DEFAULT NOW(),
  fecha_fin TIMESTAMP,
  activa BOOLEAN DEFAULT TRUE,
  monto_pagado FLOAT,

  CONSTRAINT fk_suscripcion_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT chk_tipo_suscripcion CHECK (tipo IN ('abogado', 'anunciante')),
  CONSTRAINT chk_plan CHECK (plan IN ('mensual', 'anual'))
);

CREATE INDEX idx_suscripciones_usuario ON suscripciones(usuario_id);
CREATE INDEX idx_suscripciones_activa ON suscripciones(activa);

COMMENT ON TABLE suscripciones IS 'Suscripciones de pago para abogados y anunciantes';

-- ============================================================
-- DATOS INICIALES
-- ============================================================

-- Insertar roles por defecto
INSERT INTO roles (nombre, descripcion) VALUES
  ('Ciudadano', 'Usuario regular del sistema'),
  ('Abogado', 'Profesional legal verificado'),
  ('Anunciante', 'Negocio anunciante (grúa, taller, etc.)'),
  ('Admin', 'Administrador del sistema')
ON CONFLICT (nombre) DO NOTHING;

-- Insertar categorías por defecto
INSERT INTO categorias (id, nombre, descripcion) VALUES
  (uuid_generate_v4(), 'Exceso de velocidad', 'Infracciones por velocidad y semáforos'),
  (uuid_generate_v4(), 'Estacionamiento', 'Problemas de estacionamiento'),
  (uuid_generate_v4(), 'Alcoholemia', 'Controles de alcohol'),
  (uuid_generate_v4(), 'Documentación', 'Problemas con documentos del vehículo'),
  (uuid_generate_v4(), 'Accidentes', 'Accidentes de tránsito'),
  (uuid_generate_v4(), 'General', 'Consultas generales')
ON CONFLICT DO NOTHING;

-- ============================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================
