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

// Tipos
import { Sentimiento, Intencion, ArticuloRelevante } from './types';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3010;

app.use(cors());
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
    const session = await conversationService.getOrCreateSession(usuarioId);

    // Mensaje de bienvenida
    const welcomeMessage = responseGenerator.generateWelcomeMessage(nombre || 'Usuario');

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

    // 1. Procesar con RAG (búsqueda semántica + clustering)
    const ragResponse = await axios.post(`${RAG_URL}/search-smart`, {
      query: mensaje,
      usuarioId
    });

    const {
      clusterDetectado,
      chunksRecuperados,
      contexto,
      tiempoBusquedaMs
    } = ragResponse.data;

    // 2. Analizar sentimiento e intención (NLP)
    let sentimiento: Sentimiento = 'neutral';
    let intencion: Intencion = 'consulta_multa';

    try {
      const nlpResponse = await axios.post(`${NLP_URL}/process`, {
        textoConsulta: mensaje
      });
      sentimiento = nlpResponse.data.intencion || 'neutral';
      intencion = nlpResponse.data.intencion || 'consulta_multa';
    } catch (nlpError) {
      console.log('Error en NLP, usando valores por defecto');
    }

    // 3. Detectar cambio de tema
    const topicChanged = await conversationService.detectTopicChange(
      sessionId,
      clusterDetectado
    );

    // 4. Obtener contexto de conversación
    const conversationContext = await conversationService.getConversationContext(sessionId);

    // 5. Convertir chunks a artículos
    const articulos: ArticuloRelevante[] = chunksRecuperados.map((chunk: any) => ({
      titulo: chunk.tituloDocumento,
      contenido: chunk.contenido,
      fuente: chunk.categoria,
      similitud: chunk.similitud
    }));

    // 6. Generar respuesta empática
    let respuestaTexto: string;

    if (topicChanged) {
      respuestaTexto = responseGenerator.generateTopicChangeMessage(clusterDetectado);
      respuestaTexto += '\n\n';
      respuestaTexto += responseGenerator.generateResponse(
        nombre || 'Usuario',
        sentimiento,
        intencion,
        articulos,
        clusterDetectado
      );
    } else {
      respuestaTexto = responseGenerator.generateResponse(
        nombre || 'Usuario',
        sentimiento,
        intencion,
        articulos,
        clusterDetectado,
        topicChanged ? undefined : conversationContext
      );
    }

    // 7. Generar sugerencias
    const sugerencias = responseGenerator.generateSuggestions(
      clusterDetectado,
      intencion,
      sentimiento
    );

    // 8. Guardar respuesta del asistente
    await conversationService.saveMessage(
      sessionId,
      usuarioId,
      'assistant',
      respuestaTexto,
      {
        clusterDetectado,
        sentimiento,
        intencion,
        contexto: { articulos, tiempoBusquedaMs }
      }
    );

    // 9. Agregar usuario a grupo automáticamente
    if (process.env.AUTO_GROUP_USERS === 'true') {
      await userClusteringService.addUserToGroup(usuarioId, clusterDetectado);
    }

    res.json({
      success: true,
      mensaje: respuestaTexto,
      articulos,
      sugerencias,
      cluster: clusterDetectado,
      sentimiento,
      sessionId
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
// INICIAR SERVIDOR
// ============================================================

app.listen(PORT, () => {
  console.log(`🤖 Chat Service corriendo en puerto ${PORT}`);
  console.log(`📊 Integrado con RAG: ${RAG_URL}`);
  console.log(`🧠 Integrado con NLP: ${NLP_URL}`);
  console.log(`🎯 Integrado con Clustering: ${CLUSTERING_URL}`);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando Chat Service...');
  await pool.end();
  process.exit(0);
});
