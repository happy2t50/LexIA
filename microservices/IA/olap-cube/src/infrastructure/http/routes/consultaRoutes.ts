// Routes - Configuración de rutas HTTP

import { Router } from 'express';
import { ConsultaController } from '../controllers/ConsultaController';

export function createConsultaRoutes(controller: ConsultaController): Router {
  const router = Router();

  // Rutas de consultas
  router.post('/consultas', controller.agregarConsulta);
  router.post('/query', controller.ejecutarConsultaOLAP);
  router.get('/dataset', controller.obtenerDataset);
  router.get('/consultas/ubicacion/:ciudad', controller.obtenerPorUbicacion);
  router.get('/consultas/cluster/:cluster', controller.obtenerPorCluster);
  router.get('/consultas/usuario/:usuarioId', controller.obtenerPorUsuario);
  router.get('/estadisticas/:dimension', controller.obtenerEstadisticas);
  router.patch('/consultas/:id/cluster', controller.actualizarCluster);

  return router;
}
