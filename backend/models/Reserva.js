const mongoose = require('mongoose');

const reservaSchema = new mongoose.Schema({
  codigo: { type: String, required: true, unique: true, trim: true, index: true },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, index: true },
  destino: { type: mongoose.Schema.Types.ObjectId, ref: 'Destino', required: true },
  nombreCliente: { type: String, required: true, trim: true },
  emailCliente: { type: String, required: true, trim: true, lowercase: true },
  telefonoCliente: { type: String, default: '', trim: true },
  destinoNombre: { type: String, required: true, trim: true },
  precioReferencial: { type: Number, required: true, min: 0 },
  fechaViaje: { type: Date, required: true },
  cantidadViajeros: { type: Number, required: true, min: 1, max: 20 },
  comentario: { type: String, default: '', trim: true, maxlength: 1000 },
  estado: {
    type: String,
    enum: ['Pendiente de confirmación', 'Confirmada', 'Cancelada'],
    default: 'Pendiente de confirmación',
    index: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Reserva', reservaSchema);
