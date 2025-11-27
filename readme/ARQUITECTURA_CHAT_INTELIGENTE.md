# 🤖 Arquitectura: Chat Inteligente con IA

## 🎯 Visión del Sistema

Un chatbot legal inteligente que:
1. **Entiende lenguaje natural** (coloquial)
2. **Responde formalmente** con empatía
3. **Recuerda el contexto** de la conversación
4. **Recomienda abogados** especializados
5. **Agrupa usuarios** con problemas similares
6. **Aprende con el tiempo** de las interacciones

---

## 📝 Flujo de Conversación - Ejemplo

### Turno 1: Usuario pregunta

**Usuario (Juan):**
> "Oye fíjate que me multaron por estacionarme como 30 cm separado de la banqueta"

**Sistema internamente:**

```javascript
// 1. NLP procesa el texto
{
  textoNormalizado: "me multaron estacionar 30cm separado banqueta",
  entidades: {
    distancia: "30cm",
    lugar: "banqueta",
    accion: "estacionar"
  },
  intencion: "consulta_multa",
  sentimiento: "preocupado"
}

// 2. Clustering ML predice
{
  cluster: "C2",  // Estacionamiento
  confianza: 0.89
}

// 3. RAG busca documentos relevantes
{
  documentos: [
    {
      titulo: "Artículo 138 - Estacionamiento Prohibido",
      contenido: "No se puede estacionar en andenes peatonales. La distancia máxima de la banqueta debe ser 10cm en Chiapas...",
      similitud: 0.92
    }
  ]
}

// 4. Generador de respuestas crea mensaje
{
  respuesta: "Hola Juan, entiendo tu preocupación. Actualmente las reglas de tránsito han cambiado en el estado de Chiapas. La distancia máxima permitida de la banqueta es de 10 cm.\n\n📋 **Artículo 138 - Código Nacional de Tránsito**\n🏛️ Ley de Tránsito del Estado de Chiapas (2024)\n💰 Multa: 15 SMLV (~$195,000 COP)\n\n¿Te gustaría que te recomiende abogados especializados en infracciones de tránsito?"
}

// 5. Guardar en historial
INSERT INTO conversaciones (usuario_id, mensaje, cluster, embedding)
VALUES ('juan123', '...', 'C2', [0.123, ...]);
```

**Chat responde:**
> "Hola Juan, entiendo tu preocupación. Actualmente las reglas de tránsito han cambiado en el estado de Chiapas. La distancia máxima permitida de la banqueta es de 10 cm.
>
> 📋 **Artículo 138 - Código Nacional de Tránsito**
> 🏛️ Ley de Tránsito del Estado de Chiapas (2024)
> 💰 Multa: 15 SMLV (~$195,000 COP)
>
> ¿Te gustaría que te recomiende abogados especializados en infracciones de tránsito?"

---

### Turno 2: Usuario sigue conversación

**Usuario (Juan):**
> "No entiendo, me parece una locura"

**Sistema internamente:**

```javascript
// 1. Detecta sentimiento negativo
{
  sentimiento: "frustrado",
  intencion: "queja"
}

// 2. Recupera contexto previo
{
  conversacionPrevia: [
    { role: "user", mensaje: "me multaron por estacionarme..." },
    { role: "assistant", mensaje: "Hola Juan, entiendo..." }
  ],
  tema: "estacionamiento_multa",
  cluster: "C2"
}

// 3. Genera respuesta empática
{
  respuesta: "Comprendo tu frustración Juan. Es común que estos cambios en las normativas generen confusión. La buena noticia es que tienes opciones:\n\n1️⃣ **Impugnar la multa** si consideras que fue injusta\n2️⃣ **Consultar con un experto** para conocer tus derechos\n3️⃣ **Pagar con descuento** si lo haces dentro de 5 días\n\n¿Quieres que te muestre abogados especializados que pueden ayudarte a impugnarla?"
}
```

**Chat responde:**
> "Comprendo tu frustración Juan. Es común que estos cambios en las normativas generen confusión. La buena noticia es que tienes opciones:
>
> 1️⃣ **Impugnar la multa** si consideras que fue injusta
> 2️⃣ **Consultar con un experto** para conocer tus derechos
> 3️⃣ **Pagar con descuento** si lo haces dentro de 5 días
>
> ¿Quieres que te muestre abogados especializados que pueden ayudarte a impugnarla?"

