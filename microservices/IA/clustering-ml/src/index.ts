import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ClusteringService } from './services/clusteringService';
import { TrainingData } from './types';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

const clusteringService = new ClusteringService();

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', service: 'Clustering ML Service' });
});

// Predecir cluster para una consulta
app.post('/predict', async (req: Request, res: Response) => {
  try {
    const { textoConsulta } = req.body;

    if (!textoConsulta) {
      return res.status(400).json({ error: 'textoConsulta es requerido' });
    }

    const prediction = await clusteringService.predecir(textoConsulta);

    // Enviar resultado al cubo OLAP si está disponible
    try {
      const olapUrl = process.env.OLAP_SERVICE_URL || 'http://localhost:3001';
      await axios.patch(`${olapUrl}/consultas/${req.body.consultaId}/cluster`, {
        cluster: prediction.cluster
      });
    } catch (error) {
      console.log('No se pudo actualizar OLAP:', error);
    }

    res.json(prediction);
  } catch (error) {
    console.error('Error en predicción:', error);
    res.status(500).json({ error: 'Error al predecir cluster' });
  }
});

// Entrenar modelo
app.post('/train', async (req: Request, res: Response) => {
  try {
    const trainingData: TrainingData[] = req.body.data;

    if (!trainingData || !Array.isArray(trainingData)) {
      return res.status(400).json({ error: 'data debe ser un array de TrainingData' });
    }

    const metrics = await clusteringService.entrenarModelo(trainingData);
    res.json({
      message: 'Modelo entrenado exitosamente',
      metrics
    });
  } catch (error) {
    console.error('Error en entrenamiento:', error);
    res.status(500).json({ error: 'Error al entrenar modelo' });
  }
});

// Obtener todos los clusters
app.get('/clusters', (req: Request, res: Response) => {
  try {
    const clusters = clusteringService.obtenerClusters();
    res.json(clusters);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener clusters' });
  }
});

// Obtener un cluster específico
app.get('/clusters/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cluster = clusteringService.obtenerCluster(id);

    if (!cluster) {
      return res.status(404).json({ error: 'Cluster no encontrado' });
    }

    res.json(cluster);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cluster' });
  }
});

// Obtener métricas del modelo
app.get('/metrics', (req: Request, res: Response) => {
  try {
    const metrics = clusteringService.obtenerMetricas();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener métricas' });
  }
});

// Entrenar automáticamente desde OLAP
app.post('/train-from-olap', async (req: Request, res: Response) => {
  try {
    const olapUrl = process.env.OLAP_SERVICE_URL || 'http://localhost:3001';

    // Obtener dataset del cubo OLAP
    const response = await axios.get(`${olapUrl}/dataset`);
    const dataset = response.data;

    // Convertir a formato de entrenamiento
    const trainingData: TrainingData[] = dataset.map((item: any) => ({
      texto: item.textoConsulta,
      cluster: item.clusterAsignado || 'C1',
      ciudad: item.ubicacion?.ciudad,
      tipoUsuario: item.usuario?.tipo,
      gravedad: item.gravedadEstimada
    }));

    const metrics = await clusteringService.entrenarModelo(trainingData);

    res.json({
      message: 'Modelo entrenado desde OLAP exitosamente',
      metrics,
      samplesUsed: trainingData.length
    });
  } catch (error) {
    console.error('Error al entrenar desde OLAP:', error);
    res.status(500).json({ error: 'Error al entrenar desde OLAP' });
  }
});

app.listen(PORT, () => {
  console.log(`🤖 Clustering ML Service corriendo en puerto ${PORT}`);
});
