# 🎯 Fine-Tuning del Modelo Legal de LexIA

## ⚠️ IMPORTANTE: Limitación de Ollama

**Ollama actualmente NO soporta fine-tuning nativo** (a partir de diciembre 2024).

Hay **3 opciones viables**:

---

## ✅ OPCIÓN 1: Usar Modelo Más Grande (RECOMENDADO - MÁS RÁPIDO)

En lugar de fine-tuning, usar **llama3.2:3b** que tiene mejor comprensión de contexto.

### Ventajas:
- ✅ Implementación inmediata (5 minutos)
- ✅ Mejor comprensión del contexto sin entrenar
- ✅ Puede hacer preguntas de seguimiento inteligentes

### Desventajas:
- ❌ 2x más lento que 1b
- ❌ Requiere ~4GB RAM (vs 2GB del 1b)

### Pasos:

```bash
# 1. Descargar modelo 3b
docker exec lexia-ollama ollama pull llama3.2:3b

# 2. Actualizar docker-compose.yml
# Cambiar: OLLAMA_MODEL=llama3.2:1b
# Por:     OLLAMA_MODEL=llama3.2:3b

# 3. Reiniciar servicio
docker-compose restart chat
```

---

## ✅ OPCIÓN 2: Fine-Tuning con Hugging Face + LoRA (MEJOR RESULTADO)

Fine-tune real del modelo usando **LoRA** (Low-Rank Adaptation).

### Ventajas:
- ✅ Modelo personalizado para tránsito de Chiapas
- ✅ Aprende el tono coloquial mexicano
- ✅ Entiende cuándo hacer preguntas de seguimiento
- ✅ Usa LoRA (eficiente, solo entrena ~1% de los parámetros)

### Desventajas:
- ❌ Requiere Python + GPU (o 2-3 horas en CPU)
- ❌ Configuración técnica compleja
- ❌ Tiempo de setup: 1-2 horas

### Requisitos:

```bash
pip install transformers datasets peft accelerate torch
```

### Pasos:

1. **Convertir dataset a formato Hugging Face**
2. **Ejecutar script de fine-tuning** (ver `fine-tune-llama-lora.py`)
3. **Exportar modelo a formato GGUF para Ollama**
4. **Importar a Ollama**

**Script completo disponible en**: `fine-tune-llama-lora.py`

---

## ✅ OPCIÓN 3: Prompt Engineering Avanzado (MÁS SIMPLE)

Mejorar el system prompt del modelo existente sin fine-tuning.

### Ventajas:
- ✅ No requiere entrenamiento
- ✅ Implementación inmediata
- ✅ Sin costo adicional de recursos

### Desventajas:
- ❌ Menos preciso que fine-tuning real
- ❌ El modelo 1b puede no seguir instrucciones complejas

### Implementación:

Actualizar el system prompt en `OllamaResponseGenerator.ts` para incluir:

```typescript
const SYSTEM_PROMPT = `Eres un asistente legal especializado en tránsito de Chiapas, México.

REGLA CRÍTICA: Si el usuario NO te da suficiente información, DEBES hacer una pregunta de seguimiento.

Ejemplos de información insuficiente:
- "me detuvieron" → Pregunta: "¿Por qué te detuvieron?"
- "tuve un accidente" → Pregunta: "¿Hay heridos? ¿El otro conductor se fue?"
- "me multaron" → Pregunta: "¿Por qué te multaron?"

SOLO cuando tengas TODA la información necesaria, da tu respuesta legal completa.`;
```

---

## 📊 Comparación de Opciones

| Opción | Tiempo Setup | Precisión | Recursos | Velocidad |
|--------|--------------|-----------|----------|-----------|
| **Modelo 3b** | 5 min | ⭐⭐⭐⭐ | 4GB RAM | Media |
| **Fine-tuning LoRA** | 2 horas | ⭐⭐⭐⭐⭐ | GPU/8GB+ | Rápida |
| **Prompt Engineering** | 10 min | ⭐⭐⭐ | 2GB RAM | Rápida |

---

## 🎯 Mi Recomendación

### Para producción inmediata:
**OPCIÓN 1 (Modelo 3b)** → Mejor balance tiempo/calidad

### Para mejor resultado a largo plazo:
**OPCIÓN 2 (Fine-tuning LoRA)** → Modelo perfectamente personalizado

### Para prueba rápida:
**OPCIÓN 3 (Prompt Engineering)** → Sin cambios en infraestructura

---

## 📁 Archivos Preparados

Ya he creado:
- ✅ `dataset-dialogos-legales.jsonl` - 20 ejemplos de diálogos legales
- ✅ `Modelfile` - Configuración del modelo base
- ✅ `fine-tune-instructions.md` - Guía completa
- ⏳ `fine-tune-llama-lora.py` - Script de fine-tuning (próximo paso)

---

## 🚀 Próximos Pasos

**¿Qué opción prefieres?**

1. **Cambiar a llama3.2:3b ahora** (5 minutos, resultados inmediatos)
2. **Preparar fine-tuning con LoRA** (2 horas, mejor resultado)
3. **Mejorar prompts del 1b actual** (10 minutos, sin cambios)

Dime cuál prefieres y continúo con esa opción.
