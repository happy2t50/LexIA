# 🐳 Cómo Iniciar LexIA 2.0 con Docker

## ⚠️ IMPORTANTE: Primero Iniciar Docker Desktop

### Paso 1: Abrir Docker Desktop

1. Busca "Docker Desktop" en el menú de inicio de Windows
2. Haz clic para abrir
3. **Espera a que aparezca** el ícono de Docker en la barra de tareas (esquina inferior derecha)
4. El ícono debe estar **verde** o **blanco** (no rojo)

![Docker Desktop Icon](https://docs.docker.com/desktop/images/whale-in-menu-bar.png)

### Paso 2: Verificar que Docker está corriendo

Abre PowerShell o CMD y ejecuta:
```bash
docker --version
```

Deberías ver algo como:
```
Docker version 24.0.x, build xxxxx
```

Si ves un error, Docker Desktop no está corriendo correctamente.

---

## 🚀 Una vez Docker Desktop esté corriendo:

### Opción 1: Usar Script Automático (Recomendado)

Abre PowerShell en la carpeta del proyecto:
```powershell
cd C:\Users\umina\OneDrive\Escritorio\LexIA2.0
.\docker-test.ps1
```

Este script automáticamente:
- ✅ Construye todas las imágenes
- ✅ Inicia todos los contenedores
- ✅ Espera a que PostgreSQL esté listo
- ✅ Verifica que todos los servicios funcionen
- ✅ Ejecuta pruebas completas

**Tiempo estimado:** 10-15 minutos la primera vez

---

### Opción 2: Paso a Paso Manual

#### 1. Construir las imágenes Docker (primera vez solamente):
```bash
cd C:\Users\umina\OneDrive\Escritorio\LexIA2.0
docker-compose build
```

⏱️ Esto tardará **5-10 minutos** la primera vez.

Verás algo como:
```
[+] Building 234.5s (42/42) FINISHED
 => [auth internal] load build definition
 => [olap-cube internal] load build definition
 ...
```

#### 2. Iniciar los contenedores:
```bash
docker-compose up -d
```

El flag `-d` significa "detached" (en segundo plano).

Deberías ver:
```
[+] Running 7/7
 ✔ Container lexia-postgres    Started
 ✔ Container lexia-auth         Started
 ✔ Container lexia-olap         Started
 ✔ Container lexia-clustering   Started
 ✔ Container lexia-nlp          Started
 ✔ Container lexia-rag          Started
 ✔ Container lexia-chat         Started
```

#### 3. Verificar que todos los contenedores están corriendo:
```bash
docker-compose ps
```

Deberías ver 7 contenedores con estado "Up":
```
NAME                COMMAND                  SERVICE      STATUS
lexia-auth          "docker-entrypoint.s…"   auth         Up
lexia-chat          "docker-entrypoint.s…"   chat         Up
lexia-clustering    "docker-entrypoint.s…"   clustering   Up
lexia-nlp           "docker-entrypoint.s…"   nlp          Up
lexia-olap          "docker-entrypoint.s…"   olap-cube    Up
lexia-postgres      "docker-entrypoint.s…"   postgres     Up (healthy)
lexia-rag           "docker-entrypoint.s…"   rag          Up
```

#### 4. Ver logs en tiempo real:
```bash
# Todos los servicios
docker-compose logs -f

# Solo el chat
docker-compose logs -f chat

# Solo RAG (para ver cuando termine de descargar el modelo)
docker-compose logs -f rag
```

**Presiona Ctrl+C para salir de los logs** (los contenedores siguen corriendo).

#### 5. Esperar a que RAG descargue el modelo (primera vez):

Busca en los logs de RAG:
```bash
docker-compose logs -f rag
```

Espera hasta ver:
```
✅ Modelo de embeddings cargado exitosamente: Xenova/all-MiniLM-L6-v2
```

Esto puede tardar **2-3 minutos** la primera vez.

#### 6. Probar que todo funciona:

```bash
# Health check del chat
curl http://localhost:3010/health
```

Deberías ver:
```json
{
  "status": "OK",
  "service": "Chat Service",
  "database": "Connected"
}
```

---

## 🧪 Pruebas Completas

### Test 1: Iniciar sesión
```bash
curl -X POST http://localhost:3010/session/start -H "Content-Type: application/json" -d "{\"usuarioId\": \"test\", \"nombre\": \"Usuario Test\"}"
```

### Test 2: Enviar mensaje
Usa el `sessionId` del test anterior:
```bash
curl -X POST http://localhost:3010/message -H "Content-Type: application/json" -d "{\"sessionId\": \"PEGA_SESSION_ID_AQUI\", \"usuarioId\": \"test\", \"nombre\": \"Test\", \"mensaje\": \"me multaron por estacionarme mal\"}"
```

---

## 🛑 Detener el Sistema

### Detener pero mantener datos:
```bash
docker-compose stop
```

### Detener y eliminar contenedores (datos persisten):
```bash
docker-compose down
```

### Detener y BORRAR TODO (⚠️ incluyendo base de datos):
```bash
docker-compose down -v
```

---

## 🔄 Próximas Veces

Una vez que ya construiste las imágenes, solo necesitas:

```bash
# Iniciar
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

---

## 🆘 Problemas Comunes

### "Docker daemon is not running"
→ Abre Docker Desktop y espera a que inicie completamente

### "Port is already allocated"
→ Otro servicio está usando el puerto. Detén lo que esté en 3001-3010 o 5432

### "Cannot connect to database"
→ Espera 30 segundos más y vuelve a intentar

### "Out of memory"
→ Docker Desktop > Settings > Resources > Memory > Aumentar a 8GB

---

## 📊 Servicios y Puertos

Una vez todo esté corriendo:

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| **Chat** | 3010 | **Punto de entrada principal** |
| RAG | 3009 | Búsqueda semántica |
| NLP | 3004 | Análisis de sentimiento |
| Auth | 3003 | Autenticación |
| Clustering | 3002 | Clasificación K-means |
| OLAP | 3001 | Analytics |
| PostgreSQL | 5432 | Base de datos |

**URL principal:** http://localhost:3010

---

## ✅ Checklist

Antes de comenzar:
- [ ] Docker Desktop instalado
- [ ] Docker Desktop está **corriendo** (ícono en barra de tareas)
- [ ] PowerShell abierto en la carpeta del proyecto

Durante el inicio:
- [ ] `docker-compose build` completado sin errores
- [ ] `docker-compose up -d` ejecutado
- [ ] `docker-compose ps` muestra 7 contenedores "Up"
- [ ] Esperaste a que RAG descargue el modelo
- [ ] `curl http://localhost:3010/health` responde OK

¡Listo para usar!
- [ ] Test de sesión funciona
- [ ] Test de mensaje funciona

---

**¡Sistema Docker listo! 🎉**

Ver [DOCKER_GUIDE.md](./DOCKER_GUIDE.md) para más detalles.
