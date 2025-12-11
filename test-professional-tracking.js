// Test Professional Tracking System
// Tests accept/reject flow and 3-rejection blocking

const axios = require('axios');

const CHAT_URL = 'http://localhost:3010';
const OLAP_URL = 'http://localhost:3001';

// Test data - Real IDs from database
const testUsuarioId = '2e4d95aa-3746-4ed5-a67b-d80927d9d622'; // Test Ciudadano
const testProfesionistaId = 'a2222222-2222-2222-2222-222222222222'; // María (Abogado)
const testProfesionistaId2 = 'a1111111-1111-1111-1111-111111111111'; // Carlos (Abogado)
const testCluster = 'C1';

async function testTrackingSystem() {
  console.log('🧪 Test Professional Tracking System\n');

  try {
    // 1. Test rejection endpoint (OLAP)
    console.log('1️⃣ Testing OLAP rejection endpoint...');
    for (let i = 1; i <= 3; i++) {
      const rechazarRes = await axios.post(`${OLAP_URL}/tracking/profesionista/rechazo`, {
        usuarioId: testUsuarioId,
        profesionistaId: testProfesionistaId,
        cluster: testCluster,
        razon: `Test rechazo ${i}`
      });
      console.log(`   Rechazo ${i}/3:`, {
        success: rechazarRes.data.success,
        totalRechazos: rechazarRes.data.totalRechazos,
        bloqueado: rechazarRes.data.bloqueado
      });
    }

    // 2. Test get rechazos count
    console.log('\n2️⃣ Getting rejection count...');
    const rechazosRes = await axios.get(`${OLAP_URL}/tracking/profesionista/${testProfesionistaId}/rechazos/${testUsuarioId}`);
    console.log('   Rechazos:', rechazosRes.data);

    // 3. Test get blocked professionals
    console.log('\n3️⃣ Getting blocked professionals list...');
    const bloqueadosRes = await axios.get(`${OLAP_URL}/tracking/usuario/${testUsuarioId}/profesionistas-bloqueados`);
    console.log('   Bloqueados:', bloqueadosRes.data);

    // 4. Test chat endpoint rejection
    console.log('\n4️⃣ Testing Chat rejection endpoint...');
    const chatRechazarRes = await axios.post(`${CHAT_URL}/profesionista/rechazar`, {
      usuarioId: testUsuarioId,
      profesionistaId: testProfesionistaId,
      cluster: testCluster,
      razon: 'Test desde chat'
    });
    console.log('   Chat rechazo:', chatRechazarRes.data);

    // 5. Test acceptance endpoint
    console.log('\n5️⃣ Testing acceptance endpoint...');
    const aceptarRes = await axios.post(`${CHAT_URL}/profesionista/aceptar`, {
      usuarioId: testUsuarioId,
      profesionistaId: testProfesionistaId2, // Different professional (Carlos)
      cluster: testCluster,
      tipoAccion: 'contacto'
    });
    console.log('   Aceptación:', aceptarRes.data);

    // 6. Test blocked list from chat
    console.log('\n6️⃣ Getting blocked list from Chat endpoint...');
    const chatBloqueadosRes = await axios.get(`${CHAT_URL}/usuario/${testUsuarioId}/profesionistas-bloqueados`);
    console.log('   Chat bloqueados:', chatBloqueadosRes.data);

    console.log('\n✅ All tests completed!');

    // Cleanup suggestion
    console.log('\n🧹 Cleanup: Run this SQL to remove test data:');
    console.log(`   DELETE FROM professional_tracking WHERE usuario_id = '${testUsuarioId}';`);

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

testTrackingSystem();
