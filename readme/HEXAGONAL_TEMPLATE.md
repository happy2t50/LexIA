# Template de Arquitectura Hexagonal para Microservicios

Este documento proporciona la estructura estándar que TODOS los microservicios deben seguir.

## Estructura de Carpetas Estándar

```
microservices/[nombre-servicio]/
├── src/
│   ├── domain/                      # CAPA DE DOMINIO (Núcleo)
│   │   ├── entities/               # Entidades de negocio
│   │   │   └── [Entity].ts
│   │   ├── valueObjects/           # Value Objects (opcional)
│   │   │   └── [ValueObject].ts
│   │   └── ports/                  # Puertos (Interfaces)
│   │       ├── I[Name]Repository.ts
│   │       └── I[Name]Service.ts
│   │
│   ├── application/                 # CAPA DE APLICACIÓN
│   │   └── usecases/               # Casos de uso
│   │       ├── [Action][Entity]UseCase.ts
│   │       └── ...
│   │
│   └── infrastructure/              # CAPA DE INFRAESTRUCTURA
│       ├── adapters/               # Adaptadores de salida (Driven)
│       │   ├── InMemory[Entity]Repository.ts
│       │   ├── PostgreSQL[Entity]Repository.ts
│       │   └── External[Name]Service.ts
│       │
│       ├── http/                   # Adaptador de entrada HTTP (Driving)
│       │   ├── controllers/
│       │   │   └── [Entity]Controller.ts
│       │   ├── routes/
│       │   │   └── [entity]Routes.ts
│       │   ├── middlewares/
│       │   │   └── [name]Middleware.ts
│       │   └── server.ts
│       │
│       └── config/                 # Configuración e IoC
│           └── container.ts
│
├── tests/                           # Tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── package.json
├── tsconfig.json
└── .env.example
```

## Implementación por Capas

### 1. Domain Layer (Dominio)

#### Entities (Entidades)
```typescript
// src/domain/entities/[Entity].ts
export class Entity {
  constructor(
    public readonly id: string,
    public readonly property1: string,
    public readonly property2: number,
    // ... más propiedades
  ) {
    this.validate();
  }

  // Validación en el constructor
  private validate(): void {
    if (!this.id) {
      throw new Error('ID es requerido');
    }
  }

  // Métodos de dominio (lógica de negocio)
  doSomething(param: string): Entity {
    // Lógica de negocio
    // Retornar nueva instancia (inmutabilidad)
    return new Entity(
      this.id,
      param,
      this.property2
    );
  }
}
```

#### Ports (Interfaces)
```typescript
// src/domain/ports/I[Name]Repository.ts
import { Entity } from '../entities/Entity';

export interface IEntityRepository {
  // CRUD básico
  save(entity: Entity): Promise<Entity>;
  findById(id: string): Promise<Entity | null>;
  findAll(): Promise<Entity[]>;
  update(entity: Entity): Promise<Entity>;
  delete(id: string): Promise<boolean>;

  // Métodos específicos del dominio
  findByCustomCriteria(criteria: any): Promise<Entity[]>;
}
```

```typescript
// src/domain/ports/I[Name]Service.ts (Para servicios externos)
export interface IExternalService {
  callExternalAPI(data: any): Promise<any>;
}
```

### 2. Application Layer (Aplicación)

#### Use Cases
```typescript
// src/application/usecases/[Action][Entity]UseCase.ts
import { Entity } from '../../domain/entities/Entity';
import { IEntityRepository } from '../../domain/ports/IEntityRepository';

export class ActionEntityUseCase {
  constructor(
    private readonly entityRepository: IEntityRepository
  ) {}

  async execute(input: InputDTO): Promise<OutputDTO> {
    // 1. Validaciones de entrada
    this.validateInput(input);

    // 2. Crear/obtener entidad de dominio
    const entity = new Entity(/* ... */);

    // 3. Aplicar lógica de negocio (a través del dominio)
    const processedEntity = entity.doSomething(input.param);

    // 4. Persistir (a través del puerto)
    const savedEntity = await this.entityRepository.save(processedEntity);

    // 5. Mapear a DTO de salida
    return this.mapToDTO(savedEntity);
  }

  private validateInput(input: InputDTO): void {
    if (!input.requiredField) {
      throw new Error('Campo requerido');
    }
  }

  private mapToDTO(entity: Entity): OutputDTO {
    return {
      id: entity.id,
      // ... mapear propiedades
    };
  }
}

// DTOs
interface InputDTO {
  requiredField: string;
  param: string;
}

interface OutputDTO {
  id: string;
  // ... propiedades
}
```

### 3. Infrastructure Layer (Infraestructura)

