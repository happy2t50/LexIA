import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

interface ConsultaOLAP {
  id: string;
  textoConsulta: string;
  usuarioId: string;
  usuario?: {
    id: string;
    tipo: string;
    historialConsultas: string[];
    fechaRegistro: Date;
  };
  ubicacion: {
    ciudad: string;
    barrio?: string;
    coordenadas?: { lat: number; lng: number };
    pais: string;
  };
  tiempo: {
    fecha: Date;
    hora: string;
    diaSemana: string;
    mes: number;
    ano: number;
  };
  tipoInfraccion: {
    id: string;
    categoria: string;
    gravedad: string;
    articuloLegal?: string;
  };
  serviciosRecomendados?: string[];
  clusterAsignado: string;
  gravedadEstimada: string;
  estado: 'respondida' | 'pendiente' | 'derivada';
}

export class OLAPIntegrationService {
  private olapUrl: string;

  constructor(olapUrl: string) {
    this.olapUrl = olapUrl;
  }

  /**
   * Registrar consulta en OLAP Cube para analytics y ML
   */
  async registrarConsulta(params: {
    textoConsulta: string;
    usuarioId: string;
    intencion: string;
    cluster: string;
    sentimiento: string;
    articulosEncontrados: number;
    profesionistasRecomendados: number;
    ubicacion?: { ciudad?: string; barrio?: string };
  }): Promise<void> {
    try {
      const now = new Date();

      const consulta: ConsultaOLAP = {
        id: uuidv4(),
        textoConsulta: params.textoConsulta,
        usuarioId: params.usuarioId,
        usuario: {
          id: params.usuarioId,
          tipo: 'ciudadano',
          historialConsultas: [],
          fechaRegistro: now
        },
        ubicacion: {
          ciudad: params.ubicacion?.ciudad || 'Tuxtla Gutiérrez',
          barrio: params.ubicacion?.barrio || 'Centro',
          pais: 'México'
        },
        tiempo: {
          fecha: now,
          hora: now.toTimeString().substring(0, 5),
          diaSemana: now.toLocaleDateString('es-MX', { weekday: 'long' }),
          mes: now.getMonth() + 1,
          ano: now.getFullYear()
        },
        tipoInfraccion: {
          id: `INF-${params.intencion}`,
          categoria: this.mapIntencionToCategoria(params.intencion),
          gravedad: this.calcularGravedad(params.sentimiento, params.intencion),
          articuloLegal: params.articulosEncontrados > 0 ? 'Múltiples' : 'N/A'
        },
        serviciosRecomendados: params.profesionistasRecomendados > 0 ? ['profesionistas'] : [],
        clusterAsignado: params.cluster || 'general',
        gravedadEstimada: this.calcularGravedad(params.sentimiento, params.intencion),
        estado: 'respondida'
      };

      await axios.post(`${this.olapUrl}/consultas`, consulta, {
        timeout: 5000
      });

      console.log(`📊 OLAP: Consulta registrada [${params.cluster}] para usuario ${params.usuarioId.substring(0, 8)}`);
    } catch (error: any) {
      // No crítico - el OLAP es para analytics, no afecta la respuesta al usuario
      console.log(`⚠️  OLAP registro falló (no crítico):`, error.message);
    }
  }

  /**
   * Obtener historial de consultas del usuario
   * Útil para personalizar respuestas
   */
  async obtenerHistorialUsuario(usuarioId: string): Promise<ConsultaOLAP[]> {
    try {
      const response = await axios.get(`${this.olapUrl}/consultas/usuario/${usuarioId}`, {
        timeout: 3000
      });
      return response.data || [];
    } catch (error) {
      console.log('⚠️  No se pudo obtener historial OLAP (usando fallback)');
      return [];
    }
  }

