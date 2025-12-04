/**
 * Script de prueba para RAG con lenguaje extremadamente informal
 * Prueba el flujo completo: NLP → Ollama → Clustering → RAG → Response
 */

const axios = require('axios');
const crypto = require('crypto');

// Configuración
const BASE_URL = 'http://localhost';
const SESSION_ID = crypto.randomUUID(); // UUID válido para sesión
const USER_ID = crypto.randomUUID();     // UUID válido para usuario

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(color, title, content) {
  console.log(`\n${colors[color]}${colors.bright}━━━ ${title} ━━━${colors.reset}`);
  if (typeof content === 'object') {
    console.log(JSON.stringify(content, null, 2));
  } else {
    console.log(content);
  }
}

// Frases extremadamente informales y coloquiales
const frasesInformales = [
  // Caso 1: Alcoholímetro muy informal
  "wey no mames me agarraron bien pedote manejando que hago we",

  // Caso 2: Accidente con fuga muy coloquial
  "verga compa iba todo pilas y un pendejo me topo y se pelo que pedo hago",

  // Caso 3: Grúa muy informal
  "no mames carnal me quitaron la troca por estacionarme en una pinche banqueta alv",

  // Caso 4: Semáforo muy coloquial
  "nel we me brinque un alto rojo como pendejo y creo que me vio la camara que onda",

  // Caso 5: Daño propiedad pública (debería usar Ollama)
  "wey compa me lleve un puto poste de luz manejando que me va a pasar cabron"
];

async function testNLP(texto) {
  log('cyan', 'PASO 1: NLP - Análisis de texto', `Texto: "${texto}"`);

  try {
    const response = await axios.post(`${BASE_URL}/api/nlp/process`, {
      textoConsulta: texto,
      usuarioId: USER_ID,
      useOllama: true
    }, { timeout: 20000 });

    const data = response.data;

    log('green', 'NLP Response', {
      textoOriginal: data.textoOriginal,
      textoNormalizado: data.textoNormalizado,
      intencion: data.intencion,
      palabrasClave: data.palabrasClave,
      cluster: data.cluster,
      confianza: data.confianza,
      ollamaUsado: data.ollama?.used,
      temaOllama: data.ollama?.tema
    });

    return data;
  } catch (error) {
    log('red', 'ERROR en NLP', error.message);
    return null;
  }
}

async function testRAG(texto, nlpData) {
  log('cyan', 'PASO 2: RAG - Búsqueda de artículos similares', `Query: "${nlpData.textoNormalizado}"`);

  try {
    const response = await axios.post(`${BASE_URL}/api/rag/search-smart`, {
      query: texto,
      limit: 5,
      threshold: 0.3
    }, { timeout: 20000 });

    const data = response.data;

    log('green', 'RAG Response', {
      chunksEncontrados: data.chunksRecuperados?.length || 0,
      clusterDetectado: data.clusterDetectado,
      tiempoBusqueda: data.tiempoBusquedaMs + 'ms'
    });

    if (data.chunksRecuperados && data.chunksRecuperados.length > 0) {
      console.log(`\n${colors.yellow}Top 3 Artículos más relevantes:${colors.reset}`);
      data.chunksRecuperados.slice(0, 3).forEach((chunk, i) => {
        console.log(`\n${colors.bright}${i + 1}. ${chunk.tituloDocumento || 'Sin título'}${colors.reset}`);
        console.log(`   📊 Similitud: ${colors.green}${(chunk.similitud * 100).toFixed(2)}%${colors.reset}`);
        console.log(`   📄 Categoría: ${chunk.categoria || 'N/A'}`);
        console.log(`   📝 Contenido: ${chunk.contenido.substring(0, 150)}...`);
      });
    } else {
      log('red', 'No se encontraron artículos', 'RAG no retornó chunks');
    }

    return data;
  } catch (error) {
    log('red', 'ERROR en RAG', error.message);
    return null;
  }
}

async function testChatCompleto(texto) {
  log('cyan', 'PASO 3: Chat Completo - Respuesta integrada', `Mensaje: "${texto}"`);

  try {
    const response = await axios.post(`${BASE_URL}/api/chat/message`, {
      sessionId: SESSION_ID,
      mensaje: texto,
      usuarioId: USER_ID,
      nombre: 'Test User'
    }, { timeout: 30000 });

    const data = response.data;

    log('green', 'Chat Response', {
      success: data.success,
      cluster: data.cluster,
      sentimiento: data.sentimiento,
      articulosEncontrados: data.articulos?.length || 0,
      profesionistasRecomendados: data.profesionistas?.length || 0,
      sugerencias: data.sugerencias?.length || 0
    });

    if (data.articulos && data.articulos.length > 0) {
      console.log(`\n${colors.yellow}Artículos en respuesta:${colors.reset}`);
      data.articulos.forEach((art, i) => {
        console.log(`${i + 1}. ${colors.bright}${art.titulo}${colors.reset}`);
        console.log(`   Similitud: ${colors.green}${(art.similitud * 100).toFixed(2)}%${colors.reset}`);
      });
    }

    console.log(`\n${colors.magenta}Respuesta al usuario:${colors.reset}`);
    console.log(data.mensaje.substring(0, 500) + '...\n');

    return data;
  } catch (error) {
    log('red', 'ERROR en Chat', error.response?.data || error.message);
    return null;
  }
}

async function testOllama(texto) {
  log('cyan', 'PASO OPCIONAL: Ollama - Normalización directa', `Texto: "${texto}"`);

  try {
    const response = await axios.post('http://localhost:3007/normalize', {
      texto: texto
    }, { timeout: 30000 });

    const data = response.data;

    log('green', 'Ollama Normalización', {
      textoOriginal: data.textoOriginal,
      textoNormalizado: data.textoNormalizado,
      tema: data.tema,
      entidades: data.entidades,
      palabrasClave: data.palabrasClave,
      confianza: data.confianza,
      latencia: data.latencyMs + 'ms',
      modelo: data.model
    });

    return data;
  } catch (error) {
    log('red', 'ERROR en Ollama', error.message);
    return null;
  }
}

async function runTest() {
  console.log(`\n${colors.bright}${colors.blue}╔════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}║  TEST RAG - LENGUAJE EXTREMADAMENTE INFORMAL         ║${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}╚════════════════════════════════════════════════════════╝${colors.reset}`);

  for (let i = 0; i < frasesInformales.length; i++) {
    const frase = frasesInformales[i];

    console.log(`\n\n${colors.bright}${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}  TEST ${i + 1}/${frasesInformales.length}${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}Frase informal:${colors.reset} "${frase}"\n`);

    // Paso 1: NLP
    const nlpData = await testNLP(frase);
    if (!nlpData) continue;

    await new Promise(resolve => setTimeout(resolve, 500));

    // Paso 2: RAG
    const ragData = await testRAG(frase, nlpData);

    await new Promise(resolve => setTimeout(resolve, 500));

    // Paso 3: Test Ollama directo (solo si tiene palabras especiales)
    if (nlpData.ollama?.used || frase.includes('poste')) {
      await testOllama(frase);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Paso 4: Chat completo
    await testChatCompleto(frase);

    // Pausa entre tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n\n${colors.bright}${colors.green}╔════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.green}║  TEST COMPLETADO - Revisa los resultados arriba       ║${colors.reset}`);
  console.log(`${colors.bright}${colors.green}╚════════════════════════════════════════════════════════╝${colors.reset}\n`);
}

// Ejecutar
runTest().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
