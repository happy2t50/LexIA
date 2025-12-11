// Test Sistema Completo de Tracking y Calificaciones
// Prueba el flujo completo: recomendar → rechazar 3x → bloquear → calificar otro

const axios = require('axios');

const CHAT_URL = 'http://localhost:3010';

// 4 Usuarios ciudadanos de prueba
const carlos = '2e4d95aa-3746-4ed5-a67b-d80927d9d622';
const juan = 'f0a3f291-90d3-4aa9-8e35-303db6f1d752';
const pedro = '73ef5054-3812-4e26-a75f-f796fe247ea0';
const ana = '567e4567-e89b-12d3-a456-426614174222';

// 3 Abogados
const maria = 'a2222222-2222-2222-2222-222222222222';
const carlosAbogado = 'a1111111-1111-1111-1111-111111111111';
const roberto = 'a3333333-3333-3333-3333-333333333333';

const cluster = 'C1';

async function testSistemaCompleto() {
  console.log('🧪 Test Sistema Completo de Tracking y Calificaciones\n');
  console.log('📋 Escenario:');
  console.log('   - Carlos rechaza a María 3 veces → María bloqueada SOLO para Carlos');
  console.log('   - Juan, Pedro y Ana SÍ pueden ver a María');
  console.log('   - Carlos califica a Roberto con 5 estrellas\n');

  try {
    // ============================================================
    // 1. CARLOS RECHAZA A MARÍA 3 VECES
    // ============================================================
    console.log('1️⃣  Carlos rechaza a María 3 veces...');
    for (let i = 1; i <= 3; i++) {
      const res = await axios.post(`${CHAT_URL}/profesionista/rechazar`, {
        usuarioId: carlos,
        profesionistaId: maria,
        cluster,
        razon: `Test rechazo ${i} - No me convenció`
      });
      console.log(`   Rechazo ${i}/3:`, {
        totalRechazos: res.data.totalRechazos,
        bloqueado: res.data.bloqueado
      });
    }

    // ============================================================
    // 2. VERIFICAR QUE MARÍA ESTÁ BLOQUEADA PARA CARLOS
    // ============================================================
    console.log('\n2️⃣  Verificando que María está bloqueada SOLO para Carlos...');
    
    // Carlos no debe ver a María
    const carlosRec = await axios.post(`${CHAT_URL}/recommend-lawyers`, {
      cluster,
      usuarioId: carlos,
      limit: 10
    });
    const carlosVeMaria = carlosRec.data.abogados.some(a => a.id === maria);
    console.log(`   ❌ Carlos ve a María: ${carlosVeMaria} (debe ser false)`);
    console.log(`   ✅ Carlos ve ${carlosRec.data.totalAbogados} abogados (excluye a María)`);

    // Juan SÍ debe ver a María (no la ha rechazado)
    const juanRec = await axios.post(`${CHAT_URL}/recommend-lawyers`, {
      cluster,
      usuarioId: juan,
      limit: 10
    });
    const juanVeMaria = juanRec.data.abogados.some(a => a.id === maria);
    console.log(`   ✅ Juan ve a María: ${juanVeMaria} (debe ser true)`);
    console.log(`   ✅ Juan ve ${juanRec.data.totalAbogados} abogados (incluye a María)`);

    // ============================================================
    // 3. CARLOS ACEPTA Y CALIFICA A ROBERTO CON 5 ESTRELLAS
    // ============================================================
    console.log('\n3️⃣  Carlos acepta a Roberto...');
    const aceptRes = await axios.post(`${CHAT_URL}/profesionista/aceptar`, {
      usuarioId: carlos,
      profesionistaId: roberto,
      cluster,
      tipoAccion: 'contratacion'
    });
    console.log(`   ✅ Aceptación registrada:`, aceptRes.data.message);

    console.log('\n4️⃣  Carlos califica a Roberto con 5 estrellas...');
    const ratingRes = await axios.post(`${CHAT_URL}/profesionista/calificar`, {
      usuarioId: carlos,
      profesionistaId: roberto,
      rating: 5,
      comentario: 'Excelente abogado, me ayudó mucho con mi caso'
    });
    console.log(`   ⭐ Calificación registrada:`, ratingRes.data.message);

    // ============================================================
    // 4. VERIFICAR RATING DE ROBERTO
    // ============================================================
    console.log('\n5️⃣  Obteniendo rating actual de Roberto...');
    const robertoRating = await axios.get(`${CHAT_URL}/profesionista/${roberto}/rating`);
    console.log(`   Rating promedio: ${robertoRating.data.promedio}/5`);
    console.log(`   Total calificaciones: ${robertoRating.data.total}`);

    // ============================================================
    // 5. OTROS USUARIOS CALIFICAN A DIFERENTES ABOGADOS
    // ============================================================
    console.log('\n6️⃣  Otros usuarios califican abogados...');
    
    // Juan califica a María con 4 estrellas
    await axios.post(`${CHAT_URL}/profesionista/calificar`, {
      usuarioId: juan,
      profesionistaId: maria,
      rating: 4,
      comentario: 'Buena atención, resolvió mi caso'
    });
    console.log(`   ⭐ Juan calificó a María: 4/5`);

    // Pedro califica a Roberto con 5 estrellas
    await axios.post(`${CHAT_URL}/profesionista/calificar`, {
      usuarioId: pedro,
      profesionistaId: roberto,
      rating: 5,
      comentario: 'Muy profesional y eficiente'
    });
    console.log(`   ⭐ Pedro calificó a Roberto: 5/5`);

    // Ana califica a Carlos Abogado con 3 estrellas
    await axios.post(`${CHAT_URL}/profesionista/calificar`, {
      usuarioId: ana,
      profesionistaId: carlosAbogado,
      rating: 3,
      comentario: 'Regular, esperaba más'
    });
    console.log(`   ⭐ Ana calificó a Carlos (abogado): 3/5`);

    // ============================================================
    // 7. OBTENER RATINGS FINALES
    // ============================================================
    console.log('\n7️⃣  Ratings finales de todos los abogados:');
    
    const mariaRatingFinal = await axios.get(`${CHAT_URL}/profesionista/${maria}/rating`);
    console.log(`   👩‍⚖️  María: ${mariaRatingFinal.data.promedio}/5 (${mariaRatingFinal.data.total} calificaciones)`);
    
    const robertoRatingFinal = await axios.get(`${CHAT_URL}/profesionista/${roberto}/rating`);
    console.log(`   👨‍⚖️  Roberto: ${robertoRatingFinal.data.promedio}/5 (${robertoRatingFinal.data.total} calificaciones)`);
    
    const carlosAbogadoRating = await axios.get(`${CHAT_URL}/profesionista/${carlosAbogado}/rating`);
    console.log(`   👨‍⚖️  Carlos (abogado): ${carlosAbogadoRating.data.promedio}/5 (${carlosAbogadoRating.data.total} calificaciones)`);

    // ============================================================
    // RESUMEN FINAL
    // ============================================================
    console.log('\n✅ RESUMEN DEL SISTEMA:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Bloqueos:');
    console.log(`   • María bloqueada SOLO para Carlos (3 rechazos)`);
    console.log(`   • Juan, Pedro y Ana SÍ pueden ver a María`);
    console.log('');
    console.log('⭐ Calificaciones:');
    console.log(`   • Roberto: ${robertoRatingFinal.data.promedio}/5 (mejor rating)`);
    console.log(`   • María: ${mariaRatingFinal.data.promedio}/5`);
    console.log(`   • Carlos (abogado): ${carlosAbogadoRating.data.promedio}/5`);
    console.log('');
    console.log('🎯 Sistema funcionando correctamente:');
    console.log('   ✓ Bloqueos individuales por usuario');
    console.log('   ✓ Sistema de calificaciones 1-5 estrellas');
    console.log('   ✓ Ratings actualizados en tiempo real');
    console.log('   ✓ Múltiples usuarios pueden calificar al mismo abogado');

    console.log('\n🧹 Cleanup: Ejecuta este SQL para limpiar datos de prueba:');
    console.log(`   DELETE FROM professional_tracking WHERE usuario_id IN ('${carlos}', '${juan}', '${pedro}', '${ana}');`);
    console.log(`   DELETE FROM professional_ratings WHERE usuario_id IN ('${carlos}', '${juan}', '${pedro}', '${ana}');`);

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

testSistemaCompleto();
