# 🎯 Plan: Integración de llama3.2:3b para Respuestas Conversacionales

## Problema Identificado

El sistema actualmente **NO usa llama3.2:3b** para generar respuestas. Solo usa:
- Templates predefinidos en `OllamaResponseGenerator`
- `ArticuloLegalMapper` con conocimiento interno limitado
- RAG que no siempre tiene respuestas relevantes

### Ejemplos del Problema:

```
❌ "¿Dónde renuevo mi licencia?"
→ Devuelve artículos irrelevantes sobre concesiones de vehículos

❌ "hay un wey que la neta le pege por perro"
→ Respuesta genérica sin entender contexto de accidente

❌ "sabes por que debo detenerme ante una señal de alto"
→ Debería responder con conocimiento general, no buscar en PDFs

❌ "hola oye me arrestaron"
→ No entiende el contexto, da respuesta genérica
```

---

## Solución Propuesta

### Arquitectura Nueva:

```
Usuario pregunta
    ↓
SmartResponseService detecta tema
    ↓
Clasifica tipo de pregunta:
    ├─ GENERAL → llama3.2:3b (conocimiento pre-entrenado)
    ├─ LEGAL ESPECÍFICA → llama3.2:3b + RAG (artículos como referencia)
    └─ SITUACIÓN URGENTE → llama3.2:3b + ArticuloLegalMapper
    ↓
OllamaResponseGenerator.generarConLLM()
    ↓
Respuesta conversacional
```

---

## Tipos de Preguntas

### 1. **Preguntas Generales** (Conocimiento del Modelo)
Usar **solo llama3.2:3b** sin RAG:

- "¿Por qué debo detenerme en un alto?"
- "¿Qué es el alcoholímetro?"
- "¿Cuándo debo usar cinturón?"
- "¿Qué documentos necesito para manejar?"

**System Prompt:**
```
Eres un asistente legal especializado en tránsito de Chiapas, México.
Responde esta pregunta general usando tu conocimiento sobre leyes de tránsito.
Sé conversacional, empático y usa lenguaje coloquial mexicano cuando apropiado.
```

### 2. **Situaciones Legales Específicas** (Modelo + RAG)
Usar **llama3.2:3b + RAG** como referencia:

- "me chocaron y el wey se fue"
- "me detuvieron por alcoholímetro"
- "me pasé un alto y me multaron"

**System Prompt:**
```
Eres un asistente legal especializado en tránsito de Chiapas, México.

SITUACIÓN DEL USUARIO:
{mensaje}

TEMA DETECTADO: {tema}

ARTÍCULOS LEGALES RELEVANTES (usa solo como referencia):
{contextoRAG}

Da una respuesta conversacional y empática con:
1. Saludo empático
2. Pasos accionables específicos
3. Fundamento legal (cita los artículos del RAG si son relevantes)
4. Pregunta de seguimiento

Usa lenguaje coloquial mexicano cuando sea apropiado.
```

### 3. **Preguntas Simples de Datos** (Templates)
Mantener templates para:

- "¿Dónde renuevo mi licencia?" → URL de SEMOVI
- "¿Cuánto cuesta la licencia?" → Tabla de costos
- "¿Dónde pago mi multa?" → Links específicos

---

## Implementación

### Paso 1: Modificar `OllamaResponseGenerator.ts`

Agregar método `generarConLLM()`:

```typescript
async generarConLLM(
  nombreUsuario: string,
  mensaje: string,
  tema: string,
  contextoRAG: string,
  historial: string,
  tipoPregunta: 'general' | 'legal' | 'urgente'
): Promise<string> {
  const systemPrompt = this.construirSystemPrompt(tipoPregunta, tema, contextoRAG);

  const prompt = `
USUARIO: ${nombreUsuario}
MENSAJE: ${mensaje}
HISTORIAL RECIENTE:
${historial}

Responde de forma conversacional y empática.
`;

  const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
    model: 'llama3.2:3b',
    prompt: systemPrompt + '\n\n' + prompt,
    stream: false,
    options: {
      temperature: 0.7,  // Más creativo para respuestas conversacionales
      top_p: 0.9,
      num_predict: 400
    }
  });

  return response.data.response;
}
```

### Paso 2: Clasificar Tipo de Pregunta

En `SmartResponseService.ts`:

```typescript
function clasificarTipoPregunta(mensaje: string, tema: string): 'general' | 'legal' | 'urgente' {
  const msgLower = mensaje.toLowerCase();

  // Preguntas generales (qué, por qué, cuándo, cómo)
  const patronesGenerales = /^(qué|que|por qué|por que|cuándo|cuando|cómo|como|para qué|para que)/i;
  if (patronesGenerales.test(mensaje)) {
    return 'general';
  }

  // Situaciones urgentes (heridos, fuga, etc.)
  if (/herid|lesion|sangr|fuga|se fue|huyó|urgente/i.test(msgLower)) {
    return 'urgente';
  }

  // Situaciones legales específicas
  return 'legal';
}
```

### Paso 3: Modificar Flujo de Respuesta

```typescript
// En SmartResponseService.generarRespuestaCompleta()

const tipoPregunta = this.clasificarTipoPregunta(mensaje, tema);

let respuestaLLM: string;
if (tipoPregunta === 'general') {
  // Preguntas generales: solo usar modelo
  respuestaLLM = await ollamaResponseGenerator.generarConLLM(
    nombreUsuario, mensaje, tema, '', historial, 'general'
  );
} else {
  // Situaciones legales: modelo + RAG
  respuestaLLM = await ollamaResponseGenerator.generarConLLM(
    nombreUsuario, mensaje, tema, contextoRAG, historial, tipoPregunta
  );
}
```

---

## Ventajas

✅ **Mejor comprensión contextual**: llama3.2:3b entiende situaciones ambiguas
✅ **Respuestas más naturales**: El modelo genera texto conversacional, no templates
✅ **Menos dependencia del RAG**: Solo se usa cuando es necesario fundamentar legalmente
✅ **Escalable**: Fácil agregar nuevos tipos de preguntas sin modificar templates

---

## Próximos Pasos

1. ✅ Crear `generarConLLM()` en `OllamaResponseGenerator.ts`
2. ✅ Agregar `clasificarTipoPregunta()` en `SmartResponseService.ts`
3. ✅ Modificar flujo en `generarRespuestaCompleta()`
4. ✅ Compilar y reiniciar servicio
5. ✅ Probar con casos de prueba

---

**Fecha:** 2025-12-04
**Modelo:** llama3.2:3b
**Objetivo:** Reducir dependencia del RAG y usar conocimiento pre-entrenado del modelo
