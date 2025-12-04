
export class SlangNormalizer {
  
  // Diccionario de traducción: Slang → Formal/Legal
  private slangMap: Record<string, string> = {
    // ═══════════════════════════════════════════════════════════════
    // ESTADO DE EBRIEDAD / ALCOHOL
    // ═══════════════════════════════════════════════════════════════
    'pedote': 'estado de ebriedad',
    'pedo': 'ebrio',
    'bien pedo': 'en estado de ebriedad',
    'bien pedote': 'en estado de ebriedad grave',
    'borracho': 'estado de ebriedad',
    'bolo': 'estado de ebriedad',
    'cuete': 'estado de ebriedad',
    'hasta las chanclas': 'estado de ebriedad grave',
    'hasta atras': 'estado de ebriedad grave',
    'entonado': 'bajo influencia del alcohol',
    'tomado': 'bajo influencia del alcohol',
    'pasado de copas': 'exceso de alcohol',
    'chupando': 'ingiriendo bebidas alcohólicas',
    'pisto': 'bebidas alcohólicas',
    'chelas': 'cervezas',
    'chelero': 'consumiendo alcohol',
    
    // ═══════════════════════════════════════════════════════════════
    // VEHÍCULOS
    // ═══════════════════════════════════════════════════════════════
    'troca': 'camioneta',
    'trocona': 'camioneta grande',
    'nave': 'vehículo',
    'carrazo': 'vehículo',
    'carcacha': 'vehículo en mal estado',
    'bika': 'motocicleta',
    'moto': 'motocicleta',
    'motoneta': 'motocicleta',
    'la ranfla': 'el vehículo',
    'mi ranfla': 'mi vehículo',
    
    // ═══════════════════════════════════════════════════════════════
    // ACCIONES DE TRÁNSITO / ACCIDENTES
    // ═══════════════════════════════════════════════════════════════
    'me topo': 'me chocó',
    'me topó': 'me chocó',
    'lo tope': 'lo choqué',
    'lo topé': 'lo choqué',
    'topo': 'chocó',
    'topó': 'chocó',
    'se pelo': 'se dio a la fuga',
    'se peló': 'se dio a la fuga',
    'me pele': 'me di a la fuga',
    'me pelé': 'me di a la fuga',
    'se fue a la fuga': 'huyó del lugar del accidente',
    'se largo': 'huyó del lugar',
    'se largó': 'huyó del lugar',
    'huyo': 'huyó del lugar del accidente',
    'huyó': 'huyó del lugar del accidente',
    'se escapo': 'huyó del lugar',
    'se escapó': 'huyó del lugar',
    'me brinque': 'pasé la señal de alto',
    'me brinqué': 'pasé la señal de alto',
    'brinque': 'pasé',
    'brinqué': 'pasé',
    'me pase el rojo': 'crucé el semáforo en rojo',
    'me pasé el rojo': 'crucé el semáforo en rojo',
    'me lleve': 'choqué contra',
    'me llevé': 'choqué contra',
    'le di': 'choqué contra',
    'le pegue': 'choqué contra',
    'le pegué': 'choqué contra',
    'me estrelle': 'colisioné',
    'me estrellé': 'colisioné',
    
    // ═══════════════════════════════════════════════════════════════
    // DETENCIÓN / AUTORIDADES
    // ═══════════════════════════════════════════════════════════════
    'me agarraron': 'fui detenido',
    'me cacharon': 'fui detenido',
    'me pararon': 'fui detenido por la autoridad',
    'me torcieron': 'fui detenido',
    'me cayeron': 'llegaron las autoridades',
    'la chota': 'la policía de tránsito',
    'la tira': 'la policía',
    'la julia': 'la patrulla',
    'los polis': 'los oficiales de tránsito',
    'los cuicos': 'los oficiales',
    'el marrano': 'el oficial',
    'torreta': 'sirena y luces de patrulla',
    'torretas': 'sirenas y luces de patrulla',
    
    // ═══════════════════════════════════════════════════════════════
    // CORRUPCIÓN / SOBORNOS
    // ═══════════════════════════════════════════════════════════════
    'mordida': 'soborno a funcionario público',
    'moche': 'soborno',
    'lana': 'dinero',
    'feria': 'dinero',
    'varo': 'dinero',
    'billete': 'dinero',
    'me quieren sacar': 'me están extorsionando',
    'quiere lana': 'solicita soborno',
    'arreglar ahi': 'pagar soborno',
    'arreglar ahí': 'pagar soborno',
    'darle pa su chesco': 'dar soborno',
    
    // ═══════════════════════════════════════════════════════════════
    // INFRAESTRUCTURA / LUGARES
    // ═══════════════════════════════════════════════════════════════
    'poste': 'poste de alumbrado público',
    'poste de luz': 'poste de infraestructura pública',
    'semaforo': 'semáforo',
    'alto': 'señal de alto',
    'camara': 'cámara de fotomulta',
    'cámara': 'cámara de fotomulta',
    'banqueta': 'acera pública',
    'corralon': 'depósito vehicular',
    'corralón': 'depósito vehicular',
    'torito': 'centro de detención por alcoholemia',
    'barda': 'muro de propiedad',
    'reja': 'cerca de propiedad',
    
    // ═══════════════════════════════════════════════════════════════
    // DOCUMENTOS
    // ═══════════════════════════════════════════════════════════════
    'papeles': 'documentos vehiculares',
    'sin papeles': 'sin documentación',
    'la mica': 'la licencia de conducir',
    'tarjeta': 'tarjeta de circulación',
    
    // ═══════════════════════════════════════════════════════════════
    // PALABRAS DE RELLENO (se eliminan para búsqueda más limpia)
    // ═══════════════════════════════════════════════════════════════
    'wey': '',
    'we': '',
    'güey': '',
    'compa': '',
    'carnal': '',
    'bro': '',
    'man': '',
    'no mames': '',
    'no manches': '',
    'verga': '',
    'a la verga': '',
    'pinche': '',
    'puto': '',
    'puta': '',
    'chingada': '',
    'chingado': '',
    'alv': '',
    'nmms': '',
    'nms': '',
    'ptm': '',
    'cabron': '',
    'cabrón': '',
    'pendejo': '',
    'pendeja': '',
    'nel': 'no',
    'simon': 'sí',
    'simón': 'sí',
    'nel pastel': 'no',
    'que onda': 'qué sucede',
    'que pedo': 'qué sucede',
    'que pex': 'qué sucede',
    'que rollo': 'qué sucede',
    'ya valio': 'está mal',
    'ya valió': 'está mal',
    'que hago': 'qué debo hacer',
    'que me va a pasar': 'cuáles son las consecuencias',
    'ahora que': 'qué procede'
  };

