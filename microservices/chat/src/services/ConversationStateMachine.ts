/**
 * ConversationStateMachine.ts - Agente Interrogador
 * 
 * Implementa una máquina de estados finitos para cada tipo de situación legal.
 * En lugar de responder inmediatamente, interroga al usuario para obtener
 * el contexto necesario antes de consultar el RAG.
 * 
 * Flujo: Detectar tema -> Interrogar -> Recopilar contexto -> Consultar RAG -> Responder
 * 
 * MEJORAS v2:
 * - Usa OllamaIntentInterpreter para entender respuestas ambiguas
 * - Reformula preguntas cuando el usuario no entiende
 * - Detecta cuando el usuario quiere saltar el interrogatorio
 */

import { ollamaIntentInterpreter } from './OllamaIntentInterpreter';

// ============================================================================
// TIPOS Y INTERFACES
// ============================================================================

export interface ConversationContext {
  // Datos del incidente
  hayHeridos?: boolean;
  hayMuertos?: boolean;
  tieneSeguro?: boolean;
  seguroVigente?: boolean;
  culpable?: 'usuario' | 'otro' | 'ambos' | 'desconocido';
  otroCondutorPresente?: boolean;
  otroCondutorHuyo?: boolean;
  
  // Datos del vehículo
  tipoVehiculo?: 'auto' | 'moto' | 'camion' | 'bicicleta' | 'peaton';
  vehiculoPropio?: boolean;
  dañosVehiculo?: 'ninguno' | 'leves' | 'moderados' | 'graves' | 'perdida_total';
  
  // Datos de la infracción
  tipoInfraccion?: string;
  multaRecibida?: boolean;
  montoMulta?: number;
  vehiculoRemolcado?: boolean;
  licenciaRetenida?: boolean;
  
  // Datos de alcoholemia
  consumioAlcohol?: boolean;
  nivelAlcohol?: 'poco' | 'moderado' | 'mucho';
  pruebaAlcoholemia?: boolean;
  resultadoAlcoholemia?: number;
  
  // Datos de la autoridad
  oficialesPresentes?: boolean;
  pidieronMordida?: boolean;
  abusoPolicaco?: boolean;
  tieneEvidencia?: boolean;
  
  // Datos de daños a terceros
  dañosPropiedad?: boolean;
  tipoPropiedadDañada?: string;
  propietarioPresente?: boolean;
  
  // Datos generales
  ubicacion?: string;
  horaIncidente?: string;
  tiempoTranscurrido?: string;
  
  // Metadatos del flujo
  preguntasRealizadas: string[];
  respuestasObtenidas: Record<string, any>;
}

export interface StateQuestion {
  id: string;
  pregunta: string;
  opciones?: string[];
  tipo: 'si_no' | 'opciones' | 'texto' | 'numero';
  extractorRespuesta: (respuesta: string) => any;
  siguienteEstado: (respuesta: any, contexto: ConversationContext) => string;
  prioridad: number; // Menor = más importante
}

export interface ConversationState {
  nombre: string;
  esTerminal: boolean;
  preguntas: StateQuestion[];
  onEnter?: (contexto: ConversationContext) => string | null; // Puede saltar estados
}

export interface StateMachineConfig {
  estadoInicial: string;
  estados: Record<string, ConversationState>;
}

export interface InterrogationResult {
  necesitaMasInfo: boolean;
  siguientePregunta?: string;
  opcionesSugeridas?: string[];
  contextoCompleto?: ConversationContext;
  estadoActual: string;
  puedeConsultarRAG: boolean;
  resumenContexto?: string;
  // Nuevos campos para manejo de respuestas ambiguas
  noEntendioRespuesta?: boolean;
  preguntaReformulada?: string;
  intentoActual?: number;
  maxIntentos?: number;
}

// ============================================================================
// EXTRACTORES DE RESPUESTAS
// ============================================================================