  /**
   * Obtener cluster predominante del usuario
   * Ejemplo: Si usuario siempre pregunta sobre alcohol → cluster "alcoholimetro"
   */
  async obtenerClusterPredominante(usuarioId: string): Promise<string | null> {
    try {
      const historial = await this.obtenerHistorialUsuario(usuarioId);

      if (historial.length === 0) return null;

      // Contar frecuencia de clusters
      const clusterCounts: Record<string, number> = {};
      historial.forEach(consulta => {
        const cluster = consulta.clusterAsignado || 'general';
        clusterCounts[cluster] = (clusterCounts[cluster] || 0) + 1;
      });

      // Obtener el más frecuente
      let maxCluster = 'general';
      let maxCount = 0;
      Object.entries(clusterCounts).forEach(([cluster, count]) => {
        if (count > maxCount) {
          maxCount = count;
          maxCluster = cluster;
        }
      });

      return maxCount >= 2 ? maxCluster : null; // Al menos 2 consultas del mismo tipo
    } catch (error) {
      return null;
    }
  }

  /**
   * Obtener estadísticas del usuario para personalización
   */
  async obtenerPerfilUsuario(usuarioId: string): Promise<{
    totalConsultas: number;
    clusterPredominante: string | null;
    categoriasRecurrentes: string[];
    ultimaConsulta: Date | null;
  }> {
    try {
      const historial = await this.obtenerHistorialUsuario(usuarioId);

      const categorias: Record<string, number> = {};
      historial.forEach(c => {
        const cat = c.tipoInfraccion.categoria;
        categorias[cat] = (categorias[cat] || 0) + 1;
      });

      const categoriasRecurrentes = Object.entries(categorias)
        .filter(([_, count]) => count >= 2)
        .map(([cat, _]) => cat);

      return {
        totalConsultas: historial.length,
        clusterPredominante: await this.obtenerClusterPredominante(usuarioId),
        categoriasRecurrentes,
        ultimaConsulta: historial.length > 0 ? new Date(historial[0].tiempo.fecha) : null
      };
    } catch (error) {
      return {
        totalConsultas: 0,
        clusterPredominante: null,
        categoriasRecurrentes: [],
        ultimaConsulta: null
      };
    }
  }


  private mapIntencionToCategoria(intencion: string): string {
    const mapa: Record<string, string> = {
      'consulta_alcohol': 'Alcoholímetro',
      'consulta_accidente': 'Accidente de tránsito',
      'consulta_grua': 'Grúa y remolque',
      'consulta_estacionamiento': 'Estacionamiento indebido',
      'consulta_velocidad': 'Exceso de velocidad',
      'consulta_semaforo': 'Semáforo en rojo',
      'consulta_documentos': 'Documentos y licencias',
      'consulta_multa': 'Multas de tránsito',
      'informacion': 'Información general',
      'saludo': 'Saludo/Conversación',
      'despedida': 'Despedida'
    };

    return mapa[intencion] || 'Otra categoría';
  }

  /**
   * Calcular gravedad según sentimiento e intención
   */
  private calcularGravedad(sentimiento: string, intencion: string): string {
    // Infracciones graves por defecto
    const infraccionesGraves = [
      'consulta_alcohol',
      'consulta_accidente'
    ];

    if (infraccionesGraves.includes(intencion)) {
      return 'alta';
    }

    if (sentimiento === 'negativo') {
      return 'media';
    }

    return 'baja';
  }

  /**
   * Obtener recomendaciones basadas en historial
   * Ejemplo: Si usuario tiene 3+ consultas sobre alcohol, sugerir curso prevención
   */
  async obtenerRecomendacionesPersonalizadas(usuarioId: string): Promise<string[]> {
    try {
      const perfil = await this.obtenerPerfilUsuario(usuarioId);
      const recomendaciones: string[] = [];

      // Si tiene muchas consultas sobre alcohol
      if (perfil.categoriasRecurrentes.includes('Alcoholímetro')) {
        recomendaciones.push('curso_prevencion_alcohol');
        recomendaciones.push('abogado_especialista_dui');
      }

      // Si tiene muchas consultas sobre accidentes
      if (perfil.categoriasRecurrentes.includes('Accidente de tránsito')) {
        recomendaciones.push('seguro_automotriz');
        recomendaciones.push('abogado_accidentes');
      }

      // Usuario recurrente
      if (perfil.totalConsultas >= 5) {
        recomendaciones.push('plan_asesoria_mensual');
      }

      return recomendaciones;
    } catch (error) {
      return [];
    }
  }
}
