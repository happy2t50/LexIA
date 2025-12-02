// Generador de Respuestas Empáticas y Formales
import { Sentimiento, Intencion, ChatResponse, ArticuloRelevante, Sugerencia, LegalResponse } from '../types';

interface ResponseTemplate {
  apertura: string;
  desarrollo: string;
  cierre: string;
}

// Base de conocimiento general de tránsito (respuestas directas)
interface KnowledgeEntry {
  keywords: string[];
  response: string;
  minKeywordMatch?: number; // mínimo de keywords que deben coincidir
}

// Temas que pueden tener seguimiento (para memoria de contexto)
interface ConversationTopic {
  id: string;
  keywords: string[];
  followUpKeywords: string[]; // Palabras que indican pregunta de seguimiento
}

const CONVERSATION_TOPICS: ConversationTopic[] = [
  { id: 'velocidad_escolar', keywords: ['escolar', 'escuela', 'velocidad', 'límite'], followUpKeywords: ['excedo', 'excedi', 'paso', 'rebaso', 'multa', 'pasa', 'consecuencia'] },
  { id: 'velocidad_general', keywords: ['velocidad', 'límite', 'máximo', 'rápido'], followUpKeywords: ['excedo', 'excedi', 'paso', 'rebaso', 'multa', 'pasa', 'consecuencia'] },
  { id: 'semaforo_rojo', keywords: ['semáforo', 'rojo', 'luz'], followUpKeywords: ['cruzo', 'paso', 'multa', 'pasa', 'consecuencia'] },
  { id: 'alcohol', keywords: ['alcohol', 'borracho', 'ebrio', 'copa'], followUpKeywords: ['detienen', 'multa', 'pasa', 'consecuencia', 'arrestan'] },
  { id: 'estacionamiento', keywords: ['estacionar', 'banqueta', 'doble fila'], followUpKeywords: ['multa', 'pasa', 'llevan', 'grua', 'consecuencia'] },
];

