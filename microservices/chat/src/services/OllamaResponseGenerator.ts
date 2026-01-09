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
          top_k: 80,        // Mayor vocabulario para generación más rápida
          num_predict: 220,  // 220 tokens balance entre velocidad y contenido
          num_ctx: 1280,     // Contexto optimizado para velocidad
          num_thread: 4      // Usar 4 threads para procesamiento paralelo
        }
      }, {
        timeout: 90000  // 90 segundos máximo para dar margen con carga del modelo
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
   * Construir prompt optimizado para Llama3 con estructura defensiva
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
    
    // Generar recomendaciones específicas según el tema
    const recomendacionesEspecificas = this.generarRecomendacionesPorTema(tema, contexto);

    return `Eres Lexia, asistente legal de tránsito en Chiapas. Tono: ${tono}.

Usuario: ${nombreUsuario}
Pregunta: "${mensajeUsuario}"
Tema: ${tema}
${urgenciaTexto}

BASE LEGAL:
${contextoLegal}

RECOMENDACIONES PRÁCTICAS:
${recomendacionesEspecificas}

INSTRUCCIONES:
- Saluda a ${nombreUsuario} brevemente (1 oración corta)
- Si hay BASE LEGAL: cita 2-3 artículos con números y sanciones
- Si NO hay BASE LEGAL: da consejos prácticos basados en RECOMENDACIONES PRÁCTICAS
- PUEDES dar orientación general sobre qué hacer en situaciones de tránsito (mantener calma, llamar al 911, no mover vehículos, documentar con fotos, etc.)
- NO inventes artículos ni números de ley
- Sé conciso: máximo 120 palabras
- NO uses emojis ni listas numeradas
- Responde de forma natural y conversacional

Responde:`;
  }

  /**
   * Generar recomendaciones específicas según el tipo de infracción
   */
  private generarRecomendacionesPorTema(tema: string, contexto?: ContextoDetectado): string {
    const recomendaciones: Record<string, string> = {
      'exceso_velocidad': `
        • Solicita al agente que te muestre el radar o cinemómetro con la lectura de tu velocidad
        • Verifica que el aparato esté calibrado (debe tener un sello de verificación vigente)
        • Anota: hora exacta, ubicación precisa, número de placa del agente, condiciones del clima
        • Revisa la boleta: debe indicar la velocidad detectada, el límite permitido y el fundamento legal exacto
        • Tienes 15 días hábiles para impugnar ante el Juez Cívico si consideras que la medición fue incorrecta
        • No estás obligado a firmar la boleta si no estás de acuerdo, solo a recibirla
        • Si el radar no tiene calibración vigente o no te lo mostraron, esto puede ser base para impugnar`,
      
      'vuelta_prohibida': `
        • Documenta si había señalamiento visible que prohibiera la vuelta en U (toma foto si es posible)
        • Pregunta al agente cuál es el fundamento legal específico (artículo y fracción)
        • Anota la ubicación exacta, hora, condiciones de visibilidad del señalamiento
        • Verifica en la boleta que indique claramente el lugar y el tipo de maniobra prohibida
        • Si no había señalamiento claro o estaba obstruido, esto es base fuerte para impugnar
        • Tienes 15 días hábiles para presentar tu inconformidad con evidencia fotográfica
        • Puedes argumentar falta de señalización visible o deficiencia en el señalamiento`,
      
      'semaforo_rojo': `
        • Pregunta al agente si hay evidencia fotográfica o video del semáforo en rojo
        • Documenta: hora exacta, ubicación del crucero, fase del semáforo cuando pasaste
        • Si el semáforo tenía falla técnica (luz ámbar muy corta, semáforo apagado), anótalo
        • Verifica si hay cámaras de fotomultas o si solo fue observación del agente
        • Revisa la boleta: debe especificar el crucero exacto y la fase del semáforo
        • Si hay dudas sobre el funcionamiento del semáforo, solicita revisión técnica al impugnar
        • Puedes impugnar en 15 días si tienes testigos o evidencia de mal funcionamiento`,
      
      'estacionamiento_prohibido': `
        • Documenta con foto si había señalamiento visible que prohibiera estacionarse ahí
        • Verifica si es zona de estacionamiento exclusivo, zona azul, o prohibición total
        • Pregunta al agente el fundamento legal exacto de la prohibición
        • Si tu vehículo será remitido al corralón, solicita el ticket con costos detallados
        • Revisa que la boleta indique la ubicación precisa y el tipo de prohibición
        • Si no había señalamiento visible o estaba oculto, documéntalo para impugnar
        • En caso de remisión, tienes derecho a que te informen los costos antes de llevárselo`,
      
      'alcoholemia': `
        • Tienes derecho a conocer el resultado exacto de la prueba de alcoholimetría
        • Solicita copia del comprobante con la lectura del alcoholímetro
        • Verifica que el aparato tenga sello de calibración vigente
        • Si el resultado es cercano al límite (0.08%), puedes solicitar una segunda prueba
        • Documenta: hora de la prueba, si comiste o tomaste algo antes, medicamentos que tomes
        • NO firmes la boleta si no te mostraron el resultado o si el aparato no estaba sellado
        • Si considerás que el resultado es incorrecto, solicita prueba de sangre certificada
        • Caso grave: NO conduzcas más ese día, busca quien recoja tu auto, evita agravar la situación`,
      
      'documentos_faltantes': `
        • Identifica exactamente qué documento te están solicitando: licencia, tarjeta de circulación, seguro
        • Si tienes los documentos pero no los traes, explica dónde están (casa, otro vehículo)
        • Pregunta si puedes presentarlos posteriormente en el Juzgado Cívico (a veces es posible)
        • Si tu licencia está vencida, averigua inmediatamente cómo renovarla
        • Para el seguro: si lo tienes vigente, solicita a tu aseguradora que envíe constancia digital
        • Revisa la boleta: debe especificar exactamente qué documento falta
        • Si puedes comprobar que SÍ tienes el documento vigente, impugna con la evidencia en 15 días`,
      
      'accidente': `
        • NO muevas los vehículos hasta que lleguen las autoridades (salvo que obstruyan vías principales)
        • Llama inmediatamente al 911 para reportar el accidente
        • Toma fotos: posición de los vehículos, daños, placas, calle, señalamientos
        • Intercambia datos con el otro conductor: nombre, teléfono, seguro, placas
        • Si hay heridos, NO los muevas, espera a los paramédicos
        • Si tu seguro cubre daños, repórtalo inmediatamente a tu aseguradora
        • NO admitas culpabilidad en el lugar, deja que el perito determine responsabilidades
        • Si el otro conductor se da a la fuga, anota placas y reporta inmediatamente`,
      
      'mordida': `
        • NO ofrezcas dinero al agente, es un delito (cohecho)
        • Si el agente te pide dinero, documenta: nombre, placa, hora, ubicación
        • Puedes grabar audio o video (discretamente) como evidencia
        • Dile al agente que prefieres recibir la boleta formal
        • Si insiste, di: "Prefiero resolver esto de manera oficial en el Juzgado"
        • Reporta el incidente inmediatamente: 089 (denuncia anónima) o Contraloría Interna
        • NUNCA pagues "multa" en efectivo al agente, solo se paga en oficinas oficiales con recibo
        • Si ya pagaste mordida, aún puedes denunciar aunque no recuperes el dinero`,
      
      'general': `
        • Solicita al agente que te explique claramente la razón de la infracción
        • Pregunta el fundamento legal exacto (artículo y fracción específica)
        • Documenta: hora, ubicación exacta, nombre y placa del agente
        • Toma fotos del contexto (señalamientos, condiciones del lugar)
        • Revisa que la boleta tenga todos los datos correctos antes de recibirla
        • Tienes 15 días hábiles para impugnar si no estás de acuerdo
        • NO firmes si no estás de acuerdo, pero sí debes recibir la boleta
        • Guarda todos los documentos y evidencias para tu defensa`
    };

    // Agregar contexto de urgencia si hay heridos
    let recomendacion = recomendaciones[tema] || recomendaciones['general'];
    
    if (contexto?.hayHeridos) {
      recomendacion = `⚠️ PRIORIDAD: Hay heridos
        • Llama INMEDIATAMENTE al 911 para solicitar ambulancia
        • NO muevas a las personas heridas salvo peligro inminente
        • Mantén la calma y brinda primeros auxilios básicos si sabes
        • NO abandones el lugar del accidente (es delito grave)
        ${recomendacion}`;
    }

    return recomendacion;
  }
}

export const ollamaResponseGenerator = new OllamaResponseGenerator();

// Test de conectividad al inicializar módulo
ollamaResponseGenerator.testConexion().catch(err => {
  console.log('⚠️ Test de conectividad a Ollama falló al iniciar:', err);
});
