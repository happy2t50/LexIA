# Arquitectura Hexagonal en LexIA 2.0

## ¿Qué es la Arquitectura Hexagonal?

La **Arquitectura Hexagonal** (también conocida como **Puertos y Adaptadores**) fue propuesta por Alistair Cockburn. El objetivo principal es separar la lógica de negocio del dominio de los detalles de infraestructura, haciendo el sistema más mantenible, testeable y flexible.

## Capas de la Arquitectura

### 1. **Dominio (Domain)** - Centro del Hexágono
El núcleo de la aplicación. Contiene la lógica de negocio pura, independiente de frameworks y tecnologías.

**Ubicación:** `src/domain/`

**Componentes:**
- **Entities (Entidades):** Objetos de negocio con identidad única
- **Value Objects:** Objetos inmutables sin identidad
- **Ports (Puertos):** Interfaces que definen contratos

**Ejemplo:**
```typescript
// src/domain/entities/ConsultaIncidente.ts
export class ConsultaIncidente {
  constructor(
    public readonly id: string,
    public readonly textoConsulta: string,
    // ... más propiedades
  ) {}

  // Métodos de dominio (lógica de negocio)
  asignarCluster(cluster: string): ConsultaIncidente {
    // Retorna nueva instancia (inmutabilidad)
    return new ConsultaIncidente(/* ... */);
  }
}
```

**Características:**
- ✅ Sin dependencias externas
- ✅ Lógica de negocio pura
- ✅ Fácil de testear
- ✅ Inmutable cuando es posible

### 2. **Puertos (Ports)** - Interfaces del Hexágono
Definen los contratos (interfaces) que la aplicación necesita para comunicarse con el exterior.

**Tipos de Puertos:**

#### **a) Puertos de Entrada (Driving Ports)**
Casos de uso que la aplicación ofrece.

```typescript
// Implícito en los Use Cases
export class AgregarConsultaUseCase {
  async execute(consulta: ConsultaIncidente): Promise<ConsultaIncidente> {
    // Lógica de caso de uso
  }
}
```

#### **b) Puertos de Salida (Driven Ports)**
Interfaces que la aplicación necesita implementar para comunicarse con infraestructura.

```typescript
// src/domain/ports/IConsultaRepository.ts
export interface IConsultaRepository {
  guardar(consulta: ConsultaIncidente): Promise<ConsultaIncidente>;
  obtenerPorId(id: string): Promise<ConsultaIncidente | null>;
  obtenerTodas(): Promise<ConsultaIncidente[]>;
  // ... más métodos
}
```

### 3. **Aplicación (Application)** - Casos de Uso
Coordina el flujo de datos entre el dominio y la infraestructura. Contiene los casos de uso de la aplicación.

**Ubicación:** `src/application/usecases/`

**Ejemplo:**
```typescript
// src/application/usecases/AgregarConsultaUseCase.ts
export class AgregarConsultaUseCase {
  constructor(
    private readonly consultaRepository: IConsultaRepository
  ) {}

  async execute(consulta: ConsultaIncidente): Promise<ConsultaIncidente> {
    // 1. Validaciones de negocio
    if (!consulta.textoConsulta) {
      throw new Error('Texto requerido');
    }

    // 2. Delegar al repositorio (puerto)
    return await this.consultaRepository.guardar(consulta);
  }
}
```

**Responsabilidades:**
- Validación de datos de entrada
- Orquestación de entidades de dominio
- Transacciones
- NO contiene lógica de negocio (eso va en el dominio)

### 4. **Infraestructura (Infrastructure)** - Adaptadores
Implementaciones concretas de los puertos. Se comunica con sistemas externos.

**Ubicación:** `src/infrastructure/`

**Componentes:**

#### **a) Adaptadores de Salida (Driven Adapters)**
Implementan los puertos de salida (repositorios, APIs externas, etc.)

