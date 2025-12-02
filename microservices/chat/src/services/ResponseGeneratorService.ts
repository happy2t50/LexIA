/**
 * SERVICIO DE GENERACIÓN DE RESPUESTAS - LexIA
 * 
 * Genera respuestas empáticas y contextualizadas usando:
 * 1. System Prompt especializado para tránsito
 * 2. Análisis de sentimiento del usuario
 * 3. Plantillas adaptadas por emoción
 * 4. Resumen inteligente de artículos RAG
 */

import { ArticuloLegal } from './SmartResponseService';

// Tipos de sentimiento detectables
export type Sentimiento = 'preocupado' | 'frustrado' | 'enojado' | 'neutral' | 'curioso' | 'urgente' | 'confundido';

// Configuración del System Prompt para el MLL
export const SYSTEM_PROMPT = `Eres LexIA, un asistente legal especializado en derecho de tránsito del estado de Chiapas, México.

Tu personalidad:
- Empático y comprensivo: Entiendes que las situaciones de tránsito pueden ser estresantes
- Profesional pero accesible: Usas lenguaje claro, evitando tecnicismos innecesarios
- Orientado a soluciones: Das pasos concretos y accionables
- Honesto sobre limitaciones: Si algo requiere un abogado, lo indicas claramente

Estructura de tus respuestas:
1. RECONOCE la situación del usuario con empatía
2. EXPLICA de forma narrativa y clara (no solo citas legales)
3. PROPORCIONA pasos concretos a seguir
4. MENCIONA soporte legal solo como referencia

Reglas importantes:
- Nunca des consejos médicos
- Siempre sugiere consultar a un profesional para casos complejos
- No inventes artículos o leyes - usa solo la información proporcionada
- Si no tienes información suficiente, admítelo
- Responde SIEMPRE en español mexicano

Jurisdicción: Estado de Chiapas, México (2024-2025)`;

/**
 * Clase para generar respuestas inteligentes
 */
export class ResponseGeneratorService {
  
  /**
   * Detectar el sentimiento del mensaje del usuario
   */
  detectarSentimiento(mensaje: string): Sentimiento {
    const msgLower = mensaje.toLowerCase();
    
    // Patrones para cada sentimiento
    const patrones: Record<Sentimiento, string[]> = {
      'urgente': ['urgente', 'ayuda', 'ahora mismo', 'inmediato', 'emergencia', '911', 'rapido', 'rápido', 'ya', 'ahorita'],
      'enojado': ['injusto', 'robo', 'ladrones', 'abuso', 'corruptos', 'malditos', 'enojado', 'furioso', 'hartx', 'harto'],
      'frustrado': ['no entiendo', 'otra vez', 'ya intente', 'ya intenté', 'no funciona', 'cansado', 'frustrado', 'desesperado'],
      'preocupado': ['miedo', 'preocupa', 'preocupado', 'nervioso', 'ansiedad', 'que va a pasar', 'qué va a pasar', 'consecuencias'],
      'confundido': ['no se', 'no sé', 'confundido', 'cual es', 'cuál es', 'como es', 'cómo es', 'que significa', 'qué significa', 'explica'],
      'curioso': ['quiero saber', 'me gustaria', 'me gustaría', 'puedo', 'es posible', 'informacion', 'información', 'consulta'],
      'neutral': [] // Por defecto
    };
    
    // Contar matches por sentimiento
    let mejorSentimiento: Sentimiento = 'neutral';
    let mejorScore = 0;
    
    for (const [sentimiento, keywords] of Object.entries(patrones)) {
      const matches = keywords.filter(kw => msgLower.includes(kw)).length;
      if (matches > mejorScore) {
        mejorScore = matches;
        mejorSentimiento = sentimiento as Sentimiento;
      }
    }
    
    // Detectar urgencia por signos de exclamación
    const exclamaciones = (mensaje.match(/!/g) || []).length;
    if (exclamaciones >= 2 && mejorSentimiento === 'neutral') {
      mejorSentimiento = 'urgente';
    }
    
    // Detectar mayúsculas sostenidas (enojo)
    const palabrasMayusculas = mensaje.split(' ').filter(w => w.length > 3 && w === w.toUpperCase()).length;
    if (palabrasMayusculas >= 2) {
      mejorSentimiento = 'enojado';
    }
    
    return mejorSentimiento;
  }

