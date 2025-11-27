import * as fs from 'fs';
import * as path from 'path';

// Tipos
interface DatasetRecord {
  id: number;
  texto_consulta: string;
  categoria_legal_original: string;
  ciudad_usuario: string;
  tipo_usuario: 'conductor' | 'peaton' | 'pasajero';
  hora_incidente: string;
  ubicacion_lat: number;
  ubicacion_lng: number;
  historial_usuario: number;
  articulo_sugerido: string;
  gravedad_estimada: 'baja' | 'media' | 'alta';
  cluster_asignado: string;
}

// Plantillas de consultas por cluster
const consultasTemplates = {
  C1: [
    'me pasé un semáforo en rojo',
    'crucé el semáforo en rojo sin querer',
    'iba con exceso de velocidad',
    'me multaron por velocidad',
    'pasé un semáforo amarillo',
    'no vi el semáforo y lo pasé en rojo',
    'iba rápido y me detuvieron',
    'excedí el límite de velocidad',
    'me pasé la luz roja del semáforo',
    'conducía muy rápido'
  ],
  C2: [
    'estaba estacionado mal',
    'me llevaron el carro con grúa',
    'estacioné en zona prohibida',
    'me remolcaron el vehículo',
    'dejé el auto en un lugar no permitido',
    'parqueé donde no debía',
    'estacioné en doble fila',
    'me inmovilizaron el carro por mal parqueado',
    'dejé el carro en zona azul sin pagar',
    'estacioné en zona de carga'
  ],
  C3: [
    'me paró el alcoholímetro',
    'había tomado y me detuvieron',
    'control de alcoholemia',
    'me hicieron la prueba de alcohol',
    'conducía después de tomar',
    'pasé por un retén de alcoholímetro',
    'me encontraron con alcohol',
    'iba tomado al volante',
    'falló el alcoholímetro',
    'me detectaron alcohol en sangre'
  ],
  C4: [
    'no traía licencia',
    'se me olvidó el SOAT',
    'me multaron por no tener papeles',
    'no tenía la licencia conmigo',
    'conducía sin documentos',
    'no portaba mi licencia de conducir',
    'el SOAT estaba vencido',
    'no tenía el seguro al día',
    'me faltaban los documentos del carro',
    'olvidé la tarjeta de propiedad'
  ],
  C5: [
    'choqué con otro carro',
    'tuve un accidente',
    'me estrellé contra un poste',
    'colisioné con otro vehículo',
    'hubo un choque',
    'tuve un percance de tránsito',
    'golpeé otro auto',
    'accidente de tráfico',
    'choque múltiple',
    'me estrellé'
  ]
};

const ciudades = [
  'Bogotá',
  'Medellín',
  'Cali',
  'Barranquilla',
  'Cartagena',
  'Bucaramanga',
  'Pereira',
  'Manizales'
];

const tiposUsuario: ('conductor' | 'peaton' | 'pasajero')[] = ['conductor', 'peaton', 'pasajero'];

const articulosPorCluster: Record<string, string[]> = {
  C1: ['Artículo 123', 'Artículo 106'],
  C2: ['Artículo 138'],
  C3: ['Artículo 152'],
  C4: ['Artículo 131', 'Artículo 109'],
  C5: ['Artículo 110']
};

// Coordenadas aproximadas por ciudad
const coordenadasCiudades: Record<string, { lat: number; lng: number }> = {
  'Bogotá': { lat: 4.6097, lng: -74.0817 },
  'Medellín': { lat: 6.2442, lng: -75.5812 },
  'Cali': { lat: 3.4516, lng: -76.5320 },
  'Barranquilla': { lat: 10.9639, lng: -74.7964 },
  'Cartagena': { lat: 10.3910, lng: -75.4794 },
  'Bucaramanga': { lat: 7.1254, lng: -73.1198 },
  'Pereira': { lat: 4.8133, lng: -75.6961 },
  'Manizales': { lat: 5.0689, lng: -75.5174 }
};

// Función para generar una variación de texto
function generarVariacion(template: string): string {
  const variaciones = [
    template,
    template + ' en la avenida principal',
    template + ' cerca de mi casa',
    'ayer ' + template,
    'hoy ' + template,
    template + ' y no sé qué hacer',
    template + ' necesito ayuda',
    'ayuda, ' + template,
    template + ' qué debo hacer',
    template + ' me pueden asesorar'
  ];

  return variaciones[Math.floor(Math.random() * variaciones.length)];
}

// Función para generar hora aleatoria
function generarHora(): string {
  const hora = Math.floor(Math.random() * 24);
  const minuto = Math.floor(Math.random() * 60);
  const segundo = Math.floor(Math.random() * 60);

  const fecha = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1, hora, minuto, segundo);
  return fecha.toISOString();
}

// Función para generar coordenadas con variación
function generarCoordenadas(ciudad: string): { lat: number; lng: number } {
  const base = coordenadasCiudades[ciudad];
  const variacionLat = (Math.random() - 0.5) * 0.1; // +/- 0.05 grados
  const variacionLng = (Math.random() - 0.5) * 0.1;

  return {
    lat: parseFloat((base.lat + variacionLat).toFixed(6)),
    lng: parseFloat((base.lng + variacionLng).toFixed(6))
  };
}

