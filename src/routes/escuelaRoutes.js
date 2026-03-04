const express = require('express');
const router = express.Router();
const {
  getEscuelas,
  getEscuelaById,
  createEscuela,
  updateEscuela,
  deleteEscuela,
  getEstadisticasEscuela,
  buscarEscuelas
} = require('../controllers/escuelaController');
const { authMiddleware, requirePermission } = require('../middleware/auth');
const { validateEscuela } = require('../middleware/validation');

router.get('/buscar', authMiddleware, buscarEscuelas);
router.get('/estadisticas', authMiddleware, getEstadisticasEscuela);
router.get('/', authMiddleware, getEscuelas);
router.get('/:id', authMiddleware, getEscuelaById);
router.post('/', 
  authMiddleware, 
  requirePermission('crear_escuela'),
  validateEscuela, 
  createEscuela
);
router.put('/:id', 
  authMiddleware, 
  requirePermission('editar_escuela'),
  validateEscuela, 
  updateEscuela
);
router.delete('/:id', 
  authMiddleware, 
  requirePermission('eliminar_escuela'),
  deleteEscuela
);

module.exports = router;