```typescript
// src/infrastructure/adapters/InMemoryConsultaRepository.ts
export class InMemoryConsultaRepository implements IConsultaRepository {
  private consultas: ConsultaIncidente[] = [];

  async guardar(consulta: ConsultaIncidente): Promise<ConsultaIncidente> {
    this.consultas.push(consulta);
    return consulta;
  }

  async obtenerPorId(id: string): Promise<ConsultaIncidente | null> {
    return this.consultas.find(c => c.id === id) || null;
  }

  // ... más implementaciones
}
```

**Otros adaptadores posibles:**
- `PostgreSQLConsultaRepository` - Base de datos PostgreSQL
- `MongoDBConsultaRepository` - Base de datos MongoDB
- `HTTPConsultaRepository` - API REST externa

#### **b) Adaptadores de Entrada (Driving Adapters)**
Exponen la aplicación al exterior (HTTP, CLI, GraphQL, etc.)

```typescript
// src/infrastructure/http/controllers/ConsultaController.ts
export class ConsultaController {
  constructor(
    private readonly agregarConsultaUseCase: AgregarConsultaUseCase
  ) {}

  agregarConsulta = async (req: Request, res: Response): Promise<void> => {
    try {
      // Mapear DTO a entidad de dominio
      const consulta = this.mapearAEntidad(req.body);

      // Ejecutar caso de uso
      const result = await this.agregarConsultaUseCase.execute(consulta);

      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };
}
```

### 5. **Configuración** - Inyección de Dependencias
Ensambla todas las piezas, conectando adaptadores con puertos.

**Ubicación:** `src/infrastructure/config/container.ts`

```typescript
export class Container {
  public readonly consultaRepository: IConsultaRepository;
  public readonly agregarConsultaUseCase: AgregarConsultaUseCase;
  public readonly consultaController: ConsultaController;

  constructor() {
    // Adapters (pueden cambiarse fácilmente)
    this.consultaRepository = new InMemoryConsultaRepository();
    // this.consultaRepository = new PostgreSQLConsultaRepository();

    // Use Cases
    this.agregarConsultaUseCase = new AgregarConsultaUseCase(
      this.consultaRepository
    );

    // Controllers
    this.consultaController = new ConsultaController(
      this.agregarConsultaUseCase
    );
  }
}
```

## Estructura de Carpetas

```
src/
├── domain/                     # Núcleo del hexágono
│   ├── entities/              # Entidades de negocio
│   │   └── ConsultaIncidente.ts
│   └── ports/                 # Interfaces (contratos)
│       └── IConsultaRepository.ts
│
├── application/               # Casos de uso
│   └── usecases/
│       ├── AgregarConsultaUseCase.ts
│       ├── EjecutarConsultaOLAPUseCase.ts
│       └── ActualizarClusterUseCase.ts
│
└── infrastructure/            # Detalles de implementación
    ├── adapters/             # Adaptadores de salida
    │   ├── InMemoryConsultaRepository.ts
    │   └── PostgreSQLConsultaRepository.ts  (futuro)
    │
    ├── http/                 # Adaptador de entrada (HTTP)
    │   ├── controllers/
    │   │   └── ConsultaController.ts
    │   ├── routes/
    │   │   └── consultaRoutes.ts
    │   └── server.ts
    │
    └── config/               # Configuración e IoC
        └── container.ts
```

## Flujo de Datos

```
┌─────────────────────────────────────────────────────────────┐
│                         EXTERIOR                             │
│  (HTTP Request, CLI, GraphQL, Message Queue, etc.)          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              ADAPTADOR DE ENTRADA (Driving)                  │
│  Controller / CLI Handler / GraphQL Resolver                │
│  - Mapea request a entidad de dominio                       │
│  - Invoca Use Case                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  CAPA DE APLICACIÓN                          │
│  Use Cases                                                   │
│  - Validaciones de entrada                                  │
│  - Orquestación de entidades                                │
│  - Transacciones                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE DOMINIO                           │
│  Entities + Ports (Interfaces)                              │
│  - Lógica de negocio pura                                   │
│  - Define contratos (interfaces)                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              ADAPTADOR DE SALIDA (Driven)                    │
│  Repository / External API / Message Publisher              │
│  - Implementa interfaces del dominio                        │
│  - Persiste datos, llama APIs, etc.                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                         EXTERIOR                             │
│  (Database, External APIs, File System, etc.)               │
└─────────────────────────────────────────────────────────────┘
```

