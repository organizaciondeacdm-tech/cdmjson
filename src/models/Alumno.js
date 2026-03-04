const mongoose = require('mongoose');

const alumnoSchema = new mongoose.Schema({
  escuela: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Escuela',
    required: true,
    index: true
  },
  gradoSalaAnio: {
    type: String,
    required: [true, 'Grado/Sala/Año es requerido'],
    trim: true
  },
  division: {
    type: String,
    trim: true,
    uppercase: true
  },
  turno: {
    type: String,
    enum: ['Mañana', 'Tarde', 'Vespertino', 'Noche']
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
  fechaNacimiento: {
    type: Date,
    required: true
  },
  lugarNacimiento: {
    provincia: String,
    localidad: String
  },
  nacionalidad: {
    type: String,
    default: 'Argentina'
  },
  genero: {
    type: String,
    enum: ['F', 'M', 'X', 'No binario']
  },
  domicilio: {
    calle: String,
    numero: String,
    piso: String,
    depto: String,
    barrio: String,
    localidad: String,
    codigoPostal: String,
    provincia: { type: String, default: 'CABA' }
  },
  contactos: [{
    nombre: String,
    parentesco: String,
    telefono: String,
    email: String,
    principal: { type: Boolean, default: false },
    autorizadoRetirar: { type: Boolean, default: false }
  }],
  obraSocial: {
    nombre: String,
    numeroAfiliado: String,
    vencimiento: Date
  },
  certificadoDiscapacidad: {
    tiene: { type: Boolean, default: false },
    numero: String,
    fechaEmision: Date,
    fechaVencimiento: Date,
    diagnosticoCie: String,
    archivo: String
  },
  diagnostico: {
    type: String,
    required: [true, 'Diagnóstico es requerido'],
    trim: true
  },
  diagnosticoDetallado: {
    tipo: {
      type: String,
      enum: ['TEA', 'TDAH', 'Síndrome Down', 'Parálisis Cerebral', 
             'Discapacidad Motriz', 'Discapacidad Intelectual', 
             'Discapacidad Sensorial', 'Multidiscapacidad', 'Otro']
    },
    nivel: String,
    cie10: String,
    observaciones: String
  },
  necesidades: [{
    tipo: {
      type: String,
      enum: ['asistencia_motriz', 'comunicacion', 'alimentacion', 
             'higiene', 'medicacion', 'movilidad', 'otro']
    },
    descripcion: String,
    requiereAsistente: Boolean,
    frecuencia: String
  }],
  observaciones: {
    type: String,
    maxlength: 2000
  },
  acompananteTerapeutico: {
    tiene: { type: Boolean, default: false },
    nombre: String,
    telefono: String,
    horario: String
  },
  integracion: {
    tipo: String,
    profesionales: [{
      nombre: String,
      rol: String,
      telefono: String,
      frecuencia: String
    }]
  },
  medicacion: {
    requiere: { type: Boolean, default: false },
    medicamentos: [{
      nombre: String,
      dosis: String,
      horario: String,
      observaciones: String
    }],
    autorizacionFirmada: { type: Boolean, default: false }
  },
  emergencias: {
    contactoEmergencia: String,
    telefonoEmergencia: String,
    alergias: String,
    condicionesEspeciales: String
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
alumnoSchema.index({ dni: 1 }, { unique: true, sparse: true });
alumnoSchema.index({ apellido: 1, nombre: 1 });
alumnoSchema.index({ escuela: 1, gradoSalaAnio: 1 });
alumnoSchema.index({ 'diagnosticoDetallado.tipo': 1 });
alumnoSchema.index({ activo: 1 });

// Virtuals
alumnoSchema.virtual('nombreCompleto').get(function() {
  return `${this.apellido}, ${this.nombre}`;
});

alumnoSchema.virtual('edad').get(function() {
  if (!this.fechaNacimiento) return null;
  const hoy = new Date();
  const nacimiento = new Date(this.fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
});

// Métodos
alumnoSchema.methods.agregarContacto = function(contacto) {
  if (contacto.principal) {
    this.contactos.forEach(c => c.principal = false);
  }
  this.contactos.push(contacto);
};

alumnoSchema.methods.getContactoPrincipal = function() {
  return this.contactos.find(c => c.principal) || this.contactos[0];
};

// Static methods
alumnoSchema.statics.findByEscuela = function(escuelaId) {
  return this.find({ escuela: escuelaId, activo: true })
    .sort({ gradoSalaAnio: 1, apellido: 1 });
};

alumnoSchema.statics.findByDiagnostico = function(tipoDiagnostico) {
  return this.find({ 
    'diagnosticoDetallado.tipo': tipoDiagnostico,
    activo: true 
  }).populate('escuela', 'escuela de');
};

module.exports = mongoose.model('Alumno', alumnoSchema);