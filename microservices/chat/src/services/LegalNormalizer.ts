export interface ContextoDetectado {
  culpabilidad: 'usuario_culpable' | 'usuario_victima' | 'ambiguo' | 'ninguno';
  urgencia: 'alta' | 'media' | 'baja';
  emocion: 'enojado' | 'preocupado' | 'neutral' | 'frustrado' | 'desesperado';
  tieneTestigos: boolean;
  llamoAutoridades: boolean;
  hayHeridos: boolean;
  actores: string[]; // ['yo', 'otro_conductor', 'policia', etc.]
}

export class LegalNormalizer {
  private slangMap: Record<string, string> = {
    // === ACCIONES VIOLENTAS / CHOQUES ===
    'se paso de verga': 'conducta imprudente grave',
    'se pasó de verga': 'conducta imprudente grave',
    'le lance el carro': 'colisión intencional',
    'le lancé el carro': 'colisión intencional',
    'le lanzo el carro': 'colisión intencional',
    'le di en su madre': 'choque con daños',
    'le di en toda su puta madre': 'choque con daños graves',
    'le di un madrazo': 'choque con daños',
    'le di un putazo': 'choque con daños',
    'le pegué': 'colisión',
    'me pegó': 'colisión recibida',
    'me dio': 'colisión recibida',
    'me chocó': 'colisión recibida',
    'me chingó': 'colisión recibida',
    'nos dimos': 'colisión mutua',
    'chocamos': 'colisión mutua',
    'nos pegamos': 'colisión mutua',
    'me estampó': 'choque violento recibido',
    'lo estampé': 'choque violento causado',
    'le entré': 'colisión causada',
    'me entró': 'colisión recibida',

    // === FUGA / ESCAPE ===
    'se fue': 'fuga del lugar',
    'se peló': 'fuga del lugar',
    'se rajó': 'fuga del lugar',
    'se escapó': 'fuga del lugar',
    'se largó': 'fuga del lugar',
    'se dio a la fuga': 'fuga del lugar',
    'salió corriendo': 'fuga del lugar',
    'huyo': 'fuga del lugar',
    'huyó': 'fuga del lugar',
    'me fui': 'abandoné el lugar',
    'me pelé': 'abandoné el lugar',
    'me rajé': 'abandoné el lugar',
    'me salí': 'abandoné el lugar',
    'no me quedé': 'abandoné el lugar',
    'salí corriendo': 'abandoné el lugar',

    // === AUTORIDADES ===
    'la tira': 'policía de tránsito',
    'los tombos': 'policía',
    'los polis': 'policía',
    'el oficial': 'oficial de tránsito',
    'me paró': 'me detuvo el oficial',
    'me detuvo': 'me detuvo el oficial',
    'me bajó': 'me detuvo el oficial',
    'me llevó': 'fui detenido',
    'me arrestó': 'fui detenido',
    'me multó': 'recibí multa',
    'me puso multa': 'recibí multa',
    'me levantó infracción': 'recibí multa',

    // === ACTORES ===
    'el wey': 'el conductor',
    'el vato': 'el conductor',
    'el man': 'el conductor',
    'el tipo': 'el conductor',
    'el culero': 'el conductor',
    'el pendejo': 'el conductor',
    'la morra': 'la conductora',
    'el cabrón': 'el conductor',
    'un pendejo': 'un conductor',
    'otro wey': 'otro conductor',

    // === ALCOHOL ===
    'estaba pedo': 'bajo influencia del alcohol',
    'estaba borracho': 'bajo influencia del alcohol',
    'andaba tomado': 'bajo influencia del alcohol',
    'había tomado': 'bajo influencia del alcohol',
    'venía pedo': 'conducía bajo influencia',
    'iba borracho': 'conducía bajo influencia',
    'traía unas copas': 'había consumido alcohol',

    // === DAÑOS ===
    'quedó hecho verga': 'daños totales',
    'quedó hecho mierda': 'daños graves',
    'se chingó': 'sufrió daños graves',
    'se jodió': 'sufrió daños graves',
    'se acabó': 'daños totales',
    'se destrozó': 'daños graves',
    'está bien fregado': 'daños considerables',

    // === VELOCIDAD / IMPRUDENCIA ===
    'iba a madres': 'exceso de velocidad',
    'iba volando': 'exceso de velocidad',
    'iba a toda verga': 'exceso de velocidad grave',
    'iba bien rapido': 'exceso de velocidad',
    'iba como loco': 'conducción temeraria',
    'se pasó el alto': 'cruzó semáforo en rojo',
    'se brincó el rojo': 'cruzó semáforo en rojo',
    'no paró': 'no respetó señalamiento',

    // === LESIONES ===
    'se chingó la cabeza': 'lesiones en cabeza',
    'se lastimó': 'resultó lesionado',
    'quedó herido': 'resultó lesionado',
    'salió jodido': 'resultó lesionado',
    'está sangrando': 'presenta hemorragia',
    'está mal': 'presenta lesiones',

    // === VEHÍCULOS ===
    'mi nave': 'mi vehículo',
    'mi carro': 'mi vehículo',
    'mi coche': 'mi vehículo',
    'mi máquina': 'mi vehículo',
    'mi camioneta': 'mi vehículo',
    'mi moto': 'mi motocicleta',

    // === LIMPIAR MULETILLAS ===
    'sas we': '',
    'sas': '',
    'wey': '',
    'güey': '',
    'vato': '',
    'verga': '',
    'puta': '',
    'madre': '',
    'carnal': '',
    'compa': '',
    'la neta': '',

    // === OTROS ===
    'aseguradora': 'seguro',
    'perito': 'perito de tránsito',
    '911': 'auxilio médico 911',
    'corralón': 'depósito vehicular',
    'grúa': 'servicio de grúa'
  };

