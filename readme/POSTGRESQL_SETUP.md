# Configuración de PostgreSQL para LexIA 2.0

## 📋 Requisitos Previos

- PostgreSQL 14+ instalado
- Node.js 18+
- npm o yarn

## 🚀 Instalación de PostgreSQL

### Windows

```bash
# Descargar desde: https://www.postgresql.org/download/windows/
# O usar Chocolatey:
choco install postgresql

# Verificar instalación
psql --version
```

### macOS

```bash
# Homebrew
brew install postgresql@14

# Iniciar servicio
brew services start postgresql@14
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

# Iniciar servicio
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## 🔧 Configuración Inicial

### 1. Crear Base de Datos

```bash
# Conectarse a PostgreSQL como superusuario
psql -U postgres

# Dentro de psql:
CREATE DATABASE lexia_db;

# Crear usuario (opcional)
CREATE USER lexia_user WITH ENCRYPTED PASSWORD 'tu_password_segura';

# Otorgar permisos
GRANT ALL PRIVILEGES ON DATABASE lexia_db TO lexia_user;

# Salir
\q
```

### 2. Ejecutar Migraciones

```bash
# Conectarse a la base de datos
psql -U postgres -d lexia_db

# Ejecutar script de migración
\i database/migrations/001_create_tables.sql

# O desde la terminal:
psql -U postgres -d lexia_db -f database/migrations/001_create_tables.sql
```

### 3. Verificar Tablas Creadas

```sql
-- En psql
\dt

-- Ver estructura de una tabla
\d consultas

-- Verificar datos iniciales
SELECT * FROM roles;
SELECT * FROM categorias;
```

## ⚙️ Configuración de Variables de Entorno

Crear archivo `.env` en cada microservicio:

```env
# Configuración de PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lexia_db
DB_USER=postgres
DB_PASSWORD=tu_password

# Pool de conexiones
DB_POOL_MAX=20

# Otros...
PORT=3001
NODE_ENV=development
```

## 🏗️ Arquitectura de Base de Datos

### Tablas Principales

| Tabla | Descripción | Relaciones |
|-------|-------------|------------|
| `usuarios` | Usuarios base del sistema | FK a `roles` |
| `abogados` | Perfil de abogados | FK a `usuarios` (1:1) |
| `negocios` | Perfil de anunciantes | FK a `usuarios` (1:1) |
| `consultas` | Consultas OLAP (ML) | FK a `usuarios`, `categorias` |
| `contenido_legal` | Artículos legales | - |
| `multas` | Multas de tránsito | FK a `contenido_legal` |
| `recomendaciones_abogados` | Recomendaciones ML | FK a `consultas`, `usuarios` |
| `recomendaciones_negocios` | Recomendaciones ML | FK a `consultas`, `usuarios` |
| `foro_publicaciones` | Publicaciones del foro | FK a `usuarios`, `categorias` |
| `foro_comentarios` | Comentarios del foro | FK a `foro_publicaciones`, `usuarios` |
| `mensajes_privados` | Mensajería | FK a `usuarios` (x2) |
| `suscripciones` | Suscripciones de pago | FK a `usuarios` |

### Esquema ER (Entidad-Relación)

```
┌─────────┐
│  roles  │
└────┬────┘
     │
     │ 1:N
     ▼
┌──────────┐         1:1        ┌──────────┐
│ usuarios ├────────────────────┤ abogados │
└─────┬────┘                    └──────────┘
      │
      │ 1:1
      ├────────────────────────┐
      │                        │
      ▼                        ▼
┌──────────┐            ┌────────────┐
│ negocios │            │ consultas  │ ← TABLA PRINCIPAL PARA ML
└──────────┘            └─────┬──────┘
                              │
                              │ 1:N
                              ▼
                   ┌─────────────────────────┐
                   │  recomendaciones_*      │
                   └─────────────────────────┘
```

## 📦 Instalación de Dependencias

### Shared Database Package

```bash
cd shared/database
npm install
npm run build
```

### En cada Microservicio

```bash
cd microservices/[nombre-servicio]

# Instalar dependencias (ya incluye pg)
npm install

# Agregar el paquete compartido (opcional)
npm install ../../shared/database
```

## 🔌 Uso en los Microservicios

### Configuración del Container (Dependency Injection)

```typescript
// src/infrastructure/config/container.ts
import { Pool } from 'pg';
import { DatabaseConnection, getDatabaseConfigFromEnv } from '@lexia/database';
import { PostgreSQLUserRepository } from '../adapters/PostgreSQLUserRepository';
import { InMemoryUserRepository } from '../adapters/InMemoryUserRepository';

export class Container {
  public readonly userRepository: IUserRepository;
  private pool: Pool;

  constructor() {
    // Inicializar pool de PostgreSQL
    const dbConfig = getDatabaseConfigFromEnv();
    this.pool = DatabaseConnection.initialize(dbConfig);

    // Usar repositorio PostgreSQL (o InMemory para desarrollo)
    const usePostgreSQL = process.env.USE_POSTGRESQL === 'true';

    if (usePostgreSQL) {
      this.userRepository = new PostgreSQLUserRepository(this.pool);
      console.log('📊 Usando PostgreSQL');
    } else {
      this.userRepository = new InMemoryUserRepository();
      console.log('💾 Usando InMemory (desarrollo)');
    }
  }
}
```

### Cambiar entre InMemory y PostgreSQL

En `.env`:

```env
# Usar PostgreSQL
USE_POSTGRESQL=true

# Usar InMemory (desarrollo/testing)
USE_POSTGRESQL=false
```

## 🧪 Testing

### Health Check de la Base de Datos

```typescript
// En el endpoint de health
app.get('/health', async (req, res) => {
  const dbHealthy = await DatabaseConnection.healthCheck();

  res.json({
    status: dbHealthy ? 'OK' : 'ERROR',
    database: dbHealthy ? 'Connected' : 'Disconnected',
    service: 'Auth Service'
  });
});
```

### Script de Health Check

```bash
# Verificar conexión
npm run db:health

