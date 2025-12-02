/**
 * SERVICIO DE RESPUESTAS INTELIGENTES - LexIA
 * 
 * Sistema completo que genera respuestas con:
 * 1. Información legal basada en artículos reales (RAG)
 * 2. Pasos a seguir según el tema
 * 3. Recomendación de Top 10 profesionistas (ranking)
 * 4. Recomendación de anunciantes/servicios (grúas, talleres)
 * 5. Invitación al foro de comunidad
 * 6. Posibilidad de match 1-a-1 con profesionistas
 */

import { Pool } from 'pg';
import axios from 'axios';
import { ForoInteligenteService, SugerenciaForo } from './ForoInteligenteService';
import { AdaptiveLearningService } from './AdaptiveLearningService';

// Interfaces
export interface ArticuloLegal {
  titulo: string;
  contenido: string;
  fuente: string;
  similitud: number;
  numeroArticulo?: string;
}

export interface Profesionista {
  id: string;
  nombre: string;
  especialidades: string[];
  rating: number;
  totalCalificaciones: number;
  experienciaAnios: number;
  ciudad: string;
  descripcion: string;
  verificado: boolean;
  fotoProfesional: string;
}

export interface Anunciante {
  id: string;
  nombreComercial: string;
  categoriaServicio: string;
  descripcion: string;
  direccion: string;
  telefono: string;
  rating: number;
  disponible24h: boolean;
  distanciaKm?: number;
}

export interface ConversationState {
  turno: number;
  temaActual: string;
  subtemasDiscutidos: string[];
  yaOfreceRecomendacion: boolean;
  yaOfreceForo: boolean;
  yaOfreceAnunciantes: boolean;
}

// Configuración por tema
const TEMA_CONFIG: { [key: string]: {
  pasosASeguir: string[];
  especialidadesAbogado: string[];
  serviciosAnunciante: string[];
  preguntasSugeridas: string[];
}} = {
  'semaforo': {
    pasosASeguir: [
      'Si te pusieron una multa, revisa que los datos de la boleta sean correctos',
      'Tienes 15 días para pagar con 50% de descuento',
      'Si hay fotomulta, recibirás la notificación por correo',
      'Si no estás de acuerdo, puedes impugnar en Juzgado Cívico',
      'Evita acumular puntos - con 12 puntos te suspenden la licencia'
    ],
    especialidadesAbogado: ['Infracciones de tránsito', 'Derecho administrativo'],
    serviciosAnunciante: [],
    preguntasSugeridas: [
      '¿Cómo impugno una fotomulta?',
      '¿Cuántos puntos me quitan?',
      '¿Dónde pago la multa?'
    ]
  },
  'accidente': {
    pasosASeguir: [
      'Asegura el área y enciende las luces de emergencia',
      'Llama al 911 si hay heridos o daños graves',
      'Toma fotos de los daños, placas y escena del accidente',
      'No muevas los vehículos hasta que llegue tránsito (si es grave)',
      'Intercambia datos con el otro conductor (nombre, teléfono, seguro)',
      'Reporta a tu aseguradora dentro de las primeras 24 horas',
      'Acude al Ministerio Público si hay lesionados'
    ],
    especialidadesAbogado: ['Accidentes de tránsito', 'Responsabilidad civil', 'Seguros'],
    serviciosAnunciante: ['Grua', 'Taller', 'Ajustador'],
    preguntasSugeridas: [
      '¿Cómo presento la denuncia?',
      '¿Mi seguro cubre estos daños?',
      '¿Cuánto tiempo tengo para demandar?'
    ]
  },
  'multa': {
    pasosASeguir: [
      'Revisa que los datos de la boleta sean correctos',
      'Tienes 15 días para pagar con 50% de descuento',
      'Puedes pagar en línea, banco o en Secretaría de Movilidad',
      'Si no estás de acuerdo, puedes impugnar en Juzgado Cívico',
      'Guarda el comprobante de pago'
    ],
    especialidadesAbogado: ['Infracciones de tránsito', 'Derecho administrativo'],
    serviciosAnunciante: [],
    preguntasSugeridas: [
      '¿Cómo impugno esta multa?',
      '¿Dónde pago la multa?',
      '¿Qué pasa si no pago a tiempo?'
    ]
  },
  'alcohol': {
    pasosASeguir: [
      'Coopera con las autoridades, no te resistas',
      'Tienes derecho a que el alcoholímetro esté calibrado',
      'Puedes solicitar una segunda prueba',
      'Si te arrestan, tienes derecho a una llamada',
      'Paga la multa para recuperar tu vehículo del corralón',
      'Considera tomar un curso de sensibilización'
    ],
    especialidadesAbogado: ['Defensa penal', 'Alcoholimetría', 'Infracciones de tránsito'],
    serviciosAnunciante: ['Grua'],
    preguntasSugeridas: [
      '¿Puedo recuperar mi licencia?',
      '¿Cuánto tiempo estará suspendida?',
      '¿Qué derechos tengo durante el operativo?'
    ]
  },
  'documentos': {
    pasosASeguir: [
      'Verifica qué documento te falta o está vencido',
      'Agenda cita en Secretaría de Movilidad',
      'Reúne los requisitos necesarios',
      'Paga los derechos correspondientes',
      'Recoge tu documento actualizado'
    ],
    especialidadesAbogado: ['Trámites vehiculares', 'Derecho administrativo'],
    serviciosAnunciante: [],
    preguntasSugeridas: [
      '¿Dónde renuevo mi licencia?',
      '¿Qué documentos necesito?',
      '¿Cuánto cuesta la renovación?'
    ]
  },
  'estacionamiento': {
    pasosASeguir: [
      'Si tu auto fue remolcado, llama a Tránsito Municipal',
      'Paga la multa en el banco o en línea',
      'Ve al corralón con INE, tarjeta de circulación y comprobante',
      'Paga grúa y pensión diaria',
      'Revisa tu vehículo antes de retirarlo'
    ],
    especialidadesAbogado: ['Infracciones de tránsito', 'Derecho administrativo'],
    serviciosAnunciante: ['Grua'],
    preguntasSugeridas: [
      '¿Cuánto cuesta el corralón por día?',
      '¿Puedo impugnar si la señalización era confusa?',
      '¿Qué documentos necesito para sacar mi auto?'
    ]
  },
  'atropello': {
    pasosASeguir: [
      'Llama al 911 inmediatamente',
      'No te muevas si tienes dolor en cuello o espalda',
      'Intenta obtener la placa del vehículo',
      'Busca testigos y pide sus datos',
      'Acude al Ministerio Público para levantar denuncia',
      'Busca atención médica aunque te sientas bien'
    ],
    especialidadesAbogado: ['Accidentes de tránsito', 'Responsabilidad civil', 'Daño moral'],
    serviciosAnunciante: [],
    preguntasSugeridas: [
      '¿Cómo denuncio al conductor que huyó?',
      '¿Puedo pedir indemnización?',
      '¿Qué pasa si no tengo testigos?'
    ]
  },
  'derechos': {
    pasosASeguir: [
      'Pide siempre la identificación del oficial',
      'Solicita la boleta de infracción oficial',
      'No pagues dinero en efectivo al oficial',
      'Puedes grabar la interacción (es legal en vía pública)',
      'Denuncia abusos al 089 o en la CEDH'
    ],
    especialidadesAbogado: ['Derechos humanos', 'Derecho administrativo'],
    serviciosAnunciante: [],
    preguntasSugeridas: [
      '¿Dónde denuncio abuso policial?',
      '¿Pueden quitarme las llaves del auto?',
      '¿Qué hago si me piden mordida?'
    ]
  },
  'impugnacion': {
    pasosASeguir: [
      'Reúne evidencia: fotos de la señalización, ubicación exacta, tu boleta',
      'Tienes 15 días hábiles desde la fecha de la multa para impugnar',
      'Acude al Juzgado Cívico Municipal con tu evidencia',
      'Presenta un escrito explicando por qué la multa es improcedente',
      'Si la señalización era confusa o inexistente, es tu mejor argumento',
      'Puedes solicitar que un perito revise la zona',
      'Espera la resolución (usualmente 15-30 días)'
    ],
    especialidadesAbogado: ['Impugnación de multas', 'Derecho administrativo', 'Infracciones de tránsito'],
    serviciosAnunciante: [],
    preguntasSugeridas: [
      '¿Qué evidencia necesito para impugnar?',
      '¿Cuánto tiempo tengo para impugnar?',
      '¿Necesito un abogado para impugnar?'
    ]
  },
  'general': {
    pasosASeguir: [
      'Identifica claramente cuál es tu situación',
      'Reúne toda la documentación relacionada',
      'Consulta con un profesional si tienes dudas'
    ],
    especialidadesAbogado: ['Tránsito', 'Derecho administrativo'],
    serviciosAnunciante: [],
    preguntasSugeridas: [
      '¿Cuáles son mis derechos como conductor?',
      '¿Qué documentos debo llevar siempre?',
      '¿Cómo funciona el sistema de puntos?'
    ]
  },
  // === NUEVAS CATEGORÍAS ===
  'social': {
    pasosASeguir: [],
    especialidadesAbogado: [],
    serviciosAnunciante: [],
    preguntasSugeridas: [
      '¿Qué hago si me ponen una multa?',
      '¿Cómo recupero mi auto del corralón?',
      '¿Cuáles son mis derechos ante tránsito?'
    ]
  },
  'off_topic': {
    pasosASeguir: [],
    especialidadesAbogado: [],
    serviciosAnunciante: [],
    preguntasSugeridas: [
      '¿Cómo impugno una multa?',
      '¿Qué hacer en un accidente?',
      '¿Qué documentos necesito para manejar?'
    ]
  },
  'consulta_general': {
    pasosASeguir: [
      'Describe tu situación con más detalle',
      'Indica si tienes algún documento relacionado',
      'Cuéntame qué resultado esperas obtener'
    ],
    especialidadesAbogado: ['Tránsito', 'Derecho administrativo'],
    serviciosAnunciante: [],
    preguntasSugeridas: [
      '¿Tienes una multa o infracción?',
      '¿Tuviste un accidente?',
      '¿Necesitas renovar documentos?'
    ]
  }
};

