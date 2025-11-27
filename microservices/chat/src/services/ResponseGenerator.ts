// Generador de Respuestas Empáticas y Formales
import { Sentimiento, Intencion, ChatResponse, ArticuloRelevante, Sugerencia } from '../types';

interface ResponseTemplate {
  apertura: string;
  desarrollo: string;
  cierre: string;
}

export class ResponseGenerator {
  private templates: Record<Sentimiento, ResponseTemplate> = {
    preocupado: {
      apertura: 'Hola {nombre}, entiendo tu preocupación.',
      desarrollo: 'Es importante que sepas que tienes opciones para resolver esta situación.',
      cierre: '¿Te gustaría que te ayude con algo más específico?'
    },

    frustrado: {
      apertura: 'Comprendo tu frustración {nombre}.',
      desarrollo:
        'Es común que estos cambios en las normativas generen confusión. La buena noticia es que tienes varias alternativas.',
      cierre: '¿Quieres que te muestre las opciones disponibles?'
    },

    enojado: {
      apertura: 'Entiendo que esta situación te molesta {nombre}.',
      desarrollo:
        'Tienes derecho a sentirte así. Déjame ayudarte a encontrar la mejor manera de abordar este problema.',
      cierre: '¿Te gustaría conocer tus derechos en esta situación?'
    },

    confundido: {
      apertura: 'Hola {nombre}, déjame ayudarte a aclarar esto.',
      desarrollo: 'Voy a explicarte de manera sencilla qué significa esto según la legislación actual.',
      cierre: '¿Quedó más claro? ¿Tienes alguna otra duda?'
    },

    neutral: {
      apertura: 'Hola {nombre}, con gusto te ayudo.',
      desarrollo: 'Según la legislación vigente, esto es lo que necesitas saber.',
      cierre: '¿Necesitas más información sobre este tema?'
    },

    positivo: {
      apertura: 'Hola {nombre}, me alegra poder ayudarte.',
      desarrollo: 'Te comparto la información que necesitas.',
      cierre: '¿Hay algo más en lo que pueda asistirte?'
    }
  };

  /**
   * Generar respuesta completa basada en contexto
   */
  generateResponse(
    nombreUsuario: string,
    sentimiento: Sentimiento,
    intencion: Intencion,
    articulos: ArticuloRelevante[],
    cluster?: string,
    contextoConversacion?: string
  ): string {
    const template = this.templates[sentimiento] || this.templates.neutral;

    // Apertura personalizada
    let respuesta = template.apertura.replace('{nombre}', nombreUsuario);
    respuesta += '\n\n';

    // Si hay contexto previo, referenciarlo
    if (contextoConversacion) {
      respuesta += this.addConversationContext(contextoConversacion);
    }

    // Desarrollo basado en intención
    respuesta += this.buildMainContent(intencion, articulos, template.desarrollo);
    respuesta += '\n\n';

    // Agregar artículos relevantes
    if (articulos.length > 0) {
      respuesta += this.formatArticles(articulos);
      respuesta += '\n\n';
    }

    // Cierre
    respuesta += template.cierre;

    return respuesta.trim();
  }

  /**
   * Construir contenido principal según intención
   */
  private buildMainContent(
    intencion: Intencion,
    articulos: ArticuloRelevante[],
    defaultContent: string
  ): string {
    switch (intencion) {
      case 'consulta_multa':
        return this.buildMultaResponse(articulos);

      case 'queja':
        return 'Es válido tu inconformidad. Déjame mostrarte las opciones que tienes para impugnar o resolver esta situación.';

      case 'buscar_abogado':
        return 'Puedo recomendarte abogados especializados en este tipo de casos. Ellos tienen experiencia ayudando a personas en situaciones similares.';

      case 'impugnar':
        return 'Para impugnar una multa, estos son los pasos que debes seguir según la legislación actual.';

      case 'informacion':
        return 'Con gusto te proporciono la información legal que necesitas.';

      case 'compartir_experiencia':
        return 'Gracias por compartir tu experiencia. Esto puede ayudar a otros usuarios que enfrenten situaciones similares.';

      default:
        return defaultContent;
    }
  }

  /**
   * Construir respuesta específica para multas
   */
  private buildMultaResponse(articulos: ArticuloRelevante[]): string {
    if (articulos.length === 0) {
      return 'Déjame buscar la información específica sobre tu caso en nuestra base de conocimiento legal.';
    }

    const articulo = articulos[0];
    let response = `Según la legislación vigente, este tipo de infracción está regulada. `;

    // Extraer monto de multa si existe
    const multaMatch = articulo.contenido.match(/(\d+)\s*SMLV/i);
    if (multaMatch) {
      response += `La multa establecida es de ${multaMatch[1]} SMLV (Salarios Mínimos Legales Vigentes). `;
    }

    return response;
  }

