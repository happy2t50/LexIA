// Port (Interface) - Define el contrato para el repositorio
// Parte del núcleo del dominio, independiente de la implementación

import { ConsultaIncidente } from '../entities/ConsultaIncidente';

export interface OLAPQuery {
  dimensions: string[];
  measures: string[];
  filters?: Record<string, any>;
  groupBy?: string[];
  orderBy?: string;
  limit?: number;
}

export interface OLAPResult {
  data: any[];
  dimensions: string[];
  totalRecords: number;
  executionTime: number;
}

export interface IConsultaRepository {
  // Operaciones CRUD
  guardar(consulta: ConsultaIncidente): Promise<ConsultaIncidente>;
  obtenerPorId(id: string): Promise<ConsultaIncidente | null>;
  obtenerTodas(): Promise<ConsultaIncidente[]>;
  actualizar(consulta: ConsultaIncidente): Promise<ConsultaIncidente>;
  eliminar(id: string): Promise<boolean>;

  // Operaciones OLAP
  ejecutarConsultaOLAP(query: OLAPQuery): Promise<OLAPResult>;
  obtenerPorUbicacion(ciudad: string): Promise<ConsultaIncidente[]>;
  obtenerPorTiempo(fechaInicio: Date, fechaFin: Date): Promise<ConsultaIncidente[]>;
  obtenerPorCluster(cluster: string): Promise<ConsultaIncidente[]>;
  obtenerPorUsuario(usuarioId: string): Promise<ConsultaIncidente[]>;
  obtenerEstadisticasPorDimension(dimension: string): Promise<any>;
}