export class SmartResponseService {
  private pool: Pool;
  private ragUrl: string;
  private conversationStates: Map<string, ConversationState> = new Map();
  private foroService: ForoInteligenteService;
  private learningService: AdaptiveLearningService;

  constructor(pool: Pool, ragUrl: string = 'http://rag:3009') {
    this.pool = pool;
    this.ragUrl = ragUrl;
    this.foroService = new ForoInteligenteService(pool);
    this.learningService = new AdaptiveLearningService(pool);
  }

  /**
   * Detectar el tema de la consulta CON CONFIANZA
   * Retorna: { tema: string, confianza: number, esOffTopic: boolean, necesitaClarificacion: boolean }
   */
  detectarTemaConConfianza(mensaje: string): {
    tema: string;
    confianza: number;
    esOffTopic: boolean;
    necesitaClarificacion: boolean;
    razonOffTopic?: string;
  } {
    const msgLower = mensaje.toLowerCase();
    let confianza = 0;
    let matchCount = 0;
    
    // === PRIORIDAD 0: Detectar OFF-TOPIC ===
    const offTopicResult = this.detectarOffTopic(mensaje);
    if (offTopicResult.esOffTopic) {
      return {
        tema: 'off_topic',
        confianza: offTopicResult.confianza,
        esOffTopic: true,
        necesitaClarificacion: false,
        razonOffTopic: offTopicResult.razon
      };
    }
    
    // === PRIORIDAD 0.5: Detectar Saludos/Social ===
    const socialPatterns = ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'qué tal', 'como estas', 'gracias por', 'muchas gracias', 'adios', 'bye', 'hasta luego'];
    const esSoloSaludo = socialPatterns.some(p => msgLower.includes(p)) && msgLower.length < 25;
    const noTienePregunta = !msgLower.includes('que hago') && !msgLower.includes('qué hago') && !msgLower.includes('como') && !msgLower.includes('cómo');
    if (esSoloSaludo && noTienePregunta) {
      return {
        tema: 'social',
        confianza: 0.95,
        esOffTopic: false,
        necesitaClarificacion: false
      };
    }

    // === PRIORIDAD 1: Detectar impugnación/queja ===
    const impugnacionPatterns = [
      'injust', 'no es justo', 'claramente', 'obviamente', 'pero si', 'pero yo',
      'me multaron pero', 'me pusieron multa pero', 'no debia', 'no debía',
      'estaba permitido', 'se permite', 'si se puede', 'se puede estacionar',
      'ahi se puede', 'ahí se puede', 'donde si se puede', 'donde sí se puede',
      'no habia señal', 'no había señal', 'la señal', 'señalizacion', 'señalización',
      'confusa', 'impugnar', 'apelar', 'no estoy de acuerdo', 'quiero reclamar',
      'es un error', 'mal puesta', 'indebida', 'incorrecta', 'equivocada',
      'abuso', 'arbitraria', 'era amarilla', 'acera amarilla', 'amarillo permite',
      'amarilla permite', 'pero ahi', 'pero ahí', 'no entiendo por que',
      'no entiendo por qué', 'no me parece', 'esta mal', 'está mal'
    ];
    
    const mencionaMulta = ['multa', 'infraccion', 'infracción', 'boleta', 'multaron', 'multado', 'me pusieron'].some(p => msgLower.includes(p));
    const quejaEstacionamiento = ['acera', 'amarilla', 'amarillo', 'estacionar', 'estacionado', 'parking'].some(p => msgLower.includes(p));
    
    const esQueja = impugnacionPatterns.some(p => msgLower.includes(p));
    if (esQueja && (mencionaMulta || quejaEstacionamiento)) {
      matchCount = impugnacionPatterns.filter(p => msgLower.includes(p)).length;
      confianza = Math.min(0.95, 0.6 + (matchCount * 0.1));
      return { tema: 'impugnacion', confianza, esOffTopic: false, necesitaClarificacion: confianza < 0.6 };
    }
    
    if (['impugnar', 'apelar', 'recurso', 'anular multa', 'cancelar multa', 'tiempo para impugnar', 'tiempo tengo para impugnar', 'plazo para impugnar', 'dias para impugnar', 'días para impugnar'].some(p => msgLower.includes(p))) {
      return { tema: 'impugnacion', confianza: 0.9, esOffTopic: false, necesitaClarificacion: false };
    }
    
    // === PRIORIDAD 2: DERECHOS (reforzado) ===
    const derechosPatterns = [
      'derecho', 'derechos', 'abuso', 'abusaron', 'policia', 'policía', 'estatal',
      'mordida', 'corrupcion', 'corrupción', 'extorsion', 'extorsión', 'detuvieron',
      'detenido', 'retuvieron', 'golpearon', 'maltrato', 'quitaron', 'amenaza',
      'amenazaron', 'grabacion', 'grabación', 'grabar', 'video', 'testigo',
      'cedh', 'denuncia', 'queja', 'irregularidad', 'arbitrario', 'ilegal',
      // Patrones de "me para un oficial"
      'me para', 'me paran', 'me pare', 'para un oficial', 'oficial me', 'para el oficial',
      'transito me para', 'tránsito me para', 'transito me paro', 'tránsito me paró',
      'si me para', 'si me paran', 'cuando me para', 'cuando me paran',
      'me detiene', 'me detuvo', 'detiene un oficial', 'detuvo un oficial',
      'agente me', 'oficial de transito', 'oficial de tránsito', 'agente de transito'
    ];
    matchCount = derechosPatterns.filter(p => msgLower.includes(p)).length;
    if (matchCount >= 1) {
      confianza = Math.min(0.95, 0.5 + (matchCount * 0.15));
      if (confianza >= 0.5) {
        return { tema: 'derechos', confianza, esOffTopic: false, necesitaClarificacion: confianza < 0.6 };
      }
    }
    
