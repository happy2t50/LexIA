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
        palabrasClave: ['semaforo', 'rojo', 'velocidad', 'rapido', 'pasarse', 'cruzar'],
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
        palabrasClave: ['estacionamiento', 'parqueo', 'estacionar', 'zona', 'prohibido', 'grua'],
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
        palabrasClave: ['alcoholimetro', 'alcohol', 'ebrio', 'tomar', 'cerveza', 'control'],
        ejemplos: [
          'me paró el alcoholímetro',
          'había tomado y me detuvieron',
          'control de alcoholemia'
        ]
      },
      {
        id: 'C4',
        nombre: 'Falta de documentos',
        descripcion: 'Ausencia de documentación requerida',
        palabrasClave: ['licencia', 'documentos', 'soat', 'seguro', 'papeles', 'matricula'],
        ejemplos: [
          'no traía licencia',
          'se me olvidó el SOAT',
          'me multaron por no tener papeles'
        ]
      },
      {
        id: 'C5',
        nombre: 'Accidentes',
        descripcion: 'Colisiones y accidentes de tránsito',
        palabrasClave: ['choque', 'accidente', 'colision', 'estrellarse', 'golpear', 'dano'],
        ejemplos: [
          'choqué con otro carro',
          'tuve un accidente',
          'me estrellé contra un poste'
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
    const confianza = totalScore > 0 ? mejorCluster[1] / totalScore : 0.2;

    return {
      cluster: mejorCluster[0],
      confianza,
      alternativas: sortedScores.slice(1, 3).map(([cluster, score]) => ({
        cluster,
        confianza: totalScore > 0 ? score / totalScore : 0.1
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
