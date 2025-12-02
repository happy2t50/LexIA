/**
 * GENERADOR DE RESPUESTAS COMPLETAS - LexIA
 * 
 * Genera respuestas profesionales con:
 * 1. Respuesta clara al problema
 * 2. Referencia Legal (artículo específico)
 * 3. Pasos a Seguir
 * 4. Lugares donde acudir
 * 5. Sugerencias de continuidad
 */

import { LUGARES_CHIAPAS, NUMEROS_EMERGENCIA, LugarRecurso, formatearLugar } from '../data/chiapasResources';

export interface ArticuloLegal {
  titulo: string;
  contenido: string;
  fuente: string;
  similitud: number;
}

export interface RespuestaCompleta {
  respuestaPrincipal: string;
  referenciaLegal: string;
  pasosASeguir: string[];
  lugares: LugarRecurso[];
  sugerencias: string[];
  temasRelacionados: string[];
}

// Mapeo de temas a lugares relevantes y pasos
const TEMA_CONFIG: { [key: string]: {
  lugarTipos: LugarRecurso['tipo'][];
  pasosBase: string[];
  sugerenciasBase: string[];
}} = {
  'alcohol': {
    lugarTipos: ['gobierno', 'legal', 'derechos_humanos'],
    pasosBase: [
      'Si eres detenido, no te resistas y coopera con la autoridad.',
      'Tienes derecho a solicitar el alcoholímetro para verificar tu estado.',
      'Paga la multa correspondiente para recuperar tu vehículo.',
      'Si consideras que la detención fue injusta, presenta una queja ante la Comisión de Derechos Humanos.'
    ],
    sugerenciasBase: [
      '¿Necesitas asesoría legal profesional?',
      '¿Quieres conocer tus derechos durante una detención?',
      'Visita nuestro foro de comunidad para más consejos'
    ]
  },
  'accidente': {
    lugarTipos: ['emergencia', 'legal', 'gobierno'],
    pasosBase: [
      'Asegura el área y enciende las luces de emergencia.',
      'Llama al 911 si hay heridos.',
      'Toma fotos de los daños y obtén datos de testigos.',
      'No muevas los vehículos hasta que lleguen las autoridades.',
      'Reporta el siniestro a tu aseguradora dentro de las primeras 24 horas.'
    ],
    sugerenciasBase: [
      '¿El otro conductor huyó? Te explico qué hacer.',
      '¿Necesitas un abogado especializado en accidentes?',
      'Consulta con profesionales en nuestro directorio'
    ]
  },
  'multa': {
    lugarTipos: ['gobierno'],
    pasosBase: [
      'Revisa la boleta de infracción y verifica que los datos sean correctos.',
      'Tienes 15-30 días para pagar con descuento del 50%.',
      'Puedes pagar en línea, banco o directamente en las oficinas.',
      'Si no estás de acuerdo, puedes impugnar la multa en el Juzgado Cívico.'
    ],
    sugerenciasBase: [
      '¿Quieres impugnar la multa?',
      '¿Cómo evitar futuras infracciones?',
      'Conoce tus derechos como conductor'
    ]
  },
  'documentos': {
    lugarTipos: ['gobierno'],
    pasosBase: [
      'Verifica que todos tus documentos estén vigentes.',
      'Puedes portar copias digitales en algunos estados.',
      'Renueva tu licencia antes de que expire para evitar multas.',
      'El seguro es obligatorio desde 2019, asegúrate de tenerlo.'
    ],
    sugerenciasBase: [
      '¿Necesitas renovar tu licencia?',
      '¿Dónde contratar un seguro económico?',
      'Consulta requisitos actualizados'
    ]
  },
  'derechos': {
    lugarTipos: ['derechos_humanos', 'legal'],
    pasosBase: [
      'Solicita siempre la identificación del oficial.',
      'Pide la boleta oficial de infracción.',
      'No pagues dinero en efectivo al oficial - las multas se pagan en banco.',
      'Puedes grabar la interacción en vía pública.',
      'Denuncia cualquier abuso al 089 o ante la CEDH.'
    ],
    sugerenciasBase: [
      '¿Sufriste abuso policial?',
      '¿Necesitas asesoría legal gratuita?',
      'Únete a nuestro foro y comparte tu experiencia'
    ]
  },
  'corralon': {
    lugarTipos: ['gobierno'],
    pasosBase: [
      'Localiza tu vehículo llamando a Tránsito Municipal.',
      'Paga la multa correspondiente en el banco.',
      'Ve al corralón con INE, tarjeta de circulación y comprobante de pago.',
      'Paga la grúa y la pensión diaria.',
      'Revisa tu vehículo antes de retirarlo.'
    ],
    sugerenciasBase: [
      '¿Cómo evitar que se lleven tu auto?',
      '¿Cuáles son las zonas donde no debes estacionarte?',
      'Conoce las tarifas actualizadas'
    ]
  },
  'estacionamiento': {
    lugarTipos: ['gobierno'],
    pasosBase: [
      'Evita estacionarte en banquetas, doble fila o lugares prohibidos.',
      'Revisa la señalización antes de dejar tu vehículo.',
      'Si te llevan la grúa, actúa rápido - cada día cuesta más.',
      'Las multas por estacionamiento indebido van de 10-30 días de salario.'
    ],
    sugerenciasBase: [
      '¿Te llevaron tu auto al corralón?',
      '¿Dónde puedo estacionarme legalmente?',
      'Consulta el mapa de estacionamientos'
    ]
  },
  'atropello': {
    lugarTipos: ['emergencia', 'legal', 'derechos_humanos'],
    pasosBase: [
      'Llama al 911 inmediatamente.',
      'No te muevas si tienes dolor en cuello o espalda.',
      'Intenta obtener la placa del vehículo si el conductor huyó.',
      'Busca testigos y pide sus datos de contacto.',
      'Acude al Ministerio Público para levantar denuncia.'
    ],
    sugerenciasBase: [
      '¿El conductor huyó? Te ayudamos a denunciar.',
      '¿Necesitas indemnización por daños?',
      'Conecta con abogados especializados'
    ]
  },
  'general': {
    lugarTipos: ['gobierno', 'legal'],
    pasosBase: [
      'Identifica claramente tu situación.',
      'Reúne toda la documentación necesaria.',
      'Consulta con un profesional si tienes dudas.',
      'Conoce tus derechos como ciudadano.'
    ],
    sugerenciasBase: [
      '¿Tienes otra pregunta sobre tránsito?',
      'Visita nuestro foro de comunidad',
      'Conecta con profesionales certificados'
    ]
  }
};

