const express = require('express');
const router = express.Router();
const Destino = require('../models/Destino');

router.post('/', async (req, res) => {
  try {
    const destino = await Destino.create(req.body);
    res.status(201).json({ message: 'Destino creado correctamente.', destino });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { categoria, tipoViaje, destacado, precioMinimo, precioMaximo, limite } = req.query;
    const filtro = { activo: true };
    if (['nacional', 'internacional', 'pasadia'].includes(categoria)) filtro.categoria = categoria;
    if (['paquete', 'pasadia'].includes(tipoViaje)) filtro.tipoViaje = tipoViaje;
    if (destacado === 'true') filtro.destacado = true;
    if (precioMinimo || precioMaximo) {
      filtro.precio = {};
      if (precioMinimo && !Number.isNaN(Number(precioMinimo))) filtro.precio.$gte = Number(precioMinimo);
      if (precioMaximo && !Number.isNaN(Number(precioMaximo))) filtro.precio.$lte = Number(precioMaximo);
    }
    let consulta = Destino.find(filtro).sort({ destacado: -1, precio: 1 });
    if (limite && Number.isInteger(Number(limite))) consulta = consulta.limit(Math.min(Number(limite), 48));
    res.json(await consulta);
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron obtener los destinos.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const destino = await Destino.findOne({ _id: req.params.id, activo: true });
    if (!destino) return res.status(404).json({ error: 'Destino no encontrado.' });
    res.json(destino);
  } catch (error) {
    res.status(400).json({ error: 'Identificador de destino inválido.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const destino = await Destino.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!destino) return res.status(404).json({ error: 'Destino no encontrado.' });
    res.json({ message: 'Destino actualizado correctamente.', destino });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const destino = await Destino.findByIdAndUpdate(req.params.id, { activo: false }, { new: true });
    if (!destino) return res.status(404).json({ error: 'Destino no encontrado.' });
    res.json({ message: 'Destino desactivado correctamente.' });
  } catch (error) {
    res.status(400).json({ error: 'Identificador de destino inválido.' });
  }
});

module.exports = router;
