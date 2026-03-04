const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array() 
    });
  }
  next();
};

const validateEscuela = [
  body('de')
    .matches(/^DE\s\d{2}$/)
    .withMessage('DE debe tener formato DE 01'),
  body('escuela')
    .notEmpty()
    .trim()
    .withMessage('Nombre de escuela es requerido'),
  body('nivel')
    .isIn(['Inicial', 'Primario', 'Secundario', 'Especial', 'Técnica', 'Adultos'])
    .withMessage('Nivel inválido'),
  body('direccion')
    .notEmpty()
    .withMessage('Dirección es requerida'),
  body('localidad')
    .notEmpty()
    .withMessage('Localidad es requerida'),
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  body('jornada')
    .isIn(['Simple', 'Completa', 'Extendida', 'Doble Escolaridad'])
    .withMessage('Jornada inválida'),
  body('turno')
    .isIn(['Mañana', 'Tarde', 'Vespertino', 'Noche', 'Completo'])
    .withMessage('Turno inválido'),
  handleValidationErrors
];

const validateDocente = [
  body('nombre')
    .notEmpty()
    .trim()
    .withMessage('Nombre es requerido'),
  body('apellido')
    .notEmpty()
    .trim()
    .withMessage('Apellido es requerido'),
  body('dni')
    .matches(/^\d{7,8}$/)
    .withMessage('DNI debe tener 7 u 8 dígitos'),
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  body('fechaNacimiento')
    .isISO8601()
    .withMessage('Fecha de nacimiento inválida'),
  body('cargo')
    .isIn(['Titular', 'Suplente', 'Interino', 'Provisorio'])
    .withMessage('Cargo inválido'),
  handleValidationErrors
];

const validateAlumno = [
  body('nombre')
    .notEmpty()
    .trim()
    .withMessage('Nombre es requerido'),
  body('apellido')
    .notEmpty()
    .trim()
    .withMessage('Apellido es requerido'),
  body('dni')
    .matches(/^\d{7,8}$/)
    .withMessage('DNI debe tener 7 u 8 dígitos'),
  body('fechaNacimiento')
    .isISO8601()
    .withMessage('Fecha de nacimiento inválida'),
  body('gradoSalaAnio')
    .notEmpty()
    .withMessage('Grado/Sala/Año es requerido'),
  body('diagnostico')
    .notEmpty()
    .withMessage('Diagnóstico es requerido'),
  handleValidationErrors
];

const validateUser = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username solo puede contener letras, números y _'),
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número'),
  body('nombre')
    .notEmpty()
    .trim()
    .withMessage('Nombre es requerido'),
  body('apellido')
    .notEmpty()
    .trim()
    .withMessage('Apellido es requerido'),
  handleValidationErrors
];

module.exports = {
  validateEscuela,
  validateDocente,
  validateAlumno,
  validateUser
};