export class ResponseBuilder {
  
  /**
   * Genera una respuesta completa y profesional
   */
  static buildCompleteResponse(
    tema: string,
    respuestaBase: string,
    articulosLegales: ArticuloLegal[],
    nombreUsuario: string
  ): string {
    const config = TEMA_CONFIG[tema] || TEMA_CONFIG['general'];
    
    let respuesta = '';
    
    // === 1. RESPUESTA PRINCIPAL ===
    respuesta += `${respuestaBase}\n\n`;
    
    // === 2. REFERENCIA LEGAL ===
    if (articulosLegales.length > 0) {
      respuesta += `📜 **Referencia Legal**\n`;
      const artPrincipal = articulosLegales[0];
      respuesta += `${artPrincipal.fuente}`;
      
      // Extraer número de artículo si existe
      const matchArt = artPrincipal.contenido.match(/art[íi]culo\s*(\d+)/i);
      if (matchArt) {
        respuesta += ` (Artículo ${matchArt[1]})`;
      }
      respuesta += `.\n\n`;
    }
    
    // === 3. PASOS A SEGUIR ===
    respuesta += `📋 **Pasos a Seguir**\n`;
    config.pasosBase.forEach((paso, i) => {
      respuesta += `${i + 1}. ${paso}\n`;
    });
    respuesta += '\n';
    
    // === 4. LUGARES DONDE ACUDIR ===
    const lugaresRelevantes = LUGARES_CHIAPAS.filter(l => 
      config.lugarTipos.includes(l.tipo)
    ).slice(0, 2);
    
    if (lugaresRelevantes.length > 0) {
      respuesta += `📍 **Lugares donde puedes acudir**\n\n`;
      lugaresRelevantes.forEach(lugar => {
        respuesta += `**${lugar.nombre}**\n`;
        respuesta += `   📍 ${lugar.direccion}, ${lugar.ciudad}\n`;
        respuesta += `   📞 ${lugar.telefono}\n`;
        respuesta += `   🕐 ${lugar.horario}\n`;
        if (lugar.googleMapsUrl) {
          respuesta += `   🗺️ [Ver en Google Maps](${lugar.googleMapsUrl})\n`;
        }
        respuesta += '\n';
      });
    }
    
    // === 5. NÚMEROS DE EMERGENCIA (si aplica) ===
    if (tema === 'accidente' || tema === 'atropello') {
      respuesta += `🚨 **Números de Emergencia**\n`;
      respuesta += `   • Emergencias: ${NUMEROS_EMERGENCIA.emergencias}\n`;
      respuesta += `   • Cruz Roja: ${NUMEROS_EMERGENCIA.cruzRoja}\n`;
      respuesta += `   • Denuncia Anónima: ${NUMEROS_EMERGENCIA.denuncia_anonima}\n\n`;
    }
    
    // === 6. SUGERENCIAS DE CONTINUIDAD ===
    respuesta += `---\n`;
    respuesta += `💡 **¿Necesitas más ayuda?**\n`;
    respuesta += `• Conecta con **profesionales certificados** en nuestro directorio\n`;
    respuesta += `• Visita el **foro de comunidad** para consejos de otros usuarios\n`;
    respuesta += `• Usa el **mapa legal** para encontrar servicios cerca de ti\n\n`;
    
    respuesta += `¿En qué más puedo ayudarte, ${nombreUsuario}?`;
    
    return respuesta;
  }

