import natural from 'natural';
import { VectorizationResult } from '../types';

export class VectorizationService {
  private tokenizer: natural.WordTokenizer;
  private tfidf: natural.TfIdf;
  private vocabulary: Map<string, number>;

  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.tfidf = new natural.TfIdf();
    this.vocabulary = new Map();
    this.initializeVocabulary();
  }

  private initializeVocabulary(): void {
    // Vocabulario base relacionado con incidentes de tráfico
    const baseWords = [
      'semaforo', 'rojo', 'velocidad', 'exceso', 'choque', 'accidente',
      'estacionamiento', 'alcoholimetro', 'licencia', 'documentos',
      'multa', 'policia', 'transito', 'via', 'calle', 'auto', 'carro',
      'vehiculo', 'conductor', 'peaton', 'infraccion', 'parar', 'detenido'
    ];

    baseWords.forEach((word, index) => {
      this.vocabulary.set(word, index);
    });
  }

  /**
   * Vectoriza un texto usando TF-IDF simplificado
   */
  vectorizar(texto: string): VectorizationResult {
    // Normalizar texto
    const textoNormalizado = texto.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Remover acentos

    // Tokenizar
    const tokens = this.tokenizer.tokenize(textoNormalizado) || [];

    // Crear vector TF-IDF simplificado
    const vector: number[] = new Array(this.vocabulary.size).fill(0);

    // Calcular frecuencia de términos
    const termFreq: Map<string, number> = new Map();
    tokens.forEach(token => {
      termFreq.set(token, (termFreq.get(token) || 0) + 1);
    });

    // Llenar vector
    termFreq.forEach((freq, term) => {
      const index = this.vocabulary.get(term);
      if (index !== undefined) {
        vector[index] = freq / tokens.length; // TF normalizado
      }
    });

    // Agregar características adicionales
    vector.push(tokens.length); // Longitud del texto
    vector.push(this.contarPalabrasClave(tokens)); // Palabras clave de tráfico

    return {
      vector,
      tokensCount: tokens.length
    };
  }

  /**
   * Vectorización por embeddings (simulado - en producción usar sentence-transformers)
   */
  vectorizarConEmbeddings(texto: string): number[] {
    // Simulación de embeddings de 128 dimensiones
    // En producción, aquí se llamaría a un modelo de embeddings real
    const baseVector = this.vectorizar(texto).vector;

    // Expandir a 128 dimensiones con transformación hash
    const embedding = new Array(128).fill(0);
    const textoNormalizado = texto.toLowerCase();

    for (let i = 0; i < textoNormalizado.length; i++) {
      const charCode = textoNormalizado.charCodeAt(i);
      const index = charCode % 128;
      embedding[index] += 1;
    }

    // Normalizar
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / (magnitude || 1));
  }

  private contarPalabrasClave(tokens: string[]): number {
    const palabrasClave = [
      'semaforo', 'choque', 'alcoholimetro', 'estacionamiento',
      'licencia', 'velocidad', 'multa', 'accidente'
    ];
    return tokens.filter(token => palabrasClave.includes(token)).length;
  }

  /**
   * Calcular similitud coseno entre dos vectores
   */
  calcularSimilitud(vector1: number[], vector2: number[]): number {
    if (vector1.length !== vector2.length) {
      throw new Error('Los vectores deben tener la misma dimensión');
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
      magnitude1 += vector1[i] * vector1[i];
      magnitude2 += vector2[i] * vector2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }
}
