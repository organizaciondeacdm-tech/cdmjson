const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const winston = require('winston');
const cron = require('node-cron');

const execPromise = util.promisify(exec);

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/backup.log' })
  ]
});

const realizarBackup = async () => {
  try {
    const backupDir = path.join(process.env.BACKUP_PATH, `backup_${new Date().toISOString().replace(/[:.]/g, '-')}`);
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Backup de MongoDB
    const mongoUri = process.env.MONGODB_URI;
    const mongoBackupPath = path.join(backupDir, 'mongodb');
    
    await execPromise(`mongodump --uri="${mongoUri}" --out="${mongoBackupPath}"`);

    // Comprimir backup
    await execPromise(`tar -czf ${backupDir}.tar.gz -C ${backupDir} .`);

    // Eliminar directorio temporal
    fs.rmSync(backupDir, { recursive: true, force: true });

    // Mantener solo los últimos 30 backups
    const backups = fs.readdirSync(process.env.BACKUP_PATH)
      .filter(f => f.endsWith('.tar.gz'))
      .map(f => ({
        name: f,
        time: fs.statSync(path.join(process.env.BACKUP_PATH, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    if (backups.length > 30) {
      backups.slice(30).forEach(b => {
        fs.unlinkSync(path.join(process.env.BACKUP_PATH, b.name));
      });
    }

    logger.info(`Backup completado: ${backupDir}.tar.gz`);
    return { success: true, path: `${backupDir}.tar.gz` };

  } catch (error) {
    logger.error('Error en backup:', error);
    return { success: false, error: error.message };
  }
};

const restaurarBackup = async (backupFile) => {
  try {
    const backupPath = path.join(process.env.BACKUP_PATH, backupFile);
    
    if (!fs.existsSync(backupPath)) {
      throw new Error('Archivo de backup no encontrado');
    }

    const tempDir = path.join(process.env.BACKUP_PATH, 'temp_restore');
    
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir);

    // Descomprimir
    await execPromise(`tar -xzf ${backupPath} -C ${tempDir}`);

    // Restaurar MongoDB
    const mongoUri = process.env.MONGODB_URI;
    await execPromise(`mongorestore --uri="${mongoUri}" --drop ${tempDir}/mongodb`);

    // Limpiar
    fs.rmSync(tempDir, { recursive: true, force: true });

    logger.info(`Backup restaurado: ${backupFile}`);
    return { success: true };

  } catch (error) {
    logger.error('Error restaurando backup:', error);
    return { success: false, error: error.message };
  }
};

// Programar backup automático
if (process.env.BACKUP_SCHEDULE) {
  cron.schedule(process.env.BACKUP_SCHEDULE, async () => {
    logger.info('Ejecutando backup automático...');
    await realizarBackup();
  });
}

module.exports = {
  realizarBackup,
  restaurarBackup
};