import axios from 'axios';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama:11434';

export interface InterpretationResult {
  esRespuestaValida: boolean;
  respuestaInterpretada: string | null;
  valorExtraido: any;
  tipoRespuesta: 'afirmativa' | 'negativa' | 'opcion' | 'ambigua' | 'irrelevante' | 'pregunta';
  confianza: number;
  sugerenciaReformulacion?: string;
}

export class OllamaIntentInterpreter {
  private cache: Map<string, InterpretationResult> = new Map();

  async interpretarRespuesta(
    preguntaHecha: string,
    respuestaUsuario: string,
    opcionesValidas: string[] | null,
    tipoEsperado: 'si_no' | 'opciones' | 'texto' | 'numero'
  ): Promise<InterpretationResult> {
    
    
    const cacheKey = `${preguntaHecha}|${respuestaUsuario}|${tipoEsperado}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    
    const localResult = this.interpretarLocalmente(respuestaUsuario, opcionesValidas, tipoEsperado);
    
    if (localResult.confianza >= 0.8) {
      this.cache.set(cacheKey, localResult);
      return localResult;
    }

    
    try {
      const ollamaResult = await this.consultarOllama(
        preguntaHecha,
        respuestaUsuario,
        opcionesValidas,
        tipoEsperado
      );
      
      this.cache.set(cacheKey, ollamaResult);
      return ollamaResult;
    } catch (error) {
      console.error('Error consultando Ollama, usando resultado local:', error);
      return localResult;
    }
  }

  
  private interpretarLocalmente(
    respuesta: string,
    opciones: string[] | null,
    tipo: string
  ): InterpretationResult {
    const resp = respuesta.toLowerCase().trim();

    
    const esPreguntaPura = (
      (resp.includes('?') || 
       resp.startsWith('que es') || 
       resp.startsWith('qué es') ||
       resp.startsWith('a poco')) &&
      
      (!opciones || !opciones.some(op => resp.includes(op.toLowerCase().substring(0, 5))))
    );
    
    if (esPreguntaPura && resp.length < 30) {
      return {
        esRespuestaValida: false,
        respuestaInterpretada: null,
        valorExtraido: null,
        tipoRespuesta: 'pregunta',
        confianza: 0.9,
        sugerenciaReformulacion: 'El usuario hizo una pregunta en lugar de responder'
      };
    }

    
    if (tipo === 'si_no') {
      const afirmativas = ['si', 'sí', 'sep', 'simon', 'simón', 'aja', 'ajá', 'claro', 'obvio', 'correcto', 'así es', 'efectivamente', 'afirmativo', 'tengo', 'si tengo', 'sí tengo', 'si,', 'sí,'];
      const negativas = ['no', 'nel', 'nop', 'nope', 'para nada', 'negativo', 'ni madres', 'nel pastel', 'ni de pedo', 'nah', 'nanai', 'no tengo', 'no me', 'no,'];
      
      
      const esAfirmativa = afirmativas.some(a => 
        resp === a || 
        resp.startsWith(a + ' ') || 
        resp.startsWith(a + ',') ||
        resp.includes(' ' + a + ' ') ||
        resp.includes(' ' + a + ',')
      );
      const esNegativa = negativas.some(n => 
        resp === n || 
        resp.startsWith(n + ' ') || 
        resp.startsWith(n + ',') ||
        resp.includes(' ' + n + ' ') ||
        resp.includes(' ' + n + ',')
      );
      
      if (esAfirmativa && !esNegativa) {
        return {
          esRespuestaValida: true,
          respuestaInterpretada: 'sí',
          valorExtraido: true,
          tipoRespuesta: 'afirmativa',
          confianza: 0.85
        };
      }
      
      if (esNegativa && !esAfirmativa) {
        return {
          esRespuestaValida: true,
          respuestaInterpretada: 'no',
          valorExtraido: false,
          tipoRespuesta: 'negativa',
          confianza: 0.85
        };
      }
    }

    
    if (tipo === 'opciones' && opciones && opciones.length > 0) {
      for (let i = 0; i < opciones.length; i++) {
        const opcion = opciones[i].toLowerCase();
        const opcionSimplificada = opcion.replace(/[áéíóúñ]/g, m => {
          const map: Record<string, string> = {'á':'a','é':'e','í':'i','ó':'o','ú':'u','ñ':'n'};
          return map[m] || m;
        });
        const respSimplificada = resp.replace(/[áéíóúñ]/g, m => {
          const map: Record<string, string> = {'á':'a','é':'e','í':'i','ó':'o','ú':'u','ñ':'n'};
          return map[m] || m;
        });
        
        
        if (resp === opcion || respSimplificada === opcionSimplificada) {
          return {
            esRespuestaValida: true,
            respuestaInterpretada: opciones[i],
            valorExtraido: opciones[i],
            tipoRespuesta: 'opcion',
            confianza: 0.95
          };
        }
        
        
        if (resp.includes(opcion) || respSimplificada.includes(opcionSimplificada)) {
          return {
            esRespuestaValida: true,
            respuestaInterpretada: opciones[i],
            valorExtraido: opciones[i],
            tipoRespuesta: 'opcion',
            confianza: 0.85
          };
        }
        
        
        const palabrasOpcion = opcion.split(/[\s,\/]+/).filter(p => p.length > 3);
        const palabrasRespuesta = resp.split(/[\s,\/]+/);
        
        
        const coincidencias = palabrasOpcion.filter(po => 
          palabrasRespuesta.some(pr => pr.includes(po) || po.includes(pr))
        );
        
        if (coincidencias.length > 0 && coincidencias.length >= palabrasOpcion.length * 0.5) {
          return {
            esRespuestaValida: true,
            respuestaInterpretada: opciones[i],
            valorExtraido: opciones[i],
            tipoRespuesta: 'opcion',
            confianza: 0.7
          };
        }
        
        
        if (resp === String(i + 1) || resp === `opcion ${i + 1}` || resp === `${i + 1}.` || resp === `opción ${i + 1}`) {
          return {
            esRespuestaValida: true,
            respuestaInterpretada: opciones[i],
            valorExtraido: opciones[i],
            tipoRespuesta: 'opcion',
            confianza: 0.95
          };
        }
      }
      
      
      if (opciones.some(o => o.toLowerCase().includes('estacionamiento'))) {
        if (resp.includes('estacion') || resp.includes('banqueta') || resp.includes('parque')) {
          const opcionEstacionamiento = opciones.find(o => o.toLowerCase().includes('estacionamiento'));
          if (opcionEstacionamiento) {
            return {
              esRespuestaValida: true,
              respuestaInterpretada: opcionEstacionamiento,
              valorExtraido: opcionEstacionamiento,
              tipoRespuesta: 'opcion',
              confianza: 0.75
            };
          }
        }
      }
      
      
      if (opciones.some(o => o.toLowerCase().includes('velocidad'))) {
        if (resp.includes('velocidad') || resp.includes('rapido') || resp.includes('rápido') || resp.includes('correr')) {
          const opcionVelocidad = opciones.find(o => o.toLowerCase().includes('velocidad'));
          if (opcionVelocidad) {
            return {
              esRespuestaValida: true,
              respuestaInterpretada: opcionVelocidad,
              valorExtraido: opcionVelocidad,
              tipoRespuesta: 'opcion',
              confianza: 0.75
            };
          }
        }
      }
      
      
      if (opciones.some(o => o.toLowerCase().includes('semáforo') || o.toLowerCase().includes('alto'))) {
        if (resp.includes('semaforo') || resp.includes('semáforo') || resp.includes('alto') || resp.includes('rojo')) {
          const opcionSemaforo = opciones.find(o => o.toLowerCase().includes('semáforo') || o.toLowerCase().includes('alto'));
          if (opcionSemaforo) {
            return {
              esRespuestaValida: true,
              respuestaInterpretada: opcionSemaforo,
              valorExtraido: opcionSemaforo,
              tipoRespuesta: 'opcion',
              confianza: 0.75
            };
          }
        }
      }
      
      
      if (resp.includes('advertencia') || resp.includes('solo advertencia') || resp.includes('solo fue advertencia')) {
        const opcionAdvertencia = opciones.find(o => o.toLowerCase().includes('advertencia'));
        if (opcionAdvertencia) {
          return {
            esRespuestaValida: true,
            respuestaInterpretada: opcionAdvertencia,
            valorExtraido: false,  
            tipoRespuesta: 'negativa',
            confianza: 0.9
          };
        }
      }
      
      if (resp.includes('mordida') || resp.includes('dinero') || resp.includes('pidio') || resp.includes('pidió')) {
        const opcionMordida = opciones.find(o => o.toLowerCase().includes('dinero') || o.toLowerCase().includes('pidió'));
        if (opcionMordida) {
          return {
            esRespuestaValida: true,
            respuestaInterpretada: opcionMordida,
            valorExtraido: true,  
            tipoRespuesta: 'afirmativa',
            confianza: 0.9
          };
        }
      }
    }

    
    const irrelevantes = [
      'del semaforo', 'del semáforo', 'por ponerse', 'quien sabe', 'quién sabe',
      'ni idea', 'no se que', 'no sé qué'
    ];
    
    
    if (resp.length < 40 && irrelevantes.some(i => resp.includes(i))) {
      
      const tieneContextoUtil = opciones?.some(op => {
        const palabras = op.toLowerCase().split(/\s+/);
        return palabras.some(p => p.length > 4 && resp.includes(p));
      });
      
      if (!tieneContextoUtil) {
        return {
          esRespuestaValida: false,
          respuestaInterpretada: null,
          valorExtraido: null,
          tipoRespuesta: 'irrelevante',
          confianza: 0.7,
          sugerenciaReformulacion: 'La respuesta no parece relacionada con la pregunta'
        };
      }
    }

    
    if (tipo === 'opciones' && opciones && opciones.length > 0) {
      
      let mejorCoincidencia = { indice: -1, score: 0 };
      
      for (let i = 0; i < opciones.length; i++) {
        const palabrasOpcion = opciones[i].toLowerCase().split(/\s+/).filter(p => p.length > 2);
        let score = 0;
        
        for (const palabra of palabrasOpcion) {
          if (resp.includes(palabra)) {
            score += palabra.length;
          }
        }
        
        if (score > mejorCoincidencia.score) {
          mejorCoincidencia = { indice: i, score };
        }
      }
      
      
      if (mejorCoincidencia.score >= 5) {
        return {
          esRespuestaValida: true,
          respuestaInterpretada: opciones[mejorCoincidencia.indice],
          valorExtraido: opciones[mejorCoincidencia.indice],
          tipoRespuesta: 'opcion',
          confianza: 0.6
        };
      }
    }

    
    return {
      esRespuestaValida: false,
      respuestaInterpretada: null,
      valorExtraido: null,
      tipoRespuesta: 'ambigua',
      confianza: 0.3,
      sugerenciaReformulacion: 'No pude entender la respuesta'
    };
  }

  
  private async consultarOllama(
    pregunta: string,
    respuesta: string,
    opciones: string[] | null,
    tipo: string
  ): Promise<InterpretationResult> {
    
    const opcionesTexto = opciones ? opciones.join(', ') : 'respuesta abierta';
    
    const prompt = `Eres un asistente legal mexicano. Necesito que interpretes la respuesta de un usuario.

PREGUNTA QUE SE HIZO: "${pregunta}"
TIPO DE RESPUESTA ESPERADA: ${tipo === 'si_no' ? 'Sí o No' : tipo === 'opciones' ? `Una de estas opciones: ${opcionesTexto}` : tipo}
RESPUESTA DEL USUARIO: "${respuesta}"

Analiza si la respuesta es válida y extrae la información. Responde SOLO en este formato JSON exacto:
{
  "esValida": true/false,
  "interpretacion": "qué quiso decir el usuario" o null,
  "valor": "valor extraído" o null,
  "tipo": "afirmativa|negativa|opcion|ambigua|irrelevante|pregunta",
  "confianza": 0.0-1.0,
  "reformulacion": "sugerencia para reformular la pregunta" o null
}

IMPORTANTE:
- Si el usuario pregunta en lugar de responder (ejemplo: "qué es eso"), marca como "pregunta"
- Si la respuesta no tiene relación con la pregunta, marca como "irrelevante"
- Si es ambigua pero podemos inferir algo, intenta extraer el valor
- El slang mexicano es válido: "simon" = sí, "nel" = no, "la neta" = la verdad, etc.`;

    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: 'llama3',
      prompt,
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 200
      }
    });

    try {

      const responseText = response.data.response || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          esRespuestaValida: parsed.esValida === true,
          respuestaInterpretada: parsed.interpretacion,
          valorExtraido: parsed.valor,
          tipoRespuesta: parsed.tipo || 'ambigua',
          confianza: parsed.confianza || 0.5,
          sugerenciaReformulacion: parsed.reformulacion
        };
      }
    } catch (parseError) {
      console.error('Error parseando respuesta de Ollama:', parseError);
    }

    
    return {
      esRespuestaValida: false,
      respuestaInterpretada: null,
      valorExtraido: null,
      tipoRespuesta: 'ambigua',
      confianza: 0.3,
      sugerenciaReformulacion: 'No pude interpretar la respuesta'
    };
  }

  
  async reformularPregunta(
    preguntaOriginal: string,
    respuestaConfusa: string,
    opciones: string[] | null
  ): Promise<string> {
    
    const opcionesTexto = opciones ? `\nOpciones: ${opciones.join(' | ')}` : '';
    
    
    const reformulaciones: Record<string, string> = {
      
      '¿De quién fue la culpa del accidente?': 
        '¿Quién causó el accidente? ¿Tú, el otro conductor, o ambos?',
      
      
      '¿Tienes seguro de auto vigente?': 
        '¿Tu carro tiene seguro? (el que pagas cada mes/año para cubrir accidentes)',
      
      
      '¿Qué tan dañado quedó tu vehículo?':
        '¿Cómo quedó tu carro? ¿Solo rayones o golpes más fuertes?',
      
      
      '¿Hay heridos o alguna persona lesionada?':
        '¿Alguien resultó lastimado en el accidente?',
      
      
      '¿Te hicieron la prueba de alcoholemia (soplar)?':
        '¿Te pidieron soplar en un aparato para medir el alcohol?',
      
      
      '¿El otro conductor sigue ahí o se fue?':
        '¿El otro conductor se quedó o se fue/escapó del lugar?'
    };

    
    for (const [original, reformulada] of Object.entries(reformulaciones)) {
      if (preguntaOriginal.includes(original.substring(0, 20))) {
        return reformulada + opcionesTexto;
      }
    }

    
    try {
      const prompt = `El usuario no entendió esta pregunta: "${preguntaOriginal}"
Su respuesta fue: "${respuestaConfusa}"

Reformula la pregunta de forma MÁS SIMPLE y CLARA, usando lenguaje coloquial mexicano.
Solo devuelve la pregunta reformulada, nada más.`;

      const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
        model: 'llama3',
        prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 100
        }
      });

      const reformulada = response.data.response?.trim() || preguntaOriginal;
      return reformulada + opcionesTexto;
      
    } catch (error) {
      console.error('Error reformulando con Ollama:', error);
      
      return `${preguntaOriginal}\n(Por favor, responde con una de las opciones)${opcionesTexto}`;
    }
  }

  
  detectarSaltarInterrogatorio(respuesta: string): boolean {
    const saltarPatterns = [
      'solo dime', 'sólo dime', 'dime ya', 'solo quiero saber',
      've al grano', 'al grano', 'responde ya', 'deja de preguntar',
      'no tengo tiempo', 'rapido', 'rápido', 'directo', 'sin rodeos',
      'skip', 'saltar', 'omitir'
    ];
    
    const resp = respuesta.toLowerCase();
    return saltarPatterns.some(p => resp.includes(p));
  }

  
  limpiarCache(): void {
    this.cache.clear();
  }
}


export const ollamaIntentInterpreter = new OllamaIntentInterpreter();
