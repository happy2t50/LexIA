// Servicio RAG (Retrieval-Augmented Generation)
import { Pool } from 'pg';
import { getEmbeddingService, EmbeddingService } from './EmbeddingService.js';

export interface DocumentChunk {
  id: string;
  documentoId: string;
  contenido: string;
  similitud: number;
  tituloDocumento: string;
  categoria: string;
  cluster: string;
}

export interface RAGResult {
  consulta: string;
  chunksRecuperados: DocumentChunk[];
  contexto: string;
  cluster?: string;
  tiempoBusquedaMs: number;
}

export class RAGService {
  private pool: Pool;
  private embeddingService: EmbeddingService;
  private topK: number;
  private similarityThreshold: number;

  constructor(pool: Pool) {
    this.pool = pool;
    this.embeddingService = getEmbeddingService();
    this.topK = parseInt(process.env.TOP_K_RESULTS || '5', 10);
    this.similarityThreshold = parseFloat(process.env.SIMILARITY_THRESHOLD || '0.5');
  }

  /**
   * Inicializar servicio (cargar modelo de embeddings)
   */
  async initialize(): Promise<void> {
    await this.embeddingService.initialize();
    console.log('✅ RAG Service inicializado');
  }

  /**
   * Realizar búsqueda RAG completa
   * @param query Consulta del usuario
   * @param cluster Filtro opcional por cluster
   * @param categoria Filtro opcional por categoría
   */
  async search(
    query: string,
    cluster?: string,
    categoria?: string
  ): Promise<RAGResult> {
    const startTime = Date.now();

    // 1. Generar embedding de la consulta
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);

    // 2. Buscar chunks similares en la base de datos
    const chunks = await this.searchSimilarChunks(
      queryEmbedding,
      cluster,
      categoria
    );

    // 3. Construir contexto
    const contexto = this.buildContext(chunks);

    const tiempoBusquedaMs = Date.now() - startTime;

    // 4. Guardar historial de consulta RAG
    await this.saveRAGQuery(query, queryEmbedding, chunks, cluster, tiempoBusquedaMs);

