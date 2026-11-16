require('dotenv').config();

const mongoose = require('mongoose');
const conectarDB = require('./config/db');
const User = require('./models/user');

const email = String(process.argv[2] || '').trim().toLowerCase();

async function asignarAdministrador() {
  if (!email) {
    console.error('Indica el correo de la cuenta que deseas convertir en administradora.');
    process.exitCode = 1;
    return;
  }

  try {
    await conectarDB();
    const usuario = await User.findOneAndUpdate(
      { email },
      { $set: { role: 'admin' } },
      { new: true, runValidators: true }
    ).select('name email role');

    if (!usuario) {
      console.error('No se encontró una cuenta con ese correo. Regístrala primero desde RallyTraver.');
      process.exitCode = 1;
      return;
    }

    console.log(`La cuenta ${usuario.email} ahora tiene el rol de ${usuario.role}.`);
  } catch (error) {
    console.error('No se pudo asignar el rol de administradora:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

asignarAdministrador();
