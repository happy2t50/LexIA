import { ArticuloLegal } from './SmartResponseService';
import { ContextoDetectado } from './LegalNormalizer';
import { articuloLegalMapper, AnalisisSituacion } from './ArticuloLegalMapper';
import axios from 'axios';

export class OllamaResponseGenerator {
  private ollamaUrl: string;
  private useOllama: boolean;

  constructor() {
    // Permitir configurar host/puerto vía env; fallback a localhost para dev
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    // Bandera para apagar Ollama rápidamente (USE_OLLAMA=false)
    this.useOllama = (process.env.USE_OLLAMA || 'true').toLowerCase() === 'true';
    console.log(`⚙️  OllamaResponseGenerator init → url=${this.ollamaUrl}, enabled=${this.useOllama}`);
  }

  // Test de conectividad a Ollama
  async testConexion(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`, { timeout: 5000 });
      console.log(`✅ Ollama accesible en ${this.ollamaUrl}`);
      return true;
    } catch (error: any) {
      console.log(`❌ Ollama NO accesible en ${this.ollamaUrl}: ${error.message}`);
      return false;
    }
  }

  /**
   * Genera una respuesta conversacional y empática USANDO OLLAMA/LLAMA3 REAL
   */
  async generarRespuestaSintetizada(
    nombreUsuario: string,
    mensajeUsuario: string,
    _contextoRAG: string,
    _historialConversacion: string,
    tema: string,
    emocionDetectada?: 'enojado' | 'preocupado' | 'neutral' | 'frustrado' | 'desesperado',
    contextoDetectado?: ContextoDetectado,
    articulosRAG?: ArticuloLegal[]
  ): Promise<string> {

    // Analizar la situación para obtener artículos relevantes y detectar info faltante
    const analisis: AnalisisSituacion = articuloLegalMapper.analizarSituacion(
      mensajeUsuario,
      contextoDetectado || this.detectarContextoBasico(mensajeUsuario),
      tema
    );

    console.log(`🔍 Análisis de situación:`);
    console.log(`   Artículos relevantes: ${analisis.articulos.map(a => a.numero).join(', ')}`);
    console.log(`   Info faltante: ${analisis.informacionFaltante.join(', ')}`);
    console.log(`   Preguntas sugeridas: ${analisis.preguntasSugeridas.length}`);

    // ═══════════════════════════════════════════════════════════════
    // GENERAR RESPUESTA CON OLLAMA/LLAMA3
    // ═══════════════════════════════════════════════════════════════
    if (!this.useOllama) {
      throw new Error('Ollama está deshabilitado. Activa USE_OLLAMA=true en el archivo .env');
    }

    try {
      const modelName = process.env.OLLAMA_RESPONSE_MODEL || 'llama3.2:3b';
      console.log(`🤖 Generando respuesta con Ollama/${modelName}...`);
      const respuestaOllama = await this.generarConOllama(
        nombreUsuario,
        mensajeUsuario,
        articulosRAG || [],
        analisis,
        tema,
        emocionDetectada,
        contextoDetectado
      );

      if (respuestaOllama) {
        console.log(`✅ Ollama generó respuesta exitosamente`);
        return respuestaOllama;
      }

      throw new Error('Ollama no retornó respuesta');
    } catch (error: any) {
      const detalle = error?.response?.data || error?.message || error;
      console.error(`❌ Error generando respuesta con Ollama:`, detalle);
      throw new Error(`No se pudo generar respuesta: ${detalle}`);
    }
  }

  /**
   * Detecta contexto básico si no se proporciona
   */
  private detectarContextoBasico(mensaje: string): ContextoDetectado {
    return {
      culpabilidad: 'ambiguo',
      urgencia: /urgente|ayuda|ahora/i.test(mensaje) ? 'alta' : 'media',
      emocion: 'neutral',
      tieneTestigos: /testigo|cámara/i.test(mensaje),
      llamoAutoridades: /911|policía|llamé/i.test(mensaje),
      hayHeridos: /herido|sangr|lesion/i.test(mensaje),
      actores: []
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * GENERAR RESPUESTA CON OLLAMA/LLAMA3 REAL
   * ═══════════════════════════════════════════════════════════════
   */
  private async generarConOllama(
    nombreUsuario: string,
    mensajeUsuario: string,
    articulosRAG: ArticuloLegal[],
    analisis: AnalisisSituacion,
    tema: string,
    emocion?: string,
    contexto?: ContextoDetectado
  ): Promise<string | null> {
    const startTime = Date.now();

    try {
      // Preparar contexto de artículos legales
      const contextoLegal = this.formatearArticulosParaOllama(articulosRAG, analisis);

      // Determinar tono según emoción
      const tono = this.determinarTonoOllama(emocion);

      // Construir prompt optimizado para Llama3
      const prompt = this.construirPromptOllama(
        nombreUsuario,
        mensajeUsuario,
        contextoLegal,
        tema,
        tono,
        analisis,
        contexto
      );

      const modelName = process.env.OLLAMA_RESPONSE_MODEL || 'llama3.2:3b';
      console.log(`🤖 Llamando a Ollama con modelo ${modelName}...`);

      // Llamar a Ollama
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: modelName,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,  // Creatividad moderada
          top_p: 0.9,
          top_k: 40,        // Limitar vocabulario para respuestas más rápidas
          num_predict: 300,  // Reducido a 300 tokens (~200 palabras)
          num_ctx: 2048     // Contexto reducido para mayor velocidad
        }
      }, {
        timeout: 30000  // 30 segundos máximo
      });

      const latency = Date.now() - startTime;
      console.log(`✅ Ollama respondió en ${latency}ms`);

      return response.data.response || null;

    } catch (error: any) {
      const latency = Date.now() - startTime;
      console.log(`❌ Ollama falló después de ${latency}ms:`, error.message);
      return null;
    }
  }

  /**
   * Formatear artículos legales para el prompt de Ollama
   */
  private formatearArticulosParaOllama(
    articulosRAG: ArticuloLegal[],
    analisis: AnalisisSituacion
  ): string {
    if (articulosRAG.length === 0 && analisis.articulos.length === 0) {
      return 'No se encontraron artículos legales específicos.';
    }

    let contexto = '';

    // Usar artículos del RAG si están disponibles
    if (articulosRAG.length > 0) {
      articulosRAG.slice(0, 3).forEach((art, i) => {
        contexto += `${i + 1}. **${art.titulo}**\n`;
        contexto += `   ${art.contenido.substring(0, 400)}...\n`;
        if (art.similitud) {
          contexto += `   (Relevancia: ${(art.similitud * 100).toFixed(0)}%)\n`;
        }
        contexto += '\n';
      });
    }
    // Fallback: usar artículos del analisis
    else if (analisis.articulos.length > 0) {
      analisis.articulos.slice(0, 3).forEach((art, i) => {
        contexto += `${i + 1}. **Artículo ${art.numero}**\n`;
        contexto += `   ${art.explicacionSimple}\n`;
        if (art.consecuencias) {
          contexto += `   Consecuencias: ${art.consecuencias.join(', ')}\n`;
        }
        contexto += '\n';
      });
    }

    return contexto;
  }

  /**
   * Determinar tono para Ollama según emoción
   */
  private determinarTonoOllama(emocion?: string): string {
    const tonos: Record<string, string> = {
      'enojado': 'calmado, objetivo y empático',
      'preocupado': 'tranquilizador y de apoyo',
      'desesperado': 'muy empático y alentador',
      'frustrado': 'comprensivo y solucionador',
      'neutral': 'profesional pero amigable',
      'default': 'amigable y accesible'
    };

    return tonos[emocion || 'default'] || tonos.default;
  }

  /**
   * Construir prompt optimizado para Llama3
   */
  private construirPromptOllama(
    nombreUsuario: string,
    mensajeUsuario: string,
    contextoLegal: string,
    tema: string,
    tono: string,
    analisis: AnalisisSituacion,
    contexto?: ContextoDetectado
  ): string {
    const urgenciaTexto = contexto?.hayHeridos ? 'URGENTE: Hay heridos involucrados.' : '';

    return `Eres LexIA, asistente legal de tránsito en Chiapas, México.

${nombreUsuario} pregunta: "${mensajeUsuario}"

ARTÍCULOS DISPONIBLES:
${contextoLegal}

INSTRUCCIONES ABSOLUTAS:
1. Comienza SIEMPRE con: "${nombreUsuario}, "
2. NO menciones artículos, códigos o leyes que NO aparecen arriba
3. Si los artículos arriba NO responden la pregunta: di "no tengo información específica sobre esto, te recomiendo consultar con un profesionista"
4. Máximo 120 palabras, tono ${tono} mexicano
5. Sin emojis, sin listas numeradas
6. Responde de forma práctica y útil

PROHIBIDO INVENTAR LEYES. Solo usa lo que aparece en ARTÍCULOS DISPONIBLES.

Respuesta:`;
  }
}

export const ollamaResponseGenerator = new OllamaResponseGenerator();

// Test de conectividad al inicializar módulo
ollamaResponseGenerator.testConexion().catch(err => {
  console.log('⚠️ Test de conectividad a Ollama falló al iniciar:', err);
});
