// Servicio de Embeddings usando Transformers.js (100% local, sin OpenAI)
import { pipeline } from '@xenova/transformers';

export class EmbeddingService {
  private model: any = null;
  private modelName: string;
  private isInitialized: boolean = false;

  constructor(modelName: string = 'Xenova/all-MiniLM-L6-v2') {
    this.modelName = modelName;
  }

  /**
   * Inicializar el modelo de embeddings
   * Este modelo es pequeño (80MB) y corre en CPU
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log(`🔄 Cargando modelo de embeddings: ${this.modelName}...`);

    try {
      // Cargar modelo de feature extraction
      this.model = await pipeline('feature-extraction', this.modelName);
      this.isInitialized = true;
      console.log(`✅ Modelo de embeddings cargado exitosamente`);
    } catch (error) {
      console.error('❌ Error al cargar modelo de embeddings:', error);
      throw new Error('No se pudo inicializar el modelo de embeddings');
    }
  }

  /**
   * Generar embedding para un texto
   * @param text Texto a vectorizar
   * @returns Vector de embedding (384 dimensiones)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.model || !this.isInitialized) {
      await this.initialize();
    }

    try {
      // Normalizar texto
      const normalizedText = this.normalizeText(text);

      // Generar embedding
      const output = await this.model!(normalizedText, {
        pooling: 'mean',
        normalize: true
      });

      // Convertir a array de números
      const embedding = Array.from(output.data as Float32Array);

      return embedding;
    } catch (error) {
      console.error('Error al generar embedding:', error);
      throw new Error('No se pudo generar embedding para el texto');
    }
  }

  /**
   * Generar embeddings para múltiples textos (batch)
   * @param texts Array de textos
   * @returns Array de embeddings
   */
  async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    if (!this.model || !this.isInitialized) {
      await this.initialize();
    }

    try {
      const embeddings: number[][] = [];

      // Procesar en lotes de 10 para no saturar memoria
      const batchSize = 10;
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchEmbeddings = await Promise.all(
          batch.map(text => this.generateEmbedding(text))
        );
        embeddings.push(...batchEmbeddings);

        console.log(`Procesados ${Math.min(i + batchSize, texts.length)}/${texts.length} textos`);
      }

