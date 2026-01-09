# Ollama Preprocessor - Normalización de Lenguaje Coloquial

Servicio de normalización de texto usando Ollama/Llama3 para convertir lenguaje coloquial mexicano/chiapaneco en términos legales formales.

## 🎯 Propósito

Este servicio actúa como **preprocesador inteligente** que:

1. ✅ Detecta frases coloquiales no cubiertas por el diccionario NLP
2. ✅ Normaliza a lenguaje legal formal usando Llama3
3. ✅ Extrae entidades y temas de manera contextual
4. ✅ Mejora la precisión del sistema de clustering y RAG

## 🏗️ Arquitectura

```
Usuario: "hey destruí un alumbrado público"
    ↓
[NLP Service] Detecta que necesita normalización
    ↓
[Ollama Preprocessor] Normaliza con Llama3
    ↓
Output: "daño a propiedad pública - alumbrado público"
    ↓
[Clustering → RAG → Smart Response]
```

## 📋 Requisitos de Hardware

### Opción 1: t3a.small (Recomendado - Presupuesto bajo)
- **RAM:** 2 GB
- **vCPU:** 2
- **Modelo:** Llama3.2-1B (Q4)
- **Latencia:** 5-10s por consulta
- **Costo:** ~$15/mes
- **Ideal para:** 50-100 consultas/día

### Opción 2: t3a.medium (Mejor rendimiento)
- **RAM:** 4 GB
- **vCPU:** 2
- **Modelo:** Llama3.2-3B (Q4)
- **Latencia:** 2-5s por consulta
- **Costo:** ~$30/mes
- **Ideal para:** 200-500 consultas/día

### Opción 3: t3.medium (Producción)
- **RAM:** 4 GB
- **vCPU:** 2 (mejor CPU que t3a)
- **Modelo:** Llama3.2-3B (Q4)
- **Latencia:** 1-3s por consulta
- **Costo:** ~$35/mes
- **Ideal para:** 500+ consultas/día

## 🚀 Deployment en AWS EC2

### Paso 1: Crear instancia EC2

```bash
# Configuración recomendada:
# - AMI: Ubuntu 22.04 LTS
# - Tipo: t3a.small o t3a.medium
# - Storage: 20 GB gp3
# - Security Group: Puertos 22, 3005, 11434
```

### Paso 2: Instalar Docker

```bash
# Conectar por SSH
ssh -i tu-llave.pem ubuntu@tu-ip-publica

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Reiniciar sesión para aplicar permisos
exit
ssh -i tu-llave.pem ubuntu@tu-ip-publica
```

### Paso 3: Clonar repositorio y configurar

```bash
# Clonar repo
git clone https://github.com/tu-usuario/LexIA2.0.git
cd LexIA2.0/microservices/IA

# Configurar variables de entorno
cd ollama-preprocessor
cp .env.example .env
nano .env

# Editar:
# PORT=3005
# OLLAMA_URL=http://ollama:11434
# OLLAMA_MODEL=llama3.2:1b  # o llama3.2:3b si tienes t3a.medium
```

### Paso 4: Iniciar servicios

```bash
# Volver a directorio IA
cd ..

# Iniciar Ollama + Preprocessor
docker-compose -f docker-compose.ollama.yml up -d

# Ver logs
docker-compose -f docker-compose.ollama.yml logs -f
```

### Paso 5: Descargar modelo Ollama

```bash
# Esperar a que Ollama esté listo (30-60 segundos)
docker exec -it lexia-ollama ollama pull llama3.2:1b

# Si usas t3a.medium, puedes usar el modelo 3B:
# docker exec -it lexia-ollama ollama pull llama3.2:3b
```

### Paso 6: Verificar funcionamiento

```bash
# Health check Ollama
curl http://localhost:11434/api/tags

# Health check Preprocessor
curl http://localhost:3005/health

# Test de normalización
curl -X POST http://localhost:3005/normalize \
  -H "Content-Type: application/json" \
  -d '{"texto": "hey destruí un alumbrado público"}'

# Respuesta esperada:
# {
#   "textoOriginal": "hey destruí un alumbrado público",
#   "textoNormalizado": "daño a propiedad pública - alumbrado público",
#   "tema": "dano_propiedad_publica",
#   "entidades": ["alumbrado público", "daño a propiedad"],
#   "palabrasClave": ["daño", "propiedad pública", "alumbrado"],
#   "confianza": 0.95,
#   "latencyMs": 3500,
#   "model": "llama3.2:1b"
# }
```

## 🔧 Configuración del NLP Service

Para que el NLP service use Ollama, actualizar `.env`:

```bash
# microservices/IA/nlp/.env
PORT=3004
OLLAMA_PREPROCESSOR_URL=http://ollama-preprocessor:3005
CLUSTERING_SERVICE_URL=http://clustering:3002
OLAP_SERVICE_URL=http://olap-cube:3001
```

Reiniciar NLP service:

```bash
docker-compose restart nlp
```

## 📊 Monitoreo de Performance

### Logs en tiempo real

```bash
# Ver logs de Ollama
docker logs -f lexia-ollama

# Ver logs de Preprocessor
docker logs -f lexia-ollama-preprocessor

# Ver logs de NLP
docker logs -f lexia-nlp
```

### Métricas de uso

