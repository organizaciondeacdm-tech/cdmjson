// config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  // Si ya estamos conectados, usar conexión existente
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  const MONGODB_URI = process.env.MONGODB_URI;
  
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI no está definida');
  }

  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout rápido para serverless
      socketTimeoutMS: 45000,
      maxPoolSize: 10, // Pool de conexiones
      minPoolSize: 0,
      maxIdleTimeMS: 10000,
    });

    console.log(`📊 MongoDB Conectado: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    throw error;
  }
};

module.exports = connectDB;