const TRAFFIC_KNOWLEDGE: KnowledgeEntry[] = [
  // ========== CONSECUENCIAS DE INFRACCIONES ==========
  // Exceder velocidad en zona escolar
  {
    keywords: ['excedo', 'excedi', 'exceder', 'paso', 'rebaso', 'límite', 'velocidad', 'escolar', 'escuela'],
    response: 'Si **excedes el límite de velocidad en zona escolar**, las consecuencias son severas:\n\n• **Multa**: 10-30 días de salario mínimo (varía por estado)\n• **Puntos en licencia**: 3-6 puntos\n• **Posible retención**: Del vehículo si el exceso es mayor a 20 km/h\n\n⚠️ Las multas se **duplican** cuando hay presencia de estudiantes. Es una infracción grave porque pone en riesgo a menores.',
    minKeywordMatch: 2
  },
  {
    keywords: ['excedo', 'excedi', 'exceder', 'pasa', 'rebaso', 'límite', 'ese', 'velocidad'],
    response: 'Si **excedes el límite de velocidad**, las consecuencias dependen del exceso:\n\n• **1-20 km/h de exceso**: Multa de 5-10 días de salario mínimo\n• **21-40 km/h de exceso**: Multa de 10-20 días + 3 puntos en licencia\n• **Más de 40 km/h**: Multa de 20-40 días + 6 puntos + posible retención del vehículo\n\n📍 En zonas escolares, hospitalarias o de alto riesgo, las multas se **duplican**.',
    minKeywordMatch: 2
  },
  {
    keywords: ['qué', 'que', 'pasa', 'si', 'excedo', 'excedi', 'ese', 'límite'],
    response: 'Si **excedes el límite de velocidad**, las consecuencias dependen del exceso:\n\n• **1-20 km/h de exceso**: Multa de 5-10 días de salario mínimo\n• **21-40 km/h de exceso**: Multa de 10-20 días + 3 puntos en licencia\n• **Más de 40 km/h**: Multa de 20-40 días + 6 puntos + posible retención del vehículo\n\n📍 En **zonas escolares**, las multas pueden **duplicarse** porque se considera una zona de alto riesgo.',
    minKeywordMatch: 3
  },
  // Cruzar semáforo en rojo
  {
    keywords: ['cruzo', 'cruzar', 'paso', 'pasar', 'brinco', 'brincar', 'brinque', 'brincarse', 'semáforo', 'semaforo', 'rojo'],
    response: 'Si **cruzas/brincas un semáforo en rojo**, las consecuencias son:\n\n• **Multa**: 10-20 días de salario mínimo\n• **Puntos en licencia**: 6 puntos\n• **Fotomulta**: Si hay cámara, recibirás la multa por correo\n\n⚠️ Si causas un accidente al cruzar en rojo, podrías enfrentar cargos penales por lesiones u homicidio culposo.',
    minKeywordMatch: 2
  },
  // Manejar con alcohol
  {
    keywords: ['me', 'detienen', 'paran', 'alcohol', 'borracho', 'tomado', 'copas'],
    response: 'Si te **detienen por manejar bajo efectos del alcohol**:\n\n• **Multa**: 20-100 días de salario mínimo\n• **Arresto**: 20-36 horas en separos\n• **Vehículo**: Al corralón\n• **Licencia**: Suspensión de 1-3 años\n• **Si hay accidente**: Cargos penales\n\n🚨 El límite es **0.4 g/L en sangre**. Puedes negarte al alcoholímetro, pero la multa es mayor.',
    minKeywordMatch: 2
  },
  // Consecuencias generales
  {
    keywords: ['qué', 'que', 'pasa', 'si', 'multa', 'infracción', 'consecuencia'],
    response: 'Las **consecuencias de una infracción de tránsito** generalmente incluyen:\n\n• **Multa económica**: Varía de 5-100 días de salario mínimo según gravedad\n• **Puntos en licencia**: Se acumulan y pueden causar suspensión\n• **Retención vehicular**: En casos graves, tu vehículo va al corralón\n• **Suspensión de licencia**: Por infracciones graves o reincidencia\n\n¿Sobre qué infracción específica quieres saber?',
    minKeywordMatch: 2
  },
  
  // ========== SEÑALES DE TRÁNSITO ==========
  {
    keywords: ['señal', 'rojo', 'blanca', 'horizontal', 'línea', 'linea'],
    response: 'La señal con **fondo rojo y una línea blanca horizontal** es la señal de **ALTO** o **No pasar**. Indica que debes detenerte completamente antes de continuar. Es una de las señales regulatorias más importantes.',
    minKeywordMatch: 3
  },
  {
    keywords: ['señal', 'alto', 'pare', 'octágono', 'roja'],
    response: 'La señal de **ALTO** (o PARE) es octagonal con fondo rojo y letras blancas. Indica que debes **detenerte completamente** antes de la línea de alto, verificar que sea seguro y luego continuar.',
    minKeywordMatch: 2
  },
  {
    keywords: ['señal', 'ceda', 'paso', 'triángulo', 'invertido'],
    response: 'La señal de **CEDA EL PASO** es un triángulo invertido con borde rojo. Indica que debes reducir la velocidad y ceder el paso a los vehículos que circulan por la vía principal.',
    minKeywordMatch: 2
  },
  {
    keywords: ['señal', 'amarilla', 'preventiva', 'advertencia'],
    response: 'Las señales con **fondo amarillo** son **señales preventivas**. Advierten sobre condiciones peligrosas adelante: curvas, cruces, zonas escolares, etc. Debes reducir la velocidad y estar atento.',
    minKeywordMatch: 2
  },
  {
    keywords: ['señal', 'azul', 'informativa'],
    response: 'Las señales con **fondo azul** son **señales informativas**. Indican servicios disponibles (hospitales, gasolineras, restaurantes) o información turística.',
    minKeywordMatch: 2
  },
  {
    keywords: ['señal', 'verde', 'destino', 'dirección'],
    response: 'Las señales con **fondo verde** son **señales de destino**. Indican direcciones, distancias a ciudades, y orientan hacia destinos específicos.',
    minKeywordMatch: 2
  },
  
  // Límites de velocidad
  {
    keywords: ['límite', 'velocidad', 'escolar', 'escuela', 'zona'],
    response: 'En **zonas escolares**, el límite de velocidad generalmente es de **20-30 km/h**. En México, la mayoría de los reglamentos establecen un máximo de **20 km/h** cuando hay presencia de estudiantes.',
    minKeywordMatch: 2
  },
  {
    keywords: ['límite', 'velocidad', 'ciudad', 'urbana', 'urbano', 'calle'],
    response: 'El límite de velocidad en **zonas urbanas** generalmente es:\n• Calles secundarias: **30-40 km/h**\n• Avenidas principales: **50-60 km/h**\n• Vías rápidas urbanas: **70-80 km/h**',
    minKeywordMatch: 2
  },
  {
    keywords: ['límite', 'velocidad', 'carretera', 'autopista', 'federal'],
    response: 'Los límites de velocidad en **carreteras** generalmente son:\n• Carreteras federales: **80-100 km/h**\n• Autopistas: **110-120 km/h**\nSiempre verifica la señalización específica de cada vía.',
    minKeywordMatch: 2
  },
  {
    keywords: ['límite', 'velocidad', 'máximo', 'máxima', 'permitida'],
    response: 'Los **límites de velocidad** varían según la zona:\n• Zonas escolares: **20-30 km/h**\n• Calles urbanas: **40-50 km/h**\n• Avenidas: **60-70 km/h**\n• Carreteras: **80-100 km/h**\n• Autopistas: **110-120 km/h**',
    minKeywordMatch: 2
  },
  
  // Semáforos
  {
    keywords: ['semáforo', 'semaforo', 'rojo', 'luz', 'alto', 'brinco', 'brinque', 'brincar'],
    response: 'La **luz roja del semáforo** significa **ALTO TOTAL**. Debes detenerte completamente antes de la línea de alto. Cruzar/brincarse en rojo es una infracción grave que puede resultar en multas de 10-20 días de salario mínimo y 6 puntos en tu licencia.',
    minKeywordMatch: 2
  },
  {
    keywords: ['semáforo', 'amarillo', 'ámbar', 'precaución'],
    response: 'La **luz amarilla/ámbar** significa **PRECAUCIÓN**. Si puedes detenerte de forma segura, debes hacerlo. Solo cruza si ya estás muy cerca y frenar sería peligroso.',
    minKeywordMatch: 2
  },
  {
    keywords: ['semáforo', 'verde', 'avanzar', 'pasar'],
    response: 'La **luz verde** indica que puedes **avanzar**, pero siempre verificando que el cruce esté despejado y cediendo el paso a peatones que aún estén cruzando.',
    minKeywordMatch: 2
  },
  {
    keywords: ['vuelta', 'derecha', 'rojo', 'semáforo'],
    response: 'La **vuelta a la derecha con luz roja** solo está permitida si:\n1. Hay señalización que lo autorice\n2. Te detienes completamente primero\n3. Cedes el paso a peatones y vehículos con preferencia\n\nSi no hay señal que lo permita, es infracción.',
    minKeywordMatch: 3
  },
  
  // Alcohol
  {
    keywords: ['alcohol', 'alcoholímetro', 'borracho', 'ebrio', 'alcoholemia'],
    response: 'El **límite de alcohol permitido** para conducir es generalmente de **0.4 g/L en sangre** (o 0.2 mg/L en aire espirado). Conducir bajo los efectos del alcohol puede resultar en:\n• Multa de 20-100 días de salario mínimo\n• Suspensión de licencia\n• Arresto de 20-36 horas\n• Vehículo al corralón',
    minKeywordMatch: 1
  },
  
  // Documentos
  {
    keywords: ['licencia', 'conducir', 'manejar', 'vigencia', 'vencida'],
    response: 'La **licencia de conducir** debe estar vigente para circular legalmente. Manejar con licencia vencida puede resultar en:\n• Multa de 10-20 días de salario mínimo\n• Retención del vehículo hasta presentar licencia vigente',
    minKeywordMatch: 2
  },
  {
    keywords: ['tarjeta', 'circulación', 'verificación', 'documento'],
    response: 'Los **documentos obligatorios** para circular son:\n• Licencia de conducir vigente\n• Tarjeta de circulación\n• Comprobante de verificación vehicular (donde aplique)\n• Póliza de seguro (obligatoria)',
    minKeywordMatch: 2
  },
  
  // Estacionamiento
  {
    keywords: ['estacionar', 'banqueta', 'prohibido', 'acera'],
    response: 'Está **prohibido estacionarse en banquetas/aceras** porque obstruye el paso peatonal. La multa varía de 5-20 días de salario mínimo según el municipio, más posible remolque al corralón.',
    minKeywordMatch: 2
  },
  {
    keywords: ['doble', 'fila', 'estacionar', 'segunda'],
    response: 'Estacionarse en **doble fila** está prohibido porque obstruye el tránsito. La multa puede ser de 10-30 días de salario mínimo, además del posible remolque.',
    minKeywordMatch: 2
  },
  
  // Uso del celular
  {
    keywords: ['celular', 'teléfono', 'manos', 'conducir', 'móvil'],
    response: 'Usar el **celular mientras conduces** está prohibido. Solo se permite con manos libres (hands-free). La multa puede ser de 5-20 días de salario mínimo. Es una de las principales causas de accidentes.',
    minKeywordMatch: 2
  },
  
  // Cinturón de seguridad
  {
    keywords: ['cinturón', 'seguridad', 'obligatorio', 'puesto'],
    response: 'El **cinturón de seguridad es obligatorio** para conductor y todos los pasajeros. La multa por no usarlo varía de 5-15 días de salario mínimo. Los niños deben usar sistemas de retención apropiados.',
    minKeywordMatch: 2
  },
  
  // Peatones
  {
    keywords: ['peatón', 'cruce', 'cebra', 'preferencia', 'paso'],
    response: 'Los **peatones tienen preferencia** en:\n• Cruces peatonales (paso de cebra)\n• Esquinas señalizadas\n• Cuando el semáforo peatonal lo indique\n\nNo ceder el paso a peatones es infracción de 5-15 días de salario mínimo.',
    minKeywordMatch: 2
  }
];

