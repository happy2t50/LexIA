import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import axios from 'axios';

// Servicios
import { ConversationService } from './services/ConversationService';
import { ResponseGenerator } from './services/ResponseGenerator';
import { LawyerRecommendationService } from './services/LawyerRecommendationService';
import { UserClusteringService } from './services/UserClusteringService';
import { LearningService } from './services/LearningService';
import { KnowledgeBaseService } from './services/KnowledgeBaseService';
import { ResponseBuilder } from './services/ResponseBuilder';
import { SmartResponseService } from './services/SmartResponseService';
import { ForoService } from './services/ForoService';

// Tipos
import { Sentimiento, Intencion, ArticuloRelevante } from './types';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3010;

// CORS: detrás de Nginx evitar duplicar '*' y credenciales.
// Permitir orígenes explícitos durante desarrollo.
const allowedOrigins = [
  'http://localhost',
  'http://localhost:59471', // Flutter web dev server
  'http://localhost:62422', // Flutter web dev server (puerto puede variar)
];
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origen no permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS','PATCH'],
  allowedHeaders: ['Content-Type','Authorization','Accept'],
  exposedHeaders: ['Content-Length'],
};

// Solo habilitar CORS en el microservicio si se solicita explícitamente.
// En despliegue detrás de Nginx, es preferible que Nginx maneje CORS.
if (process.env.USE_INTERNAL_CORS === 'true') {
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
}
app.use(express.json());

// Pool de PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'lexia_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
});

pool.on('error', (err) => {
  console.error('❌ Error en pool de PostgreSQL:', err);
});

// Inicializar servicios
const conversationService = new ConversationService(pool);
const responseGenerator = new ResponseGenerator();
const lawyerService = new LawyerRecommendationService(pool);
const userClusteringService = new UserClusteringService(pool);
const learningService = new LearningService(pool);

// URLs de servicios
const RAG_URL = process.env.RAG_SERVICE_URL || 'http://localhost:3009';
const NLP_URL = process.env.NLP_SERVICE_URL || 'http://localhost:3004';
const CLUSTERING_URL = process.env.CLUSTERING_SERVICE_URL || 'http://localhost:3002';

// Servicio de Knowledge Base
const knowledgeBaseService = new KnowledgeBaseService(pool, RAG_URL);

// Servicio de respuestas inteligentes
const smartResponseService = new SmartResponseService(pool, RAG_URL);

// Servicio de foro de comunidad
const foroService = new ForoService(pool);

// ============================================================
// ENDPOINTS
// ============================================================

// Health check
app.get('/health', async (req: Request, res: Response) => {
  try {
    const dbHealthy = await pool.query('SELECT NOW()');

    res.json({
      status: 'OK',
      service: 'Chat Service',
      database: dbHealthy ? 'Connected' : 'Disconnected',
      integrations: {
        rag: RAG_URL,
        nlp: NLP_URL,
        clustering: CLUSTERING_URL
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', error: 'Database connection failed' });
  }
});

// Iniciar nueva sesión de chat
app.post('/session/start', async (req: Request, res: Response) => {
  try {
    const { usuarioId, nombre } = req.body;

    if (!usuarioId) {
      return res.status(400).json({ error: 'usuarioId es requerido' });
    }

    // Crear o recuperar sesión
    const session = await conversationService.getOrCreateSession(usuarioId, nombre);

    // Mensaje de bienvenida
    const welcomeMessage = responseGenerator.generateWelcomeMessage(nombre && nombre.trim().length > 0 ? nombre : 'Usuario');

    // Guardar mensaje del sistema
    await conversationService.saveMessage(
      session.id,
      usuarioId,
      'system',
      welcomeMessage
    );

    res.json({
      success: true,
      sessionId: session.id,
      mensaje: welcomeMessage
    });
  } catch (error: any) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ error: error.message });
  }
});

