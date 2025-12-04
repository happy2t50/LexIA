/**
 * Test rápido de una sola frase informal
 */

const axios = require('axios');

// Cambia esta frase por la que quieras probar
const FRASE = "wey no mames me agarraron bien pedote manejando que hago we";

async function test() {
  console.log('\n🧪 Probando frase:', FRASE);
  console.log('━'.repeat(60));

  try {
    // 1. Test Ollama directo
    console.log('\n🤖 Ollama Preprocessor:');
    const ollama = await axios.post('http://localhost:3007/normalize', { texto: FRASE });
    console.log('  ✅ Normalizado:', ollama.data.textoNormalizado);
    console.log('  📌 Tema:', ollama.data.tema);
    console.log('  🎯 Confianza:', ollama.data.confianza);
    console.log('  ⏱️  Latencia:', ollama.data.latencyMs, 'ms');

    // 2. Test NLP
    console.log('\n🧠 NLP Service:');
    const nlp = await axios.post('http://localhost/api/nlp/process', {
      textoConsulta: FRASE,
      usuarioId: 'test-123'
    });
    console.log('  ✅ Intención:', nlp.data.intencion);
    console.log('  📊 Cluster:', nlp.data.cluster);
    console.log('  🤖 Usó Ollama:', nlp.data.ollama?.used);

    // 3. Test RAG
    console.log('\n📚 RAG Search:');
    const rag = await axios.post('http://localhost/api/rag/search-smart', {
      query: FRASE,
      limit: 3
    });
    console.log('  📄 Artículos encontrados:', rag.data.chunksRecuperados?.length || 0);
    if (rag.data.chunksRecuperados?.length > 0) {
      rag.data.chunksRecuperados.forEach((chunk, i) => {
        console.log(`\n  ${i + 1}. ${chunk.tituloDocumento}`);
        console.log(`     Similitud: ${(chunk.similitud * 100).toFixed(2)}%`);
        console.log(`     Contenido: ${chunk.contenido.substring(0, 100)}...`);
      });
    }

    // 4. Test Chat completo
    console.log('\n💬 Chat Response:');
    const chat = await axios.post('http://localhost/api/chat/message', {
      sessionId: 'test-' + Date.now(),
      mensaje: FRASE,
      usuarioId: 'test-123',
      nombre: 'Test'
    });
    console.log('  ✅ Success:', chat.data.success);
    console.log('  📊 Cluster:', chat.data.cluster);
    console.log('  📄 Artículos:', chat.data.articulos?.length || 0);
    console.log('  👨‍⚖️ Profesionistas:', chat.data.profesionistas?.length || 0);
    console.log('\n  📝 Respuesta:\n');
    console.log(chat.data.mensaje.substring(0, 400) + '...\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

test();