export class ResponseGenerator {
  private templates: Record<Sentimiento, ResponseTemplate> = {
    preocupado: {
      apertura: 'Entiendo tu preocupación, {nombre}.',
      desarrollo: 'Te explico las opciones legales que tienes para resolver esta situación:',
      cierre: '¿Quieres que profundicemos en algo específico?'
    },

    frustrado: {
      apertura: 'Veo tu frustración, {nombre}.',
      desarrollo: 'Te resumo opciones y puntos clave:',
      cierre: '¿Te muestro alternativas legales u opciones prácticas?'
    },

    enojado: {
      apertura: 'Comprendo que esto molesta, {nombre}.',
      desarrollo: 'Enfoquémonos en lo que puedes hacer ahora:',
      cierre: '¿Deseas ver pasos formales o posibles recursos?'
    },

    confundido: {
      apertura: 'Aclarémoslo juntos, {nombre}.',
      desarrollo: 'Te explico de forma sencilla:',
      cierre: '¿Te quedó claro o revisamos otro punto?'
    },

    // --- CORRECCIÓN 1: Plantilla Neutral Concisa ---
    neutral: {
      apertura: '{nombre}, aquí está la información:',
      desarrollo: '', // Se deja vacío para evitar redundancia
      cierre: '¿Avanzamos con más detalles o tienes otra consulta?'
    },

    positivo: {
      apertura: 'Perfecto, {nombre}. Vamos al detalle:',
      desarrollo: 'Información relevante:',
      cierre: '¿Algo más que quieras revisar?'
    }
  };

