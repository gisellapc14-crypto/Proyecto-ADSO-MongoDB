require('dotenv').config();

const mongoose = require('mongoose');
const conectarDB = require('./config/db');
const User = require('./models/user');

const email = String(process.argv[2] || '').trim().toLowerCase();

async function asignarSuperadministradora() {
  if (!email) {
    console.error('Indica el correo de la cuenta que será administradora principal.');
    process.exitCode = 1;
    return;
  }

  try {
    await conectarDB();
    const usuario = await User.findOneAndUpdate(
      { email },
      { $set: { role: 'superadmin' } },
      { new: true, runValidators: true }
    ).select('name email role');

    if (!usuario) {
      console.error('No se encontró una cuenta con ese correo. Regístrala primero desde RallyTraver.');
      process.exitCode = 1;
      return;
    }

    console.log(`La cuenta ${usuario.email} ahora es la administradora principal.`);
  } catch (error) {
    console.error('No se pudo asignar la administradora principal:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

asignarSuperadministradora();
