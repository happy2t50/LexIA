/**
 * SERVICIO DE FORO INTELIGENTE - LexIA
 * 
 * Empareja usuarios con problemas SIMILARES usando:
 * - Clustering por tema/categoría
 * - Análisis de similitud de consultas
 * - OLAP para análisis de patrones
 */

import { Pool } from 'pg';

// Mapeo de temas detectados a categorías del foro
const TEMA_A_CATEGORIA: Record<string, string> = {
  'accidente': 'Accidentes',
  'atropello': 'Accidentes',
  'alcohol': 'Alcoholemia',
  'multa': 'Exceso de velocidad',
  'documentos': 'Documentación',
  'estacionamiento': 'Estacionamiento',
  'derechos': 'General',
  'general': 'General'
};

// Mapeo de temas a clusters de la BD (C1-C5)
const TEMA_A_CLUSTER: Record<string, string> = {
  'accidente': 'C1',
  'atropello': 'C1',
  'alcohol': 'C2',
  'multa': 'C3',
  'documentos': 'C4',
  'estacionamiento': 'C5',
  'derechos': 'C3',
  'general': 'C1'
};

// Clusters relacionados (para ampliar búsqueda si no hay resultados exactos)
const CLUSTERS_RELACIONADOS: Record<string, string[]> = {
  'accidente': ['atropello', 'alcohol'],
  'atropello': ['accidente'],
  'alcohol': ['accidente', 'multa'],
  'multa': ['estacionamiento', 'documentos'],
  'documentos': ['multa'],
  'estacionamiento': ['multa', 'documentos'],
  'derechos': ['multa', 'accidente'],
  'general': []
};

export interface PublicacionForo {
  id: string;
  titulo: string;
  contenido: string;
  categoria: string;
  autor: string;
  fecha: Date;
  vistas: number;
  likes: number;
  comentarios: number;
  similitud: number;
}

export interface UsuarioSimilar {
  id: string;
  nombre: string;
  tema: string;
  consulta: string;
  fecha: Date;
  similitud: number;
}

export interface SugerenciaForo {
  debeOfrecer: boolean;
  razon: string;
  publicacionesRelevantes: PublicacionForo[];
  usuariosSimilares: UsuarioSimilar[];
  categoriaSugerida: string;
  mensajeSugerencia: string;
}

