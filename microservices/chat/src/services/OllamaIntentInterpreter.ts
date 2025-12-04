/**
 * OllamaIntentInterpreter.ts
 * 
 * Usa Ollama (llama3) para interpretar respuestas ambiguas del usuario
 * durante el proceso de interrogación.
 * 
 * Cuando el usuario dice cosas como:
 * - "del semáforo por ponerse en rojo" (en vez de responder quién tuvo la culpa)
 * - "a poco se dañan esas cosas" (respuesta evasiva)
 * - "que es eso" (no entendió la pregunta)
 * 
 * Ollama ayuda a:
 * 1. Detectar si es una respuesta válida a la pregunta
 * 2. Extraer la información relevante si la hay
 * 3. Determinar si necesitamos reformular la pregunta
 */

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

  /**
   * Interpreta la respuesta del usuario en el contexto de una pregunta específica
   */
  async interpretarRespuesta(
    preguntaHecha: string,
    respuestaUsuario: string,
    opcionesValidas: string[] | null,
    tipoEsperado: 'si_no' | 'opciones' | 'texto' | 'numero'
  ): Promise<InterpretationResult> {
    
    // Cache para respuestas similares
    const cacheKey = `${preguntaHecha}|${respuestaUsuario}|${tipoEsperado}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Primero intentar interpretación local rápida
    const localResult = this.interpretarLocalmente(respuestaUsuario, opcionesValidas, tipoEsperado);
    
    if (localResult.confianza >= 0.8) {
      this.cache.set(cacheKey, localResult);
      return localResult;
    }

    // Si no estamos seguros, usar Ollama
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

  /**
   * Interpretación local rápida sin usar Ollama
   */
  private interpretarLocalmente(
    respuesta: string,
    opciones: string[] | null,
    tipo: string
  ): InterpretationResult {
    const resp = respuesta.toLowerCase().trim();

    // Detectar si es una pregunta del usuario (no una respuesta)
    // Pero NO marcar como pregunta si contiene palabras de las opciones
    const esPreguntaPura = (
      (resp.includes('?') || 
       resp.startsWith('que es') || 
       resp.startsWith('qué es') ||
       resp.startsWith('a poco')) &&
      // Verificar que NO contenga ninguna de las opciones
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

    // Para tipo si_no
    if (tipo === 'si_no') {
      const afirmativas = ['si', 'sí', 'sep', 'simon', 'simón', 'aja', 'ajá', 'claro', 'obvio', 'correcto', 'así es', 'efectivamente', 'afirmativo', 'tengo', 'si tengo', 'sí tengo', 'si,', 'sí,'];
      const negativas = ['no', 'nel', 'nop', 'nope', 'para nada', 'negativo', 'ni madres', 'nel pastel', 'ni de pedo', 'nah', 'nanai', 'no tengo', 'no me', 'no,'];
      
      // Buscar al inicio o como palabra completa
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

    // Para tipo opciones - buscar coincidencia con opciones dadas
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
        
        // Coincidencia exacta
        if (resp === opcion || respSimplificada === opcionSimplificada) {
          return {
            esRespuestaValida: true,
            respuestaInterpretada: opciones[i],
            valorExtraido: opciones[i],
            tipoRespuesta: 'opcion',
            confianza: 0.95
          };
        }
        
        // Respuesta contiene la opción completa
        if (resp.includes(opcion) || respSimplificada.includes(opcionSimplificada)) {
          return {
            esRespuestaValida: true,
            respuestaInterpretada: opciones[i],
            valorExtraido: opciones[i],
            tipoRespuesta: 'opcion',
            confianza: 0.85
          };
        }
        
        // Buscar palabras clave de la opción en la respuesta
        const palabrasOpcion = opcion.split(/[\s,\/]+/).filter(p => p.length > 3);
        const palabrasRespuesta = resp.split(/[\s,\/]+/);
        
        // Si al menos una palabra clave de la opción está en la respuesta
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
        
        // Número de opción (1, 2, 3...)
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
      
      // Búsqueda más flexible para casos específicos
      // Estacionamiento
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
      
      // Velocidad
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
      
      // Semáforo/Alto
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
      
      // Advertencia vs Mordida (caso especial muy importante)
      if (resp.includes('advertencia') || resp.includes('solo advertencia') || resp.includes('solo fue advertencia')) {
        const opcionAdvertencia = opciones.find(o => o.toLowerCase().includes('advertencia'));
        if (opcionAdvertencia) {
          return {
            esRespuestaValida: true,
            respuestaInterpretada: opcionAdvertencia,
            valorExtraido: false,  // No pidieron mordida
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
            valorExtraido: true,  // Sí pidieron mordida
            tipoRespuesta: 'afirmativa',
            confianza: 0.9
          };
        }
      }
    }

    // Respuestas claramente irrelevantes - solo si son cortas y sin contexto
    const irrelevantes = [
      'del semaforo', 'del semáforo', 'por ponerse', 'quien sabe', 'quién sabe',
      'ni idea', 'no se que', 'no sé qué'
    ];
    
    // Solo marcar como irrelevante si es corta Y no contiene palabras útiles
    if (resp.length < 40 && irrelevantes.some(i => resp.includes(i))) {
      // Verificar que no contenga palabras relacionadas con las opciones
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

    // Si llegamos aquí con opciones pero no encontramos coincidencia,
    // intentar ser más permisivos antes de marcar como ambiguo
    if (tipo === 'opciones' && opciones && opciones.length > 0) {
      // Si la respuesta es larga (>50 chars), probablemente tiene info útil
      // Buscar la opción que más coincida
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
      
      // Si encontramos alguna coincidencia razonable
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

    // Respuesta ambigua - no podemos determinar
    return {
      esRespuestaValida: false,
      respuestaInterpretada: null,
      valorExtraido: null,
      tipoRespuesta: 'ambigua',
      confianza: 0.3,
      sugerenciaReformulacion: 'No pude entender la respuesta'
    };
  }

  /**
   * Consultar Ollama para interpretar respuestas complejas
   */
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
      // Extraer JSON de la respuesta
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

    // Fallback si no podemos parsear
    return {
      esRespuestaValida: false,
      respuestaInterpretada: null,
      valorExtraido: null,
      tipoRespuesta: 'ambigua',
      confianza: 0.3,
      sugerenciaReformulacion: 'No pude interpretar la respuesta'
    };
  }

  /**
   * Reformular una pregunta cuando el usuario no entendió
   */
  async reformularPregunta(
    preguntaOriginal: string,
    respuestaConfusa: string,
    opciones: string[] | null
  ): Promise<string> {
    
    const opcionesTexto = opciones ? `\nOpciones: ${opciones.join(' | ')}` : '';
    
    // Intentar localmente primero con variaciones predefinidas
    const reformulaciones: Record<string, string> = {
      // Preguntas de culpabilidad
      '¿De quién fue la culpa del accidente?': 
        '¿Quién causó el accidente? ¿Tú, el otro conductor, o ambos?',
      
      // Preguntas de seguro
      '¿Tienes seguro de auto vigente?': 
        '¿Tu carro tiene seguro? (el que pagas cada mes/año para cubrir accidentes)',
      
      // Preguntas de daños
      '¿Qué tan dañado quedó tu vehículo?':
        '¿Cómo quedó tu carro? ¿Solo rayones o golpes más fuertes?',
      
      // Preguntas de heridos
      '¿Hay heridos o alguna persona lesionada?':
        '¿Alguien resultó lastimado en el accidente?',
      
      // Preguntas de alcoholemia
      '¿Te hicieron la prueba de alcoholemia (soplar)?':
        '¿Te pidieron soplar en un aparato para medir el alcohol?',
      
      // Otro conductor
      '¿El otro conductor sigue ahí o se fue?':
        '¿El otro conductor se quedó o se fue/escapó del lugar?'
    };

    // Buscar reformulación predefinida
    for (const [original, reformulada] of Object.entries(reformulaciones)) {
      if (preguntaOriginal.includes(original.substring(0, 20))) {
        return reformulada + opcionesTexto;
      }
    }

    // Si no hay reformulación predefinida, usar Ollama
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
      // Fallback: agregar clarificación básica
      return `${preguntaOriginal}\n(Por favor, responde con una de las opciones)${opcionesTexto}`;
    }
  }

  /**
   * Detectar si el usuario quiere saltar el interrogatorio
   */
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

  /**
   * Limpiar cache
   */
  limpiarCache(): void {
    this.cache.clear();
  }
}

// Instancia singleton
export const ollamaIntentInterpreter = new OllamaIntentInterpreter();
