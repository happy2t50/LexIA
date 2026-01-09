#!/usr/bin/env node

/**
 * Test script for automatic user grouping feature
 * 
 * This script tests the automatic clustering and grouping functionality:
 * 1. Two users consult about the same topic (e.g., "accidente")
 * 2. They should be automatically added to the same grupo_usuarios
 * 3. Their grupo_miembros entries should be created with proper tracking
 * 4. The group stats endpoint should return correct data
 */

const http = require('http');

const CHAT_SERVICE_URL = 'http://localhost:3010';

// Test users and data
const testUsers = [
  {
    id: 'test-user-juan',
    tema: 'accidente',
    consulta: 'Tuve un accidente de tránsito, ¿cuáles son mis derechos?'
  },
  {
    id: 'test-user-carlos',
    tema: 'accidente',
    consulta: 'Estuve involucrado en un accidente automovilístico. ¿Qué debo hacer?'
  },
  {
    id: 'test-user-maria',
    tema: 'accidente',
    consulta: 'Fui atropellado por un coche. ¿Cómo procedo legalmente?'
  }
];

// HTTP request helper
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, CHAT_SERVICE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
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

// Test functions
async function testAutomaticGrouping() {
  console.log('\n📋 INICIANDO PRUEBAS DE AGRUPAMIENTO AUTOMÁTICO\n');
  console.log(`🎯 URL del servicio: ${CHAT_SERVICE_URL}\n`);

  try {
    // Step 1: Register users in cluster
    console.log('📝 PASO 1: Registrando usuarios en cluster C1 (Accidentes)\n');
    
    for (const user of testUsers) {
      console.log(`  → Registrando ${user.id} con tema: "${user.tema}"`);
      
      // Simulate registering user in cluster through consultation endpoint
      const response = await makeRequest('POST', '/foro/consulta', {
        usuarioId: user.id,
        consulta: user.consulta,
        tema: user.tema
      });

      if (response.status === 200 || response.status === 201) {
        console.log(`    ✅ Usuario registrado exitosamente\n`);
      } else {
        console.log(`    ⚠️  Respuesta: ${response.status}\n`);
      }
    }

    // Step 2: Wait a moment for database updates
    console.log('⏳ Esperando procesamiento de base de datos...\n');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Get groups for first user
    console.log('🔍 PASO 2: Obteniendo grupos del usuario juan\n');
    
    const juanGroups = await makeRequest('GET', `/user/test-user-juan/mis-grupos`);
    
    if (juanGroups.status === 200) {
      const { grupos, totalGrupos } = juanGroups.body;
      console.log(`  ✅ Total de grupos: ${totalGrupos}`);
      
      if (grupos && grupos.length > 0) {
        const grupo = grupos[0];
        console.log(`\n  📊 Detalles del grupo:`);
        console.log(`    - Cluster: ${grupo.cluster}`);
        console.log(`    - Nombre: ${grupo.nombre}`);
        console.log(`    - Total miembros: ${grupo.total_miembros}`);
        console.log(`    - Creado: ${new Date(grupo.fecha_creacion).toLocaleString()}`);
        
        if (grupo.miembros_preview) {
          console.log(`\n  👥 Preview de miembros:`);
          grupo.miembros_preview.forEach(miembro => {
            console.log(`    - ${miembro.usuarioId} (Participaciones: ${miembro.participaciones})`);
          });
        }

        // Step 4: Get group statistics
        console.log(`\n\n📊 PASO 3: Obteniendo estadísticas del grupo ${grupo.id}\n`);
        
        const stats = await makeRequest('GET', `/grupos/${grupo.id}/estadisticas`);
        
        if (stats.status === 200 && stats.body.success) {
          const groupData = stats.body.grupo;
          console.log(`  ✅ Estadísticas del grupo:`);
          console.log(`    - Cluster: ${groupData.cluster}`);
          console.log(`    - Nombre: ${groupData.nombre}`);
          console.log(`    - Miembros activos: ${groupData.miembros_activos}`);
          console.log(`    - Total participaciones: ${groupData.total_participaciones}`);
          console.log(`\n  👥 Miembros (top 10):`);
          
          if (groupData.miembros_preview && groupData.miembros_preview.length > 0) {
            groupData.miembros_preview.forEach((miembro, idx) => {
              console.log(`    ${idx + 1}. ${miembro.usuario_id} - Participaciones: ${miembro.total_participaciones}`);
            });
          } else {
            console.log(`    (Sin miembros registrados)`);
          }
        } else {
          console.log(`  ❌ Error obteniendo estadísticas: ${stats.status}`);
        }
      } else {
        console.log(`  ⚠️  El usuario no pertenece a ningún grupo aún`);
      }
    } else {
      console.log(`  ❌ Error: ${juanGroups.status}`);
    }

    // Step 5: Get groups for second user to verify they're in same group
    console.log(`\n\n🔍 PASO 4: Obteniendo grupos del usuario carlos\n`);
    
    const carlosGroups = await makeRequest('GET', `/user/test-user-carlos/mis-grupos`);
    
    if (carlosGroups.status === 200) {
      const { grupos, totalGrupos } = carlosGroups.body;
      console.log(`  ✅ Total de grupos: ${totalGrupos}`);
      
      if (grupos && grupos.length > 0) {
        const grupo = grupos[0];
        console.log(`\n  📊 Grupo de Carlos:`);
        console.log(`    - Cluster: ${grupo.cluster}`);
        console.log(`    - Nombre: ${grupo.nombre}`);
        console.log(`    - Total miembros: ${grupo.total_miembros}`);
      }
    }

    // Step 6: Verify grouping worked
    console.log(`\n\n✨ PASO 5: Verificación de agrupamiento automático\n`);
    
    const juanG = (await makeRequest('GET', `/user/test-user-juan/mis-grupos`)).body.grupos;
    const carlosG = (await makeRequest('GET', `/user/test-user-carlos/mis-grupos`)).body.grupos;
    
    if (juanG && carlosG && juanG.length > 0 && carlosG.length > 0) {
      const sameGroup = juanG[0].id === carlosG[0].id;
      
      if (sameGroup) {
        console.log(`  ✅ ÉXITO: Juan y Carlos están en el MISMO grupo`);
        console.log(`    - ID del grupo: ${juanG[0].id}`);
        console.log(`    - Nombre: ${juanG[0].nombre}`);
        console.log(`    - Total miembros: ${juanG[0].total_miembros}`);
      } else {
        console.log(`  ❌ FALLO: Juan y Carlos están en grupos DIFERENTES`);
        console.log(`    - Grupo de Juan: ${juanG[0].id}`);
        console.log(`    - Grupo de Carlos: ${carlosG[0].id}`);
      }
    } else {
      console.log(`  ❌ No se pudieron obtener los grupos para verificación`);
    }

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
  }

  console.log('\n\n═══════════════════════════════════════════════════════════════\n');
}

// Run tests
testAutomaticGrouping().catch(console.error);
