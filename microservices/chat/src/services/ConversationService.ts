// Servicio de Gestión de Conversaciones con Memoria
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { Message, Session } from '../types';

export class ConversationService {
  constructor(private pool: Pool) {}

  /**
   * Crear nueva sesión de chat
   */
  async createSession(usuarioId: string, nombre?: string): Promise<Session> {
    // Asegurar que el usuario exista en la tabla de usuarios del servicio de chat
    await this.ensureUserExists(usuarioId, nombre);
    const sessionId = uuidv4();

    const result = await this.pool.query(
      `INSERT INTO sesiones_chat (id, usuario_id, activa)
       VALUES ($1, $2, true)
       RETURNING *`,
      [sessionId, usuarioId]
    );

    return this.mapToSession(result.rows[0]);
  }

  /**
   * Obtener sesión activa del usuario o crear una nueva
   */
  async getOrCreateSession(usuarioId: string, nombre?: string): Promise<Session> {
    // Buscar sesión activa
    const result = await this.pool.query(
      `SELECT * FROM sesiones_chat
       WHERE usuario_id = $1 AND activa = true
       ORDER BY fecha_ultimo_mensaje DESC
       LIMIT 1`,
      [usuarioId]
    );

    if (result.rows.length > 0) {
      return this.mapToSession(result.rows[0]);
    }

    // Crear nueva sesión
    return this.createSession(usuarioId, nombre);
  }

  /**
   * Guardar mensaje en la conversación
   */
  async saveMessage(
    sesionId: string,
    usuarioId: string,
    rol: 'user' | 'assistant' | 'system',
    mensaje: string,
    metadata?: {
      clusterDetectado?: string;
      embedding?: number[];
      sentimiento?: string;
      intencion?: string;
      contexto?: any;
    }
  ): Promise<Message> {
    // Por seguridad, si llega un usuario nuevo por aquí, crearlo también
    await this.ensureUserExists(usuarioId);
    const messageId = uuidv4();

    const embeddingStr = metadata?.embedding
      ? `[${metadata.embedding.join(',')}]`
      : null;

    const result = await this.pool.query(
      `INSERT INTO conversaciones
       (id, usuario_id, sesion_id, mensaje, rol, cluster_detectado, embedding, sentimiento, intencion, contexto)
       VALUES ($1, $2, $3, $4, $5, $6, $7::vector, $8, $9, $10::jsonb)
       RETURNING *`,
      [
        messageId,
        usuarioId,
        sesionId,
        mensaje,
        rol,
        metadata?.clusterDetectado || null,
        embeddingStr,
        metadata?.sentimiento || null,
        metadata?.intencion || null,
        metadata?.contexto ? JSON.stringify(metadata.contexto) : null
      ]
    );

    // Actualizar sesión
    await this.updateSession(sesionId, metadata?.clusterDetectado);

    return this.mapToMessage(result.rows[0]);
  }

  /**
   * Obtener historial de conversación (últimos N mensajes)
   */
  async getConversationHistory(
    sesionId: string,
    limit: number = 10
  ): Promise<Message[]> {
    const result = await this.pool.query(
      `SELECT * FROM conversaciones
       WHERE sesion_id = $1
       ORDER BY fecha DESC
       LIMIT $2`,
      [sesionId, limit]
    );

    return result.rows.reverse().map(row => this.mapToMessage(row));
  }

  /**
   * Obtener contexto conversacional
   * Retorna mensajes recientes para dar contexto al LLM
   */
  async getConversationContext(sesionId: string): Promise<string> {
    // Obtener últimos mensajes, excluyendo los de tipo 'system'
    const messages = (await this.getConversationHistory(sesionId, 6))
      .filter(m => m.rol !== 'system');

    // Si aún no hay intercambio real (usuario/asistente), no añadir contexto
    if (messages.length < 2) {
      return '';
    }

    const context = messages
      .map(m => {
        const prefix = m.rol === 'user' ? 'Usuario' : 'Asistente';
        return `${prefix}: ${m.mensaje}`;
      })
      .join('\n');

    return `Conversación previa:\n${context}\n`;
  }

  /**
   * Detectar cambio de tema en la conversación
   */
  async detectTopicChange(
    sesionId: string,
    nuevoCluster: string
  ): Promise<boolean> {
    const session = await this.getSession(sesionId);

    if (!session || !session.clusterPrincipal) {
      return false;
    }

    return session.clusterPrincipal !== nuevoCluster;
  }

