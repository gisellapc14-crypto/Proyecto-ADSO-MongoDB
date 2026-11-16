const mongoose = require('mongoose');

const notificacionSchema = new mongoose.Schema({
  destinatario: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, index: true },
  tipo: { type: String, enum: ['nueva_solicitud', 'estado_actualizado'], required: true },
  categoria: { type: String, enum: ['reserva', 'alojamiento', 'vuelo'], required: true },
  codigo: { type: String, required: true, trim: true, maxlength: 40 },
  titulo: { type: String, required: true, trim: true, maxlength: 120 },
  mensaje: { type: String, required: true, trim: true, maxlength: 280 },
  enlace: { type: String, required: true, trim: true, maxlength: 160 },
  leida: { type: Boolean, default: false, index: true }
}, { timestamps: true });

notificacionSchema.index({ destinatario: 1, leida: 1, createdAt: -1 });

module.exports = mongoose.model('Notificacion', notificacionSchema);
