const jwt = require('jsonwebtoken');
const User = require('../models/user');

async function autenticar(req, res, next) {
  const encabezado = req.headers.authorization || '';
  const token = encabezado.startsWith('Bearer ') ? encabezado.slice(7) : '';

  if (!token) return res.status(401).json({ error: 'Debes iniciar sesión para realizar esta acción.' });

  try {
    const datos = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await User.findById(datos.id).select('_id name email phone role');
    if (!usuario) return res.status(401).json({ error: 'La sesión ya no es válida. Inicia sesión nuevamente.' });
    req.usuario = usuario;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'La sesión venció o no es válida. Inicia sesión nuevamente.' });
  }
}

function soloAdministrador(req, res, next) {
  if (!req.usuario || req.usuario.role !== 'admin') {
    return res.status(403).json({ error: 'Esta acción solo está disponible para administración.' });
  }
  next();
}

module.exports = { autenticar, soloAdministrador };
