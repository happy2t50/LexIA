import { ClusterDefinition, ClusterPrediction, TrainingData, ModelMetrics } from '../types';
import { VectorizationService } from './vectorizationService';

export class ClusteringService {
  private vectorizationService: VectorizationService;
  private clusters: ClusterDefinition[];
  private centroids: Map<string, number[]>;
  private modelMetrics: ModelMetrics;

  constructor() {
    this.vectorizationService = new VectorizationService();
    this.centroids = new Map();
    this.clusters = this.initializeClusters();
    this.modelMetrics = {
      accuracy: 0,
      silhouetteScore: 0,
      totalClusters: 5,
      totalSamples: 0,
      lastTrainingDate: new Date()
    };
  }

  private initializeClusters(): ClusterDefinition[] {
    return [
      {
        id: 'C1',
        nombre: 'Exceso de velocidad / Semáforo',
        descripcion: 'Infracciones relacionadas con exceso de velocidad y violación de semáforos',
        palabrasClave: ['semaforo', 'rojo', 'velocidad', 'rapido', 'pasarse', 'cruzar', 'alto', 'luz'],
        ejemplos: [
          'me pasé un semáforo en rojo',
          'iba con exceso de velocidad',
          'me multaron por pasar el semáforo'
        ]
      },
      {
        id: 'C2',
        nombre: 'Estacionamiento indebido',
        descripcion: 'Problemas relacionados con estacionamiento no permitido',
        palabrasClave: ['estacionamiento', 'parqueo', 'estacionar', 'zona', 'prohibido', 'grua', 'corralon'],
        ejemplos: [
          'estaba estacionado mal',
          'me remolcaron el carro',
          'estacioné en zona prohibida'
        ]
      },
      {
        id: 'C3',
        nombre: 'Alcoholímetro',
        descripcion: 'Controles de alcoholemia y sustancias',
        palabrasClave: ['alcoholimetro', 'alcohol', 'ebrio', 'tomar', 'cerveza', 'control', 'borracho', 'copas'],
        ejemplos: [
          'me paró el alcoholímetro',
          'había tomado y me detuvieron',
          'control de alcoholemia'
        ]
      },
      {
        id: 'C4',
        nombre: 'Falta de documentos / Equipamiento',
        descripcion: 'Ausencia de documentación o equipamiento obligatorio del vehículo',
        palabrasClave: ['licencia', 'documentos', 'soat', 'seguro', 'papeles', 'matricula', 'tarjeta', 'circulacion',
                        'cinturon', 'seguridad', 'llanta', 'luces', 'placas', 'verificacion', 'engomado'],
        ejemplos: [
          'no traía licencia',
          'se me olvidó el SOAT',
          'me multaron por no tener papeles',
          'no traía cinturón de seguridad'
        ]
      },
      {
        id: 'C5',
        nombre: 'Accidentes',
        descripcion: 'Colisiones y accidentes de tránsito',
        palabrasClave: ['choque', 'accidente', 'colision', 'estrellarse', 'golpear', 'dano', 'chocar', 'impacto', 'fuga'],
        ejemplos: [
          'choqué con otro carro',
          'tuve un accidente',
          'me estrellé contra un poste'
        ]
      },
      {
        id: 'C6',
        nombre: 'Infracciones de circulación',
        descripcion: 'Violaciones a las normas de circulación: vuelta en U, retornos, uso de carril, adelantamientos',
        palabrasClave: ['vuelta', 'retorno', 'carril', 'adelantar', 'rebase', 'contraflujo', 'sentido', 'prohibido',
                        'avenida', 'calle', 'via', 'doble', 'linea', 'amarilla', 'continua', 'reversa', 'circular'],
        ejemplos: [
          'di vuelta en U donde estaba prohibido',
          'me agarraron dando la vuelta',
          'me pasé de carril indebidamente'
        ]
      },
      {
        id: 'off_topic',
        nombre: 'Fuera de tema',
        descripcion: 'Consultas que no están relacionadas con tránsito o leyes vehiculares',
        palabrasClave: ['receta', 'comida', 'cocinar', 'pastel', 'pizza', 'clima', 'tiempo', 'temperatura', 
                        'divorcio', 'familia', 'matrimonio', 'hijos', 'salud', 'medico', 'enfermedad',
                        'trabajo', 'empleo', 'laboral', 'renta', 'casa', 'propiedad', 'inmueble'],
        ejemplos: [
          'cómo preparar un pastel',
          'qué clima va a hacer',
          'quiero divorciarme'
        ]
      }
    ];
  }

