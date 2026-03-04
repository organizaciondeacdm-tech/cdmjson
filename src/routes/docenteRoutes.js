const express = require('express');
const router = express.Router();
const {
  getDocentes,
  getDocenteById,
  createDocente,
  updateDocente,
  deleteDocente,
  getLicenciasProximas,
  getEstadisticasDocentes
} = require('../controllers/docenteController');
const { authMiddleware, requirePermission } = require('../middleware/auth');
const { validateDocente } = require('../middleware/validation');

router.get('/licencias-proximas', authMiddleware, getLicenciasProximas);
router.get('/estadisticas', authMiddleware, getEstadisticasDocentes);
router.get('/', authMiddleware, getDocentes);
router.get('/:id', authMiddleware, getDocenteById);
router.post('/', 
  authMiddleware, 
  requirePermission('crear_docente'),
  validateDocente, 
  createDocente
);
router.put('/:id', 
  authMiddleware, 
  requirePermission('editar_docente'),
  validateDocente, 
  updateDocente
);
router.delete('/:id', 
  authMiddleware, 
  requirePermission('eliminar_docente'),
  deleteDocente
);

module.exports = router;