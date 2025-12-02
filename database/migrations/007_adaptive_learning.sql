-- ===========================================
-- SISTEMA DE APRENDIZAJE ADAPTATIVO - LexIA
-- ===========================================
-- Este sistema permite que la IA aprenda de:
-- 1. Patrones de preguntas exitosas
-- 2. Correcciones del usuario
-- 3. Feedback (positivo/negativo)
-- ===========================================

-- Tabla: Patrones aprendidos
-- Guarda mensajes de usuario y qué intención se detectó
CREATE TABLE IF NOT EXISTS patrones_aprendidos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patron_normalizado TEXT UNIQUE NOT NULL,  -- Mensaje normalizado (sin acentos, minúsculas)
    patron_original TEXT NOT NULL,            -- Mensaje original del usuario
    intencion_detectada VARCHAR(100),         -- Tema/cluster detectado
    respuesta_exitosa BOOLEAN DEFAULT true,   -- Si el usuario quedó satisfecho
    palabras_clave TEXT[] DEFAULT '{}',       -- Palabras clave extraídas
    frecuencia INTEGER DEFAULT 1,             -- Cuántas veces se ha visto este patrón
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: Correcciones aprendidas
-- Cuando el usuario dice "no, yo quería X"
CREATE TABLE IF NOT EXISTS correcciones_aprendidas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mensaje_original TEXT UNIQUE NOT NULL,
    intencion_incorrecta VARCHAR(100),        -- Lo que el sistema detectó mal
    correccion_usuario TEXT,                  -- Lo que el usuario aclaró
    intencion_correcta VARCHAR(100),          -- La intención real
    palabras_clave TEXT[] DEFAULT '{}',
    frecuencia INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: Sinónimos aprendidos
-- Para entender que "estacioné" = "aparqué" = "dejé el carro"
CREATE TABLE IF NOT EXISTS sinonimos_aprendidos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    palabra_base VARCHAR(100) NOT NULL,       -- Palabra estándar
    sinonimo VARCHAR(100) NOT NULL,           -- Sinónimo aprendido
    contexto VARCHAR(100),                    -- En qué contexto (multa, accidente, etc)
    frecuencia INTEGER DEFAULT 1,
    UNIQUE(palabra_base, sinonimo)
);

-- Tabla: Historial de interacciones
-- Para análisis y mejora continua
CREATE TABLE IF NOT EXISTS historial_interacciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID,
    usuario_id UUID,
    mensaje_usuario TEXT,
    respuesta_sistema TEXT,
    intencion_detectada VARCHAR(100),
    tipo_feedback VARCHAR(20),                -- positivo, negativo, correccion, null
    tiempo_respuesta_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: Métricas de aprendizaje
-- Resumen diario de qué tan bien está aprendiendo el sistema
CREATE TABLE IF NOT EXISTS metricas_aprendizaje (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fecha DATE DEFAULT CURRENT_DATE,
    total_interacciones INTEGER DEFAULT 0,
    feedback_positivo INTEGER DEFAULT 0,
    feedback_negativo INTEGER DEFAULT 0,
    correcciones_recibidas INTEGER DEFAULT 0,
    patrones_nuevos INTEGER DEFAULT 0,
    precision_estimada NUMERIC(5,2),          -- % de respuestas exitosas
    UNIQUE(fecha)
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_patrones_intencion ON patrones_aprendidos(intencion_detectada);
CREATE INDEX IF NOT EXISTS idx_patrones_frecuencia ON patrones_aprendidos(frecuencia DESC);
CREATE INDEX IF NOT EXISTS idx_patrones_exitosos ON patrones_aprendidos(respuesta_exitosa) WHERE respuesta_exitosa = true;
CREATE INDEX IF NOT EXISTS idx_correcciones_intencion ON correcciones_aprendidas(intencion_correcta);
CREATE INDEX IF NOT EXISTS idx_historial_session ON historial_interacciones(session_id);
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial_interacciones(created_at);

-- Función: Actualizar métricas diarias
CREATE OR REPLACE FUNCTION actualizar_metricas_aprendizaje()
RETURNS void AS $$
DECLARE
    _total INT;
    _positivo INT;
    _negativo INT;
    _correcciones INT;
    _patrones_nuevos INT;
    _precision NUMERIC;
BEGIN
    -- Contar interacciones de hoy
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE tipo_feedback = 'positivo'),
        COUNT(*) FILTER (WHERE tipo_feedback = 'negativo'),
        COUNT(*) FILTER (WHERE tipo_feedback = 'correccion')
    INTO _total, _positivo, _negativo, _correcciones
    FROM historial_interacciones
    WHERE DATE(created_at) = CURRENT_DATE;
    
    -- Contar patrones nuevos de hoy
    SELECT COUNT(*) INTO _patrones_nuevos
    FROM patrones_aprendidos
    WHERE DATE(created_at) = CURRENT_DATE;
    
    -- Calcular precisión (feedback positivo / total con feedback)
    IF (_positivo + _negativo) > 0 THEN
        _precision := (_positivo::NUMERIC / (_positivo + _negativo)::NUMERIC) * 100;
    ELSE
        _precision := NULL;
    END IF;
    
    -- Insertar o actualizar métricas del día
    INSERT INTO metricas_aprendizaje (
        fecha, total_interacciones, feedback_positivo, 
        feedback_negativo, correcciones_recibidas, 
        patrones_nuevos, precision_estimada
    )
    VALUES (
        CURRENT_DATE, _total, _positivo, 
        _negativo, _correcciones, 
        _patrones_nuevos, _precision
    )
    ON CONFLICT (fecha) DO UPDATE SET
        total_interacciones = EXCLUDED.total_interacciones,
        feedback_positivo = EXCLUDED.feedback_positivo,
        feedback_negativo = EXCLUDED.feedback_negativo,
        correcciones_recibidas = EXCLUDED.correcciones_recibidas,
        patrones_nuevos = EXCLUDED.patrones_nuevos,
        precision_estimada = EXCLUDED.precision_estimada;