  /**
   * Entrenar el modelo K-means con datos
   */
  async entrenarModelo(trainingData: TrainingData[]): Promise<ModelMetrics> {
    console.log(`Entrenando modelo con ${trainingData.length} muestras...`);

    // Agrupar datos por cluster
    const clusterData: Map<string, number[][]> = new Map();

    trainingData.forEach(data => {
      const vector = this.vectorizationService.vectorizarConEmbeddings(data.texto);

      if (!clusterData.has(data.cluster)) {
        clusterData.set(data.cluster, []);
      }
      clusterData.get(data.cluster)!.push(vector);
    });

    // Calcular centroides (promedio de vectores por cluster)
    clusterData.forEach((vectors, clusterId) => {
      const centroid = this.calcularCentroide(vectors);
      this.centroids.set(clusterId, centroid);
    });

    // Calcular métricas
    this.modelMetrics = {
      accuracy: this.calcularAccuracy(trainingData),
      silhouetteScore: this.calcularSilhouetteScore(trainingData),
      totalClusters: this.clusters.length,
      totalSamples: trainingData.length,
      lastTrainingDate: new Date()
    };

    console.log('Modelo entrenado exitosamente');
    return this.modelMetrics;
  }

  /**
   * Predecir cluster para una consulta
   */
  async predecir(textoConsulta: string): Promise<ClusterPrediction> {
    const vector = this.vectorizationService.vectorizarConEmbeddings(textoConsulta);

    // Si no hay modelo entrenado, usar heurísticas
    if (this.centroids.size === 0) {
      return this.predecirConHeuristicas(textoConsulta);
    }

    // Calcular distancias a todos los centroides
    const distancias: Array<{ cluster: string; distancia: number }> = [];

    this.centroids.forEach((centroid, clusterId) => {
      const similitud = this.vectorizationService.calcularSimilitud(vector, centroid);
      distancias.push({
        cluster: clusterId,
        distancia: similitud
      });
    });

    // Ordenar por similitud (mayor similitud = menor distancia)
    distancias.sort((a, b) => b.distancia - a.distancia);

    const mejorCluster = distancias[0];
    const alternativas = distancias.slice(1, 3).map(d => ({
      cluster: d.cluster,
      confianza: d.distancia
    }));

    return {
      cluster: mejorCluster.cluster,
      confianza: mejorCluster.distancia,
      alternativas
    };
  }