  // Frases compuestas que deben traducirse como unidad
  private compoundPhrases: Array<{pattern: RegExp, replacement: string}> = [
    // Accidentes con fuga
    { pattern: /me\s+topo\s+y\s+se\s+pelo/gi, replacement: 'me chocó y huyó del lugar' },
    { pattern: /me\s+topó\s+y\s+se\s+peló/gi, replacement: 'me chocó y huyó del lugar' },
    { pattern: /choco\s+y\s+se\s+fue/gi, replacement: 'colisionó y huyó del lugar' },
    { pattern: /chocó\s+y\s+se\s+fue/gi, replacement: 'colisionó y huyó del lugar' },
    
    // Detención por alcohol
    { pattern: /me\s+agarraron\s+(bien\s+)?pedo(te)?/gi, replacement: 'fui detenido en estado de ebriedad' },
    { pattern: /me\s+cacharon\s+(bien\s+)?pedo(te)?/gi, replacement: 'fui detenido en estado de ebriedad' },
    { pattern: /manejando\s+(bien\s+)?pedo(te)?/gi, replacement: 'conduciendo en estado de ebriedad' },
    { pattern: /manejando\s+tomado/gi, replacement: 'conduciendo bajo influencia del alcohol' },
    { pattern: /manejando\s+borracho/gi, replacement: 'conduciendo en estado de ebriedad' },
    
    // Semáforo / Alto
    { pattern: /me\s+brinque\s+(el\s+)?(un\s+)?alto/gi, replacement: 'pasé la señal de alto' },
    { pattern: /me\s+brinqué\s+(el\s+)?(un\s+)?alto/gi, replacement: 'pasé la señal de alto' },
    { pattern: /me\s+pase\s+(el\s+)?rojo/gi, replacement: 'crucé el semáforo en rojo' },
    { pattern: /me\s+pasé\s+(el\s+)?rojo/gi, replacement: 'crucé el semáforo en rojo' },
    
    // Daño a propiedad
    { pattern: /me\s+lleve\s+(un\s+)?poste/gi, replacement: 'choqué contra un poste de alumbrado público' },
    { pattern: /me\s+llevé\s+(un\s+)?poste/gi, replacement: 'choqué contra un poste de alumbrado público' },
    { pattern: /le\s+di\s+a\s+(un\s+)?poste/gi, replacement: 'choqué contra un poste' },
    { pattern: /choque\s+contra\s+(un\s+)?poste/gi, replacement: 'colisioné contra poste de alumbrado' },
    { pattern: /choqué\s+contra\s+(un\s+)?poste/gi, replacement: 'colisioné contra poste de alumbrado' },
    
    // Estacionamiento / Grúa
    { pattern: /me\s+quitaron\s+la\s+troca/gi, replacement: 'remolcaron mi camioneta' },
    { pattern: /me\s+llevaron\s+(el\s+)?carro/gi, replacement: 'remolcaron mi vehículo al corralón' },
    { pattern: /se\s+llevaron\s+mi\s+(carro|nave|troca)/gi, replacement: 'remolcaron mi vehículo' },
    { pattern: /esta\s+en\s+(el\s+)?corralon/gi, replacement: 'está en el depósito vehicular' },
    
    // Fuga de autoridad
    { pattern: /me\s+sono\s+la\s+torreta/gi, replacement: 'la patrulla me indicó que me detuviera' },
    { pattern: /me\s+sonó\s+la\s+torreta/gi, replacement: 'la patrulla me indicó que me detuviera' },
    { pattern: /me\s+fui\s+a\s+la\s+fuga/gi, replacement: 'huí de la autoridad de tránsito' },
    { pattern: /no\s+pare/gi, replacement: 'no me detuve ante la señal de la autoridad' },
    { pattern: /no\s+paré/gi, replacement: 'no me detuve ante la señal de la autoridad' },
    
    // Corrupción
    { pattern: /me\s+pidio\s+(una\s+)?mordida/gi, replacement: 'el oficial me solicitó un soborno' },
    { pattern: /me\s+pidió\s+(una\s+)?mordida/gi, replacement: 'el oficial me solicitó un soborno' },
    { pattern: /quiere\s+que\s+le\s+de\s+lana/gi, replacement: 'solicita un soborno' }
  ];