#### Adapters - Repository (Driven)
```typescript
// src/infrastructure/adapters/InMemory[Entity]Repository.ts
import { Entity } from '../../domain/entities/Entity';
import { IEntityRepository } from '../../domain/ports/IEntityRepository';

export class InMemoryEntityRepository implements IEntityRepository {
  private entities: Entity[] = [];

  async save(entity: Entity): Promise<Entity> {
    this.entities.push(entity);
    return entity;
  }

  async findById(id: string): Promise<Entity | null> {
    return this.entities.find(e => e.id === id) || null;
  }

  async findAll(): Promise<Entity[]> {
    return [...this.entities];
  }

  async update(entity: Entity): Promise<Entity> {
    const index = this.entities.findIndex(e => e.id === entity.id);
    if (index === -1) {
      throw new Error('Entity not found');
    }
    this.entities[index] = entity;
    return entity;
  }

  async delete(id: string): Promise<boolean> {
    const index = this.entities.findIndex(e => e.id === id);
    if (index === -1) {
      return false;
    }
    this.entities.splice(index, 1);
    return true;
  }

  async findByCustomCriteria(criteria: any): Promise<Entity[]> {
    // Implementación específica
    return this.entities.filter(e => /* ... */);
  }
}
```

```typescript
// src/infrastructure/adapters/PostgreSQL[Entity]Repository.ts (Ejemplo futuro)
import { Pool } from 'pg';
import { Entity } from '../../domain/entities/Entity';
import { IEntityRepository } from '../../domain/ports/IEntityRepository';

export class PostgreSQLEntityRepository implements IEntityRepository {
  constructor(private readonly pool: Pool) {}

  async save(entity: Entity): Promise<Entity> {
    const query = 'INSERT INTO entities (id, property1, property2) VALUES ($1, $2, $3) RETURNING *';
    const values = [entity.id, entity.property1, entity.property2];
    const result = await this.pool.query(query, values);
    return this.mapToEntity(result.rows[0]);
  }

  // ... implementar otros métodos

  private mapToEntity(row: any): Entity {
    return new Entity(row.id, row.property1, row.property2);
  }
}
```

#### Adapters - HTTP Controller (Driving)
```typescript
// src/infrastructure/http/controllers/[Entity]Controller.ts
import { Request, Response } from 'express';
import { ActionEntityUseCase } from '../../../application/usecases/ActionEntityUseCase';

export class EntityController {
  constructor(
    private readonly actionEntityUseCase: ActionEntityUseCase,
    // ... más use cases
  ) {}

  action = async (req: Request, res: Response): Promise<void> => {
    try {
      // Mapear request a DTO
      const input = {
        requiredField: req.body.requiredField,
        param: req.body.param
      };

      // Ejecutar use case
      const result = await this.actionEntityUseCase.execute(input);

      // Responder
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  // ... más métodos
}
```

#### Routes
```typescript
// src/infrastructure/http/routes/[entity]Routes.ts
import { Router } from 'express';
import { EntityController } from '../controllers/EntityController';

export function createEntityRoutes(controller: EntityController): Router {
  const router = Router();

  router.post('/entities', controller.action);
  router.get('/entities/:id', controller.getById);
  router.get('/entities', controller.getAll);
  router.put('/entities/:id', controller.update);
  router.delete('/entities/:id', controller.delete);

  return router;
}
```

#### Container (Dependency Injection)
```typescript
// src/infrastructure/config/container.ts
import { InMemoryEntityRepository } from '../adapters/InMemoryEntityRepository';
import { ActionEntityUseCase } from '../../application/usecases/ActionEntityUseCase';
import { EntityController } from '../http/controllers/EntityController';
import { IEntityRepository } from '../../domain/ports/IEntityRepository';

export class Container {
  private static instance: Container;

  // Repositories
  public readonly entityRepository: IEntityRepository;

  // Use Cases
  public readonly actionEntityUseCase: ActionEntityUseCase;

  // Controllers
  public readonly entityController: EntityController;

  private constructor() {
    // Repositories (fácil cambiar de implementación)
    this.entityRepository = new InMemoryEntityRepository();
    // this.entityRepository = new PostgreSQLEntityRepository(pool);

    // Use Cases
    this.actionEntityUseCase = new ActionEntityUseCase(
      this.entityRepository
    );

    // Controllers
    this.entityController = new EntityController(
      this.actionEntityUseCase
    );
  }

  public static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }
}
```

#### Server
```typescript
// src/infrastructure/http/server.ts
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { Container } from '../config/container';
import { createEntityRoutes } from './routes/entityRoutes';

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
      res.json({ status: 'OK', service: '[Service Name]' });
    });

    // Entity routes
    const entityRoutes = createEntityRoutes(this.container.entityController);
    this.app.use('/', entityRoutes);
  }

  public start(): void {
    this.app.listen(this.port, () => {
      console.log(`🚀 [Service Name] corriendo en puerto ${this.port}`);
      console.log(`📊 Arquitectura Hexagonal implementada`);
    });
  }

  public getApp(): Express {
    return this.app;
  }
}
```

