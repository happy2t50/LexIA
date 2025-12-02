/**
 * Servicio de Knowledge Base con búsqueda INTELIGENTE
 * 
 * Algoritmo de búsqueda multi-nivel:
 * 1. Detección de intención y tema principal
 * 2. Búsqueda por coincidencia semántica
 * 3. Fallback a RAG si no hay match
 */

import { Pool } from 'pg';
import axios from 'axios';
import { 
  KNOWLEDGE_BASE, 
  KnowledgeEntry, 
  getRelatedTopics 
} from '../knowledge/trafficKnowledgeBase';

interface SearchResult {
  entry: KnowledgeEntry;
  score: number;
  matchType: 'exact' | 'keyword' | 'semantic' | 'context' | 'intent';
  debugInfo?: string;
}

interface ConversationContext {
  lastTopic?: string;
  lastEntryId?: string;
  recentKeywords: string[];
}

// Mapeo de intenciones/temas a IDs de knowledge base
const INTENT_MAPPINGS: { [key: string]: { patterns: string[], entryIds: string[], priority: number } } = {
  // DOCUMENTOS
  'documentos': {
    patterns: ['documento', 'documentos', 'papeles', 'licencia', 'tarjeta', 'circulacion', 'seguro', 'verificacion', 'mostrar', 'llevar', 'obligatorio', 'requerido', 'necesito', 'debo tener', 'piden', 'solicitan'],
    entryIds: ['documentos_obligatorios', 'licencia_vencida', 'sin_licencia', 'seguro_obligatorio'],
    priority: 10
  },
  // ACCIDENTES Y ATROPELLOS
  'accidentes': {
    patterns: ['accidente', 'choque', 'chocaron', 'atropello', 'atropellado', 'atropellar', 'fuga', 'huir', 'escape', 'herido', 'lesionado', 'golpe', 'impacto'],
    entryIds: ['que_hacer_accidente', 'accidente_con_heridos', 'huir_accidente'],
    priority: 10
  },
  // SEÑALES - SOLO cuando preguntan específicamente por señales
  'senales': {
    patterns: ['señal', 'senal', 'señalamiento', 'letrero', 'significa', 'simbolo', 'alto', 'pare', 'stop', 'ceda', 'amarilla', 'verde', 'azul'],
    entryIds: ['senal_alto', 'senal_no_pasar', 'senal_ceda_paso', 'senal_velocidad_maxima', 'senal_no_estacionar', 'senal_amarilla_preventiva', 'senal_zona_escolar', 'senal_azul_informativa', 'senal_verde_destino'],
    priority: 5
  },
  // ESTACIONAMIENTO/BANQUETA específico
  'estacionamiento': {
    patterns: ['estacionar', 'estacionamiento', 'banqueta', 'acera', 'doble fila', 'grua', 'corralon', 'se llevaron', 'remolcaron'],
    entryIds: ['estacionar_prohibido', 'senal_no_estacionar', 'grua_corralon'],
    priority: 8
  },
  // VELOCIDAD
  'velocidad': {
    patterns: ['velocidad', 'rapido', 'limite', 'exceso', 'km/h', 'kilometros', 'radar', 'fotomulta'],
    entryIds: ['limite_zona_escolar', 'limite_urbano', 'limite_carretera', 'exceso_velocidad', 'exceso_velocidad_escolar'],
    priority: 7
  },
  // ALCOHOL
  'alcohol': {
    patterns: ['alcohol', 'borracho', 'ebrio', 'cerveza', 'copa', 'alcoholimetro', 'toxico', 'tomado', 'bebido'],
    entryIds: ['limite_alcohol', 'manejar_ebrio', 'alcoholimetro'],
    priority: 9
  },
  // DERECHOS
  'derechos': {
    patterns: ['derecho', 'derechos', 'puedo', 'pueden', 'permitido', 'legal', 'ilegal', 'abuso', 'extorsion', 'mordida', 'corrupcion', 'policia', 'agente', 'detener', 'detenido', 'detuvieron', 'pararon'],
    entryIds: ['derechos_detencion', 'extorsion_policial', 'impugnar_multa'],
    priority: 8
  },
  // MULTAS/INFRACCIONES
  'multas': {
    patterns: ['multa', 'infraccion', 'pagar', 'cobrar', 'sancion', 'penalizacion'],
    entryIds: ['pagar_multas', 'impugnar_multa', 'pasarse_alto', 'semaforo_rojo'],
    priority: 6
  },
  // CELULAR
  'celular': {
    patterns: ['celular', 'telefono', 'llamada', 'mensaje', 'whatsapp', 'manos libres'],
    entryIds: ['uso_celular'],
    priority: 9
  },
  // CINTURON
  'cinturon': {
    patterns: ['cinturon', 'cinturón', 'seguridad', 'abrochado', 'pasajero'],
    entryIds: ['cinturon_seguridad'],
    priority: 8
  }
};

