/**
 * SERVICIO DE FORO DE COMUNIDAD - LexIA
 * 
 * Gestión completa del foro:
 * - Publicaciones
 * - Comentarios
 * - Likes
 * - Búsqueda por categoría
 */

import { Pool } from 'pg';

export interface Publicacion {
  id: string;
  usuarioId: string;
  autorNombre: string;
  autorFoto?: string;
  titulo: string;
  contenido: string;
  categoriaId: string;
  categoriaNombre: string;
  fecha: Date;
  vistas: number;
  likes: number;
  comentarios: number;
  yaLeDioLike?: boolean;
}

export interface Comentario {
  id: string;
  publicacionId: string;
  usuarioId: string;
  autorNombre: string;
  autorFoto?: string;
  contenido: string;
  fecha: Date;
  likes: number;
}

export interface Categoria {
  id: string;
  nombre: string;
  descripcion: string;
  icono?: string;
  color?: string;
  totalPublicaciones: number;
}

export class ForoService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Obtener todas las categorías del foro
   */
  async getCategorias(): Promise<Categoria[]> {
    const query = `
      SELECT 
        c.id,
        c.nombre,
        c.descripcion,
        c.icono,
        c.color,
        COUNT(fp.id) as total_publicaciones
      FROM categorias c
      LEFT JOIN foro_publicaciones fp ON c.id = fp.categoria_id
      GROUP BY c.id
      ORDER BY c.nombre
    `;

    const result = await this.pool.query(query);
    return result.rows.map(row => ({
      id: row.id,
      nombre: row.nombre,
      descripcion: row.descripcion || '',
      icono: row.icono,
      color: row.color,
      totalPublicaciones: parseInt(row.total_publicaciones)
    }));
  }

  /**
   * Obtener publicaciones del foro
   */
  async getPublicaciones(
    categoriaId?: string,
    usuarioIdActual?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Publicacion[]> {
    // Construir query dinámicamente según los parámetros presentes
    const params: any[] = [];
    let paramIndex = 1;
    
    // Siempre agregar limit y offset al final
    const limitParam = paramIndex++;
    const offsetParam = paramIndex++;
    params.push(limit, offset);
    
    // Preparar parámetro de usuario para EXISTS si existe
    let usuarioParam: number | null = null;
    if (usuarioIdActual) {
      usuarioParam = paramIndex++;
      params.push(usuarioIdActual);
    }
    
    // Preparar parámetro de categoría si existe
    let categoriaParam: number | null = null;
    if (categoriaId) {
      categoriaParam = paramIndex++;
      params.push(categoriaId);
    }
    
    let query = `
      SELECT 
        fp.id,
        fp.usuario_id,
        u.nombre as autor_nombre,
        u.foto_perfil as autor_foto,
        fp.titulo,
        fp.contenido,
        fp.categoria_id,
        c.nombre as categoria_nombre,
        fp.fecha,
        fp.vistas,
        fp.likes,
        (SELECT COUNT(*) FROM foro_comentarios fc WHERE fc.publicacion_id = fp.id) as comentarios
    `;
    
    // Si hay usuario activo, verificar si ya dio like
    if (usuarioIdActual && usuarioParam) {
      query += `,
        EXISTS(
          SELECT 1 FROM foro_likes fl 
          WHERE fl.publicacion_id = fp.id AND fl.usuario_id = $${usuarioParam}
        ) as ya_dio_like
      `;
    }
    
    query += `
      FROM foro_publicaciones fp
      JOIN usuarios u ON fp.usuario_id = u.id
      JOIN categorias c ON fp.categoria_id = c.id
    `;
    
    if (categoriaId && categoriaParam) {
      query += ` WHERE fp.categoria_id = $${categoriaParam}`;
    }
    
    query += ` ORDER BY fp.fecha DESC LIMIT $${limitParam} OFFSET $${offsetParam}`;

    const result = await this.pool.query(query, params);
    
    return result.rows.map(row => ({
      id: row.id,
      usuarioId: row.usuario_id,
      autorNombre: row.autor_nombre,
      autorFoto: row.autor_foto,
      titulo: row.titulo,
      contenido: row.contenido,
      categoriaId: row.categoria_id,
      categoriaNombre: row.categoria_nombre,
      fecha: row.fecha,
      vistas: row.vistas || 0,
      likes: row.likes || 0,
      comentarios: parseInt(row.comentarios) || 0,
      yaLeDioLike: row.ya_dio_like || false
    }));
  }

  /**
   * Obtener una publicación específica con sus comentarios
   */
  async getPublicacion(publicacionId: string, usuarioIdActual?: string): Promise<{
    publicacion: Publicacion;
    comentarios: Comentario[];
  } | null> {
    // Incrementar vistas
    await this.pool.query(
      `UPDATE foro_publicaciones SET vistas = vistas + 1 WHERE id = $1`,
      [publicacionId]
    );

    // Obtener publicación
    const pubQuery = `
      SELECT 
        fp.id,
        fp.usuario_id,
        u.nombre as autor_nombre,
        u.foto_perfil as autor_foto,
        fp.titulo,
        fp.contenido,
        fp.categoria_id,
        c.nombre as categoria_nombre,
        fp.fecha,
        fp.vistas,
        fp.likes,
        (SELECT COUNT(*) FROM foro_comentarios fc WHERE fc.publicacion_id = fp.id) as comentarios
      FROM foro_publicaciones fp
      JOIN usuarios u ON fp.usuario_id = u.id
      JOIN categorias c ON fp.categoria_id = c.id
      WHERE fp.id = $1
    `;

    const pubResult = await this.pool.query(pubQuery, [publicacionId]);
    
    if (pubResult.rows.length === 0) {
      return null;
    }

    const row = pubResult.rows[0];
    const publicacion: Publicacion = {
      id: row.id,
      usuarioId: row.usuario_id,
      autorNombre: row.autor_nombre,
      autorFoto: row.autor_foto,
      titulo: row.titulo,
      contenido: row.contenido,
      categoriaId: row.categoria_id,
      categoriaNombre: row.categoria_nombre,
      fecha: row.fecha,
      vistas: row.vistas || 0,
      likes: row.likes || 0,
      comentarios: parseInt(row.comentarios) || 0
    };

    // Obtener comentarios
    const comQuery = `
      SELECT 
        fc.id,
        fc.publicacion_id,
        fc.usuario_id,
        u.nombre as autor_nombre,
        u.foto_perfil as autor_foto,
        fc.contenido,
        fc.fecha,
        fc.likes
      FROM foro_comentarios fc
      JOIN usuarios u ON fc.usuario_id = u.id
      WHERE fc.publicacion_id = $1
      ORDER BY fc.fecha ASC
    `;

    const comResult = await this.pool.query(comQuery, [publicacionId]);
    
    const comentarios: Comentario[] = comResult.rows.map(row => ({
      id: row.id,
      publicacionId: row.publicacion_id,
      usuarioId: row.usuario_id,
      autorNombre: row.autor_nombre,
      autorFoto: row.autor_foto,
      contenido: row.contenido,
      fecha: row.fecha,
      likes: row.likes || 0
    }));

    return { publicacion, comentarios };
  }

  /**
   * Crear nueva publicación
   */
  async crearPublicacion(
    usuarioId: string,
    titulo: string,
    contenido: string,
    categoriaId: string
  ): Promise<Publicacion> {
    const query = `
      INSERT INTO foro_publicaciones (usuario_id, titulo, contenido, categoria_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, fecha
    `;

    const result = await this.pool.query(query, [usuarioId, titulo, contenido, categoriaId]);
    const newId = result.rows[0].id;

    // Obtener la publicación completa
    const pub = await this.getPublicacion(newId);
    return pub!.publicacion;
  }

  /**
   * Crear comentario en una publicación
   */
  async crearComentario(
    publicacionId: string,
    usuarioId: string,
    contenido: string
  ): Promise<Comentario> {
    const query = `
      INSERT INTO foro_comentarios (publicacion_id, usuario_id, contenido)
      VALUES ($1, $2, $3)
      RETURNING id, fecha
    `;

    const result = await this.pool.query(query, [publicacionId, usuarioId, contenido]);
    
    // Obtener el comentario completo
    const comQuery = `
      SELECT 
        fc.id,
        fc.publicacion_id,
        fc.usuario_id,
        u.nombre as autor_nombre,
        u.foto_perfil as autor_foto,
        fc.contenido,
        fc.fecha,
        fc.likes
      FROM foro_comentarios fc
      JOIN usuarios u ON fc.usuario_id = u.id
      WHERE fc.id = $1
    `;

    const comResult = await this.pool.query(comQuery, [result.rows[0].id]);
    const row = comResult.rows[0];

    return {
      id: row.id,
      publicacionId: row.publicacion_id,
      usuarioId: row.usuario_id,
      autorNombre: row.autor_nombre,
      autorFoto: row.autor_foto,
      contenido: row.contenido,
      fecha: row.fecha,
      likes: row.likes || 0
    };
  }

  /**
   * Dar/quitar like a una publicación
   */
  async toggleLikePublicacion(publicacionId: string, usuarioId: string): Promise<{
    liked: boolean;
    totalLikes: number;
  }> {
    // Verificar si ya existe el like
    const checkQuery = `
      SELECT 1 FROM foro_likes WHERE publicacion_id = $1 AND usuario_id = $2
    `;
    const exists = await this.pool.query(checkQuery, [publicacionId, usuarioId]);

    if (exists.rows.length > 0) {
      // Quitar like
      await this.pool.query(
        `DELETE FROM foro_likes WHERE publicacion_id = $1 AND usuario_id = $2`,
        [publicacionId, usuarioId]
      );
      await this.pool.query(
        `UPDATE foro_publicaciones SET likes = likes - 1 WHERE id = $1`,
        [publicacionId]
      );
    } else {
      // Dar like
      await this.pool.query(
        `INSERT INTO foro_likes (publicacion_id, usuario_id) VALUES ($1, $2)`,
        [publicacionId, usuarioId]
      );
      await this.pool.query(
        `UPDATE foro_publicaciones SET likes = likes + 1 WHERE id = $1`,
        [publicacionId]
      );
    }

    // Obtener total de likes
    const likesResult = await this.pool.query(
      `SELECT likes FROM foro_publicaciones WHERE id = $1`,
      [publicacionId]
    );

    return {
      liked: exists.rows.length === 0, // Si no existía, ahora tiene like
      totalLikes: likesResult.rows[0]?.likes || 0
    };
  }

  /**
   * Buscar publicaciones por texto
   */
  async buscarPublicaciones(
    query: string,
    categoriaId?: string,
    limit: number = 20
  ): Promise<Publicacion[]> {
    let sqlQuery = `
      SELECT 
        fp.id,
        fp.usuario_id,
        u.nombre as autor_nombre,
        u.foto_perfil as autor_foto,
        fp.titulo,
        fp.contenido,
        fp.categoria_id,
        c.nombre as categoria_nombre,
        fp.fecha,
        fp.vistas,
        fp.likes,
        (SELECT COUNT(*) FROM foro_comentarios fc WHERE fc.publicacion_id = fp.id) as comentarios
      FROM foro_publicaciones fp
      JOIN usuarios u ON fp.usuario_id = u.id
      JOIN categorias c ON fp.categoria_id = c.id
      WHERE (fp.titulo ILIKE $1 OR fp.contenido ILIKE $1)
    `;

    const params: any[] = [`%${query}%`];

    if (categoriaId) {
      sqlQuery += ` AND fp.categoria_id = $2`;
      params.push(categoriaId);
    }

    sqlQuery += ` ORDER BY fp.likes DESC, fp.fecha DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.pool.query(sqlQuery, params);

    return result.rows.map(row => ({
      id: row.id,
      usuarioId: row.usuario_id,
      autorNombre: row.autor_nombre,
      autorFoto: row.autor_foto,
      titulo: row.titulo,
      contenido: row.contenido,
      categoriaId: row.categoria_id,
      categoriaNombre: row.categoria_nombre,
      fecha: row.fecha,
      vistas: row.vistas || 0,
      likes: row.likes || 0,
      comentarios: parseInt(row.comentarios) || 0
    }));
  }

  /**
   * Obtener publicaciones del usuario
   */
  async getMisPublicaciones(usuarioId: string): Promise<Publicacion[]> {
    const query = `
      SELECT 
        fp.id,
        fp.usuario_id,
        u.nombre as autor_nombre,
        u.foto_perfil as autor_foto,
        fp.titulo,
        fp.contenido,
        fp.categoria_id,
        c.nombre as categoria_nombre,
        fp.fecha,
        fp.vistas,
        fp.likes,
        (SELECT COUNT(*) FROM foro_comentarios fc WHERE fc.publicacion_id = fp.id) as comentarios
      FROM foro_publicaciones fp
      JOIN usuarios u ON fp.usuario_id = u.id
      JOIN categorias c ON fp.categoria_id = c.id
      WHERE fp.usuario_id = $1
      ORDER BY fp.fecha DESC
    `;

    const result = await this.pool.query(query, [usuarioId]);

    return result.rows.map(row => ({
      id: row.id,
      usuarioId: row.usuario_id,
      autorNombre: row.autor_nombre,
      autorFoto: row.autor_foto,
      titulo: row.titulo,
      contenido: row.contenido,
      categoriaId: row.categoria_id,
      categoriaNombre: row.categoria_nombre,
      fecha: row.fecha,
      vistas: row.vistas || 0,
      likes: row.likes || 0,
      comentarios: parseInt(row.comentarios) || 0
    }));
  }
}
