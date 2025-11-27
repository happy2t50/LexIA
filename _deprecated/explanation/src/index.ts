import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import OpenAI from 'openai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3007;

app.use(cors());
app.use(express.json());

// Inicializar OpenAI (opcional)
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

// Base de conocimiento de explicaciones
interface Explicacion {
  cluster: string;
  titulo: string;
  explicacionBasica: string;
  pasosSeguir: string[];
  consecuencias: string[];
  tips: string[];
}

const explicaciones: Record<string, Explicacion> = {
  C1: {
    cluster: 'C1',
    titulo: 'Exceso de velocidad / Semáforo en rojo',
    explicacionBasica: 'Has cometido una infracción relacionada con velocidad o señalización. Esta es considerada una falta grave que puede resultar en multas significativas.',
    pasosSeguir: [
      'Verifica si recibiste una orden de comparendo',
      'Revisa el monto de la multa en el comparendo',
      'Tienes derecho a presentar un descargo dentro de los 5 días hábiles',
      'Considera contactar a un abogado especializado en tránsito',
      'Puedes solicitar un plan de pagos si no puedes pagar la multa completa'
    ],
    consecuencias: [
      'Multa económica entre 8 y 30 SMLV',
      'Posible suspensión de licencia',
      'Acumulación de puntos en tu licencia'
    ],
    tips: [
      'Si presentas descargos, hazlo por escrito con evidencias',
      'Respeta siempre las señales de tránsito',
      'Mantén actualizada tu documentación'
    ]
  },
  C2: {
    cluster: 'C2',
    titulo: 'Estacionamiento indebido',
    explicacionBasica: 'Has estacionado tu vehículo en un lugar prohibido o que obstruye la vía pública.',
    pasosSeguir: [
      'Verifica si tu vehículo fue inmovilizado',
      'Si fue llevado al parqueadero, dirígete al patio de grúas',
      'Presenta la documentación del vehículo',
      'Paga la multa y el servicio de grúa',
      'Retira tu vehículo lo antes posible para evitar costos adicionales'
    ],
    consecuencias: [
      'Multa de 15 SMLV',
      'Costo de grúa (aproximadamente 80,000 - 150,000 COP)',
      'Costo de parqueadero por día',
      'Inmovilización del vehículo'
    ],
    tips: [
      'Siempre verifica las señales de estacionamiento',
      'Usa parqueaderos autorizados',
      'No estaciones en zonas de carga y descarga sin permiso'
    ]
  },
  C3: {
    cluster: 'C3',
    titulo: 'Control de alcoholemia',
    explicacionBasica: 'Has sido detenido en un control de alcoholemia. Esta es una infracción muy grave con consecuencias severas.',
    pasosSeguir: [
      'IMPORTANTE: Contacta inmediatamente a un abogado especializado',
      'No conduzcas bajo ninguna circunstancia',
      'Tu vehículo será inmovilizado',
      'Tu licencia será suspendida',
      'Deberás realizar curso de sensibilización',
      'Prepárate para el proceso administrativo y posible proceso penal'
    ],
    consecuencias: [
      'Multa de 30 SMLV o más',
      'Suspensión de licencia por 1 a 3 años',
      'Inmovilización del vehículo por 20 días hábiles',
      'Antecedentes legales',
      'Posible proceso penal dependiendo del nivel de alcohol'
    ],
    tips: [
      'NUNCA conduzcas bajo efectos del alcohol',
      'Usa servicios de transporte como Uber, taxi o conductor designado',
      'El límite legal es 0 grados de alcohol en sangre para conductores nuevos',
      'Las consecuencias pueden afectar tu vida personal y profesional'
    ]
  },
  C4: {
    cluster: 'C4',
    titulo: 'Falta de documentos',
    explicacionBasica: 'No portabas la documentación requerida para conducir (licencia, SOAT, etc.).',
    pasosSeguir: [
      'Presenta la documentación en la autoridad de tránsito',
      'Si no tienes SOAT, adquiérelo inmediatamente',
      'Si no tienes licencia, no puedes conducir hasta obtenerla',
      'Paga la multa correspondiente',
      'Tu vehículo puede ser inmovilizado hasta presentar documentos'
    ],
    consecuencias: [
      'Multa de 30-40 SMLV dependiendo del documento faltante',
      'Inmovilización del vehículo',
      'No puedes conducir sin licencia válida',
      'El SOAT es obligatorio y su falta es una infracción grave'
    ],
    tips: [
      'Siempre verifica tu documentación antes de salir',
      'Renueva tu SOAT antes de que venza',
      'Mantén copia digital de tus documentos',
      'La licencia debe estar vigente y corresponder a la categoría del vehículo'
    ]
  },
  C5: {
    cluster: 'C5',
    titulo: 'Accidente de tránsito',
    explicacionBasica: 'Has estado involucrado en un accidente de tránsito. Es crucial seguir los procedimientos legales correctamente.',
    pasosSeguir: [
      'Si hay heridos, llama inmediatamente al 123',
      'No muevas los vehículos si hay heridos graves',
      'Toma fotos de la escena, daños y placas',
      'Intercambia información con la otra parte (nombre, cédula, seguro, placas)',
      'Llama a tu aseguradora',
      'Llama a la policía si hay desacuerdo sobre responsabilidades',
      'Contacta a un abogado especializado en accidentes',
      'Solicita servicio de grúa si tu vehículo no puede moverse',
      'Haz un reporte ante las autoridades dentro de las 24 horas'
    ],
    consecuencias: [
      'Responsabilidad civil por daños',
      'Posible responsabilidad penal si hay lesiones o muertes',
      'Costos de reparación',
      'Aumento en prima del seguro',
      'Posible demanda de la otra parte'
    ],
    tips: [
      'Mantén la calma y no admitas culpabilidad en el lugar',
      'Documenta todo con fotos y videos',
      'Consigue testigos y sus datos de contacto',
      'Reporta a tu seguro dentro del tiempo estipulado',
      'No llegues a acuerdos económicos sin asesoría legal',
      'Guarda todos los recibos de gastos relacionados'
    ]
  }
};

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', service: 'Explanation Service' });
});