// Palabras que NUNCA deben matchear con estacionamiento
const EXCLUSION_PATTERNS: { [key: string]: string[] } = {
  'senal_no_estacionar': ['documento', 'licencia', 'accidente', 'atropello', 'herido', 'fuga', 'detener', 'detenido', 'alcohol', 'borracho'],
  'estacionar_prohibido': ['documento', 'licencia', 'accidente', 'atropello', 'herido', 'fuga', 'detener', 'detenido', 'alcohol', 'borracho']
};

export class KnowledgeBaseService {
  private pool: Pool;
  private ragUrl: string;
  private conversationContexts: Map<string, ConversationContext> = new Map();

  constructor(pool: Pool, ragUrl: string = 'http://localhost:3009') {
    this.pool = pool;
    this.ragUrl = ragUrl;
  }

  /**
   * BÚSQUEDA PRINCIPAL - Algoritmo inteligente
   */
  async search(
    query: string, 
    sessionId?: string,
    limit: number = 3
  ): Promise<SearchResult[]> {
    const queryLower = query.toLowerCase().trim();
    const queryNormalized = this.normalizeText(queryLower);
    
    console.log(`\n🔍 KB Search: "${query}"`);
    console.log(`   Normalized: "${queryNormalized}"`);
    
    // 1. Detectar intención principal
    const detectedIntent = this.detectIntent(queryNormalized);
    console.log(`   Intent detectado: ${detectedIntent?.intent || 'ninguno'} (score: ${detectedIntent?.score || 0})`);
    
    // 2. Si hay intención clara, buscar en esas entradas
    if (detectedIntent && detectedIntent.score >= 0.3) {
      const intentResults = this.searchByIntent(queryNormalized, detectedIntent);
      if (intentResults.length > 0 && intentResults[0].score >= 0.5) {
        console.log(`   ✅ Match por intent: ${intentResults[0].entry.id} (${intentResults[0].score})`);
        
        // Actualizar contexto
        if (sessionId) {
          this.updateContext(sessionId, intentResults[0].entry, queryLower);
        }
        
        return intentResults.slice(0, limit);
      }
    }
    
    // 3. Búsqueda por preguntas similares
    const questionMatches = this.searchByQuestionSimilarity(queryNormalized);
    if (questionMatches.length > 0 && questionMatches[0].score >= 0.6) {
      console.log(`   ✅ Match por pregunta similar: ${questionMatches[0].entry.id} (${questionMatches[0].score})`);
      
      if (sessionId) {
        this.updateContext(sessionId, questionMatches[0].entry, queryLower);
      }
      
      return questionMatches.slice(0, limit);
    }
    
    // 4. Búsqueda por keywords con penalización
    const keywordResults = this.searchByKeywordsStrict(queryNormalized);
    if (keywordResults.length > 0 && keywordResults[0].score >= 0.4) {
      console.log(`   ✅ Match por keywords: ${keywordResults[0].entry.id} (${keywordResults[0].score})`);
      
      if (sessionId) {
        this.updateContext(sessionId, keywordResults[0].entry, queryLower);
      }
      
      return keywordResults.slice(0, limit);
    }
    
    // 5. No encontramos nada bueno
    console.log(`   ❌ Sin match bueno en KB`);
    return [];
  }