const extractores = {
  siNo: (respuesta: string): boolean | null => {
    const resp = respuesta.toLowerCase().trim();
    
    // Patrones afirmativos (más flexibles)
    const afirmativas = [
      'si', 'sí', 'sep', 'seep', 'simon', 'simón', 'aja', 'ajá', 
      'claro', 'obvio', 'afirmativo', 'correcto', 'así es', 'efectivamente', 
      'ya sabes', 'tons si', 'pues si', 'tengo', 'si tengo', 'sí tengo',
      'me la hicieron', 'me hicieron', 'me lo', 'me la', 'me pidio', 'me pidió',
      'positivo', 'salí positivo', 'se lo llevaron', 'se llevaron', 'me quitaron',
      'la quitaron', 'lo quitaron'
    ];
    
    // Patrones negativos (más flexibles)
    const negativas = [
      'no', 'nel', 'nop', 'nope', 'para nada', 'negativo', 'ni madres', 
      'nel pastel', 'ni de pedo', 'tons no', 'pues no', 'nah', 'nanai',
      'no tengo', 'no me', 'no hay', 'nadie', 'ninguno', 'ninguna',
      'solo advertencia', 'solo fue advertencia', 'advertencia',
      'no me dieron', 'no me la', 'no me lo', 'aun no', 'aún no', 'todavia no',
      'la conservo', 'lo tengo', 'aun lo tengo', 'aún lo tengo'
    ];
    
    // Buscar coincidencias
    const esAfirmativa = afirmativas.some(a => 
      resp === a || 
      resp.startsWith(a + ' ') || 
      resp.startsWith(a + ',') ||
      resp.startsWith(a + '.') ||
      resp.includes(' ' + a + ' ') ||
      resp.includes(' ' + a + ',') ||
      resp.endsWith(' ' + a)
    );
    
    const esNegativa = negativas.some(n => 
      resp === n || 
      resp.startsWith(n + ' ') || 
      resp.startsWith(n + ',') ||
      resp.startsWith(n + '.') ||
      resp.includes(' ' + n + ' ') ||
      resp.includes(' ' + n + ',') ||
      resp.endsWith(' ' + n)
    );
    
    // Casos especiales donde el contexto indica sí/no
    if (resp.includes('pidio dinero') || resp.includes('pidió dinero') || resp.includes('mordida')) {
      return true; // Sí pidieron mordida
    }
    
    if (resp.includes('solo advertencia') || resp.includes('solo fue advertencia')) {
      return false; // No pidieron mordida
    }
    
    if (esAfirmativa && !esNegativa) return true;
    if (esNegativa && !esAfirmativa) return false;
    
    // Si hay ambigüedad, intentar por contexto
    // "No, solo fue advertencia" debe ser FALSE
    if (resp.includes('advertencia')) return false;
    
    // Por defecto, si no podemos determinar, retornar null para indicar incertidumbre
    // pero si la respuesta es larga (>15 chars) probablemente tiene contexto útil
    if (resp.length > 15) {
      // Buscar más contexto
      if (resp.includes('dieron') || resp.includes('hicieron') || resp.includes('pidieron') || resp.includes('quitaron')) {
        // Verificar si hay negación cerca
        if (resp.includes('no ') || resp.includes('no,')) return false;
        return true;
      }
    }
    
    return null;
  },
  
  nivelAlcohol: (respuesta: string): string => {
    const resp = respuesta.toLowerCase();
    if (resp.includes('poco') || resp.includes('una') || resp.includes('chela') || resp.includes('cerveza')) return 'poco';
    if (resp.includes('bien') || resp.includes('pedo') || resp.includes('borracho') || resp.includes('mucho') || resp.includes('bastante')) return 'mucho';
    return 'moderado';
  },
  
  tipoVehiculo: (respuesta: string): string => {
    const resp = respuesta.toLowerCase();
    if (resp.includes('moto') || resp.includes('motocicleta')) return 'moto';
    if (resp.includes('camion') || resp.includes('trailer') || resp.includes('troca')) return 'camion';
    if (resp.includes('bici') || resp.includes('bicicleta')) return 'bicicleta';
    if (resp.includes('pie') || resp.includes('caminando') || resp.includes('peaton')) return 'peaton';
    return 'auto';
  },
  
  culpable: (respuesta: string): string => {
    const resp = respuesta.toLowerCase();
    if (resp.includes('yo') || resp.includes('mi culpa') || resp.includes('la cague') || resp.includes('la regué')) return 'usuario';
    if (resp.includes('el') || resp.includes('otro') || resp.includes('pendejo') || resp.includes('wey')) return 'otro';
    if (resp.includes('ambos') || resp.includes('los dos')) return 'ambos';
    return 'desconocido';
  },
  
  dañosVehiculo: (respuesta: string): string => {
    const resp = respuesta.toLowerCase();
    if (resp.includes('nada') || resp.includes('bien') || resp.includes('sin')) return 'ninguno';
    if (resp.includes('poco') || resp.includes('leve') || resp.includes('rayón') || resp.includes('golpecito')) return 'leves';
    if (resp.includes('regular') || resp.includes('moderado') || resp.includes('abollado')) return 'moderados';
    if (resp.includes('mucho') || resp.includes('grave') || resp.includes('madreado') || resp.includes('destrozado')) return 'graves';
    if (resp.includes('total') || resp.includes('perdida') || resp.includes('no sirve')) return 'perdida_total';
    return 'moderados';
  },
  
  texto: (respuesta: string): string => respuesta.trim(),
  
  numero: (respuesta: string): number | null => {
    const match = respuesta.match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : null;
  }
};

// ============================================================================
// CONFIGURACIÓN DE MÁQUINAS DE ESTADO POR TEMA
// ============================================================================

