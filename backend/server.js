require('dotenv').config();
const conectarDB = require('./config/db');

const express = require("express");
const cors = require("cors");
const mongoose = require('mongoose');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const userRoutes = require('./routes/userRoute');
app.use('/api/usuarios', userRoutes);
// Conectamos las rutas de destinos turísticos
const destinoRoutes = require('./routes/destinoRoute');
app.use('/api/destinos', destinoRoutes);
const contactoRoutes = require('./routes/contactoRoute');
app.use('/api/contactos', contactoRoutes);
const reservaRoutes = require('./routes/reservaRoute');
app.use('/api/reservas', reservaRoutes);
app.get('/api/salud', (req, res) => {
  res.json({
    estado: mongoose.connection.readyState === 1 ? 'ok' : 'sin conexión',
    proveedor: process.env.MONGO_URI?.startsWith('mongodb+srv://') ? 'MongoDB Atlas' : 'MongoDB local',
    baseDeDatos: mongoose.connection.name || 'rallytravel',
    servidor: mongoose.connection.host || 'pendiente'
  });
});

app.get('/', (req, res) => {
  res.send('Servidor funcionando');
});

const iniciarServidor = async () => {
  try {
    await conectarDB();
    const puerto = process.env.PORT || 8080;
    app.listen(puerto, () => {
      console.log(`Servidor corriendo en http://localhost:${puerto}`);
    });
  } catch (error) {
    console.error('No se pudo iniciar el servidor. Verifica que MongoDB esté encendido.');
    process.exit(1);
  }
};

iniciarServidor();
