// Test Recommendation Filtering with Blocked Professionals
// Verifies that professionals with 3+ rejections are NOT recommended

const axios = require('axios');

const CHAT_URL = 'http://localhost:3010';

// Test data - Same as previous test
const testUsuarioId = '2e4d95aa-3746-4ed5-a67b-d80927d9d622'; // Test Ciudadano
const testCluster = 'C1'; // Infracciones de Tránsito

async function testRecommendationFiltering() {
  console.log('🧪 Test Recommendation Filtering\n');

  try {
    // 1. Get lawyer recommendations for cluster C1
    console.log('1️⃣ Getting lawyer recommendations (should exclude blocked professionals)...');
    const recRes = await axios.post(`${CHAT_URL}/recommend-lawyers`, {
      cluster: testCluster,
      usuarioId: testUsuarioId,
      limit: 10
    });

    console.log('   Recommendations:', {
      cluster: recRes.data.cluster,
      totalAbogados: recRes.data.totalAbogados,
      bloqueados: recRes.data.bloqueados,
      abogados: recRes.data.abogados.map(a => ({
        nombre: a.nombre,
        id: a.id,
        rating: a.rating,
        experiencia: a.experiencia,
        scorePersonalizado: a.scorePersonalizado
      }))
    });

    // 2. Verify blocked professional is NOT in recommendations
    const blockedId = 'a2222222-2222-2222-2222-222222222222'; // María (blocked)
    const isBlocked = recRes.data.abogados.some(a => a.id === blockedId);

    if (isBlocked) {
      console.log('\n❌ FAIL: Blocked professional IS in recommendations (should be filtered out)');
      console.log(`   Blocked ID: ${blockedId}`);
    } else {
      console.log('\n✅ PASS: Blocked professional correctly excluded from recommendations');
      console.log(`   Blocked professional (${blockedId}) NOT in list`);
    }

    // 3. Show which professionals ARE recommended
    console.log('\n📋 Recommended professionals:');
    recRes.data.abogados.forEach((abogado, i) => {
      console.log(`   ${i + 1}. ${abogado.nombre} (${abogado.id.substring(0, 8)}) - Rating: ${abogado.rating}`);
    });

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

testRecommendationFiltering();
