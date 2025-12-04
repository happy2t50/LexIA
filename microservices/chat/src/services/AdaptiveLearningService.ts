/**
 * SERVICIO DE APRENDIZAJE ADAPTATIVO - LexIA
 * 
 * Sistema que aprende de las conversaciones para:
 * 1. Detectar patrones de preguntas exitosas
 * 2. Mejorar la detección de intenciones
 * 3. Generar respuestas más coherentes
 * 4. Adaptarse al feedback del usuario (positivo/negativo)
 */

import { Pool } from 'pg';

export interface PatronAprendido {
  id: string;
  patronOriginal: string;  // Lo que escribió el usuario
  intencionDetectada: string;  // Qué tema/cluster se detectó
  respuestaExitosa: boolean;  // Si el usuario quedó satisfecho
  palabrasClave: string[];  // Palabras clave extraídas
  frecuencia: number;  // Cuántas veces se ha visto este patrón
  ultimaActualizacion: Date;
}

export interface FeedbackUsuario {
  tipo: 'positivo' | 'negativo' | 'correccion';
  mensajeOriginal: string;
  respuestaDada: string;
  correccionSugerida?: string;  // Si el usuario dijo "no, yo quería X"
  intencionCorrecta?: string;
}

export interface ContextoConversacion {
  mensajesAnteriores: string[];
  temasDiscutidos: string[];
  sentimientoGeneral: 'positivo' | 'negativo' | 'neutral' | 'frustrado';
  nivelSatisfaccion: number;  // 0-100
}

export class AdaptiveLearningService {
  private patronesEnMemoria: Map<string, PatronAprendido> = new Map();
  private sinonimosAprendidos: Map<string, string[]> = new Map();
  
  // Patrones de feedback negativo del usuario
  private readonly FEEDBACK_NEGATIVO_PATTERNS = [
    'no me sirve', 'no es eso', 'no entendiste', 'eso no',
    'no me ayuda', 'mal', 'incorrecto', 'no es lo que pregunté',
    'otra vez', 'repite', 'no entiendes', 'eso no era',
    'quería saber', 'yo pregunté', 'mi pregunta era',
    'no me respondiste', 'eso no tiene que ver', 'fuera de tema'
  ];

  // Patrones de feedback positivo
  private readonly FEEDBACK_POSITIVO_PATTERNS = [
    'gracias', 'perfecto', 'excelente', 'eso era', 'exacto',
    'muy bien', 'genial', 'me sirvió', 'útil', 'claro',
    'entendido', 'ok gracias', 'eso quería', 'justo eso'
  ];

  // Patrones de corrección (el usuario aclara qué quería)
  private readonly CORRECCION_PATTERNS = [
    'no, yo quería', 'me refería a', 'lo que quise decir',
    'mi pregunta era sobre', 'en realidad preguntaba',
    'no, es sobre', 'quería saber de', 'pero yo hablaba de'
  ];

  constructor(private pool: Pool) {
    this.cargarPatronesDeDB();
  }

  /**
   * Cargar patrones aprendidos de la base de datos al iniciar
   */
  private async cargarPatronesDeDB(): Promise<void> {
    try {
      const result = await this.pool.query(`
        SELECT * FROM patrones_aprendidos 
        WHERE frecuencia > 2
        ORDER BY frecuencia DESC
        LIMIT 1000
      `);
      
      for (const row of result.rows) {
        this.patronesEnMemoria.set(row.patron_normalizado, {
          id: row.id,
          patronOriginal: row.patron_original,
          intencionDetectada: row.intencion_detectada,
          respuestaExitosa: row.respuesta_exitosa,
          palabrasClave: row.palabras_clave || [],
          frecuencia: row.frecuencia,
          ultimaActualizacion: row.updated_at
        });
      }
      
      console.log(`📚 Cargados ${this.patronesEnMemoria.size} patrones de aprendizaje`);
    } catch (error) {
      console.log('⚠️ Tabla de patrones no existe aún, se creará al guardar');
    }
  }