---

### Turno 3: Recomendación de abogados

**Usuario (Juan):**
> "Sí, por favor"

**Sistema internamente:**

```javascript
// 1. Busca abogados especializados en cluster C2
SELECT a.*, u.nombre, u.rating_promedio
FROM abogados a
JOIN usuarios u ON a.usuario_id = u.id
WHERE 'Estacionamiento' = ANY(a.especialidades)
  AND a.ciudad = 'Chiapas'
  AND a.verificado = true
ORDER BY u.rating_promedio DESC, a.experiencia_anios DESC
LIMIT 10;

// 2. Genera recomendación personalizada
{
  score_personalizado: (
    0.4 * especializacion_match +
    0.3 * rating +
    0.2 * experiencia +
    0.1 * proximidad
  )
}

// 3. Guarda recomendación
INSERT INTO recomendaciones_abogados
(consulta_id, abogado_id, score, razon_recomendacion)
VALUES (...);
```

**Chat responde:**
> "📋 **Top 10 Abogados Especializados en Infracciones de Tránsito - Chiapas**
>
> 1. **Lic. María González** ⭐ 4.9/5
>    🎓 15 años de experiencia | 💼 89 casos ganados
>    💰 $2,500 consulta | 📍 Tuxtla Gutiérrez
>    [Ver perfil] [Contactar]
>
> 2. **Lic. Carlos Ramírez** ⭐ 4.8/5
>    🎓 12 años de experiencia | 💼 76 casos ganados
>    💰 $2,000 consulta | 📍 San Cristóbal
>    [Ver perfil] [Contactar]
>
> _(mostrando 2 de 10)_"

---

## 🏗️ Arquitectura Técnica

### Componentes del Sistema

```
┌─────────────────────────────────────────────────────┐
│              Frontend (Chat UI)                      │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│        Chat Service (Puerto 3010) - NUEVO           │
│  ┌───────────────────────────────────────────────┐  │
│  │ - Memoria de conversación                     │  │
│  │ - Gestión de contexto                         │  │
│  │ - Orquestación de servicios                   │  │
│  │ - Generación de respuestas empáticas          │  │
│  └───────────────────────────────────────────────┘  │
└──────┬──────────┬──────────┬──────────┬────────────┘
       │          │          │          │
       ▼          ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
│   NLP    │ │Clustering│ │   RAG    │ │Recommendations│
│ (3004)   │ │  (3002)  │ │ (3009)   │ │    (3006)    │
└──────────┘ └──────────┘ └──────────┘ └──────────────┘
       │          │          │          │
       └──────────┴──────────┴──────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│           PostgreSQL + pgvector                      │
│  ┌──────────────┐  ┌─────────────┐ ┌──────────────┐│
│  │conversaciones│  │   usuarios  │ │  abogados    ││
│  │ (embeddings) │  │   clusters  │ │(especialidades)││
│  └──────────────┘  └─────────────┘ └──────────────┘│
└─────────────────────────────────────────────────────┘
```

---

## 🗄️ Nuevas Tablas de Base de Datos

### 1. Conversaciones (Chat con memoria)

```sql
CREATE TABLE conversaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL,
  sesion_id UUID NOT NULL,  -- Agrupa mensajes de una conversación
  mensaje TEXT NOT NULL,
  rol VARCHAR(20) NOT NULL,  -- 'user' o 'assistant'
  cluster_detectado VARCHAR(10),
  embedding vector(384),
  sentimiento VARCHAR(20),
  contexto JSONB,  -- RAG chunks, artículos encontrados, etc.
  fecha TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_conv_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE INDEX idx_conv_sesion ON conversaciones(sesion_id);
CREATE INDEX idx_conv_usuario ON conversaciones(usuario_id);
```

### 2. Agrupación de Usuarios por Similitud

```sql
CREATE TABLE usuarios_clusters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL,
  cluster VARCHAR(10) NOT NULL,
  total_consultas INT DEFAULT 1,
  ultima_consulta TIMESTAMP DEFAULT NOW(),
  embedding_promedio vector(384),  -- Promedio de embeddings

  CONSTRAINT fk_uc_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  UNIQUE(usuario_id, cluster)
);

-- Índice para encontrar usuarios similares
CREATE INDEX idx_uc_embedding ON usuarios_clusters
USING hnsw (embedding_promedio vector_cosine_ops);
```

