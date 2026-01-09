# 🧪 Cómo Probar la Integración de Ollama

**Fecha:** 2025-12-04
**Objetivo:** Verificar que llama3.2:3b responde correctamente y se integra con el RAG

---

## 🚀 Método 1: Script Automático

### Windows:
```bash
cd microservices/chat
test-ollama-integration.bat
```

### Linux/Mac:
```bash
cd microservices/chat
chmod +x test-ollama-integration.sh
./test-ollama-integration.sh
```

---

## 🔍 Método 2: Pruebas Manuales desde la App

### TEST 1: Pregunta General (Solo Ollama)

**Pregunta:** `"¿Por qué debo detenerme en un alto?"`

**Qué verificar:**
- ✅ La respuesta **NO debe tener emojis** (🚗, 📋, ⭐, etc.)
- ✅ Debe ser conversacional y natural
- ✅ Puede mencionar artículos de ley, pero de forma natural
- ✅ NO debe buscar en el RAG (artículos vacíos o irrelevantes)

**Logs esperados:**
```
🤖 Tipo de pregunta: general
🤖 Llamando a llama3.2:3b (general)...
✅ Respuesta de llama3.2:3b generada (XXX caracteres)
```

---

### TEST 2: Situación Legal (Ollama + RAG)

**Pregunta:** `"me chocaron y el wey se fue"`

**Qué verificar:**
- ✅ Respuesta **sin emojis**
- ✅ Debe incluir **artículos del RAG** sobre fuga (Artículo 112)
- ✅ Cluster detectado: `"accidente"` o `"fuga"`
- ✅ Pasos accionables numerados
- ✅ Menciona llamar al 911, presentar denuncia

**Logs esperados:**
```
🤖 Tipo de pregunta: urgente
🎯 Detección: tema=accidente, confianza=XX%
📚 Contexto RAG (accidente) preview:
[Fuente: Vehículos - Artículo 112 - Fuga del lugar...]
🤖 Llamando a llama3.2:3b (urgente)...
✅ Respuesta de llama3.2:3b generada (XXX caracteres)
```

**JSON esperado:**
```json
{
  "mensaje": "Javi, entiendo que te chocaron y el conductor se fue...\n\n1. Llama al 911...",
  "articulos": [
    {"titulo": "Artículo 112 - Fuga del lugar...", "similitud": 0.XX}
  ],
  "cluster": "accidente",
  "profesionistas": [...]  // Solo aquí, NO en mensaje
}
```

---

### TEST 3: Profesionistas Solo en Cards

**Pregunta:** `"me detuvieron por exceso de velocidad"`

**Qué verificar:**
- ✅ El campo `mensaje` **NO debe incluir** texto como:
  - ❌ "Si necesitas más ayuda especializada..."
  - ❌ "Profesionistas especializados en..."
  - ❌ "**1. Carlos** ⭐⭐⭐⭐⭐"
- ✅ El array `profesionistas` **SÍ debe tener** las cards:
  ```json
  "profesionistas": [
    {"id": "...", "nombre": "Carlos", "rating": 4.8, ...},
    {"id": "...", "nombre": "María", "rating": 4.6, ...}
  ]
  ```

**Antes (MALO):**
```json
{
  "mensaje": "...\n\nSi necesitas más ayuda, te recomiendo:\n\n👨‍⚖️ Profesionistas:\n**1. Carlos** ⭐⭐⭐⭐⭐...",
  "profesionistas": [{"nombre": "Carlos", ...}]
}
```

**Ahora (BUENO):**
```json
{
  "mensaje": "Javi, sobre tu multa por exceso de velocidad...\n\n1. Paga en 15 días (50% desc)...",
  "profesionistas": [{"nombre": "Carlos", ...}]
}
```

---

### TEST 4: Off-Topic

**Pregunta:** `"sabes cuando sale el nuevo call of duty"`

**Qué verificar:**
- ✅ Cluster: `"off_topic"`
- ✅ Respuesta explica que es un asistente de tránsito
- ✅ NO busca en el RAG

**Logs esperados:**
```
🎯 Detección: tema=off_topic, confianza=XX%, offTopic=true
```

