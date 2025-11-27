import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3006;

app.use(cors());
app.use(express.json());

// Base de datos de abogados
interface Abogado {
  id: string;
  nombre: string;
  especializacion: string[];
  clusters: string[];
  ciudad: string;
  calificacion: number;
  experiencia: number;
  tarifa: number;
  telefono: string;
  email: string;
  disponible: boolean;
}

const abogados: Abogado[] = [
  {
    id: 'ABG001',
    nombre: 'Dr. Carlos Mendoza',
    especializacion: ['Tránsito', 'Infracciones viales'],
    clusters: ['C1', 'C2'],
    ciudad: 'Bogotá',
    calificacion: 4.8,
    experiencia: 15,
    tarifa: 200000,
    telefono: '+57 300 123 4567',
    email: 'carlos.mendoza@legal.com',
    disponible: true
  },
  {
    id: 'ABG002',
    nombre: 'Dra. María Rodríguez',
    especializacion: ['Alcoholemia', 'Defensa penal'],
    clusters: ['C3'],
    ciudad: 'Bogotá',
    calificacion: 4.9,
    experiencia: 12,
    tarifa: 250000,
    telefono: '+57 310 234 5678',
    email: 'maria.rodriguez@legal.com',
    disponible: true
  },
  {
    id: 'ABG003',
    nombre: 'Dr. Juan Pérez',
    especializacion: ['Accidentes de tránsito', 'Seguros'],
    clusters: ['C5'],
    ciudad: 'Medellín',
    calificacion: 4.7,
    experiencia: 10,
    tarifa: 180000,
    telefono: '+57 320 345 6789',
    email: 'juan.perez@legal.com',
    disponible: true
  },
  {
    id: 'ABG004',
    nombre: 'Dra. Ana García',
    especializacion: ['Documentación vehicular', 'Trámites'],
    clusters: ['C4'],
    ciudad: 'Cali',
    calificacion: 4.6,
    experiencia: 8,
    tarifa: 150000,
    telefono: '+57 315 456 7890',
    email: 'ana.garcia@legal.com',
    disponible: true
  }
];

// Base de datos de servicios complementarios
interface Servicio {
  id: string;
  tipo: 'grua' | 'taller' | 'seguro';
  nombre: string;
  ciudad: string;
  calificacion: number;
  tarifa?: number;
  telefono: string;
  disponible24h: boolean;
  clusters: string[];
}

const servicios: Servicio[] = [
  {
    id: 'SRV001',
    tipo: 'grua',
    nombre: 'Grúas Rápidas 24h',
    ciudad: 'Bogotá',
    calificacion: 4.5,
    tarifa: 80000,
    telefono: '+57 300 111 2222',
    disponible24h: true,
    clusters: ['C2', 'C5']
  },
  {
    id: 'SRV002',
    tipo: 'taller',
    nombre: 'Taller Automotriz Central',
    ciudad: 'Bogotá',
    calificacion: 4.7,
    telefono: '+57 310 222 3333',
    disponible24h: false,
    clusters: ['C5']
  },
  {
    id: 'SRV003',
    tipo: 'seguro',
    nombre: 'Seguros Colombia',
    ciudad: 'Nacional',
    calificacion: 4.8,
    telefono: '+57 320 333 4444',
    disponible24h: true,
    clusters: ['C5']
  }
];

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', service: 'Recommendations Service' });
});