const MAQUINAS_ESTADO: Record<string, StateMachineConfig> = {
  
  // ========================================
  // ACCIDENTE DE TRÁNSITO
  // ========================================
  accidente: {
    estadoInicial: 'verificar_heridos',
    estados: {
      verificar_heridos: {
        nombre: 'Verificar heridos',
        esTerminal: false,
        preguntas: [{
          id: 'hay_heridos',
          pregunta: '¿Hay heridos o alguna persona lesionada?',
          tipo: 'si_no',
          opciones: ['Sí, hay heridos', 'No, nadie herido'],
          extractorRespuesta: extractores.siNo,
          siguienteEstado: (resp, ctx) => resp ? 'emergencia_medica' : 'verificar_otro_conductor',
          prioridad: 1
        }]
      },
      
      emergencia_medica: {
        nombre: 'Emergencia médica',
        esTerminal: true,
        preguntas: [],
        onEnter: (ctx) => {
          ctx.hayHeridos = true;
          return 'EMERGENCIA'; // Estado especial
        }
      },
      
      verificar_otro_conductor: {
        nombre: 'Verificar otro conductor',
        esTerminal: false,
        preguntas: [{
          id: 'otro_conductor_presente',
          pregunta: '¿El otro conductor sigue ahí o se fue?',
          tipo: 'opciones',
          opciones: ['Sigue aquí', 'Se fue/huyó', 'No hay otro (choqué solo)'],
          extractorRespuesta: (resp) => {
            const r = resp.toLowerCase();
            if (r.includes('fue') || r.includes('huyo') || r.includes('pelo') || r.includes('escapo')) return 'huyo';
            if (r.includes('solo') || r.includes('yo')) return 'solo';
            return 'presente';
          },
          siguienteEstado: (resp, ctx) => {
            if (resp === 'huyo') {
              ctx.otroCondutorHuyo = true;
              return 'verificar_seguro';
            }
            if (resp === 'solo') {
              ctx.otroCondutorPresente = false;
              return 'verificar_daños';
            }
            ctx.otroCondutorPresente = true;
            return 'verificar_culpa';
          },
          prioridad: 2
        }]
      },
      
      verificar_culpa: {
        nombre: 'Verificar responsabilidad',
        esTerminal: false,
        preguntas: [{
          id: 'culpable',
          pregunta: '¿De quién fue la culpa del accidente?',
          tipo: 'opciones',
          opciones: ['Fue mi culpa', 'Fue culpa del otro', 'De los dos', 'No sé'],
          extractorRespuesta: extractores.culpable,
          siguienteEstado: (resp, ctx) => {
            ctx.culpable = resp;
            return 'verificar_seguro';
          },
          prioridad: 3
        }]
      },
      
      verificar_seguro: {
        nombre: 'Verificar seguro',
        esTerminal: false,
        preguntas: [{
          id: 'tiene_seguro',
          pregunta: '¿Tienes seguro de auto vigente?',
          tipo: 'si_no',
          opciones: ['Sí tengo', 'No tengo seguro'],
          extractorRespuesta: extractores.siNo,
          siguienteEstado: (resp, ctx) => {
            ctx.tieneSeguro = resp;
            ctx.seguroVigente = resp;
            return 'verificar_daños';
          },
          prioridad: 4
        }]
      },
      
      verificar_daños: {
        nombre: 'Verificar daños',
        esTerminal: false,
        preguntas: [{
          id: 'nivel_daños',
          pregunta: '¿Qué tan dañado quedó tu vehículo?',
          tipo: 'opciones',
          opciones: ['Sin daños', 'Daños leves (rayones)', 'Daños moderados', 'Daños graves', 'Pérdida total'],
          extractorRespuesta: extractores.dañosVehiculo,
          siguienteEstado: (resp, ctx) => {
            ctx.dañosVehiculo = resp;
            return 'listo_para_rag';
          },
          prioridad: 5
        }]
      },
      
      listo_para_rag: {
        nombre: 'Información completa',
        esTerminal: true,
        preguntas: []
      }
    }
  },
  
  // ========================================
  // ESTADO DE EBRIEDAD / DUI
  // ========================================
  alcoholemia: {
    estadoInicial: 'verificar_detencion',
    estados: {
      verificar_detencion: {
        nombre: 'Verificar detención',
        esTerminal: false,
        preguntas: [{
          id: 'ya_detenido',
          pregunta: '¿Ya te detuvieron o solo quieres saber qué hacer?',
          tipo: 'opciones',
          opciones: ['Ya me detuvieron', 'Aún no, quiero prevenir', 'Me están deteniendo ahora'],
          extractorRespuesta: (resp) => {
            const r = resp.toLowerCase();
            if (r.includes('ahora') || r.includes('ahorita') || r.includes('estan')) return 'ahora';
            if (r.includes('ya') || r.includes('detuvieron') || r.includes('agarraron')) return 'ya';
            return 'prevenir';
          },
          siguienteEstado: (resp, ctx) => {
            if (resp === 'prevenir') return 'info_prevencion';
            return 'verificar_prueba';
          },
          prioridad: 1
        }]
      },
      
      verificar_prueba: {
        nombre: 'Verificar prueba de alcoholemia',
        esTerminal: false,
        preguntas: [{
          id: 'hicieron_prueba',
          pregunta: '¿Te hicieron la prueba de alcoholemia (soplar)?',
          tipo: 'si_no',
          opciones: ['Sí me la hicieron', 'No, aún no'],
          extractorRespuesta: extractores.siNo,
          siguienteEstado: (resp, ctx) => {
            ctx.pruebaAlcoholemia = resp;
            return resp ? 'verificar_resultado' : 'verificar_nivel_consumo';
          },
          prioridad: 2
        }]
      },
      
      verificar_resultado: {
        nombre: 'Verificar resultado',
        esTerminal: false,
        preguntas: [{
          id: 'resultado_positivo',
          pregunta: '¿Saliste positivo en la prueba?',
          tipo: 'si_no',
          opciones: ['Sí, positivo', 'No, negativo'],
          extractorRespuesta: extractores.siNo,
          siguienteEstado: (resp, ctx) => {
            ctx.consumioAlcohol = resp;
            return resp ? 'verificar_vehiculo_retenido' : 'listo_para_rag';
          },
          prioridad: 3
        }]
      },
      
      verificar_nivel_consumo: {
        nombre: 'Verificar nivel de consumo',
        esTerminal: false,
        preguntas: [{
          id: 'cuanto_tomaste',
          pregunta: '¿Qué tanto tomaste? (para calcular posibles consecuencias)',
          tipo: 'opciones',
          opciones: ['Poco (1-2 cervezas)', 'Moderado (3-5 cervezas)', 'Bastante (más de 5)'],
          extractorRespuesta: extractores.nivelAlcohol,
          siguienteEstado: (resp, ctx) => {
            ctx.nivelAlcohol = resp;
            ctx.consumioAlcohol = true;
            return 'verificar_vehiculo_retenido';
          },
          prioridad: 3
        }]
      },
      
      verificar_vehiculo_retenido: {
        nombre: 'Verificar vehículo',
        esTerminal: false,
        preguntas: [{
          id: 'vehiculo_retenido',
          pregunta: '¿Te quitaron el vehículo / lo mandaron al corralón?',
          tipo: 'si_no',
          opciones: ['Sí, se lo llevaron', 'No, aún lo tengo'],
          extractorRespuesta: extractores.siNo,
          siguienteEstado: (resp, ctx) => {
            ctx.vehiculoRemolcado = resp;
            return 'verificar_licencia';
          },
          prioridad: 4
        }]
      },
      
      verificar_licencia: {
        nombre: 'Verificar licencia',
        esTerminal: false,
        preguntas: [{
          id: 'licencia_retenida',
          pregunta: '¿Te quitaron la licencia de conducir?',
          tipo: 'si_no',
          opciones: ['Sí me la quitaron', 'No, la conservo'],
          extractorRespuesta: extractores.siNo,
          siguienteEstado: (resp, ctx) => {
            ctx.licenciaRetenida = resp;
            return 'listo_para_rag';
          },
          prioridad: 5
        }]
      },
      
      info_prevencion: {
        nombre: 'Información preventiva',
        esTerminal: true,
        preguntas: []
      },
      
      listo_para_rag: {
        nombre: 'Información completa',
        esTerminal: true,
        preguntas: []
      }
    }
  },
  
  // ========================================
  // INFRACCIÓN / MULTA
  // ========================================
  multa: {
    estadoInicial: 'verificar_tipo_infraccion',
    estados: {
      verificar_tipo_infraccion: {
        nombre: 'Verificar tipo de infracción',
        esTerminal: false,
        preguntas: [{
          id: 'tipo_infraccion',
          pregunta: '¿Por qué te multaron o qué infracción cometiste?',
          tipo: 'opciones',
          opciones: ['Exceso de velocidad', 'Pasé el alto/semáforo', 'Estacionamiento prohibido', 'Sin cinturón', 'Usar celular', 'Otra'],
          extractorRespuesta: (resp) => {
            const r = resp.toLowerCase();
            // Velocidad - incluyendo variaciones coloquiales
            if (r.includes('velocidad') || r.includes('rapido') || r.includes('rápido') || 
                r.includes('exceso') || r.includes('corriendo') || r.includes('volando') ||
                r.includes('acelere') || r.includes('aceleré') || r.includes('iba recio')) return 'velocidad';
            
            // Semáforo/alto - variaciones comunes
            if (r.includes('alto') || r.includes('semaforo') || r.includes('semáforo') || 
                r.includes('rojo') || r.includes('me pase el') || r.includes('me pasé el') ||
                r.includes('no pare') || r.includes('no paré') || r.includes('señalamiento') ||
                r.includes('vuelta prohibida') || r.includes('di vuelta') || r.includes('dí vuelta')) return 'semaforo';
            
            // Estacionamiento - muchas formas de decirlo
            if (r.includes('estacion') || r.includes('banqueta') || r.includes('aparque') || 
                r.includes('aparqué') || r.includes('deje el carro') || r.includes('dejé el carro') ||
                r.includes('me estacione') || r.includes('me estacioné') || r.includes('parque') ||
                r.includes('parquear') || r.includes('parado') || r.includes('detenido') ||
                r.includes('lugar prohibido') || r.includes('zona prohibida') ||
                r.includes('mal estacionado') || r.includes('doble fila') ||
                r.includes('rampa') || r.includes('discapacitado') || r.includes('cochera')) return 'estacionamiento';
            
            // Cinturón
            if (r.includes('cinturon') || r.includes('cinturón') || r.includes('sin cintu')) return 'cinturon';
            
            // Celular
            if (r.includes('celular') || r.includes('telefono') || r.includes('teléfono') ||
                r.includes('cel') || r.includes('mensaje') || r.includes('manejando') && r.includes('texto')) return 'celular';
            
            // Documentos
            if (r.includes('licencia') || r.includes('tarjeta') || r.includes('circulacion') ||
                r.includes('circulación') || r.includes('documento') || r.includes('verificacion') ||
                r.includes('verificación') || r.includes('seguro') || r.includes('placas') ||
                r.includes('sin placa')) return 'documentos';
            
            // Por defecto 'otra' pero nunca null - siempre capturamos algo
            return 'otra';
          },
          siguienteEstado: (resp, ctx) => {
            ctx.tipoInfraccion = resp;
            return 'verificar_boleta';
          },
          prioridad: 1
        }]
      },
      
      verificar_boleta: {
        nombre: 'Verificar boleta',
        esTerminal: false,
        preguntas: [{
          id: 'recibio_boleta',
          pregunta: '¿Te dieron boleta de infracción oficial?',
          tipo: 'si_no',
          opciones: ['Sí, tengo la boleta', 'No me dieron nada'],
          extractorRespuesta: extractores.siNo,
          siguienteEstado: (resp, ctx) => {
            ctx.multaRecibida = resp;
            return resp ? 'verificar_monto' : 'verificar_mordida';
          },
          prioridad: 2
        }]
      },
      
      verificar_mordida: {
        nombre: 'Verificar solicitud de mordida',
        esTerminal: false,
        preguntas: [{
          id: 'pidieron_mordida',
          pregunta: '¿El oficial te pidió dinero directamente (mordida)?',
          tipo: 'si_no',
          opciones: ['Sí, me pidió dinero', 'No, solo fue advertencia'],
          extractorRespuesta: extractores.siNo,
          siguienteEstado: (resp, ctx) => {
            ctx.pidieronMordida = resp;
            return resp ? 'listo_para_rag_corrupcion' : 'listo_para_rag';
          },
          prioridad: 3
        }]
      },
      
      verificar_monto: {
        nombre: 'Verificar monto',
        esTerminal: false,
        preguntas: [{
          id: 'monto_multa',
          pregunta: '¿Cuánto dice la multa que debes pagar? (aproximado en pesos)',
          tipo: 'texto',
          extractorRespuesta: extractores.numero,
          siguienteEstado: (resp, ctx) => {
            ctx.montoMulta = resp;
            return 'verificar_vehiculo_remolcado';
          },
          prioridad: 3
        }]
      },
      
      verificar_vehiculo_remolcado: {
        nombre: 'Verificar remolque',
        esTerminal: false,
        preguntas: [{
          id: 'vehiculo_remolcado',
          pregunta: '¿Se llevaron tu vehículo a la grúa/corralón?',
          tipo: 'si_no',
          opciones: ['Sí, se lo llevaron', 'No, aún lo tengo'],
          extractorRespuesta: extractores.siNo,
          siguienteEstado: (resp, ctx) => {
            ctx.vehiculoRemolcado = resp;
            return 'listo_para_rag';
          },
          prioridad: 4
        }]
      },
      
      listo_para_rag_corrupcion: {
        nombre: 'Caso de corrupción',
        esTerminal: true,
        preguntas: []
      },
      
      listo_para_rag: {
        nombre: 'Información completa',
        esTerminal: true,
        preguntas: []
      }
    }
  },
  
  // ========================================
  // CORRUPCIÓN / MORDIDA
  // ========================================
  corrupcion: {
    estadoInicial: 'verificar_situacion',
    estados: {
      verificar_situacion: {
        nombre: 'Verificar situación',
        esTerminal: false,
        preguntas: [{
          id: 'que_paso',
          pregunta: '¿El oficial ya te pidió dinero o sospechas que lo hará?',
          tipo: 'opciones',
          opciones: ['Ya me lo pidió', 'Creo que me lo va a pedir', 'Me amenazó'],
          extractorRespuesta: (resp) => {
            const r = resp.toLowerCase();
            if (r.includes('amenazo') || r.includes('amenaza')) return 'amenaza';
            if (r.includes('ya') || r.includes('pidio')) return 'ya_pidio';
            return 'sospecha';
          },
          siguienteEstado: (resp, ctx) => {
            ctx.pidieronMordida = resp !== 'sospecha';
            return 'verificar_evidencia';
          },
          prioridad: 1
        }]
      },
      
      verificar_evidencia: {
        nombre: 'Verificar evidencia',
        esTerminal: false,
        preguntas: [{
          id: 'tiene_evidencia',
          pregunta: '¿Tienes alguna evidencia? (video, audio, testigos)',
          tipo: 'si_no',
          opciones: ['Sí tengo evidencia', 'No tengo nada'],
          extractorRespuesta: extractores.siNo,
          siguienteEstado: (resp, ctx) => {
            ctx.tieneEvidencia = resp;
            return 'listo_para_rag';
          },
          prioridad: 2
        }]
      },
      
      listo_para_rag: {
        nombre: 'Información completa',
        esTerminal: true,
        preguntas: []
      }
    }
  },
  
  // ========================================
  // DAÑO A PROPIEDAD
  // ========================================
  daño_propiedad: {
    estadoInicial: 'verificar_tipo_propiedad',
    estados: {
      verificar_tipo_propiedad: {
        nombre: 'Verificar tipo de propiedad',
        esTerminal: false,
        preguntas: [{
          id: 'tipo_propiedad',
          pregunta: '¿Qué fue lo que dañaste?',
          tipo: 'opciones',
          opciones: ['Poste/señal de tránsito', 'Casa/negocio', 'Otro vehículo estacionado', 'Barda/cerca', 'Otro'],
          extractorRespuesta: (resp) => {
            const r = resp.toLowerCase();
            if (r.includes('poste') || r.includes('señal') || r.includes('semaforo')) return 'infraestructura';
            if (r.includes('casa') || r.includes('negocio') || r.includes('tienda')) return 'inmueble';
            if (r.includes('vehiculo') || r.includes('carro') || r.includes('auto')) return 'vehiculo';
            if (r.includes('barda') || r.includes('cerca') || r.includes('reja')) return 'barda';
            return 'otro';
          },
          siguienteEstado: (resp, ctx) => {
            ctx.tipoPropiedadDañada = resp;
            return resp === 'infraestructura' ? 'verificar_seguro' : 'verificar_propietario';
          },
          prioridad: 1
        }]
      },
      
      verificar_propietario: {
        nombre: 'Verificar propietario',
        esTerminal: false,
        preguntas: [{
          id: 'propietario_presente',
          pregunta: '¿Encontraste al dueño de la propiedad?',
          tipo: 'si_no',
          opciones: ['Sí lo encontré', 'No, no había nadie'],
          extractorRespuesta: extractores.siNo,
          siguienteEstado: (resp, ctx) => {
            ctx.propietarioPresente = resp;
            return 'verificar_seguro';
          },
          prioridad: 2
        }]
      },
      
      verificar_seguro: {
        nombre: 'Verificar seguro',
        esTerminal: false,
        preguntas: [{
          id: 'tiene_seguro',
          pregunta: '¿Tienes seguro que cubra daños a terceros?',
          tipo: 'si_no',
          opciones: ['Sí tengo', 'No tengo'],
          extractorRespuesta: extractores.siNo,
          siguienteEstado: (resp, ctx) => {
            ctx.tieneSeguro = resp;
            return 'listo_para_rag';
          },
          prioridad: 3
        }]
      },
      
      listo_para_rag: {
        nombre: 'Información completa',
        esTerminal: true,
        preguntas: []
      }
    }
  },
  
  // ========================================
  // FUGA DEL LUGAR (HIT AND RUN VÍCTIMA)
  // ========================================
  fuga_autoridad: {
    estadoInicial: 'verificar_rol',
    estados: {
      verificar_rol: {
        nombre: 'Verificar rol',
        esTerminal: false,
        preguntas: [{
          id: 'es_victima',
          pregunta: '¿Tú eres la víctima (te chocaron y huyeron) o tú huiste?',
          tipo: 'opciones',
          opciones: ['Me chocaron y huyeron', 'Yo me fui del lugar'],
          extractorRespuesta: (resp) => {
            const r = resp.toLowerCase();
            if (r.includes('yo') || r.includes('me fui') || r.includes('hui')) return 'culpable';
            return 'victima';
          },
          siguienteEstado: (resp, ctx) => {
            return resp === 'victima' ? 'verificar_datos_huidor' : 'verificar_razon_huida';
          },
          prioridad: 1
        }]
      },
      
      verificar_datos_huidor: {
        nombre: 'Verificar datos del que huyó',
        esTerminal: false,
        preguntas: [{
          id: 'tiene_datos',
          pregunta: '¿Alcanzaste a ver las placas o tienes algún dato del que huyó?',
          tipo: 'si_no',
          opciones: ['Sí tengo datos/placas', 'No vi nada'],
          extractorRespuesta: extractores.siNo,
          siguienteEstado: (resp, ctx) => {
            ctx.tieneEvidencia = resp;
            return 'listo_para_rag_victima';
          },
          prioridad: 2
        }]
      },
      
      verificar_razon_huida: {
        nombre: 'Verificar razón de huida',
        esTerminal: false,
        preguntas: [{
          id: 'razon_huida',
          pregunta: '¿Por qué te fuiste del lugar?',
          tipo: 'opciones',
          opciones: ['Tuve miedo', 'No me di cuenta del daño', 'No había nadie', 'Estaba tomado'],
          extractorRespuesta: (resp) => {
            const r = resp.toLowerCase();
            if (r.includes('miedo') || r.includes('asust')) return 'miedo';
            if (r.includes('cuenta') || r.includes('percate')) return 'no_vio';
            if (r.includes('nadie')) return 'sin_testigos';
            if (r.includes('tomado') || r.includes('pedo') || r.includes('borracho')) return 'alcoholizado';
            return 'otro';
          },
          siguienteEstado: (resp, ctx) => {
            if (resp === 'alcoholizado') {
              ctx.consumioAlcohol = true;
            }
            return 'verificar_tiempo';
          },
          prioridad: 2
        }]
      },
      
      verificar_tiempo: {
        nombre: 'Verificar tiempo transcurrido',
        esTerminal: false,
        preguntas: [{
          id: 'tiempo',
          pregunta: '¿Hace cuánto tiempo pasó esto?',
          tipo: 'opciones',
          opciones: ['Hace menos de 1 hora', 'Hace algunas horas', 'Ayer', 'Hace días'],
          extractorRespuesta: (resp) => {
            const r = resp.toLowerCase();
            if (r.includes('menos') || r.includes('ahorita') || r.includes('acaba')) return 'reciente';
            if (r.includes('hora')) return 'horas';
            if (r.includes('ayer')) return 'ayer';
            return 'dias';
          },
          siguienteEstado: (resp, ctx) => {
            ctx.tiempoTranscurrido = resp;
            return 'listo_para_rag_culpable';
          },
          prioridad: 3
        }]
      },
      
      listo_para_rag_victima: {
        nombre: 'Información completa (víctima)',
        esTerminal: true,
        preguntas: []
      },
      
      listo_para_rag_culpable: {
        nombre: 'Información completa (huidor)',
        esTerminal: true,
        preguntas: []
      }
    }
  }
};