export class ForoInteligenteService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Obtener la categoría del foro según el tema detectado
   */
  private getCategoriaForo(tema: string): string {
    return TEMA_A_CATEGORIA[tema] || 'General';
  }

  /**
   * Buscar publicaciones del foro relevantes para el tema del usuario
   */
  async buscarPublicacionesRelevantes(
    tema: string,
    consulta: string,
    limit: number = 5
  ): Promise<PublicacionForo[]> {
    const categoriaObjetivo = this.getCategoriaForo(tema);
    const temasRelacionados = CLUSTERS_RELACIONADOS[tema] || [];
    const categoriasRelacionadas = temasRelacionados.map(t => this.getCategoriaForo(t));
    
    // Todas las categorías a buscar (principal + relacionadas)
    const todasCategorias = [categoriaObjetivo, ...categoriasRelacionadas];

    try {
      // Buscar publicaciones en las categorías relevantes
      const query = `
        SELECT 
          fp.id,
          fp.titulo,
          fp.contenido,
          c.nombre as categoria,
          u.nombre as autor,
          fp.fecha,
          fp.vistas,
          fp.likes,
          (SELECT COUNT(*) FROM foro_comentarios fc WHERE fc.publicacion_id = fp.id) as comentarios,
          -- Calcular similitud básica por palabras clave
          CASE 
            WHEN c.nombre = $1 THEN 1.0
            WHEN c.nombre = ANY($2::text[]) THEN 0.7
            ELSE 0.3
          END as similitud
        FROM foro_publicaciones fp
        JOIN categorias c ON fp.categoria_id = c.id
        JOIN usuarios u ON fp.usuario_id = u.id
        WHERE c.nombre = ANY($3::text[])
        ORDER BY 
          CASE WHEN c.nombre = $1 THEN 0 ELSE 1 END,
          fp.likes DESC,
          fp.vistas DESC,
          fp.fecha DESC
        LIMIT $4
      `;

      const result = await this.pool.query(query, [
        categoriaObjetivo,
        categoriasRelacionadas,
        todasCategorias,
        limit
      ]);

      return result.rows.map(row => ({
        id: row.id,
        titulo: row.titulo,
        contenido: row.contenido,
        categoria: row.categoria,
        autor: row.autor,
        fecha: row.fecha,
        vistas: row.vistas,
        likes: row.likes,
        comentarios: parseInt(row.comentarios),
        similitud: parseFloat(row.similitud)
      }));
    } catch (error) {
      console.error('Error buscando publicaciones del foro:', error);
      return [];
    }
  }

  /**
   * Buscar usuarios con consultas similares (mismo cluster/tema)
   */
  async buscarUsuariosSimilares(
    usuarioId: string,
    tema: string,
    limit: number = 5
  ): Promise<UsuarioSimilar[]> {
    try {
      // Buscar en el historial de conversaciones usuarios con temas similares
      const query = `
        SELECT DISTINCT ON (c.usuario_id)
          c.usuario_id as id,
          u.nombre,
          c.cluster_detectado as tema,
          c.mensaje as consulta,
          c.fecha,
          1.0 as similitud
        FROM conversaciones c
        JOIN usuarios u ON c.usuario_id = u.id
        WHERE c.rol = 'user'
          AND c.usuario_id != $1
          AND c.cluster_detectado = $2
          AND c.fecha > NOW() - INTERVAL '30 days'
        ORDER BY c.usuario_id, c.fecha DESC
        LIMIT $3
      `;

      const result = await this.pool.query(query, [usuarioId, tema, limit]);

      return result.rows.map(row => ({
        id: row.id,
        nombre: row.nombre,
        tema: row.tema || tema,
        consulta: row.consulta,
        fecha: row.fecha,
        similitud: parseFloat(row.similitud)
      }));
    } catch (error) {
      console.error('Error buscando usuarios similares:', error);
      return [];
    }
  }

  /**
   * Obtener el cluster de BD según el tema
   */
  private getClusterDB(tema: string): string {
    return TEMA_A_CLUSTER[tema] || 'C1';
  }

  /**
   * Registrar al usuario en el cluster correspondiente
   */
  async registrarEnCluster(usuarioId: string, tema: string): Promise<void> {
    const clusterDB = this.getClusterDB(tema);
    
    try {
      // Verificar si ya existe el registro
      const existeQuery = `
        SELECT 1 FROM usuarios_clusters 
        WHERE usuario_id = $1 AND cluster = $2
      `;
      const existe = await this.pool.query(existeQuery, [usuarioId, clusterDB]);

      if (existe.rows.length === 0) {
        // Crear nuevo registro
        await this.pool.query(`
          INSERT INTO usuarios_clusters (usuario_id, cluster, total_consultas, temas_frecuentes)
          VALUES ($1, $2, 1, ARRAY[$3]::text[])
          ON CONFLICT (usuario_id, cluster) 
          DO UPDATE SET 
            total_consultas = usuarios_clusters.total_consultas + 1,
            ultima_consulta = NOW()
        `, [usuarioId, clusterDB, tema]);
      } else {
        // Actualizar contador
        await this.pool.query(`
          UPDATE usuarios_clusters 
          SET total_consultas = total_consultas + 1, 
              ultima_consulta = NOW(),
              temas_frecuentes = CASE 
                WHEN NOT ($3 = ANY(temas_frecuentes)) THEN array_append(temas_frecuentes, $3)
                ELSE temas_frecuentes
              END
          WHERE usuario_id = $1 AND cluster = $2
        `, [usuarioId, clusterDB, tema]);
      }

      console.log(`📊 Usuario ${usuarioId} registrado en cluster: ${clusterDB} (tema: ${tema})`);
    } catch (error) {
      console.error('Error registrando en cluster:', error);
    }
  }

  /**
   * Generar sugerencia inteligente de foro
   * Solo sugiere si hay contenido relevante
   */
  async generarSugerenciaForo(
    usuarioId: string,
    tema: string,
    consulta: string
  ): Promise<SugerenciaForo> {
    // Registrar usuario en el cluster
    await this.registrarEnCluster(usuarioId, tema);

    // Buscar publicaciones y usuarios similares
    const [publicaciones, usuariosSimilares] = await Promise.all([
      this.buscarPublicacionesRelevantes(tema, consulta, 3),
      this.buscarUsuariosSimilares(usuarioId, tema, 3)
    ]);

    const categoriaSugerida = this.getCategoriaForo(tema);
    const hayContenidoRelevante = publicaciones.length > 0 || usuariosSimilares.length > 0;

    // Construir mensaje personalizado
    let mensajeSugerencia = '';
    let razon = '';

    if (publicaciones.length > 0) {
      razon = `Hay ${publicaciones.length} publicaciones sobre ${categoriaSugerida}`;
      mensajeSugerencia = `💬 **Foro de Comunidad - ${categoriaSugerida}**\n`;
      mensajeSugerencia += `Otros usuarios han tenido situaciones similares:\n\n`;
      
      publicaciones.slice(0, 2).forEach((pub, i) => {
        mensajeSugerencia += `📝 **"${pub.titulo}"**\n`;
        mensajeSugerencia += `   👤 ${pub.autor} | 👍 ${pub.likes} | 💬 ${pub.comentarios} comentarios\n`;
      });
      
      mensajeSugerencia += `\n_Visita el foro para ver más publicaciones y compartir tu experiencia._`;
    } 
    else if (usuariosSimilares.length > 0) {
      razon = `Hay ${usuariosSimilares.length} usuarios con consultas similares`;
      mensajeSugerencia = `💬 **Comunidad de ${categoriaSugerida}**\n`;
      mensajeSugerencia += `${usuariosSimilares.length} usuarios han consultado sobre temas similares recientemente.\n`;
      mensajeSugerencia += `_Únete al foro para compartir experiencias y recibir consejos._`;
    }
    else {
      // No hay contenido relevante - invitar a ser el primero
      razon = 'No hay publicaciones similares aún';
      mensajeSugerencia = `💬 **¿Quieres compartir tu experiencia?**\n`;
      mensajeSugerencia += `Aún no hay publicaciones sobre "${categoriaSugerida}" en el foro.\n`;
      mensajeSugerencia += `_Sé el primero en compartir tu caso y ayuda a otros usuarios._`;
    }

    return {
      debeOfrecer: true, // Siempre ofrecer pero con mensaje apropiado
      razon,
      publicacionesRelevantes: publicaciones,
      usuariosSimilares,
      categoriaSugerida,
      mensajeSugerencia
    };
  }

  /**
   * Obtener estadísticas OLAP del foro por categoría
   */
  async getEstadisticasCategoria(categoria: string): Promise<{
    totalPublicaciones: number;
    totalComentarios: number;
    usuariosActivos: number;
    tendencia: 'subiendo' | 'estable' | 'bajando';
  }> {
    try {
      const query = `
        SELECT 
          COUNT(fp.id) as total_publicaciones,
          COALESCE(SUM((SELECT COUNT(*) FROM foro_comentarios fc WHERE fc.publicacion_id = fp.id)), 0) as total_comentarios,
          COUNT(DISTINCT fp.usuario_id) as usuarios_activos,
          -- Comparar últimos 7 días vs 7 días anteriores
          (
            SELECT COUNT(*) FROM foro_publicaciones fp2
            JOIN categorias c2 ON fp2.categoria_id = c2.id
            WHERE c2.nombre = $1 AND fp2.fecha > NOW() - INTERVAL '7 days'
          ) as posts_recientes,
          (
            SELECT COUNT(*) FROM foro_publicaciones fp3
            JOIN categorias c3 ON fp3.categoria_id = c3.id
            WHERE c3.nombre = $1 
              AND fp3.fecha > NOW() - INTERVAL '14 days'
              AND fp3.fecha <= NOW() - INTERVAL '7 days'
          ) as posts_anteriores
        FROM foro_publicaciones fp
        JOIN categorias c ON fp.categoria_id = c.id
        WHERE c.nombre = $1
      `;

      const result = await this.pool.query(query, [categoria]);
      const row = result.rows[0];

      const postsRecientes = parseInt(row?.posts_recientes || '0');
      const postsAnteriores = parseInt(row?.posts_anteriores || '0');
      
      let tendencia: 'subiendo' | 'estable' | 'bajando' = 'estable';
      if (postsRecientes > postsAnteriores * 1.2) tendencia = 'subiendo';
      else if (postsRecientes < postsAnteriores * 0.8) tendencia = 'bajando';

      return {
        totalPublicaciones: parseInt(row?.total_publicaciones || '0'),
        totalComentarios: parseInt(row?.total_comentarios || '0'),
        usuariosActivos: parseInt(row?.usuarios_activos || '0'),
        tendencia
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return {
        totalPublicaciones: 0,
        totalComentarios: 0,
        usuariosActivos: 0,
        tendencia: 'estable'
      };
    }
  }
}
