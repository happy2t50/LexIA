import { ArticuloLegal } from './SmartResponseService';
import { ContextoDetectado } from './LegalNormalizer';
import { articuloLegalMapper, AnalisisSituacion } from './ArticuloLegalMapper';

export class OllamaResponseGenerator {
  /**
   * Genera una respuesta conversacional y empática siguiendo el enfoque de la IA de referencia
   */
  async generarRespuestaSintetizada(
    nombreUsuario: string,
    mensajeUsuario: string,
    _contextoRAG: string,
    _historialConversacion: string,
    tema: string,
    emocionDetectada?: 'enojado' | 'preocupado' | 'neutral' | 'frustrado' | 'desesperado',
    contextoDetectado?: ContextoDetectado
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

    // Construir respuesta conversacional por secciones
    let respuesta = '';

    // === 1. SALUDO EMPÁTICO ===
    respuesta += this.generarSaludoEmpatico(nombreUsuario, tema, emocionDetectada, contextoDetectado);
    respuesta += '\n\n';

    // === 2. ACCIONES URGENTES (si aplica) ===
    const accionesUrgentes = this.generarAccionesUrgentes(analisis, contextoDetectado);
    if (accionesUrgentes) {
      respuesta += accionesUrgentes + '\n\n';
    }

    // === 3. PASOS ACCIONABLES ===
    const pasosAccionables = this.generarPasosAccionables(tema, analisis, contextoDetectado);
    if (pasosAccionables) {
      respuesta += pasosAccionables + '\n\n';
    }

    // === 4. BASE LEGAL CON EXPLICACIÓN ===
    if (analisis.articulos.length > 0) {
      respuesta += articuloLegalMapper.generarSeccionBaseLegal(analisis.articulos);
      respuesta += '\n';
    }

    // === 5. PREGUNTAS DE SEGUIMIENTO (si falta info) ===
    if (analisis.preguntasSugeridas.length > 0) {
      respuesta += this.generarPreguntasSeguimiento(analisis.preguntasSugeridas);
      respuesta += '\n';
    }

    // === 6. CIERRE CONVERSACIONAL ===
    respuesta += this.generarCierre(tema, analisis);

    return respuesta.trim();
  }

  /**
   * Genera un saludo empático basado en la emoción y situación
   */
  private generarSaludoEmpatico(
    nombreUsuario: string,
    tema: string,
    emocion?: string,
    contexto?: ContextoDetectado
  ): string {
    const mensajes = {
      accidente: {
        enojado: `${nombreUsuario}, entiendo tu frustración. Nadie quiere estar en esta situación.`,
        preocupado: `${nombreUsuario}, sé que esto te tiene preocupado, pero vamos a resolverlo juntos.`,
        desesperado: `${nombreUsuario}, respira hondo. Estoy aquí para ayudarte paso a paso.`,
        neutral: `${nombreUsuario}, lamento mucho escuchar eso.`,
        default: `${nombreUsuario}, lamento que hayas tenido un accidente.`
      },
      multa: {
        frustrado: `${nombreUsuario}, entiendo tu molestia con la multa.`,
        enojado: `${nombreUsuario}, sé que esto te tiene enojado.`,
        neutral: `${nombreUsuario}, respecto a tu multa de tránsito...`,
        default: `${nombreUsuario}, sobre tu multa...`
      },
      alcohol: {
        desesperado: `${nombreUsuario}, sé que es una situación complicada.`,
        preocupado: `${nombreUsuario}, tranquilo, vamos a ver cómo resolver esto.`,
        neutral: `${nombreUsuario}, sobre el alcoholímetro...`,
        default: `${nombreUsuario}, entiendo la situación.`
      },
      default: {
        default: `${nombreUsuario}, gracias por consultarme.`
      }
    };

    const temaMsg = mensajes[tema as keyof typeof mensajes] || mensajes.default;
    const msg = (emocion && temaMsg[emocion as keyof typeof temaMsg]) ||
                temaMsg['default' as keyof typeof temaMsg] ||
                `${nombreUsuario}, entiendo tu situación.`;

    // Agregar nota de urgencia si hay heridos
    if (contexto?.hayHeridos) {
      return msg + ' **Esto requiere atención urgente.**';
    }

    return msg;
  }