#### Entry Point
```typescript
// src/index.ts
import { Server } from './infrastructure/http/server';

const PORT = parseInt(process.env.PORT || '3000', 10);

const server = new Server(PORT);
server.start();
```

## Reglas de la Arquitectura Hexagonal

### ✅ DO (Hacer)

1. **Dominio sin dependencias externas**
   ```typescript
   // ✅ Correcto
   export class Entity {
     // Solo TypeScript nativo
   }
   ```

2. **Usar interfaces para puertos**
   ```typescript
   // ✅ Correcto
   constructor(private repository: IEntityRepository) {}
   ```

3. **Entidades inmutables**
   ```typescript
   // ✅ Correcto
   doSomething(): Entity {
     return new Entity(/* nueva instancia */);
   }
   ```

4. **Use cases enfocados**
   ```typescript
   // ✅ Correcto: Un use case, una responsabilidad
   class CreateUserUseCase { }
   class UpdateUserUseCase { }
   ```

5. **Inyección de dependencias**
   ```typescript
   // ✅ Correcto
   const useCase = new ActionUseCase(repository);
   ```

### ❌ DON'T (No hacer)

1. **NO dependencias del dominio en infraestructura**
   ```typescript
   // ❌ Incorrecto
   import express from 'express';
   export class Entity {
     handleRequest(req: express.Request) { }
   }
   ```

2. **NO lógica de negocio en controllers**
   ```typescript
   // ❌ Incorrecto
   controller = (req, res) => {
     if (req.body.amount > 1000) { // Lógica de negocio
       // ...
     }
   }
   ```

3. **NO lógica de infraestructura en use cases**
   ```typescript
   // ❌ Incorrecto
   class UseCase {
     execute() {
       const result = await fetch('http://...'); // HTTP directo
     }
   }
   ```

4. **NO referencias directas a implementaciones**
   ```typescript
   // ❌ Incorrecto
   constructor(private repo: InMemoryRepository) {}

   // ✅ Correcto
   constructor(private repo: IRepository) {}
   ```

## Tests

### Domain Tests
```typescript
// tests/unit/domain/entities/Entity.test.ts
describe('Entity', () => {
  it('debe crear entidad válida', () => {
    const entity = new Entity('1', 'value', 100);
    expect(entity.id).toBe('1');
  });

  it('debe lanzar error si datos inválidos', () => {
    expect(() => new Entity('', 'value', 100))
      .toThrow('ID es requerido');
  });

  it('debe aplicar lógica de negocio correctamente', () => {
    const entity = new Entity('1', 'value', 100);
    const updated = entity.doSomething('newValue');
    expect(updated.property1).toBe('newValue');
  });
});
```

### Use Case Tests
```typescript
// tests/unit/application/usecases/ActionUseCase.test.ts
describe('ActionEntityUseCase', () => {
  it('debe ejecutar acción correctamente', async () => {
    // Mock repository
    const mockRepo: IEntityRepository = {
      save: jest.fn().mockResolvedValue(entity),
      // ...
    };

    const useCase = new ActionEntityUseCase(mockRepo);
    const result = await useCase.execute({ requiredField: 'value', param: 'test' });

    expect(mockRepo.save).toHaveBeenCalled();
    expect(result.id).toBeDefined();
  });
});
```

## Checklist de Implementación

Para cada microservicio, asegurarse de:

- [ ] **Domain Layer**
  - [ ] Entidades creadas con lógica de negocio
  - [ ] Ports (interfaces) definidos
  - [ ] Sin dependencias externas

- [ ] **Application Layer**
  - [ ] Use cases implementados
  - [ ] DTOs definidos
  - [ ] Validaciones de entrada

- [ ] **Infrastructure Layer**
  - [ ] Repositorio implementado (InMemory mínimo)
  - [ ] Controller HTTP implementado
  - [ ] Routes configuradas
  - [ ] Container (DI) configurado
  - [ ] Server configurado

- [ ] **Tests**
  - [ ] Tests unitarios de dominio
  - [ ] Tests unitarios de use cases
  - [ ] Tests de integración (opcional)

- [ ] **Documentation**
  - [ ] README del microservicio
  - [ ] Comentarios en código complejo

## Resumen

La arquitectura hexagonal en LexIA 2.0:

1. **Dominio** = Lógica de negocio pura
2. **Aplicación** = Orquestación y casos de uso
3. **Infraestructura** = Detalles técnicos (HTTP, DB, etc.)
4. **Puertos** = Interfaces (contratos)
5. **Adaptadores** = Implementaciones de puertos
6. **Container** = Inyección de dependencias

**Regla de oro:** Las dependencias siempre apuntan hacia el dominio, nunca hacia afuera.