### 3. Grupos de Usuarios Similares

```sql
CREATE TABLE grupos_usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cluster VARCHAR(10) NOT NULL,
  nombre VARCHAR(255),  -- "Usuarios con problemas de Estacionamiento"
  descripcion TEXT,
  total_miembros INT DEFAULT 0,
  fecha_creacion TIMESTAMP DEFAULT NOW()
);

CREATE TABLE grupo_miembros (
  grupo_id UUID NOT NULL,
  usuario_id UUID NOT NULL,
  fecha_union TIMESTAMP DEFAULT NOW(),
  activo BOOLEAN DEFAULT TRUE,

  CONSTRAINT fk_gm_grupo FOREIGN KEY (grupo_id) REFERENCES grupos_usuarios(id),
  CONSTRAINT fk_gm_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  PRIMARY KEY (grupo_id, usuario_id)
);
```

### 4. Sistema de Aprendizaje

```sql
CREATE TABLE interacciones_aprendizaje (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo VARCHAR(50) NOT NULL,  -- 'valoracion_abogado', 'like_respuesta', etc.
  usuario_id UUID NOT NULL,
  abogado_id UUID,
  consulta_id UUID,
  valoracion INT,  -- 1-5 estrellas
  feedback TEXT,
  cluster VARCHAR(10),
  fecha TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_ia_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_ia_abogado FOREIGN KEY (abogado_id) REFERENCES usuarios(id)
);

CREATE INDEX idx_ia_cluster ON interacciones_aprendizaje(cluster);
CREATE INDEX idx_ia_abogado ON interacciones_aprendizaje(abogado_id);
```

---

## 🔄 Flujo Completo del Sistema

### 1. Usuario inicia chat

```javascript
POST /chat/session
{
  "usuarioId": "juan123"
}

// Response:
{
  "sesionId": "session-uuid-123",
  "mensaje": "Hola Juan, soy LexIA tu asistente legal. ¿En qué puedo ayudarte hoy?"
}
```

### 2. Usuario envía mensaje

```javascript
POST /chat/message
{
  "sesionId": "session-uuid-123",
  "mensaje": "me multaron por estacionarme 30cm de la banqueta"
}

// El sistema hace:
// 1. NLP → procesa texto
// 2. Clustering → detecta C2
// 3. RAG → busca artículos relevantes
// 4. Genera respuesta contextual
// 5. Guarda en conversaciones con embedding
// 6. Actualiza clustering del usuario

// Response:
{
  "respuesta": "Hola Juan, entiendo tu preocupación...",
  "articulos": [...],
  "sugerencias": ["Ver abogados", "Impugnar multa"],
  "cluster": "C2"
}
```

### 3. Agrupación automática de usuarios

```javascript
// Proceso automático en background

// Juan preguntó sobre estacionamiento (C2)
// Sistema busca otros usuarios con consultas similares

SELECT u.id, u.nombre, uc.cluster,
       (uc.embedding_promedio <=> $1) AS similitud
FROM usuarios_clusters uc
JOIN usuarios u ON uc.usuario_id = u.id
WHERE uc.cluster = 'C2'
  AND uc.usuario_id != 'juan123'
ORDER BY uc.embedding_promedio <=> $1
LIMIT 10;

// Encuentra: Juana también preguntó sobre estacionamiento
// Los agrupa automáticamente en "Grupo de Estacionamiento"

INSERT INTO grupo_miembros (grupo_id, usuario_id)
VALUES ('grupo-c2', 'juan123'), ('grupo-c2', 'juana456');
```

### 4. Recomendación de abogados

```javascript
POST /chat/recommend-lawyers
{
  "sesionId": "session-uuid-123",
  "cluster": "C2",
  "top": 10
}

// Sistema aprende:
// - Qué abogados recomienda más
// - Cuáles son contactados
// - Cuáles resuelven casos exitosamente
// - Ajusta scores dinámicamente

// Response:
{
  "abogados": [
    {
      "id": "abogado1",
      "nombre": "Lic. María González",
      "especialidad": "Infracciones de Tránsito",
      "rating": 4.9,
      "experiencia": 15,
      "casosGanados": 89,
      "scorePersonalizado": 0.95  // ← Aprende con el tiempo
    }
  ]
}
```

### 5. Sistema de autoaprendizaje

