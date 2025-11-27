// Adapter (Implementación del Port) - Infraestructura
// Implementa IConsultaRepository usando almacenamiento en memoria

import { ConsultaIncidente, Usuario, Ubicacion, Tiempo } from '../../domain/entities/ConsultaIncidente';
import { IConsultaRepository, OLAPQuery, OLAPResult } from '../../domain/ports/IConsultaRepository';

export class InMemoryConsultaRepository implements IConsultaRepository {
  private consultas: ConsultaIncidente[] = [];

  constructor() {
    this.inicializarDatosEjemplo();
  }

  private inicializarDatosEjemplo(): void {
    const usuario = new Usuario(
      'user1',
      'conductor',
      [],
      new Date('2024-01-01')
    );

    const ubicacion = new Ubicacion(
      'Bogotá',
      'Chapinero',
      { lat: 4.6482, lng: -74.0638 },
      'Colombia'
    );

    const tiempo = new Tiempo(
      new Date(),
      '14:30',
      'Lunes',
      1,
      2025
    );

    const consultaEjemplo = new ConsultaIncidente(
      '1',
      'me pasé un semáforo en rojo',
      'user1',
      usuario,
      ubicacion,
      tiempo,
      [],
      'media',
      'pendiente',
      undefined,
      undefined,
      'C1'
    );

    this.consultas.push(consultaEjemplo);
  }

  async guardar(consulta: ConsultaIncidente): Promise<ConsultaIncidente> {
    this.consultas.push(consulta);
    return consulta;
  }

  async obtenerPorId(id: string): Promise<ConsultaIncidente | null> {
    return this.consultas.find(c => c.id === id) || null;
  }

  async obtenerTodas(): Promise<ConsultaIncidente[]> {
    return [...this.consultas];
  }

  async actualizar(consulta: ConsultaIncidente): Promise<ConsultaIncidente> {
    const index = this.consultas.findIndex(c => c.id === consulta.id);
    if (index === -1) {
      throw new Error('Consulta no encontrada');
    }
    this.consultas[index] = consulta;
    return consulta;
  }

  async eliminar(id: string): Promise<boolean> {
    const index = this.consultas.findIndex(c => c.id === id);
    if (index === -1) {
      return false;
    }
    this.consultas.splice(index, 1);
    return true;
  }

  async ejecutarConsultaOLAP(query: OLAPQuery): Promise<OLAPResult> {
    const startTime = Date.now();

    let data = [...this.consultas];

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

  async obtenerPorUbicacion(ciudad: string): Promise<ConsultaIncidente[]> {
    return this.consultas.filter(c => c.ubicacion.ciudad === ciudad);
  }

  async obtenerPorTiempo(fechaInicio: Date, fechaFin: Date): Promise<ConsultaIncidente[]> {
    return this.consultas.filter(c =>
      c.tiempo.fecha >= fechaInicio && c.tiempo.fecha <= fechaFin
    );
  }

  async obtenerPorCluster(cluster: string): Promise<ConsultaIncidente[]> {
    return this.consultas.filter(c => c.clusterAsignado === cluster);
  }

  async obtenerEstadisticasPorDimension(dimension: string): Promise<any> {
    const query: OLAPQuery = {
      dimensions: [dimension],
      measures: ['count'],
      groupBy: [dimension]
    };

    return await this.ejecutarConsultaOLAP(query);
  }

  private aplicarFiltros(data: ConsultaIncidente[], filters: Record<string, any>): ConsultaIncidente[] {
    return data.filter(item => {
      for (const [key, value] of Object.entries(filters)) {
        if (key.includes('.')) {
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
}
