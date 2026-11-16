const mongoose = require('mongoose');

const itinerarioSchema = new mongoose.Schema({
  lugar: { type: String, trim: true, required: true },
  noches: { type: Number, min: 0, default: null }
}, { _id: false });

const precioTemporadaSchema = new mongoose.Schema({
  temporada: { type: String, trim: true, required: true },
  triple: { type: Number, min: 0, default: null },
  doble: { type: Number, min: 0, default: null },
  individual: { type: Number, min: 0, default: null }
}, { _id: false });

const destinoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  descripcion: { type: String, required: true, trim: true },
  precio: { type: Number, required: true, min: 0 },
  notaPrecio: { type: String, default: 'Precio referencial sujeto a confirmación de disponibilidad.', trim: true },
  imagen: { type: String, default: '' },
  ubicacion: { type: String, required: true, trim: true },
  categoria: {
    type: String,
    enum: ['nacional', 'internacional', 'pasadia'],
    default: 'nacional'
  },
  tipoViaje: {
    type: String,
    enum: ['paquete', 'pasadia'],
    default: 'paquete'
  },
  duracion: { type: String, default: 'Por definir' },
  paises: { type: [{ type: String, trim: true }], default: [] },
  cantidadPaises: { type: Number, min: 0, default: null },
  ciudadesLugares: { type: [{ type: String, trim: true }], default: [] },
  cantidadCiudades: { type: Number, min: 0, default: null },
  modalidad: { type: String, default: 'Por confirmar', trim: true },
  grupoReferencia: { type: String, default: '', trim: true },
  duracionDias: { type: Number, min: 0, default: null },
  duracionNoches: { type: Number, min: 0, default: null },
  salidas: { type: String, default: 'Consultar fechas disponibles', trim: true },
  itinerario: { type: [itinerarioSchema], default: [] },
  preciosTemporada: { type: [precioTemporadaSchema], default: [] },
  hoteles: { type: [String], default: [] },
  incluye: { type: [String], default: [] },
  galeria: { type: [String], default: [] },
  paqueteDestacado: { type: Boolean, default: false },
  destacado: { type: Boolean, default: false },
  activo: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Destino', destinoSchema);
