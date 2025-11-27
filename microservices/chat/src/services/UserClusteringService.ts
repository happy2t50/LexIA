// Servicio de Agrupación de Usuarios por Similitud
import { Pool } from 'pg';
import { UserProfile, SimilarUser } from '../types';

export class UserClusteringService {
  constructor(private pool: Pool) {}

  /**
   * Agregar usuario automáticamente a grupo basado en cluster
   */
  async addUserToGroup(usuarioId: string, cluster: string): Promise<void> {
    await this.pool.query(
      `SELECT agregar_usuario_a_grupo($1, $2)`,
      [usuarioId, cluster]
    );
  }

  /**
   * Buscar usuarios similares
   */
  async findSimilarUsers(
    usuarioId: string,
    cluster: string,
    limit: number = 10
  ): Promise<SimilarUser[]> {
    const result = await this.pool.query(
      `SELECT * FROM buscar_usuarios_similares($1, $2, $3)`,
      [usuarioId, cluster, limit]
    );

    return result.rows.map(row => ({
      usuarioId: row.usuario_id,
      nombre: row.nombre,
      cluster: row.cluster,
      similitud: parseFloat(row.similitud),
      totalConsultas: row.total_consultas
    }));
  }

  /**
   * Obtener perfil de usuario por cluster
   */
  async getUserProfile(usuarioId: string, cluster: string): Promise<UserProfile | null> {
    const result = await this.pool.query(
      `SELECT * FROM usuarios_clusters
       WHERE usuario_id = $1 AND cluster = $2`,
      [usuarioId, cluster]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      usuarioId: row.usuario_id,
      cluster: row.cluster,
      totalConsultas: row.total_consultas,
      temasFrecuentes: row.temas_frecuentes || [],
      embeddingPromedio: row.embedding_promedio
    };
  }

  /**
   * Obtener todos los grupos de un usuario
   */
  async getUserGroups(usuarioId: string): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT g.*, gm.fecha_union, gm.total_participaciones
       FROM grupos_usuarios g
       JOIN grupo_miembros gm ON g.id = gm.grupo_id
       WHERE gm.usuario_id = $1 AND gm.activo = true
       ORDER BY g.cluster`,
      [usuarioId]
    );

    return result.rows;
  }

  /**
   * Obtener miembros de un grupo
   */
  async getGroupMembers(grupoId: string, limit: number = 50): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT u.id, u.nombre, u.foto_perfil, gm.fecha_union, gm.total_participaciones
       FROM usuarios u
       JOIN grupo_miembros gm ON u.id = gm.usuario_id
       WHERE gm.grupo_id = $1 AND gm.activo = true
       ORDER BY gm.total_participaciones DESC, gm.fecha_union DESC
       LIMIT $2`,
      [grupoId, limit]
    );

    return result.rows;
  }

  /**
   * Sugerir grupos relevantes para el usuario
   */
  async suggestGroups(usuarioId: string): Promise<any[]> {
    // Obtener clusters del usuario
    const clustersResult = await this.pool.query(
      `SELECT DISTINCT cluster FROM usuarios_clusters
       WHERE usuario_id = $1
       ORDER BY total_consultas DESC
       LIMIT 3`,
      [usuarioId]
    );

    if (clustersResult.rows.length === 0) {
      return [];
    }

    const clusters = clustersResult.rows.map(r => r.cluster);

    // Buscar grupos de esos clusters que el usuario no ha unido
    const result = await this.pool.query(
      `SELECT g.*
       FROM grupos_usuarios g
       WHERE g.cluster = ANY($1)
         AND g.activo = true
         AND NOT EXISTS (
           SELECT 1 FROM grupo_miembros gm
           WHERE gm.grupo_id = g.id
             AND gm.usuario_id = $2
             AND gm.activo = true
         )
       ORDER BY g.total_miembros DESC`,
      [clusters, usuarioId]
    );

    return result.rows;
  }
}
