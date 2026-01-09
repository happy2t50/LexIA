/**
 * Test completo del flujo con SlangNormalizer
 * Prueba que la normalización de slang funciona antes de RAG
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Generar UUIDs válidos
const SESSION_ID = uuidv4();
const USER_ID = uuidv4();

console.log('\n🧪 Test SlangNormalizer Integration');
console.log('═'.repeat(60));
console.log(`Session ID: ${SESSION_ID}`);
console.log(`User ID: ${USER_ID}`);

const FRASE_INFORMAL = "wey no mames me agarraron bien pedote manejando que hago we";

async function testChatWithSlang() {
  console.log(`\n📝 Mensaje informal: "${FRASE_INFORMAL}"\n`);

  try {
    // Test chat completo
    console.log('💬 Enviando mensaje al chat...\n');
    const chatResponse = await axios.post('http://localhost/api/chat/message', {
      sessionId: SESSION_ID,
      mensaje: FRASE_INFORMAL,
      usuarioId: USER_ID,
      nombre: 'Test User'
    }, { timeout: 30000 });

    const data = chatResponse.data;

    console.log('✅ RESPUESTA DEL CHAT:');
    console.log('━'.repeat(60));
    console.log(`Success: ${data.success}`);
    console.log(`Cluster: ${data.cluster}`);
    console.log(`Sentimiento: ${data.sentimiento}`);
    console.log(`Artículos encontrados: ${data.articulos?.length || 0}`);
    console.log(`Profesionistas: ${data.profesionistas?.length || 0}`);

    if (data.articulos && data.articulos.length > 0) {
      console.log('\n📚 TOP 3 ARTÍCULOS:');
      data.articulos.slice(0, 3).forEach((art, i) => {
        console.log(`\n  ${i + 1}. ${art.titulo}`);
        console.log(`     Similitud: ${(art.similitud * 100).toFixed(2)}%`);
        console.log(`     Categoría: ${art.categoria}`);
      });
    } else {
      console.log('\n❌ NO SE ENCONTRARON ARTÍCULOS (SlangNormalizer puede no estar funcionando)');
    }

    console.log('\n📝 RESPUESTA AL USUARIO:');
    console.log('━'.repeat(60));
    console.log(data.mensaje.substring(0, 500));
    console.log('...\n');

    // Verificar que encontró artículos
    if (data.articulos && data.articulos.length > 0) {
      console.log('✅ ¡SUCCESS! SlangNormalizer está funcionando - RAG encontró artículos con slang');
    } else {
      console.log('❌ FALLO: RAG no encontró artículos - revisar SlangNormalizer');
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Test comparativo
async function testComparison() {
  console.log('\n\n🔬 TEST COMPARATIVO:');
  console.log('═'.repeat(60));

  try {
    // Test 1: RAG con slang directo
    console.log('\n1️⃣  RAG con slang directo (SIN normalización):');
    const slangResponse = await axios.post('http://localhost/api/rag/search-smart', {
      query: FRASE_INFORMAL,
      limit: 5
    });
    console.log(`   Artículos encontrados: ${slangResponse.data.chunksRecuperados?.length || 0}`);

    // Test 2: RAG con texto normalizado
    console.log('\n2️⃣  RAG con texto normalizado:');
    const normalizedResponse = await axios.post('http://localhost/api/rag/search-smart', {
      query: "me detuvieron estado de ebriedad manejando vehículo",
      limit: 5
    });
    console.log(`   Artículos encontrados: ${normalizedResponse.data.chunksRecuperados?.length || 0}`);

    console.log('\n📊 RESULTADO:');
    if (slangResponse.data.chunksRecuperados?.length === 0 &&
        normalizedResponse.data.chunksRecuperados?.length > 0) {
      console.log('   ✅ Confirmado: Normalización es NECESARIA para encontrar artículos');
    }

  } catch (error) {
    console.error('Error en test comparativo:', error.message);
  }
}

// Ejecutar tests
async function run() {
  await testComparison();
  await testChatWithSlang();
}

run().catch(console.error);