// ============================================================================
// CLASE PRINCIPAL: CONVERSATION STATE MACHINE
// ============================================================================

export class ConversationStateMachine {
  private sesiones: Map<string, {
    tema: string;
    estadoActual: string;
    contexto: ConversationContext;
    historialPreguntas: string[];
    esperandoRespuesta: boolean;
    esPrimerMensaje: boolean;
    // Nuevos campos para manejo de reintentos
    intentosActuales: number;
    maxIntentos: number;
    ultimaPregunta: string | null;
    ultimasOpciones: string[] | null;
    ultimoTipoPregunta: string | null;
  }> = new Map();
  
  /**
   * Iniciar o continuar una conversación interrogativa
   */
  async procesarMensaje(
    sessionId: string,
    mensaje: string,
    temaDetectado: string
  ): Promise<InterrogationResult> {
    
    // Verificar si el usuario quiere saltar el interrogatorio
    if (ollamaIntentInterpreter.detectarSaltarInterrogatorio(mensaje)) {
      return this.forzarRAG(sessionId);
    }
    
    // Verificar si hay una sesión activa
    let sesion = this.sesiones.get(sessionId);
    
    // IMPORTANTE: Si estamos esperando una respuesta del usuario, 
    // NO reiniciar la sesión aunque el tema parezca diferente
    // (el usuario está respondiendo a nuestra pregunta, no iniciando un nuevo tema)
    const estaEnMedioDeInterrogacion = sesion && 
                                       sesion.esperandoRespuesta && 
                                       !this.esEstadoTerminal(sesion.tema, sesion.estadoActual);
    
    // Solo iniciar nueva sesión si:
    // 1. No hay sesión existente, O
    // 2. El tema es nuevo Y no estamos en medio de una interrogación
    if (!sesion || (!estaEnMedioDeInterrogacion && temaDetectado !== 'general' && sesion.tema !== temaDetectado)) {
      sesion = this.iniciarSesion(sessionId, temaDetectado);
    }
    
    // Si no hay máquina de estados para este tema, ir directo a RAG
    if (!MAQUINAS_ESTADO[sesion.tema]) {
      return {
        necesitaMasInfo: false,
        estadoActual: 'sin_maquina',
        puedeConsultarRAG: true,
        contextoCompleto: sesion.contexto,
        resumenContexto: this.generarResumenContexto(sesion.contexto, sesion.tema)
      };
    }
    
    const maquina = MAQUINAS_ESTADO[sesion.tema];
    const estadoActual = maquina.estados[sesion.estadoActual];
    
    // Si es estado terminal, listo para RAG
    if (estadoActual.esTerminal) {
      return {
        necesitaMasInfo: false,
        estadoActual: sesion.estadoActual,
        puedeConsultarRAG: true,
        contextoCompleto: sesion.contexto,
        resumenContexto: this.generarResumenContexto(sesion.contexto, sesion.tema)
      };
    }
    
    // Procesar respuesta del usuario
    const preguntaActual = estadoActual.preguntas[0];
    
    // Si es el primer mensaje (trigger del tema), NO procesarlo como respuesta
    // Solo hacer la primera pregunta
    if (sesion.esPrimerMensaje && preguntaActual) {
      sesion.esPrimerMensaje = false;
      sesion.esperandoRespuesta = true;
      sesion.ultimaPregunta = preguntaActual.pregunta;
      sesion.ultimasOpciones = preguntaActual.opciones || null;
      sesion.ultimoTipoPregunta = preguntaActual.tipo;
      this.sesiones.set(sessionId, sesion);
      
      return {
        necesitaMasInfo: true,
        siguientePregunta: preguntaActual.pregunta,
        opcionesSugeridas: preguntaActual.opciones,
        estadoActual: sesion.estadoActual,
        puedeConsultarRAG: false,
        intentoActual: 1,
        maxIntentos: sesion.maxIntentos
      };
    }
    
    // Si estamos esperando respuesta y hay una pregunta activa
    if (sesion.esperandoRespuesta && preguntaActual && mensaje.length > 0) {
      
      // ================================================================
      // FILOSOFÍA: El usuario NO sabe términos legales.
      // Usamos SIEMPRE el extractor original que entiende lenguaje natural.
      // Solo reformulamos si el extractor devuelve algo completamente inválido.
      // ================================================================
      
      const respuestaExtractorOriginal = preguntaActual.extractorRespuesta(mensaje);
      console.log(`🔧 Extractor original procesó: "${mensaje}" → ${respuestaExtractorOriginal}`);
      
      // Para tipo si_no, verificar si el extractor devolvió algo útil
      let esRespuestaValida = true;
      
      if (preguntaActual.tipo === 'si_no') {
        // Para sí/no, solo es inválido si devolvió null
        esRespuestaValida = respuestaExtractorOriginal !== null;
      } else if (preguntaActual.tipo === 'opciones') {
        // Para opciones, aceptar cualquier respuesta que no sea completamente vacía
        // Los extractores ya están diseñados para interpretar lenguaje natural
        esRespuestaValida = respuestaExtractorOriginal !== null && 
                           respuestaExtractorOriginal !== undefined;
      }
      
      // Si el extractor NO pudo procesar (respuesta completamente irrelevante)
      if (!esRespuestaValida) {
        // Verificar si es una pregunta del usuario (no una respuesta)
        const msgLower = mensaje.toLowerCase().trim();
        const esPreguntaDelUsuario = (msgLower.includes('?') && msgLower.length < 30) ||
                                     msgLower.startsWith('que es') ||
                                     msgLower.startsWith('qué es') ||
                                     msgLower === 'como' ||
                                     msgLower === 'a poco';
        
        if (esPreguntaDelUsuario) {
          // El usuario preguntó algo, reformular nuestra pregunta
          sesion.intentosActuales++;
          
          if (sesion.intentosActuales >= sesion.maxIntentos) {
            // Avanzar con valor por defecto
            const valorPorDefecto = preguntaActual.tipo === 'si_no' ? null : 'no_especificado';
            sesion.contexto.respuestasObtenidas[preguntaActual.id] = valorPorDefecto;
            sesion.contexto.preguntasRealizadas.push(preguntaActual.id);
            
            const siguienteEstado = preguntaActual.siguienteEstado(valorPorDefecto, sesion.contexto);
            sesion.estadoActual = siguienteEstado;
            sesion.intentosActuales = 0;
            
            const nuevoEstado = maquina.estados[siguienteEstado];
            if (nuevoEstado.esTerminal) {
              sesion.esperandoRespuesta = false;
              this.sesiones.set(sessionId, sesion);
              return {
                necesitaMasInfo: false,
                estadoActual: siguienteEstado,
                puedeConsultarRAG: true,
                contextoCompleto: sesion.contexto,
                resumenContexto: this.generarResumenContexto(sesion.contexto, sesion.tema)
              };
            }
            
            const siguientePregunta = nuevoEstado.preguntas[0];
            sesion.ultimaPregunta = siguientePregunta.pregunta;
            sesion.ultimasOpciones = siguientePregunta.opciones || null;
            sesion.ultimoTipoPregunta = siguientePregunta.tipo;
            this.sesiones.set(sessionId, sesion);
            
            return {
              necesitaMasInfo: true,
              siguientePregunta: siguientePregunta.pregunta,
              opcionesSugeridas: siguientePregunta.opciones,
              estadoActual: siguienteEstado,
              puedeConsultarRAG: false,
              intentoActual: 1,
              maxIntentos: sesion.maxIntentos
            };
          }
          
          // Reformular la pregunta de forma más simple
          const preguntaReformulada = await ollamaIntentInterpreter.reformularPregunta(
            sesion.ultimaPregunta || preguntaActual.pregunta,
            mensaje,
            sesion.ultimasOpciones || preguntaActual.opciones || null
          );
          
          sesion.ultimaPregunta = preguntaReformulada;
          this.sesiones.set(sessionId, sesion);
          
          return {
            necesitaMasInfo: true,
            siguientePregunta: preguntaReformulada,
            opcionesSugeridas: sesion.ultimasOpciones || preguntaActual.opciones,
            estadoActual: sesion.estadoActual,
            puedeConsultarRAG: false,
            noEntendioRespuesta: true,
            preguntaReformulada: preguntaReformulada,
            intentoActual: sesion.intentosActuales,
            maxIntentos: sesion.maxIntentos
          };
        }
      }
      
      // ================================================================
      // RESPUESTA VÁLIDA - El extractor entendió algo útil
      // ================================================================
      console.log(`✅ Respuesta procesada: ${respuestaExtractorOriginal}`);
      
      const respuestaProcesada = respuestaExtractorOriginal;
      
      // Guardar respuesta en contexto
      sesion.contexto.respuestasObtenidas[preguntaActual.id] = respuestaProcesada;
      sesion.contexto.preguntasRealizadas.push(preguntaActual.id);
      sesion.intentosActuales = 0; // Reset intentos
      
      // Determinar siguiente estado
      const siguienteEstado = preguntaActual.siguienteEstado(respuestaProcesada, sesion.contexto);
      
      // Caso especial: EMERGENCIA
      if (siguienteEstado === 'EMERGENCIA') {
        sesion.esperandoRespuesta = false;
        this.sesiones.set(sessionId, sesion);
        return {
          necesitaMasInfo: false,
          estadoActual: 'emergencia',
          puedeConsultarRAG: true,
          contextoCompleto: sesion.contexto,
          resumenContexto: '🚨 EMERGENCIA: Hay heridos en el accidente'
        };
      }
      
      sesion.estadoActual = siguienteEstado;
      
      // Verificar si el nuevo estado es terminal
      const nuevoEstado = maquina.estados[siguienteEstado];
      if (nuevoEstado.esTerminal) {
        sesion.esperandoRespuesta = false;
        this.sesiones.set(sessionId, sesion);
        return {
          necesitaMasInfo: false,
          estadoActual: siguienteEstado,
          puedeConsultarRAG: true,
          contextoCompleto: sesion.contexto,
          resumenContexto: this.generarResumenContexto(sesion.contexto, sesion.tema)
        };
      }
      
      // Hacer siguiente pregunta
      const siguientePregunta = nuevoEstado.preguntas[0];
      sesion.esperandoRespuesta = true;
      sesion.ultimaPregunta = siguientePregunta.pregunta;
      sesion.ultimasOpciones = siguientePregunta.opciones || null;
      sesion.ultimoTipoPregunta = siguientePregunta.tipo;
      this.sesiones.set(sessionId, sesion);
      
      return {
        necesitaMasInfo: true,
        siguientePregunta: siguientePregunta.pregunta,
        opcionesSugeridas: siguientePregunta.opciones,
        estadoActual: siguienteEstado,
        puedeConsultarRAG: false,
        intentoActual: 1,
        maxIntentos: sesion.maxIntentos
      };
    }
    
    // Primera interacción sin contexto previo - hacer primera pregunta
    if (preguntaActual) {
      sesion.esperandoRespuesta = true;
      sesion.ultimaPregunta = preguntaActual.pregunta;
      sesion.ultimasOpciones = preguntaActual.opciones || null;
      sesion.ultimoTipoPregunta = preguntaActual.tipo;
      this.sesiones.set(sessionId, sesion);
      return {
        necesitaMasInfo: true,
        siguientePregunta: preguntaActual.pregunta,
        opcionesSugeridas: preguntaActual.opciones,
        estadoActual: sesion.estadoActual,
        puedeConsultarRAG: false,
        intentoActual: 1,
        maxIntentos: sesion.maxIntentos
      };
    }
    
    // Fallback - ir a RAG
    return {
      necesitaMasInfo: false,
      estadoActual: sesion.estadoActual,
      puedeConsultarRAG: true,
      contextoCompleto: sesion.contexto,
      resumenContexto: this.generarResumenContexto(sesion.contexto, sesion.tema)
    };
  }
  
