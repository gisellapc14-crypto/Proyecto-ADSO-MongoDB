const express = require('express');
const mongoose = require('mongoose');
const Notificacion = require('../models/Notificacion');
const { autenticar } = require('../middlewares/autenticacion');

const router = express.Router();

router.get('/', autenticar, async (req, res) => {
  try {
    const notificaciones = await Notificacion.find({ destinatario: req.usuario._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    res.json(notificaciones);
  } catch (error) {
    console.error('Error al consultar notificaciones:', error.message);
    res.status(500).json({ error: 'No se pudieron consultar las notificaciones.' });
  }
});

router.get('/resumen', autenticar, async (req, res) => {
  try {
    const noLeidas = await Notificacion.countDocuments({ destinatario: req.usuario._id, leida: false });
    res.json({ noLeidas });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo consultar el resumen de notificaciones.' });
  }
});

router.patch('/marcar-leidas', autenticar, async (req, res) => {
  try {
    const resultado = await Notificacion.updateMany(
      { destinatario: req.usuario._id, leida: false },
      { leida: true }
    );
    res.json({ message: 'Notificaciones marcadas como leídas.', actualizadas: resultado.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron actualizar las notificaciones.' });
  }
});

router.patch('/:id/leer', autenticar, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'La notificación indicada no es válida.' });
    }

    const notificacion = await Notificacion.findOneAndUpdate(
      { _id: req.params.id, destinatario: req.usuario._id },
      { leida: true },
      { new: true }
    ).lean();

    if (!notificacion) return res.status(404).json({ error: 'Notificación no encontrada.' });
    res.json(notificacion);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo actualizar la notificación.' });
  }
});

module.exports = router;
