// Use Case - Actualizar cluster de una consulta

import { IConsultaRepository } from '../../domain/ports/IConsultaRepository';

export class ActualizarClusterUseCase {
  constructor(private readonly consultaRepository: IConsultaRepository) {}

  async execute(consultaId: string, cluster: string): Promise<void> {
    // Validaciones
    const clustersValidos = ['C1', 'C2', 'C3', 'C4', 'C5'];
    if (!clustersValidos.includes(cluster)) {
      throw new Error('Cluster inválido. Debe ser C1, C2, C3, C4 o C5');
    }

    // Obtener consulta
    const consulta = await this.consultaRepository.obtenerPorId(consultaId);
    if (!consulta) {
      throw new Error('Consulta no encontrada');
    }

    // Asignar cluster (método de dominio)
    const consultaActualizada = consulta.asignarCluster(cluster);

    // Guardar
    await this.consultaRepository.actualizar(consultaActualizada);
  }
}
