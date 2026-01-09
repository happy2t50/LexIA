import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import axios from 'axios';

import { ConversationService } from './services/ConversationService';
import { ResponseGenerator } from './services/ResponseGenerator';
import { LawyerRecommendationService } from './services/LawyerRecommendationService';
import { UserClusteringService } from './services/UserClusteringService';
import { LearningService } from './services/LearningService';
import { SmartResponseService } from './services/SmartResponseService';
import { legalNormalizer } from './services/LegalNormalizer';
import { ForoService } from './services/ForoService';
import { MensajesPrivadosService } from './services/MensajesPrivadosService';
import { OLAPIntegrationService } from './services/OLAPIntegrationService';
import { slangNormalizer } from './utils/SlangNormalizer';
import { conversationStateMachine } from './services/ConversationStateMachine';
import { Sentimiento, Intencion, ArticuloRelevante } from './types';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3010;


const allowedOrigins = [
  'http://localhost',
  'http://localhost:59471', 
  'http://localhost:62422', 
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


if (process.env.USE_INTERNAL_CORS === 'true') {
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
}
app.use(express.json());


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


const conversationService = new ConversationService(pool);
const responseGenerator = new ResponseGenerator();
const lawyerService = new LawyerRecommendationService(pool);
const userClusteringService = new UserClusteringService(pool);
const learningService = new LearningService(pool);


const RAG_URL = process.env.RAG_SERVICE_URL || 'http://localhost:3009';
const NLP_URL = process.env.NLP_SERVICE_URL || 'http://localhost:3004';
const CLUSTERING_URL = process.env.CLUSTERING_SERVICE_URL || 'http://localhost:3002';
const OLAP_URL = process.env.OLAP_SERVICE_URL || 'http://olap-cube:3001';


const smartResponseService = new SmartResponseService(pool, RAG_URL, conversationService, CLUSTERING_URL);


const foroService = new ForoService(pool);


const mensajesPrivadosService = new MensajesPrivadosService(pool);


const olapService = new OLAPIntegrationService(OLAP_URL);


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


app.post('/session/start', async (req: Request, res: Response) => {
  try {
    const { usuarioId, nombre } = req.body;

    if (!usuarioId) {
      return res.status(400).json({ error: 'usuarioId es requerido' });
    }

    
    const session = await conversationService.getOrCreateSession(usuarioId, nombre);

    
    const welcomeMessage = responseGenerator.generateWelcomeMessage(nombre && nombre.trim().length > 0 ? nombre : 'Usuario');

    
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


app.post('/message', async (req: Request, res: Response) => {
  try {
    const { sessionId, mensaje, usuarioId, nombre } = req.body;

    if (!sessionId || !mensaje || !usuarioId) {
      return res.status(400).json({ error: 'sessionId, mensaje y usuarioId son requeridos' });
    }

    
    await conversationService.saveMessage(sessionId, usuarioId, 'user', mensaje);

    const shortName = (nombre || 'Usuario').split(' ')[0];

    
    const saludos = ['hola', 'hello', 'hi', 'buenos días', 'buenas tardes', 'buenas noches', 'hey', 'que tal', 'qué tal'];
    const msgLower = mensaje.toLowerCase().trim();
    
    
    const palabrasContenido = [
      'licencia', 'renovar', 'multa', 'accidente', 'choque', 'policia', 'policía',
      'grua', 'grúa', 'donde', 'dónde', 'como', 'cómo', 'puedo', 'necesito', 'ayuda',
      'detuvieron', 'chocaron', 'atropello', 'derechos', 'documento', 'sabes', 'puedes'
    ];
    const tieneContenido = palabrasContenido.some(p => msgLower.includes(p));
    
   
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

    
    const mensajeNormalizado = slangNormalizer.normalize(mensaje);
    const mensajeLegalNormalizado = legalNormalizer.normalize(mensaje);
    const contextoDetectado = legalNormalizer.detectarContexto(mensaje);
    const consultaLegal = legalNormalizer.buildConsultaLegal(mensajeLegalNormalizado, contextoDetectado);
    const hasSlang = slangNormalizer.hasSlang(mensaje);

    console.log(` Traductor de Barrio:`);
    console.log(`   Original: "${mensaje}"`);
    console.log(`   Normalizado: "${mensajeNormalizado}"`);
    console.log(`   Legal: "${mensajeLegalNormalizado}"`);
    console.log(`   Contiene slang: ${hasSlang ? 'SÍ' : 'NO'}`);
    console.log(` Contexto detectado:`);
    console.log(`   Culpabilidad: ${contextoDetectado.culpabilidad}`);
    console.log(`   Urgencia: ${contextoDetectado.urgencia}`);
    console.log(`   Emoción: ${contextoDetectado.emocion}`);
    console.log(`   Actores: ${contextoDetectado.actores.join(', ')}`);
    if (contextoDetectado.hayHeridos) console.log(`    HAY HERIDOS`);
    if (!contextoDetectado.llamoAutoridades && contextoDetectado.urgencia === 'alta') {
      console.log(`    NO HA LLAMADO A AUTORIDADES`);
    }

    
    const temaPreDetectado = await smartResponseService.detectarTemaPreliminar(mensajeNormalizado);
    console.log(` Tema pre-detectado: ${temaPreDetectado}`);

    
    const deteccionCompleta = await smartResponseService.detectarTemaConConfianza(mensajeNormalizado);
    const temasUrgentesNoInterrogador = ['accidente', 'atropello', 'alcohol', 'derechos', 'fuga_autoridad'];
    const skipInterrogation = temasUrgentesNoInterrogador.includes(deteccionCompleta.tema);

   
    const interrogationResult = await conversationStateMachine.procesarMensaje(
      sessionId,
      mensaje,
      temaPreDetectado
    );

    console.log(` Agente Interrogador:`);
    console.log(`   Estado actual: ${interrogationResult.estadoActual}`);
    console.log(`   Necesita más info: ${interrogationResult.necesitaMasInfo}`);
    console.log(`   Puede consultar RAG: ${interrogationResult.puedeConsultarRAG}`);
    if (interrogationResult.noEntendioRespuesta) {
      console.log(`    No entendió la respuesta, intento ${interrogationResult.intentoActual}/${interrogationResult.maxIntentos}`);
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
        preguntaFormateada += ` _No entendí tu respuesta anterior, déjame reformular:_\n\n`;
      }
      
      preguntaFormateada += ` **${interrogationResult.siguientePregunta}**`;
      
      
      let respuestaConOpciones = preguntaFormateada;
      if (interrogationResult.opcionesSugeridas && interrogationResult.opcionesSugeridas.length > 0) {
        respuestaConOpciones += '\n\n📌 **Opciones:**\n';
        interrogationResult.opcionesSugeridas.forEach((opcion, i) => {
          respuestaConOpciones += `${i + 1}. ${opcion}\n`;
        });
      }

      
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

  
    let articulosLegales: any[] = [];
    let clusterDetectado = 'C1';

    
    let queryParaRAG = consultaLegal;

    
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
        .replace(' CONTEXTO RECOPILADO:', '')
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
      console.log(`🔍 Llamando RAG en: ${RAG_URL}/search`);
      console.log(`   Query: "${queryParaRAG.substring(0, 100)}..."`);
      
      const ragResponse = await axios.post(`${RAG_URL}/search`, {
        query: queryParaRAG,
        topK: 8
      }, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log(`✅ RAG respondió con status ${ragResponse.status}`);
      console.log(`   Chunks: ${ragResponse.data.chunksRecuperados?.length || 0}`);
      
      clusterDetectado = 'C6'; 
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
      
    } catch (ragError: any) {
      console.log('❌ Error consultando RAG:', ragError.message);
      console.log('   URL:', `${RAG_URL}/search`);
      if (ragError.response) {
        console.log('   Status:', ragError.response.status);
        console.log('   Data:', ragError.response.data);
      }
    }

    
    let sentimiento: Sentimiento = 'neutral';
    let intencion: Intencion = 'informacion';

    try {
      const nlpResponse = await axios.post(`${NLP_URL}/process`, {
        textoConsulta: mensaje
      });
      sentimiento = (nlpResponse.data.sentimiento as Sentimiento) || 'neutral';
      intencion = (nlpResponse.data.intencion as Intencion) || 'informacion';
    } catch (nlpError) {
      console.log(' Error en NLP, usando valores por defecto');
    }

    
    const resultado = await smartResponseService.generarRespuestaCompleta(
      sessionId,
      usuarioId,
      mensaje,
      shortName,
      articulosLegales
    );

    
    let respuestaFinal = resultado.respuesta;
    if (interrogationResult.resumenContexto && interrogationResult.contextoCompleto) {
      
      const contextoFormateado = `\n\n---\n\n✅ **Contexto recopilado:**\n${interrogationResult.resumenContexto}`;
      respuestaFinal = respuestaFinal + contextoFormateado;
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

    
    await olapService.registrarConsulta({
      textoConsulta: mensaje,
      usuarioId: usuarioId,
      intencion: intencion || 'informacion',
      cluster: resultado.tema,
      sentimiento: sentimiento,
      articulosEncontrados: articulosLegales.length,
      profesionistasRecomendados: resultado.profesionistas?.length || 0,
      ubicacion: {} 
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


app.post('/recommend-lawyers', async (req: Request, res: Response) => {
  try {
    const { usuarioId, cluster, ciudad, limit } = req.body;

    if (!cluster) {
      return res.status(400).json({ error: 'cluster es requerido' });
    }

    
    const profesionistasBloqueados = await olapService.obtenerProfesionistasBloquados(usuarioId);

    const abogados = await lawyerService.recommendLawyers(
      cluster,
      usuarioId,
      ciudad,
      limit || 10,
      profesionistasBloqueados
    );

    res.json({
      success: true,
      cluster,
      totalAbogados: abogados.length,
      bloqueados: profesionistasBloqueados.length,
      abogados
    });
  } catch (error: any) {
    console.error('Error al recomendar abogados:', error);
    res.status(500).json({ error: error.message });
  }
});


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


app.delete('/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId es requerido' });
    }

    
    const deleteMessagesQuery = `
      DELETE FROM conversaciones
      WHERE sesion_id = $1
    `;
    await pool.query(deleteMessagesQuery, [sessionId]);

    
    const deleteSessionQuery = `
      DELETE FROM sesiones_chat
      WHERE id = $1
    `;
    const result = await pool.query(deleteSessionQuery, [sessionId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    res.json({
      success: true,
      message: 'Sesión eliminada correctamente'
    });
  } catch (error: any) {
    console.error('Error al eliminar sesión:', error);
    res.status(500).json({ error: error.message });
  }
});


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


app.post('/profesionista/aceptar', async (req: Request, res: Response) => {
  try {
    const { usuarioId, profesionistaId, cluster, tipoAccion } = req.body;

    if (!usuarioId || !profesionistaId || !cluster) {
      return res.status(400).json({ 
        error: 'usuarioId, profesionistaId y cluster son requeridos' 
      });
    }

    
    await olapService.registrarAceptacionProfesionista({
      usuarioId,
      profesionistaId,
      cluster,
      tipoAccion: tipoAccion || 'contacto'
    });

    
    await lawyerService.trackContact(profesionistaId, cluster);

    console.log(`✅ Profesionista ${profesionistaId.substring(0, 8)} aceptado por usuario ${usuarioId.substring(0, 8)}`);

    res.json({
      success: true,
      message: 'Aceptación registrada correctamente'
    });
  } catch (error: any) {
    console.error('Error registrando aceptación:', error);
    res.status(500).json({ error: error.message });
  }
});


app.post('/profesionista/rechazar', async (req: Request, res: Response) => {
  try {
    const { usuarioId, profesionistaId, cluster, razon } = req.body;

    if (!usuarioId || !profesionistaId || !cluster) {
      return res.status(400).json({ 
        error: 'usuarioId, profesionistaId y cluster son requeridos' 
      });
    }

    
    await olapService.registrarRechazoProfesionista({
      usuarioId,
      profesionistaId,
      cluster,
      razon
    });

    // Verificar si ya tiene 3+ rechazos
    const totalRechazos = await olapService.obtenerRechazosUsuario(usuarioId, profesionistaId);

    console.log(`❌ Profesionista ${profesionistaId.substring(0, 8)} rechazado por usuario ${usuarioId.substring(0, 8)} (Total: ${totalRechazos})`);

    res.json({
      success: true,
      message: 'Rechazo registrado correctamente',
      totalRechazos,
      bloqueado: totalRechazos >= 3
    });
  } catch (error: any) {
    console.error('Error registrando rechazo:', error);
    res.status(500).json({ error: error.message });
  }
});


app.get('/usuario/:usuarioId/profesionistas-bloqueados', async (req: Request, res: Response) => {
  try {
    const { usuarioId } = req.params;
    const bloqueados = await olapService.obtenerProfesionistasBloquados(usuarioId);

    res.json({
      success: true,
      bloqueados,
      total: bloqueados.length
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


app.post('/profesionista/calificar', async (req: Request, res: Response) => {
  try {
    const { usuarioId, profesionistaId, rating, comentario } = req.body;

    if (!usuarioId || !profesionistaId || !rating) {
      return res.status(400).json({ 
        error: 'usuarioId, profesionistaId y rating son requeridos' 
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating debe ser entre 1 y 5 estrellas' });
    }

    await olapService.calificarProfesionista({
      usuarioId,
      profesionistaId,
      rating,
      comentario
    });

    console.log(`⭐ Usuario ${usuarioId.substring(0, 8)} calificó con ${rating}/5 a profesionista ${profesionistaId.substring(0, 8)}`);

    res.json({
      success: true,
      message: 'Calificación registrada correctamente'
    });
  } catch (error: any) {
    console.error('Error calificando profesionista:', error);
    res.status(500).json({ error: error.message });
  }
});


app.get('/profesionista/:profesionistaId/rating', async (req: Request, res: Response) => {
  try {
    const { profesionistaId } = req.params;
    const rating = await olapService.obtenerRatingProfesionista(profesionistaId);

    res.json({
      success: true,
      ...rating
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// Registrar preferencia de "no me interesa" (X) - usa el mismo endpoint que rechazar
app.post('/profesionista/preferencia', async (req: Request, res: Response) => {
  try {
    const { usuarioId, profesionistaId, cluster } = req.body;

    if (!usuarioId || !profesionistaId) {
      return res.status(400).json({ 
        error: 'usuarioId y profesionistaId son requeridos' 
      });
    }

    // Registrar como rechazo en OLAP (3 rechazos = bloqueado)
    await olapService.registrarRechazoProfesionista({
      usuarioId,
      profesionistaId,
      cluster: cluster || 'general'
    });

    console.log(`❌ Usuario ${usuarioId.substring(0, 8)} marcó "no interesa" a profesionista ${profesionistaId.substring(0, 8)}`);

    res.json({
      success: true,
      message: 'Preferencia registrada correctamente'
    });
  } catch (error: any) {
    console.error('Error registrando preferencia:', error);
    res.status(500).json({ error: error.message });
  }
});


// Reportar profesionista
app.post('/profesionista/reportar', async (req: Request, res: Response) => {
  try {
    const { usuarioId, profesionistaId, motivo, descripcion } = req.body;

    if (!usuarioId || !profesionistaId || !motivo) {
      return res.status(400).json({ 
        error: 'usuarioId, profesionistaId y motivo son requeridos' 
      });
    }

    // Insertar reporte en base de datos
    await pool.query(
      `INSERT INTO reportes_profesionistas 
       (usuario_id, profesionista_id, motivo, descripcion, fecha_reporte, estado) 
       VALUES ($1, $2, $3, $4, NOW(), 'pendiente')`,
      [usuarioId, profesionistaId, motivo, descripcion || null]
    );

    console.log(`🚨 REPORTE: Usuario ${usuarioId.substring(0, 8)} reportó a profesionista ${profesionistaId.substring(0, 8)} por: ${motivo}`);

    res.json({
      success: true,
      message: 'Reporte enviado al administrador correctamente'
    });
  } catch (error: any) {
    console.error('Error reportando profesionista:', error);
    res.status(500).json({ error: error.message });
  }
});


// Bloquear profesionista (envía últimos 10 mensajes al admin)
app.post('/profesionista/bloquear', async (req: Request, res: Response) => {
  try {
    const { usuarioId, profesionistaId, motivo } = req.body;

    if (!usuarioId || !profesionistaId) {
      return res.status(400).json({ 
        error: 'usuarioId y profesionistaId son requeridos' 
      });
    }

    // Obtener últimos 10 mensajes de la conversación
    const mensajesQuery = await pool.query(
      `SELECT contenido, remitente_id, fecha_envio 
       FROM mensajes_privados 
       WHERE (remitente_id = $1 AND destinatario_id = $2) 
          OR (remitente_id = $2 AND destinatario_id = $1)
       ORDER BY fecha_envio DESC 
       LIMIT 10`,
      [usuarioId, profesionistaId]
    );

    // Insertar bloqueo en base de datos
    await pool.query(
      `INSERT INTO bloqueos_profesionistas 
       (usuario_id, profesionista_id, motivo, ultimos_mensajes, fecha_bloqueo) 
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (usuario_id, profesionista_id) 
       DO UPDATE SET fecha_bloqueo = NOW(), motivo = $3, ultimos_mensajes = $4`,
      [usuarioId, profesionistaId, motivo || 'Sin motivo especificado', JSON.stringify(mensajesQuery.rows)]
    );

    console.log(`🚫 BLOQUEO: Usuario ${usuarioId.substring(0, 8)} bloqueó a profesionista ${profesionistaId.substring(0, 8)}`);
    console.log(`📧 Enviando notificación al administrador con ${mensajesQuery.rows.length} mensajes`);

    res.json({
      success: true,
      message: 'Profesionista bloqueado correctamente. El administrador ha sido notificado.'
    });
  } catch (error: any) {
    console.error('Error bloqueando profesionista:', error);
    res.status(500).json({ error: error.message });
  }
});


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


app.get('/conversation/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    
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


app.post('/foro/publicacion/:publicacionId/comentario', async (req: Request, res: Response) => {
  try {
    const { publicacionId } = req.params;
    const { usuarioId, contenido, parentId } = req.body;

    if (!usuarioId || !contenido) {
      return res.status(400).json({ error: 'usuarioId y contenido son requeridos' });
    }

    const comentario = await foroService.crearComentario(
      publicacionId,
      usuarioId,
      contenido,
      parentId
    );

    res.json({
      success: true,
      comentario
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


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


app.post('/foro/publicacion/:publicacionId/no-util', async (req: Request, res: Response) => {
  try {
    const { publicacionId } = req.params;
    const { usuarioId } = req.body;

    if (!usuarioId) {
      return res.status(400).json({ error: 'usuarioId es requerido' });
    }

    const resultado = await foroService.toggleNoUtilPublicacion(publicacionId, usuarioId);

    res.json({
      success: true,
      ...resultado
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


app.post('/foro/comentario/:comentarioId/like', async (req: Request, res: Response) => {
  try {
    const { comentarioId } = req.params;
    const { usuarioId } = req.body;

    if (!usuarioId) {
      return res.status(400).json({ error: 'usuarioId es requerido' });
    }

    const resultado = await foroService.toggleLikeComentario(comentarioId, usuarioId);

    res.json({
      success: true,
      ...resultado
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


app.get('/foro/categoria/:categoriaId/miembros', async (req: Request, res: Response) => {
  try {
    const { categoriaId } = req.params;

    const miembros = await foroService.getMiembrosCategoria(categoriaId);

    res.json({
      success: true,
      totalMiembros: miembros.length,
      miembros
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

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

// Vaciar chat (eliminar todos los mensajes entre dos usuarios)
app.delete('/mensajes/:ciudadanoId/:abogadoId', async (req: Request, res: Response) => {
  try {
    const { ciudadanoId, abogadoId } = req.params;

    await pool.query(
      `DELETE FROM mensajes_privados 
       WHERE (remitente_id = $1 AND destinatario_id = $2) 
          OR (remitente_id = $2 AND destinatario_id = $1)`,
      [ciudadanoId, abogadoId]
    );

    console.log(`🗑️ Chat vaciado entre ${ciudadanoId.substring(0, 8)} y ${abogadoId.substring(0, 8)}`);

    res.json({
      success: true,
      message: 'Chat eliminado correctamente'
    });
  } catch (error: any) {
    console.error('Error vaciando chat:', error);
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


app.listen(PORT, () => {
  console.log(` Chat Service corriendo en puerto ${PORT}`);
  console.log(` Integrado con RAG: ${RAG_URL}`);
  console.log(` Integrado con NLP: ${NLP_URL}`);
  console.log(` Integrado con Clustering: ${CLUSTERING_URL}`);
  console.log(` Foro de comunidad habilitado`);
  console.log(` Chat privado 1:1 habilitado`);
  console.log(` Agrupamiento automático por clusters habilitado`);
});

process.on('SIGINT', async () => {
  console.log('\n X Cerrando Chat Service...');
  await pool.end();
  process.exit(0);
});