    // === PRIORIDAD 3: Otros temas específicos ===
    const temaPatterns: { [key: string]: { patterns: string[], peso: number } } = {
      'semaforo': { patterns: ['semaforo', 'semáforo', 'brinco', 'brinque', 'brincar', 'luz roja', 'pase el rojo', 'pasé el rojo', 'alto'], peso: 0.15 },
      'accidente': { patterns: ['accidente', 'choque', 'chocaron', 'chocar', 'colision', 'colisión', 'golpe', 'impacto', 'volcadura', 'choqué'], peso: 0.15 },
      'atropello': { patterns: ['atropello', 'atropellado', 'atropellar', 'peaton', 'peatón', 'caminando', 'fuga', 'huyo', 'huyó', 'huir', 'escapó'], peso: 0.18 },
      'alcohol': { patterns: ['alcohol', 'borracho', 'ebrio', 'alcoholimetro', 'alcoholímetro', 'tomado', 'cerveza', 'copa', 'toxico', 'tóxico', 'operativo'], peso: 0.15 },
      'documentos': { 
        patterns: [
          'documento', 'documentos', 'licencia', 'renuevo', 'renovar', 'renovacion', 'renovación',
          'tarjeta de circulacion', 'tarjeta de circulación', 'circulacion', 'circulación',
          'seguro', 'sin seguro', 'verificacion', 'verificación', 'verificar',
          'papeles', 'placas', 'sin placas', 'placa', 'tramite', 'trámite',
          'vencida', 'vencido', 'expirada', 'expirado', 'sacar licencia', 'obtener licencia',
          'donde renuevo', 'dónde renuevo', 'como renuevo', 'cómo renuevo',
          'necesito para circular', 'necesito para manejar', 'requisitos'
        ], 
        peso: 0.18 
      },
      'estacionamiento': { patterns: ['corralon', 'corralón', 'grua', 'grúa', 'llevaron mi carro', 'remolcaron', 'doble fila', 'estacionamiento'], peso: 0.12 },
      'multa': { patterns: ['multa', 'infraccion', 'infracción', 'boleta', 'fotomulta', 'sancion', 'sanción', 'pagar multa'], peso: 0.12 }
    };
    
    let mejorTema = 'general';
    let mejorConfianza = 0;
    
    for (const [tema, config] of Object.entries(temaPatterns)) {
      matchCount = config.patterns.filter(p => msgLower.includes(p)).length;
      if (matchCount > 0) {
        confianza = Math.min(0.95, 0.4 + (matchCount * config.peso));
        if (confianza > mejorConfianza) {
          mejorConfianza = confianza;
          mejorTema = tema;
        }
      }
    }
    
    // Si la confianza es muy baja, pedir clarificación
    const necesitaClarificacion = mejorConfianza > 0 && mejorConfianza < 0.6;
    
