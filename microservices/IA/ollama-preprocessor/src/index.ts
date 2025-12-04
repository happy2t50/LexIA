import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'OK',
    service: 'Ollama Preprocessor',
    ollamaUrl: OLLAMA_URL
  });
});

// Verificar si Ollama está disponible
app.get('/ollama/status', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${OLLAMA_URL}/api/tags`);
    res.json({
      available: true,
      models: response.data.models || []
    });
  } catch (error) {
    res.status(503).json({
      available: false,
      error: 'Ollama no está disponible'
    });
  }
});

/**
 * Endpoint principal: Normalizar texto coloquial a lenguaje legal formal
 *
 * Input: { texto: "hey destruí un alumbrado público" }
 * Output: {
 *   textoOriginal: "hey destruí un alumbrado público",
 *   textoNormalizado: "daño a propiedad pública - alumbrado público",
 *   tema: "dano_propiedad_publica",
 *   entidades: ["alumbrado público", "daño a propiedad"],
 *   palabrasClave: ["daño", "propiedad pública", "alumbrado"],
 *   confianza: 0.95
 * }
 */
app.post('/normalize', async (req: Request, res: Response) => {
  try {
    const { texto } = req.body;

    if (!texto) {
      return res.status(400).json({ error: 'texto es requerido' });
    }

    console.log(`📝 Normalizando: "${texto}"`);

    // Prompt especializado para lenguaje legal mexicano
    const prompt = `Eres un experto en derecho de tránsito y lenguaje legal mexicano, especializado en Chiapas.

Tu tarea es analizar consultas legales en lenguaje coloquial y convertirlas a términos formales.

DICCIONARIO DE MODISMOS MEXICANOS/CHIAPANECOS:
- "bolo", "pedo", "cuete", "pilas" = "bajo efectos del alcohol"
- "me agarraron", "me cacharon", "me cayeron" = "me detuvieron las autoridades"
- "me corrieron la grúa" = "remolcaron mi vehículo"
- "el man", "el vato" = "el conductor" / "la otra persona"
- "se fue", "se escapó", "huyó" = "se dio a la fuga"
- "destruí", "rompí", "dañé" = "causé daño a"
- "poste", "alumbrado" = "infraestructura pública"

CONSULTA DEL USUARIO:
"${texto}"

RESPONDE EN ESTE FORMATO JSON (sin markdown, solo JSON puro):
{
  "textoNormalizado": "frase en lenguaje legal formal (máximo 15 palabras)",
  "tema": "uno de: accidente_transito|alcoholimetro|estacionamiento_indebido|documentos_vehiculares|multa_transito|dano_propiedad_publica|semaforo|velocidad|otro",
  "entidades": ["lista", "de", "entidades", "detectadas"],
  "palabrasClave": ["palabras", "clave", "principales"],
  "confianza": 0.95
}

IMPORTANTE:
- textoNormalizado debe ser conciso y usar términos legales
- Mantén la información esencial del caso
- Si mencionan alcohol, usar "conducir bajo efectos del alcohol"
- Si mencionan accidente, especificar tipo (colisión, atropello, daños)
- Si mencionan fuga, incluir "se dio a la fuga"
- confianza debe ser 0-1 (qué tan seguro estás de la normalización)`;

    const startTime = Date.now();

    // Llamar a Ollama
    const response = await axios.post(
      `${OLLAMA_URL}/api/generate`,
      {
        model: process.env.OLLAMA_MODEL || 'llama3.2:1b',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3, // Más determinista para legal
          top_p: 0.9,
          top_k: 40,
          num_predict: 300 // Máximo de tokens
        }
      },
      {
        timeout: 30000 // 30 segundos timeout
      }
    );

    const latency = Date.now() - startTime;

    // Extraer respuesta
    let ollamaResponse = response.data.response || '';

    // Limpiar markdown si existe
    ollamaResponse = ollamaResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Parsear JSON
    let result;
    try {
      result = JSON.parse(ollamaResponse);
    } catch (parseError) {
      console.error('Error parseando JSON de Ollama:', ollamaResponse);
      // Fallback: retornar texto original
      result = {
        textoNormalizado: texto,
        tema: 'otro',
        entidades: [],
        palabrasClave: [],
        confianza: 0.5
      };
    }

    console.log(`✅ Normalizado en ${latency}ms: "${texto}" → "${result.textoNormalizado}"`);

    res.json({
      textoOriginal: texto,
      textoNormalizado: result.textoNormalizado || texto,
      tema: result.tema || 'otro',
      entidades: result.entidades || [],
      palabrasClave: result.palabrasClave || [],
      confianza: result.confianza || 0.8,
      latencyMs: latency,
      model: process.env.OLLAMA_MODEL || 'llama3.2:1b'
    });

  } catch (error: any) {
    console.error('Error en normalización:', error.message);

    // Si Ollama falla, devolver texto original (fallback gracioso)
    res.status(200).json({
      textoOriginal: req.body.texto,
      textoNormalizado: req.body.texto,
      tema: 'otro',
      entidades: [],
      palabrasClave: [],
      confianza: 0.0,
      error: 'Ollama no disponible, usando texto original',
      fallback: true
    });
  }
});

/**
 * Endpoint batch: Normalizar múltiples textos
 */
app.post('/normalize-batch', async (req: Request, res: Response) => {
  try {
    const { textos } = req.body;

    if (!Array.isArray(textos)) {
      return res.status(400).json({ error: 'textos debe ser un array' });
    }

    const resultados = await Promise.all(
      textos.map(async (texto) => {
        try {
          const response = await axios.post(`http://localhost:${PORT}/normalize`, { texto });
          return response.data;
        } catch (error) {
          return {
            textoOriginal: texto,
            textoNormalizado: texto,
            error: 'Error en normalización'
          };
        }
      })
    );

    res.json({
      total: textos.length,
      resultados
    });

  } catch (error) {
    res.status(500).json({ error: 'Error en batch processing' });
  }
});

app.listen(PORT, () => {
  console.log(`🤖 Ollama Preprocessor corriendo en puerto ${PORT}`);
  console.log(`📡 Ollama URL: ${OLLAMA_URL}`);
  console.log(`🧠 Modelo: ${process.env.OLLAMA_MODEL || 'llama3.2:1b'}`);
});