## Ventajas de la Arquitectura Hexagonal

### 1. **Independencia de Frameworks**
El dominio no depende de Express, NestJS, etc. Puedes cambiar el framework sin afectar la lógica de negocio.

```typescript
// Fácil de cambiar de Express a Fastify
// Solo cambias el adaptador HTTP, el dominio sigue igual
```

### 2. **Independencia de Base de Datos**
Puedes cambiar de PostgreSQL a MongoDB sin modificar el dominio.

```typescript
// En container.ts
// De:
this.repository = new InMemoryConsultaRepository();

// A:
this.repository = new PostgreSQLConsultaRepository();

// El dominio y use cases no cambian
```

### 3. **Testabilidad**
Puedes testear el dominio y use cases sin bases de datos ni HTTP.

```typescript
describe('AgregarConsultaUseCase', () => {
  it('debe agregar consulta correctamente', async () => {
    // Mock del repositorio
    const mockRepo: IConsultaRepository = {
      guardar: jest.fn().mockResolvedValue(consulta),
      // ...
    };

    const useCase = new AgregarConsultaUseCase(mockRepo);
    const result = await useCase.execute(consulta);

    expect(mockRepo.guardar).toHaveBeenCalled();
    expect(result).toEqual(consulta);
  });
});
```

### 4. **Mantenibilidad**
Código organizado por conceptos de negocio, no por tecnología.

### 5. **Evolución Gradual**
Puedes empezar con InMemory y luego migrar a PostgreSQL sin cambiar el dominio.

### 6. **Regla de Dependencia**
Las dependencias apuntan hacia adentro (hacia el dominio), nunca hacia afuera.

```
Infrastructure → Application → Domain
     ↓              ↓             ↑
   Depende      Depende      No depende
     de           de         de nadie
```

## Principios SOLID Aplicados

### 1. **S - Single Responsibility**
Cada clase tiene una única responsabilidad:
- `ConsultaIncidente`: Representa una consulta
- `AgregarConsultaUseCase`: Agregar consultas
- `InMemoryConsultaRepository`: Persistencia en memoria

### 2. **O - Open/Closed**
Abierto para extensión, cerrado para modificación:
```typescript
// Puedes agregar nuevo repositorio sin modificar el use case
class RedisConsultaRepository implements IConsultaRepository {
  // Nueva implementación
}
```

### 3. **L - Liskov Substitution**
Puedes sustituir implementaciones sin romper el código:
```typescript
// Cualquier IConsultaRepository funciona
const useCase = new AgregarConsultaUseCase(inMemoryRepo);
const useCase = new AgregarConsultaUseCase(postgresRepo);
```

### 4. **I - Interface Segregation**
Interfaces específicas en lugar de generales:
```typescript
// Bien: Interfaces pequeñas y específicas
interface IConsultaReader {
  obtenerPorId(id: string): Promise<ConsultaIncidente | null>;
}

interface IConsultaWriter {
  guardar(consulta: ConsultaIncidente): Promise<ConsultaIncidente>;
}
```

### 5. **D - Dependency Inversion**
Depende de abstracciones (interfaces), no de implementaciones concretas:
```typescript
// Use case depende de la interfaz, no de la implementación
class AgregarConsultaUseCase {
  constructor(
    private readonly repository: IConsultaRepository // Interface
  ) {}
}
```

## Ejemplo Completo: Flujo de una Request

