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
    const { textoConsulta, usuarioId, useOllama = true } = req.body;

    if (!textoConsulta) {
      return res.status(400).json({ error: 'textoConsulta es requerido' });
    }

    // 1. Normalizar texto básico
    const textoNormalizado = normalizeText(textoConsulta);

    // 2. Clasificar intención con diccionario
    const intencion = clasificarIntencion(textoNormalizado);

    // 3. NUEVO: Detectar si necesita normalización con Ollama
    let textoParaProcesar = textoConsulta;
    let entidadesOllama: string[] = [];
    let temaOllama = null;
    let useOllamaFlag = false;

    if (useOllama && necesitaNormalizacionOllama(textoConsulta, intencion)) {
      console.log(' Frase compleja detectada, usando Ollama...');
      try {
        const ollamaUrl = process.env.OLLAMA_PREPROCESSOR_URL || 'http://localhost:3007';
        const ollamaResponse = await axios.post(
          `${ollamaUrl}/normalize`,
          { texto: textoConsulta },
          { timeout: 15000 } // 15 segundos timeout
        );

        if (ollamaResponse.data && !ollamaResponse.data.fallback) {
          textoParaProcesar = ollamaResponse.data.textoNormalizado;
          entidadesOllama = ollamaResponse.data.entidades || [];
          temaOllama = ollamaResponse.data.tema;
          useOllamaFlag = true;
          console.log(`✅ Ollama: "${textoConsulta}" → "${textoParaProcesar}" (confianza: ${ollamaResponse.data.confianza})`);
        }
      } catch (error) {
        console.log('⚠️ Ollama no disponible, usando diccionario');
      }
    }

    // 4. Tokenizar (usar texto procesado)
    const tokens = tokenizer.tokenize(normalizeText(textoParaProcesar)) || [];

    // 5. Extraer entidades (usando compromise)
    const doc = compromise(textoParaProcesar);
    const entidades = {
      lugares: doc.places().out('array'),
      fechas: doc.match('#Date').out('array'),
      numeros: doc.numbers().out('array'),
      ollama: entidadesOllama // Agregar entidades de Ollama
    };

    // 6. Extraer palabras clave
    const palabrasClave = extractKeywords(normalizeText(textoParaProcesar));

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
      textoNormalizado: textoParaProcesar,
      tokens,
      entidades,
      intencion,
      palabrasClave,
      cluster: cluster?.cluster || null,
      confianza: cluster?.confianza || 0,
      ollama: {
        used: useOllamaFlag,
        tema: temaOllama
      }
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
  // Patrones expandidos con modismos mexicanos y chiapanecos
  const intenciones: { [key: string]: string[] } = {
    consulta_multa: [
      // Formal
      'multa', 'multaron', 'infraccion', 'infraccionar', 'boleta',
      'fotomulta', 'me pueden', 'pueden multarme', 'es infraccion',
      // Coloquial México/Chiapas
      'me levantaron', 'me pusieron multa', 'me sacaron boleta',
      'me multaron', 'me infracionaron', 'me hicieron boleta'
    ],
    consulta_semaforo: [
      // Formal
      'semaforo', 'semáforo', 'brinco', 'brinque', 'brincarse', 'brincar',
      'luz roja', 'rojo', 'crucé', 'cruce', 'pase', 'pasé',
      // Coloquial
      'me lo salte', 'me pase el rojo', 'me brinque el alto',
      'cruce en rojo', 'me pase la luz', 'no alcance a parar'
    ],
    consulta_accidente: [
      // Formal
      'accidente', 'choque', 'chocaron', 'choqué', 'colision',
      'atropello', 'atropellé', 'golpe',
      // Coloquial México/Chiapas
      'me chocaron', 'choque', 'me pegaron', 'me dieron', 'me aventaron',
      'se me atraveso', 'me estrelle', 'me impacto', 'me topo', 'me topó',
      'el man me choco', 'el vato me pego', 'se me cerro',
      'se dio a la fuga', 'se fue', 'se escapo', 'huyo', 'se pelo', 'se peló',
      // Contexto de accidente con daño
      'poste', 'barda', 'muro', 'arbol', 'árbol', 'me lleve', 'me llevé'
    ],
    consulta_alcohol: [
      // Formal
      'alcohol', 'alcoholimetro', 'alcoholímetro', 'borracho', 'ebrio',
      'tomado', 'copas', 'cerveza',
      // Coloquial México (jerga común) - solo palabras que claramente indican alcohol
      'bolo', 'cuete', 'alcoholizado', 'entonado',
      'hasta atras', 'hasta las chanclas', 'pasado de copas',
      'chelero', 'manejando tomado', 'manejando pedo', 'manejando bolo',
      'me agarraron pedo', 'me agarraron tomado', 'me agarraron borracho',
      'me cacharon pedo', 'me cacharon tomado', 'bien pedo', 'bien pedote',
      'pedote manejando', 'alcoholimetro', 'prueba de alcohol'
    ],
    consulta_estacionamiento: [
      // Formal
      'estacionar', 'estacioné', 'banqueta', 'acera', 'doble fila',
      'grua', 'corralon', 'llevaron',
      // Coloquial México/Chiapas
      'me llevaron el carro', 'me sacaron el coche', 'me remolcaron',
      'me corrieron la grua', 'me levantaron el carro', 'esta en el corralon',
      'me lo llevo la grua', 'grua se lo llevo', 'deje el carro',
      'me estacione mal', 'parqueado', 'deje estacionado',
      'me quitaron la troca', 'quitaron la troca', 'quitaron el carro'
    ],
    consulta_documentos: [
      // Formal
      'licencia', 'tarjeta', 'circulacion', 'seguro', 'verificacion',
      'documento', 'papeles', 'vencida', 'vencido',
      // Coloquial
      'sin papeles', 'no traigo documentos', 'se me olvido',
      'no tengo', 'vencidos', 'caducados', 'sin licencia',
      'manejando sin', 'no traia'
    ],
    pregunta_consecuencia: [
      // Formal
      'que pasa', 'qué pasa', 'que me pasa', 'qué me pasa',
      'pueden', 'puedo', 'me pueden', 'pasaria', 'pasaría',
      'consecuencia', 'sancion', 'castigo',
      // Coloquial
      'que me hacen', 'que me va a pasar', 'me van a',
      'cual es mi sancion', 'cuanto me toca', 'que procede',
      'que sigue', 'ahora que', 'que hago'
    ],
    queja: [
      // Formal
      'injusto', 'abuso', 'mordida', 'extorsion', 'corrupcion',
      'no es justo', 'no deberian',
      // Coloquial
      'me quieren sacar dinero', 'quieren lana', 'me estan extorcionando',
      'quiere mordida', 'me pide dinero', 'abuso de autoridad',
      'no es correcto', 'me esta chingando'
    ],
    buscar_abogado: [
      // Formal
      'abogado', 'profesional', 'asesor', 'experto', 'especialista',
      'recomendacion', 'recomienda', 'ayuda legal',
      // Coloquial
      'necesito un abogado', 'quien me puede ayudar', 'alguien que sepa',
      'necesito asesoramiento', 'requiero ayuda', 'conocen a alguien'
    ],
    impugnar: [
      // Formal
      'impugnar', 'pelear', 'recurso', 'queja', 'inconformar',
      'no estoy de acuerdo', 'apelar',
      // Coloquial
      'como le hago para pelear', 'quiero pelearla', 'no acepto',
      'no estoy conforme', 'no es correcta', 'como la quito',
      'puedo apelar'
    ],
    informacion: [
      // Formal
      'informacion', 'saber', 'conocer', 'explica', 'como',
      'donde', 'cuando', 'cuanto', 'cuál',
      // Coloquial
      'oye', 'fijate', 'mira', 'dime', 'me puedes decir',
      'quisiera saber', 'me gustaria saber'
    ],
    ayuda: [
      // Formal
      'ayuda', 'auxilio', 'emergencia', 'socorro', 'necesito',
      // Coloquial
      'ayudame', 'echame la mano', 'dame una mano',
      'que hago', 'estoy perdido', 'no se que hacer'
    ]
  };

  const textoLower = texto.toLowerCase();
  
  // PRIORIDAD ESPECIAL: Detectar accidente primero si hay indicadores claros
  const accidentePatterns = ['choque', 'choqué', 'me topo', 'me topó', 'se pelo', 'se peló', 
    'accidente', 'colision', 'me pegaron', 'poste', 'barda', 'me lleve'];
  const tieneAccidente = accidentePatterns.some(p => textoLower.includes(p));
  
  if (tieneAccidente) {
    // Verificar que NO sea claramente sobre alcohol
    const alcoholClaros = ['alcoholimetro', 'alcoholímetro', 'prueba de alcohol', 'tomado', 
      'borracho', 'chelero', 'copas'];
    const tieneAlcoholClaro = alcoholClaros.some(p => textoLower.includes(p));
    
    if (!tieneAlcoholClaro) {
      return 'consulta_accidente';
    }
  }
  
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

