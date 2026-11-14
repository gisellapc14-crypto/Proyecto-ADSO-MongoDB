const express = require('express');
const Contacto = require('../models/Contacto');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { nombre, email, mensaje, tipo } = req.body;
    if (!nombre || !email || !mensaje) {
      return res.status(400).json({ error: 'Nombre, correo y mensaje son obligatorios.' });
    }
    const solicitud = await Contacto.create({ nombre, email, mensaje, tipo });
    res.status(201).json({ message: 'Solicitud recibida correctamente.', id: solicitud._id });
  } catch (error) {
    console.error('Error al guardar la solicitud:', error.message);
    res.status(500).json({ error: 'No se pudo guardar la solicitud.' });
  }
});

module.exports = router;
