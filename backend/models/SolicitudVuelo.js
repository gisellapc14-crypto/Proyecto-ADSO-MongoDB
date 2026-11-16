const mongoose = require('mongoose');

const solicitudVueloSchema = new mongoose.Schema({
  codigo: { type: String, required: true, unique: true, trim: true, index: true },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, index: true },
  vuelo: { type: mongoose.Schema.Types.ObjectId, ref: 'Vuelo', required: true },
  nombreCliente: { type: String, required: true, trim: true },
  emailCliente: { type: String, required: true, trim: true, lowercase: true },
  telefonoCliente: { type: String, default: '', trim: true },
  aerolinea: { type: String, required: true, trim: true },
  origen: { type: String, required: true, trim: true },
  destino: { type: String, required: true, trim: true },
  tipoViaje: { type: String, enum: ['Ida y vuelta', 'Solo ida'], required: true },
  fechaSalida: { type: Date, required: true },
  fechaRegreso: { type: Date, default: null },
  cantidadViajeros: { type: Number, required: true, min: 1, max: 9 },
  precioReferencial: { type: Number, required: true, min: 0 },
  comentario: { type: String, default: '', trim: true, maxlength: 1000 },
  estado: {
    type: String,
    enum: ['Pendiente de confirmación', 'Confirmada', 'Cancelada'],
    default: 'Pendiente de confirmación',
    index: true
  }
}, { timestamps: true });

module.exports = mongoose.model('SolicitudVuelo', solicitudVueloSchema);
