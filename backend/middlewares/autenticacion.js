const jwt = require('jsonwebtoken');
const User = require('../models/user');

async function autenticar(req, res, next) {
  const encabezado = req.headers.authorization || '';
  const token = encabezado.startsWith('Bearer ') ? encabezado.slice(7) : '';

  if (!token) return res.status(401).json({ error: 'Debes iniciar sesión para realizar esta acción.' });

  try {
    const datos = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await User.findById(datos.id).select('_id name email born phone fotoPerfil role');
    if (!usuario) return res.status(401).json({ error: 'La sesión ya no es válida. Inicia sesión nuevamente.' });
    req.usuario = usuario;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'La sesión venció o no es válida. Inicia sesión nuevamente.' });
  }
}

function esAdministrador(usuario) {
  return ['admin', 'superadmin'].includes(usuario?.role);
}

function soloAdministrador(req, res, next) {
  if (!esAdministrador(req.usuario)) {
    return res.status(403).json({ error: 'Esta acción solo está disponible para administración.' });
  }
  next();
}

function soloSuperadministrador(req, res, next) {
  if (!req.usuario || req.usuario.role !== 'superadmin') {
    return res.status(403).json({ error: 'Esta acción solo está disponible para la administradora principal.' });
  }
  next();
}

module.exports = { autenticar, soloAdministrador, soloSuperadministrador, esAdministrador };
