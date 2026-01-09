/**
 * Script de prueba para validar el manejo de consultas coloquiales
 * con las mejoras implementadas en LegalNormalizer y Ollama
 */

const axios = require('axios');

const CHAT_URL = 'http://localhost:3010';
const USUARIO_ID = '550e8400-e29b-41d4-a716-446655440000';
const NOMBRE = 'Carlos';

// Colores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

/**
 * Casos de prueba con diferentes niveles de jerga y contexto
 */
const CASOS_PRUEBA = [
  {
    id: 1,
    nombre: 'Accidente con fuga - jerga intensa',
    mensaje: 'la neta carnal habia un wey que se paso de verga y que sas we le lanso el carro y le di en toda su puta madre',
    expectativas: {
      tema: 'accidente',
      culpabilidad: 'usuario_culpable',
      urgencia: 'alta',
      emocion: 'enojado',
      debeIncluir: ['911', 'permanecer', 'fuga', 'carnal', 'compa'],
      noDebeIncluir: ['wey', 'verga', 'puta madre']
    }
  },
  {
    id: 2,
    nombre: 'Accidente víctima - preocupado',
    mensaje: 'me chocaron y el otro wey se peló, estoy bien nervioso no sé qué hacer',
    expectativas: {
      tema: 'accidente',
      culpabilidad: 'usuario_victima',
      urgencia: 'alta',
      emocion: 'preocupado',
      debeIncluir: ['911', 'denuncia', 'seguro', 'testigos'],
      noDebeIncluir: []
    }
  },
  {
    id: 3,
    nombre: 'Multa con frustración',
    mensaje: 'verga me multó un poli y ni siquiera me estacioné mal, no entiendo qué pedo',
    expectativas: {
      tema: 'multa',
      culpabilidad: 'ambiguo',
      urgencia: 'media',
      emocion: 'frustrado',
      debeIncluir: ['impugnar', '15 días', 'descuento'],
      noDebeIncluir: []
    }
  },
  {
    id: 4,
    nombre: 'Alcoholímetro - desesperado',
    mensaje: 'ayuda urgente hermano me agarraron en el alcoholímetro y necesito sacar mi carro del corralón',
    expectativas: {
      tema: 'alcohol',
      culpabilidad: 'usuario_culpable',
      urgencia: 'alta',
      emocion: 'desesperado',
      debeIncluir: ['corralón', 'multa', 'licencia'],
      noDebeIncluir: []
    }
  },
  {
    id: 5,
    nombre: 'Accidente con lesiones - urgente',
    mensaje: 'carnal choqué y el otro vato está sangrando, qué hago',
    expectativas: {
      tema: 'accidente',
      culpabilidad: 'usuario_culpable',
      urgencia: 'alta',
      emocion: 'desesperado',
      debeIncluir: ['911', 'ambulancia', 'no mover', 'permanecer'],
      noDebeIncluir: []
    }
  },
  {
    id: 6,
    nombre: 'Consulta neutral - documentos',
    mensaje: 'donde renuevo mi licencia en tuxtla',
    expectativas: {
      tema: 'documentos',
      culpabilidad: 'ninguno',
      urgencia: 'baja',
      emocion: 'neutral',
      debeIncluir: ['Secretaría de Movilidad', 'requisitos', 'cita'],
      noDebeIncluir: []
    }
  },
  {
    id: 7,
    nombre: 'Atropello como víctima',
    mensaje: 'un pendejo me atropelló en la bici y se fue, quedé bien jodido',
    expectativas: {
      tema: 'atropello',
      culpabilidad: 'usuario_victima',
      urgencia: 'alta',
      emocion: 'enojado',
      debeIncluir: ['911', 'lesiones', 'denuncia', 'placas'],
      noDebeIncluir: []
    }
  },
  {
    id: 8,
    nombre: 'Velocidad excesiva',
    mensaje: 'me multaron porque iba volando en la carretera, iba como a 140',
    expectativas: {
      tema: 'multa',
      culpabilidad: 'usuario_culpable',
      urgencia: 'media',
      emocion: 'neutral',
      debeIncluir: ['exceso de velocidad', 'multa', 'pagar'],
      noDebeIncluir: []
    }
  },
  {
    id: 9,
    nombre: 'Semáforo en rojo',
    mensaje: 'se me pasó un rojo y me levantaron infracción, qué pedo',
    expectativas: {
      tema: 'semaforo',
      culpabilidad: 'usuario_culpable',
      urgencia: 'media',
      emocion: 'neutral',
      debeIncluir: ['semáforo', 'infracción', 'puntos'],
      noDebeIncluir: []
    }
  },
  {
    id: 10,
    nombre: 'Colisión mutua',
    mensaje: 'nos dimos un madrazo en un cruce, ambos tenemos culpa creo',
    expectativas: {
      tema: 'accidente',
      culpabilidad: 'ambiguo',
      urgencia: 'media',
      emocion: 'neutral',
      debeIncluir: ['intercambiar datos', 'seguro', 'reporte'],
      noDebeIncluir: []
    }
  }
];

