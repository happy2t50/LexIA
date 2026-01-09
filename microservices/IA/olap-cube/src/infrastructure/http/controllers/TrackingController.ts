// Controller - Professional Tracking

import { Request, Response } from 'express';
import { Pool } from 'pg';

export class TrackingController {
  constructor(private pool: Pool) {}

  /**
   * Registrar aceptación/contacto de profesionista
   */
  registrarAceptacion = async (req: Request, res: Response): Promise<void> => {
    try {
      const { usuarioId, profesionistaId, cluster, tipoAccion } = req.body;

      if (!usuarioId || !profesionistaId || !cluster) {
        res.status(400).json({ 
          error: 'usuarioId, profesionistaId y cluster son requeridos' 
        });
        return;
      }

      const query = `
        INSERT INTO professional_tracking 
        (usuario_id, profesionista_id, cluster, tipo, fecha, created_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING *
      `;

      const tipo = tipoAccion === 'contratacion' ? 'contratacion' : 'aceptacion';
      const result = await this.pool.query(query, [usuarioId, profesionistaId, cluster, tipo]);

      console.log(`✅ Aceptación registrada: Usuario ${usuarioId.substring(0, 8)} → Profesionista ${profesionistaId.substring(0, 8)}`);

      res.status(201).json({
        success: true,
        message: 'Aceptación registrada correctamente',
        data: result.rows[0]
      });
    } catch (error: any) {
      console.error('Error registrando aceptación:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Registrar rechazo de profesionista
   */
  registrarRechazo = async (req: Request, res: Response): Promise<void> => {
    try {
      const { usuarioId, profesionistaId, cluster, razon } = req.body;

      if (!usuarioId || !profesionistaId || !cluster) {
        res.status(400).json({ 
          error: 'usuarioId, profesionistaId y cluster son requeridos' 
        });
        return;
      }

      const query = `
        INSERT INTO professional_tracking 
        (usuario_id, profesionista_id, cluster, tipo, razon, fecha, created_at)
        VALUES ($1, $2, $3, 'rechazo', $4, NOW(), NOW())
        RETURNING *
      `;

      const result = await this.pool.query(query, [usuarioId, profesionistaId, cluster, razon]);

      // Contar total de rechazos
      const countQuery = `
        SELECT COUNT(*) as total
        FROM professional_tracking
        WHERE usuario_id = $1 
          AND profesionista_id = $2 
          AND tipo = 'rechazo'
      `;
      const countResult = await this.pool.query(countQuery, [usuarioId, profesionistaId]);
      const totalRechazos = parseInt(countResult.rows[0].total);

      console.log(`❌ Rechazo registrado: Usuario ${usuarioId.substring(0, 8)} → Profesionista ${profesionistaId.substring(0, 8)} (Total: ${totalRechazos})`);

      res.status(201).json({
        success: true,
        message: 'Rechazo registrado correctamente',
        data: result.rows[0],
        totalRechazos,
        bloqueado: totalRechazos >= 3
      });
    } catch (error: any) {
      console.error('Error registrando rechazo:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Obtener cantidad de rechazos de un profesionista por un usuario
   */
  obtenerRechazos = async (req: Request, res: Response): Promise<void> => {
    try {
      const { profesionistaId, usuarioId } = req.params;

      const query = `
        SELECT COUNT(*) as total
        FROM professional_tracking
        WHERE usuario_id = $1 
          AND profesionista_id = $2 
          AND tipo = 'rechazo'
      `;

      const result = await this.pool.query(query, [usuarioId, profesionistaId]);
      const totalRechazos = parseInt(result.rows[0].total);

      res.json({
        success: true,
        usuarioId,
        profesionistaId,
        totalRechazos,
        bloqueado: totalRechazos >= 3
      });
    } catch (error: any) {
      console.error('Error obteniendo rechazos:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Obtener lista de profesionistas bloqueados (3+ rechazos) para un usuario
   */
  obtenerBloqueados = async (req: Request, res: Response): Promise<void> => {
    try {
      const { usuarioId } = req.params;

      const query = `
        SELECT 
          profesionista_id,
          COUNT(*) as total_rechazos
        FROM professional_tracking
        WHERE usuario_id = $1 AND tipo = 'rechazo'
        GROUP BY profesionista_id
        HAVING COUNT(*) >= 3
      `;

      const result = await this.pool.query(query, [usuarioId]);
      const bloqueados = result.rows.map(row => row.profesionista_id);

      res.json({
        success: true,
        usuarioId,
        bloqueados,
        total: bloqueados.length
      });
    } catch (error: any) {
      console.error('Error obteniendo bloqueados:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Registrar calificación de profesionista (1-5 estrellas)
   */
  registrarRating = async (req: Request, res: Response): Promise<void> => {
    try {
      const { usuarioId, profesionistaId, rating, comentario } = req.body;

      if (!usuarioId || !profesionistaId || !rating) {
        res.status(400).json({ 
          error: 'usuarioId, profesionistaId y rating son requeridos' 
        });
        return;
      }

      if (rating < 1 || rating > 5) {
        res.status(400).json({ error: 'Rating debe ser entre 1 y 5' });
        return;
      }

      // Insertar o actualizar rating
      const query = `
        INSERT INTO professional_ratings 
        (usuario_id, profesionista_id, rating, comentario, fecha)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (usuario_id, profesionista_id)
        DO UPDATE SET 
          rating = EXCLUDED.rating,
          comentario = EXCLUDED.comentario,
          fecha = NOW()
        RETURNING *
      `;

      const result = await this.pool.query(query, [usuarioId, profesionistaId, rating, comentario]);

      // Actualizar promedio en tabla abogados
      const updateQuery = `
        UPDATE abogados
        SET 
          rating_promedio = (
            SELECT AVG(rating)::numeric(3,2)
            FROM professional_ratings
            WHERE profesionista_id = $1
          ),
          total_calificaciones = (
            SELECT COUNT(*)
            FROM professional_ratings
            WHERE profesionista_id = $1
          )
        WHERE usuario_id = $1
      `;
      await this.pool.query(updateQuery, [profesionistaId]);

      console.log(`⭐ Rating registrado: ${rating}/5 para profesionista ${profesionistaId.substring(0, 8)}`);

      res.status(201).json({
        success: true,
        message: 'Calificación registrada correctamente',
        data: result.rows[0]
      });
    } catch (error: any) {
      console.error('Error registrando rating:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Obtener rating promedio y distribución de un profesionista
   */
  obtenerRating = async (req: Request, res: Response): Promise<void> => {
    try {
      const { profesionistaId } = req.params;

      const query = `
        SELECT 
          AVG(rating)::numeric(3,2) as promedio,
          COUNT(*) as total,
          COUNT(CASE WHEN rating = 5 THEN 1 END) as cinco_estrellas,
          COUNT(CASE WHEN rating = 4 THEN 1 END) as cuatro_estrellas,
          COUNT(CASE WHEN rating = 3 THEN 1 END) as tres_estrellas,
          COUNT(CASE WHEN rating = 2 THEN 1 END) as dos_estrellas,
          COUNT(CASE WHEN rating = 1 THEN 1 END) as una_estrella
        FROM professional_ratings
        WHERE profesionista_id = $1
      `;

      const result = await this.pool.query(query, [profesionistaId]);
      const data = result.rows[0];

      res.json({
        success: true,
        profesionistaId,
        promedio: parseFloat(data.promedio) || 0,
        total: parseInt(data.total) || 0,
        distribucion: {
          5: parseInt(data.cinco_estrellas) || 0,
          4: parseInt(data.cuatro_estrellas) || 0,
          3: parseInt(data.tres_estrellas) || 0,
          2: parseInt(data.dos_estrellas) || 0,
          1: parseInt(data.una_estrella) || 0
        }
      });
    } catch (error: any) {
      console.error('Error obteniendo rating:', error);
      res.status(500).json({ error: error.message });
    }
  };
}
