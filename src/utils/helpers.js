/**
 * HELPERS
 * Funciones auxiliares para el backend
 */
const crypto = require('crypto');

// Formatear fecha a DD/MM/YYYY
const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Formatear fecha a ISO para DB (YYYY-MM-DD)
const formatDateISO = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

// Formatear fecha y hora
const formatDateTime = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Calcular días restantes hasta una fecha
const daysRemaining = (endDate) => {
  if (!endDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  return diff;
};

// Generar ID único (para JSON DB)
const generateId = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Paginar resultados
const paginateResults = (items, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  const paginatedItems = items.slice(startIndex, endIndex);
  
  return {
    items: paginatedItems,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: items.length,
      pages: Math.ceil(items.length / limit),
      hasNext: endIndex < items.length,
      hasPrev: startIndex > 0
    }
  };
};

// Filtrar objeto por campos permitidos
const filterFields = (obj, allowedFields) => {
  const filtered = {};
  allowedFields.forEach(field => {
    if (obj.hasOwnProperty(field)) {
      filtered[field] = obj[field];
    }
  });
  return filtered;
};

// Parsear query params para filtros (excluye page, limit, sort)
const parseQueryFilters = (query) => {
  const filters = {};
  const excludeFields = ['page', 'limit', 'sort', 'fields', 'populate'];
  
  Object.keys(query).forEach(key => {
    if (!excludeFields.includes(key)) {
      // Si el valor es 'true' o 'false' convertirlo a booleano
      if (query[key] === 'true') filters[key] = true;
      else if (query[key] === 'false') filters[key] = false;
      else filters[key] = query[key];
    }
  });
  
  return filters;
};

// Generar contraseña aleatoria segura
const generateRandomPassword = (length = 10) => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  
  const allChars = uppercase + lowercase + numbers + special;
  let password = '';
  
  // Asegurar al menos uno de cada tipo
  password += uppercase[crypto.randomInt(0, uppercase.length)];
  password += lowercase[crypto.randomInt(0, lowercase.length)];
  password += numbers[crypto.randomInt(0, numbers.length)];
  password += special[crypto.randomInt(0, special.length)];
  
  // Completar el resto
  for (let i = password.length; i < length; i++) {
    const randomIndex = crypto.randomInt(0, allChars.length);
    password += allChars[randomIndex];
  }
  
  // Mezclar la contraseña
  return password.split('').sort(() => crypto.randomInt(-1, 2)).join('');
};

// Verificar si objeto está vacío
const isEmptyObject = (obj) => {
  return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
};

// Convertir string a slug (para URLs)
const toSlug = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^a-z0-9\s-]/g, '') // Solo letras, números, espacios y guiones
    .replace(/\s+/g, '-') // Espacios a guiones
    .replace(/-+/g, '-') // Múltiples guiones a uno
    .replace(/^-|-$/g, ''); // Eliminar guiones al inicio y final
};

// Calcular edad desde fecha de nacimiento
const calculateAge = (birthDate) => {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

// Enmascarar email (ej: j***@gmail.com)
const maskEmail = (email) => {
  if (!email) return '';
  const [username, domain] = email.split('@');
  if (username.length < 3) return email;
  const maskedUsername = username.charAt(0) + '***' + username.charAt(username.length - 1);
  return `${maskedUsername}@${domain}`;
};

// Enmascarar teléfono
const maskPhone = (phone) => {
  if (!phone) return '';
  if (phone.length < 8) return phone;
  return phone.slice(0, -4).replace(/./g, '*') + phone.slice(-4);
};

// Agrupar array por propiedad
const groupBy = (array, key) => {
  return array.reduce((result, currentValue) => {
    const groupKey = currentValue[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(currentValue);
    return result;
  }, {});
};

// Ordenar array por propiedad
const sortBy = (array, key, order = 'asc') => {
  return array.sort((a, b) => {
    if (a[key] < b[key]) return order === 'asc' ? -1 : 1;
    if (a[key] > b[key]) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

// Calcular estadísticas básicas de un array numérico
const calculateStats = (numbers) => {
  if (!numbers || numbers.length === 0) return null;
  
  const sum = numbers.reduce((a, b) => a + b, 0);
  const avg = sum / numbers.length;
  const max = Math.max(...numbers);
  const min = Math.min(...numbers);
  
  return { sum, avg, max, min, count: numbers.length };
};

// Deep clone de objeto
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

// Sleep/Delay
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

module.exports = {
  formatDate,
  formatDateISO,
  formatDateTime,
  daysRemaining,
  generateId,
  paginateResults,
  filterFields,
  parseQueryFilters,
  generateRandomPassword,
  isEmptyObject,
  toSlug,
  calculateAge,
  maskEmail,
  maskPhone,
  groupBy,
  sortBy,
  calculateStats,
  deepClone,
  sleep
};