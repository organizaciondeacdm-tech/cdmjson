const express = require('express');
const router = express.Router();
const {
  generarReporteEscuelas,
  generarReporteLicencias,
  generarReporteAlumnos,
  generarDashboard
} = require('../controllers/reporteController');
const { authMiddleware, requirePermission } = require('../middleware/auth');

router.get('/dashboard', authMiddleware, generarDashboard);
router.get('/escuelas', authMiddleware, requirePermission('exportar_datos'), generarReporteEscuelas);
router.get('/licencias', authMiddleware, requirePermission('exportar_datos'), generarReporteLicencias);
router.get('/alumnos', authMiddleware, requirePermission('exportar_datos'), generarReporteAlumnos);

module.exports = router;