/**
 * Iniciar sesión de chat
 */
async function iniciarSesion() {
  try {
    console.log(`${colors.blue}${colors.bright}Iniciando sesión de chat...${colors.reset}`);
    const response = await axios.post(`${CHAT_URL}/session/start`, {
      usuarioId: USUARIO_ID,
      nombre: NOMBRE
    });

    if (response.data.success) {
      console.log(`${colors.green}✓ Sesión iniciada: ${response.data.sessionId}${colors.reset}\n`);
      return response.data.sessionId;
    } else {
      throw new Error('No se pudo iniciar sesión');
    }
  } catch (error) {
    console.error(`${colors.red}✗ Error al iniciar sesión:${colors.reset}`, error.message);
    process.exit(1);
  }
}

/**
 * Enviar mensaje y validar respuesta
 */
async function probarCaso(sessionId, caso) {
  console.log(`${colors.cyan}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}Caso ${caso.id}: ${caso.nombre}${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  console.log(`${colors.yellow}📝 Mensaje del usuario:${colors.reset}`);
  console.log(`   "${caso.mensaje}"\n`);

  try {
    const startTime = Date.now();
    const response = await axios.post(`${CHAT_URL}/message`, {
      sessionId,
      mensaje: caso.mensaje,
      usuarioId: USUARIO_ID,
      nombre: NOMBRE
    });

    const duration = Date.now() - startTime;

    if (response.data.success) {
      console.log(`${colors.green}✓ Respuesta recibida en ${duration}ms${colors.reset}\n`);

      // Mostrar contexto detectado (de los logs del servidor)
      console.log(`${colors.magenta}📊 Análisis del sistema:${colors.reset}`);
      console.log(`   Tema detectado: ${response.data.cluster || 'N/A'}`);
      console.log(`   Source: ${response.data.source || 'N/A'}`);
      if (response.data.articulos) {
        console.log(`   Artículos encontrados: ${response.data.articulos.length}`);
      }
      console.log('');

      // Mostrar respuesta del bot
      console.log(`${colors.blue}🤖 Respuesta de LexIA:${colors.reset}`);
      console.log(`${colors.bright}${'-'.repeat(60)}${colors.reset}`);
      console.log(response.data.mensaje);
      console.log(`${colors.bright}${'-'.repeat(60)}${colors.reset}\n`);

      // Validar expectativas
      console.log(`${colors.yellow}✓ Validación de expectativas:${colors.reset}`);
      let errores = 0;

      // Validar palabras que deben incluirse
      if (caso.expectativas.debeIncluir.length > 0) {
        const respuestaLower = response.data.mensaje.toLowerCase();
        const faltantes = caso.expectativas.debeIncluir.filter(palabra =>
          !respuestaLower.includes(palabra.toLowerCase())
        );

        if (faltantes.length > 0) {
          console.log(`   ${colors.red}✗ Faltan palabras clave: ${faltantes.join(', ')}${colors.reset}`);
          errores++;
        } else {
          console.log(`   ${colors.green}✓ Todas las palabras clave presentes${colors.reset}`);
        }
      }

      // Validar palabras que NO deben incluirse (slang sin limpiar)
      if (caso.expectativas.noDebeIncluir.length > 0) {
        const respuestaLower = response.data.mensaje.toLowerCase();
        const encontradas = caso.expectativas.noDebeIncluir.filter(palabra =>
          respuestaLower.includes(palabra.toLowerCase())
        );

        if (encontradas.length > 0) {
          console.log(`   ${colors.red}✗ Contiene slang no procesado: ${encontradas.join(', ')}${colors.reset}`);
          errores++;
        } else {
          console.log(`   ${colors.green}✓ Slang correctamente normalizado${colors.reset}`);
        }
      }

      // Validar tema detectado
      if (response.data.cluster) {
        const temaMatch = response.data.cluster.toLowerCase().includes(caso.expectativas.tema);
        if (temaMatch) {
          console.log(`   ${colors.green}✓ Tema detectado correctamente: ${response.data.cluster}${colors.reset}`);
        } else {
          console.log(`   ${colors.yellow}⚠ Tema esperado: ${caso.expectativas.tema}, detectado: ${response.data.cluster}${colors.reset}`);
        }
      }

      // Validar que hay profesionistas si aplica
      if (response.data.profesionistas && response.data.profesionistas.length > 0) {
        console.log(`   ${colors.green}✓ Se ofrecieron ${response.data.profesionistas.length} profesionistas${colors.reset}`);
      }

      // Validar que hay sugerencias
      if (response.data.sugerencias && response.data.sugerencias.length > 0) {
        console.log(`   ${colors.green}✓ Se ofrecieron ${response.data.sugerencias.length} sugerencias${colors.reset}`);
      }

      console.log('');

      // Resultado final del caso
      if (errores === 0) {
        console.log(`${colors.green}${colors.bright}✓ CASO ${caso.id} EXITOSO${colors.reset}\n`);
        return { success: true, caso: caso.id };
      } else {
        console.log(`${colors.yellow}${colors.bright}⚠ CASO ${caso.id} CON ADVERTENCIAS (${errores} errores)${colors.reset}\n`);
        return { success: false, caso: caso.id, errores };
      }

    } else {
      throw new Error('Respuesta no exitosa del servidor');
    }

  } catch (error) {
    console.error(`${colors.red}✗ Error al procesar caso ${caso.id}:${colors.reset}`, error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    console.log('');
    return { success: false, caso: caso.id, error: error.message };
  }
}

/**
 * Ejecutar todos los casos de prueba
 */
async function ejecutarPruebas() {
  console.log(`${colors.bright}${colors.blue}`);
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  PRUEBA DE MANEJO DE CONSULTAS COLOQUIALES - LexIA 2.0       ║');
  console.log('║  Script de validación con casos reales                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}\n`);

  const sessionId = await iniciarSesion();

  console.log(`${colors.cyan}Ejecutando ${CASOS_PRUEBA.length} casos de prueba...${colors.reset}\n`);

  const resultados = [];

  for (const caso of CASOS_PRUEBA) {
    const resultado = await probarCaso(sessionId, caso);
    resultados.push(resultado);

    // Esperar 2 segundos entre casos para no saturar
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Resumen final
  console.log(`${colors.bright}${colors.blue}`);
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                      RESUMEN DE RESULTADOS                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}\n`);

  const exitosos = resultados.filter(r => r.success).length;
  const fallidos = resultados.filter(r => !r.success).length;

  console.log(`${colors.green}✓ Casos exitosos: ${exitosos}/${CASOS_PRUEBA.length}${colors.reset}`);
  console.log(`${colors.red}✗ Casos con errores: ${fallidos}/${CASOS_PRUEBA.length}${colors.reset}\n`);

  if (fallidos > 0) {
    console.log(`${colors.yellow}Casos con problemas:${colors.reset}`);
    resultados.filter(r => !r.success).forEach(r => {
      const caso = CASOS_PRUEBA.find(c => c.id === r.caso);
      console.log(`   - Caso ${r.caso}: ${caso.nombre} (${r.errores || 0} errores)`);
    });
    console.log('');
  }

  const porcentajeExito = (exitosos / CASOS_PRUEBA.length * 100).toFixed(1);
  console.log(`${colors.bright}Porcentaje de éxito: ${porcentajeExito}%${colors.reset}\n`);

  if (porcentajeExito >= 80) {
    console.log(`${colors.green}${colors.bright}✓ PRUEBA EXITOSA - El sistema maneja bien las consultas coloquiales${colors.reset}\n`);
  } else if (porcentajeExito >= 60) {
    console.log(`${colors.yellow}${colors.bright}⚠ PRUEBA ACEPTABLE - Hay áreas de mejora${colors.reset}\n`);
  } else {
    console.log(`${colors.red}${colors.bright}✗ PRUEBA FALLIDA - Se requieren mejoras significativas${colors.reset}\n`);
  }
}

// Ejecutar pruebas
ejecutarPruebas().catch(error => {
  console.error(`${colors.red}Error fatal:${colors.reset}`, error);
  process.exit(1);
});
