
  const mongoose = require('mongoose');

const conectarDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const proveedor = process.env.MONGO_URI?.startsWith('mongodb+srv://')
      ? 'MongoDB Atlas'
      : 'MongoDB local';
    console.log(`MongoDB conectado correctamente (${proveedor})`);
  } catch (error) {
    console.error('Error al conectar MongoDB:', error.message);
    throw error;
  }
};

module.exports = conectarDB; 
