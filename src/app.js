const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss'); // Cambiado: ahora usa xss directamente
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { logger } = require('./middleware/errorHandler');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const escuelaRoutes = require('./routes/escuelaRoutes');
const docenteRoutes = require('./routes/docenteRoutes');
const alumnoRoutes = require('./routes/alumnoRoutes');
const reporteRoutes = require('./routes/reporteRoutes');

const app = express();

// [IMPORTANTE] Conexión a MongoDB - UNA SOLA VEZ al inicio
let isConnected = false;

const connectToDatabase = async () => {
  if (isConnected) {
    console.log('📊 Usando conexión existente a MongoDB');
    return;
  }

  try {
    console.log('📊 Conectando a MongoDB...');
    const db = await connectDB();
    isConnected = db.connections[0].readyState === 1;
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
  }
};

// Iniciar conexión (no-blocking)
connectToDatabase();

// Middleware para verificar BD en rutas que la necesitan
const requireDatabase = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: 'Base de datos no disponible',
      message: 'El servicio está iniciando, intente nuevamente'
    });
  }
  next();
};

// Middleware de seguridad
app.use(helmet({
  contentSecurityPolicy: false,
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true
}));

// Rate limiting (simplificado para Vercel)
if (!process.env.VERCEL) {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
  });
  app.use('/api', limiter);
}

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Sanitización - Versión corregida usando xss directamente
app.use(mongoSanitize());
app.use((req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key]);
      }
    });
  }
  next();
});

// Compresión
app.use(compression());

// Logging (usando nuestro logger)
app.use(morgan('combined', {
  stream: { write: message => logger.info(message.trim()) }
}));

// Health check (NO requiere BD)
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'connecting',
    vercel: !!process.env.VERCEL
  });
});

// Rutas de API
app.use('/api/auth', authRoutes);
app.use('/api/escuelas', requireDatabase, escuelaRoutes);
app.use('/api/docentes', requireDatabase, docenteRoutes);
app.use('/api/alumnos', requireDatabase, alumnoRoutes);
app.use('/api/reportes', requireDatabase, reporteRoutes);

// Endpoint de prueba (NO requiere BD)
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'API is working' });
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'ACDM Backend API',
    version: '1.0.0',
    environment: process.env.VERCEL ? 'vercel' : process.env.NODE_ENV,
    endpoints: {
      health: '/health',
      test: '/api/test',
      auth: '/api/auth',
      escuelas: '/api/escuelas',
      docentes: '/api/docentes',
      alumnos: '/api/alumnos',
      reportes: '/api/reportes'
    }
  });
});

// Servir frontend si existe (en Vercel)
if (process.env.VERCEL) {
  const frontendPath = path.join(__dirname, '../dist');
  app.use(express.static(frontendPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Manejo de errores (SIEMPRE al final)
app.use(errorHandler);

module.exports = app;