# O manualmente
curl http://localhost:3001/health
```

## 📊 Consultas OLAP Comunes

### 1. Consultas por Ciudad

```sql
SELECT ciudad, COUNT(*) as total
FROM consultas
GROUP BY ciudad
ORDER BY total DESC;
```

### 2. Consultas por Cluster (ML)

```sql
SELECT cluster_asignado, COUNT(*) as total, AVG(confianza_cluster) as confianza_promedio
FROM consultas
WHERE cluster_asignado IS NOT NULL
GROUP BY cluster_asignado;
```

### 3. Tendencias por Fecha

```sql
SELECT DATE(fecha_consulta) as fecha, COUNT(*) as total
FROM consultas
WHERE fecha_consulta >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(fecha_consulta)
ORDER BY fecha;
```

### 4. Abogados Más Recomendados

```sql
SELECT u.nombre, u.email, COUNT(*) as total_recomendaciones
FROM recomendaciones_abogados ra
JOIN usuarios u ON ra.abogado_id = u.id
GROUP BY u.id, u.nombre, u.email
ORDER BY total_recomendaciones DESC
LIMIT 10;
```

### 5. Dataset para Entrenamiento ML

```sql
SELECT
  id,
  texto_original,
  ciudad,
  tipo_usuario,
  cluster_asignado,
  gravedad_estimada,
  fecha_consulta
FROM consultas
WHERE cluster_asignado IS NOT NULL
ORDER BY fecha_consulta DESC
LIMIT 10000;
```

## 🔄 Migraciones Futuras

Para agregar nuevas tablas o modificar existentes:

```bash
# Crear nueva migración
touch database/migrations/002_add_new_table.sql
```

Ejemplo de migración:

```sql
-- database/migrations/002_add_ratings.sql

CREATE TABLE IF NOT EXISTS calificaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL,
  abogado_id UUID NOT NULL,
  puntuacion INT CHECK (puntuacion >= 1 AND puntuacion <= 5),
  comentario TEXT,
  fecha TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_cal_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_cal_abogado FOREIGN KEY (abogado_id) REFERENCES usuarios(id)
);

CREATE INDEX idx_calificaciones_abogado ON calificaciones(abogado_id);
```

## 🔒 Seguridad

### 1. Conexiones Seguras

```env
# Usar SSL en producción
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
```

### 2. Pool de Conexiones

```typescript
const pool = new Pool({
  max: 20, // máximo de conexiones
  idleTimeoutMillis: 30000, // cerrar conexiones inactivas
  connectionTimeoutMillis: 2000, // timeout de conexión
});
```

### 3. Prepared Statements

```typescript
// ✅ BUENO: Protegido contra SQL Injection
const result = await pool.query(
  'SELECT * FROM usuarios WHERE email = $1',
  [userEmail]
);

// ❌ MALO: Vulnerable a SQL Injection
const result = await pool.query(
  `SELECT * FROM usuarios WHERE email = '${userEmail}'`
);
```

## 📈 Optimización

### Índices Importantes

Ya creados en la migración:

- `idx_usuarios_email` - Búsqueda por email
- `idx_consultas_cluster` - Filtrado por cluster ML
- `idx_consultas_ciudad` - Consultas OLAP por ciudad
- `idx_abogados_especialidades` - GIN index para arrays

### Análisis de Queries

```sql
-- Ver plan de ejecución
EXPLAIN ANALYZE
SELECT * FROM consultas WHERE cluster_asignado = 'C1';

-- Estadísticas de tablas
SELECT * FROM pg_stat_user_tables WHERE relname = 'consultas';
```

### Vacuum y Mantenimiento

```sql
-- Limpiar y analizar
VACUUM ANALYZE consultas;

-- Auto-vacuum (configuración en postgresql.conf)
autovacuum = on
```

## 🐳 Docker (Opcional)

```yaml
# docker-compose.yml (fragmento)
postgres:
  image: postgres:14
  environment:
    POSTGRES_DB: lexia_db
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: password
  ports:
    - "5432:5432"
  volumes:
    - postgres-data:/var/lib/postgresql/data
    - ./database/migrations:/docker-entrypoint-initdb.d

volumes:
  postgres-data:
```

## 🚨 Troubleshooting

### Problema: No se puede conectar a PostgreSQL

```bash
# Verificar que PostgreSQL está corriendo
sudo systemctl status postgresql  # Linux
brew services list  # macOS

# Verificar puerto
sudo lsof -i :5432  # Linux/macOS
netstat -an | findstr 5432  # Windows
```

### Problema: Error de permisos

```sql
-- Otorgar permisos completos
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO lexia_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO lexia_user;
```

### Problema: Demasiadas conexiones

```sql
-- Ver conexiones actuales
SELECT count(*) FROM pg_stat_activity;

-- Aumentar max_connections en postgresql.conf
max_connections = 100
```

## 📚 Recursos

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [node-postgres (pg)](https://node-postgres.com/)
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)

## ✅ Checklist de Configuración

- [ ] PostgreSQL instalado y corriendo
- [ ] Base de datos `lexia_db` creada
- [ ] Migraciones ejecutadas correctamente
- [ ] Variables de entorno configuradas
- [ ] Paquete `pg` instalado en microservicios
- [ ] Adaptadores PostgreSQL creados
- [ ] Container configurado para usar PostgreSQL
- [ ] Health check funcionando
- [ ] Datos de prueba insertados (roles, categorías)

---

**¡PostgreSQL está listo para usar con LexIA 2.0!** 🚀