  /**
   * Analiza el mensaje del usuario para detectar feedback
   */
  detectarFeedback(mensaje: string): FeedbackUsuario | null {
    const msgLower = mensaje.toLowerCase();
    
    // Detectar corrección (prioridad alta)
    for (const pattern of this.CORRECCION_PATTERNS) {
      if (msgLower.includes(pattern)) {
        // Extraer lo que el usuario realmente quería
        const idx = msgLower.indexOf(pattern);
        const correccion = mensaje.substring(idx + pattern.length).trim();
        return {
          tipo: 'correccion',
          mensajeOriginal: mensaje,
          respuestaDada: '',
          correccionSugerida: correccion
        };
      }
    }

    // Detectar feedback negativo
    for (const pattern of this.FEEDBACK_NEGATIVO_PATTERNS) {
      if (msgLower.includes(pattern)) {
        return {
          tipo: 'negativo',
          mensajeOriginal: mensaje,
          respuestaDada: ''
        };
      }
    }

    // Detectar feedback positivo
    for (const pattern of this.FEEDBACK_POSITIVO_PATTERNS) {
      if (msgLower.includes(pattern)) {
        return {
          tipo: 'positivo',
          mensajeOriginal: mensaje,
          respuestaDada: ''
        };
      }
    }

    return null;
  }

  /**
   * Extrae palabras clave importantes del mensaje
   */
  extraerPalabrasClave(mensaje: string): string[] {
    const stopWords = new Set([
      'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
      'de', 'del', 'al', 'a', 'en', 'con', 'por', 'para',
      'que', 'qué', 'cual', 'cuál', 'como', 'cómo', 'donde', 'dónde',
      'me', 'te', 'se', 'nos', 'les', 'lo', 'le',
      'mi', 'tu', 'su', 'mis', 'tus', 'sus',
      'es', 'son', 'fue', 'era', 'están', 'está', 'estoy',
      'he', 'ha', 'han', 'hay', 'haber', 'ser', 'sido',
      'y', 'o', 'pero', 'si', 'no', 'muy', 'más', 'menos',
      'ya', 'aún', 'también', 'solo', 'sólo', 'bien', 'mal',
      'hola', 'oye', 'mira', 'bueno', 'pues', 'entonces'
    ]);

    const palabras = mensaje.toLowerCase()
      .replace(/[¿?¡!.,;:()""'']/g, '')
      .split(/\s+/)
      .filter(p => p.length > 2 && !stopWords.has(p));

    // Detectar frases clave compuestas
    const frasesCompuestas = this.detectarFrasesCompuestas(mensaje.toLowerCase());
    
    return [...new Set([...palabras, ...frasesCompuestas])];
  }

  /**
   * Detecta frases compuestas importantes
   */
  private detectarFrasesCompuestas(mensaje: string): string[] {
    const frases: string[] = [];
    
    const frasesImportantes = [
      'multa injusta', 'agente de transito', 'acera amarilla',
      'semáforo rojo', 'luz roja', 'exceso de velocidad',
      'licencia suspendida', 'puntos licencia', 'seguro vencido',
      'accidente de tránsito', 'choque', 'colisión',
      'estacionamiento prohibido', 'zona prohibida', 'doble fila',
      'alcoholímetro', 'prueba de alcohol', 'conducir ebrio',
      'impugnar multa', 'recurso de revisión', 'apelar multa',
      'grúa se llevó', 'corralón', 'recuperar vehículo',
      'verificación vehicular', 'tenencia', 'refrendo'
    ];

    for (const frase of frasesImportantes) {
      if (mensaje.includes(frase)) {
        frases.push(frase);
      }
    }

    return frases;
  }

