/**
 * BASE DE CONOCIMIENTOS DE TRÁNSITO - LexIA
 * 
 * Esta base contiene conocimiento estructurado sobre:
 * - Señalización vial
 * - Límites de velocidad
 * - Infracciones y multas
 * - Documentación vehicular
 * - Procedimientos legales
 * - Derechos del conductor
 * - Accidentes y emergencias
 * 
 * Cada entrada tiene:
 * - category: Categoría principal
 * - subcategory: Subcategoría específica
 * - questions: Variaciones de preguntas (para entrenamiento)
 * - answer: Respuesta completa
 * - keywords: Palabras clave para búsqueda
 * - relatedTopics: Temas relacionados para sugerencias
 * - legalReference: Referencias legales aplicables
 */

export interface KnowledgeEntry {
  id: string;
  category: string;
  subcategory: string;
  questions: string[];  // Múltiples formas de preguntar lo mismo
  answer: string;
  shortAnswer?: string; // Respuesta corta para respuestas rápidas
  keywords: string[];
  relatedTopics: string[];
  legalReference?: string;
  severity?: 'info' | 'warning' | 'critical';
  tags?: string[];
}

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  // ============================================================
  // CATEGORÍA: SEÑALIZACIÓN VIAL
  // ============================================================
  
  // --- Señales Restrictivas ---
  {
    id: 'senal_alto',
    category: 'señalizacion',
    subcategory: 'restrictivas',
    questions: [
      '¿Qué significa la señal de alto?',
      '¿Qué debo hacer en una señal de alto?',
      '¿Cómo es la señal de pare?',
      '¿Qué significa el octágono rojo?',
      'señal roja octagonal',
      'señal de stop',
      'señal pare'
    ],
    answer: 'La señal de **ALTO** (o PARE) es un octágono rojo con letras blancas. Indica que debes:\n\n1. **Detenerte completamente** antes de la línea de alto\n2. **Verificar** que no vengan vehículos ni peatones\n3. **Ceder el paso** a quien tenga preferencia\n4. **Continuar** solo cuando sea seguro\n\n⚠️ No hacer alto completo es infracción con multa de 5-15 días de salario mínimo.',
    shortAnswer: 'La señal de ALTO significa detenerse completamente, verificar que sea seguro y luego continuar.',
    keywords: ['alto', 'pare', 'stop', 'octágono', 'rojo', 'detenerse'],
    relatedTopics: ['senal_ceda_paso', 'infraccion_no_alto', 'preferencia_paso'],
    legalReference: 'Reglamento de Tránsito, Artículos sobre señalización',
    severity: 'warning'
  },
  {
    id: 'senal_no_pasar',
    category: 'señalizacion',
    subcategory: 'restrictivas',
    questions: [
      '¿Qué significa una señal con fondo rojo y línea blanca horizontal?',
      '¿Qué es la señal de no pasar?',
      'señal roja con raya blanca',
      'señal prohibido el paso',
      'círculo rojo con línea blanca'
    ],
    answer: 'La señal con **fondo rojo y línea blanca horizontal** (o diagonal) indica **PROHIBIDO EL PASO** o **NO PASAR**. Significa que:\n\n• No puedes continuar por esa vía\n• Puede ser calle en sentido contrario\n• Zona restringida o privada\n• Calle cerrada temporalmente\n\n🚫 Ignorar esta señal puede resultar en multa de 10-20 días de salario mínimo.',
    shortAnswer: 'La señal roja con línea blanca significa PROHIBIDO EL PASO - no puedes circular por ahí.',
    keywords: ['no pasar', 'prohibido', 'rojo', 'blanca', 'horizontal', 'línea', 'círculo'],
    relatedTopics: ['senal_sentido_contrario', 'infracciones_graves'],
    severity: 'warning'
  },
  {
    id: 'senal_ceda_paso',
    category: 'señalizacion',
    subcategory: 'restrictivas',
    questions: [
      '¿Qué significa la señal de ceda el paso?',
      '¿Qué es el triángulo invertido?',
      'señal triangular roja',
      'ceda el paso significado',
      'triángulo punta abajo'
    ],
    answer: 'La señal de **CEDA EL PASO** es un triángulo invertido (punta hacia abajo) con borde rojo. Indica que:\n\n1. Debes **reducir la velocidad**\n2. **Ceder el paso** a vehículos en la vía principal\n3. **Detenerte si es necesario** para dejar pasar\n4. Solo avanzar cuando sea seguro\n\nA diferencia del ALTO, no requiere detenerte completamente si no hay tráfico.',
    shortAnswer: 'CEDA EL PASO significa reducir velocidad y dejar pasar a los vehículos de la vía principal.',
    keywords: ['ceda', 'paso', 'triángulo', 'invertido', 'preferencia'],
    relatedTopics: ['senal_alto', 'preferencia_paso'],
    severity: 'info'
  },
  {
    id: 'senal_velocidad_maxima',
    category: 'señalizacion',
    subcategory: 'restrictivas',
    questions: [
      '¿Qué significa la señal de velocidad máxima?',
      'señal con número en círculo rojo',
      '¿Cómo identifico el límite de velocidad?',
      'señal de límite de velocidad'
    ],
    answer: 'La señal de **VELOCIDAD MÁXIMA** es un círculo con borde rojo y número negro en el centro. El número indica el límite máximo en km/h.\n\n📍 **Límites comunes:**\n• Zonas escolares: 20-30 km/h\n• Calles residenciales: 30-40 km/h\n• Avenidas: 50-60 km/h\n• Vías rápidas: 70-80 km/h\n• Carreteras: 80-110 km/h\n\n⚠️ Exceder el límite resulta en multas progresivas según el exceso.',
    shortAnswer: 'La señal con número en círculo rojo indica la velocidad máxima permitida en km/h.',
    keywords: ['velocidad', 'máxima', 'límite', 'número', 'círculo', 'rojo', 'km/h'],
    relatedTopics: ['exceso_velocidad', 'multa_velocidad', 'radar'],
    severity: 'warning'
  },
  {
    id: 'senal_no_estacionar',
    category: 'señalizacion',
    subcategory: 'restrictivas',
    questions: [
      '¿Qué significa la señal de no estacionarse?',
      'señal E tachada',
      'prohibido estacionar señal',
      'círculo azul con línea roja'
    ],
    answer: 'La señal de **NO ESTACIONARSE** es un círculo azul con una diagonal roja o una "E" tachada. Indica que:\n\n• No puedes dejar tu vehículo estacionado\n• Puede haber horarios específicos (revisa placas adicionales)\n• La grúa puede llevarse tu vehículo\n\n**Multa:** 5-15 días de salario mínimo + costo de grúa y corralón.',
    shortAnswer: 'La señal de NO ESTACIONARSE prohíbe dejar tu vehículo en esa zona.',
    keywords: ['no estacionar', 'prohibido', 'E', 'tachada', 'azul', 'grúa'],
    relatedTopics: ['grua_corralon', 'zonas_prohibidas_estacionar'],
    severity: 'warning'
  },

  // --- Señales Preventivas ---
  {
    id: 'senal_amarilla_preventiva',
    category: 'señalizacion',
    subcategory: 'preventivas',
    questions: [
      '¿Qué significan las señales amarillas?',
      'señales de advertencia',
      'señal preventiva amarilla',
      '¿Por qué hay señales amarillas?'
    ],
    answer: 'Las señales con **fondo amarillo** son **SEÑALES PREVENTIVAS**. Advierten sobre peligros adelante:\n\n• 🔄 **Curvas** - curva peligrosa adelante\n• ⚠️ **Cruces** - intersección próxima\n• 🏫 **Zona escolar** - reducir velocidad\n• 🚧 **Obras** - trabajos en la vía\n• 🦌 **Fauna** - cruce de animales\n• ⛰️ **Pendientes** - subida o bajada pronunciada\n\n**Acción:** Reducir velocidad y estar atento.',
    shortAnswer: 'Las señales amarillas advierten sobre peligros adelante. Debes reducir velocidad y estar atento.',
    keywords: ['amarilla', 'preventiva', 'advertencia', 'peligro', 'curva', 'cruce'],
    relatedTopics: ['zona_escolar', 'curvas_peligrosas'],
    severity: 'info'
  },
  {
    id: 'senal_zona_escolar',
    category: 'señalizacion',
    subcategory: 'preventivas',
    questions: [
      '¿Qué significa la señal de zona escolar?',
      'señal con niños',
      'señal de escuela',
      'velocidad en zona escolar'
    ],
    answer: 'La señal de **ZONA ESCOLAR** muestra siluetas de niños sobre fondo amarillo. Indica:\n\n• **Velocidad máxima: 20-30 km/h**\n• Mayor precaución por presencia de menores\n• Horarios de entrada/salida escolar son más riesgosos\n• Posibles cruces de niños\n\n⚠️ Las multas se **DUPLICAN** en zonas escolares.\n📍 La multa por exceso puede ser de 20-40 días de salario mínimo.',
    shortAnswer: 'Zona escolar significa velocidad máxima de 20-30 km/h y máxima precaución por presencia de niños.',
    keywords: ['escolar', 'escuela', 'niños', 'estudiantes', '20', '30', 'km/h'],
    relatedTopics: ['exceso_velocidad_escolar', 'multas_duplicadas'],
    severity: 'critical'
  },

  // --- Señales Informativas ---
  {
    id: 'senal_azul_informativa',
    category: 'señalizacion',
    subcategory: 'informativas',
    questions: [
      '¿Qué significan las señales azules?',
      'señal informativa azul',
      'señales de servicios'
    ],
    answer: 'Las señales con **fondo azul** son **SEÑALES INFORMATIVAS**. Indican:\n\n• 🏥 **Servicios:** Hospitales, gasolineras, restaurantes\n• 🅿️ **Estacionamiento** disponible\n• ℹ️ **Información turística**\n• 📞 **Teléfonos de emergencia**\n• 🚻 **Sanitarios públicos**\n\nNo son obligatorias, solo brindan información útil.',
    shortAnswer: 'Las señales azules informan sobre servicios disponibles como hospitales, gasolineras, etc.',
    keywords: ['azul', 'informativa', 'servicios', 'hospital', 'gasolinera'],
    relatedTopics: ['senal_verde_destino'],
    severity: 'info'
  },
  {
    id: 'senal_verde_destino',
    category: 'señalizacion',
    subcategory: 'informativas',
    questions: [
      '¿Qué significan las señales verdes?',
      'señales de destino',
      'señales de carretera verdes'
    ],
    answer: 'Las señales con **fondo verde** son **SEÑALES DE DESTINO**. Indican:\n\n• 🏙️ **Direcciones** a ciudades y poblaciones\n• 📏 **Distancias** en kilómetros\n• 🛣️ **Números de carretera**\n• ✈️ **Aeropuertos, centrales de autobús**\n• 🚪 **Salidas** de autopistas\n\nSon tu guía para llegar a tu destino.',
    shortAnswer: 'Las señales verdes indican direcciones, distancias y destinos en carreteras.',
    keywords: ['verde', 'destino', 'dirección', 'distancia', 'kilómetros', 'carretera'],
    relatedTopics: ['senal_azul_informativa'],
    severity: 'info'
  },

  // ============================================================
  // CATEGORÍA: LÍMITES DE VELOCIDAD
  // ============================================================
  {
    id: 'limite_zona_escolar',
    category: 'velocidad',
    subcategory: 'limites',
    questions: [
      '¿Cuál es el límite de velocidad en zonas escolares?',
      '¿A qué velocidad puedo ir cerca de una escuela?',
      'velocidad máxima zona escolar',
      'límite escuela',
      'velocidad cerca de escuelas'
    ],
    answer: 'En **zonas escolares**, el límite de velocidad es de **20-30 km/h** (varía por estado).\n\n📍 **En México:**\n• La mayoría establece **20 km/h** con presencia de estudiantes\n• Algunos estados permiten hasta **30 km/h**\n\n⚠️ **Importante:**\n• Horarios de mayor riesgo: 7-9 AM y 1-3 PM\n• Las multas se DUPLICAN en estas zonas\n• Hay personal de tránsito vigilando frecuentemente',
    shortAnswer: 'El límite en zonas escolares es de 20-30 km/h. En México generalmente es 20 km/h.',
    keywords: ['límite', 'velocidad', 'escolar', 'escuela', '20', '30', 'km/h', 'máximo'],
    relatedTopics: ['exceso_velocidad_escolar', 'senal_zona_escolar'],
    legalReference: 'Reglamentos de Tránsito Estatales',
    severity: 'critical'
  },
  {
    id: 'limite_urbano',
    category: 'velocidad',
    subcategory: 'limites',
    questions: [
      '¿Cuál es el límite de velocidad en la ciudad?',
      'velocidad máxima en calles',
      'límite urbano',
      '¿A qué velocidad puedo ir en la ciudad?',
      'velocidad en avenidas'
    ],
    answer: 'Los **límites de velocidad en zonas urbanas** son:\n\n• **Calles residenciales:** 30-40 km/h\n• **Calles secundarias:** 40-50 km/h\n• **Avenidas principales:** 50-60 km/h\n• **Ejes viales:** 50-70 km/h\n• **Vías rápidas urbanas:** 70-80 km/h\n\n📍 Siempre revisa la señalización específica de cada vía.',
    shortAnswer: 'En ciudad: calles 30-40 km/h, avenidas 50-60 km/h, vías rápidas 70-80 km/h.',
    keywords: ['límite', 'velocidad', 'ciudad', 'urbano', 'calle', 'avenida'],
    relatedTopics: ['limite_carretera', 'exceso_velocidad'],
    severity: 'info'
  },
  {
    id: 'limite_carretera',
    category: 'velocidad',
    subcategory: 'limites',
    questions: [
      '¿Cuál es el límite de velocidad en carretera?',
      'velocidad máxima autopista',
      'límite en carretera federal',
      '¿A qué velocidad puedo ir en autopista?'
    ],
    answer: 'Los **límites de velocidad en carreteras** son:\n\n• **Carreteras federales:** 80-100 km/h\n• **Autopistas de cuota:** 110-120 km/h\n• **Zonas de curvas:** Según señalización (60-80 km/h)\n• **Zonas de niebla/lluvia:** Reducir significativamente\n\n🚛 **Vehículos pesados:** Límites menores (80-90 km/h generalmente)',
    shortAnswer: 'En carretera federal 80-100 km/h, en autopista 110-120 km/h.',
    keywords: ['límite', 'velocidad', 'carretera', 'autopista', 'federal', '100', '110', '120'],
    relatedTopics: ['limite_urbano', 'exceso_velocidad'],
    severity: 'info'
  },

  // ============================================================
  // CATEGORÍA: INFRACCIONES Y MULTAS
  // ============================================================
  {
    id: 'exceso_velocidad',
    category: 'infracciones',
    subcategory: 'velocidad',
    questions: [
      '¿Qué pasa si excedo el límite de velocidad?',
      '¿Cuánto es la multa por exceso de velocidad?',
      'me pasé del límite de velocidad',
      'consecuencias exceso velocidad',
      'multa por ir rápido',
      'qué pasa si excedo ese límite'
    ],
    answer: 'Las **consecuencias por exceso de velocidad** dependen de cuánto excedas:\n\n📊 **Escala de multas:**\n• **1-20 km/h de exceso:** 5-10 días de salario mínimo\n• **21-40 km/h de exceso:** 10-20 días + 3 puntos en licencia\n• **Más de 40 km/h:** 20-40 días + 6 puntos + posible retención\n\n⚠️ **Agravantes (multa doble):**\n• Zonas escolares\n• Zonas hospitalarias\n• Zonas de obras\n• Reincidencia\n\n📍 Acumular 12 puntos = suspensión de licencia.',
    shortAnswer: 'Multa de 5-40 días de salario según el exceso. Se duplica en zonas escolares.',
    keywords: ['exceso', 'velocidad', 'multa', 'límite', 'infracción', 'puntos'],
    relatedTopics: ['limite_zona_escolar', 'puntos_licencia', 'fotomulta'],
    legalReference: 'Reglamentos de Tránsito Estatales',
    severity: 'warning'
  },
  {
    id: 'exceso_velocidad_escolar',
    category: 'infracciones',
    subcategory: 'velocidad',
    questions: [
      '¿Qué pasa si excedo la velocidad en zona escolar?',
      'multa por velocidad en escuela',
      'exceso velocidad zona escolar',
      'me pasé del límite en zona escolar'
    ],
    answer: 'Exceder la velocidad en **zona escolar** tiene consecuencias más severas:\n\n🚨 **Consecuencias:**\n• **Multa DOBLE:** 20-60 días de salario mínimo\n• **Puntos:** 6-9 puntos en licencia\n• **Posible retención** del vehículo\n• **Antecedente** grave en historial\n\n⚠️ Si hay presencia de estudiantes, la autoridad puede:\n• Retener licencia temporalmente\n• Enviar vehículo al corralón\n\n📍 Las zonas escolares son de las más vigiladas.',
    shortAnswer: 'Multa DOBLE (20-60 días salario), 6-9 puntos y posible retención del vehículo.',
    keywords: ['exceso', 'velocidad', 'escolar', 'escuela', 'multa', 'doble'],
    relatedTopics: ['limite_zona_escolar', 'senal_zona_escolar'],
    severity: 'critical'
  },
  {
    id: 'pasarse_alto',
    category: 'infracciones',
    subcategory: 'semaforos',
    questions: [
      '¿Qué pasa si me paso un alto?',
      'multa por pasarse el alto',
      'no hice alto',
      'crucé sin parar',
      'me pasé la señal de alto'
    ],
    answer: 'No hacer **ALTO** en la señal correspondiente:\n\n📋 **Consecuencias:**\n• **Multa:** 5-15 días de salario mínimo\n• **Puntos:** 3 puntos en licencia\n\n⚠️ **Si causas accidente:**\n• Responsabilidad civil (pagar daños)\n• Posibles cargos penales si hay lesionados\n• Seguro puede no cubrir por negligencia\n\n📍 Los ALTOs suelen tener cámaras o vigilancia frecuente.',
    shortAnswer: 'Multa de 5-15 días de salario mínimo y 3 puntos en licencia.',
    keywords: ['alto', 'pare', 'stop', 'pasarse', 'multa', 'infracción'],
    relatedTopics: ['senal_alto', 'semaforo_rojo'],
    severity: 'warning'
  },
  {
    id: 'semaforo_rojo',
    category: 'infracciones',
    subcategory: 'semaforos',
    questions: [
      '¿Qué pasa si cruzo en luz roja?',
      'multa por pasarse el semáforo',
      'crucé en rojo',
      'me pasé el semáforo en rojo',
      'infracción semáforo',
      'me brinqué un semáforo',
      'qué pasa si me brinco un semáforo',
      'brincar semáforo multa',
      'sabes que pasa si me brinco un semaforo'
    ],
    answer: 'Cruzar/brincarse el **semáforo en rojo** es una infracción grave:\n\n🚨 **Consecuencias:**\n• **Multa:** 10-20 días de salario mínimo\n• **Puntos:** 6 puntos en licencia\n• **Fotomulta:** Si hay cámara, llega por correo\n\n⚠️ **Si causas accidente:**\n• Responsabilidad civil total\n• Cargos penales por lesiones u homicidio culposo\n• Seguro puede rechazar cobertura\n\n📍 Las intersecciones con semáforo tienen alta vigilancia.',
    shortAnswer: 'Multa de 10-20 días de salario, 6 puntos en licencia. Si hay accidente, cargos penales.',
    keywords: ['semáforo', 'semaforo', 'rojo', 'luz', 'cruzar', 'multa', 'fotomulta', 'brinco', 'brincar', 'brinque', 'brincarse'],
    relatedTopics: ['fotomulta', 'accidente_culpable'],
    severity: 'critical'
  },
  {
    id: 'estacionar_prohibido',
    category: 'infracciones',
    subcategory: 'estacionamiento',
    questions: [
      '¿Qué pasa si me estaciono en lugar prohibido?',
      'multa por estacionarse mal',
      'me estacioné en banqueta',
      'estacionamiento prohibido multa',
      'doble fila multa',
      'que infraccion cometo si me subo a la banqueta',
      'dejo mi vehiculo en la banqueta',
      'estacionar en acera multa',
      'multa por estacionar en banqueta',
      'infraccion banqueta vehiculo',
      'subirse a la banqueta con el carro'
    ],
    answer: 'Estacionarse en **lugar prohibido** tiene estas consecuencias:\n\n📋 **Por tipo de infracción:**\n• **Banqueta/acera:** 10-15 días de salario mínimo\n• **Doble fila:** 10-20 días de salario\n• **Lugar para discapacitados:** 20-30 días\n• **Frente a hidrante:** 15-20 días\n• **Cochera ajena:** 10-15 días\n\n🚛 **Además:**\n• Grúa puede llevarse tu vehículo\n• Costo de grúa: $500-1,500 MXN\n• Costo diario de corralón: $100-300 MXN\n\n📍 Recuperar del corralón requiere pagar todo.\n\n⚠️ **Estacionar en banqueta** también pone en riesgo a peatones y es una falta grave.',
    shortAnswer: 'Banqueta: multa de 10-15 días de salario + grúa ($500-1,500) + corralón ($100-300/día).',
    keywords: ['estacionar', 'prohibido', 'banqueta', 'doble fila', 'grúa', 'corralón', 'acera', 'infraccion'],
    relatedTopics: ['grua_corralon', 'senal_no_estacionar'],
    severity: 'warning'
  },
  {
    id: 'uso_celular',
    category: 'infracciones',
    subcategory: 'distracciones',
    questions: [
      '¿Puedo usar el celular mientras manejo?',
      'multa por usar celular',
      'teléfono mientras conduzco',
      '¿Es legal usar celular en el carro?'
    ],
    answer: 'Usar el **celular mientras conduces** está **PROHIBIDO**:\n\n📱 **Regulación:**\n• Solo se permite con **manos libres** (hands-free)\n• Prohibido tenerlo en la mano\n• Prohibido escribir mensajes\n• Prohibido ver videos\n\n📋 **Consecuencias:**\n• **Multa:** 5-20 días de salario mínimo\n• **Puntos:** 2-3 puntos en licencia\n\n⚠️ El uso del celular es causa del **25% de accidentes**.\n📍 Si causas accidente usando celular = agravante.',
    shortAnswer: 'Prohibido usar celular en la mano. Multa de 5-20 días. Solo hands-free permitido.',
    keywords: ['celular', 'teléfono', 'manos', 'prohibido', 'distracción'],
    relatedTopics: ['distracciones_manejo', 'accidente_culpable'],
    severity: 'warning'
  },
  {
    id: 'cinturon_seguridad',
    category: 'infracciones',
    subcategory: 'seguridad',
    questions: [
      '¿Es obligatorio el cinturón de seguridad?',
      'multa por no usar cinturón',
      '¿Tienen que usar cinturón los pasajeros?',
      'cinturón de seguridad obligatorio'
    ],
    answer: 'El **cinturón de seguridad es OBLIGATORIO** para todos:\n\n👥 **Quién debe usarlo:**\n• Conductor (siempre)\n• Todos los pasajeros\n• Asientos delanteros y traseros\n\n👶 **Menores de edad:**\n• 0-12 años: Silla de retención infantil\n• Menores de 12 años: Asiento trasero obligatorio\n\n📋 **Multa por no usarlo:**\n• **5-15 días de salario mínimo**\n• El conductor es responsable de que todos lo usen\n\n💡 Reduce 50% el riesgo de muerte en accidentes.',
    shortAnswer: 'Obligatorio para todos. Multa de 5-15 días. Menores requieren silla especial.',
    keywords: ['cinturón', 'seguridad', 'obligatorio', 'pasajeros', 'niños'],
    relatedTopics: ['silla_infantil', 'seguridad_vial'],
    severity: 'warning'
  },

  // ============================================================
  // CATEGORÍA: ALCOHOL Y DROGAS
  // ============================================================
  {
    id: 'limite_alcohol',
    category: 'alcohol',
    subcategory: 'limites',
    questions: [
      '¿Cuánto alcohol puedo tener para manejar?',
      'límite de alcohol permitido',
      '¿Cuántas cervezas puedo tomar?',
      'alcoholemia permitida',
      'nivel de alcohol legal'
    ],
    answer: 'El **límite de alcohol** permitido para conducir es:\n\n🍺 **Límites legales:**\n• **0.4 g/L en sangre** (mayoría de estados)\n• **0.2 mg/L en aire espirado** (alcoholímetro)\n• Algunos estados: **TOLERANCIA CERO** (0.0)\n\n📊 **Aproximadamente:**\n• 1-2 cervezas pueden ponerte cerca del límite\n• Depende de peso, sexo, si comiste, etc.\n\n⚠️ **Recomendación:** Si vas a manejar, NO tomes nada.\n📍 Es mejor usar taxi/Uber que arriesgarte.',
    shortAnswer: '0.4 g/L en sangre (0.2 mg/L en aire). Algunos estados tienen tolerancia cero.',
    keywords: ['alcohol', 'límite', 'permitido', 'sangre', 'cerveza', 'copa'],
    relatedTopics: ['alcoholimetro', 'manejar_ebrio'],
    legalReference: 'Reglamentos de Tránsito Estatales',
    severity: 'critical'
  },
  {
    id: 'manejar_ebrio',
    category: 'alcohol',
    subcategory: 'infracciones',
    questions: [
      '¿Qué pasa si me detienen por manejar borracho?',
      'conducir ebrio consecuencias',
      'me agarraron en alcoholímetro',
      'multa por manejar tomado',
      'qué pasa si manejo alcoholizado'
    ],
    answer: 'Si te **detienen por conducir bajo efectos del alcohol**:\n\n🚨 **Consecuencias inmediatas:**\n• **Arresto:** 20-36 horas en separos\n• **Multa:** 20-100 días de salario mínimo\n• **Vehículo:** Al corralón\n• **Licencia:** Suspensión 1-3 años\n\n⚖️ **Si te niegas al alcoholímetro:**\n• Multa máxima automática\n• Se asume que excedías el límite\n\n🚑 **Si causas accidente:**\n• Cargos penales por lesiones/homicidio\n• Cárcel de 3-12 años\n• Responsabilidad civil total',
    shortAnswer: 'Arresto 20-36 hrs, multa 20-100 días salario, vehículo al corralón, suspensión de licencia.',
    keywords: ['ebrio', 'borracho', 'alcohol', 'detienen', 'arresto', 'multa'],
    relatedTopics: ['limite_alcohol', 'alcoholimetro', 'accidente_alcohol'],
    severity: 'critical'
  },
  {
    id: 'alcoholimetro',
    category: 'alcohol',
    subcategory: 'procedimientos',
    questions: [
      '¿Cómo funciona el alcoholímetro?',
      '¿Puedo negarme al alcoholímetro?',
      'operativo alcoholímetro',
      'qué pasa en el alcoholímetro',
      'derechos en alcoholímetro'
    ],
    answer: 'Sobre los **operativos de alcoholímetro**:\n\n🔍 **El procedimiento:**\n1. Te detienen en punto de revisión\n2. Te piden soplar en el dispositivo\n3. Mide alcohol en aire espirado\n4. Si excedes 0.2 mg/L = infracción\n\n⚖️ **Tus derechos:**\n• Solicitar que el equipo esté calibrado\n• Pedir segunda prueba\n• Llamar a un familiar\n• Trato digno y respetuoso\n\n🚫 **Si te niegas:**\n• Se aplica multa máxima automática\n• Se asume que excedías el límite\n\n📍 Los operativos son legales y aleatorios.',
    shortAnswer: 'Mide alcohol en tu aliento. Si excedes 0.2 mg/L es infracción. Negarte = multa máxima.',
    keywords: ['alcoholímetro', 'operativo', 'soplar', 'prueba', 'derechos'],
    relatedTopics: ['limite_alcohol', 'manejar_ebrio', 'derechos_conductor'],
    severity: 'info'
  },

  // ============================================================
  // CATEGORÍA: DOCUMENTACIÓN
  // ============================================================
  {
    id: 'documentos_obligatorios',
    category: 'documentacion',
    subcategory: 'requeridos',
    questions: [
      '¿Qué documentos debo llevar al manejar?',
      'documentos obligatorios para conducir',
      '¿Qué papeles necesito en el carro?',
      'documentación vehicular',
      'que documentos debo mostrar',
      'cuales son los documentos obligatorios',
      'me detuvieron que documentos piden',
      'me pararon que papeles necesito',
      'que documentos llevo en el auto',
      'documentos que pide transito',
      'me han detenido que documentos mostrar',
      'documentos requeridos para circular'
    ],
    answer: 'Los **documentos obligatorios** para circular son:\n\n📋 **Del conductor:**\n• **Licencia de conducir** vigente\n• **Identificación oficial** (INE)\n\n🚗 **Del vehículo:**\n• **Tarjeta de circulación** vigente\n• **Verificación vehicular** (donde aplique)\n• **Póliza de seguro** vigente (obligatoria desde 2019)\n• **Tenencia pagada** (según estado)\n\n⚠️ **Si no los tienes:**\n• Multa de 10-30 días de salario mínimo\n• Posible retención del vehículo\n\n💡 Puedes portar versiones digitales en algunos estados.',
    shortAnswer: 'Licencia vigente, INE, tarjeta de circulación, verificación, seguro y tenencia.',
    keywords: ['documentos', 'obligatorios', 'licencia', 'tarjeta', 'circulación', 'seguro', 'papeles', 'mostrar', 'detenido', 'piden'],
    relatedTopics: ['licencia_vencida', 'seguro_obligatorio'],
    severity: 'info'
  },
  {
    id: 'licencia_vencida',
    category: 'documentacion',
    subcategory: 'licencia',
    questions: [
      '¿Qué pasa si mi licencia está vencida?',
      'multa por licencia vencida',
      'manejar sin licencia vigente',
      'licencia expirada consecuencias'
    ],
    answer: 'Manejar con **licencia vencida** tiene consecuencias:\n\n📋 **Multa:**\n• **10-20 días de salario mínimo**\n• En algunos estados hasta 30 días\n\n🚗 **Adicional:**\n• Retención del vehículo hasta presentar licencia vigente\n• El seguro puede no cubrirte en accidente\n\n💡 **Recomendación:**\n• Renueva antes de que venza\n• Algunos estados dan período de gracia (30-60 días)\n• Puedes renovar hasta 6 meses antes',
    shortAnswer: 'Multa de 10-20 días salario, posible retención del vehículo. El seguro puede no cubrirte.',
    keywords: ['licencia', 'vencida', 'expirada', 'multa', 'renovar'],
    relatedTopics: ['documentos_obligatorios', 'sin_licencia'],
    severity: 'warning'
  },
  {
    id: 'sin_licencia',
    category: 'documentacion',
    subcategory: 'licencia',
    questions: [
      '¿Qué pasa si manejo sin licencia?',
      'multa por no tener licencia',
      'conducir sin licencia',
      'manejar sin permiso de conducir'
    ],
    answer: 'Manejar **sin licencia** es una infracción grave:\n\n🚨 **Consecuencias:**\n• **Multa:** 20-40 días de salario mínimo\n• **Vehículo:** Retención inmediata al corralón\n• **No recuperas** el vehículo sin licencia válida\n\n⚠️ **Si nunca has tenido licencia:**\n• Podrían considerarlo delito en algunos estados\n• Si causas accidente = agravante penal\n\n📍 Siempre porta tu licencia física o digital.',
    shortAnswer: 'Multa de 20-40 días salario y retención del vehículo. Sin licencia no lo recuperas.',
    keywords: ['sin', 'licencia', 'multa', 'conducir', 'manejar'],
    relatedTopics: ['licencia_vencida', 'documentos_obligatorios'],
    severity: 'critical'
  },
  {
    id: 'seguro_obligatorio',
    category: 'documentacion',
    subcategory: 'seguro',
    questions: [
      '¿Es obligatorio tener seguro de auto?',
      'multa por no tener seguro',
      'seguro vehicular obligatorio',
      '¿Necesito seguro para circular?'
    ],
    answer: 'El **seguro de auto es OBLIGATORIO** desde 2019:\n\n📋 **Lo que dice la ley:**\n• Mínimo: Seguro de responsabilidad civil\n• Debe cubrir daños a terceros\n• Vigente y a tu nombre\n\n💰 **Multa por no tenerlo:**\n• **20-40 días de salario mínimo**\n• Retención del vehículo en algunos estados\n\n⚠️ **En caso de accidente sin seguro:**\n• Pagas TODO de tu bolsillo\n• Responsabilidad civil completa\n• Pueden embargar tus bienes',
    shortAnswer: 'Sí, es obligatorio desde 2019. Multa de 20-40 días salario si no lo tienes.',
    keywords: ['seguro', 'obligatorio', 'responsabilidad', 'civil', 'póliza'],
    relatedTopics: ['documentos_obligatorios', 'accidente_sin_seguro'],
    severity: 'warning'
  },

  // ============================================================
  // CATEGORÍA: ACCIDENTES
  // ============================================================
  {
    id: 'que_hacer_accidente',
    category: 'accidentes',
    subcategory: 'procedimientos',
    questions: [
      '¿Qué debo hacer si tengo un accidente?',
      'tuve un choque qué hago',
      'pasos después de un accidente',
      'accidente de tránsito qué hacer',
      'me chocaron qué hago'
    ],
    answer: 'Si tienes un **accidente de tránsito**, sigue estos pasos:\n\n🚨 **Inmediatamente:**\n1. **Detente** - Nunca huyas del lugar\n2. **Verifica lesionados** - Llama al 911 si hay heridos\n3. **Enciende intermitentes** - Señaliza el accidente\n4. **Muévete si es posible** - Sal del carril si no hay lesionados\n\n📋 **Documentación:**\n5. **Toma fotos** - Daños, placas, lugar\n6. **Intercambia datos** - Nombre, teléfono, aseguradora\n7. **Llama a tu seguro** - Reporta el siniestro\n8. **Espera al ajustador** - No firmes nada sin él\n\n⚖️ **Si hay lesionados:**\n• No muevas a las víctimas\n• Espera a las autoridades\n• Coopera pero no admitas culpa',
    shortAnswer: 'Detente, verifica lesionados, llama 911 si es necesario, toma fotos, intercambia datos, llama al seguro.',
    keywords: ['accidente', 'choque', 'qué hacer', 'pasos', 'procedimiento'],
    relatedTopics: ['accidente_con_heridos', 'seguro_obligatorio', 'huir_accidente'],
    severity: 'critical'
  },
  {
    id: 'accidente_con_heridos',
    category: 'accidentes',
    subcategory: 'graves',
    questions: [
      '¿Qué pasa si hay heridos en un accidente?',
      'accidente con lesionados',
      'atropellé a alguien qué hago',
      'accidente grave consecuencias'
    ],
    answer: 'Un **accidente con heridos** tiene implicaciones penales:\n\n🚑 **Acción inmediata:**\n1. Llama al **911** inmediatamente\n2. **NO muevas** a los heridos (puede empeorar lesiones)\n3. **Permanece** en el lugar - HUIR es delito grave\n4. **Auxilia** en lo posible sin poner en riesgo\n\n⚖️ **Consecuencias legales:**\n• **Lesiones leves:** 3 meses - 2 años de prisión\n• **Lesiones graves:** 2-6 años de prisión\n• **Homicidio culposo:** 3-12 años de prisión\n\n📋 **Factores agravantes:**\n• Alcohol/drogas\n• Exceso de velocidad\n• Uso de celular\n• Huir del lugar',
    shortAnswer: 'Llama 911, no muevas heridos, NO huyas. Lesiones = 3 meses-6 años cárcel. Homicidio = 3-12 años.',
    keywords: ['heridos', 'lesionados', 'accidente', 'grave', 'penal', 'cárcel'],
    relatedTopics: ['que_hacer_accidente', 'huir_accidente', 'homicidio_culposo'],
    severity: 'critical'
  },
  {
    id: 'huir_accidente',
    category: 'accidentes',
    subcategory: 'delitos',
    questions: [
      '¿Qué pasa si huyo de un accidente?',
      'escapar después de choque',
      'no me detuve después del accidente',
      'huir de accidente consecuencias',
      'que hacer si me atropellaron y huyeron',
      'me atropellaron y se dieron a la fuga',
      'atropellado y el conductor huyo',
      'peaton atropellado fuga',
      'vehiculo me atropello y se fue',
      'caminando me atropellaron',
      'me chocaron y se fueron'
    ],
    answer: '**HUIR de un accidente** es un DELITO grave:\n\n🚨 **Consecuencias para quien huye:**\n• **Sin heridos:** Multa agravada + posible cárcel\n• **Con heridos:** 3-8 años de prisión adicionales\n• **Con fallecidos:** 5-15 años de prisión\n\n⚖️ **Cargos adicionales:**\n• Omisión de auxilio\n• Abandono de persona\n• Evasión de responsabilidad\n\n📍 **Te van a encontrar:**\n• Cámaras de vigilancia\n• Testigos\n• Evidencia en tu vehículo\n\n⚠️ SIEMPRE detente. Huir empeora TODO.',
    shortAnswer: 'Es delito grave. Sin heridos = multa agravada. Con heridos = 3-8 años extra. SIEMPRE detente.',
    keywords: ['huir', 'escapar', 'accidente', 'delito', 'omisión', 'auxilio', 'fuga', 'atropello', 'atropellado'],
    relatedTopics: ['accidente_con_heridos', 'que_hacer_accidente', 'victima_atropello'],
    severity: 'critical'
  },

  // NUEVO: Víctima de atropello
  {
    id: 'victima_atropello',
    category: 'accidentes',
    subcategory: 'victimas',
    questions: [
      'me atropellaron que hago',
      'fui atropellado que debo hacer',
      'un carro me atropello',
      'vehiculo me golpeo mientras caminaba',
      'que hacer si me atropellan',
      'atropellado como peaton',
      'me atropellaron y el conductor huyo',
      'atropellado en la calle',
      'accidente como peaton',
      'fui victima de atropello'
    ],
    answer: 'Si fuiste **ATROPELLADO** como peatón, sigue estos pasos:\n\n🚑 **Inmediatamente:**\n1. **No te muevas** si tienes dolor en cuello/espalda\n2. **Llama al 911** o pide que alguien llame\n3. **Toma nota** de la placa del vehículo si puedes\n4. **Busca testigos** que puedan dar su testimonio\n\n📋 **Si el conductor huyó:**\n• Reporta a la policía inmediatamente\n• Describe el vehículo (color, modelo, dirección)\n• Busca cámaras de vigilancia en la zona\n• Pide datos de testigos\n\n⚖️ **Tus derechos:**\n• Atención médica de emergencia\n• Indemnización por daños\n• El conductor que huye comete delito grave\n\n📞 **Números de emergencia:**\n• 911 - Emergencias generales\n• Cruz Roja - Ambulancias',
    shortAnswer: 'Llama al 911, no te muevas si hay dolor en espalda/cuello, anota la placa del vehículo, busca testigos.',
    keywords: ['atropellado', 'atropello', 'peaton', 'caminando', 'golpeado', 'victima', 'carro', 'vehiculo', 'fuga'],
    relatedTopics: ['huir_accidente', 'accidente_con_heridos', 'que_hacer_accidente'],
    severity: 'critical'
  },

  // ============================================================
  // CATEGORÍA: DERECHOS DEL CONDUCTOR
  // ============================================================
  {
    id: 'derechos_detencion',
    category: 'derechos',
    subcategory: 'durante_detencion',
    questions: [
      '¿Cuáles son mis derechos si me detiene tránsito?',
      'derechos del conductor',
      'me paró un policía qué hago',
      'derechos cuando te detienen'
    ],
    answer: 'Tus **DERECHOS** cuando te detiene un agente de tránsito:\n\n✅ **Tienes derecho a:**\n• Conocer el **motivo** de la detención\n• Ver la **identificación** del oficial\n• Recibir trato **digno y respetuoso**\n• **No ser extorsionado** (no pagues "mordidas")\n• Recibir **boleta de infracción** oficial\n• **Llamar** a un familiar o abogado\n• **No bajar** del vehículo (salvo casos específicos)\n\n🚫 **El agente NO puede:**\n• Quitarte las llaves\n• Retener documentos sin boleta\n• Obligarte a pagar en efectivo\n• Amenazarte o intimidarte\n\n📞 Denuncia abusos: 089 o Contraloría local.',
    shortAnswer: 'Derecho a: saber el motivo, ver identificación del oficial, trato digno, boleta oficial, llamar familiar.',
    keywords: ['derechos', 'conductor', 'detención', 'policía', 'tránsito', 'agente'],
    relatedTopics: ['extorsion_policial', 'boleta_infraccion'],
    severity: 'info'
  },
  {
    id: 'extorsion_policial',
    category: 'derechos',
    subcategory: 'abusos',
    questions: [
      '¿Qué hago si el policía me pide dinero?',
      'me quieren extorsionar',
      'mordida policia tránsito',
      'corrupción policial qué hacer'
    ],
    answer: 'Si un agente intenta **extorsionarte** ("mordida"):\n\n🛡️ **Qué hacer:**\n1. **Mantén la calma** - No te alteres\n2. **Pide su identificación** - Nombre y número de placa\n3. **Solicita boleta oficial** - Es tu derecho\n4. **No pagues en efectivo** - Las multas se pagan en banco\n5. **Graba si puedes** - Es legal grabar en vía pública\n\n📞 **Denuncia:**\n• Locatel: 56 58 11 11 (CDMX)\n• Línea ética: 089\n• Contraloría de tu estado\n• Asuntos internos de tránsito\n\n💡 Di: "Prefiero la boleta oficial, la pagaré en el banco"',
    shortAnswer: 'Mantén calma, pide identificación y boleta oficial. Denuncia al 089 o Contraloría.',
    keywords: ['extorsión', 'mordida', 'corrupción', 'policía', 'denuncia'],
    relatedTopics: ['derechos_detencion', 'pagar_multas'],
    severity: 'warning'
  },
  {
    id: 'impugnar_multa',
    category: 'derechos',
    subcategory: 'recursos',
    questions: [
      '¿Cómo puedo impugnar una multa?',
      'no estoy de acuerdo con mi multa',
      'apelar multa de tránsito',
      'multa injusta qué hacer'
    ],
    answer: 'Para **impugnar una multa** de tránsito:\n\n📋 **Pasos a seguir:**\n1. **No pagues** la multa todavía\n2. **Reúne evidencia** - Fotos, testigos, documentos\n3. **Presenta recurso** en Juzgado Cívico (15-30 días)\n4. **Expón tu caso** ante el juez\n5. **Espera resolución**\n\n📄 **Documentos necesarios:**\n• Boleta de infracción original\n• Identificación oficial\n• Evidencia que respalde tu caso\n• Escrito de inconformidad\n\n⚖️ **Causas válidas de impugnación:**\n• Error en los datos\n• Señalización inexistente o confusa\n• Abuso de autoridad\n• Procedimiento irregular',
    shortAnswer: 'No pagues, reúne evidencia, presenta recurso en Juzgado Cívico dentro de 15-30 días.',
    keywords: ['impugnar', 'apelar', 'multa', 'recurso', 'inconformidad'],
    relatedTopics: ['derechos_detencion', 'pagar_multas'],
    severity: 'info'
  },

  // ============================================================
  // CATEGORÍA: PAGOS Y TRÁMITES
  // ============================================================
  {
    id: 'pagar_multas',
    category: 'tramites',
    subcategory: 'pagos',
    questions: [
      '¿Cómo pago una multa de tránsito?',
      'dónde pagar multas',
      'pago de infracciones',
      'multa de tránsito cómo pagar'
    ],
    answer: 'Para **pagar una multa** de tránsito:\n\n💳 **Opciones de pago:**\n• **En línea:** Portal de la Secretaría de Finanzas de tu estado\n• **Banco:** Con la línea de captura de la boleta\n• **Tiendas:** Oxxo, 7-Eleven (algunos estados)\n• **Oficinas:** Secretaría de Movilidad/Tránsito\n\n📋 **Necesitas:**\n• Número de boleta/folio\n• Placa del vehículo\n• Forma de pago\n\n💡 **Descuentos:**\n• Pago anticipado: 50% descuento (primeros 10-15 días)\n• Algunos estados tienen días de descuento especiales\n\n⚠️ No pagar puede resultar en recargos o impedimento para tramitar.',
    shortAnswer: 'En línea, banco o tiendas con número de boleta. Pago anticipado = 50% descuento.',
    keywords: ['pagar', 'multa', 'infracción', 'descuento', 'banco', 'línea'],
    relatedTopics: ['impugnar_multa', 'grua_corralon'],
    severity: 'info'
  },
  {
    id: 'grua_corralon',
    category: 'tramites',
    subcategory: 'corralon',
    questions: [
      '¿Cómo saco mi carro del corralón?',
      'se llevaron mi carro la grúa',
      'recuperar vehículo del corralón',
      'costo corralón'
    ],
    answer: 'Para **recuperar tu vehículo del corralón**:\n\n📋 **Documentos necesarios:**\n• Identificación oficial (INE)\n• Tarjeta de circulación\n• Comprobante de domicilio\n• Pago de multa(s) pendientes\n• Pago de grúa y pensión diaria\n\n💰 **Costos aproximados:**\n• Servicio de grúa: $500 - $1,500 MXN\n• Pensión diaria: $100 - $300 MXN por día\n• Multa correspondiente\n\n📍 **Pasos:**\n1. Localiza tu vehículo (llama a tránsito)\n2. Paga la multa en banco\n3. Ve al corralón con documentos\n4. Paga grúa y pensión\n5. Revisa tu vehículo antes de retirarlo\n\n⚠️ Actúa rápido - cada día cuesta más.',
    shortAnswer: 'Necesitas: INE, tarjeta circulación, pago de multa, grúa ($500-1500) y pensión diaria ($100-300).',
    keywords: ['corralón', 'grúa', 'recuperar', 'vehículo', 'pensión', 'costo'],
    relatedTopics: ['estacionar_prohibido', 'pagar_multas'],
    severity: 'info'
  },

  // ============================================================
  // CATEGORÍA: PREGUNTAS GENERALES / CONVERSACIÓN
  // ============================================================
  {
    id: 'que_es_lexia',
    category: 'general',
    subcategory: 'sobre_lexia',
    questions: [
      '¿Qué es LexIA?',
      '¿Qué puedes hacer?',
      '¿En qué me puedes ayudar?',
      '¿Quién eres?',
      'para qué sirves'
    ],
    answer: 'Soy **LexIA**, tu asistente legal de tránsito. 🚗⚖️\n\n📚 **Puedo ayudarte con:**\n• Información sobre señales de tránsito\n• Límites de velocidad y sus consecuencias\n• Multas e infracciones\n• Qué hacer en caso de accidente\n• Tus derechos como conductor\n• Documentación necesaria\n• Cómo pagar multas o impugnarlas\n\n💡 Pregúntame lo que necesites sobre tránsito y leyes viales.',
    shortAnswer: 'Soy LexIA, tu asistente legal de tránsito. Te ayudo con multas, señales, accidentes y derechos.',
    keywords: ['lexia', 'qué', 'eres', 'ayudar', 'hacer', 'sirves'],
    relatedTopics: [],
    severity: 'info'
  },
  {
    id: 'saludo',
    category: 'general',
    subcategory: 'conversacion',
    questions: [
      'hola',
      'buenos días',
      'buenas tardes',
      'buenas noches',
      'hey',
      'qué tal',
      'saludos'
    ],
    answer: '¡Hola! 👋 Soy LexIA, tu asistente legal de tránsito.\n\n¿En qué puedo ayudarte hoy? Puedes preguntarme sobre:\n• 🚦 Señales de tránsito\n• ⚡ Multas e infracciones\n• 🚗 Documentación vehicular\n• ⚖️ Tus derechos como conductor',
    shortAnswer: '¡Hola! Soy LexIA. ¿En qué puedo ayudarte con temas de tránsito?',
    keywords: ['hola', 'buenos', 'días', 'tardes', 'noches', 'saludos'],
    relatedTopics: ['que_es_lexia'],
    severity: 'info'
  },
  {
    id: 'gracias',
    category: 'general',
    subcategory: 'conversacion',
    questions: [
      'gracias',
      'muchas gracias',
      'te lo agradezco',
      'thanks',
      'muy amable'
    ],
    answer: '¡De nada! 😊 Me alegra poder ayudarte.\n\nSi tienes más preguntas sobre tránsito, no dudes en consultarme. ¡Estoy aquí para ayudarte!',
    shortAnswer: '¡De nada! Estoy aquí si necesitas más ayuda.',
    keywords: ['gracias', 'agradezco', 'thanks', 'amable'],
    relatedTopics: [],
    severity: 'info'
  },
  {
    id: 'como_estas',
    category: 'general',
    subcategory: 'conversacion',
    questions: [
      '¿cómo estás?',
      'cómo te encuentras',
      'qué onda',
      'cómo vas',
      'qué hay de nuevo'
    ],
    answer: '¡Muy bien, gracias por preguntar! 😊\n\nComo asistente de IA, siempre estoy listo para ayudarte con tus consultas sobre tránsito. ¿En qué puedo asistirte hoy?',
    shortAnswer: '¡Muy bien! ¿En qué puedo ayudarte?',
    keywords: ['cómo', 'estás', 'encuentras', 'onda', 'vas'],
    relatedTopics: ['que_es_lexia'],
    severity: 'info'
  }
];

// Función para obtener todas las categorías disponibles
export function getCategories(): string[] {
  const categories = new Set(KNOWLEDGE_BASE.map(entry => entry.category));
  return Array.from(categories);
}

// Función para obtener entradas por categoría
export function getEntriesByCategory(category: string): KnowledgeEntry[] {
  return KNOWLEDGE_BASE.filter(entry => entry.category === category);
}

// Función para obtener temas relacionados
export function getRelatedTopics(entryId: string): KnowledgeEntry[] {
  const entry = KNOWLEDGE_BASE.find(e => e.id === entryId);
  if (!entry) return [];
  
  return KNOWLEDGE_BASE.filter(e => entry.relatedTopics.includes(e.id));
}

// Función para búsqueda simple por keywords
export function searchByKeywords(query: string): KnowledgeEntry[] {
  const queryWords = query.toLowerCase().split(/\s+/);
  
  return KNOWLEDGE_BASE
    .map(entry => {
      let score = 0;
      for (const word of queryWords) {
        if (entry.keywords.some(k => k.includes(word) || word.includes(k))) {
          score++;
        }
        if (entry.questions.some(q => q.toLowerCase().includes(word))) {
          score += 0.5;
        }
      }
      return { entry, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.entry);
}
