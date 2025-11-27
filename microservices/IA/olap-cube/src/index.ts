// Entry Point - Punto de entrada de la aplicación
// Arquitectura Hexagonal implementada

import { Server } from './infrastructure/http/server';

const PORT = parseInt(process.env.PORT || '3001', 10);

const server = new Server(PORT);
server.start();
