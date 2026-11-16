const mongoose = require('mongoose');

const solicitudAlojamientoSchema = new mongoose.Schema({
  codigo: { type: String, required: true, unique: true, trim: true, index: true },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, index: true },
  hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  nombreCliente: { type: String, required: true, trim: true },
  emailCliente: { type: String, required: true, trim: true, lowercase: true },
  telefonoCliente: { type: String, default: '', trim: true },
  hotelNombre: { type: String, required: true, trim: true },
  destino: { type: String, required: true, trim: true },
  fechaEntrada: { type: Date, required: true },
  fechaSalida: { type: Date, required: true },
  cantidadHuespedes: { type: Number, required: true, min: 1, max: 12 },
  habitaciones: { type: Number, required: true, min: 1, max: 5 },
  comentario: { type: String, default: '', trim: true, maxlength: 1000 },
  estado: {
    type: String,
    enum: ['Pendiente de confirmación', 'Confirmada', 'Cancelada'],
    default: 'Pendiente de confirmación',
    index: true
  }
}, { timestamps: true });

module.exports = mongoose.model('SolicitudAlojamiento', solicitudAlojamientoSchema);
