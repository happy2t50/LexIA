// Adapter PostgreSQL - Repositorio de Consultas para OLAP

import { Pool } from 'pg';
import { ConsultaIncidente, Usuario, Ubicacion, Tiempo } from '../../domain/entities/ConsultaIncidente';
import { IConsultaRepository, OLAPQuery, OLAPResult } from '../../domain/ports/IConsultaRepository';

export class PostgreSQLConsultaRepository implements IConsultaRepository {
  constructor(private readonly pool: Pool) {}

  async guardar(consulta: ConsultaIncidente): Promise<ConsultaIncidente> {
    const query = `
      INSERT INTO consultas (
        id, usuario_id, texto_original, texto_normalizado,
        ciudad, barrio, ubicacion_lat, ubicacion_lng, tipo_usuario,
        cluster_asignado, confianza_cluster, gravedad_estimada,
        estado, fecha_consulta
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const values = [
      consulta.id,
      consulta.usuarioId,
      consulta.textoConsulta,
      consulta.textoConsulta.toLowerCase().trim(), // texto normalizado
      consulta.ubicacion.ciudad,
      consulta.ubicacion.barrio,
      consulta.ubicacion.coordenadas.lat,
      consulta.ubicacion.coordenadas.lng,
      consulta.usuario.tipo,
      consulta.clusterAsignado || null,
      null, // confianza_cluster (se puede agregar después)
      consulta.gravedadEstimada,
      consulta.estado,
      consulta.tiempo.fecha
    ];

    try {
      const result = await this.pool.query(query, values);
      return this.mapToEntity(result.rows[0]);
    } catch (error: any) {
      throw new Error(`Error al guardar consulta: ${error.message}`);
    }
  }

  async obtenerPorId(id: string): Promise<ConsultaIncidente | null> {
    const query = 'SELECT * FROM consultas WHERE id = $1';
    const result = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToEntity(result.rows[0]);
  }

  async obtenerTodas(): Promise<ConsultaIncidente[]> {
    const query = 'SELECT * FROM consultas ORDER BY fecha_consulta DESC LIMIT 1000';
    const result = await this.pool.query(query);

    return result.rows.map(row => this.mapToEntity(row));
  }

  async actualizar(consulta: ConsultaIncidente): Promise<ConsultaIncidente> {
    const query = `
      UPDATE consultas
      SET cluster_asignado = $2, gravedad_estimada = $3, estado = $4
      WHERE id = $1
      RETURNING *
    `;

    const values = [
      consulta.id,
      consulta.clusterAsignado,
      consulta.gravedadEstimada,
      consulta.estado
    ];

    const result = await this.pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Consulta no encontrada');
    }

    return this.mapToEntity(result.rows[0]);
  }

  async eliminar(id: string): Promise<boolean> {
    const query = 'DELETE FROM consultas WHERE id = $1';
    const result = await this.pool.query(query, [id]);

    return (result.rowCount ?? 0) > 0;
  }

  async ejecutarConsultaOLAP(query: OLAPQuery): Promise<OLAPResult> {
    const startTime = Date.now();

    // Construir query SQL dinámicamente
    let sqlQuery = 'SELECT ';

    // Seleccionar dimensiones
    const selectColumns: string[] = [];
    query.dimensions.forEach(dim => {
      selectColumns.push(this.mapDimensionToColumn(dim));
    });

    // Agregar medidas
    query.measures.forEach(measure => {
      if (measure === 'count') {
        selectColumns.push('COUNT(*) as total');
      }
    });

    sqlQuery += selectColumns.join(', ');
    sqlQuery += ' FROM consultas';

    // Aplicar filtros
    const whereConditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (query.filters) {
      for (const [key, value] of Object.entries(query.filters)) {
        const column = this.mapFilterToColumn(key);
        whereConditions.push(`${column} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (whereConditions.length > 0) {
      sqlQuery += ' WHERE ' + whereConditions.join(' AND ');
    }

    // Group by
    if (query.groupBy && query.groupBy.length > 0) {
      const groupByColumns = query.groupBy.map(dim => this.mapDimensionToColumn(dim));
      sqlQuery += ' GROUP BY ' + groupByColumns.join(', ');
    }

    // Order by
    if (query.orderBy) {
      sqlQuery += ` ORDER BY ${query.orderBy}`;
    }

    // Limit
    if (query.limit) {
      sqlQuery += ` LIMIT ${query.limit}`;
    }

    // Ejecutar query
    const result = await this.pool.query(sqlQuery, values);
    const executionTime = Date.now() - startTime;

    return {
      data: result.rows,
      dimensions: query.dimensions,
      totalRecords: result.rows.length,
      executionTime
    };
  }

