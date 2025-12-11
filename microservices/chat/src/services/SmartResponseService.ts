import { Pool } from 'pg';
import axios from 'axios';
import { ForoInteligenteService, SugerenciaForo } from './ForoInteligenteService';
import { AdaptiveLearningService } from './AdaptiveLearningService';
import { ConversationService } from './ConversationService';
import { slangNormalizer } from '../utils/SlangNormalizer';
import { ollamaResponseGenerator } from './OllamaResponseGenerator';

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
  // Rastrear por tema para no repetir en el mismo tema
  temasConProfesionistasOfrecidos: string[];
  temasConAnunciantesOfrecidos: string[];
  // Nombre del usuario para consistencia en las respuestas
  nombreUsuario: string;
}

// Configuración por tema
const TEMA_CONFIG: { [key: string]: {
  pasosASeguir: string[];
  especialidadesAbogado: string[];
  serviciosAnunciante: string[];
  preguntasSugeridas: string[];
}} = {
  'fuga_autoridad': {
    pasosASeguir: [
      'URGENTE: Si aún no te han identificado, consulta con un abogado ANTES de actuar',
      'NO intentes huir de nuevo - esto agrava la situación considerablemente',
      'Reúne toda la evidencia del momento (hora, lugar, motivo de la detención)',
      'Si tienes dashcam o video, guárdalo - puede ser evidencia importante',
      'Busca asesoría legal especializada en derecho penal de tránsito',
      'Si te localizan, coopera completamente con las autoridades'
    ],
    especialidadesAbogado: ['Derecho penal', 'Defensa penal', 'Infracciones graves de tránsito'],
    serviciosAnunciante: [],
    preguntasSugeridas: [
      '¿Qué consecuencias tiene huir de un operativo?',
      '¿Pueden rastrearme por las placas?',
      '¿Debería presentarme voluntariamente?',
      '¿Necesito un abogado penalista?'
    ]
  },
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
    especialidadesAbogado: ['Infracciones de tránsito', 'Multas', 'Derecho administrativo'],
    serviciosAnunciante: ['Gestoria'],
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
  'alcoholemia': {
    pasosASeguir: [
      'Coopera con las autoridades, no te resistas',
      'Tienes derecho a que el alcoholímetro esté calibrado',
      'Puedes solicitar una segunda prueba',
      'Si te arrestan, tienes derecho a una llamada',
      'Paga la multa para recuperar tu vehículo del corralón',
      'Si te quitaron la licencia, pregunta por el trámite de recuperación',
      'Considera tomar un curso de sensibilización'
    ],
    especialidadesAbogado: ['Defensa penal', 'Alcoholimetría', 'Infracciones de tránsito'],
    serviciosAnunciante: ['Grua'],
    preguntasSugeridas: [
      '¿Puedo recuperar mi licencia?',
      '¿Cuánto tiempo estará suspendida?',
      '¿Qué derechos tengo durante el operativo?',
      '¿Cómo saco mi carro del corralón?'
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
    especialidadesAbogado: ['Infracciones de tránsito', 'Multas', 'Derecho administrativo'],
    serviciosAnunciante: ['Grua', 'Gestoria'],
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
    especialidadesAbogado: ['Impugnación de multas', 'Multas', 'Derecho administrativo', 'Infracciones de tránsito'],
    serviciosAnunciante: ['Gestoria'],
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
  // === ESCENARIOS ADICIONALES DE TRÁNSITO ===
  'exceso_velocidad': {
    pasosASeguir: [
      'Revisa la boleta: debe indicar velocidad detectada y límite permitido',
      'Si fue radar/fotomulta, tienes 15 días para impugnar con evidencia',
      'Verifica que el equipo de medición tenga calibración vigente',
      'Paga con descuento del 50% en los primeros 15 días si decides no impugnar',
      'Consulta cuántos puntos te restaron (generalmente 3-6 puntos)'
    ],
    especialidadesAbogado: ['Infracciones de tránsito', 'Derecho administrativo', 'Impugnación de multas'],
    serviciosAnunciante: ['Gestoria'],
    preguntasSugeridas: [
      '¿Puedo impugnar si el radar no estaba calibrado?',
      '¿Cuántos puntos me quitan por exceso de velocidad?',
      '¿Dónde pago la multa?'
    ]
  },
  'vuelta_prohibida': {
    pasosASeguir: [
      'Verifica si había señalización clara de vuelta prohibida',
      'Revisa la boleta de infracción - debe especificar el lugar exacto',
      'Si la señalización era confusa o inexistente, puedes impugnar',
      'Toma fotos del lugar si planeas impugnar',
      'Tienes 15 días hábiles para presentar recurso'
    ],
    especialidadesAbogado: ['Infracciones de tránsito', 'Impugnación de multas'],
    serviciosAnunciante: ['Gestoria'],
    preguntasSugeridas: [
      '¿Puedo impugnar si no había señal clara?',
      '¿Cuánto es la multa por vuelta prohibida?',
      '¿Qué evidencia necesito para impugnar?'
    ]
  },
  'sentido_contrario': {
    pasosASeguir: [
      'Esta es una infracción GRAVE - puede incluir puntos y multa alta',
      'Si causaste accidente, hay responsabilidad civil y posiblemente penal',
      'Documenta las circunstancias (señalización, visibilidad)',
      'Si fue por señalización confusa, reúne evidencia fotográfica',
      'Considera asesoría legal si hubo consecuencias graves'
    ],
    especialidadesAbogado: ['Infracciones de tránsito', 'Defensa penal', 'Responsabilidad civil'],
    serviciosAnunciante: [],
    preguntasSugeridas: [
      '¿Qué consecuencias tiene circular en sentido contrario?',
      '¿Puedo impugnar si la señalización era confusa?',
      '¿Qué pasa si causé un accidente?'
    ]
  },
  'uso_celular': {
    pasosASeguir: [
      'La multa por usar celular al conducir es de 10-20 días de salario mínimo',
      'Si te grabaron o fotografiaron, será difícil impugnar',
      'Revisa que la boleta tenga todos los datos correctos',
      'Si decides impugnar, necesitas evidencia de que NO estabas usando el celular',
      'Paga con 50% de descuento en los primeros 15 días'
    ],
    especialidadesAbogado: ['Infracciones de tránsito', 'Derecho administrativo'],
    serviciosAnunciante: [],
    preguntasSugeridas: [
      '¿Puedo impugnar si solo estaba cambiando música?',
      '¿Cuántos puntos me quitan?',
      '¿El manos libres está permitido?'
    ]
  },
  'cinturon_seguridad': {
    pasosASeguir: [
      'La multa por no usar cinturón es de aproximadamente 5-10 días de salario mínimo',
      'Si todos los ocupantes no lo usaban, puede haber una multa por cada uno',
      'Verifica que la boleta tenga los datos correctos',
      'Esta infracción es difícil de impugnar salvo errores en la boleta',
      'Paga con descuento en los primeros 15 días'
    ],
    especialidadesAbogado: ['Infracciones de tránsito'],
    serviciosAnunciante: [],
    preguntasSugeridas: [
      '¿Es obligatorio para pasajeros traseros?',
      '¿Aplica para embarazadas?',
      '¿Cuánto es la multa exacta?'
    ]
  },
  'seguro_vencido': {
    pasosASeguir: [
      'Circular sin seguro vigente es infracción GRAVE',
      'Tu vehículo puede ser retenido hasta que presentes póliza vigente',
      'Si tuviste accidente sin seguro, eres responsable de TODOS los daños',
      'Renueva tu seguro lo antes posible - hay opciones desde $3,000 anuales',
      'Algunos estados requieren seguro de responsabilidad civil obligatorio'
    ],
    especialidadesAbogado: ['Seguros', 'Responsabilidad civil', 'Infracciones de tránsito'],
    serviciosAnunciante: ['Aseguradora'],
    preguntasSugeridas: [
      '¿Qué pasa si tuve accidente sin seguro?',
      '¿Cuál es el seguro mínimo obligatorio?',
      '¿Dónde contrato un seguro económico?'
    ]
  },
  'verificacion_vencida': {
    pasosASeguir: [
      'Verifica tu último holograma y la fecha de vencimiento',
      'Agenda cita en un centro de verificación autorizado',
      'Si tu vehículo no pasa, tienes plazo para repararlo y reintentar',
      'La multa por verificación vencida es de aproximadamente 20 días de salario mínimo',
      'Algunos estados tienen programas de prórroga - consulta si aplica'
    ],
    especialidadesAbogado: ['Trámites vehiculares', 'Derecho administrativo'],
    serviciosAnunciante: ['Taller mecanico'],
    preguntasSugeridas: [
      '¿Dónde verifico mi auto?',
      '¿Qué pasa si no paso la verificación?',
      '¿Puedo circular con verificación vencida?'
    ]
  },
  'licencia_vencida': {
    pasosASeguir: [
      'Circular con licencia vencida es infracción que puede resultar en retención del vehículo',
      'Agenda cita en Secretaría de Movilidad para renovación',
      'Requisitos: INE, comprobante de domicilio, licencia anterior, examen de la vista',
      'El costo de renovación varía por tipo de licencia ($500-$1,500 aproximadamente)',
      'No manejes hasta renovar - si te detienen, el auto va al corralón'
    ],
    especialidadesAbogado: ['Trámites vehiculares', 'Derecho administrativo'],
    serviciosAnunciante: ['Gestoria'],
    preguntasSugeridas: [
      '¿Dónde renuevo mi licencia?',
      '¿Qué documentos necesito?',
      '¿Puedo manejar con licencia vencida mientras tramito?'
    ]
  },
  'placas_vencidas': {
    pasosASeguir: [
      'Revisa la fecha de vencimiento en tu tarjeta de circulación',
      'Agenda cita para reemplacamiento en Secretaría de Movilidad',
      'Requisitos: factura, INE, comprobante de domicilio, último pago de tenencia',
      'El costo incluye placas nuevas, tarjeta de circulación y holograma',
      'Mientras tanto, evita circular para no arriesgarte a multa o corralón'
    ],
    especialidadesAbogado: ['Trámites vehiculares', 'Derecho administrativo'],
    serviciosAnunciante: ['Gestoria'],
    preguntasSugeridas: [
      '¿Cada cuántos años debo cambiar placas?',
      '¿Qué documentos necesito para reemplacar?',
      '¿Puedo circular con placas vencidas?'
    ]
  },
  'tenencia_adeudo': {
    pasosASeguir: [
      'Consulta tu adeudo en el portal de la Secretaría de Finanzas de tu estado',
      'Puedes pagar en línea, banco o en las oficinas de recaudación',
      'Si tienes varios años de adeudo, pregunta por programas de condonación',
      'Sin pago de tenencia no puedes hacer reemplacamiento ni verificación',
      'El adeudo de tenencia puede generar recargos mensuales'
    ],
    especialidadesAbogado: ['Derecho fiscal', 'Trámites vehiculares'],
    serviciosAnunciante: ['Gestoria'],
    preguntasSugeridas: [
      '¿Dónde consulto mi adeudo de tenencia?',
      '¿Hay programas de descuento por adeudos?',
      '¿Qué pasa si no pago la tenencia?'
    ]
  },
  'retencion_vehiculo': {
    pasosASeguir: [
      'Pide al oficial el motivo exacto de la retención y número de folio',
      'Anota ubicación del corralón donde llevarán tu vehículo',
      'Reúne documentos: INE, tarjeta de circulación, comprobante de propiedad',
      'Paga la multa correspondiente en banco o en línea',
      'Acude al corralón con comprobante de pago y documentos para liberar'
    ],
    especialidadesAbogado: ['Infracciones de tránsito', 'Derecho administrativo'],
    serviciosAnunciante: ['Grua', 'Gestoria'],
    preguntasSugeridas: [
      '¿Cuánto cuesta el corralón por día?',
      '¿Qué documentos necesito para sacar mi auto?',
      '¿Pueden retener mi auto sin darme boleta?'
    ]
  },
  'choque_estacionado': {
    pasosASeguir: [
      'Si el responsable huyó, toma fotos de los daños inmediatamente',
      'Busca testigos o cámaras de seguridad cercanas',
      'Levanta denuncia en Ministerio Público (tienes 72 horas)',
      'Reporta a tu seguro - algunos cubren daños de terceros no identificados',
      'Revisa si hay fragmentos del otro vehículo (pueden ayudar a identificarlo)'
    ],
    especialidadesAbogado: ['Accidentes de tránsito', 'Responsabilidad civil', 'Seguros'],
    serviciosAnunciante: ['Taller', 'Ajustador'],
    preguntasSugeridas: [
      '¿Cómo denuncio si no sé quién me chocó?',
      '¿Mi seguro cubre si el otro huyó?',
      '¿Qué hago si no hay testigos?'
    ]
  },
  'lesiones_accidente': {
    pasosASeguir: [
      'URGENTE: Llama al 911 inmediatamente si hay heridos',
      'NO muevas a los heridos a menos que haya peligro inminente (fuego, etc.)',
      'El accidente con lesionados REQUIERE Ministerio Público',
      'Tu seguro debe cubrir gastos médicos del tercero (si tienes cobertura amplia)',
      'Busca asesoría legal - puede haber cargos penales por lesiones culposas',
      'Documenta todo: fotos, testigos, reporte médico'
    ],
    especialidadesAbogado: ['Defensa penal', 'Responsabilidad civil', 'Accidentes con lesionados'],
    serviciosAnunciante: ['Ajustador'],
    preguntasSugeridas: [
      '¿Qué pasa si el herido demanda?',
      '¿Mi seguro cubre los gastos médicos?',
      '¿Puedo ir a la cárcel por un accidente con heridos?'
    ]
  },
  'homicidio_culposo': {
    pasosASeguir: [
      'SITUACIÓN MUY GRAVE: Contacta un abogado penalista INMEDIATAMENTE',
      'NO hagas declaraciones sin tu abogado presente',
      'El homicidio culposo por accidente de tránsito tiene pena de 2-7 años de prisión',
      'Tu seguro puede cubrir la reparación del daño (indemnización a la familia)',
      'La reparación del daño puede reducir la pena considerablemente',
      'Coopera con las autoridades pero siempre con asesoría legal'
    ],
    especialidadesAbogado: ['Defensa penal', 'Homicidio culposo', 'Derecho penal'],
    serviciosAnunciante: [],
    preguntasSugeridas: [
      '¿Puedo evitar la cárcel?',
      '¿Qué es la reparación del daño?',
      '¿Cuánto tiempo de prisión puedo enfrentar?'
    ]
  },
  'mordida_corrupcion': {
    pasosASeguir: [
      'NUNCA pagues directamente al oficial - es delito para ambos',
      'Pide su identificación y número de placa',
      'Solicita la boleta oficial de infracción',
      'Puedes grabar la interacción (es legal en vía pública)',
      'Denuncia al 089 o en la Contraloría Municipal',
      'Si ya pagaste, aún puedes denunciar con fecha, hora y descripción del oficial'
    ],
    especialidadesAbogado: ['Derechos humanos', 'Derecho administrativo', 'Anticorrupción'],
    serviciosAnunciante: [],
    preguntasSugeridas: [
      '¿Dónde denuncio a un oficial corrupto?',
      '¿Es legal grabar a un policía?',
      '¿Qué hago si me amenazan por no pagar?'
    ]
  },
  'retiro_llaves': {
    pasosASeguir: [
      'El oficial NO tiene derecho a quitarte las llaves del vehículo',
      'Pide su identificación y número de placa',
      'Graba la interacción si es posible',
      'Llama al 089 para reportar el abuso',
      'Solo pueden retirar tu vehículo con grúa oficial si hay infracción grave',
      'Denuncia en la Contraloría o Comisión de Derechos Humanos'
    ],
    especialidadesAbogado: ['Derechos humanos', 'Abuso de autoridad'],
    serviciosAnunciante: [],
    preguntasSugeridas: [
      '¿Pueden quitarme las llaves?',
      '¿Dónde denuncio abuso de autoridad?',
      '¿Qué hago si no me devuelven las llaves?'
    ]
  },
  'operativo_alcoholimetro': {
    pasosASeguir: [
      'Coopera con el operativo - negarte agrava tu situación',
      'Tienes derecho a ver que el alcoholímetro esté calibrado',
      'El límite legal es 0.4 g/L en sangre (aproximadamente 2 cervezas)',
      'Si das positivo: multa + arresto 20-36 horas + vehículo al corralón',
      'Puedes solicitar una segunda prueba',
      'Si te niegas a la prueba, se presume positivo'
    ],
    especialidadesAbogado: ['Defensa penal', 'Alcoholimetría', 'Infracciones de tránsito'],
    serviciosAnunciante: ['Grua'],
    preguntasSugeridas: [
      '¿Puedo negarme a soplar?',
      '¿Cuánto alcohol puedo tener legalmente?',
      '¿Qué pasa si doy positivo?'
    ]
  },
  'daño_propiedad': {
    pasosASeguir: [
      'Si chocaste contra propiedad privada (casa, negocio), debes reportarlo',
      'Toma fotos de los daños causados',
      'Intercambia datos con el propietario',
      'Reporta a tu seguro si tienes cobertura de daños a terceros',
      'Llega a un acuerdo o espera la valoración del daño',
      'Si huyes, cometes delito de daño en propiedad ajena'
    ],
    especialidadesAbogado: ['Responsabilidad civil', 'Seguros', 'Daños y perjuicios'],
    serviciosAnunciante: ['Ajustador', 'Taller'],
    preguntasSugeridas: [
      '¿Mi seguro cubre daños a propiedad?',
      '¿Qué pasa si no puedo pagar el daño?',
      '¿Puedo ir a la cárcel por dañar propiedad?'
    ]
  },
  'transporte_publico': {
    pasosASeguir: [
      'Si tuviste accidente en transporte público, documenta todo',
      'Toma foto de la placa, número económico y ruta',
      'Pide datos del conductor y de la empresa concesionaria',
      'La empresa de transporte tiene seguro obligatorio para pasajeros',
      'Puedes demandar a la empresa y al conductor por negligencia',
      'Acude al Ministerio Público si hay lesiones'
    ],
    especialidadesAbogado: ['Responsabilidad civil', 'Accidentes de tránsito', 'Daños y perjuicios'],
    serviciosAnunciante: [],
    preguntasSugeridas: [
      '¿Puedo demandar al chofer del camión?',
      '¿La empresa de transporte tiene seguro?',
      '¿Cómo reclamo indemnización?'
    ]
  },
  'motocicleta': {
    pasosASeguir: [
      'El casco es OBLIGATORIO - sin casco la multa es de 10-20 días de salario',
      'Debes circular por carril derecho (excepto para rebasar)',
      'Está prohibido circular entre carriles (lane splitting)',
      'Se requiere licencia tipo A específica para motocicleta',
      'El seguro de responsabilidad civil es obligatorio',
      'En accidente, el motociclista tiene los mismos derechos que un automovilista'
    ],
    especialidadesAbogado: ['Infracciones de tránsito', 'Accidentes de motocicleta'],
    serviciosAnunciante: ['Grua', 'Taller'],
    preguntasSugeridas: [
      '¿Qué licencia necesito para moto?',
      '¿Puedo circular entre carriles?',
      '¿Qué pasa si me accidento en moto?'
    ]
  },
  'bicicleta': {
    pasosASeguir: [
      'Los ciclistas tienen los mismos derechos que los vehículos motorizados',
      'Debes circular por ciclovía cuando exista, o por carril derecho',
      'Es obligatorio usar casco y luces/reflejantes de noche',
      'Si te atropellan, el conductor motorizado tiene mayor responsabilidad',
      'Puedes demandar daños si un auto te lesiona',
      'Toma fotos, busca testigos y denuncia en MP si hay lesiones'
    ],
    especialidadesAbogado: ['Accidentes de tránsito', 'Responsabilidad civil', 'Derechos del ciclista'],
    serviciosAnunciante: [],
    preguntasSugeridas: [
      '¿Qué derechos tengo como ciclista?',
      '¿Puedo demandar si me atropellan?',
      '¿Es obligatorio usar casco en bici?'
    ]
  },
  'taxi_uber_didi': {
    pasosASeguir: [
      'Si tuviste accidente en Uber/Didi, documenta todo en la app',
      'Toma fotos del vehículo, conductor y daños',
      'La plataforma tiene seguro que cubre accidentes durante viajes',
      'Puedes reclamar a través de la app o directamente con la aseguradora',
      'Si hay lesiones graves, acude al Ministerio Público',
      'Guarda el historial del viaje en la aplicación como evidencia'
    ],
    especialidadesAbogado: ['Accidentes de tránsito', 'Responsabilidad civil', 'Derechos del consumidor'],
    serviciosAnunciante: [],
    preguntasSugeridas: [
      '¿Uber/Didi tiene seguro para pasajeros?',
      '¿Cómo reclamo si tuve accidente en Uber?',
      '¿Puedo demandar al conductor y a la plataforma?'
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
  private clusteringUrl: string;
  private conversationStates: Map<string, ConversationState> = new Map();
  private foroService: ForoInteligenteService;
  private learningService: AdaptiveLearningService;
  private conversationService: ConversationService;

  constructor(pool: Pool, ragUrl: string = 'http://rag:3009', conversationService: ConversationService, clusteringUrl: string = 'http://clustering:3002') {
    this.pool = pool;
    this.ragUrl = ragUrl;
    this.clusteringUrl = clusteringUrl;
    this.foroService = new ForoInteligenteService(pool);
    this.learningService = new AdaptiveLearningService(pool);
    this.conversationService = conversationService;
  }

  /**
   * Llamar al servicio de clustering ML para clasificar el tema
   */
  private async llamarServicioClustering(mensaje: string): Promise<{
    cluster: string;
    confianza: number;
    alternativas: Array<{ cluster: string; confianza: number }>;
  } | null> {
    try {
      const response = await fetch(`${this.clusteringUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textoConsulta: mensaje }),
        signal: AbortSignal.timeout(5000) // Timeout de 5 segundos
      });

      if (!response.ok) {
        console.warn(`⚠️ Clustering service respondió con status ${response.status}`);
        return null;
      }

      const data = await response.json();
      console.log(`🎯 Clustering ML: cluster=${data.cluster}, confianza=${data.confianza}`);
      return data;
    } catch (error: any) {
      console.warn(`⚠️ Error llamando a clustering service: ${error.message}`);
      return null;
    }
  }

  private mapearClusterATema(cluster: string): string {
    const mapeo: { [key: string]: string } = {
      'C1': 'exceso_velocidad',      
      'C2': 'estacionamiento',       
      'C3': 'alcoholemia',           
      'C4': 'documentos',            
      'C5': 'accidente',             
      'C6': 'vuelta_prohibida',      
      'off_topic': 'off_topic'
    };
    return mapeo[cluster] || 'general';
  }

  
  async detectarTemaConConfianza(mensaje: string): Promise<{
    tema: string;
    confianza: number;
    esOffTopic: boolean;
    necesitaClarificacion: boolean;
    razonOffTopic?: string;
  }> {
    
    const clusteringResult = await this.llamarServicioClustering(mensaje);
    if (clusteringResult) {
      const temaInterno = this.mapearClusterATema(clusteringResult.cluster);
      const esOffTopic = clusteringResult.cluster === 'off_topic';
      
      console.log(`🤖 Usando Clustering ML: ${clusteringResult.cluster} → tema=${temaInterno}, confianza=${clusteringResult.confianza}`);
      
      return {
        tema: temaInterno,
        confianza: clusteringResult.confianza,
        esOffTopic: esOffTopic,
        necesitaClarificacion: clusteringResult.confianza < 0.6,
        razonOffTopic: esOffTopic ? 'No relacionado con tránsito o leyes vehiculares' : undefined
      };
    }
    
    // === FALLBACK: Usar detección local si clustering falla ===
    console.log(`⚠️ Clustering ML no disponible, usando detección local de patrones`);
    
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
    // Palabras que indican que NO es solo saludo - EXTENDIDA
    const palabrasContenido = [
      'accidente', 'choque', 'multa', 'licencia', 'policia', 'policía', 'chota', 
      'grua', 'grúa', 'detuvieron', 'ayuda', 'derechos', 'problema', 'denuncia',
      'renovar', 'renuevo', 'renovacion', 'sacar', 'tramite', 'trámite', 'donde',
      'dónde', 'como', 'cómo', 'puedo', 'necesito', 'quiero', 'tengo', 'me',
      'documento', 'papeles', 'seguro', 'verificacion', 'tarjeta', 'placas',
      'chocaron', 'atropello', 'alcohol', 'borracho', 'mordida', 'corrupcion',
      'infraccion', 'boleta', 'pagar', 'impugnar', 'corralon', 'estacionamiento'
    ];
    const tieneContenido = palabrasContenido.some(p => msgLower.includes(p));
    // Solo es saludo puro si: coincide con patron social, es muy corto, y NO tiene contenido
    const coincideSocial = socialPatterns.some(p => msgLower.includes(p));
    const esSoloSaludo = coincideSocial && msgLower.length < 25 && !tieneContenido;
    const noTienePregunta = !msgLower.includes('que hago') && !msgLower.includes('qué hago') && !msgLower.includes('como') && !msgLower.includes('cómo') && !msgLower.includes('donde') && !msgLower.includes('dónde') && !msgLower.includes('sabes') && !msgLower.includes('puedo') && !msgLower.includes('puedes');
    if (esSoloSaludo && noTienePregunta) {
      return {
        tema: 'social',
        confianza: 0.95,
        esOffTopic: false,
        necesitaClarificacion: false
      };
    }

    // === PRIORIDAD 0.8: FUGA DE AUTORIDAD / EVASIÓN ===
    // Detectar cuando alguien huyó de un agente de tránsito
    const fugaAutoridadPatterns = [
      // Patrones directos de fuga
      'me fui a la fuga', 'me di a la fuga', 'hui', 'huí', 'huir', 
      'me escape', 'me escapé', 'escape del', 'escapé del',
      'no pare', 'no paré', 'no me detuve', 'no me pare', 'no me paré',
      'segui de largo', 'seguí de largo', 'segui manejando', 'seguí manejando',
      'acelere', 'aceleré', 'le acelere', 'le aceleré',
      'me pele', 'me pelé', 'me fui', 'sali corriendo', 'salí corriendo',
      // Contexto de señal de alto ignorada
      'torreta', 'sirena', 'señal de alto', 'alto y no pare',
      'me pidio que parara', 'me pidió que parara', 'me hizo la seña',
      'me sono la torreta', 'me sonó la torreta', 'prendio las torretas',
      'prendió las torretas', 'encendio las luces', 'encendió las luces',
      // Slang/coloquial
      'le saque la vuelta', 'le saqué la vuelta', 'me le pele', 'me le pelé',
      'no le hice caso', 'lo ignore', 'lo ignoré', 'evadi', 'evadí'
    ];
    
    // Contexto de autoridad de tránsito
    const contextoAutoridad = [
      'agente', 'oficial', 'transito', 'tránsito', 'policia', 'policía',
      'patrulla', 'operativo', 'reten', 'retén'
    ];
    
    const tieneFugaPattern = fugaAutoridadPatterns.some(p => msgLower.includes(p));
    const tieneContextoAutoridad = contextoAutoridad.some(p => msgLower.includes(p));
    
    // Si menciona fuga Y contexto de autoridad = muy alta confianza
    if (tieneFugaPattern && tieneContextoAutoridad) {
      matchCount = fugaAutoridadPatterns.filter(p => msgLower.includes(p)).length;
      confianza = Math.min(0.98, 0.75 + (matchCount * 0.08));
      return { tema: 'fuga_autoridad', confianza, esOffTopic: false, necesitaClarificacion: false };
    }
    
    // Si solo menciona fuga pero con suficientes indicadores
    if (tieneFugaPattern) {
      matchCount = fugaAutoridadPatterns.filter(p => msgLower.includes(p)).length;
      if (matchCount >= 2 || msgLower.includes('torreta') || msgLower.includes('sirena')) {
        confianza = Math.min(0.9, 0.6 + (matchCount * 0.1));
        return { tema: 'fuga_autoridad', confianza, esOffTopic: false, necesitaClarificacion: confianza < 0.7 };
      }
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
    
    // === PRIORIDAD 1.5: ALCOHOLEMIA / DUI (antes de derechos) ===
    // Detectar PRIMERO si es caso de alcohol para evitar que "detuvieron" lo capture como "derechos"
    const alcoholemiaPatterns = [
      'alcohol', 'borracho', 'ebrio', 'ebriedad', 'alcoholimetro', 'alcoholímetro',
      'tomado', 'tomada', 'cerveza', 'copa', 'copas', 'toxico', 'tóxico',
      'operativo', 'soplar', 'sople', 'soplé', 'prueba de alcohol',
      'manejando tomado', 'manejando borracho', 'manejando ebrio',
      'estado de ebriedad', 'aliento', 'pedote', 'pedo', 'bien pedo',
      'crudo', 'resaca', 'alcoholizado', 'nivel de alcohol',
      'positivo', 'dio positivo', 'dieron positivo', 'arriba del limite',
      'arriba del límite', 'limite de alcohol', 'límite de alcohol'
    ];
    
    const contextoManejo = ['manejando', 'conduciendo', 'volante', 'carro', 'auto', 'coche', 'vehiculo', 'vehículo', 'troca', 'nave'];
    
    const tieneAlcoholPattern = alcoholemiaPatterns.some(p => msgLower.includes(p));
    const tieneContextoManejo = contextoManejo.some(p => msgLower.includes(p));
    
    // Si menciona alcohol + contexto de manejo = muy alta confianza para alcoholemia
    if (tieneAlcoholPattern && tieneContextoManejo) {
      matchCount = alcoholemiaPatterns.filter(p => msgLower.includes(p)).length;
      confianza = Math.min(0.98, 0.7 + (matchCount * 0.08));
      return { tema: 'alcoholemia', confianza, esOffTopic: false, necesitaClarificacion: false };
    }
    
    // Si solo menciona alcohol con suficientes indicadores
    if (tieneAlcoholPattern) {
      matchCount = alcoholemiaPatterns.filter(p => msgLower.includes(p)).length;
      if (matchCount >= 2 || msgLower.includes('operativo') || msgLower.includes('alcoholimetro') || msgLower.includes('soplar')) {
        confianza = Math.min(0.95, 0.6 + (matchCount * 0.1));
        return { tema: 'alcoholemia', confianza, esOffTopic: false, necesitaClarificacion: confianza < 0.7 };
      }
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
      'agente me', 'oficial de transito', 'oficial de tránsito', 'agente de transito',
      // Slang mexicano para policía
      'chota', 'la chota', 'la tira', 'la julia', 'puerco', 'marrano', 'cuico',
      'me paro la chota', 'me detuvo la chota', 'la chota me', 'los polis'
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
      'accidente': { patterns: [
        'accidente', 'accidente', 'acidente',
        'choque', 'chocaron', 'chocar', 'colision', 'colisión',
        'golpe', 'impacto', 'volcadura', 'choqué', 'me chocaron', 'me pegaron', 'me dieron',
        'tuve un choque', 'hubo un choque', 'me accidente', 'me accidenté',
        'se fue', 'se peló', 'se pelo', 'el wey se fue', 'el man se fue', 'se dio a la fuga',
        // Slang y expresiones coloquiales que implican choque/colisión
        'le di en toda', 'le di en su madre', 'le di en toda su', 'le pegue', 'le pegué', 'me lo lleve', 'me lo llevé',
        'le lance el carro', 'le lancé el carro', 'le lanzo el carro', 'le lanzó el carro', 'le lanso el carro',
        'avente el carro', 'aventé el carro', 'me le fui con el carro', 'me le fui encima'
      ], peso: 0.18 },
      'atropello': { patterns: ['atropello', 'atropellado', 'atropellar', 'peaton', 'peatón', 'caminando', 'fuga', 'huyo', 'huyó', 'huir', 'escapó', 'dio a la fuga'], peso: 0.18 },
      'alcoholemia': { patterns: [
        'alcohol', 'borracho', 'ebrio', 'ebriedad', 'alcoholimetro', 'alcoholímetro', 'tomado', 
        'cerveza', 'copa', 'copas', 'toxico', 'tóxico', 'operativo', 'soplar', 'soplé', 'prueba',
        'manejando tomado', 'manejando borracho', 'manejando ebrio', 'estado de ebriedad',
        'aliento alcoholico', 'aliento alcohólico', 'me detuvieron', 'me agarraron',
        'pedo', 'pedote', 'bien pedo', 'crudo', 'resaca', 'alcoholizado'
      ], peso: 0.20 },
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
      'multa': { patterns: ['multa', 'infraccion', 'infracción', 'boleta', 'fotomulta', 'sancion', 'sanción', 'pagar multa'], peso: 0.12 },
      // === NUEVOS PATRONES DE DETECCIÓN ===
      'exceso_velocidad': { 
        patterns: ['velocidad', 'exceso', 'radar', 'iba rapido', 'iba rápido', 'rebase', 'rebasé', 'muy rapido', 'muy rápido', 'a alta velocidad', 'correr', 'corriendo', 'km/h', 'kilometros', 'kilómetros'], 
        peso: 0.16 
      },
      'vuelta_prohibida': { 
        patterns: ['vuelta prohibida', 'vuelta en u', 'di vuelta', 'dí vuelta', 'giro prohibido', 'no se puede dar vuelta', 
                  'retorno prohibido', 'di la vuelta', 'dí la vuelta', 'vuelta donde no', 'dando vuelta', 'dar vuelta',
                  'me agarro dando vuelta', 'me agarraron dando vuelta', 'vuelta en "u"', 'retorno', 'dando la vuelta'], 
        peso: 0.18 
      },
      'sentido_contrario': { 
        patterns: ['sentido contrario', 'contramano', 'contra flujo', 'direccion contraria', 'dirección contraria', 'un solo sentido', 'calle de un sentido'], 
        peso: 0.18 
      },
      'uso_celular': { 
        patterns: ['celular', 'telefono', 'teléfono', 'mensaje', 'whatsapp', 'usando el cel', 'mandando mensaje', 'hablando por telefono', 'hablando por teléfono', 'textear', 'texteando'], 
        peso: 0.16 
      },
      'cinturon_seguridad': { 
        patterns: ['cinturon', 'cinturón', 'sin cinturon', 'sin cinturón', 'no traia cinturon', 'no traía cinturón'], 
        peso: 0.18 
      },
      'seguro_vencido': { 
        patterns: ['seguro vencido', 'sin seguro', 'no tengo seguro', 'seguro expirado', 'poliza vencida', 'póliza vencida', 'no tenia seguro', 'no tenía seguro'], 
        peso: 0.18 
      },
      'verificacion_vencida': { 
        patterns: ['verificacion vencida', 'verificación vencida', 'sin verificar', 'no verificado', 'holograma vencido', 'verificar mi auto', 'donde verifico', 'dónde verifico'], 
        peso: 0.18 
      },
      'licencia_vencida': { 
        patterns: ['licencia vencida', 'licencia expirada', 'sin licencia', 'no tengo licencia', 'licencia caduca', 'renovar licencia', 'sacar licencia'], 
        peso: 0.18 
      },
      'placas_vencidas': { 
        patterns: ['placas vencidas', 'sin placas', 'placas expiradas', 'reemplacar', 'cambio de placas', 'nuevas placas'], 
        peso: 0.18 
      },
      'tenencia_adeudo': { 
        patterns: ['tenencia', 'adeudo', 'debo tenencia', 'no he pagado tenencia', 'impuesto vehicular', 'control vehicular'], 
        peso: 0.16 
      },
      'retencion_vehiculo': { 
        patterns: ['retuvieron mi', 'me retuvieron el', 'retencion', 'retención', 'me quitaron el carro', 'no me dejaron ir', 'infraccion grave', 'infracción grave'], 
        peso: 0.16 
      },
      'choque_estacionado': { 
        patterns: ['chocaron mi carro estacionado', 'me chocaron estacionado', 'golpearon mi carro', 'rayaron mi carro', 'daño estacionado', 'daño en estacionamiento', 'se fue el que me choco', 'se fue el que me chocó'], 
        peso: 0.18 
      },
      'lesiones_accidente': { 
        patterns: ['lesionado', 'herido', 'hospital', 'ambulancia', 'lesiones', 'heridas', 'accidente con heridos', 'alguien salio herido', 'alguien salió herido'], 
        peso: 0.20 
      },
      'homicidio_culposo': { 
        patterns: ['murio', 'murió', 'muerte', 'fallecio', 'falleció', 'homicidio', 'mate a alguien', 'maté a alguien', 'muerto', 'persona muerta', 'atropelle y murio', 'atropellé y murió'], 
        peso: 0.25 
      },
      'mordida_corrupcion': { 
        patterns: ['mordida', 'me pidio dinero', 'me pidió dinero', 'quiere lana', 'arreglar ahi', 'arreglar ahí', 'sin boleta', 'no me dio boleta', 'efectivo', 'extorsion', 'extorsión', 'corrupto'], 
        peso: 0.18 
      },
      'retiro_llaves': { 
        patterns: ['me quito las llaves', 'me quitó las llaves', 'quitar llaves', 'llaves del carro', 'no me devuelve las llaves', 'retuvo mis llaves'], 
        peso: 0.18 
      },
      'operativo_alcoholimetro': { 
        patterns: ['alcoholimetro', 'alcoholímetro', 'operativo', 'reten', 'retén', 'toxico', 'tóxico', 'soplar', 'prueba de alcohol', 'aliento'], 
        peso: 0.16 
      },
      'daño_propiedad': { 
        patterns: ['choque contra', 'choqué contra', 'pegue a', 'pegué a', 'daño a propiedad', 'casa', 'poste', 'barda', 'muro', 'negocio', 'tienda'], 
        peso: 0.16 
      },
      'transporte_publico': { 
        patterns: ['camion', 'camión', 'autobus', 'autobús', 'micro', 'combi', 'transporte publico', 'transporte público', 'chofer', 'conductor del camion', 'conductor del camión'], 
        peso: 0.15 
      },
      'motocicleta': { 
        patterns: ['moto', 'motocicleta', 'casco', 'sin casco', 'licencia tipo a', 'motoneta', 'scooter'], 
        peso: 0.15 
      },
      'bicicleta': { 
        patterns: ['bici', 'bicicleta', 'ciclista', 'ciclopista', 'ciclovia', 'ciclovía', 'atropellaron en bici'], 
        peso: 0.15 
      },
      'taxi_uber_didi': { 
        patterns: ['uber', 'didi', 'cabify', 'taxi', 'indriver', 'plataforma', 'viaje compartido', 'chofer de uber', 'conductor de didi'], 
        peso: 0.15 
      }
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
      },
      {
        patterns: ['divorcio', 'divorciarme', 'separacion', 'separación', 'matrimonio', 'esposo', 'esposa', 'conyuge', 'pensión alimenticia', 'custodia', 'hijos', 'familia'],
        razon: 'consulta de derecho familiar'
      },
      {
        patterns: ['laboral', 'trabajo', 'despido', 'renuncia', 'salario', 'sueldo', 'jefe', 'empresa', 'empleado'],
        razon: 'consulta laboral'
      },
      {
        patterns: ['renta', 'arrendamiento', 'inquilino', 'propietario', 'casa', 'departamento', 'vivienda', 'inmueble'],
        razon: 'consulta de arrendamiento'
      }
    ];
    
    // Verificar si hay contexto de tránsito que invalide off-topic
    const contextoTransito = [
      'multa', 'transito', 'tránsito', 'carro', 'auto', 'vehiculo', 'vehículo',
      'conducir', 'manejar', 'licencia', 'policia', 'policía', 'accidente',
      'impugnar', 'apelar', 'plazo', 'dias', 'días', 'tiempo tengo', 'cuanto tiempo',
      'cuánto tiempo', 'pagar', 'infraccion', 'infracción', 'boleta', 'corralon',
      'corralón', 'grua', 'grúa', 'seguro', 'verificacion', 'verificación',
      'semaforo', 'semáforo', 'estacionar', 'alcohol', 'alcoholimetro',
      // SLANG MEXICANO/CHIAPANECO - Agregado para detectar contexto de tránsito
      'poli', 'el poli', 'la poli', 'tira', 'la tira', 'chota', 'la chota',
      'bote', 'al bote', 'tambo', 'al tambo', 'detenido', 'detención',
      'mica', 'mi mica', 'la mica', 'papeles', 'mis papeles', 'documentos',
      'guantera', 'cajuela', 'marihuano', 'pacheco', 'drogado', 'pedote', 'pedo',
      'borracho', 'ebrio', 'tomado', 'alcoholizado', 'oficial', 'agente',
      'patrulla', 'retén', 'operativo'
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
      `Hola ${nombreUsuario}. Mi especialidad es ayudarte con temas de **tránsito y leyes vehiculares** en Chiapas.\n\nPuedo ayudarte con:\n• Multas e infracciones\n• Accidentes de tránsito\n• Licencias y documentos\n• Derechos del conductor\n• Estacionamiento y grúas\n\n¿En qué tema de tránsito puedo ayudarte?`,
      `${nombreUsuario}, soy **LexIA**, tu asistente especializado en **derecho de tránsito de Chiapas**.\n\nParece que tu pregunta es sobre ${razon}, pero mi conocimiento está enfocado en:\n• Infracciones y multas\n• Accidentes vehiculares\n• Trámites de tránsito\n• Derechos ante autoridades\n\n¿Tienes alguna duda sobre estos temas?`,
      `Hola ${nombreUsuario}. Aunque me encantaría ayudarte con eso, mi expertise es en **leyes de tránsito**.\n\nSi tienes alguna situación relacionada con:\n• Una multa o infracción\n• Un accidente\n• Documentos vehiculares\n• Tus derechos como conductor\n\nEstoy aquí para orientarte.`
    ];

    return respuestas[Math.floor(Math.random() * respuestas.length)];
  }

  /**
   * Generar pregunta de clarificación cuando la confianza es baja
   */
  generarPreguntaClarificacion(tema: string, nombreUsuario: string): string {
    const clarificaciones: { [key: string]: string } = {
      'multa': `${nombreUsuario}, quiero asegurarme de entenderte bien. ¿Tu consulta es sobre:\n\n1. **Pagar una multa** - dónde y cómo pagarla\n2. **Impugnar una multa** - crees que fue injusta\n3. **Entender la multa** - qué significa el código o monto\n\n¿Cuál describe mejor tu situación?`,
      'accidente': `${nombreUsuario}, para orientarte mejor sobre tu accidente, ¿podrías decirme:\n\n• ¿El accidente ya ocurrió o quieres saber qué hacer si te pasa?\n• ¿Hubo heridos?\n• ¿Ya tienes un reporte oficial?\n\nCon más detalles puedo darte pasos más específicos.`,
      'estacionamiento': `${nombreUsuario}, sobre tu situación de estacionamiento:\n\n• ¿Se llevaron tu carro al corralón?\n• ¿Te pusieron una multa por estacionar?\n• ¿Quieres saber dónde puedes estacionar?\n\n¿Qué describe mejor tu caso?`,
      'derechos': `${nombreUsuario}, para ayudarte con tus derechos, cuéntame más:\n\n• ¿Un oficial te detuvo o multó?\n• ¿Te pidieron dinero de forma irregular?\n• ¿Quieres saber si puedes grabar?\n\n¿Qué situación enfrentas?`,
      'general': `${nombreUsuario}, no estoy seguro de entender tu consulta. ¿Podrías darme más detalles sobre:\n\n• ¿Qué situación de tránsito enfrentas?\n• ¿Tienes algún documento o boleta relacionado?\n• ¿Cuál es tu preocupación principal?\n\nAsí podré orientarte mejor.`
    };

    return clarificaciones[tema] || clarificaciones['general'];
  }

  /**
   * Detectar el tema de la consulta (método legacy para compatibilidad)
   */
  async detectarTema(mensaje: string): Promise<string> {
    const resultado = await this.detectarTemaConConfianza(mensaje);
    return resultado.tema;
  }

  /**
   * Detectar tema de forma preliminar para la máquina de estados
   * Alias público de detectarTema para uso en index.ts
   */
  async detectarTemaPreliminar(mensaje: string): Promise<string> {
    return await this.detectarTema(mensaje);
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
        yaOfreceAnunciantes: false,
        temasConProfesionistasOfrecidos: [],
        temasConAnunciantesOfrecidos: [],
        nombreUsuario: ''  // Se establecerá en el primer mensaje
      });
    }
    return this.conversationStates.get(sessionId)!;;
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
   * Generar respuestas específicas para preguntas de accidentes
   */
  generarRespuestaAccidente(mensaje: string, nombreUsuario: string): string | null {
    const msgLower = mensaje.toLowerCase();
    
    // === PREGUNTA: ¿Mi seguro cubre estos daños? ===
    if ((msgLower.includes('seguro') && (msgLower.includes('cubre') || msgLower.includes('cubrir') || msgLower.includes('paga'))) ||
        (msgLower.includes('mi seguro') && msgLower.includes('daño'))) {
      return `${nombreUsuario}, sobre la **cobertura de tu seguro** en caso de accidente:\n\n` +
        `🛡️ **Tipos de cobertura:**\n\n` +
        `**Responsabilidad Civil (Obligatorio):**\n` +
        `• ✅ Daños a terceros (personas y vehículos)\n` +
        `• ❌ NO cubre daños a tu propio vehículo\n\n` +
        `**Cobertura Amplia:**\n` +
        `• ✅ Daños a terceros\n` +
        `• ✅ Daños a tu vehículo (choque, volcadura)\n` +
        `• ✅ Robo total y parcial\n` +
        `• ✅ Gastos médicos ocupantes\n\n` +
        `**Cobertura Limitada:**\n` +
        `• ✅ Daños a terceros\n` +
        `• ✅ Robo total\n` +
        `• ❌ Daños propios por choque\n\n` +
        `📋 **Pasos para usar tu seguro:**\n` +
        `1. Reporta a tu aseguradora en las primeras 24 hrs\n` +
        `2. No aceptes responsabilidad verbal\n` +
        `3. Espera al ajustador antes de mover el vehículo\n` +
        `4. Toma fotos de todo antes de que llegue\n\n` +
        `📞 **Números de emergencia aseguradoras:**\n` +
        `• GNP: 800-4444-467\n` +
        `• Qualitas: 800-800-2835\n` +
        `• AXA: 800-900-1292\n` +
        `• MAPFRE: 800-062-7373\n\n` +
        `¿Tienes seguro de cobertura amplia o solo responsabilidad civil?`;
    }
    
    // === PREGUNTA: ¿Cuánto tiempo tengo para demandar? ===
    if ((msgLower.includes('tiempo') || msgLower.includes('plazo')) && 
        (msgLower.includes('demandar') || msgLower.includes('demanda') || msgLower.includes('denuncia'))) {
      return `${nombreUsuario}, sobre los **plazos legales** después de un accidente:\n\n` +
        `⏰ **Tiempos importantes:**\n\n` +
        `**Para tu seguro:**\n` +
        `• ⚡ **24 horas** para reportar el siniestro\n` +
        `• 📋 30 días para entregar documentación completa\n\n` +
        `**Para demanda penal** (si hubo lesiones):\n` +
        `• ⚠️ **72 horas** para levantar denuncia (ideal)\n` +
        `• Hasta 1 año para delitos de lesiones\n\n` +
        `**Para demanda civil** (daños materiales):\n` +
        `• 📅 **2 años** de prescripción\n` +
        `• Mejor actuar en los primeros 6 meses\n\n` +
        `📍 **Dónde presentar:**\n` +
        `• **Denuncia penal**: Ministerio Público (si hay lesionados)\n` +
        `• **Demanda civil**: Juzgado Civil por daños\n` +
        `• **Queja tránsito**: Oficina de Tránsito Municipal\n\n` +
        `💡 **Tip**: Guarda TODA la evidencia - fotos, boletas, recibos médicos.\n\n` +
        `¿El otro conductor huyó o hay lesionados?`;
    }
    
    // === PREGUNTA: ¿Cómo presento la denuncia? ===
    if ((msgLower.includes('como') || msgLower.includes('cómo') || msgLower.includes('donde') || msgLower.includes('dónde')) && 
        (msgLower.includes('denuncia') || msgLower.includes('denuncio') || msgLower.includes('denunciar') || msgLower.includes('demanda'))) {
      return `${nombreUsuario}, aquí te explico **cómo presentar una denuncia** por accidente:\n\n` +
        `📋 **Paso a paso:**\n\n` +
        `**1️⃣ Si hay lesionados - DENUNCIA PENAL:**\n` +
        `   • Acude al Ministerio Público más cercano\n` +
        `   • Llevar: INE, boleta de tránsito, fotos, datos de testigos\n` +
        `   • Pedir: Carpeta de investigación\n\n` +
        `**2️⃣ Si solo son daños materiales - DEMANDA CIVIL:**\n` +
        `   • Primero intenta conciliar con el otro conductor\n` +
        `   • Si no hay acuerdo: abogado y demanda en Juzgado Civil\n\n` +
        `**3️⃣ Si el otro huyó - DENUNCIA + SEGURO:**\n` +
        `   • Reporta a tránsito inmediatamente (911)\n` +
        `   • Levanta denuncia en MP por "fuga"\n` +
        `   • Usa tu seguro (cobertura amplia cubre esto)\n\n` +
        `📍 **En Tuxtla Gutiérrez:**\n` +
        `• MP: Fiscalía General del Estado (8a Norte Poniente)\n` +
        `• Tránsito: Secretaría de Movilidad\n\n` +
        `¿Necesitas que te conecte con un abogado especialista?`;
    }
    
    // === PREGUNTA: Necesito grúa ===
    if (msgLower.includes('grua') || msgLower.includes('grúa') || msgLower.includes('remolque')) {
      return `${nombreUsuario}, aquí tienes opciones de **servicio de grúa** en Chiapas:\n\n` +
        `🚛 **Grúas disponibles 24/7:**\n\n` +
        `📞 **Si tienes seguro:**\n` +
        `• Llama a tu aseguradora - la grúa está incluida\n` +
        `• GNP: 800-4444-467\n` +
        `• Qualitas: 800-800-2835\n` +
        `• AXA: 800-900-1292\n\n` +
        `📞 **Grúas particulares en Tuxtla:**\n` +
        `• Grúas Chiapas Express: 961-123-4567 (24 hrs)\n` +
        `• Grúas del Sureste: 961-654-3210\n\n` +
        `💰 **Costos aproximados:**\n` +
        `• Arrastre local: $800 - $1,500\n` +
        `• Foráneo: $15-25 por km\n` +
        `• Maniobras especiales: +$500\n\n` +
        `⚠️ **Tips:**\n` +
        `• Antes de que llegue la grúa, toma fotos del vehículo\n` +
        `• Retira objetos de valor\n` +
        `• Pide factura del servicio\n\n` +
        `¿Tu seguro incluye servicio de grúa?`;
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
   * Genera empatía contextual basada en el tema y mensaje del usuario
   */
  private generarEmpatiaContextual(tema: string, mensaje: string, nombreUsuario: string): string {
    const msgLower = mensaje.toLowerCase();

    // Detectar situaciones específicas y emociones
    const esUrgente = msgLower.includes('urgente') || msgLower.includes('ayuda') || msgLower.includes('socorro');
    const estaPreocupado = msgLower.includes('preocup') || msgLower.includes('nerv') || msgLower.includes('asust');
    const seEscaparon = msgLower.includes('se fue') || msgLower.includes('huy') || msgLower.includes('escapó');
    const acabaDePasar = msgLower.includes('acaba') || msgLower.includes('ahorita') || msgLower.includes('ahora') ||
                          msgLower.includes('justo') || msgLower.includes('recien') || msgLower.includes('hace rato');

    let empatia = '';

    switch(tema) {
      case 'accidente':
        if (seEscaparon) {
          empatia = `${nombreUsuario}, entiendo tu frustración. Que el otro conductor se haya dado a la fuga es una situación difícil, pero mantén la calma - aún hay acciones que puedes tomar.`;
        } else if (acabaDePasar) {
          empatia = `${nombreUsuario}, respira profundo. Sé que acabas de pasar por un momento estresante. Lo primero es asegurarte de que estés bien.`;
        } else if (estaPreocupado) {
          empatia = `${nombreUsuario}, entiendo tu preocupación. Los accidentes son situaciones estresantes, pero vamos a revisar qué puedes hacer paso a paso.`;
        } else {
          empatia = `${nombreUsuario}, lamento que hayas tenido un accidente. Mantén la calma, te voy a guiar en los pasos a seguir.`;
        }
        break;

      case 'multa':
        if (estaPreocupado) {
          empatia = `${nombreUsuario}, no te preocupes. Las multas tienen solución y tienes opciones para manejar esta situación.`;
        } else {
          empatia = `${nombreUsuario}, entiendo que recibir una multa es frustrante. Veamos juntos tus opciones.`;
        }
        break;

      case 'alcohol':
        if (esUrgente || acabaDePasar) {
          empatia = `${nombreUsuario}, entiendo que es un momento tenso. Lo importante ahora es que conozcas tus derechos y sepas qué hacer.`;
        } else {
          empatia = `${nombreUsuario}, esta es una situación seria, pero con información correcta podemos ver cómo proceder.`;
        }
        break;

      case 'atropello':
        empatia = `${nombreUsuario}, lo primero es tu salud. Si estás leyendo esto, me alegra que puedas hacerlo. Vamos a revisar los pasos legales, pero recuerda: tu bienestar es prioridad.`;
        break;

      case 'derechos':
        empatia = `${nombreUsuario}, es importante que conozcas tus derechos. Nadie debe abusarse de su autoridad contigo.`;
        break;

      case 'impugnacion':
        empatia = `${nombreUsuario}, tienes derecho a defenderte. Veamos cómo puedes impugnar esta situación de la mejor manera.`;
        break;

      default:
        // Empatía genérica solo si detectamos urgencia o preocupación
        if (esUrgente || estaPreocupado) {
          empatia = `${nombreUsuario}, entiendo que necesitas orientación. Vamos a revisar tu situación paso a paso.`;
        }
    }

    return empatia;
  }

  /**
   * Genera la acción inmediata más importante según el tema
   */
  private generarAccionInmediata(tema: string, mensaje: string): string | null {
    const msgLower = mensaje.toLowerCase();

    switch(tema) {
      case 'accidente':
        const seEscaparon = msgLower.includes('se fue') || msgLower.includes('huy') || msgLower.includes('escapó');
        const hayHeridos = msgLower.includes('herido') || msgLower.includes('lesion') || msgLower.includes('sangr');

        if (seEscaparon) {
          return `1. **Llama al 911 AHORA** para reportar el conductor que huyó\n` +
                 `2. Toma fotos de los daños y la escena\n` +
                 `3. Busca testigos o cámaras de seguridad cercanas\n` +
                 `4. Ve al Ministerio Público a levantar denuncia (máximo 72 horas)`;
        } else if (hayHeridos) {
          return `1. **Llama al 911 inmediatamente** si hay heridos\n` +
                 `2. NO muevas los vehículos hasta que llegue tránsito\n` +
                 `3. Enciende luces de emergencia y asegura la zona`;
        } else {
          return `1. Asegura el área con luces de emergencia\n` +
                 `2. Toma fotos de daños, placas y posición de vehículos\n` +
                 `3. Intercambia datos con el otro conductor\n` +
                 `4. **Reporta a tu aseguradora en las próximas 24 horas**`;
        }

      case 'alcohol':
        return `1. Coopera con las autoridades sin resistirte\n` +
               `2. Pide que te muestren la calibración del alcoholímetro\n` +
               `3. Puedes solicitar una segunda prueba\n` +
               `4. Si te detienen, tienes derecho a UNA llamada`;

      case 'atropello':
        return `1. **Llama al 911 si necesitas ambulancia**\n` +
               `2. NO te muevas si sientes dolor en cuello/espalda\n` +
               `3. Intenta anotar la placa del vehículo\n` +
               `4. Pide datos a testigos presenciales`;

      case 'multa':
        const recienMulta = msgLower.includes('acaba') || msgLower.includes('ahorita') || msgLower.includes('ahora');
        if (recienMulta) {
          return `1. Revisa que los datos de la boleta sean correctos\n` +
                 `2. Tienes **15 días para pagar con 50% de descuento**\n` +
                 `3. Guarda la boleta en un lugar seguro`;
        }
        return null;

      case 'impugnacion':
        return `1. **Actúa rápido**: tienes 15 días hábiles para impugnar\n` +
               `2. Toma fotos de la zona con señalización\n` +
               `3. Reúne evidencia: testigos, videos, GPS`;

      default:
        return null;
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
    articulosLegales: ArticuloLegal[],
    contextoDetectado?: any
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
    
    // === PERSISTIR NOMBRE: Guardar nombre del usuario en el estado ===
    // Solo actualizar si se provee un nombre válido y no está ya guardado
    if (nombreUsuario && nombreUsuario !== 'Usuario' && !state.nombreUsuario) {
      state.nombreUsuario = nombreUsuario;
      console.log(`👤 Nombre guardado en estado: ${nombreUsuario}`);
    }
    // Usar el nombre guardado si existe, sino usar el parámetro actual
    const nombreFinal = state.nombreUsuario || nombreUsuario || 'Usuario';
    
    // === APRENDIZAJE: Detectar feedback del usuario ===
    const feedback = this.learningService.detectarFeedback(mensaje);
    if (feedback) {
      console.log(`🧠 Feedback detectado: ${feedback.tipo}`);
      
      // Si es una corrección, aprender de ella
      if (feedback.tipo === 'correccion' && feedback.correccionSugerida) {
        const nuevoTema = await this.detectarTema(feedback.correccionSugerida);
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
    const deteccion = await this.detectarTemaConConfianza(mensaje);
    console.log(`🎯 Detección: tema=${deteccion.tema}, confianza=${(deteccion.confianza * 100).toFixed(1)}%, offTopic=${deteccion.esOffTopic}`);
    
    // === VERIFICAR SEGUIMIENTO ANTES DE OFF-TOPIC ===
    // Evaluar si es pregunta de seguimiento ANTES de rechazar como off-topic
    const msgLower = mensaje.toLowerCase();
    const esSeguimiento = msgLower.length < 100 && (
      msgLower.includes('se fue') || msgLower.includes('huyo') || msgLower.includes('huyó') ||
      msgLower.includes('que hago') || msgLower.includes('qué hago') ||
      msgLower.includes('y ahora') || msgLower.includes('entonces') ||
      msgLower.includes('el wey') || msgLower.includes('el man') || msgLower.includes('el tipo') ||
      msgLower.includes('mi seguro') || msgLower.includes('el seguro') || msgLower.includes('cubre') ||
      msgLower.includes('la multa') || msgLower.includes('el oficial') ||
      msgLower.includes('cuanto') || msgLower.includes('cuánto') || msgLower.includes('cuesta') ||
      msgLower.includes('donde') || msgLower.includes('dónde') ||
      msgLower.includes('como') || msgLower.includes('cómo') ||
      msgLower.startsWith('y ') || msgLower.startsWith('pero ') ||
      msgLower.includes('estos daños') || msgLower.includes('este caso') ||
      msgLower.includes('necesito') || msgLower.includes('ocupo') || msgLower.includes('requiero') ||
      // Preguntas de defensa/seguimiento
      msgLower.includes('puedo defender') || msgLower.includes('me defiendo') ||
      msgLower.includes('me puedo defender') || msgLower.includes('como me defiendo') ||
      msgLower.includes('cómo me defiendo') || msgLower.includes('que pasos') ||
      msgLower.includes('qué pasos') || msgLower.includes('que sigue') ||
      msgLower.includes('qué sigue') || msgLower.includes('ahora que') ||
      msgLower.includes('ahora qué') || msgLower.includes('que hago ahora') ||
      msgLower.includes('qué hago ahora') || msgLower.includes('como procedo') ||
      msgLower.includes('cómo procedo') || msgLower.includes('que me recomiend') ||
      msgLower.includes('qué me recomiend') || msgLower.includes('como puedo') ||
      msgLower.includes('cómo puedo') || msgLower.includes('pasos a seguir') ||
      msgLower.includes('que debo hacer') || msgLower.includes('qué debo hacer')
    );
    
    // Si es seguimiento y hay tema activo, ANULAR la detección de off-topic
    if (esSeguimiento && state.temaActual && state.temaActual !== 'general') {
      console.log(`🔄 SEGUIMIENTO detectado con tema activo: "${state.temaActual}" - Anulando off-topic`);
      // Forzar el tema actual y continuar el flujo normal
      deteccion.tema = state.temaActual;
      deteccion.esOffTopic = false;
      deteccion.confianza = 0.9; // Alta confianza porque sabemos el contexto
    }
    
    // === CASO 1: OFF-TOPIC ===
    // Si clustering detecta off-topic Y NO es seguimiento, respetar esa clasificación
    if (deteccion.esOffTopic) {
      console.log(`🔍 OFF-TOPIC detectado: confianza=${deteccion.confianza}%`);
      console.log(`❌ Pregunta fuera del alcance del sistema legal`);
      
      // Generar respuesta educada explicando el alcance del sistema
      const respuestaOffTopic = this.generarRespuestaOffTopic(deteccion.razonOffTopic || '', nombreFinal);
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
        `Hola ${nombreFinal}. Soy **LexIA**, tu asistente legal de tránsito.\n\n¿En qué puedo ayudarte hoy?\n\nPuedes preguntarme sobre:\n• Multas e infracciones\n• Accidentes de tránsito\n• Tus derechos como conductor\n• Documentos vehiculares`,
        `Bienvenido ${nombreFinal}. Estoy aquí para ayudarte con cualquier duda de tránsito en Chiapas.\n\n¿Tienes alguna situación específica?`,
        `Hola ${nombreFinal}, ¿en qué tema de tránsito puedo orientarte?\n\nMultas | Accidentes | Documentos | Derechos`
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
    

    // === CASO 4: NECESITA CLARIFICACIÓN (baja confianza) ===
    // EXCEPCIÓN: Temas urgentes NUNCA piden clarificación - dar respuesta completa de inmediato
    const temasUrgentesNoClarificar = ['accidente', 'atropello', 'alcohol', 'derechos'];
    const esTemaUrgente = temasUrgentesNoClarificar.includes(deteccion.tema);
    
    if (deteccion.necesitaClarificacion && state.turno <= 2 && !esTemaUrgente) {
      const preguntaClarificacion = this.generarPreguntaClarificacion(deteccion.tema, nombreFinal);
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
    
    // === MEMORIA DE CONTEXTO ===
    // NOTA: La evaluación de esSeguimiento ya se hizo arriba para anular off-topic
    // Aquí solo manejamos otros casos de mantener contexto
    
    // Servicios que son de seguimiento en contexto de accidente
    const esServicioAccidente = (msgLower.includes('grua') || msgLower.includes('grúa') || 
      msgLower.includes('taller') || msgLower.includes('aseguradora') || msgLower.includes('seguro')) &&
      state.temaActual === 'accidente';
    
    // Casos adicionales donde mantener contexto (además del seguimiento ya evaluado):
    // 1. Tema es general pero hay tema activo y es seguimiento
    // 2. Tema detectado con baja confianza (<=0.65) pero hay tema activo relevante
    // 3. Pide servicio relacionado a accidente (grúa, taller) estando en contexto de accidente
    const mantenerContexto = state.temaActual && state.temaActual !== 'general' && (
      (esSeguimiento && (tema === 'general' || (deteccion.confianza <= 0.65 && tema !== state.temaActual))) ||
      esServicioAccidente
    );
    
    // Debug: mostrar evaluación de seguimiento
    if (esSeguimiento && state.temaActual) {
      console.log(`🔍 DEBUG Seguimiento: esSeguimiento=true, temaActual="${state.temaActual}", temaDetectado="${tema}", confianza=${(deteccion.confianza*100).toFixed(0)}%`);
    }
    
    if (mantenerContexto) {
      console.log(`🔄 Manteniendo contexto: "${tema}" (${(deteccion.confianza*100).toFixed(0)}%) → "${state.temaActual}" (seguimiento)`);
      tema = state.temaActual;
    }
    
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

    // === GENERACIÓN DE RESPUESTA CON LLM (Ollama) ===
  // 1. Construir contexto para el LLM
  const UMBRAL_SIMILITUD_RAG = 0.35; // antes 0.62, bajamos para no perder artículos
  const articulosRelevantes = articulosLegales.filter(art => (art.similitud || 0) >= UMBRAL_SIMILITUD_RAG);
  
  // Limitar a los 5 más relevantes para Ollama (balance entre detalle y velocidad)
  const articulosParaOllama = articulosRelevantes.slice(0, 5);
  console.log(`📚 RAG articulos totales=${articulosLegales.length}, relevantes>=${UMBRAL_SIMILITUD_RAG} => ${articulosRelevantes.length}, enviando a Ollama: ${articulosParaOllama.length}`);
	
  let contextoRAG = '';
  if (articulosParaOllama.length > 0) {
    contextoRAG = articulosParaOllama.map(art => 
      `[Fuente: ${art.fuente} - ${art.titulo}]\n${art.contenido}`
    ).join('\n\n---\n\n');
  } else {
    // Si no hay artículos relevantes del RAG, dejar vacío para que Ollama use templates
    contextoRAG = '';
  }

  // Log de diagnóstico del contexto RAG
  if (contextoRAG && contextoRAG.length > 0) {
    const preview = contextoRAG.split(/\r?\n/).slice(0, 12).join('\n');
    console.log(`📚 Contexto RAG (${tema}) preview:\n${preview}`);
  } else {
    console.log(`📚 Contexto RAG vacío para tema '${tema}'.`);
  }
	
	// 2. Obtener historial de conversación (últimos 5 mensajes)
const historial = await this.conversationService.getConversationHistory(sessionId, 5);
const historialConversacion = historial.map((msg: any) =>
  `${msg.rol === 'user' ? 'USUARIO' : 'LEXIA'}: ${msg.mensaje}`
).join('\n');

	// 2.5. Detectar emoción del mensaje para ajustar tono de Ollama
	const mensajeLower = mensaje.toLowerCase();
	const patronesEnojo = ['verga', 'puta', 'culero', 'pendejo', 'cabrón', 'chingada'];
	const patronesPreocupacion = ['preocup', 'nerv', 'miedo', 'asust', 'qué hago'];
	const patronesDesesperacion = ['ayuda', 'urgente', 'por favor', 'necesito'];
	const patronesFrustración = ['no sé', 'no entiendo', 'no puedo', 'perdí'];

	let emocionDetectada: 'enojado' | 'preocupado' | 'neutral' | 'frustrado' | 'desesperado' = 'neutral';
	const cantidadGroserias = patronesEnojo.filter(p => mensajeLower.includes(p)).length;

	if (cantidadGroserias >= 3) {
	  emocionDetectada = 'enojado';
	} else if (patronesDesesperacion.some(p => mensajeLower.includes(p))) {
	  emocionDetectada = 'desesperado';
	} else if (patronesPreocupacion.some(p => mensajeLower.includes(p))) {
	  emocionDetectada = 'preocupado';
	} else if (patronesFrustración.some(p => mensajeLower.includes(p))) {
	  emocionDetectada = 'frustrado';
	}

	console.log(`😊 Emoción detectada para Ollama: ${emocionDetectada}`);

	// 3. Generar respuesta usando Ollama con contexto emocional y tema RAG
	console.log(`📚 Tema/Cluster RAG detectado: ${tema}`);

	const respuestaLLM = await ollamaResponseGenerator.generarRespuestaSintetizada(
	  nombreFinal,
	  mensaje,
	  contextoRAG,
	  historialConversacion,
	  tema, // Ya se pasa el tema, pero ahora Ollama lo usará explícitamente
	  emocionDetectada,
	  contextoDetectado
	);

  respuesta += respuestaLLM + '\n\n';

  // Añadir sección Base Legal explícita cuando haya artículos del RAG
  if (articulosRelevantes.length > 0) {
    respuesta += '\n**Base Legal:**\n\n';
    const maxItems = Math.min(3, articulosRelevantes.length);
    for (let i = 0; i < maxItems; i++) {
      const art = articulosRelevantes[i];
      const firstLine = (art.contenido || '').split(/\r?\n/)[0].trim();
      const resumen = firstLine.length > 0 ? firstLine : (art.titulo || 'Artículo');
      respuesta += `**• ${art.titulo}**\n${resumen}\n\n`;
    }
  }

    // === RECOMENDACIÓN DE PROFESIONISTAS ===
    // Mostrar inmediatamente en temas que requieren asesoría profesional
    const temasUrgentes = ['accidente', 'impugnacion', 'derechos', 'atropello', 'alcohol'];
    const mostrarProfesionistas = temasUrgentes.includes(tema) || state.turno >= 1;
    
    // Inicializar arrays si no existen (para sesiones antiguas)
    if (!state.temasConProfesionistasOfrecidos) {
      state.temasConProfesionistasOfrecidos = [];
    }
    if (!state.temasConAnunciantesOfrecidos) {
      state.temasConAnunciantesOfrecidos = [];
    }
    
    // Verificar si ya se ofrecieron profesionistas para ESTE TEMA específico
    const yaOfrecidoProfesionistasParaEsteTema = state.temasConProfesionistasOfrecidos.includes(tema);
    
    console.log(`[PROFESIONISTAS] tema=${tema}, mostrar=${mostrarProfesionistas}, yaOfrecidoParaTema=${yaOfrecidoProfesionistasParaEsteTema}, temasOfrecidos=${JSON.stringify(state.temasConProfesionistasOfrecidos)}`);
    
    if (mostrarProfesionistas && !yaOfrecidoProfesionistasParaEsteTema && config.especialidadesAbogado.length > 0) {
      profesionistas = await this.getTopProfesionistas(config.especialidadesAbogado);

      if (profesionistas.length > 0) {
        // Cards se renderizan en frontend; evitamos duplicar contenido en texto
        state.temasConProfesionistasOfrecidos.push(tema);
        state.yaOfreceRecomendacion = true;
        ofrecerMatch = true;

        console.log(`[PROFESIONISTAS] Ofrecidos ${profesionistas.length} para tema ${tema}`);
      }
    }
    
    // === RECOMENDACIÓN DE ANUNCIANTES ===
    // Verificar si ya se ofrecieron anunciantes para ESTE TEMA específico
    const yaOfrecidoAnunciantesParaEsteTema = state.temasConAnunciantesOfrecidos.includes(tema);
    
    if (config.serviciosAnunciante.length > 0 && !yaOfrecidoAnunciantesParaEsteTema) {
      anunciantes = await this.getAnunciantes(config.serviciosAnunciante);
      
      if (anunciantes.length > 0) {
        // Cards se renderizan en frontend; evitamos duplicar contenido en texto
        state.temasConAnunciantesOfrecidos.push(tema);
        state.yaOfreceAnunciantes = true;
        
        console.log(`[ANUNCIANTES] Ofrecidos ${anunciantes.length} para tema ${tema}`);
      }
    }
    
    // === FORO INTELIGENTE ===
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
    
    // === CIERRE ===
    respuesta += `\n¿En qué más puedo ayudarte, ${nombreFinal}?`;
    
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
      'accidente': `⚖️ **Base legal sobre accidentes de tránsito:**

• **Responsabilidad civil:** Ambos conductores pueden ser responsables según las circunstancias
• **Fuga del lugar:** Es delito penal (hasta 5 años de prisión)
• **Con heridos:** Se considera delito culposo, requiere Ministerio Público
• **Reporte obligatorio:** Máximo 72 horas para denunciar ante autoridades

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
      'fuga_autoridad': `${nombreUsuario}, entiendo que estás preocupado. **No detenerte ante la señal de alto de un agente de tránsito es una infracción GRAVE** que puede escalar a delito penal.

🚨 **RESPUESTA DIRECTA:**
Al no detenerte ante la señal de alto de un agente de tránsito, infringiste la **Ley General de Movilidad y Seguridad Vial** y potencialmente el **Código Penal** dependiendo de las circunstancias.

⚖️ **MARCO LEGAL:**
• **Art. 68 Ley General de Movilidad:** Obediencia a señales de agentes
• **Art. 178 Código Penal Federal:** Desobediencia a mandato de autoridad
• **Reglamento de Tránsito Local:** Infracciones graves por evasión

📊 **CONSECUENCIAS SEGÚN GRAVEDAD:**

| Escenario | Consecuencia | Multa aproximada |
|-----------|--------------|------------------|
| **Fuga sin persecución** | Infracción grave | 20-40 días salario mínimo (~$5,000-$10,000 MXN) |
| **Fuga con persecución** | Delito de resistencia | Hasta 2 años prisión |
| **Fuga causando daños** | Delito agravado | 2-5 años prisión + reparación |
| **Fuga con lesionados** | Delito grave | 5-10 años prisión |

🔴 **TU SITUACIÓN ES URGENTE SI:**
• La patrulla te siguió y tomó tus placas
• Hay cámaras de vigilancia en la zona
• Causaste algún daño material o a personas
• Fue en un operativo oficial

📋 **QUÉ HACER AHORA (PASOS INMEDIATOS):**

1️⃣ **CALMA** - No huyas más, no destruyas evidencia

2️⃣ **EVALÚA** - ¿Te siguieron? ¿Tomaron tus placas? ¿Hay cámaras?

3️⃣ **DOCUMENTA** - Anota hora, lugar exacto, y circunstancias

4️⃣ **CONSULTA ABOGADO** - Antes de cualquier acción con autoridades
   🔹 Especialista en: Derecho Penal o Defensa de Infracciones Graves

5️⃣ **NO te presentes voluntariamente** sin asesoría legal

6️⃣ **PREPÁRATE** - Podrían buscarte en tu domicilio registrado (tarjeta de circulación)

⚠️ **ADVERTENCIA IMPORTANTE:**
Si te persiguieron y tienes tus placas registradas, es probable que ya exista una orden o citatorio. Consulta con un abogado penalista ANTES de actuar.

💼 **PROFESIONALES RECOMENDADOS:**
• **Abogado penalista** - Para preparar tu defensa
• **Abogado en tránsito** - Si solo fue infracción administrativa

¿Te persiguieron o solo te marcaron el alto y seguiste? Esto cambia completamente la estrategia a seguir.

`,
      // === CONOCIMIENTO INTERNO EXPANDIDO ===
      'exceso_velocidad': `${nombreUsuario}, sobre tu **multa por exceso de velocidad**:

🚨 **MARCO LEGAL:**
• **Reglamento de Tránsito:** Establece límites máximos por tipo de vía
• **Ley de Movilidad:** Sanciones por rebasar límites de velocidad

📊 **LÍMITES DE VELOCIDAD EN CHIAPAS:**
| Tipo de vía | Límite máximo |
|-------------|---------------|
| Zona escolar | 20 km/h |
| Zona residencial | 30 km/h |
| Vías urbanas | 40-60 km/h |
| Carreteras | 80-110 km/h |

💰 **MULTAS POR EXCESO:**
• **1-20 km/h sobre límite:** 5-10 días de salario mínimo (~$1,250-$2,500 MXN)
• **21-40 km/h sobre límite:** 10-20 días (~$2,500-$5,000 MXN)
• **Más de 40 km/h:** 20-40 días + posible retención de licencia

📸 **SI FUE POR RADAR/FOTOMULTA:**
• Verifica que el equipo tenga calibración vigente
• Puedes solicitar copia del certificado de calibración
• Si no está calibrado, es argumento para impugnar

⚖️ **PARA IMPUGNAR:**
1. Verifica datos de la boleta (fecha, hora, ubicación)
2. Solicita evidencia fotográfica al municipio
3. Revisa si el radar tenía certificación vigente
4. Tienes 15 días hábiles para presentar recurso

`,
      'vuelta_prohibida': `${nombreUsuario}, sobre tu **infracción por vuelta prohibida**:

🚨 **CONSECUENCIAS:**
• **Multa:** 10-15 días de salario mínimo (~$2,500-$3,750 MXN)
• **Puntos:** 3-4 puntos en tu licencia

⚖️ **PUEDES IMPUGNAR SI:**
• No había señalización clara de prohibición
• La señal estaba obstruida, borrosa o tapada
• La señal era ambigua o contradictoria
• Había trabajos de construcción que modificaron el flujo

📸 **EVIDENCIA QUE NECESITAS:**
• Fotos del lugar desde tu perspectiva como conductor
• Foto de la señalización (o ausencia de ella)
• Video si lo tienes (dashcam)
• Testigos si es posible

⏰ **PLAZO:** 15 días hábiles para impugnar ante Juzgado Cívico

`,
      'sentido_contrario': `${nombreUsuario}, circular en **sentido contrario** es una infracción MUY GRAVE:

🚨 **CONSECUENCIAS:**
• **Multa:** 20-40 días de salario mínimo (~$5,000-$10,000 MXN)
• **Puntos:** 6-8 puntos en tu licencia
• **Posible retención** del vehículo si causó riesgo

⚠️ **SI CAUSASTE ACCIDENTE:**
• Responsabilidad civil TOTAL por los daños
• Si hay lesionados: Delito culposo (2-7 años prisión)
• Tu seguro puede RECHAZAR la cobertura por negligencia grave

⚖️ **DEFENSA POSIBLE:**
• Señalización inexistente, confusa o mal ubicada
• Obras que modificaron el sentido sin aviso
• Condiciones climáticas que impidieron ver señales

📋 **QUÉ HACER:**
1. Si te multaron: paga con descuento o impugna si tienes evidencia
2. Si causaste daños: reporta a tu seguro INMEDIATAMENTE
3. Si hay lesionados: NO huyas, llama al 911 y espera a las autoridades

`,
      'uso_celular': `${nombreUsuario}, sobre la **multa por usar el celular**:

🚨 **MARCO LEGAL:**
El uso de dispositivos móviles al conducir está **PROHIBIDO** en todo México.

💰 **CONSECUENCIAS:**
• **Multa:** 10-20 días de salario mínimo (~$2,500-$5,000 MXN)
• **Puntos:** 3-4 puntos en tu licencia

📱 **LO QUE ESTÁ PROHIBIDO:**
❌ Hablar sosteniendo el teléfono
❌ Escribir mensajes/WhatsApp
❌ Ver videos o redes sociales
❌ Usar GPS sosteniendo el celular

✅ **LO QUE SÍ ESTÁ PERMITIDO:**
• Usar manos libres (bluetooth, bocina del auto)
• GPS fijo en soporte (no en la mano)
• Hablar con sistema integrado del vehículo

⚖️ **DIFÍCIL DE IMPUGNAR:**
Esta infracción es complicada de impugnar si el oficial te vio claramente. Solo impugna si:
• Puedes demostrar que NO estabas usando el celular
• Hay error en los datos de la boleta

💡 **RECOMENDACIÓN:**
Paga con el 50% de descuento en los primeros 15 días.

`,
      'cinturon_seguridad': `${nombreUsuario}, sobre la **multa por no usar cinturón**:

🚨 **ES OBLIGATORIO:**
El cinturón de seguridad es obligatorio para **TODOS** los ocupantes del vehículo.

💰 **MULTA:**
• 5-10 días de salario mínimo (~$1,250-$2,500 MXN)
• Puede haber multa por CADA ocupante sin cinturón

👶 **CASOS ESPECIALES:**
• **Niños menores de 12 años:** Deben ir en asiento trasero con cinturón o sistema de retención infantil
• **Embarazadas:** SÍ deben usar cinturón (ajustado bajo el vientre)
• **Personas con discapacidad:** Pueden solicitar exención médica

⚖️ **MUY DIFÍCIL DE IMPUGNAR:**
Esta infracción casi no tiene defensa. Solo si:
• El vehículo es anterior a 1985 (sin cinturones de fábrica)
• Hay error en los datos de la boleta

💡 **RECOMENDACIÓN:**
Paga con descuento y usa siempre el cinturón - puede salvarte la vida.

`,
      'seguro_vencido': `${nombreUsuario}, circular **sin seguro vigente** es una infracción GRAVE:

🚨 **CONSECUENCIAS:**
• **Multa:** 20-40 días de salario mínimo (~$5,000-$10,000 MXN)
• **Retención del vehículo** hasta presentar póliza vigente
• En algunos estados: arresto administrativo

⚠️ **SI TUVISTE ACCIDENTE SIN SEGURO:**
• Eres responsable de TODOS los daños (propios y del tercero)
• Puedes ser demandado civilmente
• Si hay lesionados: posible responsabilidad penal
• Embargo de bienes si no puedes pagar

💰 **COSTO DE UN SEGURO:**
• **Responsabilidad civil básica:** $3,000-$5,000 anuales
• **Cobertura amplia:** $8,000-$15,000 anuales
• **Todo riesgo:** $15,000-$30,000 anuales

📋 **QUÉ HACER AHORA:**
1. Contrata un seguro HOY MISMO (hay opciones en línea)
2. Si tu auto está retenido, lleva la póliza nueva al corralón
3. Si tuviste accidente: busca asesoría legal URGENTE

🔴 **IMPORTANTE:**
El seguro de responsabilidad civil es OBLIGATORIO en varios estados de México. No lo pienses, contrata uno.

`,
      'verificacion_vencida': `${nombreUsuario}, sobre tu **verificación vehicular**:

🚨 **ES OBLIGATORIA:**
La verificación es obligatoria en la mayoría de los estados para controlar emisiones contaminantes.

💰 **MULTA POR NO VERIFICAR:**
• 15-30 días de salario mínimo (~$3,750-$7,500 MXN)
• Posible retención del vehículo hasta regularizar

📅 **CALENDARIO DE VERIFICACIÓN:**
Generalmente se verifica según el último dígito de tu placa:
| Dígito | Meses |
|--------|-------|
| 1-2 | Enero-Febrero |
| 3-4 | Marzo-Abril |
| 5-6 | Mayo-Junio |
| 7-8 | Julio-Agosto |
| 9-0 | Septiembre-Octubre |

🔧 **SI TU AUTO NO PASA:**
1. Tienes un período de gracia (usualmente 20 días) para reparar
2. Llévalo a un taller autorizado para diagnóstico
3. Repara y vuelve a verificar
4. Si sigue sin pasar, puede requerir convertidor catalítico nuevo

💡 **TIP:**
Verifica en las primeras semanas de tu período para tener tiempo de reparar si no pasa.

`,
      'licencia_vencida': `${nombreUsuario}, sobre tu **licencia de conducir vencida**:

🚨 **CONSECUENCIAS DE CIRCULAR CON LICENCIA VENCIDA:**
• **Multa:** 10-20 días de salario mínimo (~$2,500-$5,000 MXN)
• **Retención del vehículo** hasta que alguien con licencia vigente lo recoja
• En accidente: tu seguro puede rechazar la cobertura

📋 **REQUISITOS PARA RENOVAR:**
• Licencia anterior (aunque esté vencida)
• INE vigente
• Comprobante de domicilio reciente
• Examen de la vista (en algunos casos)
• Pago de derechos ($500-$1,500 según tipo)

📍 **DÓNDE RENOVAR:**
• Secretaría de Movilidad de tu estado
• Módulos de atención autorizados
• Algunos trámites se pueden iniciar en línea

⏰ **TIEMPO DE TRÁMITE:**
• Cita previa: 1-2 semanas de anticipación
• Trámite en oficina: 1-2 horas
• Entrega: mismo día o hasta 5 días hábiles

⚠️ **IMPORTANTE:**
NO manejes hasta renovar. Si te detienen, pierdes el auto temporalmente y la multa es mayor.

`,
      'placas_vencidas': `${nombreUsuario}, sobre tus **placas vencidas**:

🚨 **CONSECUENCIAS:**
• **Multa:** 15-30 días de salario mínimo (~$3,750-$7,500 MXN)
• **Posible retención** del vehículo hasta regularizar

📋 **REQUISITOS PARA REEMPLACAR:**
• Tarjeta de circulación anterior
• Factura original del vehículo
• INE del propietario
• Comprobante de domicilio
• Pago de tenencia al corriente
• Verificación vigente (donde aplique)
• Pago de derechos de placas nuevas

💰 **COSTOS APROXIMADOS:**
• Placas nuevas: $1,000-$2,000
• Tarjeta de circulación: $300-$600
• Total incluyendo trámites: $1,500-$3,000

📅 **CADA CUÁNTOS AÑOS:**
• La mayoría de estados: cada 5 años
• Algunos estados: cada 3 años
• Revisa tu tarjeta de circulación para la fecha exacta

💡 **TIP:**
Puedes agendar cita en línea en la Secretaría de Movilidad para evitar filas.

`,
      'tenencia_adeudo': `${nombreUsuario}, sobre tu **adeudo de tenencia**:

💰 **¿QUÉ ES LA TENENCIA?**
Es un impuesto anual por tener un vehículo. Aunque algunos estados la "eliminaron", puede seguir aplicando para autos de cierto valor.

🔍 **CÓMO CONSULTAR TU ADEUDO:**
1. Portal de la Secretaría de Finanzas de tu estado
2. Con tu número de placas o NIV
3. En oficinas de recaudación con tu tarjeta de circulación

📊 **CONSECUENCIAS DE NO PAGAR:**
• Recargos mensuales (2-3% mensual)
• No puedes reemplacar ni verificar
• No puedes vender el vehículo legalmente
• Posible embargo en casos extremos

💵 **PROGRAMAS DE DESCUENTO:**
Muchos estados ofrecen:
• Descuentos por pronto pago (10-15%)
• Condonación de recargos (1-2 veces al año)
• Planes de pago a meses

📍 **DÓNDE PAGAR:**
• Portal en línea de tu estado
• Bancos autorizados
• Oficinas de recaudación
• Tiendas de conveniencia (en algunos estados)

💡 **RECOMENDACIÓN:**
Paga en enero para aprovechar descuentos por pronto pago.

`,
      'retencion_vehiculo': `${nombreUsuario}, si **retuvieron tu vehículo**:

🚨 **MOTIVOS COMUNES DE RETENCIÓN:**
• Sin licencia o licencia vencida
• Sin tarjeta de circulación
• Sin seguro vigente
• Infracción grave (exceso de velocidad, alcohol)
• Documentos irregulares

📋 **QUÉ HACER INMEDIATAMENTE:**
1. Pide el **número de folio** y **motivo** de la retención
2. Anota **ubicación exacta del corralón**
3. Pide copia de la boleta de infracción
4. Toma foto de tu vehículo antes de que se lo lleven

📍 **PARA RECUPERAR TU AUTO:**
1. Paga la multa (banco o en línea)
2. Reúne documentos: INE, tarjeta de circulación, comprobante de pago
3. Acude al corralón en horario de atención
4. Paga grúa + pensión diaria
5. Revisa tu vehículo ANTES de firmar la entrega

💰 **COSTOS APROXIMADOS:**
• **Grúa:** $500-$1,500
• **Pensión diaria:** $100-$300 por día
• **Multa:** variable según infracción

⚠️ **IMPORTANTE:**
Recupera tu auto lo antes posible - la pensión se acumula cada día.

`,
      'choque_estacionado': `${nombreUsuario}, si **chocaron tu auto estacionado**:

📋 **SI EL RESPONSABLE HUYÓ:**

1️⃣ **DOCUMENTA TODO:**
• Fotos de los daños desde varios ángulos
• Foto de la ubicación donde estaba estacionado
• Busca fragmentos del otro vehículo (pueden identificarlo)

2️⃣ **BUSCA EVIDENCIA:**
• Cámaras de seguridad cercanas (negocios, casas)
• Testigos que hayan visto algo
• Pregunta a vecinos o vigilantes

3️⃣ **DENUNCIA:**
• Tienes 72 horas para denunciar en Ministerio Público
• Lleva fotos y cualquier evidencia

4️⃣ **REPORTA A TU SEGURO:**
• Si tienes cobertura amplia, puede cubrir daños de tercero no identificado
• Tendrás que pagar el deducible

⚠️ **SI IDENTIFICAS AL RESPONSABLE:**
• Puedes demandarlo civilmente
• Presenta denuncia con los datos (placas, descripción)
• Tu seguro puede perseguir el cobro

💡 **PARA PREVENIR:**
• Estaciona en lugares con cámaras de vigilancia
• Instala dashcam con modo estacionamiento

`,
      'lesiones_accidente': `${nombreUsuario}, un **accidente con lesionados** es una situación GRAVE que requiere actuar correctamente:

🚨 **PRIMERO - ATENCIÓN MÉDICA:**
1. Llama al **911** inmediatamente
2. NO muevas a los heridos (a menos que haya peligro inminente)
3. Si sabes primeros auxilios, aplícalos
4. Espera a la ambulancia

⚖️ **MARCO LEGAL:**
• Accidente con lesiones = **Delito culposo** (no intencional pero con responsabilidad)
• Se requiere **Ministerio Público** (no solo tránsito)
• Pena: 6 meses a 7 años de prisión (dependiendo de gravedad)

📋 **TUS OBLIGACIONES:**
• NO huyas - huir agrava la situación enormemente
• Proporciona tus datos a la autoridad
• Reporta a tu seguro INMEDIATAMENTE
• Coopera con la investigación

💼 **TU SEGURO PUEDE CUBRIR:**
• Gastos médicos del lesionado (hasta el límite de tu póliza)
• Indemnización por incapacidad
• Defensa legal

⚠️ **IMPORTANTE:**
• NO admitas culpa verbalmente
• NO firmes nada sin leer
• BUSCA un abogado penalista si las lesiones son graves

`,
      'homicidio_culposo': `${nombreUsuario}, entiendo que esta es una situación MUY DIFÍCIL. El **homicidio culposo en accidente de tránsito** es un delito grave que requiere asesoría legal INMEDIATA.

⚖️ **MARCO LEGAL:**
• **Código Penal:** Homicidio culposo = muerte causada sin intención
• **Pena:** 2-7 años de prisión (puede reducirse con atenuantes)
• **Agravantes:** Alcohol, drogas, exceso de velocidad, fuga

📋 **QUÉ HACER AHORA:**

1️⃣ **BUSCA UN ABOGADO PENALISTA INMEDIATAMENTE**
   • No declares nada sin tu abogado presente
   • Es tu derecho constitucional

2️⃣ **NO HUYAS**
   • La fuga convierte el delito en MÁS GRAVE
   • Quédate en el lugar hasta que lleguen autoridades

3️⃣ **COOPERA CON LA AUTORIDAD**
   • Pero ejerce tu derecho a no autoincriminarte
   • Tu abogado te dirá qué decir y qué no

4️⃣ **REPARACIÓN DEL DAÑO**
   • Indemnización a la familia de la víctima
   • PUEDE reducir significativamente la pena
   • Tu seguro puede cubrir parte de esto

💰 **TU SEGURO:**
• Notifica a tu aseguradora INMEDIATAMENTE
• Cobertura de responsabilidad civil aplica
• Puede incluir defensa legal

⚠️ **ATENUANTES QUE PUEDEN REDUCIR LA PENA:**
• No estabas bajo influencia de alcohol/drogas
• Respetabas los límites de velocidad
• No huiste
• Ofreciste reparación del daño
• Buen comportamiento previo

🔴 **ESTO ES URGENTE:**
Busca asesoría legal especializada HOY. No enfrentes esto solo.

`,
      'mordida_corrupcion': `${nombreUsuario}, si un oficial te está pidiendo **"mordida"** o dinero irregular:

🚨 **TUS DERECHOS:**
• NUNCA estás obligado a pagar en efectivo al oficial
• TODO pago debe ser mediante boleta oficial en banco
• Puedes grabar la interacción (es legal en vía pública)

📋 **QUÉ HACER EN EL MOMENTO:**

1️⃣ **MANTÉN LA CALMA**
   • No confrontes agresivamente
   • Sé firme pero respetuoso

2️⃣ **PIDE IDENTIFICACIÓN**
   • Nombre completo y número de placa
   • Unidad a la que pertenece

3️⃣ **SOLICITA BOLETA OFICIAL**
   • "Oficial, prefiero la boleta para pagar en el banco"
   • Si no hay infracción real, no pueden multarte

4️⃣ **GRABA SI ES POSIBLE**
   • Es tu derecho en vía pública
   • Puede ser evidencia si decides denunciar

5️⃣ **DENUNCIA:**
   • **089** - Línea de denuncia anónima
   • **Contraloría Municipal** - Denuncia formal
   • **CEDH** - Comisión de Derechos Humanos

⚠️ **SI CEDISTE Y PAGASTE:**
Aún puedes denunciar después:
• Anota fecha, hora, lugar, descripción del oficial
• Denuncia en Contraloría o Asuntos Internos

💡 **PREVENCIÓN:**
• Lleva siempre tus documentos en regla
• Conoce tus derechos
• Graba todo cuando te detengan

`,
      'retiro_llaves': `${nombreUsuario}, si un oficial te **quitó las llaves** del vehículo:

🚨 **ESTO ES ILEGAL:**
Los oficiales de tránsito **NO tienen facultad** para quitarte las llaves de tu vehículo.

⚖️ **LO QUE SÍ PUEDEN HACER:**
• Pedirte documentos (licencia, tarjeta, seguro)
• Multarte con boleta oficial
• Solicitar grúa para remolcar (en infracciones graves)
• Retenerte brevemente para verificar documentos

❌ **LO QUE NO PUEDEN HACER:**
• Quitarte las llaves
• Subirse a tu vehículo sin tu permiso
• Retenerte indefinidamente
• Pedirte dinero en efectivo

📋 **QUÉ HACER:**

1️⃣ **GRABA LA INTERACCIÓN**
   • Es evidencia de abuso de autoridad

2️⃣ **PIDE IDENTIFICACIÓN**
   • Nombre, número de placa, unidad

3️⃣ **LLAMA AL 089**
   • Reporta el abuso en el momento

4️⃣ **SOLICITA PRESENCIA DE SUPERVISOR**
   • Tienes derecho a que venga un superior

5️⃣ **DENUNCIA FORMAL:**
   • Contraloría Municipal
   • Comisión de Derechos Humanos (CEDH)
   • Asuntos Internos de la corporación

⚠️ **IMPORTANTE:**
No forcejees ni intentes recuperar las llaves físicamente. Documenta todo y denuncia después.

`,
      'operativo_alcoholimetro': `${nombreUsuario}, sobre los **operativos de alcoholímetro**:

📊 **LÍMITES LEGALES:**
• **0.4 g/L en sangre** = Límite máximo permitido
• Equivale aproximadamente a 1-2 cervezas (varía por persona)
• **Tolerancia cero** para menores de edad y conductores de transporte público

🚨 **CONSECUENCIAS SI DAS POSITIVO:**

| Nivel de alcohol | Consecuencia |
|------------------|--------------|
| 0.4 - 0.8 g/L | Multa + arresto 20-36 hrs + corralón |
| 0.8 - 1.5 g/L | Multa mayor + arresto + suspensión licencia 1 año |
| Más de 1.5 g/L | Multa máxima + arresto + suspensión 3 años + posible proceso penal |

✅ **TUS DERECHOS EN EL OPERATIVO:**
• Ver que el alcoholímetro esté calibrado (sello y fecha)
• Solicitar una segunda prueba
• Negarte a la prueba (pero se presume positivo)
• No ser maltratado

📋 **SI DAS POSITIVO:**
1. Coopera con las autoridades
2. Tu vehículo irá al corralón
3. Serás trasladado al Juzgado Cívico
4. Después del arresto, paga multa para recuperar auto

💡 **RECOMENDACIONES:**
• Si vas a beber, usa taxi o conductor designado
• Espera al menos 1 hora por cada bebida antes de manejar
• Come antes de beber (reduce absorción)

`,
      'daño_propiedad': `${nombreUsuario}, si **chocaste contra una propiedad** (casa, negocio, poste, etc.):

📋 **QUÉ HACER INMEDIATAMENTE:**

1️⃣ **NO HUYAS**
   • Huir es delito de daño en propiedad ajena + fuga
   • Agrava tu situación considerablemente

2️⃣ **DOCUMENTA TODO**
   • Fotos de los daños (tu auto y la propiedad)
   • Fotos del lugar
   • Datos de testigos

3️⃣ **BUSCA AL PROPIETARIO**
   • Intercambia datos (nombre, teléfono, INE)
   • Si no está, deja una nota con tus datos

4️⃣ **REPORTA A TU SEGURO**
   • Cobertura de daños a terceros aplica
   • Ellos enviarán ajustador para valorar

⚖️ **TU RESPONSABILIDAD:**
• Debes pagar la reparación de los daños causados
• Si tienes seguro: tu aseguradora paga (menos deducible)
• Si NO tienes seguro: pagas de tu bolsillo

💰 **COSTOS COMUNES:**
• Barda/muro: $5,000 - $50,000
• Poste de luz: $15,000 - $80,000
• Fachada de negocio: $10,000 - $100,000+

⚠️ **SI NO PUEDES PAGAR:**
• El afectado puede demandarte civilmente
• Pueden embargar bienes hasta cubrir el daño
• Busca un acuerdo de pago a plazos

`,
      'transporte_publico': `${nombreUsuario}, si tuviste un **accidente en transporte público**:

⚖️ **TUS DERECHOS COMO PASAJERO:**
• El transportista tiene **obligación de seguridad**
• Deben contar con **seguro obligatorio** para pasajeros
• Puedes demandar a la empresa Y al conductor

📋 **QUÉ HACER:**

1️⃣ **DOCUMENTA TODO:**
• Número de unidad (económico)
• Placas del vehículo
• Nombre de la ruta/línea
• Fotos del interior y exterior
• Datos del conductor si es posible

2️⃣ **BUSCA TESTIGOS:**
• Otros pasajeros
• Peatones
• Pide sus datos de contacto

3️⃣ **ATENCIÓN MÉDICA:**
• Ve al doctor aunque te sientas bien
• Guarda todos los comprobantes médicos
• El reporte médico es evidencia importante

4️⃣ **DENUNCIA:**
• Ministerio Público (si hay lesiones)
• Procuraduría de Protección al Consumidor
• Secretaría de Movilidad

💰 **PUEDES RECLAMAR:**
• Gastos médicos
• Días de incapacidad (salario perdido)
• Daño moral (por dolor y sufrimiento)
• Daños materiales (objetos dañados)

🔴 **PLAZO:**
Tienes hasta 2 años para demandar daños civiles.

`,
      'motocicleta': `${nombreUsuario}, sobre las **reglas para motocicletas**:

📋 **OBLIGACIONES DEL MOTOCICLISTA:**

🪖 **CASCO:**
• OBLIGATORIO para conductor y acompañante
• Debe tener certificación DOT, ECE o NOM
• Multa por no usarlo: 10-20 días de salario (~$2,500-$5,000 MXN)

📄 **DOCUMENTOS:**
• Licencia tipo A (específica para moto)
• Tarjeta de circulación
• Seguro de responsabilidad civil
• Verificación (donde aplique)

🛣️ **REGLAS DE CIRCULACIÓN:**
• Circular por carril derecho
• NO circular entre carriles (lane splitting)
• NO circular por banqueta o áreas peatonales
• Luces encendidas de día y noche

❌ **PROHIBICIONES:**
• Más de un pasajero (excepto motos diseñadas para dos)
• Sujetar objetos que impidan maniobrar
• Circular sin ambas manos en el manubrio

⚠️ **EN CASO DE ACCIDENTE:**
• Tienes los mismos derechos que un automovilista
• El otro conductor NO puede alegar que "la moto es más peligrosa"
• Tu seguro debe cubrirte igual

💡 **TIP:**
Usa equipo de protección completo (guantes, botas, chamarra). En accidente, esto reduce lesiones significativamente.

`,
      'bicicleta': `${nombreUsuario}, sobre los **derechos del ciclista**:

⚖️ **TUS DERECHOS:**
• Los ciclistas tienen los **MISMOS DERECHOS** que los vehículos motorizados
• Los autos deben guardar **1.5 metros de distancia** al rebasarte
• Tienes derecho a usar un carril completo si es necesario

📋 **TUS OBLIGACIONES:**
• Usar ciclovía cuando exista
• Si no hay ciclovía: circular por carril derecho
• Usar casco (obligatorio en varios estados)
• Luces y reflejantes de noche
• Respetar semáforos y señales

🚨 **SI TE ATROPELLAN:**

1️⃣ **BUSCA ATENCIÓN MÉDICA**
   • Aunque te sientas bien, ve al doctor
   • Guarda todos los comprobantes

2️⃣ **DOCUMENTA TODO:**
   • Placas del vehículo
   • Fotos del lugar y de tu bici
   • Datos del conductor
   • Testigos

3️⃣ **DENUNCIA:**
   • Ministerio Público si hay lesiones
   • El conductor es responsable aunque no haya "chocado" directamente

💰 **PUEDES RECLAMAR:**
• Gastos médicos
• Reparación o reposición de la bicicleta
• Días de incapacidad
• Daño moral

⚠️ **IMPORTANTE:**
El conductor de vehículo motorizado tiene MAYOR responsabilidad por el principio de "mayor masa, mayor responsabilidad".

`,
      'taxi_uber_didi': `${nombreUsuario}, sobre **accidentes en Uber/Didi/Taxi**:

📋 **SI TUVISTE ACCIDENTE COMO PASAJERO:**

1️⃣ **DOCUMENTA EN LA APP:**
• Toma capturas del viaje (conductor, placa, ruta)
• Guarda el historial del viaje
• Reporta el incidente en la app INMEDIATAMENTE

2️⃣ **BUSCA ATENCIÓN MÉDICA:**
• Ve al doctor aunque te sientas bien
• Guarda todos los comprobantes
• El reporte médico es evidencia clave

3️⃣ **EVIDENCIA:**
• Fotos de los daños
• Fotos del interior del vehículo
• Datos del conductor
• Testigos

💰 **COBERTURAS DE LAS PLATAFORMAS:**

**UBER:**
• Seguro de accidentes personales durante el viaje
• Cubre gastos médicos hasta cierto límite
• Cobertura de muerte accidental

**DIDI:**
• Seguro de responsabilidad civil
• Cobertura de gastos médicos
• Asistencia en carretera

**TAXI REGULAR:**
• Deben tener seguro obligatorio
• Puedes reclamar a la empresa y al conductor

📍 **CÓMO RECLAMAR:**
1. Reporta en la app con todos los detalles
2. Contacta al soporte de la plataforma
3. Si no responden: demanda en PROFECO
4. Para lesiones graves: Ministerio Público

⚠️ **IMPORTANTE:**
Las plataformas tienen departamentos legales. Si tu caso es grave, busca un abogado que te asesore en la negociación.

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
      `¡Hola ${nombreUsuario}! `,
      `¡Qué tal ${nombreUsuario}! `,
      `¡Bienvenido ${nombreUsuario}! `
    ];
    const saludo = saludos[Math.floor(Math.random() * saludos.length)];
    
    return `${saludo}

Soy **LexIA**, tu asistente para temas de tránsito en Chiapas. Puedo ayudarte con:

 **Multas e infracciones** - qué hacer, cómo pagar o impugnar
 **Accidentes** - pasos a seguir, documentación, seguro
 **Documentos** - licencia, verificación, tarjeta de circulación
 **Tus derechos** - qué puede y no puede hacer un oficial

Cuéntame, ¿qué situación tienes?`;
  }
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
