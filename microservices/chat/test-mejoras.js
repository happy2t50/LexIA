const { SmartResponseService } = require('./dist/services/SmartResponseService');

const smartResponseService = new SmartResponseService();

const casosTest = [
  {
    id: 1,
    mensaje: "me chocaron y el wey se fue, qué hago",
    nombre: "Carlos",
    temaEsperado: "accidente",
    keywordsEsperados: ["fuga", "denuncia", "placas"],
    descripcion: "Accidente con fuga"
  },
  {
    id: 2,
    mensaje: "un carro me dio por detrás en el alto y se peló",
    nombre: "María",
    temaEsperado: "accidente",
    keywordsEsperados: ["fuga", "denuncia"],
    descripcion: "Accidente con fuga (variación)"
  },
  {
    id: 3,
    mensaje: "verga me multó un poli y ni siquiera me estacioné mal, no entiendo qué pedo",
    nombre: "Juan",
    temaEsperado: "multa",
    keywordsEsperados: ["impugnar", "15 días", "descuento"],
    descripcion: "Multa injusta (no debe detectarse como alcoholemia)"
  },
  {
    id: 5,
    mensaje: "me chocaron por detrás y el man está sangrando de la cabeza, ayuda",
    nombre: "Pedro",
    temaEsperado: "accidente",
    keywordsEsperados: ["ambulancia", "911", "permanece", "lesiones"],
    descripcion: "Accidente con lesiones (no debe detectarse como alcoholemia)"
  },
  {
    id: 7,
    mensaje: "iba por la avenida y un tipo se me atravesó, le di de lleno y está tirado en el piso",
    nombre: "Sofía",
    temaEsperado: "accidente",
    keywordsEsperados: ["lesiones", "ambulancia", "denuncia", "911"],
    descripcion: "Atropello con lesiones"
  },
  {
    id: 9,
    mensaje: "se me pasó un rojo y me levantaron infracción, qué pedo",
    nombre: "Luis",
    temaEsperado: "semaforo",
    keywordsEsperados: ["semáforo", "infracción", "puntos"],
    descripcion: "Semáforo en rojo (no debe detectarse como alcoholemia)"
  },
  {
    id: 10,
    mensaje: "nos dimos un madrazo en un cruce, qué hago ahora",
    nombre: "Ana",
    temaEsperado: "accidente",
    keywordsEsperados: ["intercambiar datos", "reporte", "911"],
    descripcion: "Accidente en cruce"
  }
];

async function ejecutarTests() {
  console.log("========================================");
  console.log("TEST DE MEJORAS - Sistema Conversacional");
  console.log("========================================\n");

  let casosExitosos = 0;
  let casosFallidos = 0;

  for (const caso of casosTest) {
    console.log(`\n📝 Caso ${caso.id}: ${caso.descripcion}`);
    console.log(`   Mensaje: "${caso.mensaje}"`);

    try {
      // Detectar tema
      const deteccion = smartResponseService.detectarTemaConConfianza(caso.mensaje);

      console.log(`   Tema detectado: ${deteccion.tema} (esperado: ${caso.temaEsperado})`);

      // Verificar tema
      const temasCorrecto = deteccion.tema === caso.temaEsperado;

      if (!temasCorrecto) {
        console.log(`   ❌ FALLÓ - Tema incorrecto`);
        casosFallidos++;
        continue;
      }

      // Generar respuesta usando el sistema real
      const resultado = await smartResponseService.generarRespuestaCompleta(
        `session_test_${caso.id}`,
        `user_test_${caso.id}`,
        caso.mensaje,
        caso.nombre,
        [],
        undefined
      );

      const respuesta = resultado.respuesta.toLowerCase();

      // Verificar keywords
      const keywordsFaltantes = [];
      const keywordsEncontrados = [];

      for (const keyword of caso.keywordsEsperados) {
        if (respuesta.includes(keyword.toLowerCase())) {
          keywordsEncontrados.push(keyword);
        } else {
          keywordsFaltantes.push(keyword);
        }
      }

      console.log(`   Keywords encontrados: ${keywordsEncontrados.join(', ')}`);

      if (keywordsFaltantes.length > 0) {
        console.log(`   Keywords faltantes: ${keywordsFaltantes.join(', ')}`);
        console.log(`   ⚠️  PARCIAL - Tema correcto pero faltan keywords`);
        casosFallidos++;
      } else {
        console.log(`   ✅ ÉXITO - Todos los keywords presentes`);
        casosExitosos++;
      }

    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      casosFallidos++;
    }
  }

  console.log("\n========================================");
  console.log("RESUMEN DE RESULTADOS");
  console.log("========================================");
  console.log(`Total de casos: ${casosTest.length}`);
  console.log(`✅ Exitosos: ${casosExitosos} (${Math.round(casosExitosos/casosTest.length*100)}%)`);
  console.log(`❌ Fallidos: ${casosFallidos} (${Math.round(casosFallidos/casosTest.length*100)}%)`);

  if (casosExitosos >= 5) {
    console.log("\n🎉 ¡MEJORA SIGNIFICATIVA! El sistema está funcionando mucho mejor.");
  } else if (casosExitosos >= 3) {
    console.log("\n✨ Progreso notable, pero aún hay áreas por mejorar.");
  } else {
    console.log("\n⚠️  Se necesitan más ajustes.");
  }

  process.exit(0);
}

ejecutarTests().catch(error => {
  console.error("Error ejecutando tests:", error);
  process.exit(1);
});
