const Escuela = require('../models/Escuela');
const Docente = require('../models/Docente');
const Alumno = require('../models/Alumno');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

const generarReporteEscuelas = async (req, res) => {
  try {
    const { formato = 'json', filtros } = req.query;

    const query = {};
    if (filtros) {
      const f = JSON.parse(filtros);
      if (f.de) query.de = f.de;
      if (f.nivel) query.nivel = f.nivel;
      if (f.estado) query.estado = f.estado;
    }

    const escuelas = await Escuela.find(query)
      .populate({
        path: 'docentes',
        match: { activo: true },
        select: 'nombre apellido cargo estado fechaFinLicencia'
      })
      .populate({
        path: 'alumnos',
        match: { activo: true },
        select: 'nombre apellido gradoSalaAnio diagnostico'
      })
      .lean();

    // Preparar datos para reporte
    const reporte = escuelas.map(esc => ({
      de: esc.de,
      escuela: esc.escuela,
      nivel: esc.nivel,
      direccion: esc.direccion,
      localidad: esc.localidad,
      telefono: esc.telefonos.find(t => t.principal)?.numero || esc.telefonos[0]?.numero,
      email: esc.email,
      totalDocentes: esc.docentes.length,
      totalAlumnos: esc.alumnos.length,
      docentesActivos: esc.docentes.filter(d => d.estado === 'Activo').length,
      docentesLicencia: esc.docentes.filter(d => d.estado === 'Licencia').length,
      alumnosPorGrado: esc.alumnos.reduce((acc, a) => {
        acc[a.gradoSalaAnio] = (acc[a.gradoSalaAnio] || 0) + 1;
        return acc;
      }, {})
    }));

    // Generar según formato
    switch (formato) {
      case 'csv':
        const fields = ['de', 'escuela', 'nivel', 'totalDocentes', 'totalAlumnos', 'docentesActivos', 'docentesLicencia'];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(reporte);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_escuelas.csv');
        return res.send(csv);

      case 'pdf':
        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_escuelas.pdf');
        
        doc.pipe(res);
        
        // Generar PDF
        doc.fontSize(20).text('Reporte de Escuelas - Sistema ACDM', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(`Generado: ${new Date().toLocaleString('es-AR')}`, { align: 'right' });
        doc.moveDown();
        
        reporte.forEach((esc, index) => {
          if (index > 0) doc.moveDown();
          doc.fontSize(14).text(`${esc.de} - ${esc.escuela}`);
          doc.fontSize(10).text(`Nivel: ${esc.nivel}`);
          doc.fontSize(10).text(`Dirección: ${esc.direccion}, ${esc.localidad}`);
          doc.fontSize(10).text(`Contacto: ${esc.telefono || 'N/A'} - ${esc.email}`);
          doc.fontSize(10).text(`Docentes: ${esc.totalDocentes} (Activos: ${esc.docentesActivos}, Licencia: ${esc.docentesLicencia})`);
          doc.fontSize(10).text(`Alumnos: ${esc.totalAlumnos}`);
          
          // Agregar alumnos por grado
          if (Object.keys(esc.alumnosPorGrado).length > 0) {
            doc.fontSize(9).text('Alumnos por grado:');
            Object.entries(esc.alumnosPorGrado).forEach(([grado, count]) => {
              doc.fontSize(8).text(`  ${grado}: ${count}`, { indent: 10 });
            });
          }
          
          doc.moveDown();
        });
        
        doc.end();
        return;

      default:
        return res.json({
          success: true,
          data: reporte,
          metadata: {
            total: reporte.length,
            generado: new Date().toISOString(),
            usuario: req.user.username
          }
        });
    }

  } catch (error) {
    console.error('Error generando reporte:', error);
    res.status(500).json({
      success: false,
      error: 'Error al generar reporte'
    });
  }
};

const generarReporteLicencias = async (req, res) => {
  try {
    const docentes = await Docente.find({
      estado: 'Licencia',
      activo: true
    })
    .populate('escuela', 'escuela de')
    .sort({ fechaFinLicencia: 1 })
    .lean();

    const reporte = docentes.map(d => ({
      docente: `${d.apellido}, ${d.nombre}`,
      dni: d.dni,
      escuela: d.escuela.escuela,
      de: d.escuela.de,
      motivo: d.motivo,
      fechaInicio: d.fechaInicioLicencia,
      fechaFin: d.fechaFinLicencia,
      diasRestantes: d.diasRestantesLicencia,
      alerta: d.alertaLicencia,
      suplentes: d.suplentes.length
    }));

    // Estadísticas
    const estadisticas = {
      totalLicencias: reporte.length,
      criticas: reporte.filter(r => r.alerta === 'critica').length,
      proximas: reporte.filter(r => r.alerta === 'proxima').length,
      porMotivo: reporte.reduce((acc, r) => {
        acc[r.motivo] = (acc[r.motivo] || 0) + 1;
        return acc;
      }, {})
    };

    res.json({
      success: true,
      data: {
        licencias: reporte,
        estadisticas
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al generar reporte de licencias'
    });
  }
};

const generarReporteAlumnos = async (req, res) => {
  try {
    const { diagnostico, escuela } = req.query;

    const query = { activo: true };
    if (diagnostico) query['diagnosticoDetallado.tipo'] = diagnostico;
    if (escuela) query.escuela = escuela;

    const alumnos = await Alumno.find(query)
      .populate('escuela', 'escuela de')
      .sort({ apellido: 1 })
      .lean();

    const reporte = alumnos.map(a => ({
      alumno: `${a.apellido}, ${a.nombre}`,
      dni: a.dni,
      edad: a.edad,
      escuela: a.escuela.escuela,
      de: a.escuela.de,
      grado: a.gradoSalaAnio,
      diagnostico: a.diagnostico,
      tipoDiagnostico: a.diagnosticoDetallado?.tipo,
      necesitaAcompañante: a.necesidades.some(n => n.requiereAsistente),
      obraSocial: a.obraSocial?.nombre || 'Sin obra social',
      certificadoDiscapacidad: a.certificadoDiscapacidad?.tiene ? 'Sí' : 'No'
    }));

    res.json({
      success: true,
      data: reporte,
      metadata: {
        total: reporte.length,
        filtros: { diagnostico, escuela }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al generar reporte de alumnos'
    });
  }
};

const generarDashboard = async (req, res) => {
  try {
    const [
      totalEscuelas,
      totalDocentes,
      totalAlumnos,
      licenciasActivas,
      escuelasSinDocentes,
      alumnosPorDiagnostico,
      docentesPorEstado
    ] = await Promise.all([
      Escuela.countDocuments({ estado: 'activa' }),
      Docente.countDocuments({ activo: true }),
      Alumno.countDocuments({ activo: true }),
      Docente.countDocuments({ estado: 'Licencia', activo: true }),
      Escuela.countDocuments({
        estado: 'activa',
        'estadisticas.totalDocentes': 0
      }),
      Alumno.aggregate([
        { $match: { activo: true } },
        { $group: { _id: '$diagnosticoDetallado.tipo', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Docente.aggregate([
        { $match: { activo: true } },
        { $group: { _id: '$estado', count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totales: {
          escuelas: totalEscuelas,
          docentes: totalDocentes,
          alumnos: totalAlumnos,
          licenciasActivas,
          escuelasSinDocentes
        },
        distribuciones: {
          alumnosPorDiagnostico,
          docentesPorEstado
        },
        alertas: {
          licenciasProximas: await Docente.findLicenciasProximas(10).countDocuments(),
          escuelasSinDocentes
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al generar dashboard'
    });
  }
};

module.exports = {
  generarReporteEscuelas,
  generarReporteLicencias,
  generarReporteAlumnos,
  generarDashboard
};