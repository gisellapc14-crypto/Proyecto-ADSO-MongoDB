const express = require('express');
const Vuelo = require('../models/Vuelo');

const router = express.Router();

function textoSeguro(valor) {
  return String(valor || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.get('/', async (req, res) => {
  try {
    const filtro = { activo: true };
    const origen = textoSeguro(req.query.origen);
    const destino = textoSeguro(req.query.destino);
    if (origen) filtro.$or = [{ 'origen.codigo': new RegExp('^' + origen + '$', 'i') }, { 'origen.ciudad': new RegExp(origen, 'i') }];
    if (destino) {
      const condicionDestino = [{ 'destino.codigo': new RegExp('^' + destino + '$', 'i') }, { 'destino.ciudad': new RegExp(destino, 'i') }];
      filtro.$and = [filtro.$or ? { $or: filtro.$or } : {}, { $or: condicionDestino }];
      delete filtro.$or;
    }
    if (['nacional', 'internacional'].includes(String(req.query.categoria || '').toLowerCase())) filtro.categoria = String(req.query.categoria).toLowerCase();
    const vuelos = await Vuelo.find(filtro).sort({ categoria: 1, 'origen.codigo': 1, 'destino.codigo': 1, precioIdaVuelta: 1 });
    res.json(vuelos);
  } catch (error) {
    console.error('Error al consultar vuelos:', error.message);
    res.status(500).json({ error: 'No se pudieron consultar los vuelos.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const vuelo = await Vuelo.findOne({ _id: req.params.id, activo: true });
    if (!vuelo) return res.status(404).json({ error: 'Vuelo no encontrado.' });
    res.json(vuelo);
  } catch (error) {
    res.status(400).json({ error: 'Identificador de vuelo inválido.' });
  }
});

module.exports = router;
