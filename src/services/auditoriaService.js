const winston = require('winston');

// Configurar logger según el entorno
const transports = [
  new winston.transports.Console({
    format: winston.format.simple()
  })
];

// Solo agregar archivos de logs fuera de Vercel
if (!process.env.VERCEL) {
  transports.push(
    new winston.transports.File({ filename: 'logs/auditoria.log' }),
    new winston.transports.File({ filename: 'logs/auditoria-error.log', level: 'error' })
  );
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports
});

const registrarAccion = (usuario, accion, entidad, detalles, req) => {
  // En Vercel, solo loguear con console para evitar errores de escritura de archivos
  if (process.env.VERCEL) {
    console.log(`[Auditoria] ${accion} - ${entidad}`, {
      usuario: usuario?.username,
      ip: req?.ip
    });
    return;
  }

  const logEntry = {
    timestamp: new Date().toISOString(),
    usuario: {
      id: usuario?._id,
      username: usuario?.username,
      rol: usuario?.rol
    },
    accion,
    entidad,
    detalles,
    ip: req?.ip || 'N/A',
    userAgent: req?.get('user-agent') || 'N/A',
    metodo: req?.method,
    url: req?.originalUrl
  };

  logger.info(logEntry);
};

const registrarError = (error, usuario, req) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    usuario: usuario ? {
      id: usuario._id,
      username: usuario.username
    } : null,
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code
    },
    ip: req?.ip,
    url: req?.originalUrl,
    metodo: req?.method
  };

  logger.error(logEntry);
};

const consultarAuditoria = async (filtros = {}) => {
  // Esta función leería del archivo de logs y filtraría
  // Implementación básica
  return [];
};

module.exports = {
  registrarAccion,
  registrarError,
  consultarAuditoria
};