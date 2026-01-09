// Routes - Professional Tracking (Accept/Reject)

import { Router } from 'express';
import { TrackingController } from '../controllers/TrackingController';

export function createTrackingRoutes(controller: TrackingController): Router {
  const router = Router();

  // Tracking de aceptaciones/rechazos de profesionistas
  router.post('/tracking/profesionista/aceptacion', controller.registrarAceptacion);
  router.post('/tracking/profesionista/rechazo', controller.registrarRechazo);
  router.get('/tracking/profesionista/:profesionistaId/rechazos/:usuarioId', controller.obtenerRechazos);
  router.get('/tracking/usuario/:usuarioId/profesionistas-bloqueados', controller.obtenerBloqueados);
  
  // Sistema de calificaciones/ratings
  router.post('/tracking/profesionista/rating', controller.registrarRating);
  router.get('/tracking/profesionista/:profesionistaId/rating', controller.obtenerRating);

  return router;
}
