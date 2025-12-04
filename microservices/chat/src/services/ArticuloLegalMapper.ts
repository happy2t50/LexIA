import { ContextoDetectado } from './LegalNormalizer';

/**
 * Artículo legal con explicación accesible
 */
export interface ArticuloConExplicacion {
  numero: string;
  titulo: string;
  contenido: string;
  explicacionSimple: string;
  consecuencias?: string[];
  acciones?: string[];
}

/**
 * Resultado del análisis de situación legal
 */
export interface AnalisisSituacion {
  articulos: ArticuloConExplicacion[];
  informacionFaltante: string[];
  preguntasSugeridas: string[];
  urgencia: 'alta' | 'media' | 'baja';
}

/**
 * Mapea situaciones legales a artículos específicos con explicaciones accesibles
 */
export class ArticuloLegalMapper {
  private articulosBase: Record<string, ArticuloConExplicacion> = {
    // === ACCIDENTES ===
    'accidente_obligaciones': {
      numero: '110',
      titulo: 'Obligaciones en caso de Accidente',
      contenido: 'El conductor debe: detenerse inmediatamente, prestar auxilio a los heridos, dar aviso a las autoridades, no mover el vehículo hasta que lleguen las autoridades (salvo que obstruya gravemente el tránsito), intercambiar información con otros involucrados, esperar el parte policial.',
      explicacionSimple: 'Cuando tienes un accidente, tienes la obligación legal de quedarte en el lugar y ayudar',
      acciones: [
        'Detenerte inmediatamente',
        'Ayudar a personas heridas',
        'Llamar a las autoridades (911)',
        'NO mover los vehículos hasta que llegue tránsito',
        'Intercambiar datos con el otro conductor'
      ]
    },
    'accidente_fuga': {
      numero: '112',
      titulo: 'Fuga del lugar del accidente',
      contenido: 'Quien cause un accidente y se dé a la fuga será sancionado con prisión de 2 a 5 años, suspensión de licencia por 5 años e inhabilitación permanente si hay lesionados graves o muerte.',
      explicacionSimple: 'Huir del lugar de un accidente es un delito grave. Puede significar hasta 5 años de cárcel',
      consecuencias: [
        'Prisión de 2 a 5 años',
        'Suspensión de licencia por 5 años',
        'Antecedentes penales',
        'Si hay heridos: pena agravada'
      ]
    },
    'accidente_sin_seguro': {
      numero: '63-B',
      titulo: 'Obligación de contar con seguro (Ley de Caminos)',
      contenido: 'Los vehículos que transiten por caminos y puentes federales deberán contar con un seguro de responsabilidad civil vigente que ampare daños a terceros en sus bienes y personas.',
      explicacionSimple: 'Es obligatorio tener seguro para circular. Si no lo tienes, tú pagas todos los daños directamente',
      consecuencias: [
        'Multa administrativa por no tener seguro',
        'Responsabilidad civil directa por todos los daños',
        'Posible retención del vehículo en corralón'
      ],
      acciones: [
        'Deberás pagar los daños causados de tu bolsillo',
        'Negociar un convenio de pago con el afectado',
        'Tramitar tu seguro lo antes posible'
      ]
    },

    // === LESIONES ===
    'accidente_lesiones': {
      numero: '115',
      titulo: 'Accidente con lesionados',
      contenido: 'Cuando en un accidente resulten personas lesionadas, el conductor está obligado a prestar auxilio inmediato, solicitar ambulancia al 911 y permanecer en el lugar hasta que lleguen las autoridades.',
      explicacionSimple: 'Si alguien está herido, tu prioridad es llamar al 911 inmediatamente y NO mover a la persona',
      acciones: [
        'Llama al 911 AHORA para pedir ambulancia',
        'NO muevas a la persona lesionada (puede empeorar lesiones)',
        'Mantén la calma y espera a paramédicos',
        'Documenta la escena con fotos'
      ]
    },

    // === MULTAS ===
    'multa_plazo_pago': {
      numero: '145',
      titulo: 'Plazos y descuentos en multas',
      contenido: 'Las multas de tránsito pueden pagarse con 50% de descuento si se pagan dentro de los primeros 15 días hábiles. Después aplica el monto completo.',
      explicacionSimple: 'Tienes 15 días para pagar tu multa con 50% de descuento',
      acciones: [
        'Paga en los primeros 15 días para aprovechar el 50% de descuento',
        'Verifica que los datos de la multa sean correctos',
        'Si crees que es injusta, puedes impugnarla'
      ]
    },
    'multa_impugnacion': {
      numero: '148',
      titulo: 'Derecho a impugnar multas',
      contenido: 'Todo conductor tiene derecho a impugnar una multa que considere injusta, presentando un recurso de inconformidad ante el Juzgado Cívico dentro de los 15 días hábiles siguientes.',
      explicacionSimple: 'Puedes pelear una multa injusta presentando un recurso ante el Juzgado Cívico',
      acciones: [
        'Tienes 15 días hábiles para presentar tu inconformidad',
        'Reúne evidencia: fotos, testigos, documentos',
        'Acude al Juzgado Cívico con tu boleta',
        'Explica por qué consideras que la multa es injusta'
      ]
    },

    // === ALCOHOL ===
    'alcohol_conducir': {
      numero: '95',
      titulo: 'Conducir bajo influencia del alcohol',
      contenido: 'Conducir con nivel de alcohol en sangre superior a 0.4 g/L será sancionado con multa de 20-100 días de salario mínimo, arresto de 20-36 horas, suspensión de licencia de 1-3 años y remisión del vehículo al corralón.',
      explicacionSimple: 'Manejar borracho tiene consecuencias graves: multa fuerte, arresto, suspensión de licencia y tu carro al corralón',
      consecuencias: [
        'Multa de $5,000 a $25,000 MXN aprox.',
        'Arresto de 20 a 36 horas',
        'Suspensión de licencia de 1 a 3 años',
        'Tu vehículo va al corralón'
      ],
      acciones: [
        'Coopera con las autoridades durante el procedimiento',
        'Paga la multa correspondiente',
        'Recupera tu vehículo del corralón (con pago)',
        'Espera el período de suspensión para recuperar licencia'
      ]
    },

    // === VELOCIDAD ===
    'velocidad_exceso': {
      numero: '88',
      titulo: 'Exceso de velocidad',
      contenido: 'Rebasar los límites de velocidad establecidos será sancionado con multa según el nivel de exceso: leve (10-20 km/h), moderado (20-40 km/h) o grave (más de 40 km/h).',
      explicacionSimple: 'Entre más rápido vayas sobre el límite, mayor será la multa y los puntos en tu licencia',
      consecuencias: [
        'Multa según exceso: $500 a $5,000 MXN',
        'Puntos en tu licencia',
        'Si es exceso grave: posible suspensión de licencia'
      ]
    },

    // === SEMÁFORO ===
    'semaforo_rojo': {
      numero: '92',
      titulo: 'Cruzar semáforo en rojo',
      contenido: 'Cruzarse un semáforo en luz roja es una infracción grave sancionada con multa de 10-20 días de salario mínimo y 6 puntos en la licencia.',
      explicacionSimple: 'Pasarte un alto es infracción grave: multa de ~$2,500-$5,000 y 6 puntos en tu licencia',
      consecuencias: [
        'Multa de $2,500 a $5,000 MXN aprox.',
        '6 puntos en tu licencia',
        'Si causas accidente: responsabilidad civil total',
        'Tu seguro puede rechazar cobertura'
      ]
    }
  };

