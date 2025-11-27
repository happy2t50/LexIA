// Tipos para el Cubo OLAP

export interface Usuario {
  id: string;
  tipo: 'conductor' | 'peaton' | 'pasajero';
  historialConsultas: string[];
  fechaRegistro: Date;
}

export interface Ubicacion {
  ciudad: string;
  barrio: string;
  coordenadas: {
    lat: number;
    lng: number;
  };
  pais: string;
}

export interface Tiempo {
  fecha: Date;
  hora: string;
  diaSemana: string;
  mes: number;
  ano: number;
}

export interface TipoInfraccion {
  id: string;
  categoria: string;
  subcategoria?: string;
  gravedad: 'baja' | 'media' | 'alta';
  articuloLegal: string;
}

export interface Abogado {
  id: string;
  nombre: string;
  especializacion: string[];
  ubicacion: Ubicacion;
  calificacion: number;
  experiencia: number;
  disponible: boolean;
}

export interface ServicioComplementario {
  id: string;
  tipo: 'grua' | 'taller' | 'seguro';
  nombre: string;
  ubicacion: Ubicacion;
  disponible: boolean;
  tarifa?: number;
}

// Tabla de Hechos
export interface ConsultaIncidente {
  id: string;
  textoConsulta: string;
  usuarioId: string;
  usuario: Usuario;
  ubicacion: Ubicacion;
  tiempo: Tiempo;
  tipoInfraccion?: TipoInfraccion;
  abogadoAsignado?: string;
  serviciosRecomendados: string[];
  clusterAsignado?: string;
  gravedadEstimada: 'baja' | 'media' | 'alta';
  estado: 'pendiente' | 'en_proceso' | 'resuelto';
}

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
