import { Pool } from 'pg';

export interface MensajePrivado {
  id: string;
  ciudadanoId: string;
  abogadoId: string;
  remitenteId: string;
  contenido: string;
  fecha: Date;
  leido: boolean;
}

export interface ConversacionPrivada {
  ciudadanoId: string;
  abogadoId: string;
  otroUsuarioId: string;
  otroUsuarioNombre: string;
  otroUsuarioFoto: string | null;
  esAbogado: boolean;
  ultimoMensaje: string | null;
  fechaUltimoMensaje: Date;
  noLeidos: number;
}

export class MensajesPrivadosService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Obtener todas las conversaciones de un usuario
   */
  async getConversaciones(usuarioId: string): Promise<ConversacionPrivada[]> {
    const query = `
      WITH conv_ciudadano AS (
        -- Conversaciones como ciudadano
        SELECT DISTINCT ON (abogado_id)
          ciudadano_id,
          abogado_id,
          abogado_id as otro_usuario_id,
          contenido as ultimo_mensaje,
          fecha as fecha_ultimo_mensaje
        FROM mensajes_privados
        WHERE ciudadano_id = $1
        ORDER BY abogado_id, fecha DESC
      ),
      conv_abogado AS (
        -- Conversaciones como abogado
        SELECT DISTINCT ON (ciudadano_id)
          ciudadano_id,
          abogado_id,
          ciudadano_id as otro_usuario_id,
          contenido as ultimo_mensaje,
          fecha as fecha_ultimo_mensaje
        FROM mensajes_privados
        WHERE abogado_id = $1
        ORDER BY ciudadano_id, fecha DESC
      ),
      conversaciones AS (
        SELECT * FROM conv_ciudadano
        UNION ALL
        SELECT * FROM conv_abogado
      ),
      no_leidos AS (
        SELECT 
          ciudadano_id,
          abogado_id,
          COUNT(*) as no_leidos
        FROM mensajes_privados
        WHERE (ciudadano_id = $1 OR abogado_id = $1)
          AND remitente_id != $1
          AND leido = false
        GROUP BY ciudadano_id, abogado_id
      )
      SELECT 
        c.ciudadano_id,
        c.abogado_id,
        c.otro_usuario_id,
        u.nombre as otro_usuario_nombre,
        u.foto_perfil as otro_usuario_foto,
        CASE WHEN u.rol = 'abogado' THEN true ELSE false END as es_abogado,
        c.ultimo_mensaje,
        c.fecha_ultimo_mensaje,
        COALESCE(nl.no_leidos, 0) as no_leidos
      FROM conversaciones c
      JOIN usuarios u ON u.id = c.otro_usuario_id
      LEFT JOIN no_leidos nl ON nl.ciudadano_id = c.ciudadano_id AND nl.abogado_id = c.abogado_id
      ORDER BY c.fecha_ultimo_mensaje DESC
    `;

    const result = await this.pool.query(query, [usuarioId]);

    return result.rows.map(row => ({
      ciudadanoId: row.ciudadano_id,
      abogadoId: row.abogado_id,
      otroUsuarioId: row.otro_usuario_id,
      otroUsuarioNombre: row.otro_usuario_nombre,
      otroUsuarioFoto: row.otro_usuario_foto,
      esAbogado: row.es_abogado,
      ultimoMensaje: row.ultimo_mensaje,
      fechaUltimoMensaje: row.fecha_ultimo_mensaje,
      noLeidos: parseInt(row.no_leidos)
    }));
  }

  /**
   * Obtener mensajes de una conversación específica
   */
  async getMensajes(ciudadanoId: string, abogadoId: string, limit: number = 50): Promise<MensajePrivado[]> {
    const query = `
      SELECT 
        id,
        ciudadano_id,
        abogado_id,
        remitente_id,
        contenido,
        fecha,
        leido
      FROM mensajes_privados
      WHERE ciudadano_id = $1 AND abogado_id = $2
      ORDER BY fecha ASC
      LIMIT $3
    `;

    const result = await this.pool.query(query, [ciudadanoId, abogadoId, limit]);

    return result.rows.map(row => ({
      id: row.id,
      ciudadanoId: row.ciudadano_id,
      abogadoId: row.abogado_id,
      remitenteId: row.remitente_id,
      contenido: row.contenido,
      fecha: row.fecha,
      leido: row.leido
    }));
  }

  /**
   * Enviar un mensaje
   */
  async enviarMensaje(
    ciudadanoId: string, 
    abogadoId: string, 
    remitenteId: string, 
    contenido: string
  ): Promise<MensajePrivado> {
    const query = `
      INSERT INTO mensajes_privados (ciudadano_id, abogado_id, remitente_id, contenido)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await this.pool.query(query, [ciudadanoId, abogadoId, remitenteId, contenido]);
    const row = result.rows[0];

    return {
      id: row.id,
      ciudadanoId: row.ciudadano_id,
      abogadoId: row.abogado_id,
      remitenteId: row.remitente_id,
      contenido: row.contenido,
      fecha: row.fecha,
      leido: row.leido
    };
  }

  /**
   * Marcar mensajes como leídos
   */
  async marcarComoLeidos(ciudadanoId: string, abogadoId: string, lectorId: string): Promise<number> {
    const query = `
      UPDATE mensajes_privados
      SET leido = true
      WHERE ciudadano_id = $1 
        AND abogado_id = $2 
        AND remitente_id != $3
        AND leido = false
    `;

    const result = await this.pool.query(query, [ciudadanoId, abogadoId, lectorId]);
    return result.rowCount || 0;
  }

  /**
   * Obtener cantidad de mensajes no leídos
   */
  async getMensajesNoLeidos(usuarioId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as total
      FROM mensajes_privados
      WHERE (ciudadano_id = $1 OR abogado_id = $1)
        AND remitente_id != $1
        AND leido = false
    `;

    const result = await this.pool.query(query, [usuarioId]);
    return parseInt(result.rows[0].total);
  }

  /**
   * Crear o verificar que existe una conversación
   */
  async crearConversacion(
    ciudadanoId: string, 
    abogadoId: string, 
    mensajeInicial?: string
  ): Promise<ConversacionPrivada | null> {
    // Verificar que ambos usuarios existen
    const usuariosQuery = `
      SELECT id, nombre, foto_perfil, rol
      FROM usuarios
      WHERE id = $1 OR id = $2
    `;
    const usuariosResult = await this.pool.query(usuariosQuery, [ciudadanoId, abogadoId]);

    if (usuariosResult.rows.length < 2) {
      throw new Error('Uno o ambos usuarios no existen');
    }

    // Si hay mensaje inicial, enviarlo
    if (mensajeInicial) {
      await this.enviarMensaje(ciudadanoId, abogadoId, ciudadanoId, mensajeInicial);
    }

    // Obtener info del abogado para la respuesta
    const abogadoInfo = usuariosResult.rows.find(u => u.id === abogadoId);

    return {
      ciudadanoId,
      abogadoId,
      otroUsuarioId: abogadoId,
      otroUsuarioNombre: abogadoInfo?.nombre || 'Usuario',
      otroUsuarioFoto: abogadoInfo?.foto_perfil || null,
      esAbogado: abogadoInfo?.rol === 'abogado',
      ultimoMensaje: mensajeInicial || null,
      fechaUltimoMensaje: new Date(),
      noLeidos: 0
    };
  }
}