  /**
   * Obtener introducción empática según el sentimiento
   */
  getIntroduccionEmpatica(sentimiento: Sentimiento, nombreUsuario: string, tema: string): string {
    const nombre = nombreUsuario || 'amigo';
    
    const introducciones: Record<Sentimiento, string[]> = {
      'urgente': [
        `${nombre}, entiendo que necesitas una respuesta rápida. `,
        `Atendamos esto de inmediato, ${nombre}. `,
        `${nombre}, vamos directo al punto. `
      ],
      'enojado': [
        `${nombre}, entiendo completamente tu frustración. Es una situación difícil. `,
        `Comprendo tu molestia, ${nombre}. Veamos qué opciones tienes. `,
        `${nombre}, tienes razón en sentirte así. Déjame ayudarte. `
      ],
      'frustrado': [
        `${nombre}, sé que esto puede ser complicado. Vamos paso a paso. `,
        `Entiendo que ya has intentado resolver esto, ${nombre}. Veamos juntos las opciones. `,
        `No te preocupes, ${nombre}. Vamos a aclarar esto. `
      ],
      'preocupado': [
        `${nombre}, es normal preocuparse en esta situación. La buena noticia es que hay solución. `,
        `Tranquilo, ${nombre}. Vamos a ver esto juntos y encontrar la mejor opción. `,
        `${nombre}, respira. Te voy a explicar exactamente qué puedes hacer. `
      ],
      'confundido': [
        `${nombre}, te explico de forma clara. `,
        `Entiendo que puede ser confuso, ${nombre}. Déjame simplificarlo. `,
        `${nombre}, vamos a aclarar tus dudas paso a paso. `
      ],
      'curioso': [
        `¡Buena pregunta, ${nombre}! `,
        `${nombre}, te explico. `,
        `Claro, ${nombre}. Aquí va la información. `
      ],
      'neutral': [
        `${nombre}, `,
        `Entendido, ${nombre}. `,
        `${nombre}, te comento. `
      ]
    };
    
    const opciones = introducciones[sentimiento] || introducciones['neutral'];
    return opciones[Math.floor(Math.random() * opciones.length)];
  }

  /**
   * Generar resumen narrativo de artículos legales
   * (Versión sin MLL - usa plantillas inteligentes)
   */
  generarResumenNarrativo(articulos: ArticuloLegal[], tema: string): string {
    if (!articulos || articulos.length === 0) {
      return '';
    }
    
    const artPrincipal = articulos[0];
    
    // Extraer número de artículo
    const numMatch = artPrincipal.contenido.match(/art[íi]culo\s*(\d+[\w\-]*)/i);
    const numArticulo = numMatch ? numMatch[1] : '';
    
    // Limpiar contenido
    const contenidoLimpio = artPrincipal.contenido
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 400);
    
    // Construir referencia
    let resumen = '';
    
    if (numArticulo) {
      resumen += `📜 Según el **Artículo ${numArticulo}** del Reglamento de Tránsito:\n\n`;
    } else {
      resumen += `📜 Según la legislación vigente:\n\n`;
    }
    
    resumen += `_"${contenidoLimpio}${artPrincipal.contenido.length > 400 ? '...' : ''}"_\n`;
    
    // Agregar artículos relacionados
    if (articulos.length > 1) {
      resumen += `\n📋 **También aplica:**\n`;
      articulos.slice(1, 3).forEach(art => {
        const artNum = art.titulo.match(/\d+/)?.[0] || '';
        resumen += `• ${art.titulo.substring(0, 80)}${art.titulo.length > 80 ? '...' : ''}\n`;
      });
    }
    