// Enviar mensaje al chat
app.post('/message', async (req: Request, res: Response) => {
  try {
    const { sessionId, mensaje, usuarioId, nombre } = req.body;

    if (!sessionId || !mensaje || !usuarioId) {
      return res.status(400).json({ error: 'sessionId, mensaje y usuarioId son requeridos' });
    }

    // Guardar mensaje del usuario
    await conversationService.saveMessage(sessionId, usuarioId, 'user', mensaje);

    const shortName = (nombre || 'Usuario').split(' ')[0];

    // ============================================================
    // DETECTAR SI ES UN SALUDO
    // ============================================================
    const saludos = ['hola', 'hello', 'hi', 'buenos días', 'buenas tardes', 'buenas noches', 'hey', 'que tal', 'qué tal'];
    const esSaludo = saludos.some(s => mensaje.toLowerCase().trim() === s || mensaje.toLowerCase().startsWith(s + ' '));
    
    if (esSaludo) {
      const respuestaSaludo = smartResponseService.generarSaludo(shortName);
      
      await conversationService.saveMessage(
        sessionId,
        usuarioId,
        'assistant',
        respuestaSaludo,
        { clusterDetectado: 'saludo', contexto: { source: 'greeting' } }
      );
      
      return res.json({
        success: true,
        mensaje: respuestaSaludo,
        articulos: [],
        sugerencias: ['¿Qué documentos necesito para circular?', '¿Qué hago si me para un oficial?', '¿Cómo pago una multa?'],
        cluster: 'saludo',
        sessionId,
        source: 'greeting'
      });
    }

    // ============================================================
    // BUSCAR EN RAG (artículos legales de PDFs)
    // ============================================================
    let articulosLegales: any[] = [];
    let clusterDetectado = 'C1';
    
    try {
      const ragResponse = await axios.post(`${RAG_URL}/search-smart`, {
        query: mensaje,
        usuarioId
      });
      
      clusterDetectado = ragResponse.data.clusterDetectado || 'C1';
      const chunksRecuperados = ragResponse.data.chunksRecuperados || [];
      
      // Convertir chunks a artículos con información completa
      articulosLegales = chunksRecuperados
        .filter((chunk: any) => chunk.similitud >= 0.30)
        .map((chunk: any) => ({
          titulo: chunk.tituloDocumento || chunk.titulo || 'Artículo Legal',
          contenido: chunk.contenido || '',
          fuente: chunk.categoria || chunk.fuente || 'Reglamento de Tránsito de Chiapas',
          similitud: chunk.similitud || 0.5
        }));
        
      console.log(`📚 RAG encontró ${articulosLegales.length} artículos relevantes`);
      
    } catch (ragError) {
      console.log('⚠️ Error consultando RAG, continuando sin artículos');
    }

    // ============================================================
    // ANALIZAR SENTIMIENTO/INTENCIÓN (NLP)
    // ============================================================
    let sentimiento: Sentimiento = 'neutral';
    let intencion: Intencion = 'informacion';

    try {
      const nlpResponse = await axios.post(`${NLP_URL}/process`, {
        textoConsulta: mensaje
      });
      sentimiento = (nlpResponse.data.sentimiento as Sentimiento) || 'neutral';
      intencion = (nlpResponse.data.intencion as Intencion) || 'informacion';
    } catch (nlpError) {
      console.log('⚠️ Error en NLP, usando valores por defecto');
    }

    // ============================================================
    // GENERAR RESPUESTA INTELIGENTE COMPLETA
    // ============================================================
    const resultado = await smartResponseService.generarRespuestaCompleta(
      sessionId,
      usuarioId,
      mensaje,
      shortName,
      articulosLegales
    );

    console.log(`📊 Respuesta generada:`);
    console.log(`   Tema: ${resultado.tema}`);
    console.log(`   Profesionistas ofrecidos: ${resultado.profesionistas?.length || 0}`);
    console.log(`   Anunciantes ofrecidos: ${resultado.anunciantes?.length || 0}`);
    console.log(`   Ofrecer match: ${resultado.ofrecerMatch}`);
    console.log(`   Ofrecer foro: ${resultado.ofrecerForo}`);

    // Guardar respuesta del asistente
    await conversationService.saveMessage(
      sessionId,
      usuarioId,
      'assistant',
      resultado.respuesta,
      {
        clusterDetectado: resultado.tema,
        sentimiento,
        intencion,
        contexto: { 
          source: 'smart_response',
          ragArticles: articulosLegales.length,
          profesionistasOfrecidos: resultado.profesionistas?.length || 0,
          anunciantesOfrecidos: resultado.anunciantes?.length || 0,
          ofrecerMatch: resultado.ofrecerMatch,
          ofrecerForo: resultado.ofrecerForo
        }
      }
    );

    return res.json({
      success: true,
      mensaje: resultado.respuesta,
      articulos: articulosLegales,
      sugerencias: resultado.sugerencias,
      cluster: resultado.tema,
      sentimiento,
      sessionId,
      source: 'smart_response',
      // Datos adicionales para la UI
      profesionistas: resultado.profesionistas,
      anunciantes: resultado.anunciantes,
      ofrecerMatch: resultado.ofrecerMatch,
      ofrecerForo: resultado.ofrecerForo
    });

  } catch (error: any) {
    console.error('Error al procesar mensaje:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener historial de conversación
app.get('/session/:sessionId/history', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const messages = await conversationService.getConversationHistory(sessionId, limit);

    res.json({
      success: true,
      sessionId,
      totalMensajes: messages.length,
      mensajes: messages
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Recomendar abogados
app.post('/recommend-lawyers', async (req: Request, res: Response) => {
  try {
    const { usuarioId, cluster, ciudad, limit } = req.body;

    if (!cluster) {
      return res.status(400).json({ error: 'cluster es requerido' });
    }

    const abogados = await lawyerService.recommendLawyers(
      cluster,
      usuarioId,
      ciudad,
      limit || 10
    );

    res.json({
      success: true,
      cluster,
      totalAbogados: abogados.length,
      abogados
    });
  } catch (error: any) {
    console.error('Error al recomendar abogados:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener Top 10 profesionistas con formato
app.get('/top-profesionistas', async (req: Request, res: Response) => {
  try {
    const especialidades = (req.query.especialidades as string)?.split(',') || [];
    const ciudad = req.query.ciudad as string || 'Tuxtla Gutiérrez';
    const limit = parseInt(req.query.limit as string) || 10;

    const profesionistas = await smartResponseService.getTopProfesionistas(especialidades, ciudad, limit);
    const mensajeFormateado = smartResponseService.formatearTop10Profesionistas(profesionistas);

    res.json({
      success: true,
      totalProfesionistas: profesionistas.length,
      profesionistas,
      mensajeFormateado
    });
  } catch (error: any) {
    console.error('Error al obtener top profesionistas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener anunciantes/servicios
app.get('/anunciantes', async (req: Request, res: Response) => {
  try {
    const categorias = (req.query.categorias as string)?.split(',') || ['Grua', 'Taller'];
    const ciudad = req.query.ciudad as string || 'Tuxtla Gutiérrez';

    const anunciantes = await smartResponseService.getAnunciantes(categorias, ciudad);

    res.json({
      success: true,
      totalAnunciantes: anunciantes.length,
      anunciantes
    });
  } catch (error: any) {
    console.error('Error al obtener anunciantes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Buscar usuarios similares
app.post('/find-similar-users', async (req: Request, res: Response) => {
  try {
    const { usuarioId, cluster, limit } = req.body;

    if (!usuarioId || !cluster) {
      return res.status(400).json({ error: 'usuarioId y cluster son requeridos' });
    }

    const similarUsers = await userClusteringService.findSimilarUsers(
      usuarioId,
      cluster,
      limit || 10
    );

    res.json({
      success: true,
      cluster,
      totalUsuarios: similarUsers.length,
      usuarios: similarUsers
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener grupos del usuario
app.get('/user/:usuarioId/groups', async (req: Request, res: Response) => {
  try {
    const { usuarioId } = req.params;

    const grupos = await userClusteringService.getUserGroups(usuarioId);

    res.json({
      success: true,
      totalGrupos: grupos.length,
      grupos
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Sugerir grupos
app.get('/user/:usuarioId/suggest-groups', async (req: Request, res: Response) => {
  try {
    const { usuarioId } = req.params;

    const sugerencias = await userClusteringService.suggestGroups(usuarioId);

    res.json({
      success: true,
      totalSugerencias: sugerencias.length,
      grupos: sugerencias
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar feedback
app.post('/feedback', async (req: Request, res: Response) => {
  try {
    const { usuarioId, tipo, data } = req.body;

    if (!usuarioId || !tipo) {
      return res.status(400).json({ error: 'usuarioId y tipo son requeridos' });
    }

    await learningService.recordFeedback(usuarioId, tipo, data);

    res.json({
      success: true,
      message: 'Feedback registrado exitosamente'
    });
  } catch (error: any) {
    console.error('Error al registrar feedback:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener métricas de aprendizaje
app.get('/metrics', async (req: Request, res: Response) => {
  try {
    const cluster = req.query.cluster as string;

    const metricas = await learningService.getLearningMetrics(cluster);

    res.json({
      success: true,
      cluster: cluster || 'all',
      metricas
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener top abogados por cluster
app.get('/top-lawyers/:cluster', async (req: Request, res: Response) => {
  try {
    const { cluster } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const abogados = await learningService.getTopLawyers(cluster, limit);

    res.json({
      success: true,
      cluster,
      abogados
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener sesiones del usuario
app.get('/user/:usuarioId/sessions', async (req: Request, res: Response) => {
  try {
    const { usuarioId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const sesiones = await conversationService.getUserSessions(usuarioId, limit);

    res.json({
      success: true,
      totalSesiones: sesiones.length,
      sesiones
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Cerrar sesión
app.post('/session/:sessionId/close', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    await conversationService.closeSession(sessionId);

    const goodbyeMessage = responseGenerator.generateGoodbyeMessage();

    res.json({
      success: true,
      mensaje: goodbyeMessage
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Contactar abogado (tracking)
app.post('/contact-lawyer', async (req: Request, res: Response) => {
  try {
    const { abogadoId, cluster } = req.body;

    if (!abogadoId || !cluster) {
      return res.status(400).json({ error: 'abogadoId y cluster son requeridos' });
    }

    await lawyerService.trackContact(abogadoId, cluster);

    res.json({
      success: true,
      message: 'Contacto registrado'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// HISTORIAL DE CONVERSACIONES
// ============================================================

// Obtener todas las conversaciones (sesiones) del usuario
app.get('/user/:usuarioId/conversations', async (req: Request, res: Response) => {
  try {
    const { usuarioId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    const query = `
      SELECT 
        sc.id,
        sc.titulo,
        sc.cluster_principal,
        sc.total_mensajes,
        sc.fecha_inicio,
        sc.fecha_ultimo_mensaje,
        sc.activa,
        (
          SELECT c.mensaje 
          FROM conversaciones c 
          WHERE c.sesion_id = sc.id AND c.rol = 'user'
          ORDER BY c.fecha DESC 
          LIMIT 1
        ) as ultimo_mensaje
      FROM sesiones_chat sc
      WHERE sc.usuario_id = $1
      ORDER BY sc.fecha_ultimo_mensaje DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [usuarioId, limit]);

    res.json({
      success: true,
      totalConversaciones: result.rows.length,
      conversaciones: result.rows.map(row => ({
        id: row.id,
        titulo: row.titulo || 'Conversación',
        clusterPrincipal: row.cluster_principal,
        totalMensajes: row.total_mensajes,
        fechaInicio: row.fecha_inicio,
        fechaUltimoMensaje: row.fecha_ultimo_mensaje,
        activa: row.activa,
        ultimoMensaje: row.ultimo_mensaje ? row.ultimo_mensaje.substring(0, 100) : null
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener mensajes de una conversación específica (historial completo)
app.get('/conversation/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Obtener info de la sesión
    const sessionQuery = `
      SELECT 
        sc.*,
        u.nombre as usuario_nombre
      FROM sesiones_chat sc
      JOIN usuarios u ON sc.usuario_id = u.id
      WHERE sc.id = $1
    `;
    const sessionResult = await pool.query(sessionQuery, [sessionId]);

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    const session = sessionResult.rows[0];

    // Obtener todos los mensajes de la conversación
    const messagesQuery = `
      SELECT 
        id,
        rol,
        mensaje,
        cluster_detectado,
        sentimiento,
        intencion,
        fecha
      FROM conversaciones
      WHERE sesion_id = $1
      ORDER BY fecha ASC
    `;
    const messagesResult = await pool.query(messagesQuery, [sessionId]);

    res.json({
      success: true,
      conversacion: {
        id: session.id,
        usuarioId: session.usuario_id,
        usuarioNombre: session.usuario_nombre,
        titulo: session.titulo || 'Conversación',
        clusterPrincipal: session.cluster_principal,
        totalMensajes: session.total_mensajes,
        fechaInicio: session.fecha_inicio,
        fechaUltimoMensaje: session.fecha_ultimo_mensaje,
        activa: session.activa
      },
      mensajes: messagesResult.rows.map(row => ({
        id: row.id,
        rol: row.rol,
        mensaje: row.mensaje,
        cluster: row.cluster_detectado,
        sentimiento: row.sentimiento,
        intencion: row.intencion,
        fecha: row.fecha
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// FORO DE COMUNIDAD
// ============================================================

// Obtener categorías del foro
app.get('/foro/categorias', async (req: Request, res: Response) => {
  try {
    const categorias = await foroService.getCategorias();
    res.json({
      success: true,
      categorias
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener publicaciones del foro
app.get('/foro/publicaciones', async (req: Request, res: Response) => {
  try {
    const categoriaId = req.query.categoriaId as string;
    const usuarioId = req.query.usuarioId as string;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const publicaciones = await foroService.getPublicaciones(
      categoriaId,
      usuarioId,
      limit,
      offset
    );

    res.json({
      success: true,
      totalPublicaciones: publicaciones.length,
      publicaciones
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener una publicación con sus comentarios
app.get('/foro/publicacion/:publicacionId', async (req: Request, res: Response) => {
  try {
    const { publicacionId } = req.params;
    const usuarioId = req.query.usuarioId as string;

    const resultado = await foroService.getPublicacion(publicacionId, usuarioId);

    if (!resultado) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    res.json({
      success: true,
      ...resultado
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Crear nueva publicación
app.post('/foro/publicacion', async (req: Request, res: Response) => {
  try {
    const { usuarioId, titulo, contenido, categoriaId } = req.body;

    if (!usuarioId || !titulo || !contenido || !categoriaId) {
      return res.status(400).json({ 
        error: 'usuarioId, titulo, contenido y categoriaId son requeridos' 
      });
    }

    const publicacion = await foroService.crearPublicacion(
      usuarioId,
      titulo,
      contenido,
      categoriaId
    );

    res.json({
      success: true,
      publicacion
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Crear comentario en una publicación
app.post('/foro/publicacion/:publicacionId/comentario', async (req: Request, res: Response) => {
  try {
    const { publicacionId } = req.params;
    const { usuarioId, contenido } = req.body;

    if (!usuarioId || !contenido) {
      return res.status(400).json({ error: 'usuarioId y contenido son requeridos' });
    }

    const comentario = await foroService.crearComentario(
      publicacionId,
      usuarioId,
      contenido
    );

    res.json({
      success: true,
      comentario
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Dar/quitar like a una publicación
app.post('/foro/publicacion/:publicacionId/like', async (req: Request, res: Response) => {
  try {
    const { publicacionId } = req.params;
    const { usuarioId } = req.body;

    if (!usuarioId) {
      return res.status(400).json({ error: 'usuarioId es requerido' });
    }

    const resultado = await foroService.toggleLikePublicacion(publicacionId, usuarioId);

    res.json({
      success: true,
      ...resultado
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Buscar publicaciones
app.get('/foro/buscar', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const categoriaId = req.query.categoriaId as string;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!query) {
      return res.status(400).json({ error: 'Parámetro q (query) es requerido' });
    }

    const publicaciones = await foroService.buscarPublicaciones(query, categoriaId, limit);

    res.json({
      success: true,
      query,
      totalResultados: publicaciones.length,
      publicaciones
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener mis publicaciones
app.get('/foro/mis-publicaciones/:usuarioId', async (req: Request, res: Response) => {
  try {
    const { usuarioId } = req.params;

    const publicaciones = await foroService.getMisPublicaciones(usuarioId);

    res.json({
      success: true,
      totalPublicaciones: publicaciones.length,
      publicaciones
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// INICIAR SERVIDOR
// ============================================================

app.listen(PORT, () => {
  console.log(`🤖 Chat Service corriendo en puerto ${PORT}`);
  console.log(`📊 Integrado con RAG: ${RAG_URL}`);
  console.log(`🧠 Integrado con NLP: ${NLP_URL}`);
  console.log(`🎯 Integrado con Clustering: ${CLUSTERING_URL}`);
  console.log(`💬 Foro de comunidad habilitado`);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando Chat Service...');
  await pool.end();
  process.exit(0);
});

