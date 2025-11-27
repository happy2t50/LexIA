import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Fuse from 'fuse.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

// Base de datos de artículos legales (simulación)
interface ArticuloLegal {
  id: string;
  articulo: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  cluster: string;
  sancion?: string;
  multa?: string;
}

const articulosLegales: ArticuloLegal[] = [
  {
    id: 'ART001',
    articulo: 'Artículo 123',
    titulo: 'Violación de semáforo en rojo',
    descripcion: 'Todo conductor que no respete la señal de semáforo en rojo incurrirá en infracción grave.',
    categoria: 'Señalización',
    cluster: 'C1',
    sancion: 'Multa de 15 SMLV',
    multa: '15 SMLV'
  },
  {
    id: 'ART002',
    articulo: 'Artículo 106',
    titulo: 'Exceso de velocidad',
    descripcion: 'Conducir a velocidad superior a la permitida constituye infracción según el grado de exceso.',
    categoria: 'Velocidad',
    cluster: 'C1',
    sancion: 'Multa de 8 a 30 SMLV según gravedad',
    multa: '8-30 SMLV'
  },
  {
    id: 'ART003',
    articulo: 'Artículo 138',
    titulo: 'Estacionamiento prohibido',
    descripcion: 'Estacionar en zonas prohibidas o que obstruyan la vía pública.',
    categoria: 'Estacionamiento',
    cluster: 'C2',
    sancion: 'Multa de 15 SMLV e inmovilización',
    multa: '15 SMLV'
  },
  {
    id: 'ART004',
    articulo: 'Artículo 152',
    titulo: 'Conducción bajo efectos del alcohol',
    descripcion: 'Conducir en estado de embriaguez o bajo efectos de sustancias psicoactivas.',
    categoria: 'Alcoholemia',
    cluster: 'C3',
    sancion: 'Multa de 30 SMLV, suspensión de licencia e inmovilización',
    multa: '30 SMLV'
  },
  {
    id: 'ART005',
    articulo: 'Artículo 131',
    titulo: 'Conducir sin licencia',
    descripcion: 'Conducir un vehículo sin portar la licencia de conducción correspondiente.',
    categoria: 'Documentación',
    cluster: 'C4',
    sancion: 'Multa de 40 SMLV e inmovilización',
    multa: '40 SMLV'
  },
  {
    id: 'ART006',
    articulo: 'Artículo 109',
    titulo: 'No portar SOAT',
    descripcion: 'Circular sin el Seguro Obligatorio de Accidentes de Tránsito vigente.',
    categoria: 'Documentación',
    cluster: 'C4',
    sancion: 'Multa de 30 SMLV e inmovilización',
    multa: '30 SMLV'
  },
  {
    id: 'ART007',
    articulo: 'Artículo 110',
    titulo: 'Colisión con daños',
    descripcion: 'Normas aplicables en caso de accidente de tránsito con daños materiales.',
    categoria: 'Accidentes',
    cluster: 'C5',
    sancion: 'Variable según responsabilidad',
    multa: 'N/A'
  }
];

// Configurar Fuse.js para búsqueda difusa
const fuseOptions = {
  keys: ['titulo', 'descripcion', 'articulo', 'categoria'],
  threshold: 0.4,
  includeScore: true
};

const fuse = new Fuse(articulosLegales, fuseOptions);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', service: 'Search Service' });
});

// Buscar artículos por texto
app.post('/search', (req: Request, res: Response) => {
  try {
    const { query, limit = 5 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'query es requerido' });
    }

    const results = fuse.search(query, { limit });

    res.json({
      query,
      totalResults: results.length,
      results: results.map(r => ({
        ...r.item,
        score: r.score
      }))
    });
  } catch (error) {
    console.error('Error en búsqueda:', error);
    res.status(500).json({ error: 'Error al realizar búsqueda' });
  }
});

// Buscar por cluster
app.get('/search/cluster/:cluster', (req: Request, res: Response) => {
  try {
    const { cluster } = req.params;
    const results = articulosLegales.filter(a => a.cluster === cluster);

    res.json({
      cluster,
      totalResults: results.length,
      results
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar por cluster' });
  }
});

// Buscar por categoría
app.get('/search/category/:categoria', (req: Request, res: Response) => {
  try {
    const { categoria } = req.params;
    const results = articulosLegales.filter(
      a => a.categoria.toLowerCase() === categoria.toLowerCase()
    );

    res.json({
      categoria,
      totalResults: results.length,
      results
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar por categoría' });
  }
});

// Obtener artículo por ID
app.get('/articles/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const articulo = articulosLegales.find(a => a.id === id);

    if (!articulo) {
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }

    res.json(articulo);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener artículo' });
  }
});

// Obtener todos los artículos
app.get('/articles', (req: Request, res: Response) => {
  try {
    res.json({
      totalArticles: articulosLegales.length,
      articles: articulosLegales
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener artículos' });
  }
});

// Búsqueda avanzada con filtros
app.post('/search/advanced', (req: Request, res: Response) => {
  try {
    const { query, categoria, cluster, limit = 10 } = req.body;

    let results = [...articulosLegales];

    // Filtrar por categoría
    if (categoria) {
      results = results.filter(a => a.categoria.toLowerCase() === categoria.toLowerCase());
    }

    // Filtrar por cluster
    if (cluster) {
      results = results.filter(a => a.cluster === cluster);
    }

    // Búsqueda por texto
    if (query) {
      const fuse = new Fuse(results, fuseOptions);
      const searchResults = fuse.search(query, { limit });
      results = searchResults.map(r => r.item);
    } else {
      results = results.slice(0, limit);
    }

    res.json({
      query: query || 'all',
      filters: { categoria, cluster },
      totalResults: results.length,
      results
    });
  } catch (error) {
    console.error('Error en búsqueda avanzada:', error);
    res.status(500).json({ error: 'Error en búsqueda avanzada' });
  }
});

app.listen(PORT, () => {
  console.log(`🔍 Search Service corriendo en puerto ${PORT}`);
});
