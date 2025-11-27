// Use Case - Obtener dataset para ML

import { ConsultaIncidente } from '../../domain/entities/ConsultaIncidente';
import { IConsultaRepository } from '../../domain/ports/IConsultaRepository';

export class ObtenerDatasetUseCase {
  constructor(private readonly consultaRepository: IConsultaRepository) {}

  async execute(): Promise<ConsultaIncidente[]> {
    const consultas = await this.consultaRepository.obtenerTodas();

    // Filtrar solo consultas con cluster asignado para entrenamiento
    return consultas.filter(c => c.clusterAsignado !== undefined);
  }
}
