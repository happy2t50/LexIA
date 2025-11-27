// Use Case - Ejecutar consulta OLAP

import { IConsultaRepository, OLAPQuery, OLAPResult } from '../../domain/ports/IConsultaRepository';

export class EjecutarConsultaOLAPUseCase {
  constructor(private readonly consultaRepository: IConsultaRepository) {}

  async execute(query: OLAPQuery): Promise<OLAPResult> {
    // Validaciones
    if (!query.dimensions || query.dimensions.length === 0) {
      throw new Error('Se requiere al menos una dimensión');
    }

    if (!query.measures || query.measures.length === 0) {
      throw new Error('Se requiere al menos una medida');
    }

    // Ejecutar consulta OLAP
    return await this.consultaRepository.ejecutarConsultaOLAP(query);
  }
}