  // --- Función auxiliar para normalizar el nombre (asumida) ---
  private normalizeName(fullName: string): { shortName: string } {
    const parts = fullName.split(' ');
    return { shortName: parts[0] || fullName };
  }

  // Umbral mínimo de relevancia para mostrar artículos
  private readonly MIN_RELEVANCE_THRESHOLD = 0.65;

  /**
   * Extraer el tema principal del contexto de conversación
   */
  private extractTopicFromContext(context: string): string | null {
    if (!context || context.length < 20) return null;
    
    const contextLower = context.toLowerCase();
    
    // Buscar menciones de temas específicos en la conversación previa
    if (contextLower.includes('zona escolar') || contextLower.includes('escuela') || 
        (contextLower.includes('20') && contextLower.includes('km'))) {
      return 'velocidad_escolar';
    }
    if (contextLower.includes('velocidad') || contextLower.includes('límite') || contextLower.includes('km/h')) {
      return 'velocidad_general';
    }
    if (contextLower.includes('semáforo') || contextLower.includes('semaforo') || contextLower.includes('luz roja')) {
      return 'semaforo_rojo';
    }
    if (contextLower.includes('alcohol') || contextLower.includes('alcoholímetro') || contextLower.includes('copas')) {
      return 'alcohol';
    }
    if (contextLower.includes('estacionar') || contextLower.includes('banqueta') || contextLower.includes('doble fila')) {
      return 'estacionamiento';
    }
    
    return null;
  }