### 1. Request HTTP llega
```http
POST /consultas
Content-Type: application/json

{
  "id": "123",
  "textoConsulta": "me pasé un semáforo",
  "usuarioId": "user1",
  ...
}
```

### 2. Controller (Adaptador de Entrada)
```typescript
// ConsultaController.ts
agregarConsulta = async (req: Request, res: Response) => {
  // Mapear DTO a entidad de dominio
  const consulta = new ConsultaIncidente(
    req.body.id,
    req.body.textoConsulta,
    // ...
  );

  // Invocar use case
  const result = await this.agregarConsultaUseCase.execute(consulta);

  res.status(201).json(result);
};
```

### 3. Use Case (Aplicación)
```typescript
// AgregarConsultaUseCase.ts
async execute(consulta: ConsultaIncidente) {
  // Validaciones
  if (!consulta.textoConsulta) {
    throw new Error('Texto requerido');
  }

  // Delegar al repositorio (puerto)
  return await this.consultaRepository.guardar(consulta);
}
```

### 4. Repository (Adaptador de Salida)
```typescript
// InMemoryConsultaRepository.ts
async guardar(consulta: ConsultaIncidente) {
  this.consultas.push(consulta);
  return consulta;
}
```

### 5. Response
```json
{
  "id": "123",
  "textoConsulta": "me pasé un semáforo",
  "usuarioId": "user1",
  ...
}
```

## Comparación: Antes vs Después

### ❌ Antes (Sin Arquitectura Hexagonal)
```typescript
// index.ts - Todo mezclado
app.post('/consultas', async (req, res) => {
  try {
    const consultas = []; // Lógica de persistencia
    consultas.push(req.body); // Directamente del request

    res.status(201).json(req.body);
  } catch (error) {
    res.status(500).json({ error });
  }
});
```

**Problemas:**
- Lógica de negocio mezclada con HTTP
- Difícil de testear
- No se puede cambiar base de datos fácilmente
- No hay separación de responsabilidades

### ✅ Después (Con Arquitectura Hexagonal)
```typescript
// domain/entities/ConsultaIncidente.ts
export class ConsultaIncidente {
  constructor(public readonly id: string, ...) {}
  asignarCluster(cluster: string): ConsultaIncidente { ... }
}

// domain/ports/IConsultaRepository.ts
export interface IConsultaRepository {
  guardar(consulta: ConsultaIncidente): Promise<ConsultaIncidente>;
}

// application/usecases/AgregarConsultaUseCase.ts
export class AgregarConsultaUseCase {
  constructor(private repository: IConsultaRepository) {}
  async execute(consulta: ConsultaIncidente) { ... }
}

// infrastructure/adapters/InMemoryConsultaRepository.ts
export class InMemoryConsultaRepository implements IConsultaRepository {
  async guardar(consulta: ConsultaIncidente) { ... }
}

// infrastructure/http/controllers/ConsultaController.ts
export class ConsultaController {
  constructor(private useCase: AgregarConsultaUseCase) {}
  agregarConsulta = async (req, res) => { ... }
}
```

**Beneficios:**
- ✅ Separación clara de responsabilidades
- ✅ Fácil de testear cada capa
- ✅ Fácil cambiar tecnologías
- ✅ Código más mantenible

## Próximos Pasos

Todos los microservicios de LexIA 2.0 seguirán esta arquitectura:

1. ✅ **OLAP Cube** - Implementado con arquitectura hexagonal
2. 🔄 **Clustering ML** - En proceso
3. ⏳ **Auth** - Pendiente
4. ⏳ **NLP** - Pendiente
5. ⏳ **Search** - Pendiente
6. ⏳ **Recommendations** - Pendiente
7. ⏳ **Explanation** - Pendiente
8. ⏳ **Geo Assistance** - Pendiente

## Referencias

- [Alistair Cockburn - Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [Clean Architecture - Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [DDD - Domain-Driven Design](https://martinfowler.com/tags/domain%20driven%20design.html)