  /**
   * Normalizar texto con slang a lenguaje legal
   */
  normalize(texto: string): string {
    let t = ` ${texto.toLowerCase()} `;

    // Aplicar todas las transformaciones del diccionario
    for (const [k, v] of Object.entries(this.slangMap)) {
      const pattern = new RegExp(` ${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} `, 'gi');
      t = t.replace(pattern, v ? ` ${v} ` : ' ');
    }

    return t.trim().replace(/\s{2,}/g, ' ');
  }

  /**
   * Detectar contexto completo del mensaje
   */
  detectarContexto(texto: string): ContextoDetectado {
    const textoLower = texto.toLowerCase();

    // Detectar culpabilidad
    let culpabilidad: ContextoDetectado['culpabilidad'] = 'ambiguo';
    const patronesYoCulpable = ['le di', 'le lancé', 'le pegué', 'lo choqué', 'me fui', 'me pelé', 'no me quedé', 'salí corriendo'];
    const patronesYoVictima = ['me dio', 'me chocó', 'me pegó', 'se fue', 'se peló', 'me atropelló'];

    const esCulpable = patronesYoCulpable.some(p => textoLower.includes(p));
    const esVictima = patronesYoVictima.some(p => textoLower.includes(p));

    if (esCulpable && !esVictima) {
      culpabilidad = 'usuario_culpable';
    } else if (esVictima && !esCulpable) {
      culpabilidad = 'usuario_victima';
    } else if (esCulpable && esVictima) {
      culpabilidad = 'ambiguo'; // Ambos se chocaron
    }

    // Detectar urgencia
    let urgencia: ContextoDetectado['urgencia'] = 'baja';
    const patronesUrgencia = ['ahorita', 'ahora', 'justo', 'acaba de', 'hace rato', 'urgente', 'ayuda', 'rápido'];
    const patronesFuga = ['se fue', 'se peló', 'huyó', 'escapó'];
    const patronesLesiones = ['sangr', 'herido', 'lesion', 'golpe', 'fractura'];

    if (patronesUrgencia.some(p => textoLower.includes(p)) ||
        patronesFuga.some(p => textoLower.includes(p)) ||
        patronesLesiones.some(p => textoLower.includes(p))) {
      urgencia = 'alta';
    } else if (textoLower.includes('ayer') || textoLower.includes('hace días') || textoLower.includes('la semana pasada')) {
      urgencia = 'baja';
    } else {
      urgencia = 'media';
    }

    // Detectar emoción
    let emocion: ContextoDetectado['emocion'] = 'neutral';
    const patronesEnojo = ['verga', 'puta', 'culero', 'pendejo', 'cabrón', 'chingada'];
    const patronesPreocupacion = ['preocup', 'nerv', 'miedo', 'asust', 'qué hago'];
    const patronesDesesperacion = ['ayuda', 'urgente', 'por favor', 'necesito'];
    const patronesFrustración = ['no sé', 'no entiendo', 'no puedo', 'perdí'];

    const cantidadGroserias = patronesEnojo.filter(p => textoLower.includes(p)).length;
    if (cantidadGroserias >= 3) {
      emocion = 'enojado';
    } else if (patronesDesesperacion.some(p => textoLower.includes(p))) {
      emocion = 'desesperado';
    } else if (patronesPreocupacion.some(p => textoLower.includes(p))) {
      emocion = 'preocupado';
    } else if (patronesFrustración.some(p => textoLower.includes(p))) {
      emocion = 'frustrado';
    }

    // Detectar otros detalles
    const tieneTestigos = /testigo|vieron|grabó|cámara|video/i.test(texto);
    const llamoAutoridades = /llamé.*911|911|policía|tránsito|reporté/i.test(texto);
    const hayHeridos = /herido|lesion|sangr|golpe|fractura|ambulancia/i.test(texto);

    // Detectar actores
    const actores: string[] = [];
    if (/\b(yo|me|mi)\b/i.test(texto)) actores.push('usuario');
    if (/otro|wey|vato|conductor|tipo|man/i.test(texto)) actores.push('otro_conductor');
    if (/polic|tránsito|oficial|tira/i.test(texto)) actores.push('autoridad');
    if (/peatón|persona|ciclista/i.test(texto)) actores.push('tercero');

    return {
      culpabilidad,
      urgencia,
      emocion,
      tieneTestigos,
      llamoAutoridades,
      hayHeridos,
      actores
    };
  }