  async obtenerPorUbicacion(ciudad: string): Promise<ConsultaIncidente[]> {
    const query = 'SELECT * FROM consultas WHERE ciudad = $1 ORDER BY fecha_consulta DESC';
    const result = await this.pool.query(query, [ciudad]);

    return result.rows.map(row => this.mapToEntity(row));
  }

  async obtenerPorTiempo(fechaInicio: Date, fechaFin: Date): Promise<ConsultaIncidente[]> {
    const query = `
      SELECT * FROM consultas
      WHERE fecha_consulta BETWEEN $1 AND $2
      ORDER BY fecha_consulta DESC
    `;
    const result = await this.pool.query(query, [fechaInicio, fechaFin]);

    return result.rows.map(row => this.mapToEntity(row));
  }

  async obtenerPorCluster(cluster: string): Promise<ConsultaIncidente[]> {
    const query = 'SELECT * FROM consultas WHERE cluster_asignado = $1 ORDER BY fecha_consulta DESC';
    const result = await this.pool.query(query, [cluster]);

    return result.rows.map(row => this.mapToEntity(row));
  }

  async obtenerPorUsuario(usuarioId: string): Promise<ConsultaIncidente[]> {
    const query = 'SELECT * FROM consultas WHERE usuario_id = $1 ORDER BY fecha_consulta DESC';
    const result = await this.pool.query(query, [usuarioId]);

    return result.rows.map(row => this.mapToEntity(row));
  }

  async obtenerEstadisticasPorDimension(dimension: string): Promise<any> {
    const column = this.mapDimensionToColumn(dimension);

    const query = `
      SELECT ${column} as dimension, COUNT(*) as total
      FROM consultas
      WHERE ${column} IS NOT NULL
      GROUP BY ${column}
      ORDER BY total DESC
    `;

    const result = await this.pool.query(query);

    return {
      dimension,
      data: result.rows,
      totalRecords: result.rows.length
    };
  }

  // Mapear dimensiones OLAP a columnas de la tabla
  private mapDimensionToColumn(dimension: string): string {
    const mapping: Record<string, string> = {
      'ciudad': 'ciudad',
      'barrio': 'barrio',
      'cluster': 'cluster_asignado',
      'gravedad': 'gravedad_estimada',
      'estado': 'estado',
      'tipo_usuario': 'tipo_usuario',
      'fecha': 'DATE(fecha_consulta)',
      'mes': 'EXTRACT(MONTH FROM fecha_consulta)',
      'ano': 'EXTRACT(YEAR FROM fecha_consulta)'
    };

    return mapping[dimension] || dimension;
  }

  private mapFilterToColumn(filter: string): string {
    const mapping: Record<string, string> = {
      'ubicacion.ciudad': 'ciudad',
      'ubicacion.barrio': 'barrio',
      'clusterAsignado': 'cluster_asignado',
      'gravedadEstimada': 'gravedad_estimada',
      'usuario.tipo': 'tipo_usuario'
    };

    return mapping[filter] || filter;
  }

  // Mapear de DB row a entidad de dominio
  private mapToEntity(row: any): ConsultaIncidente {
    const usuario = new Usuario(
      row.usuario_id,
      row.tipo_usuario || 'conductor',
      [],
      new Date()
    );

    const ubicacion = new Ubicacion(
      row.ciudad || 'Desconocida',
      row.barrio || '',
      {
        lat: parseFloat(row.ubicacion_lat) || 0,
        lng: parseFloat(row.ubicacion_lng) || 0
      },
      'Colombia'
    );

    const tiempo = new Tiempo(
      row.fecha_consulta,
      row.fecha_consulta.toTimeString().slice(0, 5),
      row.fecha_consulta.toLocaleDateString('es', { weekday: 'long' }),
      row.fecha_consulta.getMonth() + 1,
      row.fecha_consulta.getFullYear()
    );

    return new ConsultaIncidente(
      row.id,
      row.texto_original,
      row.usuario_id,
      usuario,
      ubicacion,
      tiempo,
      [],
      row.gravedad_estimada || 'baja',
      row.estado || 'pendiente',
      undefined,
      undefined,
      row.cluster_asignado
    );
  }
}
