const Escuela = require('../models/Escuela');
const Docente = require('../models/Docente');
const Alumno = require('../models/Alumno');

const getEscuelas = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      de,
      nivel,
      estado,
      search,
      sortBy = 'escuela',
      order = 'asc'
    } = req.query;

    const query = {};

    // Filtros
    if (de) query.de = de;
    if (nivel) query.nivel = nivel;
    if (estado) query.estado = estado;
    if (search) {
      query.$or = [
        { escuela: { $regex: search, $options: 'i' } },
        { de: { $regex: search, $options: 'i' } },
        { direccion: { $regex: search, $options: 'i' } }
      ];
    }

    // Ordenamiento
    const sort = {};
    sort[sortBy] = order === 'asc' ? 1 : -1;

    // Paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [escuelas, total] = await Promise.all([
      Escuela.find(query)
        .populate({
          path: 'docentes',
          match: { activo: true }
        })
        .populate({
          path: 'alumnos',
          match: { activo: true }
        })
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Escuela.countDocuments(query)
    ]);

    // Calcular estadísticas
    const estadisticas = {
      totalEscuelas: total,
      porNivel: await Escuela.aggregate([
        { $match: query },
        { $group: { _id: '$nivel', count: { $sum: 1 } } }
      ]),
      porDE: await Escuela.aggregate([
        { $match: query },
        { $group: { _id: '$de', count: { $sum: 1 } } }
      ])
    };

    res.json({
      success: true,
      data: {
        escuelas,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        estadisticas
      }
    });

  } catch (error) {
    console.error('Error getting escuelas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener escuelas'
    });
  }
};

const getEscuelaById = async (req, res) => {
  try {
    const escuela = await Escuela.findById(req.params.id)
      .populate({
        path: 'docentes',
        match: { activo: true },
        populate: {
          path: 'suplentes',
          match: { activo: true }
        }
      })
      .populate({
        path: 'alumnos',
        match: { activo: true }
      })
      .lean();

    if (!escuela) {
      return res.status(404).json({
        success: false,
        error: 'Escuela no encontrada'
      });
    }

    res.json({
      success: true,
      data: escuela
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener escuela'
    });
  }
};

const createEscuela = async (req, res) => {
  try {
    const escuelaData = {
      ...req.body,
      createdBy: req.user._id
    };

    const escuela = new Escuela(escuelaData);
    await escuela.save();

    res.status(201).json({
      success: true,
      data: escuela,
      message: 'Escuela creada exitosamente'
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'La escuela ya existe'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Error al crear escuela'
    });
  }
};

const updateEscuela = async (req, res) => {
  try {
    const escuela = await Escuela.findById(req.params.id);

    if (!escuela) {
      return res.status(404).json({
        success: false,
        error: 'Escuela no encontrada'
      });
    }

    // Actualizar campos
    Object.assign(escuela, req.body);
    escuela.updatedBy = req.user._id;

    await escuela.save();

    res.json({
      success: true,
      data: escuela,
      message: 'Escuela actualizada exitosamente'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar escuela'
    });
  }
};

const deleteEscuela = async (req, res) => {
  try {
    const escuela = await Escuela.findById(req.params.id);

    if (!escuela) {
      return res.status(404).json({
        success: false,
        error: 'Escuela no encontrada'
      });
    }

    // Verificar si tiene docentes o alumnos asociados
    const [docentes, alumnos] = await Promise.all([
      Docente.countDocuments({ escuela: escuela._id, activo: true }),
      Alumno.countDocuments({ escuela: escuela._id, activo: true })
    ]);

    if (docentes > 0 || alumnos > 0) {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar la escuela porque tiene docentes o alumnos asociados'
      });
    }

    // Soft delete - marcar como inactiva
    escuela.estado = 'inactiva';
    escuela.updatedBy = req.user._id;
    await escuela.save();

    res.json({
      success: true,
      message: 'Escuela eliminada exitosamente'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar escuela'
    });
  }
};

const getEstadisticasEscuela = async (req, res) => {
  try {
    const escuela = await Escuela.findById(req.params.id);

    if (!escuela) {
      return res.status(404).json({
        success: false,
        error: 'Escuela no encontrada'
      });
    }

    const [alumnosPorGrado, docentesPorCargo, licenciasActivas] = await Promise.all([
      Alumno.aggregate([
        { $match: { escuela: escuela._id, activo: true } },
        { $group: { _id: '$gradoSalaAnio', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Docente.aggregate([
        { $match: { escuela: escuela._id, activo: true } },
        { $group: { _id: '$cargo', count: { $sum: 1 } } }
      ]),
      Docente.countDocuments({
        escuela: escuela._id,
        estado: 'Licencia',
        activo: true
      })
    ]);

    res.json({
      success: true,
      data: {
        totalAlumnos: await Alumno.countDocuments({ escuela: escuela._id, activo: true }),
        totalDocentes: await Docente.countDocuments({ escuela: escuela._id, activo: true }),
        alumnosPorGrado,
        docentesPorCargo,
        licenciasActivas,
        alertas: {
          sinDocentes: (await Docente.countDocuments({ escuela: escuela._id, activo: true })) === 0,
          licenciasProximas: await Docente.findLicenciasProximas(10).countDocuments()
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas'
    });
  }
};

const buscarEscuelas = async (req, res) => {
  try {
    const { q, lat, lng, radio } = req.query;

    let query = { estado: 'activa' };

    // Búsqueda por texto
    if (q) {
      query.$or = [
        { escuela: { $regex: q, $options: 'i' } },
        { de: { $regex: q, $options: 'i' } },
        { direccion: { $regex: q, $options: 'i' } }
      ];
    }

    // Búsqueda geográfica
    if (lat && lng && radio) {
      query.ubicacion = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(radio) * 1000 // Convertir a metros
        }
      };
    }

    const escuelas = await Escuela.find(query)
      .limit(50)
      .populate('docentes', 'nombre apellido cargo estado')
      .lean();

    res.json({
      success: true,
      data: escuelas
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al buscar escuelas'
    });
  }
};

module.exports = {
  getEscuelas,
  getEscuelaById,
  createEscuela,
  updateEscuela,
  deleteEscuela,
  getEstadisticasEscuela,
  buscarEscuelas
};