  /**
   * Detectar tema de la consulta
   */
  static detectarTema(mensaje: string, kbCategory?: string): string {
    const msgLower = mensaje.toLowerCase();
    
    // Mapeo de palabras clave a temas
    const temaKeywords: { [key: string]: string[] } = {
      'alcohol': ['alcohol', 'borracho', 'ebrio', 'alcoholímetro', 'alcoholimetro', 'tomado', 'cerveza', 'copa'],
      'accidente': ['accidente', 'choque', 'chocaron', 'chocar', 'colisión', 'colision'],
      'atropello': ['atropello', 'atropellado', 'atropellar', 'peatón', 'peaton', 'caminando', 'fuga'],
      'multa': ['multa', 'infracción', 'infraccion', 'boleta', 'fotomulta', 'pagar multa'],
      'documentos': ['documento', 'licencia', 'tarjeta circulación', 'seguro', 'verificación', 'papeles'],
      'derechos': ['derecho', 'abuso', 'extorsión', 'mordida', 'corrupción', 'detuvieron', 'detenido'],
      'corralon': ['corralón', 'corralon', 'grúa', 'grua', 'llevaron mi carro', 'remolcaron'],
      'estacionamiento': ['estacionar', 'banqueta', 'acera', 'doble fila', 'prohibido estacionar']
    };
    
    // Buscar tema por keywords
    for (const [tema, keywords] of Object.entries(temaKeywords)) {
      if (keywords.some(k => msgLower.includes(k))) {
        return tema;
      }
    }
    
    // Usar categoría de KB si existe
    if (kbCategory) {
      const categoryMap: { [key: string]: string } = {
        'alcohol': 'alcohol',
        'accidentes': 'accidente',
        'infracciones': 'multa',
        'documentacion': 'documentos',
        'derechos': 'derechos',
        'tramites': 'corralon',
        'señalizacion': 'general'
      };
      return categoryMap[kbCategory] || 'general';
    }
    
    return 'general';
  }

  /**
   * Obtener pasos específicos para un tema
   */
  static getPasosParaTema(tema: string): string[] {
    return TEMA_CONFIG[tema]?.pasosBase || TEMA_CONFIG['general'].pasosBase;
  }

  /**
   * Obtener lugares relevantes para un tema
   */
  static getLugaresParaTema(tema: string): LugarRecurso[] {
    const config = TEMA_CONFIG[tema] || TEMA_CONFIG['general'];
    return LUGARES_CHIAPAS.filter(l => config.lugarTipos.includes(l.tipo)).slice(0, 3);
  }

  /**
   * Obtener sugerencias para un tema
   */
  static getSugerenciasParaTema(tema: string): string[] {
    return TEMA_CONFIG[tema]?.sugerenciasBase || TEMA_CONFIG['general'].sugerenciasBase;
  }
}
