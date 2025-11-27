import { ConsultaIncidente, OLAPQuery, OLAPResult } from '../types';

export class OLAPService {
  // Simulación de base de datos en memoria (en producción usar PostgreSQL/MongoDB)
  private consultasIncidentes: ConsultaIncidente[] = [];

  constructor() {
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    // Datos de ejemplo
    const sampleData: ConsultaIncidente[] = [
      {
        id: '1',
        textoConsulta: 'me pasé un semáforo en rojo',
        usuarioId: 'user1',
        usuario: {
          id: 'user1',
          tipo: 'conductor',
          historialConsultas: [],
          fechaRegistro: new Date('2024-01-01')
        },
        ubicacion: {
          ciudad: 'Bogotá',
          barrio: 'Chapinero',
          coordenadas: { lat: 4.6482, lng: -74.0638 },
          pais: 'Colombia'
        },
        tiempo: {
          fecha: new Date(),
          hora: '14:30',
          diaSemana: 'Lunes',
          mes: 1,
          ano: 2025
        },
        tipoInfraccion: {
          id: 'INF001',
          categoria: 'Exceso de velocidad',
          gravedad: 'media',
          articuloLegal: 'Artículo 123'
        },
        serviciosRecomendados: [],
        clusterAsignado: 'C1',
        gravedadEstimada: 'media',
        estado: 'pendiente'
      }
    ];

    this.consultasIncidentes = sampleData;
  }

  // Agregar nueva consulta al cubo
  async agregarConsulta(consulta: ConsultaIncidente): Promise<ConsultaIncidente> {
    this.consultasIncidentes.push(consulta);
    return consulta;
  }

  // Realizar consulta OLAP multidimensional
  async ejecutarConsultaOLAP(query: OLAPQuery): Promise<OLAPResult> {
    const startTime = Date.now();

    let data = [...this.consultasIncidentes];

    // Aplicar filtros
    if (query.filters) {
      data = this.aplicarFiltros(data, query.filters);
    }

    // Agrupar por dimensiones
    if (query.groupBy && query.groupBy.length > 0) {
      data = this.agruparPorDimensiones(data, query.groupBy);
    }

    // Aplicar límite
    if (query.limit) {
      data = data.slice(0, query.limit);
    }

    const executionTime = Date.now() - startTime;

    return {
      data,
      dimensions: query.dimensions,
      totalRecords: data.length,
      executionTime
    };
  }

  private aplicarFiltros(data: ConsultaIncidente[], filters: Record<string, any>): ConsultaIncidente[] {
    return data.filter(item => {
      for (const [key, value] of Object.entries(filters)) {
        if (key.includes('.')) {
          // Filtros anidados (ej. "ubicacion.ciudad")
          const parts = key.split('.');
          let current: any = item;
          for (const part of parts) {
            current = current[part];
            if (current === undefined) return false;
          }
          if (current !== value) return false;
        } else {
          if ((item as any)[key] !== value) return false;
        }
      }
      return true;
    });
  }

  private agruparPorDimensiones(data: ConsultaIncidente[], groupBy: string[]): any[] {
    const grupos: Map<string, any> = new Map();

    data.forEach(item => {
      const key = groupBy.map(dim => {
        if (dim.includes('.')) {
          const parts = dim.split('.');
          let value: any = item;
          for (const part of parts) {
            value = value[part];
          }
          return value;
        }
        return (item as any)[dim];
      }).join('|');

      if (!grupos.has(key)) {
        grupos.set(key, {
          grupo: key,
          count: 0,
          items: []
        });
      }

      const grupo = grupos.get(key)!;
      grupo.count++;
      grupo.items.push(item);
    });

    return Array.from(grupos.values());
  }

  // Consultas predefinidas para ML

  async obtenerConsultasPorUbicacion(ciudad: string): Promise<ConsultaIncidente[]> {
    return this.consultasIncidentes.filter(c => c.ubicacion.ciudad === ciudad);
  }

  async obtenerConsultasPorTiempo(fechaInicio: Date, fechaFin: Date): Promise<ConsultaIncidente[]> {
    return this.consultasIncidentes.filter(c =>
      c.tiempo.fecha >= fechaInicio && c.tiempo.fecha <= fechaFin
    );
  }

  async obtenerConsultasPorCluster(cluster: string): Promise<ConsultaIncidente[]> {
    return this.consultasIncidentes.filter(c => c.clusterAsignado === cluster);
  }

  async obtenerEstadisticasPorDimension(dimension: string): Promise<any> {
    const query: OLAPQuery = {
      dimensions: [dimension],
      measures: ['count'],
      groupBy: [dimension]
    };

    return await this.ejecutarConsultaOLAP(query);
  }

  // Obtener todas las consultas para entrenamiento ML
  async obtenerDatasetCompleto(): Promise<ConsultaIncidente[]> {
    return this.consultasIncidentes;
  }

  // Actualizar cluster asignado
  async actualizarCluster(consultaId: string, cluster: string): Promise<void> {
    const consulta = this.consultasIncidentes.find(c => c.id === consultaId);
    if (consulta) {
      consulta.clusterAsignado = cluster;
    }
  }
}