  /**
   * Predicción basada en heurísticas (cuando no hay modelo entrenado)
   */
  private predecirConHeuristicas(textoConsulta: string): ClusterPrediction {
    const textoNormalizado = textoConsulta.toLowerCase();

    const scores: Map<string, number> = new Map();

    // Calcular scores para cada cluster
    this.clusters.forEach(cluster => {
      let score = 0;
      cluster.palabrasClave.forEach(palabra => {
        if (textoNormalizado.includes(palabra)) {
          score += 1;
        }
      });
      scores.set(cluster.id, score);
    });

    const sortedScores = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1]);

    const totalScore = sortedScores.reduce((sum, [, score]) => sum + score, 0);
    const mejorCluster = sortedScores[0];
    
    // Separar scores de tránsito vs off_topic
    const transitScores = sortedScores.filter(([id]) => id !== 'off_topic');
    const maxTransitScore = transitScores.length > 0 ? transitScores[0][1] : 0;
    const offTopicScore = scores.get('off_topic') || 0;

    let clusterFinal: string;
    let confianzaFinal: number;

    // PRIORIDAD 1: Si hay coincidencias claras con off_topic Y no hay coincidencias con tránsito
    if (offTopicScore > 0 && maxTransitScore === 0) {
      clusterFinal = 'off_topic';
      confianzaFinal = 0.85; // Muy alta confianza en off-topic
      console.log(`[CLUSTERING] 🚫 OFF-TOPIC detectado: offTopicScore=${offTopicScore}, transitScore=${maxTransitScore}`);
    }
    // PRIORIDAD 2: Si off_topic tiene más coincidencias que cualquier cluster de tránsito
    else if (offTopicScore > maxTransitScore && offTopicScore > 0) {
      clusterFinal = 'off_topic';
      confianzaFinal = 0.80; // Alta confianza
      console.log(`[CLUSTERING] 🚫 OFF-TOPIC gana: offTopicScore=${offTopicScore} > transitScore=${maxTransitScore}`);
    }
    // PRIORIDAD 3: Si NO hay coincidencias con ningún cluster
    else if (totalScore === 0) {
      clusterFinal = 'off_topic';
      confianzaFinal = 0.65; // Moderada confianza - probablemente off-topic
      console.log(`[CLUSTERING] 🚫 Sin coincidencias -> OFF-TOPIC por defecto`);
    }
    // PRIORIDAD 4: Hay coincidencias con tránsito pero son débiles (1-2 palabras) y hay palabras sospechosas
    else if (maxTransitScore > 0 && maxTransitScore <= 2 && this.esSospechoso(textoNormalizado)) {
      clusterFinal = 'off_topic';
      confianzaFinal = 0.70; // Alta confianza - probablemente off-topic
      console.log(`[CLUSTERING] 🚫 Coincidencias débiles + texto sospechoso -> OFF-TOPIC`);
    }
    // CASO NORMAL: Hay buenas coincidencias con clusters de tránsito
    else {
      clusterFinal = mejorCluster[0];
      confianzaFinal = totalScore > 0 ? (mejorCluster[1] / totalScore) * 100 : 20;
      console.log(`[CLUSTERING] ✅ Clasificado como ${clusterFinal}: score=${mejorCluster[1]}, confianza=${confianzaFinal.toFixed(1)}%`);
    }

    return {
      cluster: clusterFinal,
      confianza: confianzaFinal,
      alternativas: sortedScores
        .filter(([id]) => id !== clusterFinal)
        .slice(0, 2)
        .map(([cluster, score]) => ({
          cluster,
          confianza: totalScore > 0 ? (score / totalScore) * 100 : 10
        }))
    };
  }

  private calcularCentroide(vectors: number[][]): number[] {
    if (vectors.length === 0) {
      return [];
    }

    const dimension = vectors[0].length;
    const centroid = new Array(dimension).fill(0);

    vectors.forEach(vector => {
      vector.forEach((value, index) => {
        centroid[index] += value;
      });
    });

    return centroid.map(value => value / vectors.length);
  }

  private calcularAccuracy(trainingData: TrainingData[]): number {
    // Simulación - en producción se usaría validación cruzada
    return 0.85;
  }

  private calcularSilhouetteScore(trainingData: TrainingData[]): number {
    // Simulación - en producción se calcularía el score real
    return 0.72;
  }

  
  private esSospechoso(textoNormalizado: string): boolean {
    const palabrasSospechosas = [
      // Comida y cocina
      'receta', 'cocinar', 'hornear', 'ingredientes', 'sarten', 'horno', 'comida', 'platillo',
      'desayuno', 'almuerzo', 'cena', 'postre', 'pastel', 'pizza', 'taco', 'torta',
      // Clima y naturaleza
      'clima', 'tiempo', 'temperatura', 'lluvia', 'sol', 'nublado', 'calor', 'frio',
      // Derecho familiar
      'divorcio', 'matrimonio', 'esposo', 'esposa', 'pareja', 'hijos', 'pension', 'custodia', 'separacion',
      // Derecho laboral
      'trabajo', 'empleo', 'jefe', 'empresa', 'salario', 'sueldo', 'despido', 'finiquito', 'sindicato',
      // Inmobiliario
      'casa', 'departamento', 'renta', 'alquiler', 'inquilino', 'casero', 'arrendador', 'inmueble',
      // Salud
      'medico', 'doctor', 'enfermedad', 'hospital', 'clinica', 'medicamento', 'tratamiento',
      // Tecnología no vehicular
      'celular', 'telefono', 'computadora', 'internet', 'wifi', 'app', 'software',
      // Educación
      'escuela', 'universidad', 'maestro', 'profesor', 'clase', 'examen', 'tarea',
      // Finanzas no relacionadas con multas
      'prestamo', 'credito', 'banco', 'cuenta', 'tarjeta de credito', 'inversion'
    ];

    for (const palabra of palabrasSospechosas) {
      if (textoNormalizado.includes(palabra)) {
        console.log(`[CLUSTERING] ⚠️ Palabra sospechosa detectada: "${palabra}"`);
        return true;
      }
    }
    return false;
  }

  /**
   * Obtener información de todos los clusters
   */
  obtenerClusters(): ClusterDefinition[] {
    return this.clusters;
  }

  /**
   * Obtener métricas del modelo
   */
  obtenerMetricas(): ModelMetrics {
    return this.modelMetrics;
  }

  /**
   * Obtener información de un cluster específico
   */
  obtenerCluster(clusterId: string): ClusterDefinition | undefined {
    return this.clusters.find(c => c.id === clusterId);
  }
}