    return resumen;
  }

  /**
   * Obtener cierre según el sentimiento
   */
  getCierreEmpatico(sentimiento: Sentimiento, nombreUsuario: string): string {
    const nombre = nombreUsuario || '';
    
    const cierres: Record<Sentimiento, string[]> = {
      'urgente': [
        `¿Hay algo más urgente en lo que pueda ayudarte${nombre ? ', ' + nombre : ''}?`,
        `Si necesitas más ayuda inmediata${nombre ? ', ' + nombre : ''}, estoy aquí.`
      ],
      'enojado': [
        `Espero que esto te ayude a resolver la situación${nombre ? ', ' + nombre : ''}. ¿Puedo orientarte en algo más?`,
        `${nombre ? nombre + ', s' : 'S'}i necesitas más información para defender tu caso, pregúntame.`
      ],
      'frustrado': [
        `Espero haber aclarado tus dudas${nombre ? ', ' + nombre : ''}. ¿Algo más que pueda explicarte?`,
        `${nombre ? nombre + ', e' : 'E'}stoy aquí si tienes más preguntas.`
      ],
      'preocupado': [
        `No estás solo en esto${nombre ? ', ' + nombre : ''}. ¿Puedo ayudarte con algo más?`,
        `${nombre ? nombre + ', r' : 'R'}ecuerda que cada situación tiene solución. ¿Algo más?`
      ],
      'confundido': [
        `¿Te quedó claro${nombre ? ', ' + nombre : ''}? Si tienes más dudas, pregúntame con confianza.`,
        `Espero haber simplificado esto${nombre ? ', ' + nombre : ''}. ¿Hay algo más que no entiendas?`
      ],
      'curioso': [
        `¿Te gustaría saber algo más${nombre ? ', ' + nombre : ''}?`,
        `¿Alguna otra pregunta${nombre ? ', ' + nombre : ''}?`
      ],
      'neutral': [
        `¿En qué más puedo ayudarte${nombre ? ', ' + nombre : ''}?`,
        `¿Algo más que necesites saber${nombre ? ', ' + nombre : ''}?`
      ]
    };
    
    const opciones = cierres[sentimiento] || cierres['neutral'];
    return opciones[Math.floor(Math.random() * opciones.length)];
  }

  /**
   * Formatear pasos a seguir de forma amigable
   */
  formatearPasos(pasos: string[], sentimiento: Sentimiento): string {
    if (!pasos || pasos.length === 0) return '';
    
    let resultado = '';
    
    // Título según urgencia
    if (sentimiento === 'urgente') {
      resultado += `\n⚡ **Haz esto ahora:**\n`;
    } else {
      resultado += `\n📋 **Pasos a seguir:**\n`;
    }
    
    pasos.forEach((paso, index) => {
      resultado += `${index + 1}. ${paso}\n`;
    });
    
    return resultado;
  }

  /**
   * Generar respuesta completa formateada
   */
  generarRespuestaFormateada(
    nombreUsuario: string,
    tema: string,
    sentimiento: Sentimiento,
    articulosLegales: ArticuloLegal[],
    pasos: string[],
    infoAdicional?: string
  ): string {
    let respuesta = '';
    
    // 1. Introducción empática
    respuesta += this.getIntroduccionEmpatica(sentimiento, nombreUsuario, tema);
    
    // 2. Resumen narrativo de artículos
    const resumenLegal = this.generarResumenNarrativo(articulosLegales, tema);
    if (resumenLegal) {
      respuesta += '\n\n' + resumenLegal;
    }
    
    // 3. Pasos a seguir
    if (pasos && pasos.length > 0) {
      respuesta += this.formatearPasos(pasos, sentimiento);
    }
    
    // 4. Información adicional
    if (infoAdicional) {
      respuesta += '\n' + infoAdicional;
    }
    
    // 5. Cierre empático
    respuesta += '\n\n' + this.getCierreEmpatico(sentimiento, nombreUsuario);
    
    return respuesta;
  }
}

// Singleton
let responseGeneratorInstance: ResponseGeneratorService | null = null;

export function getResponseGenerator(): ResponseGeneratorService {
  if (!responseGeneratorInstance) {
    responseGeneratorInstance = new ResponseGeneratorService();
  }
  return responseGeneratorInstance;
}
