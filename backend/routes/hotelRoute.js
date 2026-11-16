const express = require('express');
const Hotel = require('../models/Hotel');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const filtro = { activo: true };
    const texto = String(req.query.buscar || '').trim();
    if (texto) {
      const patron = new RegExp(texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filtro.$or = [{ nombre: patron }, { destino: patron }, { ciudad: patron }, { pais: patron }, { ubicacion: patron }, { tipo: patron }, { caracteristicas: patron }];
    }
    if (req.query.destino) filtro.destino = String(req.query.destino).trim();
    if (req.query.tipo) filtro.tipo = String(req.query.tipo).trim();
    if (req.query.todoIncluido === 'true') filtro.todoIncluido = true;
    if (['nacional', 'internacional'].includes(req.query.categoria)) filtro.categoriaDestino = req.query.categoria;

    const hoteles = await Hotel.find(filtro).sort({ destino: 1, nombre: 1 });
    res.json(hoteles);
  } catch (error) {
    console.error('Error al consultar hoteles:', error.message);
    res.status(500).json({ error: 'No se pudieron consultar los hoteles.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const hotel = await Hotel.findOne({ _id: req.params.id, activo: true });
    if (!hotel) return res.status(404).json({ error: 'Hotel no encontrado.' });
    res.json(hotel);
  } catch (error) {
    res.status(400).json({ error: 'Identificador de hotel inválido.' });
  }
});

module.exports = router;
