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
import { legalNormalizer } from './services/LegalNormalizer';
import { ForoService } from './services/ForoService';
import { MensajesPrivadosService } from './services/MensajesPrivadosService';
import { OLAPIntegrationService } from './services/OLAPIntegrationService';
import { slangNormalizer } from './utils/SlangNormalizer';
import { conversationStateMachine } from './services/ConversationStateMachine';

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
const OLAP_URL = process.env.OLAP_SERVICE_URL || 'http://olap-cube:3001';

// Servicio de Knowledge Base
const knowledgeBaseService = new KnowledgeBaseService(pool, RAG_URL);

// Servicio de respuestas inteligentes
const smartResponseService = new SmartResponseService(pool, RAG_URL, conversationService);

// Servicio de foro de comunidad
const foroService = new ForoService(pool);

// Servicio de mensajes privados (1:1)
const mensajesPrivadosService = new MensajesPrivadosService(pool);

// Servicio de integración con OLAP Cube (Analytics y ML)
const olapService = new OLAPIntegrationService(OLAP_URL);

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
    // DETECTAR SI ES UN SALUDO PURO (sin contenido real)
    // ============================================================
    const saludos = ['hola', 'hello', 'hi', 'buenos días', 'buenas tardes', 'buenas noches', 'hey', 'que tal', 'qué tal'];
    const msgLower = mensaje.toLowerCase().trim();
    
    // Palabras que indican que hay contenido real (NO es solo saludo)
    const palabrasContenido = [
      'licencia', 'renovar', 'multa', 'accidente', 'choque', 'policia', 'policía',
      'grua', 'grúa', 'donde', 'dónde', 'como', 'cómo', 'puedo', 'necesito', 'ayuda',
      'detuvieron', 'chocaron', 'atropello', 'derechos', 'documento', 'sabes', 'puedes'
    ];
    const tieneContenido = palabrasContenido.some(p => msgLower.includes(p));
    
    // Es saludo puro SOLO si: coincide con patrón de saludo, es corto (<20 chars), y NO tiene contenido
    const coincideSaludo = saludos.some(s => msgLower === s || (msgLower.startsWith(s + ' ') && msgLower.length < 20));
    const esSaludo = coincideSaludo && !tieneContenido;
    
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
    // NORMALIZAR SLANG A LENGUAJE LEGAL ("Traductor de Barrio")
    // ============================================================
    const mensajeNormalizado = slangNormalizer.normalize(mensaje);
    const mensajeLegalNormalizado = legalNormalizer.normalize(mensaje);
    const contextoDetectado = legalNormalizer.detectarContexto(mensaje);
    const consultaLegal = legalNormalizer.buildConsultaLegal(mensajeLegalNormalizado, contextoDetectado);
    const hasSlang = slangNormalizer.hasSlang(mensaje);

    console.log(`🔄 Traductor de Barrio:`);
    console.log(`   Original: "${mensaje}"`);
    console.log(`   Normalizado: "${mensajeNormalizado}"`);
    console.log(`   Legal: "${mensajeLegalNormalizado}"`);
    console.log(`   Contiene slang: ${hasSlang ? 'SÍ' : 'NO'}`);
    console.log(`📊 Contexto detectado:`);
    console.log(`   Culpabilidad: ${contextoDetectado.culpabilidad}`);
    console.log(`   Urgencia: ${contextoDetectado.urgencia}`);
    console.log(`   Emoción: ${contextoDetectado.emocion}`);
    console.log(`   Actores: ${contextoDetectado.actores.join(', ')}`);
    if (contextoDetectado.hayHeridos) console.log(`   ⚠️ HAY HERIDOS`);
    if (!contextoDetectado.llamoAutoridades && contextoDetectado.urgencia === 'alta') {
      console.log(`   ⚠️ NO HA LLAMADO A AUTORIDADES`);
    }

    // ============================================================
    // PRE-DETECTAR TEMA PARA MÁQUINA DE ESTADOS
    // ============================================================
    const temaPreDetectado = smartResponseService.detectarTemaPreliminar(mensajeNormalizado);
    console.log(`🎯 Tema pre-detectado: ${temaPreDetectado}`);

    // Detectar tema con confianza para decidir saltar interrogador
    const deteccionCompleta = smartResponseService.detectarTemaConConfianza(mensajeNormalizado);
    const temasUrgentesNoInterrogador = ['accidente', 'atropello', 'alcohol', 'derechos', 'fuga_autoridad'];
    const skipInterrogation = temasUrgentesNoInterrogador.includes(deteccionCompleta.tema);

    // ============================================================
    // AGENTE INTERROGADOR - Verificar si necesitamos más información
    // ============================================================
    const interrogationResult = await conversationStateMachine.procesarMensaje(
      sessionId,
      mensaje,
      temaPreDetectado
    );

    console.log(`🤔 Agente Interrogador:`);
    console.log(`   Estado actual: ${interrogationResult.estadoActual}`);
    console.log(`   Necesita más info: ${interrogationResult.necesitaMasInfo}`);
    console.log(`   Puede consultar RAG: ${interrogationResult.puedeConsultarRAG}`);
    if (interrogationResult.noEntendioRespuesta) {
      console.log(`   ⚠️ No entendió la respuesta, intento ${interrogationResult.intentoActual}/${interrogationResult.maxIntentos}`);
    }
    if (interrogationResult.resumenContexto) {
      console.log(`   Contexto: ${interrogationResult.resumenContexto}`);
    }

    // Si necesitamos más información, hacer la pregunta al usuario
    if (!skipInterrogation && interrogationResult.necesitaMasInfo && interrogationResult.siguientePregunta) {
      
      // SIEMPRE usar el formato "Javi, necesito un poco más de información para ayudarte mejor"
      let preguntaFormateada = `${shortName}, necesito un poco más de información para ayudarte mejor:\n\n`;
      
      // Si no entendió la respuesta anterior, agregar aclaración
      if (interrogationResult.noEntendioRespuesta) {
        preguntaFormateada += `🤔 _No entendí tu respuesta anterior, déjame reformular:_\n\n`;
      }
      
      preguntaFormateada += `❓ **${interrogationResult.siguientePregunta}**`;
      
      // Formatear opciones si las hay
      let respuestaConOpciones = preguntaFormateada;
      if (interrogationResult.opcionesSugeridas && interrogationResult.opcionesSugeridas.length > 0) {
        respuestaConOpciones += '\n\n📌 **Opciones:**\n';
        interrogationResult.opcionesSugeridas.forEach((opcion, i) => {
          respuestaConOpciones += `${i + 1}. ${opcion}\n`;
        });
      }

      // Guardar pregunta del sistema
      await conversationService.saveMessage(
        sessionId,
        usuarioId,
        'assistant',
        respuestaConOpciones,
        {
          clusterDetectado: temaPreDetectado,
          contexto: { 
            source: 'interrogation',
            estadoActual: interrogationResult.estadoActual,
            esperandoRespuesta: true,
            noEntendioRespuesta: interrogationResult.noEntendioRespuesta || false,
            intentoActual: interrogationResult.intentoActual || 1
          }
        }
      );

      return res.json({
        success: true,
        mensaje: respuestaConOpciones,
        articulos: [],
        sugerencias: interrogationResult.opcionesSugeridas || [],
        cluster: temaPreDetectado,
        sessionId,
        source: 'interrogation',
        interrogando: true,
        estadoInterrogacion: interrogationResult.estadoActual,
        noEntendioRespuesta: interrogationResult.noEntendioRespuesta || false,
        intentoActual: interrogationResult.intentoActual || 1
      });
    }

    // ============================================================
    // BUSCAR EN RAG (usando texto NORMALIZADO + contexto recopilado)
    // ============================================================
    let articulosLegales: any[] = [];
    let clusterDetectado = 'C1';

    // Enriquecer query con contexto del interrogador Y contexto emocional
    let queryParaRAG = consultaLegal;

    // Agregar tags de contexto emocional para mejor ranking en RAG
    const contextTags: string[] = [];
    if (contextoDetectado.urgencia === 'alta') contextTags.push('urgente');
    if (contextoDetectado.hayHeridos) contextTags.push('lesionados graves');
    if (contextoDetectado.culpabilidad === 'usuario_culpable') contextTags.push('responsabilidad civil');
    if (contextoDetectado.culpabilidad === 'usuario_victima') contextTags.push('derechos víctima');
    if (!contextoDetectado.llamoAutoridades && contextoDetectado.urgencia === 'alta') {
      contextTags.push('debe llamar 911');
    }

    if (interrogationResult.resumenContexto) {
      // Agregar palabras clave del contexto para mejorar búsqueda RAG
      const contextoParts = interrogationResult.resumenContexto
        .replace('📋 CONTEXTO RECOPILADO:', '')
        .replace(/•/g, '')
        .split('\n')
        .filter(p => p.trim().length > 0)
        .join(' ');
      queryParaRAG = `${queryParaRAG} ${contextoParts}`;
    }

    // Agregar context tags al final
    if (contextTags.length > 0) {
      queryParaRAG = `${queryParaRAG} [contexto: ${contextTags.join(', ')}]`;
    }

    console.log(`🔍 Query para RAG (${queryParaRAG.length} chars):`);
    console.log(`   "${queryParaRAG.substring(0, 150)}..."`);
    if (contextTags.length > 0) {
      console.log(`   Tags contexto: ${contextTags.join(', ')}`);
    }
    
    try {
      const ragResponse = await axios.post(`${RAG_URL}/search-smart`, {
        query: queryParaRAG,
        usuarioId
      });
      
      clusterDetectado = ragResponse.data.clusterDetectado || 'C1';
      const chunksRecuperados = ragResponse.data.chunksRecuperados || [];
      
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

    // Si tenemos contexto del interrogador, agregarlo al inicio de la respuesta
    let respuestaFinal = resultado.respuesta;
    if (interrogationResult.resumenContexto && interrogationResult.contextoCompleto) {
      // Si hay contexto recopilado de las preguntas, mostrarlo como resumen
      const contextoFormateado = `✅ **Entendido.** He anotado la siguiente información:\n${interrogationResult.resumenContexto}\n\n---\n\n`;
      respuestaFinal = contextoFormateado + respuestaFinal;
    }

    console.log(`📊 Respuesta generada:`);
    console.log(`   Tema: ${resultado.tema}`);
    console.log(`   Profesionistas ofrecidos: ${resultado.profesionistas?.length || 0}`);
    console.log(`   Anunciantes ofrecidos: ${resultado.anunciantes?.length || 0}`);
    console.log(`   Ofrecer match: ${resultado.ofrecerMatch}`);
    console.log(`   Ofrecer foro: ${resultado.ofrecerForo}`);
    if (interrogationResult.contextoCompleto) {
      console.log(`   Contexto del interrogador: ${Object.keys(interrogationResult.contextoCompleto.respuestasObtenidas).length} respuestas`);
    }

    // Guardar respuesta del asistente
    await conversationService.saveMessage(
      sessionId,
      usuarioId,
      'assistant',
      respuestaFinal,
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
          ofrecerForo: resultado.ofrecerForo,
          contextoInterrogador: interrogationResult.contextoCompleto || null
        }
      }
    );

    // ============================================================
    // REGISTRAR EN OLAP CUBE para Analytics y ML
    // ============================================================
    await olapService.registrarConsulta({
      textoConsulta: mensaje,
      usuarioId: usuarioId,
      intencion: intencion || 'informacion',
      cluster: resultado.tema,
      sentimiento: sentimiento,
      articulosEncontrados: articulosLegales.length,
      profesionistasRecomendados: resultado.profesionistas?.length || 0,
      ubicacion: {} // Se puede obtener del perfil del usuario en futuras versiones
    });

    return res.json({
      success: true,
      mensaje: respuestaFinal,
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
      ofrecerForo: resultado.ofrecerForo,
      contextoRecopilado: interrogationResult.contextoCompleto || null
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
// MENSAJES PRIVADOS (1:1)
// ============================================================

// Obtener todas las conversaciones privadas del usuario
app.get('/mensajes/conversaciones/:usuarioId', async (req: Request, res: Response) => {
  try {
    const { usuarioId } = req.params;

    const conversaciones = await mensajesPrivadosService.getConversaciones(usuarioId);

    res.json({
      success: true,
      totalConversaciones: conversaciones.length,
      conversaciones
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener mensajes de una conversación específica
app.get('/mensajes/:ciudadanoId/:abogadoId', async (req: Request, res: Response) => {
  try {
    const { ciudadanoId, abogadoId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const mensajes = await mensajesPrivadosService.getMensajes(ciudadanoId, abogadoId, limit);

    res.json({
      success: true,
      totalMensajes: mensajes.length,
      mensajes
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Enviar un mensaje privado
app.post('/mensajes/enviar', async (req: Request, res: Response) => {
  try {
    const { ciudadanoId, abogadoId, remitenteId, contenido } = req.body;

    if (!ciudadanoId || !abogadoId || !remitenteId || !contenido) {
      return res.status(400).json({ 
        error: 'ciudadanoId, abogadoId, remitenteId y contenido son requeridos' 
      });
    }

    const mensaje = await mensajesPrivadosService.enviarMensaje(
      ciudadanoId, 
      abogadoId, 
      remitenteId, 
      contenido
    );

    res.json({
      success: true,
      mensaje
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Marcar mensajes como leídos
app.post('/mensajes/marcar-leidos', async (req: Request, res: Response) => {
  try {
    const { ciudadanoId, abogadoId, lectorId } = req.body;

    if (!ciudadanoId || !abogadoId || !lectorId) {
      return res.status(400).json({ 
        error: 'ciudadanoId, abogadoId y lectorId son requeridos' 
      });
    }

    const marcados = await mensajesPrivadosService.marcarComoLeidos(
      ciudadanoId, 
      abogadoId, 
      lectorId
    );

    res.json({
      success: true,
      mensajesMarcados: marcados
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener cantidad de mensajes no leídos
app.get('/mensajes/no-leidos/:usuarioId', async (req: Request, res: Response) => {
  try {
    const { usuarioId } = req.params;

    const noLeidos = await mensajesPrivadosService.getMensajesNoLeidos(usuarioId);

    res.json({
      success: true,
      noLeidos
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Crear nueva conversación
app.post('/mensajes/conversacion', async (req: Request, res: Response) => {
  try {
    const { ciudadanoId, abogadoId, mensajeInicial } = req.body;

    if (!ciudadanoId || !abogadoId) {
      return res.status(400).json({ 
        error: 'ciudadanoId y abogadoId son requeridos' 
      });
    }

    const conversacion = await mensajesPrivadosService.crearConversacion(
      ciudadanoId, 
      abogadoId, 
      mensajeInicial
    );

    res.json({
      success: true,
      conversacion
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GESTIÓN DE GRUPOS (CLUSTERING AUTOMÁTICO)
// ============================================================

/**
 * GET /user/:usuarioId/mis-grupos
 * Obtiene todos los grupos a los que pertenece el usuario
 */
app.get('/user/:usuarioId/mis-grupos', async (req: Request, res: Response) => {
  try {
    const { usuarioId } = req.params;

    const query = `
      SELECT 
        gu.id,
        gu.cluster,
        gu.nombre,
        gu.descripcion,
        gu.total_miembros,
        gu.fecha_creacion,
        json_agg(
          json_build_object(
            'usuarioId', gm.usuario_id,
            'fechaUnion', gm.fecha_union,
            'participaciones', gm.total_participaciones
          ) ORDER BY gm.total_participaciones DESC
        ) FILTER (WHERE gm.usuario_id IS NOT NULL AND row_number <= 5) as miembros_preview
      FROM grupos_usuarios gu
      INNER JOIN grupo_miembros gm ON gu.id = gm.grupo_id AND gm.activo = TRUE
      WHERE gm.usuario_id = $1 AND gu.activo = TRUE
      GROUP BY gu.id, gu.cluster, gu.nombre, gu.descripcion, gu.total_miembros, gu.fecha_creacion
      ORDER BY gm.fecha_union DESC
    `;

    const result = await pool.query(query, [usuarioId]);

    res.json({
      success: true,
      totalGrupos: result.rows.length,
      grupos: result.rows
    });
  } catch (error: any) {
    console.error('Error obteniendo grupos del usuario:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /grupos/:grupoId/estadisticas
 * Obtiene estadísticas del grupo incluyendo miembros y actividad
 */
app.get('/grupos/:grupoId/estadisticas', async (req: Request, res: Response) => {
  try {
    const { grupoId } = req.params;

    const groupQuery = `
      SELECT 
        gu.id,
        gu.cluster,
        gu.nombre,
        gu.descripcion,
        gu.total_miembros,
        gu.fecha_creacion,
        COUNT(DISTINCT gm.usuario_id) as miembros_activos,
        SUM(gm.total_participaciones) as total_participaciones
      FROM grupos_usuarios gu
      LEFT JOIN grupo_miembros gm ON gu.id = gm.grupo_id AND gm.activo = TRUE
      WHERE gu.id = $1
      GROUP BY gu.id, gu.cluster, gu.nombre, gu.descripcion, gu.total_miembros, gu.fecha_creacion
    `;

    const membersQuery = `
      SELECT 
        gm.usuario_id,
        gm.fecha_union,
        gm.total_participaciones,
        gm.activo
      FROM grupo_miembros gm
      WHERE gm.grupo_id = $1 AND gm.activo = TRUE
      ORDER BY gm.total_participaciones DESC
      LIMIT 10
    `;

    const groupResult = await pool.query(groupQuery, [grupoId]);
    const membersResult = await pool.query(membersQuery, [grupoId]);

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    const grupo = groupResult.rows[0];

    res.json({
      success: true,
      grupo: {
        ...grupo,
        miembros_preview: membersResult.rows.slice(0, 5),
        total_miembros_en_estadisticas: membersResult.rows.length
      }
    });
  } catch (error: any) {
    console.error('Error obteniendo estadísticas del grupo:', error);
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
  console.log(`📨 Chat privado 1:1 habilitado`);
  console.log(`👥 Agrupamiento automático por clusters habilitado`);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando Chat Service...');
  await pool.end();
  process.exit(0);
});

