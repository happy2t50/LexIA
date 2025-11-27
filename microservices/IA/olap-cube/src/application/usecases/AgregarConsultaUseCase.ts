// Use Case - Lógica de aplicación (capa de aplicación)

import { ConsultaIncidente } from '../../domain/entities/ConsultaIncidente';
import { IConsultaRepository } from '../../domain/ports/IConsultaRepository';

export class AgregarConsultaUseCase {
  constructor(private readonly consultaRepository: IConsultaRepository) {}

  async execute(consulta: ConsultaIncidente): Promise<ConsultaIncidente> {
    // Validaciones de negocio
    if (!consulta.textoConsulta || consulta.textoConsulta.trim().length === 0) {
      throw new Error('El texto de la consulta no puede estar vacío');
    }

    if (!consulta.usuarioId) {
      throw new Error('El ID de usuario es requerido');
    }

    // Guardar en el repositorio
    return await this.consultaRepository.guardar(consulta);
  }
}
