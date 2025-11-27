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
   * Dividir texto largo en chunks
   * @param text Texto completo
   * @param maxChunkSize Tamaño máximo de cada chunk
   * @param overlap Overlap entre chunks
   * @returns Array de chunks
   */
  chunkText(text: string, maxChunkSize: number = 512, overlap: number = 50): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];

    let currentChunk: string[] = [];
    let currentSize = 0;

    for (const word of words) {
      currentChunk.push(word);
      currentSize += word.length + 1; // +1 por el espacio

      if (currentSize >= maxChunkSize) {
        chunks.push(currentChunk.join(' '));

        // Mantener overlap
        const overlapWords = Math.floor(overlap / 10); // Aproximadamente 10 chars por palabra
        currentChunk = currentChunk.slice(-overlapWords);
        currentSize = currentChunk.reduce((sum, w) => sum + w.length + 1, 0);
      }
    }

    // Agregar último chunk si no está vacío
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }

    return chunks;
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
