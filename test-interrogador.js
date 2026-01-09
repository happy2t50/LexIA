/**
 * TEST del Agente Interrogador - Simula conversación multi-turno
 * Prueba el flujo: Usuario dice "Choqué" -> Bot pregunta -> Usuario responde -> ... -> Bot da respuesta completa
 */

const axios = require('axios');
const readline = require('readline');

const BASE_URL = 'http://localhost';

// Colores
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
};

let sessionId = null;
const usuarioId = 'c1d01c6a-d0c2-4d3c-a3cb-d67d7b9b9e1e';

async function iniciarSesion() {
  try {
    const response = await axios.post(`${BASE_URL}/api/chat/session/start`, {
      usuarioId,
      nombre: 'Test User'
    }, { timeout: 10000 });
    
    sessionId = response.data.sessionId;
    console.log(`\n${c.green}✅ Sesión iniciada: ${sessionId}${c.reset}`);
    console.log(`${c.cyan}${response.data.mensaje}${c.reset}\n`);
    return true;
  } catch (error) {
    console.log(`${c.red}❌ Error iniciando sesión: ${error.message}${c.reset}`);
    return false;
  }
}

async function enviarMensaje(mensaje) {
  try {
    const response = await axios.post(`${BASE_URL}/api/chat/message`, {
      sessionId,
      mensaje,
      usuarioId,
      nombre: 'Test User'
    }, { timeout: 30000 });

    const data = response.data;
    
    console.log(`\n${c.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
    
    // Si está interrogando
    if (data.interrogando) {
      console.log(`${c.blue}🤔 LEXIA ESTÁ RECOPILANDO INFORMACIÓN${c.reset}`);
      console.log(`${c.blue}   Estado: ${data.estadoInterrogacion}${c.reset}`);
    }
    
    console.log(`\n${c.magenta}${c.bright}🤖 LexIA:${c.reset}`);
    console.log(data.mensaje);
    
    if (data.sugerencias && data.sugerencias.length > 0 && !data.interrogando) {
      console.log(`\n${c.cyan}💡 Sugerencias:${c.reset}`);
      data.sugerencias.forEach((s, i) => console.log(`   ${i+1}. ${s}`));
    }
    
    if (data.articulos && data.articulos.length > 0) {
      console.log(`\n${c.green}📚 Artículos legales encontrados: ${data.articulos.length}${c.reset}`);
      data.articulos.slice(0, 2).forEach(a => {
        console.log(`   • ${a.titulo} (${(a.similitud * 100).toFixed(1)}%)`);
      });
    }

    if (data.contextoRecopilado && Object.keys(data.contextoRecopilado.respuestasObtenidas || {}).length > 0) {
      console.log(`\n${c.green}📋 Contexto recopilado:${c.reset}`);
      Object.entries(data.contextoRecopilado.respuestasObtenidas).forEach(([key, value]) => {
        console.log(`   • ${key}: ${value}`);
      });
    }
    
    console.log(`${c.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}\n`);
    
    return data;
  } catch (error) {
    console.log(`${c.red}❌ Error: ${error.response?.data?.error || error.message}${c.reset}`);
    return null;
  }
}

// Simulación automática de conversación de accidente
async function simularConversacionAccidente() {
  console.log(`\n${c.bright}${c.cyan}╔══════════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bright}${c.cyan}║  SIMULACIÓN: AGENTE INTERROGADOR - CASO ACCIDENTE           ║${c.reset}`);
  console.log(`${c.bright}${c.cyan}╚══════════════════════════════════════════════════════════════╝${c.reset}`);

  if (!await iniciarSesion()) return;

  const conversacion = [
    "Choqué",
    "No, nadie herido",
    "Sigue aquí el otro wey",
    "Fue culpa del otro pendejo",
    "Sí tengo seguro",
    "Daños moderados"
  ];

  for (const mensaje of conversacion) {
    console.log(`\n${c.green}${c.bright}👤 Usuario:${c.reset} ${mensaje}`);
    const response = await enviarMensaje(mensaje);
    
    if (!response) break;
    
    // Si ya no está interrogando, terminamos
    if (!response.interrogando) {
      console.log(`\n${c.green}${c.bright}✅ FLUJO COMPLETADO - LexIA tiene toda la información${c.reset}`);
      break;
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }
}

// Simulación de DUI/Alcoholemia
async function simularConversacionDUI() {
  console.log(`\n${c.bright}${c.cyan}╔══════════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bright}${c.cyan}║  SIMULACIÓN: AGENTE INTERROGADOR - CASO DUI/ALCOHOLEMIA     ║${c.reset}`);
  console.log(`${c.bright}${c.cyan}╚══════════════════════════════════════════════════════════════╝${c.reset}`);

  if (!await iniciarSesion()) return;

  const conversacion = [
    "wey me agarraron bien pedo manejando",
    "Ya me detuvieron",
    "Sí me hicieron soplar",
    "Sí, salí positivo",
    "Sí, se llevaron mi troca",
    "Sí me quitaron la licencia"
  ];

  for (const mensaje of conversacion) {
    console.log(`\n${c.green}${c.bright}👤 Usuario:${c.reset} ${mensaje}`);
    const response = await enviarMensaje(mensaje);
    
    if (!response) break;
    
    if (!response.interrogando) {
      console.log(`\n${c.green}${c.bright}✅ FLUJO COMPLETADO - LexIA tiene toda la información${c.reset}`);
      break;
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }
}

// Modo interactivo
async function modoInteractivo() {
  console.log(`\n${c.bright}${c.cyan}╔══════════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bright}${c.cyan}║  MODO INTERACTIVO - AGENTE INTERROGADOR                      ║${c.reset}`);
  console.log(`${c.bright}${c.cyan}╚══════════════════════════════════════════════════════════════╝${c.reset}`);
  console.log(`${c.yellow}Escribe tus mensajes y presiona Enter. Escribe 'salir' para terminar.${c.reset}`);

  if (!await iniciarSesion()) return;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const preguntar = () => {
    rl.question(`\n${c.green}👤 Tú: ${c.reset}`, async (mensaje) => {
      if (mensaje.toLowerCase() === 'salir') {
        console.log(`\n${c.cyan}¡Hasta luego!${c.reset}\n`);
        rl.close();
        return;
      }
      
      await enviarMensaje(mensaje);
      preguntar();
    });
  };

  preguntar();
}

// Main
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--accidente')) {
    await simularConversacionAccidente();
  } else if (args.includes('--dui')) {
    await simularConversacionDUI();
  } else if (args.includes('--interactivo')) {
    await modoInteractivo();
  } else {
    console.log(`\n${c.bright}USO:${c.reset}`);
    console.log(`  node test-interrogador.js --accidente   ${c.cyan}# Simular caso de accidente${c.reset}`);
    console.log(`  node test-interrogador.js --dui         ${c.cyan}# Simular caso de DUI${c.reset}`);
    console.log(`  node test-interrogador.js --interactivo ${c.cyan}# Modo interactivo${c.reset}`);
    
    // Por defecto, correr simulación de accidente
    console.log(`\n${c.yellow}Ejecutando simulación de accidente por defecto...${c.reset}`);
    await simularConversacionAccidente();
  }
}

main().catch(console.error);
