const mongoose = require('mongoose');

const contactoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  mensaje: { type: String, required: true, trim: true },
  tipo: { type: String, enum: ['contacto', 'reserva'], default: 'contacto' }
}, { timestamps: true });

module.exports = mongoose.model('Contacto', contactoSchema);