  /**
   * Verificar si un estado es terminal
   */
  private esEstadoTerminal(tema: string, estado: string): boolean {
    const maquina = MAQUINAS_ESTADO[tema];
    if (!maquina) return true;
    const estadoObj = maquina.estados[estado];
    return estadoObj?.esTerminal ?? true;
  }
  
  /**
   * Iniciar nueva sesión de interrogación
   */
  private iniciarSesion(sessionId: string, tema: string) {
    const sesion = {
      tema,
      estadoActual: MAQUINAS_ESTADO[tema]?.estadoInicial || 'inicio',
      contexto: {
        preguntasRealizadas: [],
        respuestasObtenidas: {}
      } as ConversationContext,
      historialPreguntas: [],
      esperandoRespuesta: false, // FALSE al inicio - el primer mensaje es el trigger, no una respuesta
      esPrimerMensaje: true, // Bandera para saber si es el mensaje inicial
      // Nuevos campos para manejo de reintentos
      intentosActuales: 0,
      maxIntentos: 3, // Máximo de intentos antes de avanzar con valor por defecto
      ultimaPregunta: null as string | null,
      ultimasOpciones: null as string[] | null,
      ultimoTipoPregunta: null as string | null
    };
    
    this.sesiones.set(sessionId, sesion);
    return sesion;
  }
  
