const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  destino: { type: String, required: true, trim: true, index: true },
  ciudad: { type: String, required: true, trim: true },
  pais: { type: String, required: true, trim: true },
  categoriaDestino: { type: String, enum: ['nacional', 'internacional'], required: true, index: true },
  tipo: { type: String, required: true, trim: true, index: true },
  ubicacion: { type: String, required: true, trim: true },
  descripcion: { type: String, required: true, trim: true, maxlength: 900 },
  caracteristicas: [{ type: String, trim: true }],
  todoIncluido: { type: Boolean, default: false, index: true },
  imagen: { type: String, required: true, trim: true },
  galeria: [{ type: String, trim: true }],
  activo: { type: Boolean, default: true, index: true }
}, { timestamps: true });

hotelSchema.index({ nombre: 1, destino: 1 }, { unique: true });

module.exports = mongoose.model('Hotel', hotelSchema);
