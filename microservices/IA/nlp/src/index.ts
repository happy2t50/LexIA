import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import natural from 'natural';
import compromise from 'compromise';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());

// Tokenizador y analizador
const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;
const tfidf = new TfIdf();

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', service: 'NLP Service' });
});

// Procesar consulta de usuario
app.post('/process', async (req: Request, res: Response) => {
  try {
    const { textoConsulta, usuarioId } = req.body;

    if (!textoConsulta) {
      return res.status(400).json({ error: 'textoConsulta es requerido' });
    }

    // 1. Normalizar texto
    const textoNormalizado = normalizeText(textoConsulta);

    // 2. Tokenizar
    const tokens = tokenizer.tokenize(textoNormalizado) || [];

    // 3. Extraer entidades (usando compromise)
    const doc = compromise(textoConsulta);
    const entidades = {
      lugares: doc.places().out('array'),
      fechas: doc.match('#Date').out('array'),
      numeros: doc.numbers().out('array')
    };

    // 4. Clasificar intención
    const intencion = clasificarIntencion(textoNormalizado);

    // 5. Extraer palabras clave
    const palabrasClave = extractKeywords(textoNormalizado);

    // 6. Llamar al servicio de clustering para obtener categoría
    let cluster = null;
    try {
      const clusteringUrl = process.env.CLUSTERING_SERVICE_URL || 'http://localhost:3002';
      const clusterResponse = await axios.post(`${clusteringUrl}/predict`, {
        textoConsulta,
        consultaId: uuidv4()
      });
      cluster = clusterResponse.data;
    } catch (error) {
      console.log('Error al obtener cluster:', error);
    }

    // 7. Guardar en OLAP
    try {
      const olapUrl = process.env.OLAP_SERVICE_URL || 'http://localhost:3001';
      await axios.post(`${olapUrl}/consultas`, {
        id: uuidv4(),
        textoConsulta,
        usuarioId: usuarioId || 'anonimo',
        usuario: {
          id: usuarioId || 'anonimo',
          tipo: 'conductor',
          historialConsultas: [],
          fechaRegistro: new Date()
        },
        ubicacion: {
          ciudad: entidades.lugares[0] || 'Desconocida',
          barrio: '',
          coordenadas: { lat: 0, lng: 0 },
          pais: 'Colombia'
        },
        tiempo: {
          fecha: new Date(),
          hora: new Date().toTimeString().slice(0, 5),
          diaSemana: new Date().toLocaleDateString('es', { weekday: 'long' }),
          mes: new Date().getMonth() + 1,
          ano: new Date().getFullYear()
        },
        serviciosRecomendados: [],
        clusterAsignado: cluster?.cluster || 'C1',
        gravedadEstimada: estimarGravedad(textoNormalizado),
        estado: 'pendiente'
      });
    } catch (error) {
      console.log('Error al guardar en OLAP:', error);
    }

    res.json({
      textoOriginal: textoConsulta,
      textoNormalizado,
      tokens,
      entidades,
      intencion,
      palabrasClave,
      cluster: cluster?.cluster || null,
      confianza: cluster?.confianza || 0
    });
  } catch (error) {
    console.error('Error en procesamiento NLP:', error);
    res.status(500).json({ error: 'Error al procesar texto' });
  }
});

// Analizar sentimiento
app.post('/sentiment', (req: Request, res: Response) => {
  try {
    const { texto } = req.body;

    if (!texto) {
      return res.status(400).json({ error: 'texto es requerido' });
    }

    const analyzer = new natural.SentimentAnalyzer('Spanish', natural.PorterStemmer, 'afinn');
    const tokens = tokenizer.tokenize(texto.toLowerCase()) || [];
    const score = analyzer.getSentiment(tokens);

    let sentimiento = 'neutral';
    if (score > 0.1) sentimiento = 'positivo';
    else if (score < -0.1) sentimiento = 'negativo';

    res.json({
      texto,
      sentimiento,
      score
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al analizar sentimiento' });
  }
});

// Funciones auxiliares

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^\w\s]/g, ' ') // Remover puntuación
    .replace(/\s+/g, ' ') // Normalizar espacios
    .trim();
}

function clasificarIntencion(texto: string): string {
  const intenciones = {
    consulta: ['como', 'que', 'donde', 'cuando', 'quien', 'cual'],
    reporte: ['me', 'paso', 'tuve', 'choque', 'multa'],
    ayuda: ['ayuda', 'necesito', 'quiero', 'puedo'],
    informacion: ['informacion', 'saber', 'conocer', 'explica']
  };

  let maxScore = 0;
  let intencionDetectada = 'consulta';

  for (const [intencion, palabras] of Object.entries(intenciones)) {
    const score = palabras.filter(p => texto.includes(p)).length;
    if (score > maxScore) {
      maxScore = score;
      intencionDetectada = intencion;
    }
  }

  return intencionDetectada;
}

function extractKeywords(texto: string): string[] {
  const stopWords = [
    'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no', 'me',
    'haber', 'por', 'con', 'su', 'para', 'como', 'estar', 'tener', 'le',
    'lo', 'todo', 'pero', 'mas', 'hacer', 'o', 'poder', 'decir', 'este'
  ];

  const tokens = tokenizer.tokenize(texto) || [];
  const keywords = tokens.filter(token =>
    token.length > 3 && !stopWords.includes(token)
  );

  // Retornar palabras únicas
  return Array.from(new Set(keywords));
}

function estimarGravedad(texto: string): 'baja' | 'media' | 'alta' {
  const palabrasAltas = ['choque', 'accidente', 'herido', 'muerto', 'grave', 'alcoholimetro'];
  const palabrasMedias = ['semaforo', 'velocidad', 'multa', 'infraccion'];

  for (const palabra of palabrasAltas) {
    if (texto.includes(palabra)) return 'alta';
  }

  for (const palabra of palabrasMedias) {
    if (texto.includes(palabra)) return 'media';
  }

  return 'baja';
}

app.listen(PORT, () => {
  console.log(`🧠 NLP Service corriendo en puerto ${PORT}`);
});