    return {
      consulta: query,
      chunksRecuperados: chunks,
      contexto,
      cluster,
      tiempoBusquedaMs
    };
  }

  /**
   * Buscar chunks similares usando pgvector
   */
  private async searchSimilarChunks(
    queryEmbedding: number[],
    cluster?: string,
    categoria?: string
  ): Promise<DocumentChunk[]> {
    try {
      // Convertir embedding a formato pgvector
      const embeddingStr = `[${queryEmbedding.join(',')}]`;

      let query: string;
      let params: any[];

      if (cluster || categoria) {
        // Búsqueda híbrida con filtros
        query = `
          SELECT * FROM buscar_chunks_hibrida(
            $1::vector,
            $2,
            $3,
            $4,
            $5
          )
        `;
        params = [
          embeddingStr,
          cluster || null,
          categoria || null,
          this.topK,
          this.similarityThreshold
        ];
      } else {
        // Búsqueda simple
        query = `
          SELECT * FROM buscar_chunks_similares(
            $1::vector,
            $2,
            $3
          )
        `;
        params = [embeddingStr, this.topK, this.similarityThreshold];
      }

      const result = await this.pool.query(query, params);

      return result.rows.map(row => ({
        id: row.chunk_id,
        documentoId: row.documento_id,
        contenido: row.contenido,
        similitud: parseFloat(row.similitud),
        tituloDocumento: row.titulo_documento,
        categoria: row.categoria,
        cluster: row.cluster
      }));
    } catch (error: any) {
      console.error('Error al buscar chunks similares:', error);
      throw new Error(`Error en búsqueda RAG: ${error.message}`);
    }
  }

  /**
   * Construir contexto a partir de los chunks recuperados
   */
  private buildContext(chunks: DocumentChunk[]): string {
    if (chunks.length === 0) {
      return 'No se encontró información relevante en la base de conocimiento.';
    }

    const contextoParts = chunks.map((chunk, index) => {
      return `[Documento ${index + 1}: ${chunk.tituloDocumento}]\n${chunk.contenido}`;
    });

    return contextoParts.join('\n\n---\n\n');
  }

  /**
   * Guardar historial de consulta RAG
   */
  private async saveRAGQuery(
    query: string,
    queryEmbedding: number[],
    chunks: DocumentChunk[],
    cluster: string | undefined,
    tiempoBusquedaMs: number
  ): Promise<void> {
    try {
      const embeddingStr = `[${queryEmbedding.join(',')}]`;
      const chunksRecuperados = JSON.stringify(
        chunks.map(c => ({ id: c.id, similitud: c.similitud }))
      );
      const scores = chunks.map(c => c.similitud);

      await this.pool.query(
        `INSERT INTO rag_consultas
         (texto_consulta, embedding_consulta, chunks_recuperados, scores, cluster_asignado, tiempo_busqueda_ms)
         VALUES ($1, $2::vector, $3::jsonb, $4, $5, $6)`,
        [query, embeddingStr, chunksRecuperados, scores, cluster || null, tiempoBusquedaMs]
      );
    } catch (error) {
      console.error('Error al guardar historial RAG:', error);
      // No lanzar error, solo loguear
    }
  }

  /**
   * Indexar un nuevo documento
   */
  async indexDocument(
    titulo: string,
    contenido: string,
    fuente: string,
    categoria: string,
    clusterRelacionado: string
  ): Promise<string> {
    try {
      // 1. Insertar documento
      const documentoResult = await this.pool.query(
        `INSERT INTO documentos_legales (titulo, contenido, fuente, categoria, cluster_relacionado)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [titulo, contenido, fuente, categoria, clusterRelacionado]
      );

      const documentoId = documentoResult.rows[0].id;

      // 2. Dividir en chunks
      const maxChunkSize = parseInt(process.env.MAX_CHUNK_SIZE || '512', 10);
      const chunks = this.embeddingService.chunkText(contenido, maxChunkSize);

      // 3. Generar embeddings para cada chunk
      const embeddings = await this.embeddingService.generateEmbeddingsBatch(chunks);

      // 4. Insertar chunks con embeddings
      for (let i = 0; i < chunks.length; i++) {
        const embeddingStr = `[${embeddings[i].join(',')}]`;

        await this.pool.query(
          `INSERT INTO documento_chunks (documento_id, chunk_index, contenido, embedding)
           VALUES ($1, $2, $3, $4::vector)`,
          [documentoId, i, chunks[i], embeddingStr]
        );
      }

      console.log(`✅ Documento indexado: ${titulo} (${chunks.length} chunks)`);
      return documentoId;
    } catch (error: any) {
      console.error('Error al indexar documento:', error);
      throw new Error(`No se pudo indexar documento: ${error.message}`);
    }
  }

  /**
   * Indexar todos los documentos existentes
   */
  async indexAllDocuments(): Promise<void> {
    try {
      // Obtener documentos sin chunks
      const result = await this.pool.query(`
        SELECT dl.id, dl.titulo, dl.contenido
        FROM documentos_legales dl
        LEFT JOIN documento_chunks dc ON dl.id = dc.documento_id
        WHERE dc.id IS NULL AND dl.activo = TRUE
      `);

      console.log(`📄 Encontrados ${result.rows.length} documentos para indexar`);

      for (const doc of result.rows) {
        // Dividir en chunks
        const maxChunkSize = parseInt(process.env.MAX_CHUNK_SIZE || '512', 10);
        const chunks = this.embeddingService.chunkText(doc.contenido, maxChunkSize);

        // Generar embeddings
        const embeddings = await this.embeddingService.generateEmbeddingsBatch(chunks);

        // Insertar chunks
        for (let i = 0; i < chunks.length; i++) {
          const embeddingStr = `[${embeddings[i].join(',')}]`;

          await this.pool.query(
            `INSERT INTO documento_chunks (documento_id, chunk_index, contenido, embedding)
             VALUES ($1, $2, $3, $4::vector)`,
            [doc.id, i, chunks[i], embeddingStr]
          );
        }

        console.log(`  ✅ ${doc.titulo} (${chunks.length} chunks)`);
      }

      console.log(`✅ Indexación completa: ${result.rows.length} documentos`);
    } catch (error: any) {
      console.error('Error al indexar documentos:', error);
      throw new Error(`Error en indexación: ${error.message}`);
    }
  }

  /**
   * Obtener estadísticas de la base de conocimiento
   */
  async getStats(): Promise<any> {
    try {
      const stats = await this.pool.query(`
        SELECT
          COUNT(DISTINCT dl.id) as total_documentos,
          COUNT(dc.id) as total_chunks,
          COUNT(DISTINCT dl.categoria) as total_categorias,
          COUNT(DISTINCT dl.cluster_relacionado) as total_clusters
        FROM documentos_legales dl
        LEFT JOIN documento_chunks dc ON dl.id = dc.documento_id
        WHERE dl.activo = TRUE
      `);

      return stats.rows[0];
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return null;
    }
  }
}
