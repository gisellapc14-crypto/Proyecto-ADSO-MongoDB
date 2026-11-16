const express = require('express');
const ExcelJS = require('exceljs');
const Reserva = require('../models/Reserva');
const Destino = require('../models/Destino');
const { autenticar, soloAdministrador } = require('../middlewares/autenticacion');
const { notificarAdministradores, notificarUsuario, eliminarNotificacionesSolicitud, mensajeEstado } = require('../services/notificaciones');
const { enviarCorreoEstadoSolicitud } = require('../services/correoBrevo');

const router = express.Router();
const estadosValidos = ['Pendiente de confirmación', 'Confirmada', 'Cancelada'];

async function generarCodigoReserva() {
  const anio = new Date().getFullYear();
  for (let intento = 0; intento < 10; intento += 1) {
    const consecutivo = Math.floor(10000 + Math.random() * 90000);
    const codigo = `RT-${anio}-${consecutivo}`;
    const existe = await Reserva.exists({ codigo });
    if (!existe) return codigo;
  }
  throw new Error('No fue posible generar el código de la reserva.');
}

function fechaValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(valor || ''))) return null;
  const [anio, mes, dia] = valor.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  if (Number.isNaN(fecha.getTime()) || fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return fecha >= hoy ? fecha : null;
}

function consultaReservas() {
  return Reserva.find().populate('usuario', 'name email phone role').populate('destino', 'nombre ubicacion').sort({ createdAt: -1 });
}

router.post('/', autenticar, async (req, res) => {
  try {
    const { destinoId, fechaViaje, cantidadViajeros, comentario } = req.body;
    const fecha = fechaValida(fechaViaje);
    const viajeros = Number(cantidadViajeros);

    if (!destinoId || !fecha || !Number.isInteger(viajeros) || viajeros < 1 || viajeros > 20) {
      return res.status(400).json({ error: 'Selecciona un destino, una fecha válida y entre 1 y 20 viajeros.' });
    }

    const destino = await Destino.findOne({ _id: destinoId, activo: true });
    if (!destino) return res.status(404).json({ error: 'El destino seleccionado ya no está disponible.' });

    const reserva = await Reserva.create({
      codigo: await generarCodigoReserva(),
      usuario: req.usuario._id,
      destino: destino._id,
      nombreCliente: req.usuario.name,
      emailCliente: req.usuario.email,
      telefonoCliente: req.usuario.phone || '',
      destinoNombre: destino.nombre,
      precioReferencial: destino.precio,
      fechaViaje: fecha,
      cantidadViajeros: viajeros,
      comentario: comentario || ''
    });

    await notificarAdministradores({
      tipo: 'nueva_solicitud',
      categoria: 'reserva',
      codigo: reserva.codigo,
      titulo: 'Nueva reserva recibida',
      mensaje: `${reserva.nombreCliente} registró la reserva ${reserva.codigo} para ${reserva.destinoNombre}.`,
      enlace: `admin.html#${reserva.codigo}`
    }).catch((error) => console.error('No se pudo crear la notificación de reserva:', error.message));

    res.status(201).json({
      message: 'Reserva registrada. La disponibilidad será confirmada por nuestro equipo.',
      reserva: { codigo: reserva.codigo, estado: reserva.estado, fechaViaje: reserva.fechaViaje, destino: reserva.destinoNombre }
    });
  } catch (error) {
    console.error('Error al registrar reserva:', error.message);
    res.status(500).json({ error: 'No se pudo registrar la reserva. Intenta nuevamente.' });
  }
});

router.get('/mis-reservas', autenticar, async (req, res) => {
  try {
    const reservas = await Reserva.find({ usuario: req.usuario._id }).populate('destino', 'nombre imagen ubicacion').sort({ createdAt: -1 });
    res.json(reservas);
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron consultar tus reservas.' });
  }
});

router.get('/resumen', autenticar, soloAdministrador, async (req, res) => {
  try {
    const conteos = await Reserva.aggregate([{ $group: { _id: '$estado', total: { $sum: 1 } } }]);
    const resumen = estadosValidos.reduce((acumulado, estado) => {
      acumulado[estado] = conteos.find((item) => item._id === estado)?.total || 0;
      return acumulado;
    }, { total: 0 });
    resumen.total = conteos.reduce((total, item) => total + item.total, 0);
    res.json(resumen);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo consultar el resumen de reservas.' });
  }
});

