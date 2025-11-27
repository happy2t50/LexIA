export interface ClusterDefinition {
  id: string;
  nombre: string;
  descripcion: string;
  palabrasClave: string[];
  ejemplos: string[];
}

export interface ClusterPrediction {
  cluster: string;
  confianza: number;
  alternativas: Array<{
    cluster: string;
    confianza: number;
  }>;
}

export interface TrainingData {
  texto: string;
  cluster: string;
  ciudad?: string;
  tipoUsuario?: string;
  gravedad?: string;
}

export interface ModelMetrics {
  accuracy: number;
  silhouetteScore: number;
  totalClusters: number;
  totalSamples: number;
  lastTrainingDate: Date;
}

export interface VectorizationResult {
  vector: number[];
  tokensCount: number;
}
