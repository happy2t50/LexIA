// Servicio de Recomendación de Abogados con ML
import { Pool } from 'pg';
import { LawyerRecommendation } from '../types';

export class LawyerRecommendationService {
  constructor(private pool: Pool) {}

  /**
   * Recomendar abogados basado en cluster
   */
  async recommendLawyers(
    cluster: string,
    usuarioId: string,
    ciudad?: string,
    limit: number = 10
  ): Promise<LawyerRecommendation[]> {
    // Mapeo de clusters a especialidades
    const clusterToEspecialidad: Record<string, string> = {
      C1: 'Infracciones de Tránsito',
      C2: 'Estacionamiento',
      C3: 'Alcoholemia',
      C4: 'Documentación',
      C5: 'Accidentes de Tránsito'
    };

    const especialidad = clusterToEspecialidad[cluster] || 'Tránsito';

    // Consulta con scoring personalizado
    const query = `
      SELECT
        u.id,
        u.nombre,
        u.email,
        a.especialidades,
        a.ciudad,
        a.experiencia_anios,
        a.descripcion,
        a.despacho_direccion,
        u.rating_promedio as rating,
        COALESCE(rs.score_ajustado, 0.5) as score_personalizado,
        COALESCE(rs.total_casos_exitosos, 0) as casos_ganados
      FROM usuarios u
      JOIN abogados a ON u.id = a.usuario_id
      LEFT JOIN recommendation_scores rs ON (
        u.id = rs.abogado_id AND rs.cluster = $1
      )
      WHERE
        u.rol_id = (SELECT id FROM roles WHERE nombre = 'Abogado')
        AND a.verificado = true
        AND a.disponible = true
        AND $2 = ANY(a.especialidades)
        ${ciudad ? 'AND a.ciudad = $3' : ''}
      ORDER BY
        score_personalizado DESC,
        u.rating_promedio DESC,
        a.experiencia_anios DESC
      LIMIT $${ciudad ? '4' : '3'}
    `;

    const params = ciudad
      ? [cluster, especialidad, ciudad, limit]
      : [cluster, especialidad, limit];

    const result = await this.pool.query(query, params);

    return result.rows.map(row => ({
      id: row.id,
      nombre: row.nombre,
      especialidades: row.especialidades,
      rating: parseFloat(row.rating) || 0,
      experiencia: row.experiencia_anios || 0,
      casosGanados: row.casos_ganados || 0,
      ciudad: row.ciudad || 'No especificada',
      scorePersonalizado: parseFloat(row.score_personalizado),
      razonRecomendacion: this.generateRecommendationReason(
        row,
        cluster,
        especialidad
      )
    }));
  }

  /**
   * Generar razón de recomendación personalizada
   */
  private generateRecommendationReason(
    abogado: any,
    cluster: string,
    especialidad: string
  ): string {
    const razones: string[] = [];

    if (abogado.score_personalizado > 0.7) {
      razones.push('Alta tasa de éxito en casos similares');
    }

    if (abogado.rating_promedio >= 4.5) {
      razones.push('Excelentes valoraciones de clientes');
    }

    if (abogado.experiencia_anios >= 10) {
      razones.push(`${abogado.experiencia_anios} años de experiencia`);
    }

    if (abogado.casos_ganados > 50) {
      razones.push(`${abogado.casos_ganados} casos exitosos`);
    }

    if (abogado.especialidades.includes(especialidad)) {
      razones.push(`Especialista en ${especialidad}`);
    }

    return razones.join(' • ') || 'Abogado calificado';
  }

  /**
   * Registrar que un abogado fue recomendado
   */
  async trackRecommendation(
    abogadoId: string,
    consultaId: string,
    cluster: string,
    score: number,
    razon: string
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO recomendaciones_abogados
       (consulta_id, abogado_id, score, razon_recomendacion)
       VALUES ($1, $2, $3, $4)`,
      [consultaId, abogadoId, score, razon]
    );

    // Actualizar contador de recomendaciones
    await this.pool.query(
      `INSERT INTO recommendation_scores (abogado_id, cluster, total_recomendaciones)
       VALUES ($1, $2, 1)
       ON CONFLICT (abogado_id, cluster)
       DO UPDATE SET total_recomendaciones = recommendation_scores.total_recomendaciones + 1`,
      [abogadoId, cluster]
    );
  }

  /**
   * Registrar contacto con abogado
   */
  async trackContact(abogadoId: string, cluster: string): Promise<void> {
    await this.pool.query(
      `UPDATE recommendation_scores
       SET total_contactos = total_contactos + 1
       WHERE abogado_id = $1 AND cluster = $2`,
      [abogadoId, cluster]
    );
  }
}
