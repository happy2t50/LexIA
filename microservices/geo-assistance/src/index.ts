import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getDistance } from 'geolib';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3006;

app.use(cors());
app.use(express.json());

// Tipos
interface Coordenadas {
  lat: number;
  lng: number;
}

interface Dependencia {
  id: string;
  tipo: 'policia' | 'juzgado' | 'transito' | 'fiscalia' | 'hospital' | 'patio_gruas';
  nombre: string;
  direccion: string;
  ciudad: string;
  coordenadas: Coordenadas;
  telefono: string;
  horario: string;
  servicios: string[];
}

// Base de datos de dependencias
const dependencias: Dependencia[] = [
  {
    id: 'POL001',
    tipo: 'policia',
    nombre: 'CAI Centro',
    direccion: 'Carrera 7 # 12-50',
    ciudad: 'Bogotá',
    coordenadas: { lat: 4.5981, lng: -74.0758 },
    telefono: '+57 1 123 4567',
    horario: '24 horas',
    servicios: ['Denuncias', 'Comparendos', 'Atención ciudadana']
  },
  {
    id: 'POL002',
    tipo: 'policia',
    nombre: 'Estación de Policía Chapinero',
    direccion: 'Calle 63 # 13-40',
    ciudad: 'Bogotá',
    coordenadas: { lat: 4.6543, lng: -74.0628 },
    telefono: '+57 1 234 5678',
    horario: '24 horas',
    servicios: ['Denuncias', 'Investigaciones', 'Atención ciudadana']
  },
  {
    id: 'JUZ001',
    tipo: 'juzgado',
    nombre: 'Juzgados de Tránsito - Paloquemao',
    direccion: 'Calle 13 # 37-35',
    ciudad: 'Bogotá',
    coordenadas: { lat: 4.6265, lng: -74.1104 },
    telefono: '+57 1 345 6789',
    horario: 'Lunes a Viernes 8:00 AM - 5:00 PM',
    servicios: ['Audiencias', 'Descargos', 'Comparendos']
  },
  {
    id: 'TRA001',
    tipo: 'transito',
    nombre: 'Secretaría Distrital de Movilidad',
    direccion: 'Avenida El Dorado # 66-63',
    ciudad: 'Bogotá',
    coordenadas: { lat: 4.6533, lng: -74.1037 },
    telefono: '+57 1 456 7890',
    horario: 'Lunes a Viernes 7:00 AM - 4:30 PM',
    servicios: ['Trámites de licencia', 'Pagos de multas', 'Información']
  },
  {
    id: 'FIS001',
    tipo: 'fiscalia',
    nombre: 'Fiscalía General de la Nación - Bunker',
    direccion: 'Diagonal 22B # 52-01',
    ciudad: 'Bogotá',
    coordenadas: { lat: 4.6318, lng: -74.1011 },
    telefono: '+57 1 567 8901',
    horario: 'Lunes a Viernes 8:00 AM - 5:00 PM',
    servicios: ['Denuncias penales', 'Accidentes con heridos', 'Investigaciones']
  },
  {
    id: 'HOS001',
    tipo: 'hospital',
    nombre: 'Hospital San José',
    direccion: 'Carrera 19 # 8A-32',
    ciudad: 'Bogotá',
    coordenadas: { lat: 4.6097, lng: -74.0669 },
    telefono: '+57 1 678 9012',
    horario: '24 horas',
    servicios: ['Urgencias', 'Atención de accidentados', 'Medicina legal']
  },
  {
    id: 'PAT001',
    tipo: 'patio_gruas',
    nombre: 'Patio de Grúas Norte',
    direccion: 'Autopista Norte # 234-10',
    ciudad: 'Bogotá',
    coordenadas: { lat: 4.7456, lng: -74.0432 },
    telefono: '+57 1 789 0123',
    horario: 'Lunes a Sábado 7:00 AM - 6:00 PM',
    servicios: ['Retiro de vehículos', 'Pagos', 'Información']
  },
  {
    id: 'PAT002',
    tipo: 'patio_gruas',
    nombre: 'Patio de Grúas Sur',
    direccion: 'Autopista Sur # 45-67',
    ciudad: 'Bogotá',
    coordenadas: { lat: 4.5734, lng: -74.1298 },
    telefono: '+57 1 890 1234',
    horario: 'Lunes a Sábado 7:00 AM - 6:00 PM',
    servicios: ['Retiro de vehículos', 'Pagos', 'Información']
  }
];

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', service: 'Geo Assistance Service' });
});

