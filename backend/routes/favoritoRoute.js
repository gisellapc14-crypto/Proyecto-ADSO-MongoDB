const express = require('express');
const Favorito = require('../models/Favorito');
const Destino = require('../models/Destino');
const Hotel = require('../models/Hotel');
const Vuelo = require('../models/Vuelo');
const { autenticar } = require('../middlewares/autenticacion');

const router = express.Router();
const configuracionPorTipo = {
  destino: { Modelo: Destino, modelo: 'Destino' },
  hotel: { Modelo: Hotel, modelo: 'Hotel' },
  vuelo: { Modelo: Vuelo, modelo: 'Vuelo' }
};

router.get('/', autenticar, async (req, res) => {
  try {
    const favoritos = await Favorito.find({ usuario: req.usuario._id }).populate('elemento').sort({ createdAt: -1 });
    res.json(favoritos.filter((favorito) => favorito.elemento));
  } catch (error) {
    console.error('Error al consultar favoritos:', error.message);
    res.status(500).json({ error: 'No se pudieron consultar tus favoritos.' });
  }
});

router.post('/', autenticar, async (req, res) => {
  try {
    const tipo = String(req.body.tipo || '').trim().toLowerCase();
    const elementoId = req.body.elementoId;
    const configuracion = configuracionPorTipo[tipo];
    if (!configuracion || !elementoId) return res.status(400).json({ error: 'Selecciona un elemento válido para guardar.' });

    const elemento = await configuracion.Modelo.findOne({ _id: elementoId, activo: true });
    if (!elemento) return res.status(404).json({ error: 'El elemento seleccionado ya no está disponible.' });

    const favoritoExistente = await Favorito.findOne({ usuario: req.usuario._id, tipo, elemento: elemento._id });
    if (favoritoExistente) return res.status(200).json({ favorito: true, creado: false, item: favoritoExistente });

    const favorito = await Favorito.create({ usuario: req.usuario._id, tipo, modelo: configuracion.modelo, elemento: elemento._id });
    res.status(201).json({ favorito: true, creado: true, item: favorito });
  } catch (error) {
    if (error?.code === 11000) return res.status(200).json({ favorito: true, creado: false });
    console.error('Error al guardar favorito:', error.message);
    res.status(500).json({ error: 'No se pudo guardar el favorito. Intenta nuevamente.' });
  }
});

router.delete('/:tipo/:elementoId', autenticar, async (req, res) => {
  try {
    const tipo = String(req.params.tipo || '').trim().toLowerCase();
    if (!configuracionPorTipo[tipo]) return res.status(400).json({ error: 'Tipo de favorito inválido.' });
    await Favorito.deleteOne({ usuario: req.usuario._id, tipo, elemento: req.params.elementoId });
    res.json({ favorito: false, message: 'El elemento fue retirado de tus favoritos.' });
  } catch (error) {
    res.status(400).json({ error: 'No se pudo retirar el favorito.' });
  }
});

module.exports = router;