// Recomendar basado en cluster
app.post('/recommend', async (req: Request, res: Response) => {
  try {
    const { cluster, ciudad, textoConsulta } = req.body;

    if (!cluster) {
      return res.status(400).json({ error: 'cluster es requerido' });
    }

    // Filtrar abogados por cluster
    let abogadosRecomendados = abogados.filter(a =>
      a.clusters.includes(cluster) && a.disponible
    );

    // Filtrar por ciudad si se proporciona
    if (ciudad) {
      abogadosRecomendados = abogadosRecomendados.filter(
        a => a.ciudad.toLowerCase() === ciudad.toLowerCase()
      );
    }

    // Ordenar por calificación
    abogadosRecomendados.sort((a, b) => b.calificacion - a.calificacion);

    // Filtrar servicios por cluster
    const serviciosRecomendados = servicios.filter(s =>
      s.clusters.includes(cluster) && s.disponible24h
    );

    // Obtener artículos legales del servicio de búsqueda
    let articulosLegales: any[] = [];
    try {
      const searchUrl = process.env.SEARCH_SERVICE_URL || 'http://localhost:3005';
      const response = await axios.get(`${searchUrl}/search/cluster/${cluster}`);
      articulosLegales = response.data.results || [];
    } catch (error) {
      console.log('Error al obtener artículos legales:', error);
    }

    res.json({
      cluster,
      ciudad: ciudad || 'Todas',
      recomendaciones: {
        abogados: abogadosRecomendados.slice(0, 3),
        servicios: serviciosRecomendados,
        articulosLegales: articulosLegales.slice(0, 3)
      },
      totalAbogados: abogadosRecomendados.length,
      totalServicios: serviciosRecomendados.length,
      totalArticulos: articulosLegales.length
    });
  } catch (error) {
    console.error('Error en recomendaciones:', error);
    res.status(500).json({ error: 'Error al generar recomendaciones' });
  }
});

// Obtener abogado por ID
app.get('/lawyers/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const abogado = abogados.find(a => a.id === id);

    if (!abogado) {
      return res.status(404).json({ error: 'Abogado no encontrado' });
    }

    res.json(abogado);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener abogado' });
  }
});

// Buscar abogados por especialización
app.get('/lawyers/specialization/:spec', (req: Request, res: Response) => {
  try {
    const { spec } = req.params;
    const results = abogados.filter(a =>
      a.especializacion.some(e => e.toLowerCase().includes(spec.toLowerCase()))
    );

    res.json({
      especializacion: spec,
      totalResults: results.length,
      results
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar abogados' });
  }
});

// Obtener todos los abogados
app.get('/lawyers', (req: Request, res: Response) => {
  try {
    const { ciudad, disponible } = req.query;

    let results = [...abogados];

    if (ciudad) {
      results = results.filter(a => a.ciudad.toLowerCase() === (ciudad as string).toLowerCase());
    }

    if (disponible !== undefined) {
      results = results.filter(a => a.disponible === (disponible === 'true'));
    }

    res.json({
      totalLawyers: results.length,
      lawyers: results
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener abogados' });
  }
});

// Obtener servicios por tipo
app.get('/services/:tipo', (req: Request, res: Response) => {
  try {
    const { tipo } = req.params;
    const results = servicios.filter(s => s.tipo === tipo);

    res.json({
      tipo,
      totalResults: results.length,
      results
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener servicios' });
  }
});

// Obtener todos los servicios
app.get('/services', (req: Request, res: Response) => {
  try {
    res.json({
      totalServices: servicios.length,
      services: servicios
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener servicios' });
  }
});

// Recomendación personalizada (combinando NLP y clustering)
app.post('/recommend/personalized', async (req: Request, res: Response) => {
  try {
    const { textoConsulta, ciudad, usuarioId } = req.body;

    if (!textoConsulta) {
      return res.status(400).json({ error: 'textoConsulta es requerido' });
    }

    // 1. Obtener cluster del servicio de clustering
    let cluster = 'C1';
    try {
      const clusteringUrl = process.env.CLUSTERING_SERVICE_URL || 'http://localhost:3002';
      const response = await axios.post(`${clusteringUrl}/predict`, {
        textoConsulta
      });
      cluster = response.data.cluster;
    } catch (error) {
      console.log('Error al obtener cluster:', error);
    }

    // 2. Generar recomendaciones basadas en cluster
    const recommendResponse = await axios.post(`${process.env.BASE_URL || 'http://localhost:3006'}/recommend`, {
      cluster,
      ciudad,
      textoConsulta
    });

    res.json({
      textoConsulta,
      clusterDetectado: cluster,
      ...recommendResponse.data
    });
  } catch (error) {
    console.error('Error en recomendación personalizada:', error);
    res.status(500).json({ error: 'Error al generar recomendación personalizada' });
  }
});

app.listen(PORT, () => {
  console.log(`💡 Recommendations Service corriendo en puerto ${PORT}`);
});
