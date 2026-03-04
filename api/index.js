// api/index.js - Papiweb VERSIÓN FINAL
console.log('🚀 Iniciando API...');

let app;
try {
  app = require('../src/app');
  console.log('✅ app.js cargado correctamente');
} catch (error) {
  console.error('❌ Error al cargar app.js:', error);
  app = null;
}

module.exports = async (req, res) => {
  console.log(`📡 ${req.method} ${req.url}`);
  
  if (app) {
    try {
      return await app(req, res);
    } catch (error) {
      console.error('💥 Error ejecutando app:', error);
      return res.status(500).json({
        error: 'Error en la aplicación',
        message: error.message
      });
    }
  }
  
  // Fallback por si app.js no carga
  return res.status(503).json({
    error: 'Servicio no disponible',
    message: 'La aplicación no pudo inicializarse'
  });
};
