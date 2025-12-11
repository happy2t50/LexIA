-- Migration: Add professional_tracking table for accept/reject tracking
-- Purpose: Track user acceptance/rejection of professional recommendations
-- Rule: Block professionals after 3+ rejections from same user

CREATE TABLE IF NOT EXISTS professional_tracking (
  id SERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  profesionista_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  cluster VARCHAR(10) NOT NULL, -- C1, C2, C3, C4, C5, C6
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('aceptacion', 'contratacion', 'rechazo')),
  razon TEXT, -- Razón del rechazo (opcional)
  fecha TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Indexes para mejorar performance
  INDEX idx_usuario_profesionista (usuario_id, profesionista_id),
  INDEX idx_tipo_fecha (tipo, fecha),
  INDEX idx_cluster (cluster)
);

-- Comentarios
COMMENT ON TABLE professional_tracking IS 'Tracking de aceptaciones/rechazos de profesionistas';
COMMENT ON COLUMN professional_tracking.tipo IS 'aceptacion: usuario contactó, contratacion: usuario contrató, rechazo: usuario rechazó';
COMMENT ON COLUMN professional_tracking.razon IS 'Razón del rechazo: no_disponible, precio_alto, poca_experiencia, otro';

-- Vista para obtener profesionistas bloqueados (3+ rechazos)
CREATE OR REPLACE VIEW profesionistas_bloqueados AS
SELECT 
  usuario_id,
  profesionista_id,
  COUNT(*) as total_rechazos,
  MAX(fecha) as ultimo_rechazo
FROM professional_tracking
WHERE tipo = 'rechazo'
GROUP BY usuario_id, profesionista_id
HAVING COUNT(*) >= 3;

COMMENT ON VIEW profesionistas_bloqueados IS 'Profesionistas con 3+ rechazos de cada usuario (bloqueados)';