router.get('/exportar/excel', autenticar, soloAdministrador, async (req, res) => {
  try {
    const reservas = await consultaReservas();
    const libro = new ExcelJS.Workbook();
    libro.creator = 'RallyTraver';
    const hoja = libro.addWorksheet('Reservas');
    hoja.columns = [
      { header: 'Código', key: 'codigo', width: 18 },
      { header: 'Estado', key: 'estado', width: 27 },
      { header: 'Cliente', key: 'cliente', width: 28 },
      { header: 'Correo', key: 'correo', width: 32 },
      { header: 'Teléfono', key: 'telefono', width: 18 },
      { header: 'Destino', key: 'destino', width: 30 },
      { header: 'Fecha de viaje', key: 'fechaViaje', width: 17 },
      { header: 'Viajeros', key: 'viajeros', width: 12 },
      { header: 'Precio referencial (COP)', key: 'precio', width: 25 },
      { header: 'Comentario', key: 'comentario', width: 45 },
      { header: 'Fecha de registro', key: 'creada', width: 20 }
    ];
    hoja.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hoja.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF071D49' } };
    reservas.forEach((reserva) => hoja.addRow({
      codigo: reserva.codigo,
      estado: reserva.estado,
      cliente: reserva.nombreCliente,
      correo: reserva.emailCliente,
      telefono: reserva.telefonoCliente,
      destino: reserva.destinoNombre,
      fechaViaje: reserva.fechaViaje ? reserva.fechaViaje.toISOString().slice(0, 10) : '',
      viajeros: reserva.cantidadViajeros,
      precio: reserva.precioReferencial,
      comentario: reserva.comentario,
      creada: reserva.createdAt ? reserva.createdAt.toISOString().slice(0, 10) : ''
    }));
    hoja.getColumn('precio').numFmt = '#,##0';
    hoja.views = [{ state: 'frozen', ySplit: 1 }];

    const fechaArchivo = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="reservas-rallytraver-${fechaArchivo}.xlsx"`);
    await libro.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error al exportar reservas:', error.message);
    res.status(500).json({ error: 'No se pudo generar el archivo de reservas.' });
  }
});

router.get('/', autenticar, soloAdministrador, async (req, res) => {
  try {
    const filtro = {};
    if (estadosValidos.includes(req.query.estado)) filtro.estado = req.query.estado;
    if (req.query.buscar) {
      const texto = String(req.query.buscar).trim();
      filtro.$or = [
        { codigo: { $regex: texto, $options: 'i' } },
        { nombreCliente: { $regex: texto, $options: 'i' } },
        { emailCliente: { $regex: texto, $options: 'i' } },
        { destinoNombre: { $regex: texto, $options: 'i' } }
      ];
    }
    const reservas = await Reserva.find(filtro).populate('usuario', 'name email phone role').populate('destino', 'nombre ubicacion').sort({ createdAt: -1 });
    res.json(reservas);
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron consultar las reservas.' });
  }
});

router.patch('/:id/estado', autenticar, soloAdministrador, async (req, res) => {
  try {
    const { estado } = req.body;
    if (!estadosValidos.includes(estado)) return res.status(400).json({ error: 'El estado seleccionado no es válido.' });
    const reserva = await Reserva.findById(req.params.id);
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada.' });
    const estadoAnterior = reserva.estado;
    reserva.estado = estado;
    await reserva.save();

    if (estadoAnterior !== reserva.estado) {
      const contenido = mensajeEstado('reserva', reserva.codigo, reserva.estado);
      await notificarUsuario(reserva.usuario, {
        tipo: 'estado_actualizado',
        categoria: 'reserva',
        codigo: reserva.codigo,
        ...contenido,
        enlace: `mis-reservas.html#${reserva.codigo}`
      }).catch((error) => console.error('No se pudo crear la notificación de reserva:', error.message));

      await enviarCorreoEstadoSolicitud({
        emailCliente: reserva.emailCliente,
        nombreCliente: reserva.nombreCliente,
        categoria: 'reserva',
        codigo: reserva.codigo,
        estado: reserva.estado,
        titulo: contenido.titulo,
        detalle: `Destino: ${reserva.destinoNombre}. Fecha estimada: ${new Date(reserva.fechaViaje).toLocaleDateString('es-CO', { timeZone: 'UTC' })}.`
      }).catch((error) => console.error('No se pudo enviar el correo de reserva:', error.message));
    }

    res.json({ message: `La reserva ${reserva.codigo} fue actualizada a ${reserva.estado}.`, reserva });
  } catch (error) {
    res.status(400).json({ error: 'No se pudo actualizar la reserva.' });
  }
});

router.delete('/:id', autenticar, soloAdministrador, async (req, res) => {
  try {
    const reserva = await Reserva.findById(req.params.id);
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada.' });

    await Promise.all([
      Reserva.deleteOne({ _id: reserva._id }),
      eliminarNotificacionesSolicitud('reserva', reserva.codigo)
    ]);

    res.json({ message: `Reserva ${reserva.codigo} eliminada correctamente.` });
  } catch (error) {
    res.status(400).json({ error: 'No se pudo eliminar la reserva.' });
  }
});

module.exports = router;
