// Controller - Adaptador HTTP (capa de infraestructura)

import { Request, Response } from 'express';
import { AgregarConsultaUseCase } from '../../../application/usecases/AgregarConsultaUseCase';
import { EjecutarConsultaOLAPUseCase } from '../../../application/usecases/EjecutarConsultaOLAPUseCase';
import { ObtenerDatasetUseCase } from '../../../application/usecases/ObtenerDatasetUseCase';
import { ActualizarClusterUseCase } from '../../../application/usecases/ActualizarClusterUseCase';
import { IConsultaRepository } from '../../../domain/ports/IConsultaRepository';
import { ConsultaIncidente, Usuario, Ubicacion, Tiempo } from '../../../domain/entities/ConsultaIncidente';

export class ConsultaController {
  constructor(
    private readonly agregarConsultaUseCase: AgregarConsultaUseCase,
    private readonly ejecutarConsultaOLAPUseCase: EjecutarConsultaOLAPUseCase,
    private readonly obtenerDatasetUseCase: ObtenerDatasetUseCase,
    private readonly actualizarClusterUseCase: ActualizarClusterUseCase,
    private readonly consultaRepository: IConsultaRepository
  ) {}

  agregarConsulta = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = req.body;

      // Mapear DTO a entidad de dominio
      const usuario = new Usuario(
        data.usuario.id,
        data.usuario.tipo,
        data.usuario.historialConsultas || [],
        new Date(data.usuario.fechaRegistro)
      );

      const ubicacion = new Ubicacion(
        data.ubicacion.ciudad,
        data.ubicacion.barrio,
        data.ubicacion.coordenadas,
        data.ubicacion.pais
      );

      const tiempo = new Tiempo(
        new Date(data.tiempo.fecha),
        data.tiempo.hora,
        data.tiempo.diaSemana,
        data.tiempo.mes,
        data.tiempo.ano
      );

      const consulta = new ConsultaIncidente(
        data.id,
        data.textoConsulta,
        data.usuarioId,
        usuario,
        ubicacion,
        tiempo,
        data.serviciosRecomendados || [],
        data.gravedadEstimada,
        data.estado || 'pendiente',
        data.tipoInfraccion,
        data.abogadoAsignado,
        data.clusterAsignado
      );

      const result = await this.agregarConsultaUseCase.execute(consulta);

      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  ejecutarConsultaOLAP = async (req: Request, res: Response): Promise<void> => {
    try {
      const query = req.body;
      const result = await this.ejecutarConsultaOLAPUseCase.execute(query);

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  obtenerDataset = async (req: Request, res: Response): Promise<void> => {
    try {
      const dataset = await this.obtenerDatasetUseCase.execute();
      res.json(dataset);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  obtenerPorUbicacion = async (req: Request, res: Response): Promise<void> => {
    try {
      const { ciudad } = req.params;
      const consultas = await this.consultaRepository.obtenerPorUbicacion(ciudad);
      res.json(consultas);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  obtenerPorCluster = async (req: Request, res: Response): Promise<void> => {
    try {
      const { cluster } = req.params;
      const consultas = await this.consultaRepository.obtenerPorCluster(cluster);
      res.json(consultas);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  obtenerEstadisticas = async (req: Request, res: Response): Promise<void> => {
    try {
      const { dimension } = req.params;
      const estadisticas = await this.consultaRepository.obtenerEstadisticasPorDimension(dimension);
      res.json(estadisticas);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  actualizarCluster = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { cluster } = req.body;

      await this.actualizarClusterUseCase.execute(id, cluster);

      res.json({ message: 'Cluster actualizado correctamente' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };
}