  /**
   * Generar resumen del contexto para el RAG
   */
  private generarResumenContexto(contexto: ConversationContext, tema: string): string {
    const partes: string[] = [];
    
    // Información de heridos
    if (contexto.hayHeridos !== undefined) {
      partes.push(contexto.hayHeridos ? 'HAY HERIDOS' : 'Sin heridos');
    }
    
    // Información del otro conductor
    if (contexto.otroCondutorHuyo) {
      partes.push('El otro conductor HUYÓ del lugar');
    } else if (contexto.otroCondutorPresente === false) {
      partes.push('Accidente sin otro vehículo involucrado');
    }
    
    // Culpabilidad
    if (contexto.culpable) {
      const culpaTexto = {
        'usuario': 'Usuario acepta culpabilidad',
        'otro': 'El otro conductor es culpable',
        'ambos': 'Responsabilidad compartida',
        'desconocido': 'Culpabilidad por determinar'
      };
      partes.push(culpaTexto[contexto.culpable]);
    }
    
    // Seguro
    if (contexto.tieneSeguro !== undefined) {
      partes.push(contexto.tieneSeguro ? 'Tiene seguro vigente' : 'NO tiene seguro');
    }
    
    // Daños
    if (contexto.dañosVehiculo) {
      partes.push(`Daños al vehículo: ${contexto.dañosVehiculo}`);
    }
    
    // Alcoholemia
    if (contexto.consumioAlcohol) {
      partes.push(`Consumió alcohol (nivel: ${contexto.nivelAlcohol || 'por determinar'})`);
      if (contexto.pruebaAlcoholemia) {
        partes.push('Se realizó prueba de alcoholemia');
      }
    }
    
    // Vehículo remolcado
    if (contexto.vehiculoRemolcado) {
      partes.push('Vehículo en corralón');
    }
    
    // Licencia
    if (contexto.licenciaRetenida) {
      partes.push('Licencia retenida');
    }
    
    // Corrupción
    if (contexto.pidieronMordida) {
      partes.push('DENUNCIA: Oficial pidió mordida');
    }
    
    // Daños a propiedad
    if (contexto.tipoPropiedadDañada) {
      partes.push(`Daño a propiedad: ${contexto.tipoPropiedadDañada}`);
    }
    
    // Tipo de infracción
    if (contexto.tipoInfraccion) {
      partes.push(`Infracción: ${contexto.tipoInfraccion}`);
    }
    
    // Monto multa
    if (contexto.montoMulta) {
      partes.push(`Monto multa: $${contexto.montoMulta} MXN`);
    }
    
    return partes.length > 0 
      ? `📋 CONTEXTO RECOPILADO:\n• ${partes.join('\n• ')}`
      : 'Contexto básico';
  }
  