  /**
   * Obtener sesión por ID
   */
  async getSession(sesionId: string): Promise<Session | null> {
    const result = await this.pool.query(
      `SELECT * FROM sesiones_chat WHERE id = $1`,
      [sesionId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToSession(result.rows[0]);
  }

  /**
   * Actualizar sesión
   */
  private async updateSession(
    sesionId: string,
    cluster?: string
  ): Promise<void> {
    let query = `
      UPDATE sesiones_chat
      SET total_mensajes = total_mensajes + 1,
          fecha_ultimo_mensaje = NOW()
    `;

    const params: any[] = [sesionId];

    if (cluster) {
      query += `, cluster_principal = COALESCE(cluster_principal, $2)`;
      params.push(cluster);
    }

    query += ` WHERE id = $1`;

    await this.pool.query(query, params);
  }

  /**
   * Cerrar sesión
   */
  async closeSession(sesionId: string): Promise<void> {
    await this.pool.query(
      `UPDATE sesiones_chat SET activa = false WHERE id = $1`,
      [sesionId]
    );
  }

  /**
   * Obtener todas las sesiones de un usuario
   */
  async getUserSessions(usuarioId: string, limit: number = 10): Promise<Session[]> {
    const result = await this.pool.query(
      `SELECT * FROM sesiones_chat
       WHERE usuario_id = $1
       ORDER BY fecha_ultimo_mensaje DESC
       LIMIT $2`,
      [usuarioId, limit]
    );

    return result.rows.map(row => this.mapToSession(row));
  }

  /**
   * Generar título automático para la sesión
   */
  async generateSessionTitle(sesionId: string): Promise<string> {
    const messages = await this.getConversationHistory(sesionId, 3);

    if (messages.length === 0) {
      return 'Nueva conversación';
    }

    const firstUserMessage = messages.find(m => m.rol === 'user');

    if (!firstUserMessage) {
      return 'Nueva conversación';
    }

    // Extraer primeras palabras como título
    const words = firstUserMessage.mensaje.split(' ').slice(0, 6);
    let title = words.join(' ');

    if (firstUserMessage.mensaje.split(' ').length > 6) {
      title += '...';
    }

    // Actualizar título
    await this.pool.query(
      `UPDATE sesiones_chat SET titulo = $1 WHERE id = $2`,
      [title, sesionId]
    );

    return title;
  }

  /**
   * Buscar conversaciones similares
   */
  async findSimilarConversations(
    embedding: number[],
    limit: number = 5
  ): Promise<Message[]> {
    const embeddingStr = `[${embedding.join(',')}]`;

    const result = await this.pool.query(
      `SELECT *,
              1 - (embedding <=> $1::vector) AS similitud
       FROM conversaciones
       WHERE embedding IS NOT NULL
         AND rol = 'user'
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [embeddingStr, limit]
    );

    return result.rows.map(row => this.mapToMessage(row));
  }

  // Mappers
  private mapToMessage(row: any): Message {
    return {
      id: row.id,
      sesionId: row.sesion_id,
      usuarioId: row.usuario_id,
      rol: row.rol,
      mensaje: row.mensaje,
      clusterDetectado: row.cluster_detectado,
      embedding: row.embedding ? Array.from(row.embedding) : undefined,
      sentimiento: row.sentimiento,
      intencion: row.intencion,
      contexto: row.contexto,
      metadata: row.metadata,
      fecha: row.fecha
    };
  }

  private mapToSession(row: any): Session {
    return {
      id: row.id,
      usuarioId: row.usuario_id,
      titulo: row.titulo,
      clusterPrincipal: row.cluster_principal,
      totalMensajes: row.total_mensajes,
      fechaInicio: row.fecha_inicio,
      fechaUltimoMensaje: row.fecha_ultimo_mensaje,
      activa: row.activa
    };
  }

  /**
   * Garantiza que el usuario exista en la tabla `usuarios` del servicio de chat.
   * Si no existe, lo inserta con los datos mínimos disponibles.
   */
  private async ensureUserExists(usuarioId: string, nombre?: string): Promise<void> {
    const exists = await this.pool.query(`SELECT 1 FROM usuarios WHERE id = $1 LIMIT 1`, [usuarioId]);
    if (exists.rows.length > 0) return;
    // Insertar registro mínimo; otras columnas deben tener DEFAULT o permitir NULL
    await this.pool.query(
      `INSERT INTO usuarios (id, nombre) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
      [usuarioId, nombre || 'Usuario']
    );
  }
}