  /**
   * Detectar si es una pregunta de seguimiento
   */
  private isFollowUpQuestion(query: string): boolean {
    const q = query.toLowerCase();
    const followUpIndicators = [
      'ese', 'eso', 'esto', 'aquel', 'el mismo', 'la misma',
      'y si', 'qué pasa', 'que pasa', 'y qué', 'y que',
      'pero', 'entonces', 'además', 'también'
    ];
    return followUpIndicators.some(indicator => q.includes(indicator));
  }

  /**
   * Expandir la consulta con contexto de conversación
   */
  private expandQueryWithContext(query: string, context: string): string {
    if (!context || !this.isFollowUpQuestion(query)) {
      return query;
    }
    
    const topic = this.extractTopicFromContext(context);
    if (!topic) return query;
    
    // Añadir palabras clave del tema al query para mejor búsqueda
    const topicKeywords: Record<string, string> = {
      'velocidad_escolar': 'velocidad límite zona escolar',
      'velocidad_general': 'velocidad límite exceso',
      'semaforo_rojo': 'semáforo rojo cruzar',
      'alcohol': 'alcohol conducir manejar',
      'estacionamiento': 'estacionar prohibido multa'
    };
    
    const keywords = topicKeywords[topic] || '';
    return `${query} ${keywords}`.trim();
  }

  /**
   * Buscar en la base de conocimiento general
   */
  private findKnowledgeResponse(query: string, context?: string): string | null {
    // Expandir query con contexto si es pregunta de seguimiento
    const expandedQuery = this.expandQueryWithContext(query, context || '');
    const q = expandedQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    for (const entry of TRAFFIC_KNOWLEDGE) {
      const minMatch = entry.minKeywordMatch || 2;
      let matches = 0;
      
      for (const keyword of entry.keywords) {
        const normalizedKeyword = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (q.includes(normalizedKeyword)) {
          matches++;
        }
      }
      
      if (matches >= minMatch) {
        return entry.response;
      }
    }
    
    return null;
  }

  /**
   * Filtrar artículos que realmente son relevantes
   */
  private filterRelevantArticles(articulos: ArticuloRelevante[], query?: string): ArticuloRelevante[] {
    // Solo mostrar artículos con similitud >= umbral
    return articulos.filter(art => art.similitud >= this.MIN_RELEVANCE_THRESHOLD);
  }

  /**
   * Generar respuesta completa basada en contexto
   */
  generateResponse(
    nombreUsuario: string,
    sentimiento: Sentimiento,
    intencion: Intencion,
    articulos: ArticuloRelevante[],
    cluster?: string,
    contextoConversacion?: string,
    queryText?: string
  ): string {
    const template = this.templates[sentimiento] || this.templates.neutral;
    const { shortName } = this.normalizeName(nombreUsuario);
    
    // 1. Manejo de Saludos y Conversación Básica (Small Talk)
    const smallTalkResponse = this.handleSmallTalk(queryText || '', shortName);
    if (smallTalkResponse) {
      return smallTalkResponse;
    }

    // 2. Buscar primero en conocimiento general de tránsito (con contexto para follow-ups)
    const knowledgeResponse = this.findKnowledgeResponse(queryText || '', contextoConversacion);
    
    // 3. Filtrar artículos relevantes (solo los de alta similitud)
    const relevantArticles = this.filterRelevantArticles(articulos, queryText);
    
    let partes: string[] = [];

    // Si encontramos respuesta en conocimiento general
    if (knowledgeResponse) {
      partes.push(knowledgeResponse);
      
      // Solo agregar artículos si son MUY relevantes (>= 70%)
      const highRelevanceArticles = relevantArticles.filter(a => a.similitud >= 0.70);
      if (highRelevanceArticles.length > 0) {
        partes.push('\n📋 **Fundamento legal:**');
        partes.push(this.formatBriefArticles(highRelevanceArticles.slice(0, 2)));
      }
      
      partes.push(`\n¿Tienes alguna otra duda, ${shortName}?`);
      return partes.join('\n');
    }

    // 4. Si no hay conocimiento general, usar el flujo normal pero mejorado
    
    // Heurística de emergencia por accidente con heridos
    const isAccidentCluster = cluster === 'C5';
    const isEmergencyAccident = this.isEmergencyAccidentQuery(queryText || '');
    
    if (isAccidentCluster && isEmergencyAccident || intencion === 'ayuda') {
      return this.buildEmergencyAccidentResponse();
    }

    // Contenido principal basado en intención
    const mainContent = this.buildMainContent(intencion, relevantArticles, template.desarrollo, cluster, queryText);
    
    if (mainContent.trim().length > 0) {
      partes.push(mainContent);
    }

    // Artículos relevantes solo si pasan el umbral
    if (relevantArticles.length > 0) {
      partes.push(this.integrateArticlesInline(relevantArticles));
      partes.push(template.cierre.replace('{nombre}', shortName));
    } else if (articulos.length > 0 && relevantArticles.length === 0) {
      // Hay artículos pero ninguno es relevante
      partes.push(`${shortName}, no encontré información específica sobre esto en nuestra base legal. ¿Podrías darme más detalles sobre tu consulta?`);
    } else {
      // No hay artículos
      partes.push(`${shortName}, necesito más información para ayudarte mejor. ¿Puedes ser más específico sobre tu consulta de tránsito?`);
    }

    return partes.filter(p => p.trim().length > 0).join('\n\n').trim();
  }

