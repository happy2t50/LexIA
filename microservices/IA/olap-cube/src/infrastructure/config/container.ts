// Dependency Injection Container
// Configuración de inyección de dependencias (Inversión de control)

import { Pool } from 'pg';
import { InMemoryConsultaRepository } from '../adapters/InMemoryConsultaRepository';
import { PostgreSQLConsultaRepository } from '../adapters/PostgreSQLConsultaRepository';
import { AgregarConsultaUseCase } from '../../application/usecases/AgregarConsultaUseCase';
import { EjecutarConsultaOLAPUseCase } from '../../application/usecases/EjecutarConsultaOLAPUseCase';
import { ObtenerDatasetUseCase } from '../../application/usecases/ObtenerDatasetUseCase';
import { ActualizarClusterUseCase } from '../../application/usecases/ActualizarClusterUseCase';
import { ConsultaController } from '../http/controllers/ConsultaController';
import { IConsultaRepository } from '../../domain/ports/IConsultaRepository';

export class Container {
  private static instance: Container;
  private pool: Pool | null = null;

  // Repositories (Adapters)
  public readonly consultaRepository: IConsultaRepository;

  // Use Cases
  public readonly agregarConsultaUseCase: AgregarConsultaUseCase;
  public readonly ejecutarConsultaOLAPUseCase: EjecutarConsultaOLAPUseCase;
  public readonly obtenerDatasetUseCase: ObtenerDatasetUseCase;
  public readonly actualizarClusterUseCase: ActualizarClusterUseCase;

  // Controllers
  public readonly consultaController: ConsultaController;

  private constructor() {
    // Determinar si usar PostgreSQL o InMemory
    const usePostgreSQL = process.env.USE_POSTGRESQL === 'true';

    if (usePostgreSQL) {
      // Configuración de PostgreSQL
      this.pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'lexia_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        max: parseInt(process.env.DB_POOL_MAX || '20', 10),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      this.pool.on('error', (err) => {
        console.error('❌ Error inesperado en el pool de PostgreSQL:', err);
      });

      this.consultaRepository = new PostgreSQLConsultaRepository(this.pool);
      console.log('📊 OLAP Cube usando PostgreSQL');
    } else {
      // Usar repositorio en memoria para desarrollo
      this.consultaRepository = new InMemoryConsultaRepository();
      console.log('💾 OLAP Cube usando InMemory (desarrollo)');
    }

    // Inicializar use cases con sus dependencias
    this.agregarConsultaUseCase = new AgregarConsultaUseCase(this.consultaRepository);
    this.ejecutarConsultaOLAPUseCase = new EjecutarConsultaOLAPUseCase(this.consultaRepository);
    this.obtenerDatasetUseCase = new ObtenerDatasetUseCase(this.consultaRepository);
    this.actualizarClusterUseCase = new ActualizarClusterUseCase(this.consultaRepository);

    // Inicializar controller con sus dependencias
    this.consultaController = new ConsultaController(
      this.agregarConsultaUseCase,
      this.ejecutarConsultaOLAPUseCase,
      this.obtenerDatasetUseCase,
      this.actualizarClusterUseCase,
      this.consultaRepository
    );
  }

  public static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }
}
