/**
 * test-respuestas-ambiguas.js
 * 
 * Prueba el Agente Interrogador con respuestas ambiguas/tontas del usuario
 * como "del semáforo por ponerse en rojo" o "a poco se dañan esas cosas"
 */

const http = require('http');

const API_BASE = 'http://localhost/api';
const USER_ID = 'test-user-ambiguas-' + Date.now();
const USER_NAME = 'Javi Test';

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m'
};

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    
    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function sendMessage(sessionId, mensaje) {
  return makeRequest('POST', '/chat/message', {
    sessionId,
    mensaje,
    usuarioId: USER_ID,
    nombre: USER_NAME
  });
}

async function startSession() {
  return makeRequest('POST', '/chat/session/start', {
    usuarioId: USER_ID,
    nombre: USER_NAME
  });
}

function printHeader(text) {
  console.log('\n' + colors.cyan + '═'.repeat(60) + colors.reset);
  console.log(colors.cyan + '  ' + text + colors.reset);
  console.log(colors.cyan + '═'.repeat(60) + colors.reset + '\n');
}

function printUser(mensaje) {
  console.log(colors.yellow + '👤 Usuario: ' + colors.reset + mensaje);
}

function printBot(response) {
  console.log(colors.green + '🤖 LexIA:' + colors.reset);
  
  // Estado
  if (response.estadoInterrogacion) {
    console.log(colors.blue + `   📍 Estado: ${response.estadoInterrogacion}` + colors.reset);
  }
  
  // Si no entendió
  if (response.noEntendioRespuesta) {
    console.log(colors.red + `   ⚠️ No entendió la respuesta (intento ${response.intentoActual})` + colors.reset);
  }
  
  // Mensaje principal
  const lineas = response.mensaje.split('\n');
  lineas.forEach(linea => {
    if (linea.trim()) {
      console.log(colors.green + '   ' + linea + colors.reset);
    }
  });
  
  // Sugerencias
  if (response.sugerencias && response.sugerencias.length > 0) {
    console.log(colors.magenta + '   💡 Sugerencias: ' + response.sugerencias.join(' | ') + colors.reset);
  }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// ESCENARIO: Usuario responde con tonterías
// ============================================================================
async function testRespuestasAmbiguas() {
  printHeader('TEST: RESPUESTAS AMBIGUAS / TONTAS DEL USUARIO');
  
  console.log('📋 Este test simula cuando el usuario responde con cosas');
  console.log('   que no tienen sentido o no responden a la pregunta.\n');
  
  // Iniciar sesión
  const session = await startSession();
  const sessionId = session.sessionId;
  console.log(`🆔 Session ID: ${sessionId}\n`);
  
  // Conversación de prueba
  const conversacion = [
    // 1. Trigger del tema
    { 
      mensaje: 'Me pase el alto y golpee otro carro',
      descripcion: 'Trigger inicial - debería preguntar por heridos'
    },
    // 2. Respuesta ambigua a "¿Hay heridos?"
    { 
      mensaje: 'no eso creo',
      descripcion: 'Respuesta ambigua - debería interpretar como "no"'
    },
    // 3. Respuesta irrelevante a "¿El otro conductor sigue ahí?"
    { 
      mensaje: 'el hijo de toda su puta madre se murio',
      descripcion: 'Respuesta con groserías - podría indicar que sí hay heridos/muertos'
    },
    // 4. Respuesta que no responde a "¿De quién fue la culpa?"
    { 
      mensaje: 'del semaforo por ponerse en rojo',
      descripcion: 'Respuesta irrelevante - debería reformular'
    },
    // 5. Respuesta evasiva
    { 
      mensaje: 'que es eso',
      descripcion: 'Usuario pregunta en lugar de responder - debería reformular'
    },
    // 6. Otra respuesta evasiva
    { 
      mensaje: 'a poco se dañan esas cosas',
      descripcion: 'Respuesta evasiva - debería reformular'
    },
    // 7. Ahora sí una respuesta válida
    { 
      mensaje: 'Fue mi culpa',
      descripcion: 'Respuesta válida - debería avanzar'
    },
    // 8. Respuesta a seguro
    { 
      mensaje: 'si tengo',
      descripcion: 'Respuesta válida "sí"'
    },
    // 9. Respuesta a daños
    { 
      mensaje: 'solo rayones',
      descripcion: 'Respuesta válida - daños leves'
    }
  ];
  
  for (const paso of conversacion) {
    await delay(1500);
    
    console.log('\n' + colors.cyan + '─'.repeat(50) + colors.reset);
    console.log(colors.blue + `📝 ${paso.descripcion}` + colors.reset);
    
    printUser(paso.mensaje);
    
    const response = await sendMessage(sessionId, paso.mensaje);
    
    if (response.success) {
      printBot(response);
      
      // Si llegamos al final (tiene artículos o contextoRecopilado)
      if (response.contextoRecopilado) {
        console.log('\n' + colors.green + '✅ CONTEXTO FINAL RECOPILADO:' + colors.reset);
        console.log(JSON.stringify(response.contextoRecopilado, null, 2));
      }
    } else {
      console.log(colors.red + '❌ Error: ' + JSON.stringify(response) + colors.reset);
    }
  }
  
  console.log('\n' + colors.cyan + '═'.repeat(60) + colors.reset);
  console.log(colors.green + '✅ TEST COMPLETADO' + colors.reset);
  console.log(colors.cyan + '═'.repeat(60) + colors.reset);
}

// ============================================================================
// ESCENARIO: Usuario quiere saltar interrogatorio
// ============================================================================
async function testSaltarInterrogatorio() {
  printHeader('TEST: USUARIO QUIERE SALTAR INTERROGATORIO');
  
  const session = await startSession();
  const sessionId = session.sessionId;
  console.log(`🆔 Session ID: ${sessionId}\n`);
  
  // 1. Trigger
  printUser('Choqué mi carro');
  let response = await sendMessage(sessionId, 'Choqué mi carro');
  printBot(response);
  
  await delay(1500);
  
  // 2. Usuario quiere ir directo al grano
  printUser('solo dime qué hacer, no tengo tiempo para preguntas');
  response = await sendMessage(sessionId, 'solo dime qué hacer, no tengo tiempo para preguntas');
  printBot(response);
  
  // Debería ir directo al RAG
  if (response.articulos && response.articulos.length > 0) {
    console.log(colors.green + '\n✅ Se saltó el interrogatorio correctamente' + colors.reset);
  }
}

// Ejecutar
async function main() {
  try {
    await testRespuestasAmbiguas();
    console.log('\n\n');
    await testSaltarInterrogatorio();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
