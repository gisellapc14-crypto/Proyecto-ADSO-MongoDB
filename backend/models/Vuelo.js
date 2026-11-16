const mongoose = require('mongoose');

const tramoSchema = new mongoose.Schema({
  referencia: { type: String, default: '', trim: true },
  salida: { type: String, required: true, trim: true },
  llegada: { type: String, required: true, trim: true },
  duracion: { type: String, required: true, trim: true },
  escalas: { type: String, required: true, trim: true }
}, { _id: false });

const vueloSchema = new mongoose.Schema({
  codigo: { type: String, required: true, unique: true, trim: true, index: true },
  categoria: { type: String, enum: ['nacional', 'internacional'], required: true, index: true },
  origen: {
    ciudad: { type: String, required: true, trim: true },
    codigo: { type: String, required: true, trim: true, uppercase: true }
  },
  destino: {
    ciudad: { type: String, required: true, trim: true },
    codigo: { type: String, required: true, trim: true, uppercase: true }
  },
  aerolinea: { type: String, required: true, trim: true, index: true },
  enlaceAerolinea: { type: String, required: true, trim: true },
  logo: { type: String, required: true, trim: true },
  ida: { type: tramoSchema, required: true },
  regreso: { type: tramoSchema, required: true },
  precioSoloIda: { type: Number, required: true, min: 0 },
  precioIdaVuelta: { type: Number, required: true, min: 0 },
  equipaje: { type: String, required: true, trim: true },
  cabina: { type: String, required: true, trim: true },
  nota: { type: String, required: true, trim: true },
  fuenteRutaHorario: { type: String, default: '', trim: true },
  fechaConsulta: { type: Date, default: Date.now },
  esReferencial: { type: Boolean, default: true },
  activo: { type: Boolean, default: true, index: true }
}, { timestamps: true });

vueloSchema.index({ 'origen.codigo': 1, 'destino.codigo': 1, aerolinea: 1 });

module.exports = mongoose.model('Vuelo', vueloSchema);