  /**
   * Genera acciones urgentes para situaciones críticas
   */
  private generarAccionesUrgentes(
    analisis: AnalisisSituacion,
    contexto?: ContextoDetectado
  ): string | null {
    if (analisis.urgencia !== 'alta') return null;

    // Si hay heridos
    if (contexto?.hayHeridos) {
      const urgente = `🚨 **Si hay heridos o peligro inmediato:**\n\n` +
                `Lo más importante es llamar al **911 de inmediato** y pedir asistencia médica y policial.\n\n` +
                `🛑 **NO muevas a personas lesionadas**: espera a que lleguen los servicios de emergencia.`;
      return urgente;
    }

    return null;
  }

  /**
   * Genera pasos accionables específicos por tema
   */
  private generarPasosAccionables(
    tema: string,
    analisis: AnalisisSituacion,
    _contexto?: ContextoDetectado
  ): string {
    // Buscar artículo con acciones específicas
    const articuloConAcciones = analisis.articulos.find(a => a.acciones && a.acciones.length > 0);

    if (articuloConAcciones && articuloConAcciones.acciones) {
      let pasos = `📋 **Qué hacer ahora:**\n\n`;
      articuloConAcciones.acciones.forEach((accion, i) => {
        pasos += `${i + 1}. ${accion}\n`;
      });
      return pasos;
    }

    // Pasos genéricos por tema si no hay artículo específico
    const pasosGenericos: Record<string, string[]> = {
      accidente: [
        'Asegúrate de estar en un lugar seguro',
        'Enciende las luces intermitentes',
        'Toma fotos del lugar, vehículos y daños',
        'Intercambia información con el otro conductor',
        'Reporta a tu seguro en las próximas 24 horas'
      ],
      multa: [
        'Verifica que los datos de la multa sean correctos',
        'Considera pagar en los primeros 15 días (50% descuento)',
        'Si es injusta, puedes impugnarla ante el Juzgado Cívico'
      ],
      alcohol: [
        'Coopera con las autoridades durante el procedimiento',
        'Anota los datos del oficial y la infracción',
        'Averigua en qué corralón está tu vehículo',
        'Prepara los documentos para recuperarlo'
      ]
    };

    const pasos = pasosGenericos[tema] || [
      'Contacta a las autoridades si aún no lo has hecho',
      'Reúne toda la documentación necesaria',
      'Considera consultar con un abogado especialista'
    ];

    let respuesta = `📋 **Pasos a seguir:**\n\n`;
    pasos.forEach((paso, i) => {
      respuesta += `${i + 1}. ${paso}\n`;
    });

    return respuesta;
  }

  /**
   * Genera preguntas de seguimiento para obtener información faltante
   */
  private generarPreguntasSeguimiento(preguntas: string[]): string {
    if (preguntas.length === 0) return '';

    let seccion = `💬 **Para ayudarte mejor, necesito saber:**\n\n`;
    preguntas.forEach((pregunta, i) => {
      seccion += `${i + 1}. ${pregunta}\n`;
    });

    return seccion;
  }

  /**
   * Genera un cierre conversacional que invita a continuar el diálogo
   */
  private generarCierre(tema: string, analisis: AnalisisSituacion): string {
    const cierres = [
      '¿Quieres que te explique alguno de estos puntos con más detalle?',
      '¿Tienes alguna duda específica sobre estos pasos?',
      '¿Necesitas que te conecte con un abogado especializado?',
      '¿Hay algo más en lo que te pueda ayudar?'
    ];

    // Elegir cierre según si falta información
    if (analisis.informacionFaltante.length > 0) {
      return '¿Puedes darme esos detalles para ayudarte mejor?';
    }

    if (tema === 'accidente' && analisis.urgencia === 'alta') {
      return '¿Necesitas que te conecte con un abogado especializado en accidentes?';
    }

    return cierres[Math.floor(Math.random() * cierres.length)];
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
}

export const ollamaResponseGenerator = new OllamaResponseGenerator();