/**
 * Determina si un texto necesita normalización con Ollama
 * Retorna true si:
 * - El diccionario no detectó una intención específica (solo "informacion")
 * - Y contiene palabras raras/especiales no cubiertas por el diccionario
 */
function necesitaNormalizacionOllama(texto: string, intencionDetectada: string): boolean {
  const textoLower = texto.toLowerCase();

  // Si el diccionario ya detectó algo específico, no necesita Ollama
  if (intencionDetectada !== 'informacion' && intencionDetectada !== 'ayuda') {
    return false;
  }

  // Palabras especiales que no están en el diccionario principal
  // Estas requieren comprensión contextual de un LLM
  const palabrasEspeciales = [
    // Daños a propiedad pública
    'alumbrado', 'poste', 'destrui', 'rompi', 'dañe', 'tire',
    'semaforo roto', 'señal caida', 'vandalismo',

    // Situaciones específicas
    'hidrante', 'barda', 'muro', 'cerca', 'propiedad',

    // Casos médicos/emergencia
    'lesionado', 'herido grave', 'ambulancia', 'hospital',

    // Casos legales complejos
    'demanda', 'juicio', 'abogado defensor', 'fiscal',
    'ministerio publico', 'denuncia penal',

    // Situaciones poco comunes
    'contraflujo', 'carril exclusivo', 'vialidad cerrada'
  ];

  // Si contiene alguna palabra especial, usar Ollama
  return palabrasEspeciales.some(palabra => textoLower.includes(palabra));
}

app.listen(PORT, () => {
  console.log(`🧠 NLP Service corriendo en puerto ${PORT}`);
  console.log(`🤖 Ollama preprocessor: ${process.env.OLLAMA_PREPROCESSOR_URL || 'http://localhost:3007'}`);
});