END;
$$ LANGUAGE plpgsql;

-- Insertar algunos patrones iniciales comunes
INSERT INTO patrones_aprendidos (patron_normalizado, patron_original, intencion_detectada, respuesta_exitosa, palabras_clave, frecuencia)
VALUES 
    ('me multaron injustamente', 'Me multaron injustamente', 'impugnacion', true, ARRAY['multa', 'injusto', 'impugnar'], 10),
    ('como impugno una multa', 'Como impugno una multa', 'impugnacion', true, ARRAY['impugnar', 'multa'], 8),
    ('me pase un semaforo', 'Me pasé un semáforo', 'semaforo', true, ARRAY['semaforo', 'pase', 'luz roja'], 15),
    ('tuve un accidente', 'Tuve un accidente', 'accidente', true, ARRAY['accidente', 'choque'], 12),
    ('se llevaron mi carro', 'Se llevaron mi carro', 'estacionamiento', true, ARRAY['grua', 'corralon', 'llevaron'], 10),
    ('la señalizacion estaba mal', 'La señalización estaba mal', 'impugnacion', true, ARRAY['señalizacion', 'mal', 'confusa'], 5),
    ('la acera amarilla permite estacionar', 'La acera amarilla permite estacionar', 'impugnacion', true, ARRAY['acera', 'amarilla', 'estacionar', 'permite'], 3),
    ('me chocaron por atras', 'Me chocaron por atrás', 'accidente', true, ARRAY['choque', 'atras', 'alcance'], 7),
    ('que hago si me detiene transito', 'Qué hago si me detiene tránsito', 'derechos', true, ARRAY['transito', 'detener', 'derechos'], 6),
    ('cuanto cuesta la multa', 'Cuánto cuesta la multa', 'multa', true, ARRAY['multa', 'costo', 'precio'], 9)
ON CONFLICT (patron_normalizado) DO NOTHING;

-- Insertar sinónimos comunes
INSERT INTO sinonimos_aprendidos (palabra_base, sinonimo, contexto, frecuencia)
VALUES 
    ('multa', 'infraccion', 'general', 10),
    ('multa', 'boleta', 'general', 8),
    ('multa', 'sancion', 'general', 5),
    ('estacionar', 'aparcar', 'estacionamiento', 7),
    ('estacionar', 'parquear', 'estacionamiento', 6),
    ('estacionar', 'dejar el carro', 'estacionamiento', 4),
    ('grua', 'remolque', 'estacionamiento', 5),
    ('semaforo', 'alto', 'semaforo', 8),
    ('semaforo', 'luz roja', 'semaforo', 10),
    ('accidente', 'choque', 'accidente', 12),
    ('accidente', 'colision', 'accidente', 6),
    ('impugnar', 'apelar', 'impugnacion', 7),
    ('impugnar', 'reclamar', 'impugnacion', 6),
    ('impugnar', 'inconformarse', 'impugnacion', 4)
ON CONFLICT (palabra_base, sinonimo) DO NOTHING;

COMMENT ON TABLE patrones_aprendidos IS 'Patrones de mensajes de usuario que el sistema ha aprendido a clasificar correctamente';
COMMENT ON TABLE correcciones_aprendidas IS 'Correcciones explícitas del usuario cuando el sistema no entendió correctamente';
COMMENT ON TABLE historial_interacciones IS 'Historial completo de interacciones para análisis y mejora continua';
COMMENT ON TABLE metricas_aprendizaje IS 'Métricas diarias del rendimiento del sistema de aprendizaje';
