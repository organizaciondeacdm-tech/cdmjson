const crypto = require('crypto');

// Algoritmo de encriptación AES-256-GCM para datos sensibles
const ENCRYPTION_KEY = crypto.scryptSync(
  process.env.ENCRYPTION_KEY, 
  'salt', 
  32
);
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

const encryptSensitiveData = (text) => {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    throw new Error('Error encrypting sensitive data');
  }
};

const decryptSensitiveData = (encryptedData) => {
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      ENCRYPTION_KEY,
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Error decrypting sensitive data');
  }
};

const hashPassword = async (password) => {
  const bcrypt = require('bcryptjs');
  return await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS));
};

const comparePassword = async (password, hash) => {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(password, hash);
};

module.exports = {
  encryptSensitiveData,
  decryptSensitiveData,
  hashPassword,
  comparePassword
};