  /**
   * Detectar la intención principal de la consulta
   */
  private detectIntent(query: string): { intent: string, score: number, entryIds: string[] } | null {
    let bestIntent: { intent: string, score: number, entryIds: string[] } | null = null;
    
    for (const [intentName, config] of Object.entries(INTENT_MAPPINGS)) {
      let matchCount = 0;
      let totalPatterns = config.patterns.length;
      
      for (const pattern of config.patterns) {
        if (query.includes(pattern)) {
          matchCount++;
        }
      }
      
      // Score basado en matches y prioridad
      const baseScore = matchCount / Math.min(totalPatterns, 5); // Normalizar
      const adjustedScore = baseScore * (config.priority / 10);
      
      if (!bestIntent || adjustedScore > bestIntent.score) {
        if (matchCount > 0) {
          bestIntent = {
            intent: intentName,
            score: adjustedScore,
            entryIds: config.entryIds
          };
        }
      }
    }
    
    return bestIntent;
  }

  /**
   * Buscar por intención detectada
   */
  private searchByIntent(query: string, intent: { intent: string, score: number, entryIds: string[] }): SearchResult[] {
    const results: SearchResult[] = [];
    
    for (const entryId of intent.entryIds) {
      const entry = KNOWLEDGE_BASE.find(e => e.id === entryId);
      if (!entry) continue;
      
      // Verificar exclusiones
      const exclusions = EXCLUSION_PATTERNS[entryId] || [];
      const hasExclusion = exclusions.some(ex => query.includes(ex));
      if (hasExclusion) {
        console.log(`   Excluido ${entryId} por exclusión`);
        continue;
      }
      
      // Calcular score específico para esta entrada
      let entryScore = intent.score;
      
      // Bonus por keywords de la entrada que están en la query
      for (const keyword of entry.keywords) {
        if (query.includes(keyword.toLowerCase())) {
          entryScore += 0.15;
        }
      }
      
      // Bonus por palabras de las preguntas
      for (const question of entry.questions) {
        const qWords = this.getSignificantWords(question.toLowerCase());
        const qMatches = qWords.filter(w => query.includes(w)).length;
        entryScore += qMatches * 0.1;
      }
      
      results.push({
        entry,
        score: Math.min(entryScore, 0.98),
        matchType: 'intent',
        debugInfo: `Intent: ${intent.intent}`
      });
    }
    
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Buscar por similitud con preguntas predefinidas
   */
  private searchByQuestionSimilarity(query: string): SearchResult[] {
    const results: SearchResult[] = [];
    const queryWords = new Set(this.getSignificantWords(query));
    
    for (const entry of KNOWLEDGE_BASE) {
      let bestQuestionScore = 0;
      
      for (const question of entry.questions) {
        const questionWords = new Set(this.getSignificantWords(question.toLowerCase()));
        
        // Calcular Jaccard similarity
        const intersection = new Set([...queryWords].filter(x => questionWords.has(x)));
        const union = new Set([...queryWords, ...questionWords]);
        
        const jaccard = intersection.size / union.size;
        
        // También calcular overlap
        const overlap = intersection.size / Math.min(queryWords.size, questionWords.size);
        
        const combinedScore = (jaccard * 0.4) + (overlap * 0.6);
        
        if (combinedScore > bestQuestionScore) {
          bestQuestionScore = combinedScore;
        }
      }
      
      if (bestQuestionScore > 0.3) {
        // Verificar exclusiones
        const exclusions = EXCLUSION_PATTERNS[entry.id] || [];
        const hasExclusion = exclusions.some(ex => query.includes(ex));
        if (hasExclusion) continue;
        
        results.push({
          entry,
          score: bestQuestionScore,
          matchType: 'semantic',
          debugInfo: `Question similarity`
        });
      }
    }
    
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Búsqueda estricta por keywords con penalizaciones
   */
  private searchByKeywordsStrict(query: string): SearchResult[] {
    const results: SearchResult[] = [];
    const queryWords = this.getSignificantWords(query);
    
    for (const entry of KNOWLEDGE_BASE) {
      // Verificar exclusiones primero
      const exclusions = EXCLUSION_PATTERNS[entry.id] || [];
      const hasExclusion = exclusions.some(ex => query.includes(ex));
      if (hasExclusion) continue;
      
      let matchedKeywords = 0;
      let totalKeywords = entry.keywords.length;
      
      for (const keyword of entry.keywords) {
        const keyLower = keyword.toLowerCase();
        // Match exacto de keyword
        if (query.includes(keyLower)) {
          matchedKeywords++;
        }
        // Match parcial bidireccional
        else if (queryWords.some(w => keyLower.includes(w) && w.length >= 4)) {
          matchedKeywords += 0.5;
        }
      }
      
      if (matchedKeywords >= 1) {
        // Score basado en proporción de keywords matcheados
        const keywordScore = matchedKeywords / Math.min(totalKeywords, 6);
        
        // Penalizar si la categoría no encaja con las palabras principales
        let categoryPenalty = 0;
        if (entry.category === 'señalizacion' && !query.includes('señal') && !query.includes('senal')) {
          categoryPenalty = 0.3;
        }
        
        const finalScore = Math.max(0, keywordScore - categoryPenalty);
        
        if (finalScore > 0.2) {
          results.push({
            entry,
            score: Math.min(finalScore, 0.85),
            matchType: 'keyword',
            debugInfo: `${matchedKeywords}/${totalKeywords} keywords`
          });
        }
      }
    }
    
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Normalizar texto para búsqueda
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[¿?¡!.,;:'"]/g, ' ')   // Quitar puntuación
      .replace(/\s+/g, ' ')             // Normalizar espacios
      .trim();
  }

  /**
   * Obtener palabras significativas (sin stopwords)
   */
  private getSignificantWords(text: string): string[] {
    const stopwords = new Set([
      'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
      'de', 'del', 'al', 'a', 'en', 'con', 'por', 'para',
      'que', 'qué', 'cual', 'cuál', 'quien', 'quién',
      'se', 'su', 'sus', 'mi', 'mis', 'tu', 'tus',
      'y', 'o', 'pero', 'si', 'no', 'es', 'son', 'soy',
      'como', 'cómo', 'donde', 'dónde', 'cuando', 'cuándo',
      'me', 'te', 'le', 'lo', 'nos', 'les',
      'muy', 'mas', 'más', 'menos', 'ya', 'aun', 'aún',
      'este', 'esta', 'esto', 'ese', 'esa', 'eso',
      'hay', 'han', 'he', 'ha', 'hemos', 'tienen', 'tengo',
      'ser', 'estar', 'hacer', 'tener', 'ir', 'ver',
      'nose', 'sé', 'puedo', 'puede', 'debo', 'debe', 'deben'
    ]);
    
    return this.normalizeText(text)
      .split(/\s+/)
      .filter(w => w.length >= 3 && !stopwords.has(w));
  }

  /**
   * Actualizar contexto de conversación
   */
  private updateContext(
    sessionId: string, 
    entry: KnowledgeEntry, 
    query: string
  ): void {
    const existing = this.conversationContexts.get(sessionId) || {
      recentKeywords: []
    };
    
    this.conversationContexts.set(sessionId, {
      lastTopic: entry.category,
      lastEntryId: entry.id,
      recentKeywords: [
        ...this.getSignificantWords(query).slice(0, 5),
        ...existing.recentKeywords.slice(0, 10)
      ]
    });
  }

  /**
   * Obtener respuesta formateada
   */
  getFormattedResponse(entry: KnowledgeEntry, shortVersion: boolean = false): string {
    return shortVersion && entry.shortAnswer 
      ? entry.shortAnswer 
      : entry.answer;
  }

  /**
   * Obtener sugerencias basadas en resultado
   */
  getSuggestions(entry: KnowledgeEntry): string[] {
    const related = getRelatedTopics(entry.id);
    return related.slice(0, 3).map(e => e.questions[0]);
  }
}