  /**
   * Formatear artículos legales
   */
  private formatArticles(articulos: ArticuloRelevante[]): string {
    let formatted = '📋 **Información Legal Aplicable:**\n\n';

    articulos.slice(0, 2).forEach((art, index) => {
      formatted += `**${index + 1}. ${art.titulo}**\n`;
      formatted += `🏛️ Fuente: ${art.fuente}\n`;

      // Extracto del contenido (primeras 200 caracteres)
      const extracto =
        art.contenido.length > 200
          ? art.contenido.substring(0, 200) + '...'
          : art.contenido;

      formatted += `📄 ${extracto}\n`;

      // Similitud
      formatted += `✓ Relevancia: ${(art.similitud * 100).toFixed(0)}%\n\n`;
    });

    if (articulos.length > 2) {
      formatted += `_(y ${articulos.length - 2} artículo(s) más)_\n`;
    }

    return formatted;
  }

  /**
   * Agregar referencia al contexto de conversación
   */
  private addConversationContext(contexto: string): string {
    return `Continuando con nuestra conversación anterior, `;
  }

  /**
   * Generar sugerencias basadas en cluster e intención
   */
  generateSuggestions(
    cluster: string,
    intencion: Intencion,
    sentimiento: Sentimiento
  ): Sugerencia[] {
    const sugerencias: Sugerencia[] = [];

    // Siempre sugerir abogados para clusters problemáticos
    if (['C2', 'C3', 'C5'].includes(cluster)) {
      sugerencias.push({
        tipo: 'abogados',
        texto: '👨‍⚖️ Ver abogados especializados',
        accion: 'show_lawyers'
      });
    }

    // Sugerir impugnar si está frustrado/enojado
    if (['frustrado', 'enojado'].includes(sentimiento)) {
      sugerencias.push({
        tipo: 'impugnar',
        texto: '⚖️ ¿Cómo impugnar esta multa?',
        accion: 'show_impugnation_guide'
      });
    }

    // Sugerir pagar con descuento
    if (intencion === 'consulta_multa') {
      sugerencias.push({
        tipo: 'pagar',
        texto: '💰 Ver opciones de pago con descuento',
        accion: 'show_payment_options'
      });
    }

    // Sugerir foro comunitario
    sugerencias.push({
      tipo: 'foro',
      texto: '👥 Conectar con usuarios en situación similar',
      accion: 'show_forum'
    });

    // Más información
    sugerencias.push({
      tipo: 'informacion',
      texto: 'ℹ️ Más información sobre este tema',
      accion: 'show_more_info'
    });

    return sugerencias;
  }

  /**
   * Generar mensaje de bienvenida
   */
  generateWelcomeMessage(nombreUsuario: string): string {
    return `¡Hola ${nombreUsuario}! 👋

Soy **LexIA**, tu asistente legal inteligente especializado en tránsito y normativas vehiculares.

Estoy aquí para ayudarte con:
• 📋 Consultas sobre multas e infracciones
• ⚖️ Información sobre artículos y leyes de tránsito
• 👨‍⚖️ Recomendación de abogados especializados
• 💡 Asesoría sobre tus derechos
• 👥 Conexión con usuarios en situaciones similares

¿En qué puedo ayudarte hoy?`;
  }

  /**
   * Generar mensaje de cambio de tema
   */
  generateTopicChangeMessage(nuevoTema: string): string {
    const temasMap: Record<string, string> = {
      C1: 'infracciones de velocidad y semáforos',
      C2: 'estacionamiento',
      C3: 'controles de alcoholemia',
      C4: 'documentación vehicular',
      C5: 'accidentes de tránsito'
    };

    const tema = temasMap[nuevoTema] || 'este nuevo tema';

    return `Veo que ahora estamos hablando sobre **${tema}**. Con gusto te ayudo con esta nueva consulta.`;
  }

  /**
   * Generar mensaje de despedida
   */
  generateGoodbyeMessage(): string {
    return `Fue un placer ayudarte. Si tienes más dudas en el futuro, no dudes en contactarme.

🌟 Recuerda que puedes:
• Volver a consultar el historial de esta conversación
• Compartir tu experiencia en el foro
• Contactar a los abogados recomendados

¡Que tengas un excelente día! 👋`;
  }

  /**
   * Generar respuesta cuando no se encuentran resultados
   */
  generateNoResultsMessage(query: string): string {
    return `No encontré información específica sobre "${query}" en nuestra base de conocimiento legal actual.

Sin embargo, puedo:
• 👨‍⚖️ Recomendarte abogados especializados que pueden asesorarte
• 👥 Conectarte con otros usuarios que puedan tener experiencia similar
• 📖 Buscar información general relacionada

¿Qué te gustaría hacer?`;
  }
}