// Función para asignar gravedad basada en cluster
function asignarGravedad(cluster: string): 'baja' | 'media' | 'alta' {
  const gravedades: Record<string, ('baja' | 'media' | 'alta')[]> = {
    C1: ['media', 'media', 'alta'],
    C2: ['baja', 'media'],
    C3: ['alta', 'alta', 'alta'],
    C4: ['media', 'alta'],
    C5: ['alta', 'alta', 'media']
  };

  const opciones = gravedades[cluster];
  return opciones[Math.floor(Math.random() * opciones.length)];
}

// Generar dataset
function generarDataset(cantidad: number): DatasetRecord[] {
  const dataset: DatasetRecord[] = [];
  const clusters = ['C1', 'C2', 'C3', 'C4', 'C5'];

  for (let i = 0; i < cantidad; i++) {
    // Seleccionar cluster aleatorio
    const cluster = clusters[Math.floor(Math.random() * clusters.length)];

    // Seleccionar plantilla de consulta
    const templates = consultasTemplates[cluster];
    const template = templates[Math.floor(Math.random() * templates.length)];
    const textoConsulta = generarVariacion(template);

    // Seleccionar ciudad
    const ciudad = ciudades[Math.floor(Math.random() * ciudades.length)];

    // Generar coordenadas
    const coordenadas = generarCoordenadas(ciudad);

    // Seleccionar tipo de usuario
    const tipoUsuario = tiposUsuario[Math.floor(Math.random() * tiposUsuario.length)];

    // Generar historial (cantidad de consultas previas)
    const historial = Math.floor(Math.random() * 10);

    // Seleccionar artículo
    const articulos = articulosPorCluster[cluster];
    const articulo = articulos[Math.floor(Math.random() * articulos.length)];

    // Generar registro
    const record: DatasetRecord = {
      id: i + 1,
      texto_consulta: textoConsulta,
      categoria_legal_original: `Categoría ${cluster}`,
      ciudad_usuario: ciudad,
      tipo_usuario: tipoUsuario,
      hora_incidente: generarHora(),
      ubicacion_lat: coordenadas.lat,
      ubicacion_lng: coordenadas.lng,
      historial_usuario: historial,
      articulo_sugerido: articulo,
      gravedad_estimada: asignarGravedad(cluster),
      cluster_asignado: cluster
    };

    dataset.push(record);
  }

  return dataset;
}

// Función para convertir a CSV
function convertirACSV(dataset: DatasetRecord[]): string {
  // Encabezados
  const headers = [
    'id',
    'texto_consulta',
    'categoria_legal_original',
    'ciudad_usuario',
    'tipo_usuario',
    'hora_incidente',
    'ubicacion_lat',
    'ubicacion_lng',
    'historial_usuario',
    'articulo_sugerido',
    'gravedad_estimada',
    'cluster_asignado'
  ];

  let csv = headers.join(',') + '\n';

  // Datos
  dataset.forEach(record => {
    const row = [
      record.id,
      `"${record.texto_consulta.replace(/"/g, '""')}"`, // Escapar comillas
      `"${record.categoria_legal_original}"`,
      record.ciudad_usuario,
      record.tipo_usuario,
      record.hora_incidente,
      record.ubicacion_lat,
      record.ubicacion_lng,
      record.historial_usuario,
      record.articulo_sugerido,
      record.gravedad_estimada,
      record.cluster_asignado
    ];

    csv += row.join(',') + '\n';
  });

  return csv;
}

// Generar y guardar dataset
console.log('Generando dataset de 10,000 registros...');
const dataset = generarDataset(10000);

console.log('Convirtiendo a CSV...');
const csv = convertirACSV(dataset);

const outputPath = path.join(__dirname, 'training_dataset.csv');
fs.writeFileSync(outputPath, csv, 'utf-8');

console.log(`Dataset generado exitosamente: ${outputPath}`);
console.log(`Total de registros: ${dataset.length}`);

// Estadísticas
const estadisticas = {
  totalRegistros: dataset.length,
  porCluster: {} as Record<string, number>,
  porCiudad: {} as Record<string, number>,
  porGravedad: {} as Record<string, number>
};

dataset.forEach(record => {
  estadisticas.porCluster[record.cluster_asignado] = (estadisticas.porCluster[record.cluster_asignado] || 0) + 1;
  estadisticas.porCiudad[record.ciudad_usuario] = (estadisticas.porCiudad[record.ciudad_usuario] || 0) + 1;
  estadisticas.porGravedad[record.gravedad_estimada] = (estadisticas.porGravedad[record.gravedad_estimada] || 0) + 1;
});

console.log('\nEstadísticas:');
console.log('Por Cluster:', estadisticas.porCluster);
console.log('Por Ciudad:', estadisticas.porCiudad);
console.log('Por Gravedad:', estadisticas.porGravedad);
