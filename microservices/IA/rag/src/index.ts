import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { RAGService } from './services/RAGService.js';
import { getEmbeddingService } from './services/EmbeddingService.js';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3009;

app.use(cors());
app.use(express.json());

// Configurar pool de PostgreSQL
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

// Inicializar servicio RAG
const ragService = new RAGService(pool);
let isInitialized = false;

// Inicializar al arrancar
(async () => {
  try {
    console.log('🔄 Inicializando RAG Service...');
    await ragService.initialize();
    isInitialized = true;
    console.log('✅ RAG Service listo');
  } catch (error) {
    console.error('❌ Error al inicializar RAG Service:', error);
  }
})();

// ============================================================
// ENDPOINTS
// ============================================================

// Health check
app.get('/health', async (req: Request, res: Response) => {
  try {
    const dbHealthy = await pool.query('SELECT NOW()');
    const embeddingService = getEmbeddingService();
    const modelInfo = embeddingService.getModelInfo();

    res.json({
      status: 'OK',
      service: 'RAG Service',
      database: dbHealthy ? 'Connected' : 'Disconnected',
      embeddingModel: modelInfo.name,
      modelInitialized: modelInfo.initialized,
      ragInitialized: isInitialized
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      service: 'RAG Service',
      error: 'Database connection failed'
    });
  }
});

// Búsqueda RAG
app.post('/search', async (req: Request, res: Response) => {
  try {
    if (!isInitialized) {
      return res.status(503).json({ error: 'RAG Service aún no está inicializado' });
    }

    const { query, cluster, categoria } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'query es requerido' });
    }

    const result = await ragService.search(query, cluster, categoria);

    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('Error en búsqueda RAG:', error);
    res.status(500).json({ error: error.message || 'Error al realizar búsqueda RAG' });
  }
});

// Búsqueda RAG inteligente (con clustering automático)
app.post('/search-smart', async (req: Request, res: Response) => {
  try {
    if (!isInitialized) {
      return res.status(503).json({ error: 'RAG Service aún no está inicializado' });
    }

    const { query, usuarioId } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'query es requerido' });
    }

    // 1. Predecir cluster usando servicio de clustering
    let clusterAsignado = null;
    try {
      const clusteringUrl = process.env.CLUSTERING_SERVICE_URL || 'http://localhost:3002';
      const clusterResponse = await axios.post(`${clusteringUrl}/predict`, {
        textoConsulta: query
      });
      clusterAsignado = clusterResponse.data.cluster;
    } catch (error) {
      console.log('No se pudo obtener cluster, buscando sin filtro');
    }

    // 2. Buscar con filtro de cluster
    const result = await ragService.search(query, clusterAsignado);

    res.json({
      success: true,
      clusterDetectado: clusterAsignado,
      ...result
    });
  } catch (error: any) {
    console.error('Error en búsqueda RAG inteligente:', error);
    res.status(500).json({ error: error.message || 'Error al realizar búsqueda RAG' });
  }
});

// Indexar nuevo documento
app.post('/index', async (req: Request, res: Response) => {
  try {
    if (!isInitialized) {
      return res.status(503).json({ error: 'RAG Service aún no está inicializado' });
    }

    const { titulo, contenido, fuente, categoria, clusterRelacionado } = req.body;

    if (!titulo || !contenido) {
      return res.status(400).json({ error: 'titulo y contenido son requeridos' });
    }

    const documentoId = await ragService.indexDocument(
      titulo,
      contenido,
      fuente || 'Manual',
      categoria || 'General',
      clusterRelacionado || 'C1'
    );

    res.json({
      success: true,
      documentoId,
      message: 'Documento indexado exitosamente'
    });
  } catch (error: any) {
    console.error('Error al indexar documento:', error);
    res.status(500).json({ error: error.message || 'Error al indexar documento' });
  }
});

// Indexar todos los documentos existentes
app.post('/index-all', async (req: Request, res: Response) => {
  try {
    if (!isInitialized) {
      return res.status(503).json({ error: 'RAG Service aún no está inicializado' });
    }

    await ragService.indexAllDocuments();

    res.json({
      success: true,
      message: 'Todos los documentos han sido indexados'
    });
  } catch (error: any) {
    console.error('Error al indexar todos los documentos:', error);
    res.status(500).json({ error: error.message || 'Error al indexar documentos' });
  }
});

// Obtener estadísticas
app.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await ragService.getStats();
    const embeddingService = getEmbeddingService();
    const modelInfo = embeddingService.getModelInfo();

    res.json({
      success: true,
      baseConocimiento: stats,
      modeloEmbeddings: {
        nombre: modelInfo.name,
        dimension: modelInfo.dimension,
        inicializado: modelInfo.initialized
      }
    });
  } catch (error: any) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: error.message || 'Error al obtener estadísticas' });
  }
});

// Generar embedding para texto (útil para testing)
app.post('/embedding', async (req: Request, res: Response) => {
  try {
    if (!isInitialized) {
      return res.status(503).json({ error: 'RAG Service aún no está inicializado' });
    }

    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'text es requerido' });
    }

    const embeddingService = getEmbeddingService();
    const embedding = await embeddingService.generateEmbedding(text);

    res.json({
      success: true,
      text,
      embedding,
      dimension: embedding.length
    });
  } catch (error: any) {
    console.error('Error al generar embedding:', error);
    res.status(500).json({ error: error.message || 'Error al generar embedding' });
  }
});

// Información del modelo
app.get('/model-info', (req: Request, res: Response) => {
  try {
    const embeddingService = getEmbeddingService();
    const modelInfo = embeddingService.getModelInfo();

    res.json({
      success: true,
      modelo: modelInfo.name,
      dimension: modelInfo.dimension,
      inicializado: modelInfo.initialized,
      topK: parseInt(process.env.TOP_K_RESULTS || '5', 10),
      similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD || '0.7')
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// INICIAR SERVIDOR
// ============================================================

app.listen(PORT, () => {
  console.log(`🚀 RAG Service corriendo en puerto ${PORT}`);
  console.log(`📊 Modelo: ${process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2'}`);
  console.log(`🔍 Top K: ${process.env.TOP_K_RESULTS || 5}`);
  console.log(`📏 Umbral similitud: ${process.env.SIMILARITY_THRESHOLD || 0.7}`);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando RAG Service...');
  await pool.end();
  process.exit(0);
});
