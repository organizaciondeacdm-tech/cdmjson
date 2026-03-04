const express = require('express');
const { logger, errorHandler, requestLogger, notFoundHandler, setupUncaughtHandlers } = require('./src/middleware/errorHandler');

const app = express();

// Configurar manejadores de errores no capturados
setupUncaughtHandlers();

// Middleware para log de solicitudes (ponerlo temprano)
app.use(requestLogger);

// ... tus rutas y middlewares normales ...

// Middleware para rutas no encontradas (ponerlo antes del errorHandler)
app.use(notFoundHandler);

// Middleware de errores (siempre al final)
app.use(errorHandler);

// Ejemplo de uso del logger en cualquier parte
logger.info('🚀 Servidor iniciado correctamente');
