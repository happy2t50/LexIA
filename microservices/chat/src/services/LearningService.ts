// Servicio de Aprendizaje Automático
import { Pool } from 'pg';
import { Feedback } from '../types';

export class LearningService {
  constructor(private pool: Pool) {}

  /**
   * Registrar feedback de usuario
   */
  async recordFeedback(
    usuarioId: string,
    tipo: Feedback['tipo'],
    data: {
      abogadoId?: string;
      consultaId?: string;
      conversacionId?: string;
      valoracion?: number;
      comentario?: string;
      cluster?: string;
    }
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO interacciones_aprendizaje
       (tipo, usuario_id, abogado_id, consulta_id, conversacion_id, valoracion, feedback, cluster)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        tipo,
        usuarioId,
        data.abogadoId || null,
        data.consultaId || null,
        data.conversacionId || null,
        data.valoracion || null,
        data.comentario || null,
        data.cluster || null
      ]
    );

    // Si es valoración de abogado, actualizar score
    if (tipo === 'valoracion_abogado' && data.abogadoId && data.valoracion && data.cluster) {
      await this.updateLawyerScore(data.abogadoId, data.cluster, data.valoracion);
    }
  }

  /**
   * Actualizar score de abogado dinámicamente
   */
  private async updateLawyerScore(
    abogadoId: string,
    cluster: string,
    valoracion: number
  ): Promise<void> {
    await this.pool.query(
      `SELECT actualizar_score_abogado($1, $2, $3)`,
      [abogadoId, cluster, valoracion]
    );

    // También actualizar rating promedio global del abogado
    await this.pool.query(
      `UPDATE usuarios
       SET rating_promedio = (
         SELECT AVG(valoracion)::numeric(3,2)
         FROM interacciones_aprendizaje
         WHERE abogado_id = $1 AND valoracion IS NOT NULL
       )
       WHERE id = $1`,
      [abogadoId]
    );

    await this.pool.query(
      `UPDATE abogados
       SET rating_promedio = (
         SELECT AVG(valoracion)::numeric(3,2)
         FROM interacciones_aprendizaje
         WHERE abogado_id = $1 AND valoracion IS NOT NULL
       ),
       total_calificaciones = (
         SELECT COUNT(*)
         FROM interacciones_aprendizaje
         WHERE abogado_id = $1 AND valoracion IS NOT NULL
       )
       WHERE usuario_id = $1`,
      [abogadoId]
    );
  }

  /**
   * Obtener métricas de aprendizaje
   */
  async getLearningMetrics(cluster?: string): Promise<any> {
    let query = `
      SELECT
        tipo,
        COUNT(*) as total,
        AVG(CASE WHEN valoracion IS NOT NULL THEN valoracion END) as valoracion_promedio
      FROM interacciones_aprendizaje
    `;

    const params: any[] = [];

    if (cluster) {
      query += ` WHERE cluster = $1`;
      params.push(cluster);
    }

    query += ` GROUP BY tipo`;

    const result = await this.pool.query(query, params);

    interface LearningMetric {
      tipo: string;
      total: string;
      valoracion_promedio: number | null;
    }

    interface LearningMetricsResult {
      metricas: LearningMetric[];
      total: number;
    }

        return {
          metricas: result.rows,
          total: result.rows.reduce((sum: number, r: LearningMetric) => sum + parseInt(r.total), 0)
        } as LearningMetricsResult;
  }

  /**
   * Obtener abogados mejor valorados por cluster
   */
  async getTopLawyers(cluster: string, limit: number = 10): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT
        u.id,
        u.nombre,
        AVG(ia.valoracion) as rating_promedio,
        COUNT(*) as total_valoraciones,
        rs.score_ajustado,
        rs.total_casos_exitosos
       FROM usuarios u
       JOIN interacciones_aprendizaje ia ON u.id = ia.abogado_id
       LEFT JOIN recommendation_scores rs ON (u.id = rs.abogado_id AND rs.cluster = $1)
       WHERE ia.cluster = $1 AND ia.valoracion IS NOT NULL
       GROUP BY u.id, u.nombre, rs.score_ajustado, rs.total_casos_exitosos
       HAVING AVG(ia.valoracion) >= 4.0
       ORDER BY AVG(ia.valoracion) DESC, COUNT(*) DESC
       LIMIT $2`,
      [cluster, limit]
    );

    return result.rows;
  }

  /**
   * Analizar tendencias de consultas
   */
  async analyzeTrends(dias: number = 30): Promise<any> {
    const result = await this.pool.query(
      `SELECT
        DATE(fecha) as dia,
        cluster,
        COUNT(*) as total_consultas
       FROM conversaciones
       WHERE fecha >= NOW() - INTERVAL '${dias} days'
         AND cluster_detectado IS NOT NULL
       GROUP BY DATE(fecha), cluster
       ORDER BY dia DESC, total_consultas DESC`,
      []
    );

    return result.rows;
  }
}