// Encontrar dependencias cercanas
app.post('/nearby', (req: Request, res: Response) => {
  try {
    const { lat, lng, tipo, maxDistance = 5000 } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat y lng son requeridos' });
    }

    const ubicacionUsuario: Coordenadas = { lat, lng };

    // Filtrar por tipo si se especifica
    let dependenciasFiltradas = tipo
      ? dependencias.filter(d => d.tipo === tipo)
      : dependencias;

    // Calcular distancias
    const dependenciasConDistancia = dependenciasFiltradas.map(dep => {
      const distancia = getDistance(
        { latitude: ubicacionUsuario.lat, longitude: ubicacionUsuario.lng },
        { latitude: dep.coordenadas.lat, longitude: dep.coordenadas.lng }
      );

      return {
        ...dep,
        distancia,
        distanciaKm: (distancia / 1000).toFixed(2)
      };
    });

    // Filtrar por distancia máxima y ordenar
    const resultados = dependenciasConDistancia
      .filter(d => d.distancia <= maxDistance)
      .sort((a, b) => a.distancia - b.distancia);

    res.json({
      ubicacion: ubicacionUsuario,
      tipo: tipo || 'todas',
      maxDistance,
      totalResultados: resultados.length,
      dependencias: resultados
    });
  } catch (error) {
    console.error('Error al buscar dependencias cercanas:', error);
    res.status(500).json({ error: 'Error al buscar dependencias cercanas' });
  }
});

// Obtener dependencia por ID
app.get('/dependencies/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dependencia = dependencias.find(d => d.id === id);

    if (!dependencia) {
      return res.status(404).json({ error: 'Dependencia no encontrada' });
    }

    res.json(dependencia);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener dependencia' });
  }
});

// Obtener todas las dependencias
app.get('/dependencies', (req: Request, res: Response) => {
  try {
    const { tipo, ciudad } = req.query;

    let resultados = [...dependencias];

    if (tipo) {
      resultados = resultados.filter(d => d.tipo === tipo);
    }

    if (ciudad) {
      resultados = resultados.filter(
        d => d.ciudad.toLowerCase() === (ciudad as string).toLowerCase()
      );
    }

    res.json({
      totalDependencias: resultados.length,
      dependencias: resultados
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener dependencias' });
  }
});

// Obtener tipos de dependencias disponibles
app.get('/types', (req: Request, res: Response) => {
  try {
    const tipos = Array.from(new Set(dependencias.map(d => d.tipo)));

    res.json({
      totalTipos: tipos.length,
      tipos
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tipos' });
  }
});

// Calcular ruta entre dos puntos
app.post('/route', (req: Request, res: Response) => {
  try {
    const { origen, destino } = req.body;

    if (!origen || !destino) {
      return res.status(400).json({ error: 'origen y destino son requeridos' });
    }

    const distancia = getDistance(
      { latitude: origen.lat, longitude: origen.lng },
      { latitude: destino.lat, longitude: destino.lng }
    );

    // Estimación simple de tiempo (velocidad promedio 30 km/h en ciudad)
    const tiempoEstimadoMinutos = Math.round((distancia / 1000) / 30 * 60);

    res.json({
      origen,
      destino,
      distancia,
      distanciaKm: (distancia / 1000).toFixed(2),
      tiempoEstimadoMinutos,
      nota: 'Tiempo estimado basado en velocidad promedio de 30 km/h'
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al calcular ruta' });
  }
});

// Recomendaciones geográficas basadas en cluster
app.post('/recommend-by-cluster', (req: Request, res: Response) => {
  try {
    const { cluster, lat, lng, maxDistance = 5000 } = req.body;

    if (!cluster || !lat || !lng) {
      return res.status(400).json({ error: 'cluster, lat y lng son requeridos' });
    }

    // Mapear clusters a tipos de dependencias
    const clusterToDependencies: Record<string, string[]> = {
      C1: ['policia', 'juzgado', 'transito'], // Semáforo/velocidad
      C2: ['patio_gruas', 'transito'], // Estacionamiento
      C3: ['policia', 'juzgado', 'fiscalia'], // Alcoholímetro
      C4: ['transito'], // Documentos
      C5: ['policia', 'hospital', 'fiscalia'] // Accidentes
    };

    const tiposRelevantes = clusterToDependencies[cluster] || [];

    const ubicacionUsuario: Coordenadas = { lat, lng };

    // Buscar dependencias relevantes cercanas
    const dependenciasRelevantes = dependencias.filter(d =>
      tiposRelevantes.includes(d.tipo)
    );

    const dependenciasConDistancia = dependenciasRelevantes.map(dep => {
      const distancia = getDistance(
        { latitude: ubicacionUsuario.lat, longitude: ubicacionUsuario.lng },
        { latitude: dep.coordenadas.lat, longitude: dep.coordenadas.lng }
      );

      return {
        ...dep,
        distancia,
        distanciaKm: (distancia / 1000).toFixed(2)
      };
    });

    const resultados = dependenciasConDistancia
      .filter(d => d.distancia <= maxDistance)
      .sort((a, b) => a.distancia - b.distancia)
      .slice(0, 5);

    res.json({
      cluster,
      ubicacion: ubicacionUsuario,
      tiposRelevantes,
      totalResultados: resultados.length,
      dependencias: resultados
    });
  } catch (error) {
    console.error('Error en recomendación geográfica:', error);
    res.status(500).json({ error: 'Error en recomendación geográfica' });
  }
});

app.listen(PORT, () => {
  console.log(`📍 Geo Assistance Service corriendo en puerto ${PORT}`);
});
