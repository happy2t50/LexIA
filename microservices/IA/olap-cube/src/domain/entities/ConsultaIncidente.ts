// Domain Entity - Entidad del dominio (núcleo de la arquitectura hexagonal)

export class Usuario {
  constructor(
    public readonly id: string,
    public readonly tipo: 'conductor' | 'peaton' | 'pasajero',
    public readonly historialConsultas: string[],
    public readonly fechaRegistro: Date
  ) {}
}

export class Ubicacion {
  constructor(
    public readonly ciudad: string,
    public readonly barrio: string,
    public readonly coordenadas: { lat: number; lng: number },
    public readonly pais: string
  ) {}
}

export class Tiempo {
  constructor(
    public readonly fecha: Date,
    public readonly hora: string,
    public readonly diaSemana: string,
    public readonly mes: number,
    public readonly ano: number
  ) {}
}

export class TipoInfraccion {
  constructor(
    public readonly id: string,
    public readonly categoria: string,
    public readonly gravedad: 'baja' | 'media' | 'alta',
    public readonly articuloLegal: string,
    public readonly subcategoria?: string
  ) {}
}

export class ConsultaIncidente {
  constructor(
    public readonly id: string,
    public readonly textoConsulta: string,
    public readonly usuarioId: string,
    public readonly usuario: Usuario,
    public readonly ubicacion: Ubicacion,
    public readonly tiempo: Tiempo,
    public readonly serviciosRecomendados: string[],
    public readonly gravedadEstimada: 'baja' | 'media' | 'alta',
    public readonly estado: 'pendiente' | 'en_proceso' | 'resuelto',
    public tipoInfraccion?: TipoInfraccion,
    public abogadoAsignado?: string,
    public clusterAsignado?: string
  ) {}

  // Métodos de dominio
  asignarCluster(cluster: string): ConsultaIncidente {
    return new ConsultaIncidente(
      this.id,
      this.textoConsulta,
      this.usuarioId,
      this.usuario,
      this.ubicacion,
      this.tiempo,
      this.serviciosRecomendados,
      this.gravedadEstimada,
      this.estado,
      this.tipoInfraccion,
      this.abogadoAsignado,
      cluster
    );
  }

  asignarAbogado(abogadoId: string): ConsultaIncidente {
    return new ConsultaIncidente(
      this.id,
      this.textoConsulta,
      this.usuarioId,
      this.usuario,
      this.ubicacion,
      this.tiempo,
      this.serviciosRecomendados,
      this.gravedadEstimada,
      this.estado,
      this.tipoInfraccion,
      abogadoId,
      this.clusterAsignado
    );
  }

  cambiarEstado(nuevoEstado: 'pendiente' | 'en_proceso' | 'resuelto'): ConsultaIncidente {
    return new ConsultaIncidente(
      this.id,
      this.textoConsulta,
      this.usuarioId,
      this.usuario,
      this.ubicacion,
      this.tiempo,
      this.serviciosRecomendados,
      this.gravedadEstimada,
      nuevoEstado,
      this.tipoInfraccion,
      this.abogadoAsignado,
      this.clusterAsignado
    );
  }
}