```bash
# Ver uso de recursos
docker stats

# Ejemplo de salida:
# CONTAINER                  CPU %     MEM USAGE / LIMIT
# lexia-ollama              15%       1.2 GB / 2 GB
# lexia-ollama-preprocessor  2%       100 MB / 2 GB
# lexia-nlp                  1%       80 MB / 2 GB
```

## 🎛️ Configuración Avanzada

### Ajustar timeout de Ollama

Si las consultas son muy lentas, aumentar timeout en `ollama-preprocessor/src/index.ts`:

```typescript
{ timeout: 30000 } // 30 segundos (default)
// Cambiar a:
{ timeout: 60000 } // 60 segundos para instancias pequeñas
```

### Cambiar modelo según carga

```bash
# Para consultas rápidas (menos precisión):
docker exec -it lexia-ollama ollama pull phi3:mini
# Actualizar .env: OLLAMA_MODEL=phi3:mini

# Para máxima precisión (más lento):
docker exec -it lexia-ollama ollama pull llama3.2:3b
# Actualizar .env: OLLAMA_MODEL=llama3.2:3b
```

### Deshabilitar Ollama temporalmente

Si Ollama falla o es muy lento, el NLP service tiene **fallback automático** al diccionario:

```bash
# En el request al NLP, enviar:
{
  "textoConsulta": "tu texto",
  "useOllama": false  // Desactiva Ollama
}
```

## 🔥 Optimizaciones para Producción

### 1. Usar instance con swap

```bash
# Agregar 2GB de swap para instancias con poca RAM
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 2. Configurar auto-restart

Los containers ya tienen `restart: unless-stopped` en docker-compose.

### 3. Configurar Nginx como proxy

```nginx
# /etc/nginx/sites-available/lexia-ollama
upstream ollama_preprocessor {
    server localhost:3005;
}

server {
    listen 80;
    server_name ollama.tu-dominio.com;

    location / {
        proxy_pass http://ollama_preprocessor;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
```

### 4. Limitar requests concurrentes

Para evitar sobrecarga en instancias pequeñas, configurar rate limiting en Nginx:

```nginx
limit_req_zone $binary_remote_addr zone=ollama_limit:10m rate=5r/m;

location /normalize {
    limit_req zone=ollama_limit burst=3 nodelay;
    proxy_pass http://ollama_preprocessor;
}
```

## 💰 Estimación de Costos AWS

### t3a.small (Recomendado)
```
Instancia: $15.33/mes
EBS 20GB:  $2.00/mes
Total:     $17.33/mes
```

### t3a.medium
```
Instancia: $30.66/mes
EBS 20GB:  $2.00/mes
Total:     $32.66/mes
```

**Nota:** Primera instancia t2.micro o t3.micro tiene 750 horas/mes gratis por 12 meses (capa gratuita AWS).

## 🧪 Testing

### Test local (sin Docker)

```bash
cd ollama-preprocessor
npm install
npm run dev

# En otra terminal:
curl -X POST http://localhost:3005/normalize \
  -H "Content-Type: application/json" \
  -d '{"texto": "me agarraron bolo ayer"}'
```

### Test de carga

```bash
# Instalar hey (load testing)
go install github.com/rakyll/hey@latest

# 100 requests, 10 concurrentes
hey -n 100 -c 10 -m POST \
  -H "Content-Type: application/json" \
  -d '{"texto":"hey destruí un poste"}' \
  http://localhost:3005/normalize
```

## 📝 Ejemplos de Normalización

| Input Coloquial | Output Normalizado | Tema |
|----------------|-------------------|------|
| "me agarraron bolo" | "detención por conducir bajo efectos del alcohol" | alcoholimetro |
| "destruí un alumbrado" | "daño a propiedad pública - alumbrado público" | dano_propiedad_publica |
| "me chocó un man y se fue" | "accidente de tránsito con fuga del conductor" | accidente_transito |
| "me corrieron la grúa" | "remolque de vehículo por estacionamiento indebido" | estacionamiento_indebido |

## 🐛 Troubleshooting

### Ollama no arranca

```bash
# Verificar logs
docker logs lexia-ollama

# Reiniciar container
docker restart lexia-ollama

# Si sigue fallando, verificar RAM disponible
free -h
```

### Modelo no encontrado

```bash
# Listar modelos instalados
docker exec -it lexia-ollama ollama list

# Descargar modelo manualmente
docker exec -it lexia-ollama ollama pull llama3.2:1b
```

### Latencia muy alta (>30s)

1. Verificar que tienes suficiente RAM libre
2. Considerar usar modelo más pequeño (phi3:mini)
3. Agregar swap memory
4. Actualizar a instancia más grande

### Preprocessor devuelve fallback siempre

```bash
# Verificar conectividad Ollama
docker exec -it lexia-ollama-preprocessor curl http://ollama:11434/api/tags

# Verificar variable de entorno
docker exec -it lexia-ollama-preprocessor env | grep OLLAMA
```

## 📚 Referencias

- [Ollama Documentation](https://github.com/ollama/ollama)
- [Llama3.2 Model Card](https://ollama.com/library/llama3.2)
- [AWS EC2 Pricing](https://aws.amazon.com/ec2/pricing/)
- [Docker Compose Reference](https://docs.docker.com/compose/)

## 🤝 Soporte

Para problemas o preguntas sobre el deployment:
- Revisar logs: `docker-compose logs -f`
- Verificar health: `curl localhost:3005/health`
- Contactar al equipo de desarrollo