  /**
   * Analiza la situación del usuario y retorna artículos relevantes con información faltante
   */
  analizarSituacion(
    mensaje: string,
    contexto: ContextoDetectado,
    tema: string,
    articulosRAG?: any[]
  ): AnalisisSituacion {
    const mensajeLower = mensaje.toLowerCase();
    const articulos: ArticuloConExplicacion[] = [];
    const informacionFaltante: string[] = [];
    const preguntasSugeridas: string[] = [];

    // === ANÁLISIS POR TEMA ===
    if (tema === 'accidente' || /choc|accidente|colisi/i.test(mensaje)) {
      // Siempre agregar obligaciones base
      articulos.push(this.articulosBase['accidente_obligaciones']);

      // Detectar si hay fuga
      if (/se fue|se pel|huy|escap/i.test(mensajeLower)) {
        articulos.push(this.articulosBase['accidente_fuga']);
      } else if (contexto.culpabilidad === 'usuario_victima' && !contexto.llamoAutoridades) {
        preguntasSugeridas.push('¿El otro conductor se quedó en el lugar o se fue?');
        informacionFaltante.push('presencia_otro_conductor');
      }

      // Detectar lesiones
      if (contexto.hayHeridos || /sangr|herid|lesion|ambulancia/i.test(mensajeLower)) {
        articulos.push(this.articulosBase['accidente_lesiones']);
      } else if (!contexto.hayHeridos && contexto.urgencia === 'alta') {
        preguntasSugeridas.push('¿Hay alguien herido o solo daños materiales?');
        informacionFaltante.push('presencia_heridos');
      }

      // Detectar seguro
      if (/sin seguro|no tengo seguro|no tiene seguro/i.test(mensajeLower)) {
        articulos.push(this.articulosBase['accidente_sin_seguro']);
      } else {
        preguntasSugeridas.push('¿Tienes seguro de auto vigente?');
        informacionFaltante.push('tiene_seguro');
      }

      // Preguntar por culpabilidad si es ambigua
      if (contexto.culpabilidad === 'ambiguo') {
        preguntasSugeridas.push('¿De quién fue la culpa del accidente?');
        informacionFaltante.push('culpabilidad');
      }
    }

    if (tema === 'multa' || /mult|infrac/i.test(mensajeLower)) {
      articulos.push(this.articulosBase['multa_plazo_pago']);
      articulos.push(this.articulosBase['multa_impugnacion']);
    }

    if (tema === 'alcohol' || tema === 'alcoholemia' || /alcohol|pedo|borracho/i.test(mensajeLower)) {
      articulos.push(this.articulosBase['alcohol_conducir']);

      if (!/corral/i.test(mensajeLower)) {
        preguntasSugeridas.push('¿Ya te llevaron el vehículo al corralón?');
        informacionFaltante.push('vehiculo_corralon');
      }
    }

    if (/velocidad|volando|rápido/i.test(mensajeLower)) {
      articulos.push(this.articulosBase['velocidad_exceso']);
    }

    if (/semáforo|rojo|alto|se paso/i.test(mensajeLower)) {
      articulos.push(this.articulosBase['semaforo_rojo']);
    }

    return {
      articulos,
      informacionFaltante,
      preguntasSugeridas: preguntasSugeridas.slice(0, 2), // Máximo 2 preguntas
      urgencia: contexto.urgencia
    };
  }

  /**
   * Genera una sección de "Base Legal" formateada con explicaciones
   */
  generarSeccionBaseLegal(articulos: ArticuloConExplicacion[]): string {
    if (articulos.length === 0) return '';

    let seccion = '\n\n⚖️ **Base Legal:**\n\n';

    for (const art of articulos.slice(0, 3)) { // Máximo 3 artículos
      seccion += `📋 **Artículo ${art.numero} - ${art.titulo}**\n`;
      seccion += `   ${art.explicacionSimple}\n`;

      if (art.consecuencias && art.consecuencias.length > 0) {
        seccion += '\n   **Consecuencias:**\n';
        art.consecuencias.forEach(c => {
          seccion += `   • ${c}\n`;
        });
      }

      if (art.acciones && art.acciones.length > 0) {
        seccion += '\n   **Qué hacer:**\n';
        art.acciones.forEach(a => {
          seccion += `   • ${a}\n`;
        });
      }

      seccion += '\n';
    }

    return seccion;
  }
}

export const articuloLegalMapper = new ArticuloLegalMapper();