      return embeddings;
    } catch (error) {
      console.error('Error al generar embeddings batch:', error);
      throw new Error('No se pudieron generar embeddings para los textos');
    }
  }

  /**
   * Calcular similitud coseno entre dos vectores
   * @param embedding1 Primer vector
   * @param embedding2 Segundo vector
   * @returns Similitud coseno (0-1)
   */
  cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Los embeddings deben tener la misma dimensión');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    return similarity;
  }

  /**
   * Normalizar texto antes de generar embedding
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Normalizar espacios
      .slice(0, 512); // Limitar a 512 caracteres (límite del modelo)
  }

  /**
   * Dividir texto largo en chunks SEMÁNTICOS (optimizado para documentos legales)
   * Prioriza mantener artículos completos en lugar de cortar arbitrariamente
   * @param text Texto completo
   * @param maxChunkSize Tamaño máximo de cada chunk (en caracteres)
   * @param overlap Overlap entre chunks
   * @returns Array de chunks semánticamente coherentes
   */
  chunkText(text: string, maxChunkSize: number = 800, overlap: number = 100): string[] {
    const chunks: string[] = [];
    
    // === PASO 1: Detectar si es documento legal con artículos ===
    const articuloPattern = /(?:Art[íi]culo|ART[ÍI]CULO|ARTÍCULO)\s*(\d+[\w\-]*)/gi;
    const tieneArticulos = articuloPattern.test(text);
    
    if (tieneArticulos) {
      // Chunking semántico para documentos legales
      return this.chunkLegalDocument(text, maxChunkSize);
    }
    
    // === PASO 2: Chunking por párrafos para otros documentos ===
    const paragraphs = text.split(/\n\s*\n/);
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      if (!trimmedParagraph) continue;
      
      // Si agregar este párrafo excede el límite, guardar chunk actual
      if (currentChunk.length + trimmedParagraph.length > maxChunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        // Mantener overlap con últimas palabras del chunk anterior
        const words = currentChunk.split(/\s+/);
        const overlapWords = words.slice(-Math.floor(overlap / 8));
        currentChunk = overlapWords.join(' ') + ' ' + trimmedParagraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + trimmedParagraph;
      }
    }
    
    // Agregar último chunk
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    // Si no se generaron chunks (texto muy corto), retornar texto original
    if (chunks.length === 0 && text.trim()) {
      chunks.push(text.trim());
    }
    
    return chunks;
  }

  /**
   * Chunking especializado para documentos legales
   * Mantiene artículos completos como unidades de información
   */
  private chunkLegalDocument(text: string, maxChunkSize: number = 800): string[] {
    const chunks: string[] = [];
    
    // Patrón para detectar inicio de artículos
    const articuloRegex = /(?=(?:Art[íi]culo|ART[ÍI]CULO|ARTÍCULO)\s*\d+)/gi;
    
    // Dividir por artículos
    const articulos = text.split(articuloRegex).filter(a => a.trim());
    
    let currentChunk = '';
    let currentArticuloNum = '';
    
    for (const articulo of articulos) {
      const trimmedArticulo = articulo.trim();
      if (!trimmedArticulo) continue;
      
      // Extraer número de artículo para metadata
      const numMatch = trimmedArticulo.match(/(?:Art[íi]culo|ART[ÍI]CULO|ARTÍCULO)\s*(\d+[\w\-]*)/i);
      const artNum = numMatch ? numMatch[1] : '';
      
      // Si el artículo cabe en el chunk actual
      if (currentChunk.length + trimmedArticulo.length <= maxChunkSize) {
        currentChunk += (currentChunk ? '\n\n' : '') + trimmedArticulo;
        if (artNum) currentArticuloNum = artNum;
      } else {
        // Guardar chunk actual si existe
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        
        // Si el artículo es muy largo, dividirlo por fracciones/incisos
        if (trimmedArticulo.length > maxChunkSize) {
          const subChunks = this.chunkLargeArticle(trimmedArticulo, maxChunkSize);
          chunks.push(...subChunks);
          currentChunk = '';
        } else {
          currentChunk = trimmedArticulo;
          currentArticuloNum = artNum;
        }
      }
    }
    
    // Agregar último chunk
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  /**
   * Dividir artículos muy largos por fracciones/incisos
   */
  private chunkLargeArticle(articulo: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];
    
    // Extraer el encabezado del artículo (primera línea)
    const lines = articulo.split('\n');
    const header = lines[0];
    const content = lines.slice(1).join('\n');
    
    // Dividir por fracciones (I., II., III. o a), b), c))
    const fraccionPattern = /(?=(?:\n|^)\s*(?:[IVX]+[\.\-\)]|[a-z]\)|[0-9]+[\.\-\)]))/gi;
    const fracciones = content.split(fraccionPattern).filter(f => f.trim());
    
    let currentChunk = header;
    
    for (const fraccion of fracciones) {
      const trimmedFraccion = fraccion.trim();
      
      if (currentChunk.length + trimmedFraccion.length <= maxChunkSize) {
        currentChunk += '\n' + trimmedFraccion;
      } else {
        if (currentChunk.trim() !== header) {
          chunks.push(currentChunk.trim());
        }
        // Nuevo chunk con el header para contexto
        currentChunk = header + '\n[Continuación]\n' + trimmedFraccion;
      }
    }
    
    if (currentChunk.trim() && currentChunk.trim() !== header) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.length > 0 ? chunks : [articulo.substring(0, maxChunkSize)];
  }

  /**
   * Obtener información del modelo
   */
  getModelInfo(): { name: string; dimension: number; initialized: boolean } {
    return {
      name: this.modelName,
      dimension: 384, // all-MiniLM-L6-v2 genera embeddings de 384 dimensiones
      initialized: this.isInitialized
    };
  }
}

// Singleton para reutilizar el modelo cargado
let embeddingServiceInstance: EmbeddingService | null = null;

export function getEmbeddingService(): EmbeddingService {
  if (!embeddingServiceInstance) {
    const modelName = process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2';
    embeddingServiceInstance = new EmbeddingService(modelName);
  }
  return embeddingServiceInstance;
}