```javascript
// Usuario valora al abogado
POST /feedback/lawyer
{
  "abogadoId": "abogado1",
  "valoracion": 5,
  "comentario": "Excelente, me ayudó a impugnar la multa",
  "consultaId": "consulta-uuid"
}

// Sistema aprende:
UPDATE abogados
SET rating_promedio = (
  SELECT AVG(valoracion)
  FROM interacciones_aprendizaje
  WHERE abogado_id = 'abogado1'
)
WHERE usuario_id = 'abogado1';

// Ajusta score de recomendación para futuras consultas C2
UPDATE recommendation_scores
SET score = score * 1.1  -- Aumenta 10% si valoración > 4
WHERE abogado_id = 'abogado1' AND cluster = 'C2';
```

---

## 🧠 Generador de Respuestas Empáticas

### Templates por Sentimiento

```javascript
const templates = {
  preocupado: {
    apertura: "Hola {nombre}, entiendo tu preocupación.",
    desarrollo: "Es importante que sepas que...",
    cierre: "¿Te gustaría que te ayude con algo más específico?"
  },

  frustrado: {
    apertura: "Comprendo tu frustración {nombre}.",
    desarrollo: "Es común que estas situaciones generen confusión. La buena noticia es que...",
    cierre: "¿Quieres que te muestre opciones para resolverlo?"
  },

  neutro: {
    apertura: "Hola {nombre}, con gusto te ayudo.",
    desarrollo: "Según la legislación actual...",
    cierre: "¿Necesitas más información sobre este tema?"
  }
};

// Construcción de respuesta
function generarRespuesta(usuario, sentimiento, contexto, articulos) {
  const template = templates[sentimiento];

  return `
${template.apertura.replace('{nombre}', usuario.nombre)}

${template.desarrollo}

📋 **${articulos[0].titulo}**
🏛️ ${articulos[0].fuente}
💰 ${articulos[0].multa}

${contexto}

${template.cierre}
  `.trim();
}
```

---

## 📊 Machine Learning del Sistema

### 1. Aprendizaje de Preferencias de Usuarios

```sql
-- ¿Qué abogados prefieren usuarios del cluster C2?
SELECT
  a.usuario_id,
  COUNT(*) as total_recomendaciones,
  AVG(ia.valoracion) as rating_promedio,
  COUNT(CASE WHEN ia.valoracion >= 4 THEN 1 END) as casos_exitosos
FROM recomendaciones_abogados ra
JOIN interacciones_aprendizaje ia ON ra.abogado_id = ia.abogado_id
JOIN abogados a ON ra.abogado_id = a.usuario_id
WHERE ia.cluster = 'C2'
GROUP BY a.usuario_id
ORDER BY rating_promedio DESC, casos_exitosos DESC;
```

### 2. Mejora de Clustering

```sql
-- Detectar usuarios que cambian de cluster frecuentemente
SELECT
  usuario_id,
  cluster,
  COUNT(*) as veces_consultado,
  AVG(confianza_cluster) as confianza_promedio
FROM consultas
GROUP BY usuario_id, cluster
HAVING COUNT(*) > 3;

-- Ajustar modelo si hay confusión
```

### 3. Predicción de Necesidades

```sql
-- Si usuario pregunta sobre estacionamiento,
-- probablemente necesite abogado
SELECT
  CASE
    WHEN cluster IN ('C2', 'C3', 'C5') THEN 0.85  -- Alta prob. de necesitar abogado
    WHEN cluster IN ('C1', 'C4') THEN 0.60
    ELSE 0.30
  END as probabilidad_necesita_abogado
FROM consultas
WHERE usuario_id = 'juan123'
ORDER BY fecha_consulta DESC
LIMIT 1;
```

---

## 🎯 Próximos Pasos de Implementación

1. ✅ **RAG implementado** (Puerto 3009)
2. ✅ **OLAP con PostgreSQL** (Puerto 3001)
3. ⏳ **Chat Service** (Puerto 3010) - Por crear
4. ⏳ **Migración de BD** para conversaciones
5. ⏳ **Sistema de agrupación** de usuarios
6. ⏳ **ML de aprendizaje** continuo

---

¿Quieres que implemente el **Chat Service completo** con:
- Memoria de conversación
- Generación de respuestas empáticas
- Integración con RAG, NLP y Clustering
- Sistema de recomendación de abogados
- Agrupación automática de usuarios