  /**
   * Normaliza un mensaje para comparación
   */
  private normalizarMensaje(mensaje: string): string {
    return mensaje.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[¿?¡!.,;:()""'']/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Busca un patrón similar ya aprendido
   */
  buscarPatronSimilar(mensaje: string): PatronAprendido | null {
    const msgNormalizado = this.normalizarMensaje(mensaje);
    const palabrasClave = this.extraerPalabrasClave(mensaje);
    
    // Búsqueda exacta primero
    if (this.patronesEnMemoria.has(msgNormalizado)) {
      return this.patronesEnMemoria.get(msgNormalizado)!;
    }

    // Búsqueda por similitud de palabras clave
    let mejorCoincidencia: PatronAprendido | null = null;
    let mejorScore = 0;

    for (const [key, patron] of this.patronesEnMemoria) {
      const score = this.calcularSimilitud(palabrasClave, patron.palabrasClave);
      if (score > mejorScore && score > 0.6) {  // 60% de similitud mínima
        mejorScore = score;
        mejorCoincidencia = patron;
      }
    }

    return mejorCoincidencia;
  }

  /**
   * Calcula similitud entre dos conjuntos de palabras clave
   */
  private calcularSimilitud(palabras1: string[], palabras2: string[]): number {
    if (palabras1.length === 0 || palabras2.length === 0) return 0;
    
    const set1 = new Set(palabras1);
    const set2 = new Set(palabras2);
    
    let coincidencias = 0;
    for (const palabra of set1) {
      if (set2.has(palabra)) {
        coincidencias++;
      }
    }
    
    // Índice de Jaccard
    const union = new Set([...set1, ...set2]);
    return coincidencias / union.size;
  }

  /**
   * Aprende de una interacción exitosa
   */
  async aprenderDeExito(
    mensajeUsuario: string,
    intencionDetectada: string,
    respuestaDada: string
  ): Promise<void> {
    const msgNormalizado = this.normalizarMensaje(mensajeUsuario);
    const palabrasClave = this.extraerPalabrasClave(mensajeUsuario);

    // Actualizar en memoria
    const patronExistente = this.patronesEnMemoria.get(msgNormalizado);
    
    if (patronExistente) {
      patronExistente.frecuencia++;
      patronExistente.respuestaExitosa = true;
      patronExistente.ultimaActualizacion = new Date();
    } else {
      this.patronesEnMemoria.set(msgNormalizado, {
        id: `patron_${Date.now()}`,
        patronOriginal: mensajeUsuario,
        intencionDetectada,
        respuestaExitosa: true,
        palabrasClave,
        frecuencia: 1,
        ultimaActualizacion: new Date()
      });
    }

    // Guardar en BD
    await this.guardarPatronEnDB(msgNormalizado, mensajeUsuario, intencionDetectada, true, palabrasClave);
  }

  /**
   * Aprende de un error/corrección
   */
  async aprenderDeError(
    mensajeOriginal: string,
    intencionIncorrecta: string,
    correccion: string,
    intencionCorrecta?: string
  ): Promise<void> {
    const msgNormalizado = this.normalizarMensaje(mensajeOriginal);
    
    // Marcar el patrón anterior como fallido
    const patronExistente = this.patronesEnMemoria.get(msgNormalizado);
    if (patronExistente) {
      patronExistente.respuestaExitosa = false;
    }

    // Aprender la nueva asociación si se proporciona
    if (intencionCorrecta && correccion) {
      const palabrasClave = this.extraerPalabrasClave(mensajeOriginal + ' ' + correccion);
      
      await this.pool.query(`
        INSERT INTO correcciones_aprendidas 
        (mensaje_original, intencion_incorrecta, correccion_usuario, intencion_correcta, palabras_clave)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (mensaje_original) DO UPDATE SET
          frecuencia = correcciones_aprendidas.frecuencia + 1,
          intencion_correcta = EXCLUDED.intencion_correcta,
          updated_at = NOW()
      `, [mensajeOriginal, intencionIncorrecta, correccion, intencionCorrecta, palabrasClave]);
    }
  }

  /**
   * Guarda un patrón en la base de datos
   */
  private async guardarPatronEnDB(
    patronNormalizado: string,
    patronOriginal: string,
    intencion: string,
    exitoso: boolean,
    palabrasClave: string[]
  ): Promise<void> {
    try {
      await this.pool.query(`
        INSERT INTO patrones_aprendidos 
        (patron_normalizado, patron_original, intencion_detectada, respuesta_exitosa, palabras_clave, frecuencia)
        VALUES ($1, $2, $3, $4, $5, 1)
        ON CONFLICT (patron_normalizado) DO UPDATE SET
          frecuencia = patrones_aprendidos.frecuencia + 1,
          respuesta_exitosa = EXCLUDED.respuesta_exitosa,
          updated_at = NOW()
      `, [patronNormalizado, patronOriginal, intencion, exitoso, palabrasClave]);
    } catch (error) {
      // Si la tabla no existe, crearla
      await this.crearTablasAprendizaje();
      await this.pool.query(`
        INSERT INTO patrones_aprendidos 
        (patron_normalizado, patron_original, intencion_detectada, respuesta_exitosa, palabras_clave, frecuencia)
        VALUES ($1, $2, $3, $4, $5, 1)
      `, [patronNormalizado, patronOriginal, intencion, exitoso, palabrasClave]);
    }
  }

  /**
   * Crea las tablas necesarias para el aprendizaje
   */
  private async crearTablasAprendizaje(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS patrones_aprendidos (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        patron_normalizado TEXT UNIQUE NOT NULL,
        patron_original TEXT NOT NULL,
        intencion_detectada VARCHAR(100),
        respuesta_exitosa BOOLEAN DEFAULT true,
        palabras_clave TEXT[] DEFAULT '{}',
        frecuencia INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS correcciones_aprendidas (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        mensaje_original TEXT UNIQUE NOT NULL,
        intencion_incorrecta VARCHAR(100),
        correccion_usuario TEXT,
        intencion_correcta VARCHAR(100),
        palabras_clave TEXT[] DEFAULT '{}',
        frecuencia INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sinonimos_aprendidos (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        palabra_base VARCHAR(100) NOT NULL,
        sinonimo VARCHAR(100) NOT NULL,
        contexto VARCHAR(100),
        frecuencia INTEGER DEFAULT 1,
        UNIQUE(palabra_base, sinonimo)
      );

      CREATE INDEX IF NOT EXISTS idx_patrones_intencion ON patrones_aprendidos(intencion_detectada);
      CREATE INDEX IF NOT EXISTS idx_patrones_frecuencia ON patrones_aprendidos(frecuencia DESC);
    `);
    
    console.log('✅ Tablas de aprendizaje creadas');
  }

  /**
   * Mejora la detección de intención usando patrones aprendidos
   */
  mejorarDeteccionIntencion(mensaje: string, intencionOriginal: string): string {
    // NO sobrescribir si ya detectamos un tema específico relevante
    const temasNoSobrescribir = ['accidente', 'derechos', 'multa', 'documentos', 'impugnacion', 'alcohol', 'atropello'];
    if (temasNoSobrescribir.includes(intencionOriginal)) {
      return intencionOriginal;
    }
    
    // NO sobrescribir a saludo si el mensaje tiene contenido real
    const msgLower = mensaje.toLowerCase();
    const palabrasContenido = ['licencia', 'renovar', 'multa', 'accidente', 'choque', 'policia', 'grua', 'donde', 'como', 'puedo', 'ayuda'];
    const tieneContenido = palabrasContenido.some(p => msgLower.includes(p));
    
    // Buscar si hay un patrón aprendido más exitoso
    const patronSimilar = this.buscarPatronSimilar(mensaje);
    
    if (patronSimilar && patronSimilar.respuestaExitosa && patronSimilar.frecuencia > 3) {
      // No sobrescribir a social/saludo si el mensaje tiene contenido
      if ((patronSimilar.intencionDetectada === 'social' || patronSimilar.intencionDetectada === 'saludo') && tieneContenido) {
        console.log(`🧠 Ignorando patrón saludo porque mensaje tiene contenido real`);
        return intencionOriginal;
      }
      
      // Si el patrón aprendido tiene alta frecuencia y fue exitoso, usarlo
      console.log(`🧠 Usando intención aprendida: ${patronSimilar.intencionDetectada} (frecuencia: ${patronSimilar.frecuencia})`);
      return patronSimilar.intencionDetectada;
    }
    
    return intencionOriginal;
  }

  /**
   * Analiza el contexto de la conversación para dar respuestas coherentes
   */
  async analizarContextoConversacion(sessionId: string): Promise<ContextoConversacion> {
    const result = await this.pool.query(`
      SELECT mensaje, es_usuario, created_at
      FROM mensajes_conversacion
      WHERE session_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [sessionId]);

    const mensajesUsuario = result.rows
      .filter(m => m.es_usuario)
      .map(m => m.mensaje);

    // Detectar temas discutidos
    const temasDiscutidos = new Set<string>();
    for (const msg of mensajesUsuario) {
      const palabras = this.extraerPalabrasClave(msg);
      for (const palabra of palabras) {
        if (this.esTemaPrincipal(palabra)) {
          temasDiscutidos.add(palabra);
        }
      }
    }

    // Calcular sentimiento general
    let puntajeSentimiento = 50;
    for (const msg of mensajesUsuario) {
      const feedback = this.detectarFeedback(msg);
      if (feedback?.tipo === 'positivo') puntajeSentimiento += 15;
      if (feedback?.tipo === 'negativo') puntajeSentimiento -= 20;
      if (feedback?.tipo === 'correccion') puntajeSentimiento -= 10;
    }

    let sentimiento: 'positivo' | 'negativo' | 'neutral' | 'frustrado' = 'neutral';
    if (puntajeSentimiento >= 70) sentimiento = 'positivo';
    else if (puntajeSentimiento <= 30) sentimiento = 'frustrado';
    else if (puntajeSentimiento <= 45) sentimiento = 'negativo';

    return {
      mensajesAnteriores: mensajesUsuario,
      temasDiscutidos: Array.from(temasDiscutidos),
      sentimientoGeneral: sentimiento,
      nivelSatisfaccion: Math.max(0, Math.min(100, puntajeSentimiento))
    };
  }

  /**
   * Verifica si una palabra es un tema principal
   */
  private esTemaPrincipal(palabra: string): boolean {
    const temasPrincipales = [
      'multa', 'accidente', 'licencia', 'seguro', 'semaforo',
      'impugnar', 'grua', 'corralon', 'alcoholimetro', 'verificacion',
      'estacionamiento', 'transito', 'infraccion', 'choque'
    ];
    return temasPrincipales.includes(palabra);
  }

  /**
   * Genera una respuesta empática basada en el contexto
   */
  generarIntroduccionEmpatica(contexto: ContextoConversacion, nombreUsuario: string): string {
    const nombre = nombreUsuario || 'amigo';

    if (contexto.sentimientoGeneral === 'frustrado') {
      return `Entiendo tu frustración, ${nombre}. Déjame darte una respuesta más clara. `;
    }
    
    if (contexto.sentimientoGeneral === 'negativo') {
      return `Permíteme explicarte mejor, ${nombre}. `;
    }
    
    if (contexto.temasDiscutidos.length > 1) {
      return `Siguiendo con nuestra conversación sobre ${contexto.temasDiscutidos[0]}, ${nombre}, `;
    }

    return '';
  }

  /**
   * Obtiene sugerencias basadas en patrones exitosos similares
   */
  async obtenerSugerenciasAprendidas(tema: string): Promise<string[]> {
    const result = await this.pool.query(`
      SELECT DISTINCT patron_original
      FROM patrones_aprendidos
      WHERE intencion_detectada = $1 
        AND respuesta_exitosa = true
        AND frecuencia > 2
      ORDER BY frecuencia DESC
      LIMIT 5
    `, [tema]);

    // Convertir patrones exitosos en sugerencias
    return result.rows.map(row => {
      // Convertir el patrón en una pregunta sugerida
      const patron = row.patron_original;
      if (patron.includes('?')) return patron;
      return `¿${patron.charAt(0).toUpperCase() + patron.slice(1)}?`;
    });
  }

  /**
   * Registra una interacción para aprendizaje futuro
   */
  async registrarInteraccion(
    sessionId: string,
    mensajeUsuario: string,
    respuestaSistema: string,
    intencionDetectada: string,
    feedback?: FeedbackUsuario
  ): Promise<void> {
    try {
      await this.pool.query(`
        INSERT INTO historial_interacciones
        (session_id, mensaje_usuario, respuesta_sistema, intencion_detectada, tipo_feedback)
        VALUES ($1, $2, $3, $4, $5)
      `, [sessionId, mensajeUsuario, respuestaSistema, intencionDetectada, feedback?.tipo || null]);
    } catch (error) {
      // Crear tabla si no existe
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS historial_interacciones (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          session_id UUID,
          mensaje_usuario TEXT,
          respuesta_sistema TEXT,
          intencion_detectada VARCHAR(100),
          tipo_feedback VARCHAR(20),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
    }
  }
}
