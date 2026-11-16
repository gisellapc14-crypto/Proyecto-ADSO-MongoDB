const express = require('express');
const ExcelJS = require('exceljs');
const Vuelo = require('../models/Vuelo');
const SolicitudVuelo = require('../models/SolicitudVuelo');
const { autenticar, soloAdministrador } = require('../middlewares/autenticacion');
const { notificarAdministradores, notificarUsuario, eliminarNotificacionesSolicitud, mensajeEstado } = require('../services/notificaciones');
const { enviarCorreoEstadoSolicitud } = require('../services/correoBrevo');

const router = express.Router();
const estadosValidos = ['Pendiente de confirmación', 'Confirmada', 'Cancelada'];
const tiposValidos = ['Ida y vuelta', 'Solo ida'];

function fechaDesdeTexto(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(valor || ''))) return null;
  const [anio, mes, dia] = valor.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  return Number.isNaN(fecha.getTime()) || fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia ? null : fecha;
}

function fechaNoPasada(valor) {
  const fecha = fechaDesdeTexto(valor);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return fecha && fecha >= hoy ? fecha : null;
}

async function generarCodigoSolicitud() {
  const anio = new Date().getFullYear();
  for (let intento = 0; intento < 10; intento += 1) {
    const codigo = `VL-${anio}-${Math.floor(10000 + Math.random() * 90000)}`;
    if (!await SolicitudVuelo.exists({ codigo })) return codigo;
  }
  throw new Error('No fue posible generar el código de la solicitud.');
}

router.post('/', autenticar, async (req, res) => {
  try {
    const { vueloId, tipoViaje, fechaSalida, fechaRegreso, cantidadViajeros, comentario } = req.body;
    const salida = fechaNoPasada(fechaSalida);
    const regreso = tipoViaje === 'Ida y vuelta' ? fechaDesdeTexto(fechaRegreso) : null;
    const viajeros = Number(cantidadViajeros);

    if (!vueloId || !tiposValidos.includes(tipoViaje) || !salida || !Number.isInteger(viajeros) || viajeros < 1 || viajeros > 9 || (tipoViaje === 'Ida y vuelta' && (!regreso || regreso <= salida))) {
      return res.status(400).json({ error: 'Selecciona una opción, fechas válidas y entre 1 y 9 viajeros.' });
    }

    const vuelo = await Vuelo.findOne({ _id: vueloId, activo: true });
    if (!vuelo) return res.status(404).json({ error: 'La opción de vuelo seleccionada ya no está disponible.' });

    const precioBase = tipoViaje === 'Ida y vuelta' ? vuelo.precioIdaVuelta : vuelo.precioSoloIda;
    const solicitud = await SolicitudVuelo.create({
      codigo: await generarCodigoSolicitud(), usuario: req.usuario._id, vuelo: vuelo._id,
      nombreCliente: req.usuario.name, emailCliente: req.usuario.email, telefonoCliente: req.usuario.phone || '',
      aerolinea: vuelo.aerolinea, origen: `${vuelo.origen.ciudad} (${vuelo.origen.codigo})`, destino: `${vuelo.destino.ciudad} (${vuelo.destino.codigo})`,
      tipoViaje, fechaSalida: salida, fechaRegreso: regreso, cantidadViajeros: viajeros,
      precioReferencial: precioBase * viajeros, comentario: comentario || ''
    });

    await notificarAdministradores({
      tipo: 'nueva_solicitud',
      categoria: 'vuelo',
      codigo: solicitud.codigo,
      titulo: 'Nueva solicitud de vuelo',
      mensaje: `${solicitud.nombreCliente} solicitó la ruta ${solicitud.origen} a ${solicitud.destino}.`,
      enlace: `admin.html#${solicitud.codigo}`
    }).catch((error) => console.error('No se pudo crear la notificación de vuelo:', error.message));

    res.status(201).json({
      message: 'Tu solicitud de vuelo fue registrada. Confirmaremos disponibilidad y tarifa final.',
      solicitud: { codigo: solicitud.codigo, estado: solicitud.estado, aerolinea: solicitud.aerolinea }
    });
  } catch (error) {
    console.error('Error al registrar solicitud de vuelo:', error.message);
    res.status(500).json({ error: 'No se pudo registrar la solicitud de vuelo. Intenta nuevamente.' });
  }
});

router.get('/mis-solicitudes', autenticar, async (req, res) => {
  try {
    const solicitudes = await SolicitudVuelo.find({ usuario: req.usuario._id }).populate('vuelo', 'logo ida regreso equipaje cabina').sort({ createdAt: -1 });
    res.json(solicitudes);
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron consultar tus solicitudes de vuelo.' });
  }
});

router.get('/resumen', autenticar, soloAdministrador, async (req, res) => {
  try {
    const conteos = await SolicitudVuelo.aggregate([{ $group: { _id: '$estado', total: { $sum: 1 } } }]);
    const resumen = estadosValidos.reduce((resultado, estado) => ({ ...resultado, [estado]: conteos.find((item) => item._id === estado)?.total || 0 }), { total: 0 });
    resumen.total = conteos.reduce((total, item) => total + item.total, 0);
    res.json(resumen);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo consultar el resumen de vuelos.' });
  }
});

