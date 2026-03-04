const nodemailer = require('nodemailer');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/email.log' })
  ]
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: `"Sistema ACDM" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error('Error sending email:', error);
    throw error;
  }
};

const sendLicenciaProximaAlert = async (docente, escuela, diasRestantes) => {
  const subject = `⚠️ Alerta: Licencia próxima a vencer - ${docente.nombreCompleto}`;
  const html = `
    <h2>Alerta de Licencia</h2>
    <p>La licencia del docente <strong>${docente.nombreCompleto}</strong> está próxima a vencer.</p>
    <p><strong>Escuela:</strong> ${escuela.escuela} (${escuela.de})</p>
    <p><strong>Fecha de fin:</strong> ${new Date(docente.fechaFinLicencia).toLocaleDateString('es-AR')}</p>
    <p><strong>Días restantes:</strong> ${diasRestantes}</p>
    <p><strong>Motivo:</strong> ${docente.motivo}</p>
    <p><strong>Suplente asignado:</strong> ${docente.suplentes.length > 0 ? 'Sí' : 'NO'}</p>
    <hr>
    <p>Por favor, tome las acciones necesarias.</p>
    <p><small>Sistema ACDM - Gestión de Asistentes de Clase</small></p>
  `;

  return sendEmail(escuela.email, subject, html);
};

const sendReporteGenerado = async (user, reporteTipo) => {
  const subject = `📊 Reporte generado - ${reporteTipo}`;
  const html = `
    <h2>Reporte generado exitosamente</h2>
    <p>Hola ${user.nombre},</p>
    <p>Se ha generado un nuevo reporte de tipo <strong>${reporteTipo}</strong>.</p>
    <p>Puede descargarlo desde el sistema.</p>
    <p><small>Sistema ACDM - ${new Date().toLocaleString('es-AR')}</small></p>
  `;

  return sendEmail(user.email, subject, html);
};

module.exports = {
  sendEmail,
  sendLicenciaProximaAlert,
  sendReporteGenerado
};