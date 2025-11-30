/**
 * Microservicio de Transacciones - LexIA 2.0
 * Manejo de pagos y suscripciones con Stripe
 */

// IMPORTANTE: Cargar variables de entorno PRIMERO
import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import transactionRoutes from './routes/transactionRoutes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { closePool } from './config/database';

const app = express();
const PORT = process.env.PORT || 3005;

// ============================================================
// MIDDLEWARE
// ============================================================

// Seguridad
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Body parser - IMPORTANTE: raw body para webhooks de Stripe
app.use('/webhook/stripe', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging de requests
app.use((req: Request, res: Response, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ============================================================
// RUTAS
// ============================================================

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    service: 'LexIA Transactions Service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Rutas de transacciones
app.use('/', transactionRoutes);

// ============================================================
// MANEJO DE ERRORES
// ============================================================

app.use(notFoundHandler);
app.use(errorHandler);

// ============================================================
// INICIAR SERVIDOR
// ============================================================

const server = app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(60));
  console.log('🚀 Microservicio de Transacciones - LexIA 2.0');
  console.log('='.repeat(60));
  console.log(`📡 Servidor escuchando en puerto: ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`💳 Stripe configurado: ${process.env.STRIPE_SECRET_KEY ? '✅' : '❌'}`);
  console.log(`🔔 Webhook endpoint: http://localhost:${PORT}/webhook/stripe`);
  console.log('='.repeat(60));
  console.log('');
});

// Manejo de señales de terminación
process.on('SIGTERM', async () => {
  console.log('⚠️  SIGTERM recibido, cerrando servidor...');
  server.close(async () => {
    await closePool();
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('⚠️  SIGINT recibido, cerrando servidor...');
  server.close(async () => {
    await closePool();
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

export default app;