// Explicar basado en cluster
app.post('/explain', async (req: Request, res: Response) => {
  try {
    const { cluster, textoConsulta } = req.body;

    if (!cluster) {
      return res.status(400).json({ error: 'cluster es requerido' });
    }

    const explicacion = explicaciones[cluster];

    if (!explicacion) {
      return res.status(404).json({ error: 'Explicación no encontrada para este cluster' });
    }

    // Obtener artículos legales relacionados
    let articulosLegales: any[] = [];
    try {
      const searchUrl = process.env.SEARCH_SERVICE_URL || 'http://localhost:3005';
      const response = await axios.get(`${searchUrl}/search/cluster/${cluster}`);
      articulosLegales = response.data.results || [];
    } catch (error) {
      console.log('Error al obtener artículos:', error);
    }

    res.json({
      cluster,
      explicacion,
      articulosLegales,
      fuente: 'knowledge_base'
    });
  } catch (error) {
    console.error('Error al generar explicación:', error);
    res.status(500).json({ error: 'Error al generar explicación' });
  }
});

// Explicación con ChatGPT (fallback para casos nuevos)
app.post('/explain/ai', async (req: Request, res: Response) => {
  try {
    const { textoConsulta, cluster, contexto } = req.body;

    if (!textoConsulta) {
      return res.status(400).json({ error: 'textoConsulta es requerido' });
    }

    if (!openai) {
      // Fallback si no hay API key de OpenAI
      return res.json({
        explicacion: 'Servicio de IA no disponible. Consulta con un abogado especializado.',
        fuente: 'fallback',
        sugerencia: 'Contacta a uno de nuestros abogados recomendados para obtener asesoría personalizada.'
      });
    }

    // Construir prompt para ChatGPT
    const prompt = `Eres un asistente legal especializado en derecho de tránsito en Colombia.
Un usuario ha consultado: "${textoConsulta}"

Proporciona una explicación clara y concisa que incluya:
1. Qué tipo de infracción o situación es
2. Pasos que debe seguir
3. Posibles consecuencias legales
4. Tips y recomendaciones

Responde de manera profesional pero accesible, en español.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente legal especializado en derecho de tránsito colombiano.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const explicacionAI = completion.choices[0]?.message?.content || 'No se pudo generar explicación';

    res.json({
      textoConsulta,
      cluster: cluster || 'desconocido',
      explicacionAI,
      fuente: 'openai',
      modelo: 'gpt-3.5-turbo'
    });
  } catch (error) {
    console.error('Error con OpenAI:', error);
    res.status(500).json({ error: 'Error al generar explicación con IA' });
  }
});

// Obtener todas las explicaciones disponibles
app.get('/explanations', (req: Request, res: Response) => {
  try {
    res.json({
      total: Object.keys(explicaciones).length,
      explicaciones: Object.values(explicaciones)
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener explicaciones' });
  }
});

// Flujo completo: analizar consulta y dar explicación completa
app.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { textoConsulta, usuarioId } = req.body;

    if (!textoConsulta) {
      return res.status(400).json({ error: 'textoConsulta es requerido' });
    }

    // 1. Procesar con NLP
    let nlpResult: any = {};
    try {
      const nlpUrl = process.env.NLP_SERVICE_URL || 'http://localhost:3004';
      const response = await axios.post(`${nlpUrl}/process`, {
        textoConsulta,
        usuarioId
      });
      nlpResult = response.data;
    } catch (error) {
      console.log('Error con NLP:', error);
    }

    const cluster = nlpResult.cluster || 'C1';

    // 2. Obtener explicación
    const explicacion = explicaciones[cluster];

    // 3. Obtener recomendaciones
    let recomendaciones: any = {};
    try {
      const recUrl = process.env.RECOMMENDATIONS_SERVICE_URL || 'http://localhost:3006';
      const response = await axios.post(`${recUrl}/recommend`, {
        cluster,
        textoConsulta
      });
      recomendaciones = response.data;
    } catch (error) {
      console.log('Error con recomendaciones:', error);
    }

    res.json({
      consulta: {
        texto: textoConsulta,
        procesamiento: nlpResult
      },
      explicacion,
      recomendaciones,
      cluster,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en análisis completo:', error);
    res.status(500).json({ error: 'Error al analizar consulta' });
  }
});

app.listen(PORT, () => {
  console.log(`📖 Explanation Service corriendo en puerto ${PORT}`);
});
