const Notificacion = require('../models/Notificacion');
const User = require('../models/user');

async function notificarAdministradores(datos) {
  const administradores = await User.find({ role: { $in: ['admin', 'superadmin'] } }).select('_id').lean();
  if (!administradores.length) return;

  await Notificacion.insertMany(administradores.map((administrador) => ({
    ...datos,
    destinatario: administrador._id
  })));
}

async function notificarUsuario(destinatario, datos) {
  if (!destinatario) return;
  await Notificacion.create({ ...datos, destinatario });
}

async function eliminarNotificacionesSolicitud(categoria, codigo) {
  await Notificacion.deleteMany({ categoria, codigo });
}

function mensajeEstado(categoria, codigo, estado) {
  const nombres = {
    reserva: 'reserva',
    alojamiento: 'solicitud de alojamiento',
    vuelo: 'solicitud de vuelo'
  };
  const nombre = nombres[categoria] || 'solicitud';

  if (estado === 'Confirmada') {
    return {
      titulo: 'Solicitud confirmada',
      mensaje: `Tu ${nombre} ${codigo} fue confirmada por RallyTraver.`
    };
  }

  if (estado === 'Cancelada') {
    return {
      titulo: 'Actualización de solicitud',
      mensaje: `Tu ${nombre} ${codigo} fue cancelada. Consulta los detalles de la solicitud.`
    };
  }

  return {
    titulo: 'Solicitud en revisión',
    mensaje: `Tu ${nombre} ${codigo} está pendiente de confirmación por RallyTraver.`
  };
}

module.exports = { notificarAdministradores, notificarUsuario, eliminarNotificacionesSolicitud, mensajeEstado };
