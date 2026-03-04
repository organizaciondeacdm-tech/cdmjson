const express = require('express');
const router = express.Router();
const {
  getAlumnos,
  getAlumnoById,
  createAlumno,
  updateAlumno,
  deleteAlumno,
  getEstadisticasAlumnos
} = require('../controllers/alumnoController');
const { authMiddleware, requirePermission } = require('../middleware/auth');
const { validateAlumno } = require('../middleware/validation');

router.get('/estadisticas', authMiddleware, getEstadisticasAlumnos);
router.get('/', authMiddleware, getAlumnos);
router.get('/:id', authMiddleware, getAlumnoById);
router.post('/', 
  authMiddleware, 
  requirePermission('crear_alumno'),
  validateAlumno, 
  createAlumno
);
router.put('/:id', 
  authMiddleware, 
  requirePermission('editar_alumno'),
  validateAlumno, 
  updateAlumno
);
router.delete('/:id', 
  authMiddleware, 
  requirePermission('eliminar_alumno'),
  deleteAlumno
);

module.exports = router;