  /**
   * Formato breve para artículos de respaldo
   */
  private formatBriefArticles(articulos: ArticuloRelevante[]): string {
    return articulos.map(art => 
      `• **${art.titulo}** (${(art.similitud * 100).toFixed(0)}% relevancia)`
    ).join('\n');
  }

  /**
   * Construir contenido principal según intención
   */

  /**
   * Manejar Saludos y Conversación Básica (Small Talk)
   */
  private handleSmallTalk(text: string, shortName: string): string | null {
    const t = text.toLowerCase().trim();
    
    // Saludos Simples
    const greetings = ['hola', 'hello', 'hi', 'buenos días', 'buenos dias', 'buenas tardes', 
                       'buenas noches', 'hey', 'saludos', 'buenas'];
    const isGreeting = greetings.some(g => t === g || t.startsWith(g + ' ') || t.startsWith(g + ','));
    
    // Preguntas de Estado
    const howAreYou = ['qué tal', 'que tal', 'cómo estás', 'como estas', 'que onda', 'que hay'];
    const isHowAreYou = howAreYou.some(q => t.includes(q));

    if (isGreeting && !isHowAreYou) {
      return `¡Hola ${shortName}! 😊 ¿En qué puedo ayudarte hoy con temas de tránsito?`;
    }
    
    if (isHowAreYou) {
      return `¡Hola ${shortName}! Estoy muy bien, gracias por preguntar. Soy un asistente de IA, así que siempre estoy listo para ayudarte con tus consultas legales de tránsito. ¿En qué puedo servirte hoy?`;
    }
    
    return null;
  }

