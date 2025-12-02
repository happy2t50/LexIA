/**
 * SCRIPT DE ENTRENAMIENTO MASIVO PARA LEXIA
 * 
 * Este script envía miles de preguntas simulando usuarios reales
 * para entrenar el sistema de detección y aprendizaje adaptativo.
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const CHAT_URL = 'http://localhost:3010/message';

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// ========== BASE DE DATOS DE PREGUNTAS DE ENTRENAMIENTO ==========

const PREGUNTAS_ENTRENAMIENTO = {
  // ===== SALUDOS Y SOCIAL =====
  saludos: [
    "hola",
    "buenos días",
    "buenas tardes",
    "buenas noches",
    "qué tal",
    "hola lexia",
    "hey",
    "hola buenas",
    "qué onda",
    "holi",
    "gracias",
    "muchas gracias",
    "gracias por tu ayuda",
    "adiós",
    "hasta luego",
    "bye",
    "nos vemos",
    "chao"
  ],

  // ===== MULTAS - Preguntas generales =====
  multas_general: [
    "me pusieron una multa",
    "me acaban de multar",
    "tengo una multa",
    "me dieron una infracción",
    "me llegó una fotomulta",
    "me multaron ayer",
    "tengo varias multas",
    "cómo sé si tengo multas",
    "dónde reviso mis multas",
    "quiero consultar mis multas",
    "cómo consulto mis adeudos",
    "tengo multas pendientes",
    "me multaron pero no sé por qué",
    "me dieron un ticket de tránsito",
    "el oficial me dio una boleta"
  ],

  // ===== MULTAS - Pago =====
  multas_pago: [
    "cómo pago una multa",
    "dónde pago la multa",
    "puedo pagar en línea",
    "cuánto cuesta pagar la multa",
    "hay descuento si pago rápido",
    "cuánto es el descuento por pronto pago",
    "puedo pagar en el banco",
    "qué bancos aceptan pago de multas",
    "puedo pagar con tarjeta",
    "acepta efectivo",
    "dónde está la caja de tránsito",
    "horario para pagar multas",
    "puedo pagar en OXXO",
    "se puede pagar en línea la multa",
    "link para pagar multa",
    "página para pagar infracciones",
    "tengo que pagar antes de sacar mi carro",
    "si no pago la multa qué pasa",
    "qué pasa si no pago",
    "me pueden embargar por multas",
    "prescriben las multas",
    "después de cuánto tiempo caduca una multa"
  ],

  // ===== MULTAS - Montos =====
  multas_montos: [
    "cuánto cuesta la multa",
    "cuánto es la multa por pasarse el rojo",
    "cuánto cobran por exceso de velocidad",
    "cuánto sale la multa por estacionarse mal",
    "cuánto cuesta la multa por usar celular",
    "cuánto es la multa por no traer cinturón",
    "cuánto cobran por dar vuelta prohibida",
    "cuál es el monto de la multa",
    "cuánto me va a costar",
    "es muy cara la multa",
    "cuántas UMA son",
    "qué significa UMA",
    "cuánto vale una UMA",
    "cómo calculo el monto de mi multa"
  ],

  // ===== IMPUGNACIÓN =====
  impugnacion: [
    "quiero impugnar la multa",
    "cómo impugno una multa",
    "puedo apelar la infracción",
    "no estoy de acuerdo con la multa",
    "la multa es injusta",
    "me multaron pero no hice nada",
    "el oficial se equivocó",
    "la señal no se veía",
    "no había señal",
    "la señalización estaba confusa",
    "quiero reclamar",
    "dónde reclamo una multa",
    "cómo anulo una multa",
    "se puede cancelar una multa",
    "cuánto tiempo tengo para impugnar",
    "cuál es el plazo para apelar",
    "tengo 15 días para impugnar",
    "ya pasaron los 15 días puedo impugnar",
    "qué documentos necesito para impugnar",
    "qué pruebas necesito",
    "necesito un abogado para impugnar",
    "cuánto cobra un abogado por impugnar",
    "dónde presento la impugnación",
    "juzgado cívico para impugnar",
    "cómo escribo el recurso de impugnación",
    "ejemplo de escrito de impugnación",
    "me multaron pero la acera era amarilla",
    "me pusieron multa pero sí se podía estacionar",
    "el semáforo estaba en amarillo no en rojo",
    "la fotomulta está mal",
    "en la foto no se ve mi placa bien",
    "el radar estaba mal calibrado",
    "puedo pedir que revisen el alcoholímetro",
    "creo que el alcoholímetro falló"
  ],

  // ===== DOCUMENTOS =====
  documentos: [
    "qué documentos necesito para circular",
    "qué papeles debo traer en el carro",
    "documentos obligatorios para manejar",
    "puedo manejar sin licencia",
    "se puede manejar sin tarjeta de circulación",
    "es obligatorio el seguro de auto",
    "qué pasa si no traigo seguro",
    "dónde saco la licencia",
    "dónde renuevo mi licencia",
    "cuánto cuesta la licencia",
    "requisitos para licencia",
    "licencia para moto",
    "licencia tipo A",
    "licencia tipo B",
    "qué tipo de licencia necesito",
    "mi licencia está vencida",
    "puedo manejar con licencia vencida",
    "dónde hago la verificación",
    "cuándo es la verificación",
    "calendario de verificación",
    "mi verificación ya venció",
    "cómo saco la tarjeta de circulación",
    "perdí mi tarjeta de circulación",
    "me robaron los documentos del carro",
    "cómo repongo la tarjeta de circulación",
    "necesito permiso para circular en otro estado",
    "puedo usar mi licencia de otro estado",
    "licencia de Chiapas válida en todo México",
    "qué es el holograma de verificación",
    "dónde pago la tenencia",
    "cuánto cuesta la tenencia",
    "ya no se paga tenencia en Chiapas"
  ],

  // ===== ACCIDENTES =====
  accidentes: [
    "tuve un accidente",
    "choqué",
    "me chocaron",
    "qué hago si choco",
    "acabo de tener un accidente",
    "choque menor qué hago",
    "fue un choque leve",
    "el otro conductor se fue",
    "choque y fuga",
    "el otro no quiere pagar",
    "no tenemos seguro ninguno",
    "mi seguro no quiere responder",
    "el ajustador no llega",
    "cómo llamo al seguro",
    "teléfono del seguro",
    "debo llamar a la policía",
    "cuándo llamo al 911",
    "necesito un perito",
    "cómo levanto un acta de hechos",
    "dónde levanto la denuncia",
    "ministerio público para accidentes",
    "fue culpa del otro conductor",
    "yo tuve la culpa del accidente",
    "quién paga los daños",
    "cómo reclamo al seguro",
    "el seguro no me quiere pagar",
    "cuánto tiempo tengo para reclamar al seguro",
    "me lastimé en el accidente",
    "el otro conductor está herido",
    "accidente con lesionados",
    "accidente con muertos",
    "qué hago si atropellé a alguien",
    "atropellé un peatón",
    "me atropellaron",
    "el conductor huyó después de atropellarme"
  ],

  // ===== DERECHOS DEL CONDUCTOR =====
  derechos: [
    "qué hago si me para un oficial",
    "cuáles son mis derechos",
    "derechos del conductor",
    "puede el policía quitarme las llaves",
    "pueden quitarme la licencia",
    "me pueden detener sin motivo",
    "el oficial me pidió mordida",
    "me quieren extorsionar",
    "cómo denuncio a un policía corrupto",
    "el oficial no me dio boleta",
    "me quitaron el carro sin boleta",
    "puedo grabar al oficial",
    "es legal grabar a la policía",
    "puedo negarme a la prueba de alcoholímetro",
    "qué pasa si me niego al alcoholímetro",
    "me pueden revisar el carro",
    "necesitan orden para revisar mi vehículo",
    "el oficial me amenazó",
    "el policía me insultó",
    "abuso policial qué hago",
    "dónde denuncio abuso de autoridad",
    "teléfono de asuntos internos",
    "CEDH para denunciar",
    "comisión de derechos humanos",
    "el oficial me retuvo mucho tiempo",
    "cuánto tiempo me pueden retener",
    "me llevaron al MP sin razón",
    "me quieren culpar de algo que no hice"
  ],

  // ===== ALCOHOLÍMETRO =====
  alcohol: [
    "me detuvieron en el alcoholímetro",
    "di positivo en alcoholímetro",
    "cuánto es el límite de alcohol",
    "cuántas cervezas puedo tomar y manejar",
    "tomé una copa puedo manejar",
    "me van a llevar por alcohol",
    "mi carro está en el corralón por alcohol",
    "cuánto cuesta sacar el carro del corralón por alcohol",
    "me suspendieron la licencia por alcohol",
    "cómo recupero mi licencia suspendida",
    "puedo impugnar el alcoholímetro",
    "creo que el aparato estaba mal",
    "no había tomado y salí positivo",
    "qué derechos tengo en el alcoholímetro",
    "pueden obligarme a soplar",
    "qué pasa si me niego a soplar",
    "multa por manejar borracho",
    "es delito manejar ebrio",
    "me pueden meter a la cárcel por manejar borracho",
    "arresto por alcoholímetro"
  ],

  // ===== CORRALÓN / GRÚA =====
  corralon: [
    "se llevaron mi carro",
    "la grúa se llevó mi auto",
    "dónde está el corralón",
    "dirección del corralón",
    "teléfono del corralón",
    "cuánto cuesta sacar el carro del corralón",
    "cuánto cobran por día en el corralón",
    "qué documentos necesito para sacar mi carro",
    "puedo sacar el carro sin pagar la multa",
    "horario del corralón",
    "el corralón abre en domingo",
    "mi carro tiene daños del corralón",
    "la grúa dañó mi carro",
    "cómo reclamo daños de la grúa",
    "pueden llevarse mi carro si estoy adentro",
    "me subí al carro y aún así lo subieron a la grúa",
    "se llevaron mi carro pero había alguien adentro",
    "no encontré mi carro en el corralón"
  ],

  // ===== ESTACIONAMIENTO =====
  estacionamiento: [
    "me multaron por estacionarme",
    "multa por estacionamiento",
    "dónde puedo estacionarme",
    "qué significa la línea amarilla",
    "puedo estacionarme en amarillo",
    "línea roja qué significa",
    "me estacioné en zona de carga y descarga",
    "estacioné en lugar de discapacitados",
    "no vi la señal de no estacionar",
    "multa por doble fila",
    "me multaron por bloquear cochera",
    "estacioné frente a una cochera",
    "el parquímetro no funcionaba",
    "no encontré estacionamiento",
    "puedo estacionarme en la banqueta"
  ],

  // ===== SEMÁFOROS =====
  semaforo: [
    "me multaron por pasarme el rojo",
    "pasé en amarillo y me multaron",
    "el semáforo estaba descompuesto",
    "el semáforo no funcionaba",
    "fotomulta por semáforo",
    "cómo impugno una fotomulta",
    "la foto no se ve bien",
    "no soy yo en la foto",
    "ese no es mi carro en la fotomulta",
    "clonaron mis placas",
    "dónde están las cámaras de fotomulta",
    "cómo sé si hay cámara de fotomulta",
    "me pasé el rojo por emergencia",
    "iba una ambulancia atrás",
    "di vuelta en rojo y me multaron"
  ],

  // ===== VELOCIDAD =====
  velocidad: [
    "me multaron por exceso de velocidad",
    "cuál es el límite de velocidad",
    "límite en zona escolar",
    "límite en carretera",
    "límite en ciudad",
    "radar de velocidad",
    "dónde están los radares",
    "me tomó foto el radar",
    "el radar estaba escondido",
    "creo que el radar falló",
    "iba a 80 y me multaron",
    "no vi el letrero de velocidad"
  ],

  // ===== OFF-TOPIC (para entrenar qué NO responder) =====
  off_topic: [
    "cuál es la receta de los tacos",
    "cómo hago un pastel",
    "qué tiempo hace hoy",
    "va a llover mañana",
    "quién ganó el partido",
    "resultado del América",
    "cómo programo en Python",
    "ayúdame con mi tarea de matemáticas",
    "qué película me recomiendas",
    "cuál es tu color favorito",
    "cuéntame un chiste",
    "tienes novio",
    "eres hombre o mujer",
    "cuántos años tienes",
    "dónde vives",
    "quién es el presidente",
    "qué opinas de la política",
    "cuánto cuesta un iPhone",
    "dónde compro ropa",
    "recomendación de restaurantes"
  ],

  // ===== PREGUNTAS AMBIGUAS (para entrenar clarificación) =====
  ambiguas: [
    "tengo un problema",
    "necesito ayuda",
    "qué hago",
    "estoy en problemas",
    "me pasó algo",
    "tengo una duda",
    "puedes ayudarme",
    "información",
    "quiero saber algo",
    "una pregunta"
  ],

  // ===== CONVERSACIONES DE CONTINUIDAD =====
  continuidad: [
    "y después qué hago",
    "qué más necesito",
    "algo más que deba saber",
    "eso es todo",
    "gracias por la información",
    "muy útil",
    "eso me ayuda mucho",
    "perfecto",
    "entendido",
    "ok gracias",
    "y si no funciona",
    "qué pasa si no me hacen caso",
    "y si el juez dice que no",
    "cuánto tarda",
    "es muy tardado",
    "hay forma más rápida",
    "conoces algún abogado",
    "me puedes recomendar un abogado",
    "eso es legal",
    "es cierto que",
    "me dijeron que",
    "escuché que",
    "mi amigo me dijo que"
  ],

  // ===== CASOS ESPECÍFICOS / SITUACIONES REALES =====
  casos_reales: [
    "ayer me multaron en el centro por estacionarme pero el parquímetro no servía",
    "me detuvieron en el alcoholímetro pero solo tomé una cerveza hace 3 horas",
    "choqué en la esquina de mi casa y el otro conductor se fue",
    "la grúa se llevó mi carro pero yo estaba comprando en la tienda",
    "me pusieron fotomulta pero las placas de la foto no son las mías",
    "el policía me quitó la licencia y no me dio ningún papel",
    "me quieren cobrar 5000 pesos en el corralón pero solo estuvo un día",
    "tuve un accidente y el otro conductor no tiene seguro",
    "me multaron por vuelta prohibida pero no había señal",
    "el oficial me dijo que le diera 500 pesos o me llevaba al MP",
    "mi licencia venció hace 2 meses y me pararon",
    "choqué el carro de mi papá y no estoy en la póliza del seguro",
    "me robaron el carro y apareció con multas",
    "vendí mi carro hace un año y me siguen llegando multas",
    "presté mi carro y lo chocaron",
    "mi hijo menor de edad chocó mi carro",
    "trabajo de uber y me multaron por no tener permiso",
    "me multaron por traer vidrios polarizados",
    "me pararon porque mi mofle hace ruido",
    "me multaron por no traer extintor"
  ],

  // ===== FEEDBACK POSITIVO (para aprendizaje) =====
  feedback_positivo: [
    "eso era lo que necesitaba saber",
    "perfecto, gracias",
    "excelente información",
    "muy clara tu explicación",
    "justo lo que buscaba",
    "me salvaste",
    "eres muy útil",
    "mejor que google",
    "gracias lexia",
    "te pasaste, gracias"
  ],

  // ===== FEEDBACK NEGATIVO (para aprendizaje) =====
  feedback_negativo: [
    "eso no es lo que pregunté",
    "no me entendiste",
    "esa no es mi pregunta",
    "te equivocaste",
    "eso está mal",
    "no es correcta esa información",
    "creo que te confundiste",
    "no me sirve eso",
    "necesito otra cosa",
    "no entendí nada"
  ],

  // ===== CORRECCIONES (para aprendizaje de errores) =====
  correcciones: [
    "no, te preguntaba sobre multas, no accidentes",
    "me refería a impugnar no a pagar",
    "quiero saber de documentos no de multas",
    "estoy hablando del corralón no de multas",
    "mi pregunta es sobre mis derechos",
    "no es sobre alcohol, es sobre la licencia",
    "te pregunté sobre el costo no dónde pagar"
  ]
};

// ========== FUNCIÓN PARA ENVIAR MENSAJE ==========
async function enviarMensaje(sessionId, usuarioId, mensaje, nombre) {
  try {
    const response = await axios.post(CHAT_URL, {
      sessionId,
      usuarioId,
      mensaje,
      nombre
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    return response.data;
  } catch (error) {
    return { error: error.message };
  }
}

// ========== FUNCIÓN DE DELAY ==========
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ========== ENTRENAMIENTO POR CATEGORÍA ==========
async function entrenarCategoria(categoria, preguntas, usuarioId) {
  console.log(`\n${colors.yellow}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.yellow}  ENTRENANDO: ${categoria.toUpperCase()}${colors.reset}`);
  console.log(`${colors.yellow}  Total preguntas: ${preguntas.length}${colors.reset}`);
  console.log(`${colors.yellow}═══════════════════════════════════════════════════════════${colors.reset}\n`);

  let exitosos = 0;
  let errores = 0;
  const sessionId = uuidv4();

  for (let i = 0; i < preguntas.length; i++) {
    const pregunta = preguntas[i];
    const resultado = await enviarMensaje(sessionId, usuarioId, pregunta, 'Entrenador');
    
    if (resultado.error) {
      console.log(`${colors.red}❌ [${i+1}/${preguntas.length}] "${pregunta}" → ERROR: ${resultado.error}${colors.reset}`);
      errores++;
    } else {
      const tema = resultado.cluster || resultado.tema || 'unknown';
      const respuestaCorta = resultado.mensaje ? resultado.mensaje.substring(0, 80) + '...' : 'Sin respuesta';
      console.log(`${colors.green}✅ [${i+1}/${preguntas.length}] "${pregunta}"${colors.reset}`);
      console.log(`   ${colors.cyan}→ Tema: ${tema}${colors.reset}`);
      exitosos++;
    }
    
    // Pequeña pausa para no sobrecargar
    await delay(100);
  }

  return { exitosos, errores, total: preguntas.length };
}

// ========== ENTRENAR CONVERSACIONES COMPLETAS ==========
async function entrenarConversaciones(usuarioId) {
  console.log(`\n${colors.magenta}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.magenta}  ENTRENANDO: CONVERSACIONES COMPLETAS${colors.reset}`);
  console.log(`${colors.magenta}═══════════════════════════════════════════════════════════${colors.reset}\n`);

  const conversaciones = [
    // Conversación 1: Multa e impugnación
    [
      "hola",
      "me acaban de poner una multa",
      "quiero impugnarla",
      "cuánto tiempo tengo para impugnar",
      "qué documentos necesito",
      "gracias por la ayuda"
    ],
    // Conversación 2: Accidente
    [
      "buenas tardes",
      "tuve un accidente",
      "el otro conductor se fue",
      "qué hago ahora",
      "dónde levanto la denuncia",
      "mi seguro cubre esto"
    ],
    // Conversación 3: Corralón
    [
      "hola necesito ayuda",
      "se llevaron mi carro la grúa",
      "dónde está el corralón",
      "cuánto me van a cobrar",
      "qué documentos necesito para sacarlo",
      "ok gracias"
    ],
    // Conversación 4: Documentos
    [
      "buenas",
      "qué documentos necesito para manejar",
      "dónde renuevo la licencia",
      "cuánto cuesta",
      "qué requisitos piden",
      "perfecto"
    ],
    // Conversación 5: Derechos
    [
      "hola lexia",
      "qué hago si me para un oficial",
      "puede quitarme las llaves",
      "puedo grabarlo",
      "me pidió dinero qué hago",
      "dónde lo denuncio"
    ],
    // Conversación 6: Alcoholímetro
    [
      "buenas noches",
      "me detuvieron en el alcoholímetro",
      "di positivo pero solo tomé una cerveza",
      "puedo impugnar",
      "se llevaron mi carro al corralón",
      "cuánto cuesta sacarlo"
    ],
    // Conversación 7: Fotomulta
    [
      "hola",
      "me llegó una fotomulta",
      "pero ese no es mi carro",
      "cómo la impugno",
      "cuánto tiempo tengo",
      "gracias"
    ],
    // Conversación 8: Caso complejo
    [
      "hola tengo un problema",
      "ayer choqué y el otro conductor no tiene seguro",
      "mi seguro no quiere pagar porque dice que fue mi culpa",
      "pero el otro se pasó el alto",
      "qué puedo hacer",
      "necesito un abogado",
      "me puedes recomendar uno"
    ]
  ];

  let exitosos = 0;
  let errores = 0;

  for (let c = 0; c < conversaciones.length; c++) {
    const conversacion = conversaciones[c];
    const sessionId = uuidv4();
    
    console.log(`\n${colors.blue}--- Conversación ${c + 1}/${conversaciones.length} ---${colors.reset}`);
    
    for (const mensaje of conversacion) {
      const resultado = await enviarMensaje(sessionId, usuarioId, mensaje, 'Usuario' + c);
      
      if (resultado.error) {
        console.log(`${colors.red}❌ "${mensaje}" → ERROR${colors.reset}`);
        errores++;
      } else {
        console.log(`${colors.green}✅ "${mensaje}" → ${resultado.cluster || 'ok'}${colors.reset}`);
        exitosos++;
      }
      
      await delay(150);
    }
  }

  return { exitosos, errores };
}

// ========== MAIN: EJECUTAR ENTRENAMIENTO COMPLETO ==========
async function main() {
  console.log(`\n${colors.cyan}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║     🧠 ENTRENAMIENTO MASIVO DE LEXIA 🧠                   ║${colors.reset}`);
  console.log(`${colors.cyan}║     Sistema de Aprendizaje Adaptativo                     ║${colors.reset}`);
  console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════════╝${colors.reset}\n`);

  const usuarioId = '5aeddb88-ba10-4b0d-bb11-aecdd59d7808';
  const resultados = {};
  let totalPreguntas = 0;
  let totalExitosos = 0;
  let totalErrores = 0;

  const inicio = Date.now();

  // Entrenar cada categoría
  for (const [categoria, preguntas] of Object.entries(PREGUNTAS_ENTRENAMIENTO)) {
    const resultado = await entrenarCategoria(categoria, preguntas, usuarioId);
    resultados[categoria] = resultado;
    totalPreguntas += resultado.total;
    totalExitosos += resultado.exitosos;
    totalErrores += resultado.errores;
  }

  // Entrenar conversaciones completas
  console.log(`\n${colors.magenta}Entrenando conversaciones de continuidad...${colors.reset}`);
  const convResult = await entrenarConversaciones(usuarioId);
  totalExitosos += convResult.exitosos;
  totalErrores += convResult.errores;

  const duracion = ((Date.now() - inicio) / 1000).toFixed(1);

  // Resumen final
  console.log(`\n${colors.cyan}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║                    📊 RESUMEN FINAL                        ║${colors.reset}`);
  console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════════╝${colors.reset}\n`);
  
  console.log(`${colors.green}✅ Preguntas exitosas: ${totalExitosos}${colors.reset}`);
  console.log(`${colors.red}❌ Errores: ${totalErrores}${colors.reset}`);
  console.log(`📊 Total procesadas: ${totalPreguntas + convResult.exitosos + convResult.errores}`);
  console.log(`⏱️  Duración: ${duracion} segundos`);
  console.log(`📈 Tasa de éxito: ${((totalExitosos / (totalExitosos + totalErrores)) * 100).toFixed(1)}%`);

  console.log(`\n${colors.yellow}Resultados por categoría:${colors.reset}`);
  for (const [cat, res] of Object.entries(resultados)) {
    const status = res.errores === 0 ? '✅' : '⚠️';
    console.log(`  ${status} ${cat}: ${res.exitosos}/${res.total}`);
  }

  console.log(`\n${colors.green}🎉 ¡Entrenamiento completado!${colors.reset}`);
  console.log(`${colors.cyan}LexIA ahora tiene más patrones para detectar intenciones.${colors.reset}\n`);
}

// Ejecutar
main().catch(console.error);