  /**
   * Construir consulta legal optimizada para RAG
   */
  buildConsultaLegal(textoNormalizado: string, contexto?: ContextoDetectado): string {
    // Detectar elementos clave
    const hasAccidente = /accidente|choque|colisi[oó]n/i.test(textoNormalizado);
    const hasLesionados = /lesionados?|heridos?|lastimados?|hemorragia|fractura/i.test(textoNormalizado);
    const hasFuga = /fuga del lugar|abandoné el lugar|se fue|huy[oó]/i.test(textoNormalizado);
    const hasSeguro = /seguro|aseguradora/i.test(textoNormalizado);
    const hasAlcohol = /alcohol|borracho|pedo|tomado/i.test(textoNormalizado);
    const hasVelocidad = /velocidad|rápido|volando/i.test(textoNormalizado);
    const hasSemaforo = /semáforo|rojo|alto/i.test(textoNormalizado);
    const hasIntencional = /intencional|lancé|le di/i.test(textoNormalizado);

    const claves: string[] = [];

    // Priorizar según urgencia y contexto
    if (hasAccidente) {
      claves.push('accidente de tránsito');

      if (hasLesionados) {
        claves.push('lesionados');
        claves.push('obligación de permanecer');
        claves.push('auxilio médico 911');
      }

      if (hasFuga) {
        claves.push('fuga del lugar');
        claves.push('delito grave');
        claves.push('consecuencias penales');
      }

      if (hasIntencional) {
        claves.push('conducta intencional');
        claves.push('responsabilidad agravada');
      }

      if (hasSeguro) {
        claves.push('seguro vehicular');
        claves.push('reporte a aseguradora');
      }
    }

    if (hasAlcohol) {
      claves.push('conducir bajo influencia');
      claves.push('alcoholimetría');
      claves.push('suspensión de licencia');
    }

    if (hasVelocidad) {
      claves.push('exceso de velocidad');
      claves.push('conducción temeraria');
    }

    if (hasSemaforo) {
      claves.push('cruzar semáforo en rojo');
      claves.push('infracción grave');
    }

    // Agregar contexto de urgencia y culpabilidad si está disponible
    if (contexto) {
      if (contexto.culpabilidad === 'usuario_culpable') {
        claves.push('responsabilidad civil');
        claves.push('sanciones');
      } else if (contexto.culpabilidad === 'usuario_victima') {
        claves.push('derechos de la víctima');
        claves.push('indemnización');
      }

      if (contexto.urgencia === 'alta') {
        claves.unshift('acciones inmediatas'); // Al inicio
      }
    }

    // Siempre incluir base legal fundamental
    const base = 'obligación de permanecer en el lugar; solicitar auxilio 911; cooperar con la autoridad; intercambio de datos';

    // Construir query optimizado
    const consulta = claves.length > 0
      ? `${claves.join('; ')}; ${base}`
      : textoNormalizado;

    return consulta.trim();
  }
}

export const legalNormalizer = new LegalNormalizer();
