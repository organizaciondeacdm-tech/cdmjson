const Docente = require('../models/Docente');
const Escuela = require('../models/Escuela');

const getDocentes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      escuela,
      estado,
      cargo,
      search,
      licenciasProximas
    } = req.query;

    const query = { activo: true };

    if (escuela) query.escuela = escuela;
    if (estado) query.estado = estado;
    if (cargo) query.cargo = cargo;
    
    if (licenciasProximas) {
      const dias = parseInt(licenciasProximas) || 10;
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() + dias);
      
      query.estado = 'Licencia';
      query.fechaFinLicencia = { $lte: fechaLimite, $gte: new Date() };
    }

    if (search) {
      query.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { apellido: { $regex: search, $options: 'i' } },
        { dni: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [docentes, total] = await Promise.all([
      Docente.find(query)
        .populate('escuela', 'escuela de')
        .populate('titularId', 'nombre apellido')
        .populate('suplentes', 'nombre apellido')
        .sort({ apellido: 1, nombre: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Docente.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        docentes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error getting docentes:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener docentes'
    });
  }
};

const getDocenteById = async (req, res) => {
  try {
    const docente = await Docente.findById(req.params.id)
      .populate('escuela', 'escuela de')
      .populate('titularId', 'nombre apellido')
      .populate('suplentes', 'nombre apellido email telefono')
      .lean();

    if (!docente) {
      return res.status(404).json({
        success: false,
        error: 'Docente no encontrado'
      });
    }

    res.json({
      success: true,
      data: docente
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener docente'
    });
  }
};

const createDocente = async (req, res) => {
  try {
    const { escuela: escuelaId, titularId, ...docenteData } = req.body;

    // Verificar escuela
    const escuela = await Escuela.findById(escuelaId);
    if (!escuela) {
      return res.status(404).json({
        success: false,
        error: 'Escuela no encontrada'
      });
    }

    // Si es suplente, verificar titular
    if (docenteData.cargo === 'Suplente') {
      if (!titularId) {
        return res.status(400).json({
          success: false,
          error: 'Suplente debe tener un titular asociado'
        });
      }

      const titular = await Docente.findById(titularId);
      if (!titular) {
        return res.status(404).json({
          success: false,
          error: 'Titular no encontrado'
        });
      }

      if (titular.escuela.toString() !== escuelaId) {
        return res.status(400).json({
          success: false,
          error: 'Titular debe pertenecer a la misma escuela'
        });
      }
    }

    const docente = new Docente({
      ...docenteData,
      escuela: escuelaId,
      titularId,
      createdBy: req.user._id
    });

    await docente.save();

    // Si es suplente, agregar al titular
    if (docenteData.cargo === 'Suplente' && titularId) {
      await Docente.findByIdAndUpdate(titularId, {
        $addToSet: { suplentes: docente._id }
      });
    }

    // Actualizar estadísticas de la escuela
    await escuela.actualizarEstadisticas();

    res.status(201).json({
      success: true,
      data: docente,
      message: 'Docente creado exitosamente'
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'El DNI o CUIL ya existe'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Error al crear docente'
    });
  }
};

const updateDocente = async (req, res) => {
  try {
    const docente = await Docente.findById(req.params.id);

    if (!docente) {
      return res.status(404).json({
        success: false,
        error: 'Docente no encontrado'
      });
    }

    const oldEstado = docente.estado;
    const newEstado = req.body.estado;

    // Actualizar campos
    Object.assign(docente, req.body);
    docente.updatedBy = req.user._id;

    await docente.save();

    // Si cambió el estado, actualizar estadísticas
    if (oldEstado !== newEstado) {
      const escuela = await Escuela.findById(docente.escuela);
      await escuela.actualizarEstadisticas();
    }

    res.json({
      success: true,
      data: docente,
      message: 'Docente actualizado exitosamente'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar docente'
    });
  }
};

const deleteDocente = async (req, res) => {
  try {
    const docente = await Docente.findById(req.params.id);

    if (!docente) {
      return res.status(404).json({
        success: false,
        error: 'Docente no encontrado'
      });
    }

    // Soft delete
    docente.activo = false;
    docente.estado = 'Renunció';
    docente.updatedBy = req.user._id;
    await docente.save();

    // Si era suplente, remover del titular
    if (docente.titularId) {
      await Docente.findByIdAndUpdate(docente.titularId, {
        $pull: { suplentes: docente._id }
      });
    }

    // Actualizar estadísticas de la escuela
    const escuela = await Escuela.findById(docente.escuela);
    await escuela.actualizarEstadisticas();

    res.json({
      success: true,
      message: 'Docente eliminado exitosamente'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar docente'
    });
  }
};

const getLicenciasProximas = async (req, res) => {
  try {
    const dias = parseInt(req.query.dias) || 10;
    
    const docentes = await Docente.findLicenciasProximas(dias);

    res.json({
      success: true,
      data: docentes
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener licencias próximas'
    });
  }
};

const getEstadisticasDocentes = async (req, res) => {
  try {
    const estadisticas = await Docente.aggregate([
      { $match: { activo: true } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          activos: { $sum: { $cond: [{ $eq: ['$estado', 'Activo'] }, 1, 0] } },
          licencia: { $sum: { $cond: [{ $eq: ['$estado', 'Licencia'] }, 1, 0] } },
          porCargo: {
            $push: {
              cargo: '$cargo',
              estado: '$estado'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          total: 1,
          activos: 1,
          licencia: 1,
          porCargo: {
            $reduce: {
              input: '$porCargo',
              initialValue: {},
              in: {
                $$value: {
                  $concatArrays: [
                    { $ifNull: ['$$value.cargo', []] },
                    [{ cargo: '$$this.cargo', estado: '$$this.estado' }]
                  ]
                }
              }
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: estadisticas[0] || { total: 0, activos: 0, licencia: 0, porCargo: [] }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas'
    });
  }
};

module.exports = {
  getDocentes,
  getDocenteById,
  createDocente,
  updateDocente,
  deleteDocente,
  getLicenciasProximas,
  getEstadisticasDocentes
};