  /**
   * Normaliza texto informal a lenguaje legal/formal
   * Mantiene el significado pero lo hace buscable en el RAG
   */
  normalize(text: string): string {
    let normalized = text.toLowerCase();
    
    // PASO 1: Procesar frases compuestas primero (más específicas)
    for (const { pattern, replacement } of this.compoundPhrases) {
      normalized = normalized.replace(pattern, replacement);
    }
    
    // PASO 2: Reemplazo de palabras individuales
    // Ordenamos por longitud descendente para evitar reemplazos parciales
    const sortedSlang = Object.entries(this.slangMap)
      .sort((a, b) => b[0].length - a[0].length);
    
    for (const [slang, formal] of sortedSlang) {
      // Usar word boundary para reemplazar palabras completas
      const regex = new RegExp(`\\b${this.escapeRegex(slang)}\\b`, 'gi');
      normalized = normalized.replace(regex, formal);
    }
    
    // PASO 3: Limpieza final
    normalized = normalized
      .replace(/\s+/g, ' ')      // Espacios múltiples → uno solo
      .replace(/^\s+|\s+$/g, '') // Trim
      .replace(/\s+([.,!?])/g, '$1'); // Espacio antes de puntuación
    
    return normalized;
  }

  /**
   * Escapa caracteres especiales de regex
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Extrae las palabras clave legales del texto normalizado
   * Útil para búsquedas más precisas en RAG
   */
  extractLegalKeywords(normalizedText: string): string[] {
    const legalTerms = [
      'estado de ebriedad', 'alcoholemia', 'conducción',
      'señal de alto', 'semáforo', 'infracción',
      'accidente', 'colisión', 'choque',
      'fuga', 'huyó', 'abandonó',
      'depósito vehicular', 'corralón', 'grúa',
      'soborno', 'extorsión', 'mordida',
      'alumbrado público', 'infraestructura', 'daño',
      'detenido', 'arresto', 'sanción',
      'licencia', 'documentos', 'tarjeta de circulación',
      'multa', 'fotomulta', 'boleta'
    ];

    const found: string[] = [];
    const textLower = normalizedText.toLowerCase();
    
    for (const term of legalTerms) {
      if (textLower.includes(term)) {
        found.push(term);
      }
    }
    
    return found;
  }

  /**
   * Detecta el tema principal basándose en el texto normalizado
   */
  detectTopic(normalizedText: string): string {
    const textLower = normalizedText.toLowerCase();
    
    const topicPatterns: Record<string, string[]> = {
      'alcohol': ['ebriedad', 'alcoholemia', 'alcohol', 'tomado', 'borracho'],
      'accidente': ['choque', 'colisión', 'accidente', 'impacto'],
      'fuga': ['huyó', 'fuga', 'escapó', 'abandonó el lugar'],
      'semaforo': ['semáforo', 'señal de alto', 'luz roja', 'alto'],
      'estacionamiento': ['depósito vehicular', 'corralón', 'grúa', 'remolcaron', 'banqueta', 'acera'],
      'daño_propiedad': ['poste', 'alumbrado', 'infraestructura', 'barda', 'muro'],
      'corrupcion': ['soborno', 'extorsión', 'mordida'],
      'documentos': ['licencia', 'tarjeta de circulación', 'documentos', 'verificación'],
      'fuga_autoridad': ['huí de la autoridad', 'no me detuve', 'patrulla me indicó']
    };

    for (const [topic, patterns] of Object.entries(topicPatterns)) {
      for (const pattern of patterns) {
        if (textLower.includes(pattern)) {
          return topic;
        }
      }
    }

    return 'general';
  }
}

// Singleton para uso global
export const slangNormalizer = new SlangNormalizer();
