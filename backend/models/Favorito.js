const mongoose = require('mongoose');

const favoritoSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, index: true },
  tipo: { type: String, enum: ['destino', 'hotel', 'vuelo'], required: true },
  modelo: { type: String, enum: ['Destino', 'Hotel', 'Vuelo'], required: true },
  elemento: { type: mongoose.Schema.Types.ObjectId, refPath: 'modelo', required: true }
}, { timestamps: true });

favoritoSchema.index({ usuario: 1, tipo: 1, elemento: 1 }, { unique: true });

module.exports = mongoose.model('Favorito', favoritoSchema);
