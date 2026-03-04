const mongoose = require('mongoose');

const docenteSchema = new mongoose.Schema({
  escuela: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Escuela',
    required: true,
    index: true
  },
  titularId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Docente',
    index: true
  },
  cargo: {
    type: String,
    required: true,
    enum: ['Titular', 'Suplente', 'Interino', 'Provisorio']
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
  dni: {
    type: String,
    required: [true, 'DNI es requerido'],
    unique: true,
    sparse: true,
    match: [/^\d{7,8}$/, 'DNI debe tener 7 u 8 dígitos']
  },
  cuil: {
    type: String,
    unique: true,
    sparse: true,
    match: [/^\d{11}$/, 'CUIL debe tener 11 dígitos']
  },
  fechaNacimiento: {
    type: Date,
    required: true
  },
  genero: {
    type: String,
    enum: ['F', 'M', 'X', 'No binario']
  },
  nacionalidad: {
    type: String,
    default: 'Argentina'
  },
  domicilio: {
    calle: String,
    numero: String,
    piso: String,
    depto: String,
    localidad: String,
    codigoPostal: String,
    provincia: { type: String, default: 'CABA' }
  },
  telefonos: [{
    numero: String,
    tipo: { type: String, enum: ['celular', 'fijo', 'whatsapp'] },
    principal: { type: Boolean, default: false }
  }],
  email: {
    type: String,
    required: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Email inválido']
  },
  emailSecundario: {
    type: String,
    lowercase: true
  },
  titulos: [{
    titulo: String,
    institucion: String,
    año: Number,
    estado: { type: String, enum: ['completo', 'en_curso'] }
  }],
  antiguedad: {
    docencia: { type: Number, default: 0 },
    cargoActual: { type: Number, default: 0 }
  },
  fechaIngresoDocencia: Date,
  fechaIngresoCargo: Date,
  estado: {
    type: String,
    enum: ['Activo', 'Licencia', 'Suspendido', 'Jubilado', 'Renunció'],
    default: 'Activo'
  },
  motivo: {
    type: String,
    default: '-'
  },
  diasAutorizados: {
    type: Number,
    default: 0
  },
  fechaInicioLicencia: Date,
  fechaFinLicencia: Date,
  certificadoMedico: {
    tipo: String,
    archivo: String,
    fechaEmision: Date,
    fechaVencimiento: Date
  },
  suplentes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Docente'
  }],
  observaciones: {
    type: String,
    maxlength: 1000
  },
  activo: {
    type: Boolean,
    default: true
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

// Índices
docenteSchema.index({ dni: 1 }, { unique: true, sparse: true });
docenteSchema.index({ apellido: 1, nombre: 1 });
docenteSchema.index({ estado: 1, fechaFinLicencia: 1 });
docenteSchema.index({ escuela: 1, cargo: 1 });

// Virtuals
docenteSchema.virtual('nombreCompleto').get(function() {
  return `${this.apellido}, ${this.nombre}`;
});

docenteSchema.virtual('diasRestantesLicencia').get(function() {
  if (!this.fechaFinLicencia) return null;
  const hoy = new Date();
  const fin = new Date(this.fechaFinLicencia);
  const diff = Math.ceil((fin - hoy) / (1000 * 60 * 60 * 24));
  return diff;
});

docenteSchema.virtual('alertaLicencia').get(function() {
  const dias = this.diasRestantesLicencia;
  if (!dias) return null;
  if (dias <= 0) return 'vencida';
  if (dias <= 5) return 'critica';
  if (dias <= 10) return 'proxima';
  return null;
});

// Métodos
docenteSchema.methods.agregarSuplente = async function(suplenteId) {
  if (!this.suplentes.includes(suplenteId)) {
    this.suplentes.push(suplenteId);
    await this.save();
  }
};

docenteSchema.methods.removerSuplente = async function(suplenteId) {
  this.suplentes = this.suplentes.filter(id => id.toString() !== suplenteId.toString());
  await this.save();
};

// Static methods
docenteSchema.statics.findByEstado = function(estado) {
  return this.find({ estado, activo: true }).populate('escuela', 'escuela de');
};

docenteSchema.statics.findLicenciasProximas = function(dias = 10) {
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() + dias);
  
  return this.find({
    estado: 'Licencia',
    fechaFinLicencia: { $lte: fechaLimite, $gte: new Date() },
    activo: true
  }).populate('escuela', 'escuela de');
};

// Middleware
docenteSchema.pre('save', function(next) {
  if (this.cargo === 'Suplente' && !this.titularId) {
    next(new Error('Suplente debe tener un titular asociado'));
  }
  
  if (this.estado === 'Licencia' && !this.fechaFinLicencia) {
    next(new Error('Licencia debe tener fecha de fin'));
  }
  
  next();
});

module.exports = mongoose.model('Docente', docenteSchema);