---

## 📊 Verificar Logs en Tiempo Real

Mientras pruebas en la app, ejecuta en otra terminal:

```bash
docker logs -f lexia-chat | grep -E "🤖|✅|🎯|📚"
```

**Logs que debes ver:**

1. **Clasificación de pregunta:**
   ```
   🤖 Tipo de pregunta: general
   ```

2. **Llamada a Ollama:**
   ```
   🤖 Llamando a llama3.2:3b (general)...
   ```

3. **Respuesta generada:**
   ```
   ✅ Respuesta de llama3.2:3b generada (234 caracteres)
   ```

4. **Contexto RAG (si aplica):**
   ```
   📚 Contexto RAG (accidente) preview:
   [Fuente: Vehículos - Artículo 112...]
   ```

5. **Detección de tema:**
   ```
   🎯 Detección: tema=accidente, confianza=85.0%, offTopic=false
   ```

---

## ❌ Errores Comunes

### Error 1: No llama a Ollama
**Síntoma:** No aparece `🤖 Llamando a llama3.2:3b`

**Causa:** El código viejo está en ejecución

**Solución:**
```bash
docker-compose build chat
docker-compose up -d chat
```

### Error 2: Timeout de Ollama
**Síntoma:** `❌ Error al llamar a Ollama: timeout`

**Causa:** llama3.2:3b tarda más de 8 segundos

**Solución:** Ya está configurado timeout de 8000ms en línea 151 de OllamaResponseGenerator.ts

### Error 3: Sigue mostrando profesionistas en texto
**Síntoma:** El mensaje incluye "Profesionistas especializados..."

**Causa:** El código no se recompiló

**Solución:** Rebuild del servicio

---

## ✅ Checklist de Verificación

Marca cada item después de probarlo:

- [ ] **TEST 1:** Pregunta general sin emojis ✓
- [ ] **TEST 2:** Situación legal con artículos RAG ✓
- [ ] **TEST 3:** Profesionistas solo en cards ✓
- [ ] **TEST 4:** Off-topic detectado correctamente ✓
- [ ] **LOGS:** Se ve `🤖 Llamando a llama3.2:3b` ✓
- [ ] **LOGS:** Se ve `✅ Respuesta de llama3.2:3b generada` ✓
- [ ] **LOGS:** Se ve `📚 Contexto RAG` cuando aplica ✓

---

## 🎯 Casos de Prueba Completos

### Caso 1: Pregunta General
```
Input: "¿cuándo debo usar cinturón de seguridad?"
Tipo esperado: general
RAG: No necesario
Emojis: NO
Respuesta: Explicación conversacional sobre uso de cinturón
```

### Caso 2: Situación Urgente
```
Input: "me chocaron y hay una persona herida sangrando"
Tipo esperado: urgente
RAG: Artículos sobre accidentes con lesionados
Emojis: NO
Respuesta: Prioridad 911, pasos de emergencia
```

### Caso 3: Situación Legal Normal
```
Input: "me pasé un semáforo en rojo y me multaron"
Tipo esperado: legal
RAG: Artículos sobre infracciones de semáforo
Emojis: NO
Respuesta: Pasos para pagar/impugnar multa
```

### Caso 4: Off-Topic
```
Input: "qué recomiendas para cenar hoy"
Tipo esperado: N/A (off-topic)
Cluster: off_topic
Emojis: NO
Respuesta: Explicación de que es asistente de tránsito
```

---

## 🔧 Troubleshooting

Si algo no funciona:

1. **Verifica que Docker esté corriendo:**
   ```bash
   docker ps | grep chat
   ```

2. **Verifica que Ollama esté activo:**
   ```bash
   docker ps | grep ollama
   docker logs ollama --tail 20
   ```

3. **Verifica que llama3.2:3b esté descargado:**
   ```bash
   docker exec -it ollama ollama list
   ```
   Debe aparecer `llama3.2:3b`

4. **Rebuild completo si nada funciona:**
   ```bash
   docker-compose down
   docker-compose build chat
   docker-compose up -d
   ```

---

**¿Listo para probar?** Inicia Docker y ejecuta el script o prueba directamente en tu app.