    return {
      tema: mejorTema,
      confianza: mejorConfianza || 0.3,
      esOffTopic: false,
      necesitaClarificacion
    };
  }

  /**
   * Detectar si el mensaje está fuera del tema (Off-Topic)
   */
  private detectarOffTopic(mensaje: string): { esOffTopic: boolean; confianza: number; razon: string } {
    const msgLower = mensaje.toLowerCase();
    
    // Patrones de OFF-TOPIC
    const offTopicPatterns: { patterns: string[], razon: string }[] = [
      {
        patterns: ['clima', 'lluvia', 'sol', 'calor', 'frio', 'temperatura', 'nublado', 'pronostico'],
        razon: 'consulta sobre clima'
      },
      {
        patterns: ['receta', 'cocina', 'comida', 'ingrediente', 'preparar', 'hornear'],
        razon: 'consulta sobre cocina'
      },
      {
        patterns: ['futbol', 'fútbol', 'partido', 'equipo', 'gol', 'mundial', 'champions'],
        razon: 'consulta sobre deportes'
      },
      {
        patterns: ['pelicula', 'película', 'serie', 'netflix', 'actor', 'actriz', 'cine'],
        razon: 'consulta sobre entretenimiento'
      },
      {
        patterns: ['amor', 'novio', 'novia', 'cita', 'relacion', 'relación', 'pareja'],
        razon: 'consulta personal'
      },
      {
        patterns: ['programar', 'codigo', 'código', 'javascript', 'python', 'software'],
        razon: 'consulta sobre programación'
      },
      {
        patterns: ['medicina', 'doctor', 'enfermedad', 'sintomas', 'síntomas', 'pastilla', 'receta medica'],
        razon: 'consulta médica'
      },
      {
        patterns: ['dios', 'religion', 'religión', 'biblia', 'iglesia', 'fe'],
        razon: 'consulta religiosa'
      },
      {
        patterns: ['politica', 'política', 'presidente', 'elecciones', 'votar', 'partido politico'],
        razon: 'consulta política'
      }
    ];
    
    // Verificar si hay contexto de tránsito que invalide off-topic
    const contextoTransito = [
      'multa', 'transito', 'tránsito', 'carro', 'auto', 'vehiculo', 'vehículo',
      'conducir', 'manejar', 'licencia', 'policia', 'policía', 'accidente',
      'impugnar', 'apelar', 'plazo', 'dias', 'días', 'tiempo tengo', 'cuanto tiempo',
      'cuánto tiempo', 'pagar', 'infraccion', 'infracción', 'boleta', 'corralon',
      'corralón', 'grua', 'grúa', 'seguro', 'verificacion', 'verificación',
      'semaforo', 'semáforo', 'estacionar', 'alcohol', 'alcoholimetro'
    ].some(p => msgLower.includes(p));
    
    if (contextoTransito) {
      return { esOffTopic: false, confianza: 0, razon: '' };
    }
    
    for (const category of offTopicPatterns) {
      const matches = category.patterns.filter(p => msgLower.includes(p));
      if (matches.length >= 1) {
        return {
          esOffTopic: true,
          confianza: Math.min(0.95, 0.6 + (matches.length * 0.15)),
          razon: category.razon
        };
      }
    }
    
    return { esOffTopic: false, confianza: 0, razon: '' };
  }

  /**
   * Generar respuesta para mensajes Off-Topic
   */
  generarRespuestaOffTopic(razon: string, nombreUsuario: string): string {
    const respuestas = [
      `¡Hola ${nombreUsuario}! 😊 Mi especialidad es ayudarte con temas de **tránsito y leyes vehiculares** en Chiapas.\n\nPuedo ayudarte con:\n• Multas e infracciones\n• Accidentes de tránsito\n• Licencias y documentos\n• Derechos del conductor\n• Estacionamiento y grúas\n\n¿En qué tema de tránsito puedo ayudarte?`,
      `${nombreUsuario}, soy **LexIA**, tu asistente especializado en **derecho de tránsito de Chiapas** 🚗⚖️\n\nParece que tu pregunta es sobre ${razon}, pero mi conocimiento está enfocado en:\n• Infracciones y multas\n• Accidentes vehiculares\n• Trámites de tránsito\n• Derechos ante autoridades\n\n¿Tienes alguna duda sobre estos temas?`,
      `¡Hola! Aunque me encantaría ayudarte con eso, ${nombreUsuario}, mi expertise es en **leyes de tránsito** 🚦\n\nSi tienes alguna situación relacionada con:\n• Una multa o infracción\n• Un accidente\n• Documentos vehiculares\n• Tus derechos como conductor\n\n¡Estoy aquí para orientarte!`
    ];
    
    return respuestas[Math.floor(Math.random() * respuestas.length)];
  }

  /**
   * Generar pregunta de clarificación cuando la confianza es baja
   */
  generarPreguntaClarificacion(tema: string, nombreUsuario: string): string {
    const clarificaciones: { [key: string]: string } = {
      'multa': `${nombreUsuario}, quiero asegurarme de entenderte bien. ¿Tu consulta es sobre:\n\n1️⃣ **Pagar una multa** - dónde y cómo pagarla\n2️⃣ **Impugnar una multa** - crees que fue injusta\n3️⃣ **Entender la multa** - qué significa el código o monto\n\n¿Cuál describe mejor tu situación?`,
      'accidente': `${nombreUsuario}, para orientarte mejor sobre tu accidente, ¿podrías decirme:\n\n🚗 ¿El accidente ya ocurrió o quieres saber qué hacer si te pasa?\n🏥 ¿Hubo heridos?\n📋 ¿Ya tienes un reporte oficial?\n\nCon más detalles puedo darte pasos más específicos.`,
      'estacionamiento': `${nombreUsuario}, sobre tu situación de estacionamiento:\n\n🚛 ¿Se llevaron tu carro al corralón?\n🎫 ¿Te pusieron una multa por estacionar?\n❓ ¿Quieres saber dónde SÍ puedes estacionar?\n\n¿Qué describe mejor tu caso?`,
      'derechos': `${nombreUsuario}, para ayudarte con tus derechos, cuéntame más:\n\n👮 ¿Un oficial te detuvo o multó?\n💰 ¿Te pidieron dinero de forma irregular?\n📱 ¿Quieres saber si puedes grabar?\n\n¿Qué situación enfrentas?`,
      'general': `${nombreUsuario}, no estoy seguro de entender tu consulta. ¿Podrías darme más detalles sobre:\n\n• ¿Qué situación de tránsito enfrentas?\n• ¿Tienes algún documento o boleta relacionado?\n• ¿Cuál es tu preocupación principal?\n\nAsí podré orientarte mejor.`
    };
    
    return clarificaciones[tema] || clarificaciones['general'];
  }

  /**
   * Detectar el tema de la consulta (método legacy para compatibilidad)
   */
  detectarTema(mensaje: string): string {
    const resultado = this.detectarTemaConConfianza(mensaje);
    return resultado.tema;
  }

  /**
   * Obtener o crear estado de conversación
   */
  getConversationState(sessionId: string): ConversationState {
    if (!this.conversationStates.has(sessionId)) {
      this.conversationStates.set(sessionId, {
        turno: 0,
        temaActual: 'general',
        subtemasDiscutidos: [],
        yaOfreceRecomendacion: false,
        yaOfreceForo: false,
        yaOfreceAnunciantes: false
      });
    }
    return this.conversationStates.get(sessionId)!;
  }

  /**
   * Generar respuestas específicas para preguntas comunes de documentos
   * Estas respuestas son conocimiento común que no requiere RAG
   */
  generarRespuestaDocumentos(mensaje: string, nombreUsuario: string): string | null {
    const msgLower = mensaje.toLowerCase();
    
    // === PREGUNTA: ¿Dónde renuevo mi licencia? ===
    if (msgLower.includes('donde') && (msgLower.includes('renuevo') || msgLower.includes('renovar') || msgLower.includes('saco') || msgLower.includes('sacar')) && msgLower.includes('licencia')) {
      return `${nombreUsuario}, para renovar o sacar tu licencia en Chiapas:\n\n` +
        `📍 **Ubicaciones:**\n` +
        `• **Tuxtla Gutiérrez**: Secretaría de Movilidad (5a Norte Poniente #2414)\n` +
        `• **San Cristóbal**: Módulo de Licencias (Periférico Sur)\n` +
        `• **Tapachula**: Oficina de Tránsito Municipal\n` +
        `• **Comitán**: Módulo de la Secretaría de Movilidad\n\n` +
        `📋 **Requisitos:**\n` +
        `1. INE vigente (original y copia)\n` +
        `2. Comprobante de domicilio reciente\n` +
        `3. CURP\n` +
        `4. Examen médico (se realiza ahí mismo)\n` +
        `5. Pago de derechos\n\n` +
        `💡 **Tip**: Agenda cita en línea para evitar filas en www.semovi.chiapas.gob.mx\n\n` +
        `¿Necesitas saber los costos o algún otro detalle?`;
    }
    
    // === PREGUNTA: ¿Cuánto cuesta la renovación/licencia? ===
    if ((msgLower.includes('cuanto') || msgLower.includes('cuánto') || msgLower.includes('costo') || msgLower.includes('precio')) && 
        (msgLower.includes('licencia') || msgLower.includes('renovar') || msgLower.includes('renovacion') || msgLower.includes('renovación'))) {
      return `${nombreUsuario}, estos son los costos aproximados de licencias en Chiapas (2024-2025):\n\n` +
        `💳 **Licencia de Automovilista:**\n` +
        `• Permanente: $1,800 - $2,200 MXN\n` +
        `• 3 años: $800 - $1,000 MXN\n` +
        `• 1 año: $400 - $500 MXN\n\n` +
        `🏍️ **Licencia de Motociclista:**\n` +
        `• Permanente: $1,500 - $1,800 MXN\n` +
        `• 3 años: $600 - $800 MXN\n\n` +
        `📋 **Incluye:**\n` +
        `• Examen médico\n` +
        `• Examen teórico\n` +
        `• Trámite y expedición\n\n` +
        `⚠️ *Los precios pueden variar. Consulta en la Secretaría de Movilidad para tarifas actualizadas.*\n\n` +
        `¿Te gustaría saber dónde puedes hacer el trámite?`;
    }
    
    // === PREGUNTA: ¿Qué documentos necesito para circular? ===
    if ((msgLower.includes('documento') || msgLower.includes('papeles')) && 
        (msgLower.includes('circular') || msgLower.includes('manejar') || msgLower.includes('necesito') || msgLower.includes('llevar'))) {
      return `${nombreUsuario}, estos son los documentos obligatorios para circular en Chiapas:\n\n` +
        `📋 **Documentos del CONDUCTOR:**\n` +
        `1. ✅ Licencia de conducir vigente\n` +
        `2. ✅ INE o identificación oficial\n\n` +
        `📋 **Documentos del VEHÍCULO:**\n` +
        `3. ✅ Tarjeta de circulación vigente\n` +
        `4. ✅ Póliza de seguro vigente (OBLIGATORIO)\n` +
        `5. ✅ Verificación vehicular (holograma)\n` +
        `6. ✅ Tenencia pagada (comprobante)\n\n` +
        `⚠️ **Multas por no traerlos:**\n` +
        `• Sin licencia: 10-20 UMA ($1,000-$2,000 aprox)\n` +
        `• Sin tarjeta de circulación: 5-10 UMA\n` +
        `• Sin seguro: 20-40 UMA\n\n` +
        `💡 **Tip**: Lleva copias en tu guantera y fotos en tu celular.\n\n` +
        `¿Tienes algún documento vencido o faltante?`;
    }
    
    // === PREGUNTA: ¿Qué documentos necesito? (general) ===
    if (msgLower.includes('que documento') || msgLower.includes('qué documento') || msgLower.includes('qué papeles') || msgLower.includes('que papeles')) {
      return `${nombreUsuario}, depende del trámite que necesites. Aquí los más comunes:\n\n` +
        `🚗 **Para CIRCULAR:**\n` +
        `• Licencia vigente\n` +
        `• Tarjeta de circulación\n` +
        `• Seguro vehicular\n` +
        `• Verificación (holograma)\n\n` +
        `📝 **Para RENOVAR LICENCIA:**\n` +
        `• INE vigente\n` +
        `• Comprobante de domicilio\n` +
        `• CURP\n` +
        `• Licencia anterior (si aplica)\n\n` +
        `🚙 **Para EMPLACAR vehículo:**\n` +
        `• Factura original\n` +
        `• INE del propietario\n` +
        `• Comprobante de domicilio\n` +
        `• Pago de tenencia\n\n` +
        `¿Cuál trámite específico necesitas realizar?`;
    }
    
    // No hay respuesta predefinida - usar RAG
    return null;
  }

  /**
   * Generar respuestas específicas para preguntas comunes de impugnación
   */
  generarRespuestaImpugnacion(mensaje: string, nombreUsuario: string): string | null {
    const msgLower = mensaje.toLowerCase();
    
    // === PREGUNTA: ¿Cuánto tiempo tengo para impugnar? ===
    if ((msgLower.includes('tiempo') || msgLower.includes('plazo') || msgLower.includes('dias') || msgLower.includes('días')) && 
        (msgLower.includes('impugnar') || msgLower.includes('apelar') || msgLower.includes('reclamar'))) {
      return `${nombreUsuario}, sobre los **plazos para impugnar** una multa en Chiapas:\n\n` +
        `⏰ **Tiempos importantes:**\n` +
        `• **15 días hábiles** desde la fecha de la multa para presentar impugnación\n` +
        `• Si pagas con descuento (50%), pierdes derecho a impugnar\n` +
        `• La resolución tarda aproximadamente **15-30 días hábiles**\n\n` +
        `📍 **Dónde impugnar:**\n` +
        `• Juzgado Cívico Municipal de tu localidad\n` +
        `• Oficialía de Partes de la Secretaría de Movilidad\n\n` +
        `📋 **Documentos necesarios:**\n` +
        `1. Boleta de infracción original\n` +
        `2. Identificación oficial (INE)\n` +
        `3. Escrito de impugnación explicando por qué es injusta\n` +
        `4. Evidencia (fotos, videos, testigos)\n\n` +
        `💡 **Tip**: Toma fotos de la señalización del lugar donde te multaron.\n\n` +
        `¿Necesitas ayuda con el escrito de impugnación o tienes más dudas?`;
    }
    
    // === PREGUNTA: ¿Cómo impugno una multa? ===
    if ((msgLower.includes('como impugno') || msgLower.includes('cómo impugno') || 
         msgLower.includes('como apelo') || msgLower.includes('cómo apelo') ||
         msgLower.includes('como reclamo') || msgLower.includes('cómo reclamo') ||
         msgLower.includes('pasos para impugnar') || msgLower.includes('proceso para impugnar'))) {
      return `${nombreUsuario}, estos son los **pasos para impugnar** una multa en Chiapas:\n\n` +
        `📋 **Paso a paso:**\n\n` +
        `**1️⃣ Reúne tu evidencia** (dentro de las primeras 24-48 hrs)\n` +
        `   • Fotos del lugar y señalización\n` +
        `   • Video si lo tienes\n` +
        `   • Datos de testigos\n\n` +
        `**2️⃣ Prepara tu escrito de impugnación**\n` +
        `   • Explica claramente por qué la multa es injusta\n` +
        `   • Menciona el artículo que supuestamente violaste\n` +
        `   • Adjunta tu evidencia\n\n` +
        `**3️⃣ Presenta tu recurso**\n` +
        `   • Acude al Juzgado Cívico Municipal\n` +
        `   • Entrega original y copia de todo\n` +
        `   • Guarda tu acuse de recibo\n\n` +
        `**4️⃣ Espera la resolución** (15-30 días hábiles)\n` +
        `   • Te notificarán por escrito\n` +
        `   • Si ganas, se anula la multa\n` +
        `   • Si pierdes, puedes apelar en segunda instancia\n\n` +
        `⚠️ **Importante**: NO pagues la multa con descuento, perderías el derecho a impugnar.\n\n` +
        `¿Quieres que te conecte con un abogado especialista en impugnaciones?`;
    }
    
    // === PREGUNTA: ¿Qué evidencia necesito? ===
    if ((msgLower.includes('evidencia') || msgLower.includes('pruebas') || msgLower.includes('demostrar')) &&
        (msgLower.includes('impugnar') || msgLower.includes('multa') || msgLower.includes('injust'))) {
      return `${nombreUsuario}, para impugnar exitosamente necesitas **evidencia sólida**:\n\n` +
        `📸 **Evidencia fotográfica:**\n` +
        `• Fotos de la señalización (o falta de ella)\n` +
        `• Fotos del lugar exacto donde te multaron\n` +
        `• Captura de Google Maps mostrando la ubicación\n\n` +
        `🎥 **Evidencia en video:**\n` +
        `• Dashcam si la tienes\n` +
        `• Video del momento (si alguien grabó)\n` +
        `• Grabación de la interacción con el oficial\n\n` +
        `👥 **Testigos:**\n` +
        `• Nombre completo y teléfono\n` +
        `• Declaración escrita de lo que vieron\n\n` +
        `📄 **Documentos:**\n` +
        `• Boleta de infracción original\n` +
        `• Tu licencia e INE\n` +
        `• Tarjeta de circulación\n\n` +
        `💡 **Tips:**\n` +
        `• Las fotos deben tener fecha y hora (metadatos)\n` +
        `• Si la señalización era confusa o no existía, es tu mejor argumento\n` +
        `• Un perito puede verificar la zona si es necesario\n\n` +
        `¿Tienes alguna evidencia que quieras evaluar?`;
    }
    
    // No hay respuesta predefinida
    return null;
  }

  /**
   * Generar respuestas específicas para preguntas de multas
   */
  generarRespuestaMultas(mensaje: string, nombreUsuario: string): string | null {
    const msgLower = mensaje.toLowerCase();
    
    // === PREGUNTA: ¿Cómo pago una multa? ===
    if ((msgLower.includes('como pago') || msgLower.includes('cómo pago') || 
         msgLower.includes('donde pago') || msgLower.includes('dónde pago') ||
         msgLower.includes('pagar multa') || msgLower.includes('pagar la multa'))) {
      return `${nombreUsuario}, aquí las opciones para **pagar tu multa** en Chiapas:\n\n` +
        `💳 **Formas de pago:**\n\n` +
        `**1️⃣ En línea** (más rápido)\n` +
        `   • Portal: www.haciendachiapas.gob.mx\n` +
        `   • Necesitas: número de boleta y datos del vehículo\n` +
        `   • Acepta: tarjeta de débito/crédito\n\n` +
        `**2️⃣ En banco**\n` +
        `   • Bancos autorizados: Banorte, BBVA, Santander\n` +
        `   • Lleva tu boleta de infracción\n` +
        `   • Pago en ventanilla o cajero\n\n` +
        `**3️⃣ En oficinas de tránsito**\n` +
        `   • Secretaría de Movilidad\n` +
        `   • Tesorería Municipal\n` +
        `   • Horario: Lun-Vie 8:00-15:00\n\n` +
        `💰 **Descuentos:**\n` +
        `• **50% de descuento** si pagas en los primeros 15 días\n` +
        `• ⚠️ Si pagas con descuento, NO puedes impugnar después\n\n` +
        `¿Quieres que te ayude a verificar el monto de tu multa?`;
    }
    
    // === PREGUNTA: ¿Cuánto cuesta la multa? ===
    if ((msgLower.includes('cuanto cuesta') || msgLower.includes('cuánto cuesta') ||
         msgLower.includes('cuanto es') || msgLower.includes('cuánto es') ||
         msgLower.includes('monto') || msgLower.includes('valor de la multa')) &&
        msgLower.includes('multa')) {
      return `${nombreUsuario}, los montos de multas varían según la infracción:\n\n` +
        `💰 **Multas comunes en Chiapas (2024-2025):**\n\n` +
        `🚦 **Semáforo en rojo**: 10-20 UMA ($1,000-$2,000)\n` +
        `🅿️ **Estacionamiento prohibido**: 5-10 UMA ($500-$1,000)\n` +
        `📱 **Usar celular**: 5-10 UMA ($500-$1,000)\n` +
        `🚗 **Exceso de velocidad**: 10-20 UMA ($1,000-$2,000)\n` +
        `🍺 **Alcoholímetro positivo**: 20-40 UMA ($2,000-$4,000) + arresto\n` +
        `📄 **Sin licencia**: 10-20 UMA ($1,000-$2,000)\n` +
        `📋 **Sin tarjeta de circulación**: 5-10 UMA ($500-$1,000)\n` +
        `🛡️ **Sin seguro**: 20-40 UMA ($2,000-$4,000)\n\n` +
        `📍 *UMA 2024 = ~$103.74 MXN*\n\n` +
        `💡 **Recuerda**: 50% de descuento si pagas en 15 días\n\n` +
        `¿Qué tipo de multa te pusieron?`;
    }
    
    // No hay respuesta predefinida
    return null;
  }

  /**
   * Actualizar estado de conversación
   */
  updateConversationState(sessionId: string, updates: Partial<ConversationState>): void {
    const state = this.getConversationState(sessionId);
    this.conversationStates.set(sessionId, { ...state, ...updates });
  }

  /**
   * Obtener descripción amigable del tema
   */
  getTemaDescripcion(tema: string): string {
    const descripciones: Record<string, string> = {
      'semaforo': 'cruzar/brincarse semáforos en rojo',
      'accidente': 'accidentes de tránsito',
      'atropello': 'atropellos y fuga',
      'alcohol': 'conducir bajo efectos del alcohol',
      'multa': 'multas e infracciones',
      'documentos': 'documentación vehicular',
      'estacionamiento': 'estacionamiento y grúas',
      'derechos': 'derechos del conductor',
      'impugnacion': 'impugnación de multas injustas',
      'general': 'tránsito en Chiapas'
    };
    return descripciones[tema] || 'tránsito en Chiapas';
  }

  /**
   * Obtener Top 10 profesionistas por especialidad
   */
  async getTopProfesionistas(especialidades: string[], ciudad: string = 'Tuxtla Gutiérrez', limit: number = 10): Promise<Profesionista[]> {
    try {
      const query = `
        SELECT 
          u.id,
          u.nombre,
          a.especialidades,
          a.rating_promedio as rating,
          a.total_calificaciones,
          a.experiencia_anios,
          a.ciudad,
          a.descripcion,
          a.verificado,
          a.foto_profesional
        FROM abogados a
        JOIN usuarios u ON a.usuario_id = u.id
        WHERE a.verificado = true
          AND a.disponible = true
          AND u.activo = true
          AND (a.especialidades && $1::text[] OR $1 = '{}')
        ORDER BY 
          a.rating_promedio DESC,
          a.total_calificaciones DESC,
          a.experiencia_anios DESC
        LIMIT $2
      `;
      
      const result = await this.pool.query(query, [especialidades, limit]);
      
      return result.rows.map(row => ({
        id: row.id,
        nombre: row.nombre,
        especialidades: row.especialidades || [],
        rating: row.rating || 0,
        totalCalificaciones: row.total_calificaciones || 0,
        experienciaAnios: row.experiencia_anios || 0,
        ciudad: row.ciudad || ciudad,
        descripcion: row.descripcion || '',
        verificado: row.verificado,
        fotoProfesional: row.foto_profesional || ''
      }));
    } catch (error) {
      console.error('Error obteniendo profesionistas:', error);
      return [];
    }
  }

  /**
   * Obtener anunciantes por categoría de servicio
   */
  async getAnunciantes(categorias: string[], ciudad: string = 'Tuxtla Gutiérrez'): Promise<Anunciante[]> {
    try {
      const query = `
        SELECT 
          u.id,
          n.nombre_comercial,
          n.categoria_servicio,
          n.descripcion,
          n.direccion,
          n.telefono_comercial as telefono,
          n.rating_promedio as rating,
          n.disponible_24h
        FROM negocios n
        JOIN usuarios u ON n.usuario_id = u.id
        WHERE n.categoria_servicio = ANY($1)
          AND u.activo = true
        ORDER BY n.rating_promedio DESC
        LIMIT 5
      `;
      
      const result = await this.pool.query(query, [categorias]);
      
      return result.rows.map(row => ({
        id: row.id,
        nombreComercial: row.nombre_comercial,
        categoriaServicio: row.categoria_servicio,
        descripcion: row.descripcion || '',
        direccion: row.direccion || '',
        telefono: row.telefono || '',
        rating: row.rating || 0,
        disponible24h: row.disponible_24h || false
      }));
    } catch (error) {
      console.error('Error obteniendo anunciantes:', error);
      return [];
    }
  }

  /**
   * Generar respuesta completa e inteligente
   */
  async generarRespuestaCompleta(
    sessionId: string,
    usuarioId: string,
    mensaje: string,
    nombreUsuario: string,
    articulosLegales: ArticuloLegal[]
  ): Promise<{
    respuesta: string;
    tema: string;
    sugerencias: string[];
    profesionistas?: Profesionista[];
    anunciantes?: Anunciante[];
    ofrecerMatch: boolean;
    ofrecerForo: boolean;
    confianza?: number;
  }> {
    const state = this.getConversationState(sessionId);
    state.turno++;
    
    // === APRENDIZAJE: Detectar feedback del usuario ===
    const feedback = this.learningService.detectarFeedback(mensaje);
    if (feedback) {
      console.log(`🧠 Feedback detectado: ${feedback.tipo}`);
      
      // Si es una corrección, aprender de ella
      if (feedback.tipo === 'correccion' && feedback.correccionSugerida) {
        const nuevoTema = this.detectarTema(feedback.correccionSugerida);
        await this.learningService.aprenderDeError(
          mensaje,
          state.temaActual,
          feedback.correccionSugerida,
          nuevoTema
        );
        mensaje = feedback.correccionSugerida;
      }
    }

    // === DETECCIÓN CON CONFIANZA ===
    const deteccion = this.detectarTemaConConfianza(mensaje);
    console.log(`🎯 Detección: tema=${deteccion.tema}, confianza=${(deteccion.confianza * 100).toFixed(1)}%, offTopic=${deteccion.esOffTopic}`);
    
    // === CASO 1: OFF-TOPIC ===
    if (deteccion.esOffTopic) {
      const respuestaOffTopic = this.generarRespuestaOffTopic(deteccion.razonOffTopic || '', nombreUsuario);
      return {
        respuesta: respuestaOffTopic,
        tema: 'off_topic',
        sugerencias: TEMA_CONFIG['off_topic'].preguntasSugeridas,
        ofrecerMatch: false,
        ofrecerForo: false,
        confianza: deteccion.confianza
      };
    }
    
    // === CASO 2: SOCIAL (saludos) ===
    if (deteccion.tema === 'social') {
      const saludos = [
        `¡Hola ${nombreUsuario}! 👋 Soy **LexIA**, tu asistente legal de tránsito.\n\n¿En qué puedo ayudarte hoy?\n\n💡 Puedes preguntarme sobre:\n• Multas e infracciones\n• Accidentes de tránsito\n• Tus derechos como conductor\n• Documentos vehiculares`,
        `¡Bienvenido ${nombreUsuario}! 🚗 Estoy aquí para ayudarte con cualquier duda de tránsito en Chiapas.\n\n¿Tienes alguna situación específica?`,
        `¡Hola! 😊 ¿${nombreUsuario}, en qué tema de tránsito puedo orientarte?\n\n📋 Multas | 🚗 Accidentes | 📄 Documentos | ⚖️ Derechos`
      ];
      return {
        respuesta: saludos[Math.floor(Math.random() * saludos.length)],
        tema: 'social',
        sugerencias: TEMA_CONFIG['social'].preguntasSugeridas,
        ofrecerMatch: false,
        ofrecerForo: false,
        confianza: deteccion.confianza
      };
    }
    
    // === CASO 3: RESPUESTAS PREDEFINIDAS PARA DOCUMENTOS ===
    // Cuando el tema es documentos y tenemos preguntas comunes, dar respuestas específicas
    // IMPORTANTE: Esto va ANTES de pedir clarificación
    if (deteccion.tema === 'documentos') {
      const respuestaDocumentos = this.generarRespuestaDocumentos(mensaje, nombreUsuario);
      if (respuestaDocumentos) {
        return {
          respuesta: respuestaDocumentos,
          tema: 'documentos',
          sugerencias: TEMA_CONFIG['documentos'].preguntasSugeridas,
          ofrecerMatch: false,
          ofrecerForo: false,
          confianza: deteccion.confianza
        };
      }
    }

    // === CASO 3.5: RESPUESTAS PREDEFINIDAS PARA IMPUGNACIÓN ===
    if (deteccion.tema === 'impugnacion') {
      const respuestaImpugnacion = this.generarRespuestaImpugnacion(mensaje, nombreUsuario);
      if (respuestaImpugnacion) {
        return {
          respuesta: respuestaImpugnacion,
          tema: 'impugnacion',
          sugerencias: TEMA_CONFIG['impugnacion'].preguntasSugeridas,
          ofrecerMatch: true,
          ofrecerForo: false,
          confianza: deteccion.confianza
        };
      }
    }

    // === CASO 3.6: RESPUESTAS PREDEFINIDAS PARA MULTAS ===
    if (deteccion.tema === 'multa') {
      const respuestaMultas = this.generarRespuestaMultas(mensaje, nombreUsuario);
      if (respuestaMultas) {
        return {
          respuesta: respuestaMultas,
          tema: 'multa',
          sugerencias: TEMA_CONFIG['multa'].preguntasSugeridas,
          ofrecerMatch: false,
          ofrecerForo: false,
          confianza: deteccion.confianza
        };
      }
    }

    // === CASO 4: NECESITA CLARIFICACIÓN (baja confianza) ===
    if (deteccion.necesitaClarificacion && state.turno <= 2) {
      const preguntaClarificacion = this.generarPreguntaClarificacion(deteccion.tema, nombreUsuario);
      return {
        respuesta: preguntaClarificacion,
        tema: deteccion.tema,
        sugerencias: TEMA_CONFIG[deteccion.tema]?.preguntasSugeridas || TEMA_CONFIG['general'].preguntasSugeridas,
        ofrecerMatch: false,
        ofrecerForo: false,
        confianza: deteccion.confianza
      };
    }

    // === APRENDIZAJE: Buscar patrón aprendido similar ===
    const patronAprendido = this.learningService.buscarPatronSimilar(mensaje);
    if (patronAprendido && patronAprendido.respuestaExitosa && patronAprendido.frecuencia > 2) {
      console.log(`🧠 Usando patrón aprendido: "${patronAprendido.patronOriginal}" → ${patronAprendido.intencionDetectada}`);
    }
    
    // Usar tema detectado (puede ser mejorado por el aprendizaje)
    let tema = deteccion.tema;
    tema = this.learningService.mejorarDeteccionIntencion(mensaje, tema);
    
    const config = TEMA_CONFIG[tema] || TEMA_CONFIG['general'];
    
    // Actualizar tema actual
    if (tema !== 'general' && tema !== 'social' && tema !== 'off_topic') {
      state.temaActual = tema;
      if (!state.subtemasDiscutidos.includes(tema)) {
        state.subtemasDiscutidos.push(tema);
      }
    }
    
    let respuesta = '';
    let profesionistas: Profesionista[] = [];
    let anunciantes: Anunciante[] = [];
    let ofrecerMatch = false;
    let ofrecerForo = false;
    
    // === PARTE 1: INFORMACIÓN LEGAL ===
    if (articulosLegales.length > 0) {
      const artPrincipal = articulosLegales[0];
      
      // Extraer número de artículo si existe
      const matchArt = artPrincipal.contenido.match(/art[íi]culo\s*(\d+)/i);
      const numArticulo = matchArt ? matchArt[1] : '';
      
      respuesta += `${nombreUsuario}, según la legislación de tránsito de Chiapas:\n\n`;
      
      if (numArticulo) {
        respuesta += `📜 **Artículo ${numArticulo} - ${artPrincipal.fuente}**\n`;
      } else {
        respuesta += `📜 **${artPrincipal.titulo}**\n`;
      }
      
      // Contenido del artículo (limpio)
      const contenidoLimpio = artPrincipal.contenido
        .substring(0, 350)
        .replace(/\s+/g, ' ')
        .trim();
      respuesta += `_"${contenidoLimpio}${artPrincipal.contenido.length > 350 ? '...' : ''}"_\n\n`;
      
      // Artículos adicionales relacionados
      if (articulosLegales.length > 1) {
        respuesta += `📋 **Artículos relacionados:**\n`;
        articulosLegales.slice(1, 3).forEach(art => {
          respuesta += `• ${art.titulo}\n`;
        });
        respuesta += '\n';
      }
    } else {
      // Sin artículos del RAG - usar conocimiento interno basado en el tema
      respuesta += this.generarRespuestaConocimientoInterno(tema, nombreUsuario, mensaje);
    }
    
    // === PARTE 2: PASOS A SEGUIR ===
    respuesta += `📋 **Pasos a seguir:**\n`;
    config.pasosASeguir.forEach((paso, i) => {
      respuesta += `${i + 1}. ${paso}\n`;
    });
    respuesta += '\n';
    
    // === PARTE 3: RECOMENDACIÓN DE PROFESIONISTAS (después de turno 2) ===
    if (state.turno >= 2 && !state.yaOfreceRecomendacion && config.especialidadesAbogado.length > 0) {
      profesionistas = await this.getTopProfesionistas(config.especialidadesAbogado);
      
      if (profesionistas.length > 0) {
        respuesta += `\n---\n`;
        respuesta += `👨‍⚖️ **¿Necesitas asesoría profesional?**\n`;
        respuesta += `Tenemos ${profesionistas.length} profesionistas especializados en ${config.especialidadesAbogado[0]} disponibles:\n\n`;
        
        // Mostrar top 3 inicialmente
        profesionistas.slice(0, 3).forEach((prof, i) => {
          const estrellas = '⭐'.repeat(Math.round(prof.rating));
          respuesta += `**${i + 1}. ${prof.nombre}** ${estrellas} (${prof.rating}/5)\n`;
          respuesta += `   🎓 ${prof.experienciaAnios} años exp. | 📍 ${prof.ciudad}\n`;
          if (prof.verificado) respuesta += `   ✅ Verificado\n`;
          respuesta += '\n';
        });
        
        respuesta += `_Ver perfil para más detalles y hacer **match** para contacto directo._\n`;
        
        state.yaOfreceRecomendacion = true;
        ofrecerMatch = true;
      }
    }
    
    // === PARTE 4: RECOMENDACIÓN DE ANUNCIANTES (si aplica) ===
    if (config.serviciosAnunciante.length > 0 && !state.yaOfreceAnunciantes) {
      anunciantes = await this.getAnunciantes(config.serviciosAnunciante);
      
      if (anunciantes.length > 0) {
        respuesta += `\n---\n`;
        
        if (config.serviciosAnunciante.includes('Grua')) {
          respuesta += `🚛 **¿Necesitas servicio de grúa?**\n`;
        } else {
          respuesta += `🔧 **Servicios que te pueden ayudar:**\n`;
        }
        
        anunciantes.slice(0, 2).forEach(neg => {
          respuesta += `• **${neg.nombreComercial}** (${neg.categoriaServicio})`;
          if (neg.disponible24h) respuesta += ` - 🕐 24 hrs`;
          respuesta += `\n`;
          if (neg.telefono) respuesta += `  📞 ${neg.telefono}\n`;
        });
        
        state.yaOfreceAnunciantes = true;
      }
    }
    
    // === PARTE 5: FORO INTELIGENTE (basado en clustering, no en turno) ===
    // Solo ofrece foro si hay usuarios/publicaciones con problemas SIMILARES
    if (!state.yaOfreceForo && tema !== 'general') {
      try {
        const sugerenciaForo = await this.foroService.generarSugerenciaForo(
          usuarioId,
          tema,
          mensaje
        );
        
        if (sugerenciaForo.debeOfrecer) {
          respuesta += `\n---\n`;
          respuesta += sugerenciaForo.mensajeSugerencia;
          
          state.yaOfreceForo = true;
          ofrecerForo = true;
          
          console.log(`📊 Foro sugerido: ${sugerenciaForo.razon}`);
          console.log(`   Publicaciones encontradas: ${sugerenciaForo.publicacionesRelevantes.length}`);
          console.log(`   Usuarios similares: ${sugerenciaForo.usuariosSimilares.length}`);
        }
      } catch (foroError) {
        console.log('⚠️ Error consultando foro inteligente:', foroError);
      }
    }
    
    // === PARTE 6: CIERRE ===
    respuesta += `\n¿En qué más puedo ayudarte, ${nombreUsuario}?`;
    
    // Guardar estado actualizado
    this.updateConversationState(sessionId, state);
    
    // === APRENDIZAJE: Registrar interacción para aprendizaje futuro ===
    // Si el usuario mostró feedback positivo, aprende de esta interacción
    if (feedback?.tipo === 'positivo') {
      await this.learningService.aprenderDeExito(mensaje, tema, respuesta);
      console.log(`✅ Aprendido patrón exitoso: "${mensaje}" → ${tema}`);
    }
    
    // Registrar interacción para análisis
    await this.learningService.registrarInteraccion(
      sessionId,
      mensaje,
      respuesta.substring(0, 500),  // Solo primeros 500 chars
      tema,
      feedback || undefined
    );
    
    return {
      respuesta,
      tema,
      sugerencias: config.preguntasSugeridas,
      profesionistas: profesionistas.length > 0 ? profesionistas : undefined,
      anunciantes: anunciantes.length > 0 ? anunciantes : undefined,
      ofrecerMatch,
      ofrecerForo
    };
  }

  /**
   * Generar respuesta usando conocimiento interno cuando no hay artículos del RAG
   */
  generarRespuestaConocimientoInterno(tema: string, nombreUsuario: string, mensaje: string): string {
    // Conocimiento interno específico por tema
    const conocimiento: { [key: string]: string } = {
      'semaforo': `${nombreUsuario}, cruzarte/brincarte un **semáforo en rojo** es una infracción grave:

🚨 **Consecuencias:**
• **Multa:** 10-20 días de salario mínimo (~$2,500 - $5,000 MXN)
• **Puntos:** 6 puntos en tu licencia
• **Fotomulta:** Si hay cámara, recibirás la notificación por correo

⚠️ **Si causas un accidente:**
• Responsabilidad civil total por los daños
• Cargos penales si hay lesionados (homicidio culposo)
• Tu seguro puede rechazar la cobertura

📍 Las intersecciones con semáforo tienen alta vigilancia.

`,
      'accidente': `${nombreUsuario}, te explico qué hacer en caso de **accidente de tránsito**:

🚗 **Pasos inmediatos:**
1. Enciende las luces de emergencia
2. Si hay heridos, llama al 911 inmediatamente
3. No muevas los vehículos si el daño es grave
4. Toma fotos de todo (daños, placas, escena)
5. Intercambia datos con el otro conductor

`,
      'alcohol': `${nombreUsuario}, sobre **manejar bajo efectos del alcohol**:

🚨 **Consecuencias:**
• **Multa:** 20-100 días de salario mínimo
• **Arresto:** 20-36 horas
• **Vehículo:** Al corralón
• **Licencia:** Suspensión de 1-3 años

📊 El límite legal es **0.4 g/L en sangre**.

`,
      'multa': `${nombreUsuario}, respecto a tu **multa de tránsito**:

💰 **Opciones de pago:**
• **Descuento 50%** si pagas en los primeros 15 días
• Pago en línea, banco o Secretaría de Movilidad

⚖️ **Si quieres impugnar:**
• Tienes 15 días hábiles para presentar recurso
• Acude al Juzgado Cívico con tu boleta

`,
      'documentos': `${nombreUsuario}, sobre **documentos obligatorios** para circular:

📋 **Debes llevar siempre:**
• Licencia de conducir vigente
• Tarjeta de circulación
• Comprobante de verificación (donde aplique)
• Póliza de seguro vigente

`,
      'estacionamiento': `${nombreUsuario}, sobre **estacionamiento prohibido**:

🚫 **Multas por tipo:**
• Banqueta/acera: 10-15 días de salario
• Doble fila: 10-20 días
• Lugar discapacitados: 20-30 días

🚛 **Si te llevaron la grúa:**
• Llama a Tránsito Municipal
• Paga multa + grúa ($500-1,500) + corralón ($100-300/día)

`,
      'derechos': `${nombreUsuario}, sobre tus **derechos como conductor**:

✅ **Tienes derecho a:**
• Pedir identificación del oficial
• Recibir boleta oficial (no pagos en efectivo)
• Grabar la interacción
• Impugnar cualquier multa

❌ **El oficial NO puede:**
• Quitarte las llaves del vehículo
• Pedirte dinero directamente
• Retenerte sin motivo

`,
      'impugnacion': `${nombreUsuario}, entiendo tu frustración. **Si la multa fue injusta o la señalización era confusa, puedes impugnarla**:

⚖️ **¿Cuándo puedes impugnar?**
• Señalización confusa, borrosa o inexistente
• La zona estaba claramente permitida para estacionar
• Error en los datos de la boleta (placa, fecha, ubicación)
• El oficial no siguió el procedimiento correcto

📸 **Evidencia que necesitas:**
• Fotos de la señalización (o falta de ella)
• Fotos del lugar donde estacionaste
• Tu boleta de infracción
• Testigos si los tienes
• Cualquier documento que pruebe que estaba permitido

⏰ **Tienes 15 días hábiles** desde la fecha de la multa para presentar tu recurso de inconformidad.

🏛️ **Dónde acudir:**
• Juzgado Cívico Municipal de tu localidad
• Oficinas de la Secretaría de Movilidad

💡 **Tip importante:** Si la línea amarilla estaba borrosa o no había señal clara de prohibido, tienes muy buen caso para ganar.

`,
      'general': `${nombreUsuario}, te puedo ayudar con información sobre **tránsito en Chiapas**.

`
    };

    return conocimiento[tema] || conocimiento['general'];
  }

  /**
   * Generar mensaje de saludo inicial
   */
  generarSaludo(nombreUsuario: string): string {
    // Saludo más natural y conversacional
    const saludos = [
      `¡Hola ${nombreUsuario}! 🚗`,
      `¡Qué tal ${nombreUsuario}! 👋`,
      `¡Bienvenido ${nombreUsuario}! 🙌`
    ];
    const saludo = saludos[Math.floor(Math.random() * saludos.length)];
    
    return `${saludo}

Soy **LexIA**, tu asistente para temas de tránsito en Chiapas. Puedo ayudarte con:

🚦 **Multas e infracciones** - qué hacer, cómo pagar o impugnar
🚗 **Accidentes** - pasos a seguir, documentación, seguro
📋 **Documentos** - licencia, verificación, tarjeta de circulación
⚖️ **Tus derechos** - qué puede y no puede hacer un oficial

Cuéntame, ¿qué situación tienes?`;
  }

  /**
   * Formatear lista de Top 10 profesionistas
   */
  formatearTop10Profesionistas(profesionistas: Profesionista[]): string {
    let respuesta = `👨‍⚖️ **Top 10 Profesionistas - Chiapas**\n\n`;
    
    profesionistas.forEach((prof, i) => {
      const estrellas = '⭐'.repeat(Math.round(prof.rating));
      respuesta += `**${i + 1}. ${prof.nombre}** ${estrellas}\n`;
      respuesta += `   📊 ${prof.rating}/5 (${prof.totalCalificaciones} valoraciones)\n`;
      respuesta += `   🎓 ${prof.experienciaAnios} años de experiencia\n`;
      respuesta += `   📍 ${prof.ciudad}\n`;
      respuesta += `   💼 ${prof.especialidades.join(', ')}\n`;
      if (prof.verificado) respuesta += `   ✅ Verificado\n`;
      respuesta += `   [Ver perfil] [Hacer match]\n\n`;
    });
    
    respuesta += `_Selecciona "Ver perfil" para más detalles o "Hacer match" para iniciar contacto privado._`;
    
    return respuesta;
  }
}