  /**
   * Obtener contexto actual de una sesión
   */
  obtenerContexto(sessionId: string): ConversationContext | null {
    return this.sesiones.get(sessionId)?.contexto || null;
  }
  
  /**
   * Reiniciar sesión de interrogación
   */
  reiniciarSesion(sessionId: string): void {
    this.sesiones.delete(sessionId);
  }
  
  /**
   * Verificar si un tema tiene máquina de estados
   */
  tieneMaquinaEstados(tema: string): boolean {
    return !!MAQUINAS_ESTADO[tema];
  }
  
  /**
   * Forzar consulta a RAG (usuario pidió explícitamente)
   */
  forzarRAG(sessionId: string): InterrogationResult {
    const sesion = this.sesiones.get(sessionId);
    if (!sesion) {
      return {
        necesitaMasInfo: false,
        estadoActual: 'forzado',
        puedeConsultarRAG: true,
        resumenContexto: 'Consulta directa solicitada por usuario'
      };
    }
    
    return {
      necesitaMasInfo: false,
      estadoActual: sesion.estadoActual,
      puedeConsultarRAG: true,
      contextoCompleto: sesion.contexto,
      resumenContexto: this.generarResumenContexto(sesion.contexto, sesion.tema)
    };
  }
}

// Instancia singleton
export const conversationStateMachine = new ConversationStateMachine();
