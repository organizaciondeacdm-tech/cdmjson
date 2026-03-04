const mongoose = require('mongoose');

const escuelaSchema = new mongoose.Schema({
  de: {
    type: String,
    required: [true, 'Distrito Escolar es requerido'],
    trim: true,
    uppercase: true,
    match: [/^DE\s\d{2}$/, 'DE debe tener formato DE 01']
  },
  escuela: {
    type: String,
    required: [true, 'Nombre de escuela es requerido'],
    trim: true,
    unique: true
  },
  cue: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
    match: [/^\d{7}$/, 'CUE debe tener 7 dígitos']
  },
  nivel: {
    type: String,
    required: true,
    enum: ['Inicial', 'Primario', 'Secundario', 'Especial', 'Técnica', 'Adultos']
  },
  direccion: {
    type: String,
    required: [true, 'Dirección es requerida'],
    trim: true
  },
  localidad: {
    type: String,
    required: [true, 'Localidad es requerida'],
    trim: true
  },
  codigoPostal: {
    type: String,
    trim: true
  },
  ubicacion: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitud, latitud]
      required: true,
      index: '2dsphere'
    }
  },
  telefonos: [{
    numero: {
      type: String,
      required: true,
      match: [/^[0-9-+\s()]+$/, 'Teléfono inválido']
    },
    tipo: {
      type: String,
      enum: ['fijo', 'celular', 'fax'],
      default: 'fijo'
    },
    principal: {
      type: Boolean,
      default: false
    }
  }],
  email: {
    type: String,
    required: [true, 'Email es requerido'],
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Email inválido']
  },
  emailSecundario: {
    type: String,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Email inválido']
  },
  jornada: {
    type: String,
    required: true,
    enum: ['Simple', 'Completa', 'Extendida', 'Doble Escolaridad']
  },
  turno: {
    type: String,
    required: true,
    enum: ['Mañana', 'Tarde', 'Vespertino', 'Noche', 'Completo']
  },
  director: {
    nombre: String,
    email: String,
    telefono: String
  },
  vicedirector: {
    nombre: String,
    email: String,
    telefono: String
  },
  secretario: {
    nombre: String,
    email: String,
    telefono: String
  },
  estadisticas: {
    totalAlumnos: { type: Number, default: 0 },
    totalDocentes: { type: Number, default: 0 },
    totalAulas: { type: Number, default: 0 },
    matriculaInicial: { type: Number, default: 0 },
    matriculaPrimaria: { type: Number, default: 0 },
    matriculaSecundaria: { type: Number, default: 0 }
  },
  observaciones: {
    type: String,
    maxlength: 1000
  },
  estado: {
    type: String,
    enum: ['activa', 'inactiva', 'provisoria'],
    default: 'activa'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

// Virtuals
escuelaSchema.virtual('alumnos', {
  ref: 'Alumno',
  localField: '_id',
  foreignField: 'escuela'
});

escuelaSchema.virtual('docentes', {
  ref: 'Docente',
  localField: '_id',
  foreignField: 'escuela'
});

// Índices
escuelaSchema.index({ ubicacion: '2dsphere' });
escuelaSchema.index({ de: 1, escuela: 1 });
escuelaSchema.index({ nivel: 1 });
escuelaSchema.index({ estado: 1 });
escuelaSchema.index({ 'estadisticas.totalAlumnos': -1 });

// Métodos
escuelaSchema.methods.actualizarEstadisticas = async function() {
  const Alumno = mongoose.model('Alumno');
  const Docente = mongoose.model('Docente');
  
  const [totalAlumnos, totalDocentes] = await Promise.all([
    Alumno.countDocuments({ escuela: this._id, activo: true }),
    Docente.countDocuments({ escuela: this._id, activo: true })
  ]);
  
  this.estadisticas.totalAlumnos = totalAlumnos;
  this.estadisticas.totalDocentes = totalDocentes;
  
  return this.save();
};

// Middleware
escuelaSchema.pre('save', function(next) {
  if (this.de) {
    // Formatear DE automáticamente
    const deNum = this.de.replace(/\D/g, '');
    this.de = `DE ${deNum.padStart(2, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Escuela', escuelaSchema);