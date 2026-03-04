// api/index.js - VERSIÓN DE DIAGNÓSTICO
module.exports = async (req, res) => {
  console.log(`📡 Diagnóstico - ${req.method} ${req.url}`);

  // Responder a /health
  if (req.url === '/health') {
    return res.status(200).json({
      status: 'OK',
      message: 'Modo diagnóstico',
      timestamp: new Date().toISOString()
    });
  }

  // Responder a /api/test
  if (req.url === '/api/test') {
    return res.status(200).json({
      success: true,
      message: 'API test en modo diagnóstico'
    });
  }

  // Cualquier otra ruta
  return res.status(404).json({
    error: 'Ruta no encontrada en modo diagnóstico',
    url: req.url
  });
};
