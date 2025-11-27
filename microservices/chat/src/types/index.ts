// Tipos para el Chat Service

export interface Message {
  id: string;
  sesionId: string;
  usuarioId: string;
  rol: 'user' | 'assistant' | 'system';
  mensaje: string;
  clusterDetectado?: string;
  embedding?: number[];
  sentimiento?: string;
  intencion?: string;
  contexto?: any;
  metadata?: any;
  fecha: Date;
}

export interface Session {
  id: string;
  usuarioId: string;
  titulo?: string;
  clusterPrincipal?: string;
  totalMensajes: number;
  fechaInicio: Date;
  fechaUltimoMensaje: Date;
  activa: boolean;
}

export interface ChatResponse {
  mensaje: string;
  articulosRelevantes?: ArticuloRelevante[];
  sugerencias?: Sugerencia[];
  cluster?: string;
  sentimiento?: string;
  sessionId: string;
}

export interface ArticuloRelevante {
  titulo: string;
  contenido: string;
  fuente: string;
  similitud: number;
}

export interface Sugerencia {
  tipo: 'abogados' | 'impugnar' | 'pagar' | 'foro' | 'informacion';
  texto: string;
  accion?: string;
}

export interface LawyerRecommendation {
  id: string;
  nombre: string;
  especialidades: string[];
  rating: number;
  experiencia: number;
  casosGanados?: number;
  ciudad: string;
  tarifa?: number;
  scorePersonalizado: number;
  razonRecomendacion: string;
}

export interface UserProfile {
  usuarioId: string;
  cluster: string;
  totalConsultas: number;
  temasFrecuentes: string[];
  embeddingPromedio?: number[];
}

export interface SimilarUser {
  usuarioId: string;
  nombre: string;
  cluster: string;
  similitud: number;
  totalConsultas: number;
}

export interface Feedback {
  tipo: 'valoracion_abogado' | 'like_respuesta' | 'dislike_respuesta' | 'contacto_abogado';
  valoracion?: number;
  comentario?: string;
  abogadoId?: string;
  consultaId?: string;
}

export type Sentimiento = 'preocupado' | 'frustrado' | 'enojado' | 'neutral' | 'positivo' | 'confundido';

export type Intencion =
  | 'consulta_multa'
  | 'queja'
  | 'informacion'
  | 'ayuda'
  | 'buscar_abogado'
  | 'impugnar'
  | 'compartir_experiencia';