router.get('/exportar/excel', autenticar, soloAdministrador, async (req, res) => {
  try {
    const solicitudes = await SolicitudVuelo.find().sort({ createdAt: -1 });
    const libro = new ExcelJS.Workbook();
    libro.creator = 'RallyTraver';
    const hoja = libro.addWorksheet('Vuelos');
    hoja.columns = [
      { header: 'Código', key: 'codigo', width: 18 }, { header: 'Estado', key: 'estado', width: 27 },
      { header: 'Cliente', key: 'cliente', width: 28 }, { header: 'Correo', key: 'correo', width: 32 },
      { header: 'Teléfono', key: 'telefono', width: 18 }, { header: 'Aerolínea', key: 'aerolinea', width: 18 },
      { header: 'Origen', key: 'origen', width: 24 }, { header: 'Destino', key: 'destino', width: 24 },
      { header: 'Tipo de viaje', key: 'tipo', width: 18 }, { header: 'Salida', key: 'salida', width: 15 },
      { header: 'Regreso', key: 'regreso', width: 15 }, { header: 'Viajeros', key: 'viajeros', width: 12 },
      { header: 'Tarifa referencial', key: 'tarifa', width: 21 }, { header: 'Comentario', key: 'comentario', width: 45 },
      { header: 'Fecha de registro', key: 'creada', width: 20 }
    ];
    hoja.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hoja.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF071D49' } };
    solicitudes.forEach((solicitud) => hoja.addRow({
      codigo: solicitud.codigo, estado: solicitud.estado, cliente: solicitud.nombreCliente, correo: solicitud.emailCliente,
      telefono: solicitud.telefonoCliente, aerolinea: solicitud.aerolinea, origen: solicitud.origen, destino: solicitud.destino,
      tipo: solicitud.tipoViaje, salida: solicitud.fechaSalida.toISOString().slice(0, 10),
      regreso: solicitud.fechaRegreso ? solicitud.fechaRegreso.toISOString().slice(0, 10) : 'No aplica', viajeros: solicitud.cantidadViajeros,
      tarifa: solicitud.precioReferencial, comentario: solicitud.comentario, creada: solicitud.createdAt.toISOString().slice(0, 10)
    }));
    hoja.getColumn('tarifa').numFmt = '$#,##0';
    hoja.views = [{ state: 'frozen', ySplit: 1 }];
    const fechaArchivo = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="vuelos-rallytraver-${fechaArchivo}.xlsx"`);
    await libro.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error al exportar vuelos:', error.message);
    res.status(500).json({ error: 'No se pudo generar el archivo de vuelos.' });
  }
});

router.get('/', autenticar, soloAdministrador, async (req, res) => {
  try {
    const filtro = {};
    if (estadosValidos.includes(req.query.estado)) filtro.estado = req.query.estado;
    if (req.query.buscar) {
      const texto = String(req.query.buscar).trim();
      filtro.$or = [{ codigo: { $regex: texto, $options: 'i' } }, { nombreCliente: { $regex: texto, $options: 'i' } }, { emailCliente: { $regex: texto, $options: 'i' } }, { aerolinea: { $regex: texto, $options: 'i' } }, { origen: { $regex: texto, $options: 'i' } }, { destino: { $regex: texto, $options: 'i' } }];
    }
    res.json(await SolicitudVuelo.find(filtro).populate('usuario', 'name email phone role').populate('vuelo', 'logo').sort({ createdAt: -1 }));
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron consultar las solicitudes de vuelo.' });
  }
});

router.patch('/:id/estado', autenticar, soloAdministrador, async (req, res) => {
  try {
    if (!estadosValidos.includes(req.body.estado)) return res.status(400).json({ error: 'El estado seleccionado no es válido.' });
    const solicitud = await SolicitudVuelo.findById(req.params.id);
    if (!solicitud) return res.status(404).json({ error: 'Solicitud de vuelo no encontrada.' });
    const estadoAnterior = solicitud.estado;
    solicitud.estado = req.body.estado;
    await solicitud.save();

    if (estadoAnterior !== solicitud.estado) {
      const contenido = mensajeEstado('vuelo', solicitud.codigo, solicitud.estado);
      await notificarUsuario(solicitud.usuario, {
        tipo: 'estado_actualizado',
        categoria: 'vuelo',
        codigo: solicitud.codigo,
        ...contenido,
        enlace: `mis-reservas.html#${solicitud.codigo}`
      }).catch((error) => console.error('No se pudo crear la notificación de vuelo:', error.message));

      await enviarCorreoEstadoSolicitud({
        emailCliente: solicitud.emailCliente,
        nombreCliente: solicitud.nombreCliente,
        categoria: 'vuelo',
        codigo: solicitud.codigo,
        estado: solicitud.estado,
        titulo: contenido.titulo,
        detalle: `Ruta: ${solicitud.origen} → ${solicitud.destino}. Aerolínea: ${solicitud.aerolinea}.`
      }).catch((error) => console.error('No se pudo enviar el correo de vuelo:', error.message));
    }

    res.json({ message: `La solicitud ${solicitud.codigo} fue actualizada a ${solicitud.estado}.`, solicitud });
  } catch (error) {
    res.status(400).json({ error: 'No se pudo actualizar la solicitud de vuelo.' });
  }
});

router.delete('/:id', autenticar, soloAdministrador, async (req, res) => {
  try {
    const solicitud = await SolicitudVuelo.findById(req.params.id);
    if (!solicitud) return res.status(404).json({ error: 'Solicitud de vuelo no encontrada.' });

    await Promise.all([
      SolicitudVuelo.deleteOne({ _id: solicitud._id }),
      eliminarNotificacionesSolicitud('vuelo', solicitud.codigo)
    ]);

    res.json({ message: `Solicitud de vuelo ${solicitud.codigo} eliminada correctamente.` });
  } catch (error) {
    res.status(400).json({ error: 'No se pudo eliminar la solicitud de vuelo.' });
  }
});

module.exports = router;
