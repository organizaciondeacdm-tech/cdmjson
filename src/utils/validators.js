/**
 * VALIDADORES
 * Funciones para validar datos de entrada
 */

// Validar email
const isValidEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^\S+@\S+\.\S+$/;
  return emailRegex.test(email);
};

// Validar DNI argentino (7 u 8 dígitos)
const isValidDNI = (dni) => {
  if (!dni) return false;
  const dniRegex = /^\d{7,8}$/;
  return dniRegex.test(dni);
};

// Validar CUIL (11 dígitos)
const isValidCUIL = (cuil) => {
  if (!cuil) return false;
  const cuilRegex = /^\d{11}$/;
  return cuilRegex.test(cuil);
};

// Validar teléfono argentino
const isValidPhone = (phone) => {
  if (!phone) return false;
  // Acepta formatos: 011-1234-5678, 011 1234 5678, 01112345678, +54 11 1234-5678
  const phoneRegex = /^(\+?54)?\s*?(\d{2,4})[\s-]?(\d{4})[\s-]?(\d{4})$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// Validar formato DE (ej: DE 01, DE 12)
const isValidDE = (de) => {
  if (!de) return false;
  const deRegex = /^DE\s\d{2}$/;
  return deRegex.test(de);
};

// Validar que no sea fecha futura
const isNotFutureDate = (date) => {
  if (!date) return true;
  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return inputDate <= today;
};

// Validar rango de fechas (fin >= inicio)
const isValidDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return true;
  return new Date(endDate) >= new Date(startDate);
};

// Validar contraseña fuerte
const isStrongPassword = (password) => {
  if (!password || password.length < 8) return false;
  // Al menos: 1 mayúscula, 1 minúscula, 1 número
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  return hasUpperCase && hasLowerCase && hasNumbers;
};

// Validar que sea un ID válido de MongoDB
const isValidObjectId = (id) => {
  if (!id) return false;
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
};

// Validar nivel educativo
const isValidNivel = (nivel) => {
  const niveles = ['Inicial', 'Primario', 'Secundario', 'Especial', 'Técnica', 'Adultos'];
  return niveles.includes(nivel);
};

// Validar jornada
const isValidJornada = (jornada) => {
  const jornadas = ['Simple', 'Completa', 'Extendida', 'Doble Escolaridad'];
  return jornadas.includes(jornada);
};

// Validar turno
const isValidTurno = (turno) => {
  const turnos = ['Mañana', 'Tarde', 'Vespertino', 'Noche', 'Completo'];
  return turnos.includes(turno);
};

// Validar cargo docente
const isValidCargo = (cargo) => {
  const cargos = ['Titular', 'Suplente', 'Interino', 'Provisorio'];
  return cargos.includes(cargo);
};

// Validar estado docente
const isValidEstadoDocente = (estado) => {
  const estados = ['Activo', 'Licencia', 'Suspendido', 'Jubilado', 'Renunció'];
  return estados.includes(estado);
};

// Validar que un valor esté dentro de un rango numérico
const isInRange = (value, min, max) => {
  if (value === undefined || value === null) return false;
  const num = Number(value);
  return num >= min && num <= max;
};

// Validar URL
const isValidURL = (url) => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Validar que un string no tenga caracteres peligrosos (XSS)
const isSafeString = (str) => {
  if (!str) return true;
  const dangerous = /[<>{}[\]\\/]/;
  return !dangerous.test(str);
};

// Validar formato de hora (HH:MM)
const isValidTime = (time) => {
  if (!time) return false;
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

module.exports = {
  isValidEmail,
  isValidDNI,
  isValidCUIL,
  isValidPhone,
  isValidDE,
  isNotFutureDate,
  isValidDateRange,
  isStrongPassword,
  isValidObjectId,
  isValidNivel,
  isValidJornada,
  isValidTurno,
  isValidCargo,
  isValidEstadoDocente,
  isInRange,
  isValidURL,
  isSafeString,
  isValidTime
};