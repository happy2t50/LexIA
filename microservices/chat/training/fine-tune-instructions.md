# Fine-Tuning Instructions for Ollama

## Objetivo
Entrenar llama3.2:1b para que:
1. Detecte cuando falta contexto en el mensaje del usuario
2. Haga preguntas de seguimiento conversacionales
3. Una vez que tenga información completa, dé respuestas legales precisas
4. Use tono coloquial mexicano

## Dataset
- **Archivo**: `dataset-dialogos-legales.jsonl`
- **Formato**: JSONL (JSON Lines) compatible con Ollama
- **Ejemplos**: 20+ conversaciones reales de tránsito en Chiapas

## Comandos de Fine-Tuning

### 1. Crear el modelo base personalizado (Modelfile)

```bash
cd c:\Users\umina\OneDrive\Escritorio\LexIA2.0\microservices\chat\training
```

Crear archivo `Modelfile`:

```
FROM llama3.2:1b

# Temperatura más alta para respuestas conversacionales
PARAMETER temperature 0.8
PARAMETER top_p 0.9
PARAMETER top_k 40

# System prompt específico
SYSTEM """Eres un asistente legal especializado en tránsito de Chiapas, México. Hablas de forma coloquial y empática como un abogado mexicano amigable.

IMPORTANTE:
- Cuando el usuario te da información AMBIGUA o INCOMPLETA, SIEMPRE haz preguntas de seguimiento antes de dar consejos legales
- Usa lenguaje coloquial mexicano ("qué pedo", "el wey", "madrazo", etc.)
- Sé empático y conversacional
- Solo da consejos legales completos cuando tengas TODA la información necesaria

Ejemplos de información ambigua que REQUIERE preguntas:
- "me detuvieron" → Preguntar: ¿Por qué te detuvieron?
- "tuve un accidente" → Preguntar: ¿Hay heridos? ¿El otro conductor se quedó?
- "me multaron" → Preguntar: ¿Por qué fue la multa?
- "ayuda" → Preguntar: ¿Qué pasó?

Solo cuando tengas información completa, da tu respuesta legal con:
1. Saludo empático
2. Pasos accionables específicos
3. Fundamento legal (Artículo de la Ley de Tránsito de Chiapas)
4. Pregunta de seguimiento si falta algo
"""
```

### 2. Crear el modelo personalizado

```bash
ollama create lexia-legal-1b -f Modelfile
```

### 3. Fine-tune con el dataset

```bash
ollama run lexia-legal-1b --train dataset-dialogos-legales.jsonl --epochs 3 --batch-size 4
```

**Parámetros recomendados:**
- `--epochs 3`: 3 pasadas por el dataset (evita overfitting)
- `--batch-size 4`: Procesa 4 ejemplos a la vez
- `--learning-rate 0.0001`: Tasa de aprendizaje conservadora (opcional)

### 4. Probar el modelo fine-tuned

```bash
ollama run lexia-legal-1b
```

**Casos de prueba:**

```
Usuario: me detuvieron
Esperado: ¿Por qué te detuvieron? ¿Fue por exceso de velocidad, pasarte un alto, alcoholímetro, o algo más?

Usuario: me detuvieron
Usuario: por exceso de velocidad
Esperado: Ya veo. ¿Ya te dieron la multa o solo fue advertencia? ¿Te dijeron cuánto ibas de rápido?

Usuario: me chocaron y el wey se fue, qué hago
Esperado: [Respuesta completa con pasos legales específicos]
```

### 5. Usar el modelo en la aplicación

Actualizar `docker-compose.yml` o configuración de Ollama:

```yaml
OLLAMA_MODEL=lexia-legal-1b  # En lugar de llama3.2:1b
```

O actualizar directamente en el código donde se llama Ollama.

## Métricas de Éxito

✅ **Modelo fine-tuned correcto si:**
1. Hace preguntas cuando el mensaje es ambiguo ("me detuvieron" → pregunta por motivo)
2. NO hace preguntas innecesarias cuando ya tiene info completa
3. Usa tono coloquial mexicano natural
4. Da respuestas legales precisas cuando tiene contexto completo

❌ **Requiere más entrenamiento si:**
1. Da respuestas legales sin tener información completa
2. No hace preguntas de seguimiento en mensajes ambiguos
3. Suena robótico o formal
4. Hace demasiadas preguntas innecesarias

## Notas Adicionales

- El fine-tuning puede tardar **30-60 minutos** dependiendo del hardware
- Se recomienda GPU para acelerar (en CPU puede tardar 2-3 horas)
- El modelo resultante tendrá ~1.5GB (similar al tamaño original)
- Puedes ajustar `--epochs` si el modelo no aprende bien (probar con 5)

## Alternativa: Fine-tuning con Hugging Face

Si Ollama no soporta fine-tuning directo, usar:

```bash
pip install transformers datasets accelerate peft
python fine-tune-llama.py
```

(Script `fine-tune-llama.py` sería necesario crear)
