// Server - Configuración del servidor HTTP (Express)

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Container } from '../config/container';
import { createConsultaRoutes } from './routes/consultaRoutes';

dotenv.config();

export class Server {
  private app: Express;
  private port: number;
  private container: Container;

  constructor(port: number) {
    this.app = express();
    this.port = port;
    this.container = Container.getInstance();
    this.configureMiddleware();
    this.configureRoutes();
  }

  private configureMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
  }

  private configureRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'OK', service: 'OLAP Cube Service' });
    });

    // Rutas de consultas
    const consultaRoutes = createConsultaRoutes(this.container.consultaController);
    this.app.use('/', consultaRoutes);
  }

  public start(): void {
    this.app.listen(this.port, () => {
      console.log(`🚀 OLAP Cube Service corriendo en puerto ${this.port}`);
      console.log(`📊 Arquitectura Hexagonal implementada`);
    });
  }

  public getApp(): Express {
    return this.app;
  }
}
