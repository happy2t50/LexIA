/**
 * Script para extraer y procesar PDFs de leyes de tránsito
 * Extrae el contenido, divide en artículos y los indexa en RAG
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Función para leer PDFs (usando pdf-parse cuando esté instalado)
async function extractTextFromPDF(pdfPath) {
    try {
        // Verificar si pdf-parse está instalado
        const pdfParse = require('pdf-parse');
        const dataBuffer = fs.readFileSync(pdfPath);
        const data = await pdfParse(dataBuffer);
        return data.text;
    } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
            console.error('❌ Módulo pdf-parse no encontrado.');
            console.error('📦 Instala con: npm install pdf-parse');
            process.exit(1);
        }
        throw error;
    }
}

// Parsear artículos del texto extraído
function parseArticles(text, filename) {
    const articles = [];

    // Detectar formato: "Artículo XXX" o "ARTÍCULO XXX" o "Art. XXX"
    const articleRegex = /(?:ART[ÍI]CULO|Art\.?)\s+(\d+)[.\s]*[-–—]?\s*([^\n]+)\n([\s\S]*?)(?=(?:ART[ÍI]CULO|Art\.?)\s+\d+|$)/gi;

    let match;
    while ((match = articleRegex.exec(text)) !== null) {
        const articleNumber = match[1];
        const title = match[2].trim();
        const content = match[3].trim();

        if (content.length > 50) { // Filtrar artículos muy cortos
            articles.push({
                numero: articleNumber,
                titulo: `Artículo ${articleNumber} - ${title}`,
                contenido: content,
                fuente: extractSource(filename),
                categoria: detectCategory(title, content),
                cluster: detectCluster(title, content)
            });
        }
    }

    console.log(`📄 Extraídos ${articles.length} artículos de ${filename}`);
    return articles;
}

// Extraer fuente del nombre del archivo
function extractSource(filename) {
    const name = path.basename(filename, '.pdf');

    // Detectar leyes y reglamentos de México (Chiapas)
    if (name.match(/Ley.*Movilidad.*Chiapas/i)) return 'Ley de Movilidad de Chiapas';
    if (name.match(/Reglamento.*Movilidad.*Chiapas/i)) return 'Reglamento de Movilidad de Chiapas';
    if (name.match(/Reglamento.*Transito.*Comitan/i)) return 'Reglamento de Tránsito de Comitán';
    if (name.match(/Reglamento.*Transito.*Palenque/i)) return 'Reglamento de Tránsito de Palenque';
    if (name.match(/Reglamento.*Transito.*San.?Cristobal/i)) return 'Reglamento de Tránsito de San Cristóbal';
    if (name.match(/Reglamento.*Transito.*Tapachula/i)) return 'Reglamento de Tránsito de Tapachula';
    if (name.match(/Reglamento.*Transito.*Tuxtla/i)) return 'Reglamento de Tránsito de Tuxtla Gutiérrez';

    // Leyes colombianas (por si acaso)
    if (name.match(/ley.?769/i)) return 'Ley 769 de 2002';
    if (name.match(/ley.?1383/i)) return 'Ley 1383 de 2010';
    if (name.match(/ley.?1811/i)) return 'Ley 1811 de 2016';
    if (name.match(/decreto.?2251/i)) return 'Decreto 2251 de 2017';

    return name;
}

// Detectar categoría basada en contenido
function detectCategory(title, content) {
    const text = (title + ' ' + content).toLowerCase();

    if (text.match(/embriaguez|alcohol|droga|psicoactiv/i)) {
        return 'Infracciones Graves';
    }
    if (text.match(/velocidad|temerari|adelant/i)) {
        return 'Infracciones Graves';
    }
    if (text.match(/estacionamiento|parque|pare/i)) {
        return 'Multas Menores';
    }
    if (text.match(/accidente|choque|colisi/i)) {
        return 'Accidentes';
    }
    if (text.match(/veh[íi]culo|modificaci|tecnicomec/i)) {
        return 'Vehículos';
    }
    if (text.match(/transporte.*p[úu]blico|pasajero|taxi/i)) {
        return 'Transporte Público';
    }
    if (text.match(/carga|peso|ton/i)) {
        return 'Transporte Carga';
    }
    if (text.match(/se[ñn]al|sem[áa]foro|stop/i)) {
        return 'Señalización';
    }
    if (text.match(/licencia|documento|soat/i)) {
        return 'Documentación';
    }

    return 'General';
}

// Detectar cluster basado en contenido
function detectCluster(title, content) {
    const text = (title + ' ' + content).toLowerCase();

    // C1: Infracciones Graves
    if (text.match(/embriaguez|alcohol|droga|psicoactiv|velocidad.*excesiv|temerari/i)) {
        return 'C1';
    }

    // C2: Multas Menores
    if (text.match(/estacionamiento|se[ñn]al|sem[áa]foro|documento|licencia|soat|cintur[óo]n|m[óo]vil/i)) {
        return 'C2';
    }

    // C3: Accidentes
    if (text.match(/accidente|choque|colisi|fuga|lesion/i)) {
        return 'C3';
    }

    // C4: Vehículos
    if (text.match(/veh[íi]culo|modificaci|tecnicomec|revisi[óo]n.*t[ée]cnic/i)) {
        return 'C4';
    }

    // C5: Transporte
    if (text.match(/transporte|carga|p[úu]blico|pasajero/i)) {
        return 'C5';
    }

    return 'C2'; // Default
}

// Indexar artículo en RAG via API
async function indexArticle(article, apiUrl = 'http://localhost/api/rag/index') {
    try {
        const response = await axios.post(apiUrl, {
            titulo: article.titulo,
            contenido: article.contenido,
            fuente: article.fuente,
            categoria: article.categoria,
            clusterRelacionado: article.cluster
        });

        return response.data;
    } catch (error) {
        console.error(`❌ Error indexando artículo ${article.numero}:`, error.message);
        return null;
    }
}

// Procesar todos los PDFs de una carpeta
async function processPDFFolder(folderPath, apiUrl = 'http://localhost/api/rag/index') {
    console.log('🚀 Iniciando procesamiento de PDFs...\n');

    // Verificar que la carpeta existe
    if (!fs.existsSync(folderPath)) {
        console.error(`❌ Carpeta no encontrada: ${folderPath}`);
        process.exit(1);
    }

    // Leer archivos PDF
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.pdf'));

    if (files.length === 0) {
        console.error('❌ No se encontraron archivos PDF en la carpeta');
        console.log('📁 Coloca tus PDFs en:', folderPath);
        process.exit(1);
    }

    console.log(`📚 Encontrados ${files.length} archivos PDF\n`);

    let totalArticles = 0;
    let totalIndexed = 0;

    // Procesar cada PDF
    for (const file of files) {
        const pdfPath = path.join(folderPath, file);
        console.log(`\n📖 Procesando: ${file}`);
        console.log('─'.repeat(50));

        try {
            // Extraer texto del PDF
            console.log('📄 Extrayendo texto...');
            const text = await extractTextFromPDF(pdfPath);

            if (!text || text.length < 100) {
                console.log('⚠️  PDF vacío o con poco contenido, saltando...');
                continue;
            }

            // Parsear artículos
            console.log('🔍 Buscando artículos...');
            const articles = parseArticles(text, file);
            totalArticles += articles.length;

            if (articles.length === 0) {
                console.log('⚠️  No se encontraron artículos en este PDF');
                continue;
            }

            // Indexar cada artículo
            console.log(`📤 Indexando ${articles.length} artículos en RAG...`);

            for (const article of articles) {
                const result = await indexArticle(article, apiUrl);
                if (result) {
                    totalIndexed++;
                    console.log(`  ✅ ${article.titulo.substring(0, 60)}...`);
                }

                // Delay para no saturar el API
                await new Promise(resolve => setTimeout(resolve, 100));
            }

        } catch (error) {
            console.error(`❌ Error procesando ${file}:`, error.message);
        }
    }

    // Resumen final
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN DE PROCESAMIENTO');
    console.log('='.repeat(50));
    console.log(`📚 PDFs procesados: ${files.length}`);
    console.log(`📄 Artículos extraídos: ${totalArticles}`);
    console.log(`✅ Artículos indexados: ${totalIndexed}`);
    console.log(`❌ Fallos: ${totalArticles - totalIndexed}`);
    console.log('='.repeat(50));

    if (totalIndexed > 0) {
        console.log('\n✨ Proceso completado exitosamente!');
        console.log('🔍 Verifica los artículos en: http://localhost/api/rag/stats');
    }
}

// Generar SQL alternativo (si prefieres usar SQL directamente)
function generateSQL(articles, outputFile = 'generated-seed.sql') {
    let sql = '-- Artículos extraídos automáticamente de PDFs\n\n';
    sql += 'INSERT INTO documentos_legales (titulo, contenido, fuente, categoria, cluster_relacionado, activo)\n';
    sql += 'VALUES\n';

    const values = articles.map((article, index) => {
        const titulo = article.titulo.replace(/'/g, "''");
        const contenido = article.contenido.replace(/'/g, "''");
        const fuente = article.fuente.replace(/'/g, "''");
        const categoria = article.categoria.replace(/'/g, "''");

        return `(\n    '${titulo}',\n    '${contenido}',\n    '${fuente}',\n    '${categoria}',\n    '${article.cluster}',\n    true\n)`;
    });

    sql += values.join(',\n') + ';\n';

    fs.writeFileSync(outputFile, sql);
    console.log(`✅ SQL generado: ${outputFile}`);
}

// CLI
if (require.main === module) {
    const args = process.argv.slice(2);

    // Ayuda
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
📚 Procesador de PDFs de Leyes de Tránsito

USO:
  node process-pdf-laws.js [opciones]

OPCIONES:
  --folder <path>    Carpeta con PDFs (default: ./leyes-transito)
  --api <url>        URL del API RAG (default: http://localhost/api/rag/index)
  --sql <file>       Generar SQL en vez de indexar (default: no)
  --help             Mostrar esta ayuda

EJEMPLOS:
  # Procesar PDFs e indexar en RAG
  node process-pdf-laws.js

  # Procesar carpeta específica
  node process-pdf-laws.js --folder /path/to/pdfs

  # Generar SQL en vez de indexar
  node process-pdf-laws.js --sql output.sql

ANTES DE USAR:
  1. Instala dependencias: npm install pdf-parse axios
  2. Coloca tus PDFs en la carpeta leyes-transito/
  3. Asegúrate que Docker esté corriendo
  4. Ejecuta el script
        `);
        process.exit(0);
    }

    // Opciones
    const folderIndex = args.indexOf('--folder');
    const folderPath = folderIndex !== -1 && args[folderIndex + 1]
        ? args[folderIndex + 1]
        : path.join(__dirname, '..', 'Leyes-De-Transito');

    const apiIndex = args.indexOf('--api');
    const apiUrl = apiIndex !== -1 && args[apiIndex + 1]
        ? args[apiIndex + 1]
        : 'http://localhost/api/rag/index';

    const sqlIndex = args.indexOf('--sql');
    const generateSQLMode = sqlIndex !== -1;
    const sqlFile = sqlIndex !== -1 && args[sqlIndex + 1]
        ? args[sqlIndex + 1]
        : 'generated-seed.sql';

    // Ejecutar
    if (generateSQLMode) {
        console.log('📝 Modo: Generar SQL');
        // Implementar modo SQL
        console.log('⚠️  Modo SQL en desarrollo. Usa modo API por ahora.');
    } else {
        console.log('📤 Modo: Indexar en RAG API');
        console.log('📁 Carpeta:', folderPath);
        console.log('🌐 API:', apiUrl);
        console.log('');

        processPDFFolder(folderPath, apiUrl)
            .catch(error => {
                console.error('❌ Error fatal:', error);
                process.exit(1);
            });
    }
}

module.exports = {
    extractTextFromPDF,
    parseArticles,
    indexArticle,
    processPDFFolder,
    generateSQL
};