  private buildMainContent(
    intencion: Intencion,
    articulos: ArticuloRelevante[],
    defaultContent: string,
    cluster?: string,
    queryText?: string
  ): string {
    // Heurística de emergencia por accidente con heridos
    const isAccidentCluster = cluster === 'C5';
    const isEmergencyAccident = this.isEmergencyAccidentQuery(queryText || '');
    
    // Si se detecta un caso complejo (Accidente con heridos o DUI), usar la respuesta estructurada
    if (isAccidentCluster && isEmergencyAccident || intencion === 'ayuda') {
      return this.buildEmergencyAccidentResponse();
    }

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
        // Si no hay intención clara, pedimos más detalles
        if (articulos.length === 0) {
            return 'No estoy seguro de qué información legal necesitas. ¿Podrías ser más específico sobre tu consulta?';
        }
        return defaultContent;
    }
  }

  private isEmergencyAccidentQuery(text: string): boolean {
    const t = text.toLowerCase();
    const keywords = [
      'accidente', 'colisión', 'colision', 'choque', 'impacto',
      'herido', 'heridos', 'lesionado', 'lesionada', 'sangre',
      'ambulancia', 'emergencia', 'paramédico', 'paramedico', 'atropell',
    ];
    return keywords.some(k => t.includes(k));
  }

  /**
   * Genera la respuesta legal estructurada para un escenario complejo (ej. Accidente con heridos).
   */
  private buildStructuredLegalResponse(intencion: Intencion, articulos: ArticuloRelevante[]): LegalResponse {
    // Simulación de datos recuperados por RAG/OLAP para el ejemplo del usuario
    // En un caso real, esta información se generaría dinámicamente.
    
    let respuesta: string;
    let referenciaLegal: string;
    let pasosASeguir: string;
    let lugaresDondeAcudir: string;

    if (intencion === 'ayuda' && articulos.length > 0) {
      // Caso de Accidente con Heridos (basado en el ejemplo del usuario)
      respuesta = `Si estuviste involucrado en un accidente de tránsito con heridos, la situación se vuelve penal además de administrativa. La ley exige que permanezcas en el lugar para auxiliar a la víctima y notificar a las autoridades. Podrías enfrentar cargos por lesiones u homicidio culposo, dependiendo de la gravedad.`;
      
      referenciaLegal = `Código Penal Estatal (Artículos sobre lesiones y homicidio culposo en accidentes de tránsito) y Reglamento de Tránsito (Obligación de auxilio y permanencia en el lugar).`;
      
      pasosASeguir = `1. **Prioriza la seguridad:** Llama inmediatamente a emergencias (911) y a tu aseguradora. 2. **No te muevas:** Permanece en el lugar del accidente hasta que lleguen las autoridades. 3. **Coopera:** Proporciona tu versión de los hechos a la autoridad de tránsito y al Ministerio Público. 4. **Solicita asesoría legal:** Contacta a un abogado penalista lo antes posible.`;
      
      lugaresDondeAcudir = `**Ministerio Público (Fiscalía General del Estado)** - Para denuncias y seguimiento de casos penales. **Comisión Estatal de Derechos Humanos** - Si consideras que tus derechos fueron violentados durante la detención.`;
      
    } else {
      // Caso de ejemplo: Conducción bajo los efectos del alcohol (Deseado por el usuario)
      respuesta = `Si te detienen por conducir bajo los efectos del alcohol, puedes ser arrestado administrativamente por 20 a 36 horas, pagar una multa considerable (que varía según el estado, generalmente entre 80 y 100 días de salario mínimo), y tu vehículo puede ser enviado al corralón. Además, tu licencia puede ser suspendida temporalmente.`;
      
      referenciaLegal = `Reglamentos de Tránsito Estatales y Ley General de Salud (Artículo 421).`;
      
      pasosASeguir = `1. **No te resistas:** Coopera con la autoridad. 2. **Solicita el alcoholímetro:** Tienes derecho a solicitar la prueba para verificar tu estado. 3. **Paga la multa:** Paga la multa correspondiente para recuperar tu vehículo. 4. **Asesoría legal:** Si consideras que la detención fue injusta, presenta una queja ante la Comisión de Derechos Humanos o solicita asesoría legal.`;
      
      lugaresDondeAcudir = `**Secretaría de Movilidad y Transporte** - Para el pago de multas y trámites vehiculares. **Comisión Estatal de Derechos Humanos** - Para presentar quejas por abusos de autoridad.`;
    }

    return {
      respuesta,
      referenciaLegal,
      pasosASeguir,
      lugaresDondeAcudir
    };
  }

  /**
   * Formatea el objeto LegalResponse a una cadena Markdown estructurada.
   */
  private formatLegalResponse(legalResponse: LegalResponse): string {
    let output = '';

    output += `**Respuesta**\n${legalResponse.respuesta}\n\n`;
    output += `**Referencia Legal**\n${legalResponse.referenciaLegal}\n\n`;
    output += `**Pasos a Seguir**\n${legalResponse.pasosASeguir}\n\n`;
    output += `**Lugares donde puedes acudir**\n${legalResponse.lugaresDondeAcudir}`;

    return output;
  }

  private buildEmergencyAccidentResponse(): string {
    // Asumimos que si se llama a esta función, la intención es 'ayuda' o es un caso complejo.
    const legalResponse = this.buildStructuredLegalResponse('ayuda', []); 
    let formattedResponse = this.formatLegalResponse(legalResponse);

    // Añadir la pregunta de recomendación de profesionales
    formattedResponse += '\n\n' + 'Si quieres, te puedo brindar esta información de lugares donde puedes acudir y recomendaciones para los profesionistas.';
    
    return formattedResponse;
  }

  // --- CORRECCIÓN 4: buildMultaResponse más Narrativo ---
  private buildMultaResponse(articulos: ArticuloRelevante[]): string {
    if (articulos.length === 0) {
      return 'Déjame buscar la información específica sobre tu caso en nuestra base de conocimiento legal.';
    }

    const articulo = articulos[0];
    
    // 1. Explicación Narrativa (La parte natural)
    let response = 'La ley prohíbe estacionarse en las banquetas principalmente para garantizar la **seguridad y el libre tránsito de los peatones**. ';
    response += 'Es una medida de seguridad vial que busca proteger a personas con discapacidad, niños y ancianos. ';
    
    // 2. Fundamento Legal (La parte técnica)
    response += `El fundamento legal se encuentra en el **${articulo.titulo}**. `;

    // 3. Consecuencia (Multa)
    const multaMatch = articulo.contenido.match(/(\d+)\s*SMLV/i);
    if (multaMatch) {
      response += `Incumplir esta norma conlleva una multa de **${multaMatch[1]} SMLV** (Salarios Mínimos Legales Vigentes).`;
    }

    return response;
  }
  // ------------------------------------------------------

  // --- Funciones auxiliares para artículos y contexto (se mantienen) ---
  private formatArticlesList(articulos: ArticuloRelevante[]): string {
    let formatted = '📋 **Artículos Relevantes:**\n\n';

    articulos.slice(0, 2).forEach((art, index) => {
      const extracto = this.summarizeContent(art.contenido);
      formatted += `**${index + 1}. ${art.titulo}** (Fuente: ${art.fuente})\n${extracto}\nRelevancia: ${(art.similitud * 100).toFixed(0)}%\n\n`;
    });

    if (articulos.length > 2) {
      formatted += `_(+${articulos.length - 2} adicional(es))_\n`;
    }
    return formatted.trim();
  }

  private integrateArticlesInline(articulos: ArticuloRelevante[]): string {
    if (articulos.length === 0) return '';
    const titulos = articulos.slice(0, 2).map(a => a.titulo).join(' y ');
    let texto = `Para tu referencia, aquí están los artículos que sustentan esta información:`;
    texto += '\n\n' + this.formatArticlesList(articulos);
    return texto;
  }

  private summarizeContent(contenido: string): string {
    const clean = contenido.replace(/\s+/g, ' ').trim();
    return clean.length > 160 ? clean.substring(0, 160) + '...' : clean;
  }

  private formatConversationContext(raw: string): string {
    // Solo usar contexto si hay conversación sustancial previa
    if (!raw || raw.trim().length < 50) return '';
    const lines = raw.split('\n').filter(l => l.trim().length > 0 && !l.includes('system'));
    if (lines.length < 2) return '';
    return ''; // Por ahora deshabilitamos el contexto para evitar ruido
  }
  // --------------------------------------------------------------------

  /**
   * Generar mensaje de bienvenida
   */
  // --- CORRECCIÓN 5: Mensaje de Bienvenida Conciso ---
  generateWelcomeMessage(nombreUsuario: string): string {
    const { shortName } = this.normalizeName(nombreUsuario);
    return `¡Hola ${shortName}! 👋 Soy **LexIA**, tu asistente legal de tránsito.
  
Estoy aquí para ayudarte con:
• 📋 Consultas sobre multas e infracciones
• ⚖️ Información sobre artículos y leyes de tránsito

¿En qué puedo ayudarte hoy?`;
  }
  // ------------------------------------------------------

  /**
   * Generar mensaje de cambio de tema
   */
  // --- CORRECCIÓN 6: Mensaje de Cambio de Tema Conciso ---
  generateTopicChangeMessage(nuevoTema: string): string {
    const temasMap: Record<string, string> = {
      C1: 'infracciones de velocidad y semáforos',
      C2: 'estacionamiento',
      C3: 'controles de alcoholemia',
      C4: 'documentación vehicular',
      C5: 'accidentes de tránsito'
    };

    const tema = temasMap[nuevoTema] || 'un nuevo tema';

    // Solo transición, sin frases de relleno
    return `Veo que ahora estamos hablando sobre **${tema}**.`;
  }
  // ------------------------------------------------------

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
