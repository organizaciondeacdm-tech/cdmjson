const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username es requerido'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Username debe tener al menos 3 caracteres'],
    maxlength: [50, 'Username no puede exceder 50 caracteres'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username solo puede contener letras, números y _']
  },
  passwordHash: {
    type: String,
    required: [true, 'Password es requerido']
  },
  email: {
    type: String,
    required: [true, 'Email es requerido'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Email inválido']
  },
  nombre: {
    type: String,
    required: [true, 'Nombre es requerido'],
    trim: true
  },
  apellido: {
    type: String,
    required: [true, 'Apellido es requerido'],
    trim: true
  },
  rol: {
    type: String,
    enum: ['admin', 'supervisor', 'viewer'],
    default: 'viewer'
  },
  permisos: [{
    type: String,
    enum: ['crear_escuela', 'editar_escuela', 'eliminar_escuela',
           'crear_docente', 'editar_docente', 'eliminar_docente',
           'crear_alumno', 'editar_alumno', 'eliminar_alumno',
           'exportar_datos', 'ver_reportes', 'gestionar_usuarios']
  }],
  refreshToken: {
    token: String,
    expiresAt: Date
  },
  lastLogin: {
    type: Date
  },
  lastIP: {
    type: String
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  passwordChangedAt: {
    type: Date
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    select: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ rol: 1 });
userSchema.index({ isActive: 1 });

// Virtual para nombre completo
userSchema.virtual('nombreCompleto').get(function() {
  return `${this.nombre} ${this.apellido}`;
});

// Middleware para hashear password antes de guardar
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  
  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS));
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    this.passwordChangedAt = new Date();
    next();
  } catch (error) {
    next(error);
  }
});

// Métodos
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

userSchema.methods.incrementLoginAttempts = function() {
  if (this.lockUntil && this.lockUntil < new Date()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { lockUntil: new Date(Date.now() + 30 * 60 * 1000) }; // 30 minutos
  }
  return this.updateOne(updates);
};

userSchema.methods.hasPermission = function(permission) {
  return this.rol === 'admin' || this.permisos.includes(permission);
};

module.exports = mongoose.model('User', userSchema);