/**
 * 🚗 GENERADOR MASIVO DE ESCENARIOS DE TRÁNSITO CHIAPAS (LEXIA TRAINER)
 * Genera 30,000 consultas únicas combinando variables semánticas
 * Adaptado al contexto de Chiapas con lenguaje coloquial mexicano
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const CONFIG = {
  TOTAL_MUESTRAS: 30000,
  URL_API: 'http://localhost:3010/message',
  BATCH_SIZE: 50,
  DELAY_MS: 100
};

// ================= BANCO DE VARIABLES SEMÁNTICAS (CHIAPAS) =================

const VARIABLES = {
  // Saludos y muletillas chiapanecas/mexicanas
  saludos: [
    "Hola", "Buenas", "Oye", "Disculpa", "Ayuda", "Urgente", "Hey", "Lexia", 
    "Duda", "Pregunta", "Qué onda", "Qué pedo", "We", "Wey", "Oye we", 
    "Compa", "Carnal", "Hermano", "Jefe", "Mano", "Bro", "Parce", "Cuate",
    "Oye mano", "Oye compa", "Qué tal", "Buenas tardes", "Buenos días",
    "Oiga", "Disculpe", "Una pregunta", "Me urge", "SOS", "Help",
    "Auxilio", "Necesito ayuda", "Porfa", "Por favor", "Plis", "Neta",
    "A ver", "Mira", "Escucha", "Checa esto", "Fíjate", "Imagínate"
  ],
  
  // Vehículos con marcas populares en Chiapas
  vehiculos: [
    "mi moto", "mi carro", "una camioneta", "un Uber", "un taxi", "mi coche",
    "una Italika", "un Versa", "un camión de carga", "mi vehículo", "la nave",
    "mi tsuru", "mi vocho", "mi chevy", "una Aveo", "un Sentra", "mi March",
    "una Hilux", "una Ranger", "mi pickup", "un combi", "una urvan",
    "mi motoneta", "un Estaquitas", "un torton", "mi bici", "un triciclo",
    "mi cuatrimoto", "un mototaxi", "colectivo", "mi carrito", "la troca",
    "mi ranfla", "el fierro", "mi carrucha", "la maquina", "el auto",
    "mi scooter", "una NP300", "un Jetta", "mi Pointer", "un Golf",
    "mi Honda", "una Yamaha", "un Bajaj", "mi KTM", "una Susuki"
  ],
  
  // Lugares específicos de Chiapas y zonas comunes
  lugares: [
    // Tuxtla Gutiérrez
    "en el centro de Tuxtla", "en la 5a norte", "por el parque de la marimba",
    "en el libramiento norte", "en el periférico", "por plaza crystal",
    "en la zona de hospitales", "por el estadio Víctor Manuel Reyna",
    "en boulevard Belisario Domínguez", "por Walmart de la 5a",
    "en la central de abastos", "por el mercado de los ancianos",
    "en colonia Las Granjas", "por Terán", "en la Infonavit Grijalva",
    
    // San Cristóbal de las Casas
    "en San Cristóbal", "en el andador de Santo Domingo", "por el centro de Jovel",
    "en la carretera a Chamula", "por el periférico de San Cris",
    
    // Tapachula
    "en Tapachula", "en el centro de Tapachula", "por el parque Hidalgo",
    "en la frontera con Guatemala", "por ciudad Hidalgo",
    
    // Carreteras de Chiapas
    "en la carretera Tuxtla-San Cristóbal", "en la autopista", 
    "en la carretera federal 190", "por los altos de Chiapas",
    "en la carretera costera", "por Ocozocoautla", "en Chiapa de Corzo",
    "en el puente Chiapas", "por Suchiapa", "en Berriozábal",
    "en la carretera a Comitán", "por La Trinitaria", "en Palenque",
    
    // Zonas generales
    "en zona escolar", "frente a un hospital", "en carretera federal",
    "en una rampa de discapacitados", "en doble fila", "en la banqueta",
    "en línea amarilla", "cerca del estadio", "en un cruce peatonal",
    "en un puente peatonal", "en una glorieta", "en un retorno",
    "en una zona de carga y descarga", "en estacionamiento prohibido",
    "en paso de cebra", "frente a una iglesia", "cerca de una escuela",
    "en avenida principal", "en calle cerrada", "en privada",
    "en boulevard", "en callejón", "saliendo de un antro",
    "afuera de un bar", "en el estacionamiento del super", "en el oxxo"
  ],
  
  // Infracciones comunes en Chiapas
  infracciones: [
    "me pasé un alto", "iba a exceso de velocidad", "no traigo licencia",
    "traigo la tarjeta vencida", "di vuelta en U prohibida", "no traigo cinturón",
    "voy usando el celular", "traigo vidrios polarizados", "mis luces no sirven",
    "el mofle hace mucho ruido", "traigo aliento alcohólico", "no tengo placas",
    "traigo placas de otro estado", "no tengo verificación", "mi licencia venció",
    "no traigo espejo retrovisor", "vengo sin casco", "traigo a 3 en la moto",
    "me metí en sentido contrario", "me pasé el semáforo en amarillo",
    "estacioné en lugar prohibido", "no cedí el paso a peatones",
    "iba hablando por teléfono", "iba mensajeando", "no usé direccionales",
    "rebasé por la derecha", "iba zigzagueando", "traigo llantas lisas",
    "no tengo seguro vigente", "traigo el parabrisas estrellado",
    "no funcionan mis frenos", "traigo carga excesiva", "no tengo extintor",
    "iba manejando con los pies", "traigo niños sin silla especial",
    "iba fumando mota", "olía a cerveza", "me caché el alcoholímetro",
    "me agarraron en el retén", "iba tomado", "venía pedo", "venía hasta atrás",
    "me pasé el tope muy rápido", "choqué un poste", "le pegué a otro carro"
  ],
  
  // Actores de autoridad (formas coloquiales chiapanecas)
  actores: [
    "un oficial", "un tránsito", "una patrulla", "un agente", "la policía",
    "los de vialidad", "un tamarindo", "la guardia nacional", "los federales",
    "la municipal", "la estatal", "un policía vial", "el de tránsito",
    "la patrulla", "los polis", "los azules", "los de la muni", "un verde",
    "los tombos", "la tira", "los cuicos", "un uniformado", "los guachos",
    "los de caminos", "protección civil", "los de fiscalización",
    "un inspector", "los de la SSP", "los estatales", "la policía de caminos", "la chota"
  ],
  
  // Acciones de autoridad (incluyendo abusos comunes)
  acciones_autoridad: [
    "me quiere quitar la placa", "se quiere llevar el carro al corralón",
    "me está pidiendo mordida", "me quitó la licencia", "no me quiere dar la boleta",
    "me está amenazando", "dice que la multa es de 5000 pesos", "me detuvo sin razón",
    "me quiere cobrar 3000", "no me deja ir", "me tiene detenido",
    "me está revisando todo", "quiere que le dé para el refresco",
    "me pidió 500 para dejarme ir", "dice que me va a llevar",
    "me amenazó con el corralón", "se puso muy agresivo", "me gritó",
    "no me quiso dar su número de placa", "no traía identificación",
    "me quitó las llaves", "me bajó del carro", "me quiere esposar",
    "dice que es delito grave", "me quiere llevar al MP", "me amenazó",
    "me retuvo más de 2 horas", "no me dejó llamar a nadie",
    "me inventó una infracción", "dice que debo pagar ahí mismo",
    "no me da opciones", "dice que pierdo el carro si no pago",
    "me está grabando", "me pide que me baje", "revisó mi cajuela sin permiso"
  ],
  
  // Contextos extra con situaciones reales
  contextos_extra: [
    "y no tengo dinero", "y tengo prisa", "pero fue una emergencia médica",
    "y creo que es injusto", "y es la primera vez que me pasa",
    "y el semáforo no servía", "y no había señalización", "y estaba lloviendo",
    "y no vi el letrero", "y mi esposa está embarazada", "y llevo un enfermo",
    "y soy estudiante", "y no trabajo", "y apenas cobré", "y ya no tengo para más",
    "pero soy foráneo", "y no conozco la ciudad", "y el GPS me confundió",
    "y había un accidente", "y un carro me cerró", "y tuve que esquivar",
    "y mi hijo lloraba", "y era una emergencia", "pero ya pagué la multa antes",
    "y me dijeron que era legal", "y todos lo hacen", "y nadie respeta eso",
    "pero el policía no tenía razón", "y traigo todo en regla",
    "y acababa de sacar la licencia", "y me la acaban de renovar",
    "pero fue sin querer", "y no me di cuenta", "y estaba muy oscuro",
    "y llevaba a mi mamá al hospital", "y tenía cita médica urgente",
    "y me iban persiguiendo", "y tuve que huir", "y pensé que era legal"
  ],
  
  // Montos de multas (Chiapas)
  montos: [
    "500 pesos", "1000 pesos", "1500 pesos", "2000 pesos", "2500 pesos",
    "3000 pesos", "3500 pesos", "4000 pesos", "5000 pesos", "6000 pesos",
    "10 UMA", "15 UMA", "20 UMA", "30 UMA", "40 UMA", "50 UMA",
    "media UMA", "una UMA", "dos UMAs", "tres UMAs", "cinco UMAs"
  ],
  
  // Preguntas sobre documentos
  documentos: [
    "la licencia", "el tarjetón", "la tarjeta de circulación", "el engomado",
    "la verificación", "la tenencia", "el seguro", "las placas", "la factura",
    "el comprobante de domicilio", "el INE", "la CURP", "la carta responsiva",
    "el permiso de conducir", "la constancia", "el recibo de pago",
    "el acta de nacimiento", "la licencia federal", "el holograma"
  ],
  
  // Tiempos y plazos
  tiempos: [
    "cuánto tiempo tengo", "cuántos días", "en cuánto tiempo", "hasta cuándo",
    "qué plazo", "cuántas horas", "cuánto me dan", "hay límite de tiempo",
    "puedo esperar", "tengo que ir hoy", "me urge saber", "es urgente"
  ],
  
  // Muletillas coloquiales extras
  muletillas: [
    "neta", "la neta", "en serio", "de verdad", "no mames", "no manches",
    "qué pedo", "qué onda", "qué rollo", "qué pex", "nel", "simón", "va",
    "sale", "órale", "ándale", "pues", "entonces", "ya sabes", "tú sabes",
    "me cae", "te lo juro", "palabra", "es neta", "sin pedos", "con madre",
    "está cabrón", "no hay pedo", "tranqui", "relax", "chill", "equis"
  ],
  
  // Lugares de trámite en Chiapas
  lugares_tramite: [
    "la secretaría de movilidad", "vialidad estatal", "tránsito municipal",
    "la oficina de licencias", "el módulo de placas", "hacienda estatal",
    "finanzas del estado", "el centro de verificación", "la agencia fiscal",
    "el módulo de la 5a norte", "las oficinas de Tuxtla", "el módulo del libramiento"
  ]
};

// ================= ESTRUCTURAS DE FRASES (16 tipos) =================

function generarPromptUnico() {
  const tipo = Math.floor(Math.random() * 16);
  let prompt = "";
  let intencion = "";

  const r = (arr) => arr[Math.floor(Math.random() * arr.length)];

  switch(tipo) {
    // ===== TIPO 0: Situación directa formal =====
    case 0:
      prompt = `${r(VARIABLES.saludos)}, ${r(VARIABLES.actores)} me detuvo ${r(VARIABLES.lugares)} porque ${r(VARIABLES.infracciones)}.`;
      intencion = "situacion_real";
      break;
    
    // ===== TIPO 1: Duda hipotética =====
    case 1:
      prompt = `¿Qué pasa si voy en ${r(VARIABLES.vehiculos)} ${r(VARIABLES.lugares)} y ${r(VARIABLES.infracciones)}?`;
      intencion = "duda_hipotetica";
      break;
    
    // ===== TIPO 2: Abuso de autoridad =====
    case 2:
      prompt = `${r(VARIABLES.saludos)}, ${r(VARIABLES.actores)} ${r(VARIABLES.acciones_autoridad)} por ${r(VARIABLES.infracciones)}.`;
      intencion = "reporte_abuso";
      break;
    
    // ===== TIPO 3: Caso complejo con contexto =====
    case 3:
      prompt = `Ayuda, ${r(VARIABLES.infracciones)} en ${r(VARIABLES.vehiculos)} y ${r(VARIABLES.actores)} ${r(VARIABLES.acciones_autoridad)} ${r(VARIABLES.contextos_extra)}.`;
      intencion = "caso_complejo";
      break;
    
    // ===== TIPO 4: Pregunta sobre multa específica =====
    case 4:
      prompt = `${r(VARIABLES.saludos)}, ¿cuánto es la multa por ${r(VARIABLES.infracciones)} ${r(VARIABLES.lugares)}?`;
      intencion = "consulta_multa";
      break;
    
    // ===== TIPO 5: Coloquial con muletillas =====
    case 5:
      prompt = `${r(VARIABLES.muletillas)} we, ${r(VARIABLES.infracciones)} y ${r(VARIABLES.actores)} ${r(VARIABLES.acciones_autoridad)}, ¿qué hago?`;
      intencion = "consulta_coloquial";
      break;
    
    // ===== TIPO 6: Pregunta sobre documentos =====
    case 6:
      prompt = `¿Dónde saco ${r(VARIABLES.documentos)} en Chiapas? ${r(VARIABLES.contextos_extra).replace('y ', '')}`;
      intencion = "tramite_documento";
      break;
    
    // ===== TIPO 7: Pregunta de tiempo/plazo =====
    case 7:
      prompt = `${r(VARIABLES.tiempos)} para pagar la multa por ${r(VARIABLES.infracciones)}?`;
      intencion = "consulta_plazo";
      break;
    
    // ===== TIPO 8: Corralón y recuperación =====
    case 8:
      prompt = `Se llevaron ${r(VARIABLES.vehiculos)} al corralón ${r(VARIABLES.lugares)}, ¿cómo lo recupero? ${r(VARIABLES.contextos_extra)}`;
      intencion = "consulta_corralon";
      break;
    
    // ===== TIPO 9: Situación de accidente =====
    case 9:
      prompt = `${r(VARIABLES.saludos)}, tuve un accidente en ${r(VARIABLES.vehiculos)} ${r(VARIABLES.lugares)}, ${r(VARIABLES.actores)} llegó pero ${r(VARIABLES.acciones_autoridad)}.`;
      intencion = "accidente";
      break;
    
    // ===== TIPO 10: Lenguaje muy coloquial =====
    case 10:
      prompt = `${r(['We', 'Wey', 'Compa', 'Carnal', 'Mano'])} ${r(VARIABLES.muletillas)}, ${r(VARIABLES.actores)} ${r(VARIABLES.acciones_autoridad)} nomás porque ${r(VARIABLES.infracciones)}, ${r(['está bien eso?', 'es legal?', 'pueden hacer eso?', 'qué procede?', 'qué hago?'])}`;
      intencion = "consulta_muy_coloquial";
      break;
    
    // ===== TIPO 11: Pregunta sobre impugnación =====
    case 11:
      prompt = `¿Puedo impugnar una multa por ${r(VARIABLES.infracciones)}? ${r(VARIABLES.contextos_extra)}`;
      intencion = "impugnacion";
      break;
    
    // ===== TIPO 12: Pregunta sobre derechos =====
    case 12:
      prompt = `¿Cuáles son mis derechos si ${r(VARIABLES.actores)} ${r(VARIABLES.acciones_autoridad)}?`;
      intencion = "derechos";
      break;
    
    // ===== TIPO 13: Situación con monto específico =====
    case 13:
      prompt = `${r(VARIABLES.actores)} me quiere cobrar ${r(VARIABLES.montos)} por ${r(VARIABLES.infracciones)} ${r(VARIABLES.lugares)}, ¿es correcto?`;
      intencion = "verificacion_monto";
      break;
    
    // ===== TIPO 14: Pregunta doble =====
    case 14:
      prompt = `${r(VARIABLES.saludos)}, si ${r(VARIABLES.infracciones)} y también ${r(VARIABLES.infracciones.filter(i => !prompt.includes(i)))}, ¿cuánto pago en total?`;
      intencion = "consulta_multiple";
      break;
    
    // ===== TIPO 15: Emergencia / urgencia =====
    case 15:
      prompt = `¡${r(['URGENTE', 'AYUDA', 'SOS', 'EMERGENCIA'])}! ${r(VARIABLES.actores)} ${r(VARIABLES.acciones_autoridad)} ${r(VARIABLES.lugares)} ${r(VARIABLES.contextos_extra)}, ¿qué hago?!`;
      intencion = "emergencia";
      break;
      
    default:
      prompt = `${r(VARIABLES.saludos)}, tengo una duda sobre ${r(VARIABLES.infracciones)}.`;
      intencion = "general";
  }

  return { prompt, intencion };
}

// ===== PREGUNTAS ADICIONALES ESPECÍFICAS DE CHIAPAS =====
const PREGUNTAS_CHIAPAS_ESPECIFICAS = [
  // Lugares específicos
  "¿Dónde pago multas de tránsito en Tuxtla Gutiérrez?",
  "¿Cuál es la dirección de vialidad en San Cristóbal?",
  "¿Dónde está el corralón de Tapachula?",
  "¿Cómo llego a las oficinas de tránsito en el centro de Tuxtla?",
  "¿Hay módulo de licencias en Comitán?",
  "¿Puedo sacar placas en Palenque o tengo que ir a Tuxtla?",
  "¿Dónde queda la secretaría de movilidad de Chiapas?",
  "¿Cuál es el teléfono de tránsito en Tuxtla?",
  "¿Tienen oficina de vialidad en Ocozocoautla?",
  "¿Dónde verifico mi carro en Chiapas?",
  
  // Preguntas sobre reglamento local
  "¿Cuál es el límite de velocidad en el periférico de Tuxtla?",
  "¿Se puede dar vuelta en U en el boulevard Belisario?",
  "¿Está permitido estacionarse en la 5a norte de Tuxtla?",
  "¿Cuánto es la multa por pasarse un alto en Chiapas?",
  "¿Qué pasa si me agarran tomado en Chiapas?",
  "¿Hay alcoholímetro en San Cristóbal?",
  "¿A qué hora es el operativo del alcoholímetro en Tuxtla?",
  "¿Cuánto es la multa por no usar cinturón en Chiapas?",
  "¿Qué dice el reglamento de tránsito de Chiapas sobre motos?",
  "¿Es obligatorio el casco en Chiapas?",
  
  // Coloquiales de Chiapas
  "We, me pararon los tamarindos en el centro, qué hago",
  "Compa, cuánto cuesta sacar el carro del corralón en Tuxtla",
  "Oye carnal, me quitaron la licencia por ir pedo, qué procede",
  "Mano, es neta que la multa es de 5 bolas por pasarse un alto?",
  "Wey, me paró la tira en el libramiento y quieren mordida",
  "Nel, simón que puedo impugnar una multa o qué pedo",
  "Qué onda, me llevaron la moto al corralón de la 5a",
  "Oye we, cuánto cobran de multa por ir en sentido contrario",
  "La neta está cabrón el tráfico en Tuxtla, me multaron por quedarme en el cruce",
  "No mames, el tránsito dice que mi licencia no vale porque es de otro estado",
  
  // Situaciones específicas de la región
  "Me pararon en la carretera Tuxtla-San Cristóbal en un retén",
  "En la caseta de Chiapa de Corzo me quitaron los documentos",
  "Tuve un accidente en el puente Chiapas, vino la guardia nacional",
  "Me agarraron sin placas en el mercado de los ancianos",
  "En el parque de la marimba me pusieron multa por estacionarme",
  "Choqué en la glorieta del estadio Víctor Manuel Reyna",
  "Me detuvieron saliendo de la central de abastos de Tuxtla",
  "En plaza crystal me llevaron el carro a la grúa",
  "Me pararon en el retén de Berriozábal",
  "Tuve problema con tránsito en Suchiapa",
  
  // Preguntas sobre trámites en Chiapas
  "¿Cuánto cuesta la licencia de conducir en Chiapas 2024?",
  "¿Qué necesito para sacar placas nuevas en Chiapas?",
  "¿Cada cuánto se renueva la licencia en Chiapas?",
  "¿Puedo hacer la verificación vehicular en cualquier centro?",
  "¿Hay descuento en multas de tránsito este mes en Chiapas?",
  "¿Cuánto tiempo tengo para pagar una multa en Chiapas?",
  "¿Se puede pagar en línea las multas de Tuxtla?",
  "¿Aceptan tarjeta en las oficinas de tránsito de Chiapas?",
  "¿Cuál es el horario de la secretaría de movilidad de Chiapas?",
  "¿Trabajan los sábados en vialidad estatal?",
  
  // Preguntas sobre alcohol
  "¿Cuál es el límite de alcohol permitido en Chiapas?",
  "¿Qué pasa si me niego al alcoholímetro en Tuxtla?",
  "¿Cuánto es la multa por dar positivo en el alcoholímetro?",
  "¿Me pueden llevar detenido por conducir ebrio en Chiapas?",
  "¿Dónde están los puntos del alcoholímetro en Tuxtla?",
  "¿A qué hora operan los retenes de alcoholímetro en San Cristóbal?",
  "¿Es delito conducir borracho en Chiapas?",
  "¿Cuántas cervezas puedo tomar y manejar sin que me multen?",
  
  // Sobre corralón
  "¿Cuánto cobran por día en el corralón de Tuxtla?",
  "¿Cuál es el horario del corralón de Chiapas?",
  "¿Qué documentos necesito para sacar mi carro del corralón?",
  "¿Puedo sacar mi carro del corralón sin pagar la multa?",
  "¿Cuánto tiempo puede estar mi carro en el corralón antes de que lo remate?",
  "¿Hay varios corralones en Tuxtla o solo uno?",
  "¿Aceptan efectivo en el corralón?",
  
  // Sobre accidentes
  "Tuve un choque en Tuxtla, ¿llamo al 911 o a tránsito?",
  "¿Qué hago si el otro conductor se dio a la fuga?",
  "¿Necesito perito de tránsito para un choque menor?",
  "¿Puedo mover mi carro después de un accidente en Chiapas?",
  "¿Qué pasa si no tengo seguro y choqué?",
  "¿El seguro del otro me tiene que pagar si él tuvo la culpa?",
  "¿Cuánto tarda en llegar tránsito después de un accidente en Tuxtla?",
  
  // Preguntas de estudiantes/jóvenes
  "Soy estudiante y no tengo para pagar la multa, ¿qué hago?",
  "¿Hay descuento para estudiantes en multas de Chiapas?",
  "Mi papá es dueño del carro pero yo lo manejaba cuando me multaron",
  "Tengo 18 años y es mi primera multa, ¿me pueden perdonar?",
  "¿Me afecta la multa si apenas voy a sacar mi licencia?",
  
  // Uber/Taxi
  "Soy conductor de Uber, ¿qué hago si me multan en Tuxtla?",
  "¿Es legal Uber en Chiapas?",
  "¿Qué pasa si un taxi me choca y se va?",
  "¿Los taxis de Tuxtla pueden parar donde sea?",
  "¿Pueden multar a un Uber por recoger pasaje en zona prohibida?",
  
  // Motos específico
  "¿Cuántas personas pueden ir en moto en Chiapas?",
  "¿Es obligatorio el chaleco reflejante en moto en Tuxtla?",
  "¿Pueden quitarme la moto si no traigo licencia?",
  "¿La licencia de carro sirve para moto en Chiapas?",
  "¿Dónde saco la licencia de motociclista en Chiapas?",
  "Me pararon en moto sin casco, ¿cuánto es la multa?",
  
  // Off-topic para entrenar detección
  "¿Cuál es el pronóstico del tiempo para mañana?",
  "¿Quién va ganando en el fútbol?",
  "¿Dónde queda un buen restaurante en Tuxtla?",
  "¿A qué hora abre el zoológico de Tuxtla?",
  "¿Cómo llego al cañón del sumidero?",
  "¿Cuánto cuesta la entrada a las cascadas de agua azul?",
  "¿Qué me recomiendas comer en San Cristóbal?",
  "¿Hay vuelos de Tuxtla a la Ciudad de México?",
  "¿Cuál es el clima en Tapachula?",
  "Dame la receta de los tamales chiapanecos"
];

// ================= LÓGICA DE EJECUCIÓN =================

async function enviarLote(lote, stats) {
  const promesas = lote.map(item => {
    return axios.post(CONFIG.URL_API, {
      sessionId: uuidv4(),
      usuarioId: '00000000-0000-0000-0000-000000000001', // Usuario entrenador en DB
      mensaje: item.prompt,
      nombre: 'Entrenador LexIA'
    }, { timeout: 30000 })
    .then(response => {
      stats.exitosos++;
      const tema = response.data?.deteccion?.tema || response.data?.data?.deteccion?.tema || 'unknown';
      stats.temas[tema] = (stats.temas[tema] || 0) + 1;
      process.stdout.write('✅');
      return { success: true, intencion: item.intencion, tema };
    })
    .catch(error => {
      stats.fallidos++;
      process.stdout.write('❌');
      return { success: false, intencion: item.intencion, error: error.message };
    });
  });
  
  return Promise.all(promesas);
}

async function main() {
  console.clear();
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  🚗 LEXIA TRAINER - GENERADOR MASIVO CHIAPAS v2.0  🚗       ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  Objetivo: ${CONFIG.TOTAL_MUESTRAS.toLocaleString()} consultas únicas                        ║`);
  console.log(`║  Batch size: ${CONFIG.BATCH_SIZE} | Delay: ${CONFIG.DELAY_MS}ms                            ║`);
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");

  const stats = {
    exitosos: 0,
    fallidos: 0,
    temas: {},
    intenciones: {},
    inicio: Date.now()
  };

  const dataset = [];
  
  // 1. Fase de Generación
  console.log("⚙️  Generando escenarios de tránsito Chiapas...");
  
  // Primero agregar preguntas específicas de Chiapas
  PREGUNTAS_CHIAPAS_ESPECIFICAS.forEach(pregunta => {
    dataset.push({ prompt: pregunta, intencion: 'chiapas_especifica' });
  });
  console.log(`   ✓ ${PREGUNTAS_CHIAPAS_ESPECIFICAS.length} preguntas específicas de Chiapas`);
  
  // Luego generar el resto hasta llegar al objetivo
  const restantes = CONFIG.TOTAL_MUESTRAS - PREGUNTAS_CHIAPAS_ESPECIFICAS.length;
  for (let i = 0; i < restantes; i++) {
    const generada = generarPromptUnico();
    dataset.push(generada);
    stats.intenciones[generada.intencion] = (stats.intenciones[generada.intencion] || 0) + 1;
    
    // Mostrar progreso de generación cada 5000
    if ((i + 1) % 5000 === 0) {
      console.log(`   ✓ ${(i + 1).toLocaleString()} escenarios generados...`);
    }
  }
  console.log(`   ✓ Total: ${dataset.length.toLocaleString()} escenarios generados`);
  
  // 2. Guardar dataset en archivo
  console.log("\n💾 Guardando dataset de respaldo...");
  const stream = fs.createWriteStream('dataset_chiapas_30k.jsonl');
  dataset.forEach(d => stream.write(JSON.stringify(d) + '\n'));
  stream.end();
  console.log("   ✓ Guardado en 'dataset_chiapas_30k.jsonl'");
  
  // 3. Mostrar distribución de intenciones
  console.log("\n📊 Distribución de intenciones generadas:");
  Object.entries(stats.intenciones)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([intencion, count]) => {
      const porcentaje = ((count / dataset.length) * 100).toFixed(1);
      console.log(`   • ${intencion}: ${count.toLocaleString()} (${porcentaje}%)`);
    });

  // 4. Fase de Envío
  console.log("\n🚀 Iniciando envío masivo a la API...");
  console.log("   (Esto tomará aproximadamente " + Math.ceil((CONFIG.TOTAL_MUESTRAS / CONFIG.BATCH_SIZE) * (CONFIG.DELAY_MS + 500) / 60000) + " minutos)\n");
  
  let procesados = 0;
  const startTime = Date.now();
  
  while (procesados < dataset.length) {
    const lote = dataset.slice(procesados, procesados + CONFIG.BATCH_SIZE);
    
    try {
      await enviarLote(lote, stats);
      procesados += lote.length;
      
      // Barra de progreso con ETA
      const porcentaje = ((procesados / CONFIG.TOTAL_MUESTRAS) * 100).toFixed(1);
      const tiempoTranscurrido = (Date.now() - startTime) / 1000;
      const velocidad = procesados / tiempoTranscurrido;
      const restantes = dataset.length - procesados;
      const etaSegundos = Math.ceil(restantes / velocidad);
      const etaMin = Math.floor(etaSegundos / 60);
      const etaSec = etaSegundos % 60;
      
      process.stdout.write(`\n   [${porcentaje}%] ${procesados.toLocaleString()}/${dataset.length.toLocaleString()} | ETA: ${etaMin}m ${etaSec}s | ${velocidad.toFixed(1)} req/s\n`);
      
      await new Promise(r => setTimeout(r, CONFIG.DELAY_MS));
      
    } catch (e) {
      console.log(`\n⚠️ Error en lote ${procesados}: ${e.message}`);
    }
  }

  // 5. Resumen final
  const tiempoTotal = ((Date.now() - stats.inicio) / 1000).toFixed(1);
  const minutos = Math.floor(tiempoTotal / 60);
  const segundos = Math.round(tiempoTotal % 60);
  
  console.log("\n");
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║              🏁 ENTRENAMIENTO FINALIZADO 🏁                  ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  ✅ Exitosos: ${stats.exitosos.toLocaleString().padEnd(10)} ❌ Fallidos: ${stats.fallidos.toLocaleString().padEnd(10)}       ║`);
  console.log(`║  ⏱️  Tiempo total: ${minutos}m ${segundos}s                                    ║`);
  console.log(`║  📈 Tasa de éxito: ${((stats.exitosos / CONFIG.TOTAL_MUESTRAS) * 100).toFixed(2)}%                              ║`);
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log("║  📊 Top 10 temas detectados:                                 ║");
  
  Object.entries(stats.temas)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([tema, count]) => {
      const porcentaje = ((count / stats.exitosos) * 100).toFixed(1);
      console.log(`║    • ${tema.padEnd(20)} ${count.toLocaleString().padStart(7)} (${porcentaje.padStart(5)}%)       ║`);
    });
    
  console.log("╚══════════════════════════════════════════════════════════════╝");
  
  // 6. Guardar estadísticas
  const statsFile = {
    fecha: new Date().toISOString(),
    config: CONFIG,
    resultados: {
      exitosos: stats.exitosos,
      fallidos: stats.fallidos,
      tiempoSegundos: parseFloat(tiempoTotal),
      tasaExito: ((stats.exitosos / CONFIG.TOTAL_MUESTRAS) * 100).toFixed(2) + '%'
    },
    distribucionTemas: stats.temas,
    distribucionIntenciones: stats.intenciones
  };
  
  fs.writeFileSync('stats_entrenamiento_30k.json', JSON.stringify(statsFile, null, 2));
  console.log("\n📄 Estadísticas guardadas en 'stats_entrenamiento_30k.json'");
}

// Ejecutar
main().catch(console.error);
