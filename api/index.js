// api/index.js - VERSIÓN CON LOGS MEJORADOS
console.log('🚀 Iniciando API...');
console.log('📂 Directorio actual:', __dirname);
console.log('📂 Archivos en api:', require('fs').readdirSync(__dirname));

let app;
try {
  console.log('⏳ Intentando cargar ../src/app...');
  
  // Intentar cargar y capturar cualquier error
  app = require('../src/app');
  
  console.log('✅ app.js cargado correctamente');
  console.log('📋 app.js exports:', Object.keys(app));
} catch (error) {
  console.error('❌ ERROR DETALLADO al cargar app.js:');
  console.error('   Nombre:', error.name);
  console.error('   Mensaje:', error.message);
  console.error('   Stack:', error.stack);
  console.error('   Código:', error.code);
  
  // Si es error de módulo, mostrar qué módulo falta
  if (error.code === 'MODULE_NOT_FOUND') {
    const match = error.message.match(/'([^']+)'/);
    if (match) {
      console.error('   Módulo faltante:', match[1]);
    }
  }
  
  app = null;
}

module.exports = async (req, res) => {
  console.log(`📡 ${req.method} ${req.url}`);
  console.log('🔍 Headers:', req.headers);
  
  if (app) {
    try {
      console.log('✅ Ejecutando app...');
      return await app(req, res);
    } catch (error) {
      console.error('💥 Error ejecutando app:', error);
      return res.status(500).json({
        error: 'Error en la aplicación',
        message: error.message
      });
    }
  }
  
  console.log('⚠️ Usando fallback - app es null');
  return res.status(503).json({
    error: 'Servicio no disponible',
    message: 'La aplicación no pudo inicializarse'
  });
};
