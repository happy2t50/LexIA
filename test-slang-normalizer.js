/**
 * TEST SIMPLE del SlangNormalizer - Solo llama al Chat
 * Usa usuarios existentes para evitar problemas de base de datos
 */

const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = 'http://localhost';

// Colores para consola
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  red: '\x1b[31m'
};

// Frases de prueba
const frases = [
  "wey no mames me agarraron bien pedote manejando que hago we",
  "verga compa un pendejo me topo y se pelo que pedo hago",
  "no mames carnal me quitaron la troca por estacionarme en una pinche banqueta alv",
  "nel we me brinque un alto rojo como pendejo y creo que me vio la camara que onda",
  "wey compa me lleve un puto poste de luz manejando que me va a pasar cabron"
];

async function testChat(frase, index) {
  console.log(`\n${c.cyan}${c.bright}═══════════════════════════════════════════════════════${c.reset}`);
  console.log(`${c.cyan}${c.bright}  TEST ${index + 1}: ${c.reset}${frase.substring(0, 50)}...`);
  console.log(`${c.cyan}${c.bright}═══════════════════════════════════════════════════════${c.reset}\n`);

  try {
    // Primero iniciar sesión
    const sessionResponse = await axios.post(`${BASE_URL}/api/chat/session/start`, {
      usuarioId: 'c1d01c6a-d0c2-4d3c-a3cb-d67d7b9b9e1e', // UUID existente en DB o será creado
      nombre: 'Test User'
    }, { timeout: 10000 });

    const sessionId = sessionResponse.data.sessionId;
    console.log(`${c.green}✅ Sesión iniciada: ${sessionId}${c.reset}\n`);

    // Enviar mensaje
    const response = await axios.post(`${BASE_URL}/api/chat/message`, {
      sessionId: sessionId,
      mensaje: frase,
      usuarioId: 'c1d01c6a-d0c2-4d3c-a3cb-d67d7b9b9e1e',
      nombre: 'Test User'
    }, { timeout: 30000 });

    const data = response.data;

    // Mostrar resultados
    console.log(`${c.yellow}📊 ANÁLISIS:${c.reset}`);
    console.log(`   Tema detectado: ${c.bright}${data.cluster}${c.reset}`);
    console.log(`   Artículos encontrados: ${c.bright}${data.articulos?.length || 0}${c.reset}`);
    
    if (data.articulos && data.articulos.length > 0) {
      console.log(`\n${c.yellow}📚 ARTÍCULOS RELEVANTES:${c.reset}`);
      data.articulos.slice(0, 2).forEach((art, i) => {
        console.log(`   ${i+1}. ${art.titulo} (${(art.similitud * 100).toFixed(1)}%)`);
      });
    }

    console.log(`\n${c.magenta}💬 RESPUESTA DE LEXIA:${c.reset}`);
    console.log(`${c.bright}─────────────────────────────────────────${c.reset}`);
    // Mostrar solo las primeras líneas de la respuesta
    const lineas = data.mensaje.split('\n').slice(0, 15);
    console.log(lineas.join('\n'));
    if (data.mensaje.split('\n').length > 15) {
      console.log(`${c.yellow}... (respuesta truncada)${c.reset}`);
    }
    console.log(`${c.bright}─────────────────────────────────────────${c.reset}`);

    if (data.sugerencias && data.sugerencias.length > 0) {
      console.log(`\n${c.cyan}💡 SUGERENCIAS:${c.reset}`);
      data.sugerencias.forEach(s => console.log(`   • ${s}`));
    }

    return true;
  } catch (error) {
    console.log(`${c.red}❌ ERROR: ${error.response?.data?.error || error.message}${c.reset}`);
    return false;
  }
}

async function main() {
  console.log(`\n${c.bright}${c.cyan}╔══════════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bright}${c.cyan}║  TEST LEXIA - TRADUCTOR DE BARRIO (SlangNormalizer)         ║${c.reset}`);
  console.log(`${c.bright}${c.cyan}╚══════════════════════════════════════════════════════════════╝${c.reset}`);

  for (let i = 0; i < frases.length; i++) {
    await testChat(frases[i], i);
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\n${c.bright}${c.green}✅ TEST COMPLETADO${c.reset}\n`);
}

main().catch(console.error);
