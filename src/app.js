const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { registrarAccion } = require('./services/auditoriaService');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const escuelaRoutes = require('./routes/escuelaRoutes');
const docenteRoutes = require('./routes/docenteRoutes');
const alumnoRoutes = require('./routes/alumnoRoutes');
const reporteRoutes = require('./routes/reporteRoutes');
const { sendEmail } = require('./services/emailService');

const app = express();

// Flag para rastrear inicialización
let dbInitialized = false;
let dbInitializing = false;

// Middleware para inicializar conexión a MongoDB en la primera solicitud
app.use(async (req, res, next) => {
  if (!dbInitialized && !dbInitializing) {
    dbInitializing = true;
    try {
      await connectDB();
      dbInitialized = true;
      dbInitializing = false;
    } catch (error) {
      dbInitializing = false;
      console.error('Failed to connect to database:', error.message);
      // Continuar de todas formas para permitir rutas de health check
    }
  }
  next();
});

// Middleware de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
  optionsSuccessStatus: 200
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: 'Demasiadas peticiones, intente nuevamente más tarde'
});
app.use('/api', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitización
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

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400
  }));
}

// Middleware de auditoría (simplificado para evitar errores)
app.use((req, res, next) => {
  try {
    const oldJson = res.json;
    res.json = function(data) {
      // Log de acciones importantes
      if (req.method !== 'GET' && res.statusCode < 400) {
        try {
          registrarAccion(
            req.user,
            `${req.method} ${req.originalUrl}`,
            req.baseUrl.split('/').pop(),
            { body: req.body, params: req.params },
            req
          );
        } catch (err) {
          console.error('Error in audit logging:', err.message);
        }
      }
      return oldJson.call(this, data);
    };
  } catch (err) {
    console.error('Error setting up audit middleware:', err.message);
  }
  next();
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/escuelas', escuelaRoutes);
app.use('/api/docentes', docenteRoutes);
app.use('/api/alumnos', alumnoRoutes);
app.use('/api/reportes', reporteRoutes);

// Endpoint de prueba
app.get('/api/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is working'
  });
});

// Endpoint para enviar alertas por email
app.post('/api/send-alert-email', async (req, res) => {
  try {
    const { to, subject, alerts, message, timestamp } = req.body;

    if (!to || !alerts || alerts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Email destinatario y alertas son requeridos'
      });
    }

    // Construir contenido HTML del email
    const alertsHtml = alerts.map(a => `
      <div style="margin-bottom: 20px; padding: 15px; border-left: 4px solid ${a.severity === 'critica' ? '#ff4444' : a.severity === 'urgente' ? '#ff8800' : a.severity === 'proxima' ? '#ffaa00' : '#0088ff'}; background-color: #f5f5f5; border-radius: 4px;">
        <h3 style="margin: 0 0 10px 0; color: ${a.severity === 'critica' ? '#ff4444' : a.severity === 'urgente' ? '#ff8800' : a.severity === 'proxima' ? '#ffaa00' : '#0088ff'};">${a.icon} ${a.title}</h3>
        <p style="margin: 5px 0; font-weight: bold;">${a.desc}</p>
        <pre style="margin: 10px 0; padding: 10px; background-color: #fff; border-radius: 3px; font-size: 12px; overflow-x: auto;">${a.details}</pre>
      </div>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            h1 { color: #0088ff; border-bottom: 2px solid #0088ff; padding-bottom: 10px; }
            .header { background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            .timestamp { color: #999; font-size: 12px; margin-top: 5px; }
            .message { background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #0088ff; }
            .footer { color: #999; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>📋 Alertas del Sistema ACDM</h1>
            
            <div class="header">
              <p><strong>Reporte de Alertas Generado</strong></p>
              <p class="timestamp">${timestamp}</p>
              <p>Se adjuntan <strong>${alerts.length}</strong> alerta(s) para su revisión:</p>
            </div>

            ${message ? `<div class="message"><p><strong>Mensaje:</strong></p><p>${message}</p></div>` : ''}

            <h2>Alertas Registradas:</h2>
            ${alertsHtml}

            <div class="footer">
              <p>Sistema ACDM - Gestión de Asistentes de Clase</p>
              <p>© ${new Date().getFullYear()} Organización de ACDM. Todos los derechos reservados.</p>
              <p><em>Este es un correo automático, por favor no responda directamente a este mensaje.</em></p>
            </div>
          </div>
        </body>
      </html>
    `;

    await sendEmail(to, subject || '📋 Alertas del Sistema ACDM', html);

    res.status(200).json({
      success: true,
      message: `Email enviado exitosamente a ${to}`,
      alertsCount: alerts.length
    });
  } catch (error) {
    console.error('Error sending alert email:', error);
    res.status(500).json({
      success: false,
      error: 'Error al enviar el email: ' + error.message
    });
  }
});

// Ruta de health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Ruta raíz
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ACDM Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      escuelas: '/api/escuelas',
      docentes: '/api/docentes',
      alumnos: '/api/alumnos',
      reportes: '/api/reportes',
      health: '/health',
      test: '/api/test'
    }
  });
});

// Servir archivos estáticos en producción
const fs = require('fs');
let frontendBuildPath = null;

// En Vercel, el frontend compilado estará en dist/
if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
  frontendBuildPath = path.join(__dirname, '../../dist');
} else if (process.env.NODE_ENV === 'production') {
  frontendBuildPath = path.join(__dirname, '../../frontend/build');
}

if (frontendBuildPath && fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
  
  // SPA fallback - servir index.html para rutas desconocidas
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'), (err) => {
      if (err) {
        res.status(404).json({
          success: false,
          error: 'Ruta no encontrada'
        });
      }
    });
  });
} else {
  // Si no hay frontend, servir respuesta JSON en raíces desconocidas
  app.get('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: 'Ruta no encontrada'
    });
  });
}

// Manejo de errores
app.use(errorHandler);

module.exports = app;