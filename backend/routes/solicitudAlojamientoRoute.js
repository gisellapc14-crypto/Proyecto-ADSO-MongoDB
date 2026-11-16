const express = require('express');
const ExcelJS = require('exceljs');
const Hotel = require('../models/Hotel');
const SolicitudAlojamiento = require('../models/SolicitudAlojamiento');
const { autenticar, soloAdministrador } = require('../middlewares/autenticacion');

const router = express.Router();
const estadosValidos = ['Pendiente de confirmación', 'Confirmada', 'Cancelada'];

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
    const codigo = `HT-${anio}-${Math.floor(10000 + Math.random() * 90000)}`;
    if (!await SolicitudAlojamiento.exists({ codigo })) return codigo;
  }
  throw new Error('No fue posible generar el código de la solicitud.');
}

router.post('/', autenticar, async (req, res) => {
  try {
    const { hotelId, fechaEntrada, fechaSalida, cantidadHuespedes, habitaciones, comentario } = req.body;
    const entrada = fechaNoPasada(fechaEntrada);
    const salida = fechaDesdeTexto(fechaSalida);
    const huespedes = Number(cantidadHuespedes);
    const cantidadHabitaciones = Number(habitaciones);

    if (!hotelId || !entrada || !salida || salida <= entrada || !Number.isInteger(huespedes) || huespedes < 1 || huespedes > 12 || !Number.isInteger(cantidadHabitaciones) || cantidadHabitaciones < 1 || cantidadHabitaciones > 5) {
      return res.status(400).json({ error: 'Selecciona un hotel, fechas válidas, entre 1 y 12 huéspedes y entre 1 y 5 habitaciones.' });
    }

    const hotel = await Hotel.findOne({ _id: hotelId, activo: true });
    if (!hotel) return res.status(404).json({ error: 'El hotel seleccionado ya no está disponible.' });

    const solicitud = await SolicitudAlojamiento.create({
      codigo: await generarCodigoSolicitud(), usuario: req.usuario._id, hotel: hotel._id,
      nombreCliente: req.usuario.name, emailCliente: req.usuario.email, telefonoCliente: req.usuario.phone || '',
      hotelNombre: hotel.nombre, destino: hotel.destino, fechaEntrada: entrada, fechaSalida: salida,
      cantidadHuespedes: huespedes, habitaciones: cantidadHabitaciones, comentario: comentario || ''
    });

    res.status(201).json({ message: 'Solicitud de alojamiento registrada. Confirmaremos disponibilidad con el hotel.', solicitud: { codigo: solicitud.codigo, estado: solicitud.estado, hotel: solicitud.hotelNombre } });
  } catch (error) {
    console.error('Error al registrar solicitud de alojamiento:', error.message);
    res.status(500).json({ error: 'No se pudo registrar la solicitud de alojamiento. Intenta nuevamente.' });
  }
});

router.get('/mis-solicitudes', autenticar, async (req, res) => {
  try {
    const solicitudes = await SolicitudAlojamiento.find({ usuario: req.usuario._id }).populate('hotel', 'nombre imagen ubicacion').sort({ createdAt: -1 });
    res.json(solicitudes);
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron consultar tus solicitudes de alojamiento.' });
  }
});

router.get('/resumen', autenticar, soloAdministrador, async (req, res) => {
  try {
    const conteos = await SolicitudAlojamiento.aggregate([{ $group: { _id: '$estado', total: { $sum: 1 } } }]);
    const resumen = estadosValidos.reduce((resultado, estado) => ({ ...resultado, [estado]: conteos.find((item) => item._id === estado)?.total || 0 }), { total: 0 });
    resumen.total = conteos.reduce((total, item) => total + item.total, 0);
    res.json(resumen);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo consultar el resumen de alojamientos.' });
  }
});

router.get('/exportar/excel', autenticar, soloAdministrador, async (req, res) => {
  try {
    const solicitudes = await SolicitudAlojamiento.find().sort({ createdAt: -1 });
    const libro = new ExcelJS.Workbook();
    libro.creator = 'RallyTraver';
    const hoja = libro.addWorksheet('Alojamientos');
    hoja.columns = [
      { header: 'Código', key: 'codigo', width: 18 }, { header: 'Estado', key: 'estado', width: 27 },
      { header: 'Cliente', key: 'cliente', width: 28 }, { header: 'Correo', key: 'correo', width: 32 },
      { header: 'Teléfono', key: 'telefono', width: 18 }, { header: 'Hotel', key: 'hotel', width: 35 },
      { header: 'Destino', key: 'destino', width: 25 }, { header: 'Entrada', key: 'entrada', width: 15 },
      { header: 'Salida', key: 'salida', width: 15 }, { header: 'Huéspedes', key: 'huespedes', width: 14 },
      { header: 'Habitaciones', key: 'habitaciones', width: 15 }, { header: 'Comentario', key: 'comentario', width: 45 },
      { header: 'Fecha de registro', key: 'creada', width: 20 }
    ];
    hoja.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hoja.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF071D49' } };
    solicitudes.forEach((solicitud) => hoja.addRow({
      codigo: solicitud.codigo, estado: solicitud.estado, cliente: solicitud.nombreCliente, correo: solicitud.emailCliente,
      telefono: solicitud.telefonoCliente, hotel: solicitud.hotelNombre, destino: solicitud.destino,
      entrada: solicitud.fechaEntrada.toISOString().slice(0, 10), salida: solicitud.fechaSalida.toISOString().slice(0, 10),
      huespedes: solicitud.cantidadHuespedes, habitaciones: solicitud.habitaciones, comentario: solicitud.comentario,
      creada: solicitud.createdAt.toISOString().slice(0, 10)
    }));
    hoja.views = [{ state: 'frozen', ySplit: 1 }];
    const fechaArchivo = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="alojamientos-rallytraver-${fechaArchivo}.xlsx"`);
    await libro.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error al exportar alojamientos:', error.message);
    res.status(500).json({ error: 'No se pudo generar el archivo de alojamientos.' });
  }
});

router.get('/', autenticar, soloAdministrador, async (req, res) => {
  try {
    const filtro = {};
    if (estadosValidos.includes(req.query.estado)) filtro.estado = req.query.estado;
    if (req.query.buscar) {
      const texto = String(req.query.buscar).trim();
      filtro.$or = [{ codigo: { $regex: texto, $options: 'i' } }, { nombreCliente: { $regex: texto, $options: 'i' } }, { emailCliente: { $regex: texto, $options: 'i' } }, { hotelNombre: { $regex: texto, $options: 'i' } }, { destino: { $regex: texto, $options: 'i' } }];
    }
    res.json(await SolicitudAlojamiento.find(filtro).populate('usuario', 'name email phone role').populate('hotel', 'nombre ubicacion').sort({ createdAt: -1 }));
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron consultar las solicitudes de alojamiento.' });
  }
});

router.patch('/:id/estado', autenticar, soloAdministrador, async (req, res) => {
  try {
    if (!estadosValidos.includes(req.body.estado)) return res.status(400).json({ error: 'El estado seleccionado no es válido.' });
    const solicitud = await SolicitudAlojamiento.findByIdAndUpdate(req.params.id, { estado: req.body.estado }, { new: true, runValidators: true });
    if (!solicitud) return res.status(404).json({ error: 'Solicitud de alojamiento no encontrada.' });
    res.json({ message: `La solicitud ${solicitud.codigo} fue actualizada a ${solicitud.estado}.`, solicitud });
  } catch (error) {
    res.status(400).json({ error: 'No se pudo actualizar la solicitud de alojamiento.' });
  }
});

module.exports = router;
