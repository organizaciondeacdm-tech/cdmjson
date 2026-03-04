// src/middleware/errorHandler.js
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Determinar el directorio de logs según el entorno
const isVercel = process.env.VERCEL === '1';
const isProduction = process.env.NODE_ENV === 'production';

// En Vercel usar /tmp, en local usar carpeta logs/
const logDir = isVercel ? '/tmp/logs' : path.join(__dirname, '../../logs');

// Crear el directorio de logs SOLO si no existe y tenemos permisos
try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
    console.log(`📁 Directorio de logs creado: ${logDir}`);
  }
} catch (error) {
  console.warn(`⚠️ No se pudo crear el directorio de logs: ${error.message}`);
  // Si no se puede crear, usaremos solo console transport
}

// Configuración de formato para los logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Configuración de transports (destinos de logs)
const transports = [];

// Siempre agregar transporte de consola (funciona en todos lados)
transports.push(new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  )
}));

// Agregar transporte de archivo SOLO si el directorio es escribible
try {
  // Verificar si podemos escribir en el directorio
  fs.accessSync(logDir, fs.constants.W_OK);
  
  // Archivo para todos los logs
  transports.push(new winston.transports.File({ 
    filename: path.join(logDir, 'combined.log'),
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    tailable: true
  }));
  
  // Archivo separado solo para errores
  transports.push(new winston.transports.File({ 
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    tailable: true
  }));
  
  console.log(`📝 Logs guardados en: ${logDir}`);
} catch (error) {
  console.log(`📝 Modo solo consola (sin persistencia de archivos)`);
}

// Crear el logger
const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: logFormat,
  transports: transports,
  exitOnError: false // No salir del proceso en caso de error de logging
});

// Middleware de manejo de errores para Express
const errorHandler = (err, req, res, next) => {
  // Registrar el error
  logger.error('❌ Error no manejado:', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
    user: req.user?.id || 'anonymous',
    timestamp: new Date().toISOString()
  });

  // Determinar el código de estado HTTP
  const statusCode = err.statusCode || err.status || 500;
  
  // Respuesta al cliente (sin detalles técnicos en producción)
  const errorResponse = {
    success: false,
    error: {
      message: isProduction && statusCode === 500 
        ? 'Error interno del servidor' 
        : err.message || 'Error inesperado',
      code: err.code || 'INTERNAL_ERROR',
      status: statusCode
    }
  };

  // En desarrollo, incluir stack trace
  if (!isProduction && !isVercel) {
    errorResponse.error.stack = err.stack;
    errorResponse.error.detail = err.detail || null;
  }

  res.status(statusCode).json(errorResponse);
};

// Middleware para registrar solicitudes HTTP
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log cuando termina la solicitud
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    logger[logLevel](`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`, {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  });
  
  next();
};

// Middleware para capturar errores 404 (ruta no encontrada)
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Ruta no encontrada: ${req.method} ${req.url}`);
  error.statusCode = 404;
  error.code = 'NOT_FOUND';
  next(error);
};

// Función para capturar errores no manejados (uncaught exceptions)
const setupUncaughtHandlers = () => {
  process.on('uncaughtException', (error) => {
    logger.error('💥 Uncaught Exception:', {
      message: error.message,
      stack: error.stack
    });
    // En producción, podrías querer reiniciar el proceso
    if (!isProduction) {
      process.exit(1);
    }
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('💥 Unhandled Rejection:', {
      reason: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : null,
      promise
    });
  });
};

module.exports = {
  logger,
  errorHandler,
  requestLogger,
  notFoundHandler,
  setupUncaughtHandlers
};
