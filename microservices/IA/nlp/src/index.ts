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
  // Patrones más completos para preguntas naturales/coloquiales
  const intenciones: { [key: string]: string[] } = {
    consulta_multa: [
      'multa', 'multaron', 'infraccion', 'infraccionar', 'boleta', 
      'fotomulta', 'me pueden', 'pueden multarme', 'es infraccion'
    ],
    consulta_semaforo: [
      'semaforo', 'semáforo', 'brinco', 'brinque', 'brincarse', 'brincar',
      'luz roja', 'rojo', 'crucé', 'cruce', 'pase', 'pasé'
    ],
    consulta_accidente: [
      'accidente', 'choque', 'chocaron', 'choqué', 'colision', 
      'atropello', 'atropellé', 'golpe'
    ],
    consulta_alcohol: [
      'alcohol', 'alcoholimetro', 'alcoholímetro', 'borracho', 'ebrio',
      'tomado', 'copas', 'cerveza'
    ],
    consulta_estacionamiento: [
      'estacionar', 'estacioné', 'banqueta', 'acera', 'doble fila',
      'grua', 'corralon', 'llevaron'
    ],
    consulta_documentos: [
      'licencia', 'tarjeta', 'circulacion', 'seguro', 'verificacion',
      'documento', 'papeles', 'vencida', 'vencido'
    ],
    pregunta_consecuencia: [
      'que pasa', 'qué pasa', 'que me pasa', 'qué me pasa',
      'pueden', 'puedo', 'me pueden', 'pasaria', 'pasaría',
      'consecuencia', 'sancion', 'castigo'
    ],
    queja: [
      'injusto', 'abuso', 'mordida', 'extorsion', 'corrupcion',
      'no es justo', 'no deberian'
    ],
    buscar_abogado: [
      'abogado', 'profesional', 'asesor', 'experto', 'especialista',
      'recomendacion', 'recomienda', 'ayuda legal'
    ],
    impugnar: [
      'impugnar', 'pelear', 'recurso', 'queja', 'inconformar',
      'no estoy de acuerdo', 'apelar'
    ],
    informacion: [
      'informacion', 'saber', 'conocer', 'explica', 'como',
      'donde', 'cuando', 'cuanto', 'cuál'
    ],
    ayuda: [
      'ayuda', 'auxilio', 'emergencia', 'socorro', 'necesito'
    ]
  };

  const textoLower = texto.toLowerCase();
  let mejorIntencion = 'informacion';
  let mejorScore = 0;

  for (const [intencion, patrones] of Object.entries(intenciones)) {
    let score = 0;
    for (const patron of patrones) {
      if (textoLower.includes(patron)) {
        score++;
      }
    }
    if (score > mejorScore) {
      mejorScore = score;
      mejorIntencion = intencion;
    }
  }

  return mejorIntencion;
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
