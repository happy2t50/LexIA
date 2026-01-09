/**
 * SlangNormalizer - Traductor de lenguaje coloquial mexicano a términos legales formales
 *
 * Propósito: Normalizar el texto ANTES de enviarlo al RAG para que los embeddings
 * encuentren similitudes con artículos legales.
 *
 * Ejemplo:
 *   Input:  "wey me agarraron bien pedote manejando la troca"
 *   Output: "me detuvieron conducir en estado de ebriedad el vehículo"
 */

export class SlangNormalizer {
  private slangMap: Record<string, string> = {
    // ========== ALCOHOL Y ESTADO ==========
    'pedote': 'estado de ebriedad',
    'pedo': 'ebrio',
    'bolo': 'ebrio',
    'cuete': 'intoxicado',
    'pilas': 'ebrio',
    'borracho': 'estado de ebriedad',
    'chupando': 'ingiriendo bebidas alcohólicas',
    'pisto': 'alcohol',
    'tomado': 'bajo efectos del alcohol',
    'alcoholizado': 'estado de ebriedad',
    'entonado': 'ebrio',
    'hasta atrás': 'muy ebrio',
    'hasta las chanclas': 'muy ebrio',
    'chelero': 'bebiendo cerveza',

    // ========== VEHÍCULOS Y OBJETOS ==========
    'troca': 'camioneta',
    'carro': 'vehículo',
    'nave': 'vehículo',
    'bika': 'motocicleta',
    'motoneta': 'motocicleta',
    'fierro': 'arma',
    'moto': 'motocicleta',

    // ========== ACCIONES DE TRÁNSITO ==========
    'topo': 'chocó',
    'topé': 'choqué',
    'pegué': 'choqué',
    'di': 'choqué',
    'dieron': 'chocaron',
    'aventaron': 'chocaron',
    'estrellé': 'choqué',
    'impactó': 'chocó',

    // ========== FUGA Y ESCAPE ==========
    'pelo': 'huyó',
    'se peló': 'huyó',
    'se fue': 'se dio a la fuga',
    'escapó': 'se dio a la fuga',
    'corrió': 'huyó',
    'rajó': 'huyó',
    'pelaron': 'huyeron',

    // ========== DETENCIÓN Y AUTORIDAD ==========
    'agarraron': 'detuvieron',
    'cacharon': 'detuvieron',
    'cayeron': 'detuvieron',
    'pararon': 'detuvieron',
    'checaron': 'revisaron',
    'torcieron': 'detuvieron',
    'levantaron': 'detuvieron',

    // ========== GRÚA Y ESTACIONAMIENTO ==========
    'corrieron la grúa': 'remolcaron el vehículo',
    'llevaron el carro': 'remolcaron',
    'sacaron el coche': 'remolcaron',
    'quitaron la troca': 'remolcaron',
    'grúa se llevó': 'remolcaron',

    // ========== CORRUPCIÓN ==========
    'mordida': 'soborno',
    'lana': 'dinero',
    'feria': 'dinero',
    'varo': 'dinero',

    // ========== INFRAESTRUCTURA ==========
    'banqueta': 'acera',
    'cámara': 'fotomulta',
    'poste': 'infraestructura pública',
    'alumbrado': 'alumbrado público',
    'semáforo roto': 'señalización dañada',

    // ========== SEMÁFORO Y SEÑALES ==========
    'brincué': 'crucé en alto',
    'brinqué': 'crucé en alto',
    'me lo salté': 'no obedecí la señal',
    'pasé el rojo': 'crucé con luz roja',
    'me pasé la luz': 'crucé con luz roja',

    // ========== VELOCIDAD ==========
    'iba pilas': 'conducía a alta velocidad',
    'iba todo pilas': 'exceso de velocidad',
    'volando': 'a alta velocidad',
    'a fondo': 'exceso de velocidad',

    // ========== PALABRAS DE RELLENO (ELIMINAR) ==========
    'wey': '',
    'we': '',
    'compa': '',
    'carnal': '',
    'no mames': '',
    'verga': '',
    'pinche': '',
    'alv': '',
    'cabrón': '',
    'pendejo': '',
    'chingados': '',
    'madres': '',
    'oye': '',
    'fíjate': '',
    'mira': '',
    'nel': ''
  };

  /**
   * Normaliza texto coloquial a términos legales formales
   *
   * @param text - Texto en lenguaje coloquial
   * @returns Texto normalizado para búsqueda legal
   */
  normalize(text: string): string {
    let normalized = text.toLowerCase();

    // 1. Reemplazos de frases completas primero (para evitar reemplazos parciales)
    const phrasesFirst = [
      'corrieron la grúa',
      'llevaron el carro',
      'sacaron el coche',
      'quitaron la troca',
      'grúa se llevó',
      'se peló',
      'se fue',
      'iba todo pilas',
      'iba pilas',
      'pasé el rojo',
      'me pasé la luz',
      'me lo salté',
      'hasta atrás',
      'hasta las chanclas'
    ];

    phrasesFirst.forEach(phrase => {
      if (this.slangMap[phrase]) {
        const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        normalized = normalized.replace(regex, this.slangMap[phrase]);
      }
    });

    // 2. Reemplazo de palabras individuales
    Object.entries(this.slangMap).forEach(([slang, formal]) => {
      // Solo si no es una frase (ya procesadas arriba)
      if (!slang.includes(' ')) {
        // Reemplaza la palabra completa (word boundary)
        const regex = new RegExp(`\\b${slang}\\b`, 'gi');
        normalized = normalized.replace(regex, formal);
      }
    });

    // 3. Limpieza de espacios múltiples generados por eliminaciones
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
  }

  /**
   * Normaliza conservando el texto original para contexto
   *
   * @param text - Texto original
   * @returns Objeto con texto original y normalizado
   */
  normalizeWithContext(text: string): { original: string; normalized: string; changed: boolean } {
    const normalized = this.normalize(text);
    return {
      original: text,
      normalized: normalized,
      changed: text.toLowerCase() !== normalized
    };
  }

  /**
   * Detecta si el texto contiene slang que necesita normalización
   *
   * @param text - Texto a analizar
   * @returns true si contiene slang
   */
  hasSlang(text: string): boolean {
    const textLower = text.toLowerCase();
    return Object.keys(this.slangMap).some(slang => {
      if (slang.includes(' ')) {
        return textLower.includes(slang);
      } else {
        const regex = new RegExp(`\\b${slang}\\b`, 'i');
        return regex.test(textLower);
      }
    });
  }
}

// Singleton para reutilizar
export const slangNormalizer = new SlangNormalizer();
