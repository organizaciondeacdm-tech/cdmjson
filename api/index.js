// api/index.js - Papiweb VERSIÓN CORRECTA PARA VERCEL
const app = require('../src/app');

// Exportar como función serverless (NO como la app directamente)
module.exports = async (req, res) => {
  try {
    // Log para debug (visible en los logs de Vercel)
    console.log(`🌐 ${req.method} ${req.url}`);
    
    // Ejecutar la app de Express
    await app(req, res);
  } catch (error) {
    console.error('💥 Error en función serverless:', error);
    
    // Respuesta de error amigable
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
