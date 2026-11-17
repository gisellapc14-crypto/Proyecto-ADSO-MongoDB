const express = require('express');
const ExcelJS = require('exceljs');
const Reserva = require('../models/Reserva');
const SolicitudAlojamiento = require('../models/SolicitudAlojamiento');
const SolicitudVuelo = require('../models/SolicitudVuelo');
const { autenticar, soloAdministrador } = require('../middlewares/autenticacion');

const router = express.Router();
const estados = ['Pendiente de confirmación', 'Confirmada', 'Cancelada'];
const colorPrincipal = 'FF071D49';
const colorResumen = 'FFEAF4FC';

function fechaArchivo(valor) {
  return valor ? new Date(valor).toISOString().slice(0, 10) : '';
}

function aplicarEncabezado(hoja) {
  hoja.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  hoja.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorPrincipal } };
  hoja.getRow(1).alignment = { vertical: 'middle' };
  hoja.getRow(1).height = 23;
  hoja.views = [{ state: 'frozen', ySplit: 1 }];
  hoja.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + hoja.columns.length)}1` };
}

function totalPorEstado(elementos, estado) {
  return elementos.filter((elemento) => elemento.estado === estado).length;
}

function agregarResumen(libro, reservas, alojamientos, vuelos) {
  const hoja = libro.addWorksheet('Resumen');
  hoja.columns = [
    { width: 29 }, { width: 14 }, { width: 25 }, { width: 16 }, { width: 16 }
  ];
  hoja.mergeCells('A1:E1');
  hoja.getCell('A1').value = 'Reporte integral de solicitudes - RallyTraver';
  hoja.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  hoja.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: colorPrincipal };
  hoja.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  hoja.getRow(1).height = 30;
  hoja.mergeCells('A2:E2');
  hoja.getCell('A2').value = `Generado el ${new Date().toLocaleString('es-CO')}`;
  hoja.getCell('A2').font = { italic: true, color: { argb: 'FF52677C' } };

  hoja.addRow([]);
  const encabezado = hoja.addRow(['Tipo de solicitud', 'Total', 'Pendientes', 'Confirmadas', 'Canceladas']);
  encabezado.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  encabezado.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1769AA' } };

  const grupos = [
    ['Paquetes y reservas', reservas],
    ['Alojamientos', alojamientos],
    ['Vuelos', vuelos]
  ];
  grupos.forEach(([nombre, elementos]) => {
    hoja.addRow([nombre, elementos.length, ...estados.map((estado) => totalPorEstado(elementos, estado))]);
  });
  const totalGeneral = reservas.concat(alojamientos, vuelos);
  const filaTotal = hoja.addRow(['Total general', totalGeneral.length, ...estados.map((estado) => totalPorEstado(totalGeneral, estado))]);
  filaTotal.font = { bold: true, color: { argb: colorPrincipal } };
  filaTotal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorResumen } };
  hoja.views = [{ state: 'frozen', ySplit: 4 }];
}

function agregarReservas(libro, reservas) {
  const hoja = libro.addWorksheet('Paquetes y reservas');
  hoja.columns = [
    { header: 'Código', key: 'codigo', width: 18 }, { header: 'Estado', key: 'estado', width: 27 },
    { header: 'Cliente', key: 'cliente', width: 28 }, { header: 'Correo', key: 'correo', width: 32 },
    { header: 'Teléfono', key: 'telefono', width: 18 }, { header: 'Destino', key: 'destino', width: 30 },
    { header: 'Fecha de viaje', key: 'fechaViaje', width: 17 }, { header: 'Viajeros', key: 'viajeros', width: 12 },
    { header: 'Precio referencial (COP)', key: 'precio', width: 25 }, { header: 'Comentario', key: 'comentario', width: 45 },
    { header: 'Fecha de registro', key: 'creada', width: 20 }
  ];
  reservas.forEach((reserva) => hoja.addRow({
    codigo: reserva.codigo, estado: reserva.estado, cliente: reserva.nombreCliente, correo: reserva.emailCliente,
    telefono: reserva.telefonoCliente, destino: reserva.destinoNombre, fechaViaje: fechaArchivo(reserva.fechaViaje),
    viajeros: reserva.cantidadViajeros, precio: reserva.precioReferencial, comentario: reserva.comentario,
    creada: fechaArchivo(reserva.createdAt)
  }));
  hoja.getColumn('precio').numFmt = '$#,##0';
  aplicarEncabezado(hoja);
}

function agregarAlojamientos(libro, solicitudes) {
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
  solicitudes.forEach((solicitud) => hoja.addRow({
    codigo: solicitud.codigo, estado: solicitud.estado, cliente: solicitud.nombreCliente, correo: solicitud.emailCliente,
    telefono: solicitud.telefonoCliente, hotel: solicitud.hotelNombre, destino: solicitud.destino,
    entrada: fechaArchivo(solicitud.fechaEntrada), salida: fechaArchivo(solicitud.fechaSalida),
    huespedes: solicitud.cantidadHuespedes, habitaciones: solicitud.habitaciones, comentario: solicitud.comentario,
    creada: fechaArchivo(solicitud.createdAt)
  }));
  aplicarEncabezado(hoja);
}

function agregarVuelos(libro, solicitudes) {
  const hoja = libro.addWorksheet('Vuelos');
  hoja.columns = [
    { header: 'Código', key: 'codigo', width: 18 }, { header: 'Estado', key: 'estado', width: 27 },
    { header: 'Cliente', key: 'cliente', width: 28 }, { header: 'Correo', key: 'correo', width: 32 },
    { header: 'Teléfono', key: 'telefono', width: 18 }, { header: 'Aerolínea', key: 'aerolinea', width: 18 },
    { header: 'Origen', key: 'origen', width: 24 }, { header: 'Destino', key: 'destino', width: 24 },
    { header: 'Tipo de viaje', key: 'tipo', width: 18 }, { header: 'Salida', key: 'salida', width: 15 },
    { header: 'Regreso', key: 'regreso', width: 15 }, { header: 'Viajeros', key: 'viajeros', width: 12 },
    { header: 'Tarifa referencial (COP)', key: 'tarifa', width: 25 }, { header: 'Comentario', key: 'comentario', width: 45 },
    { header: 'Fecha de registro', key: 'creada', width: 20 }
  ];
  solicitudes.forEach((solicitud) => hoja.addRow({
    codigo: solicitud.codigo, estado: solicitud.estado, cliente: solicitud.nombreCliente, correo: solicitud.emailCliente,
    telefono: solicitud.telefonoCliente, aerolinea: solicitud.aerolinea, origen: solicitud.origen, destino: solicitud.destino,
    tipo: solicitud.tipoViaje, salida: fechaArchivo(solicitud.fechaSalida),
    regreso: solicitud.fechaRegreso ? fechaArchivo(solicitud.fechaRegreso) : 'No aplica', viajeros: solicitud.cantidadViajeros,
    tarifa: solicitud.precioReferencial, comentario: solicitud.comentario, creada: fechaArchivo(solicitud.createdAt)
  }));
  hoja.getColumn('tarifa').numFmt = '$#,##0';
  aplicarEncabezado(hoja);
}

router.get('/exportar/todo', autenticar, soloAdministrador, async (req, res) => {
  try {
    const [reservas, alojamientos, vuelos] = await Promise.all([
      Reserva.find().sort({ createdAt: -1 }).lean(),
      SolicitudAlojamiento.find().sort({ createdAt: -1 }).lean(),
      SolicitudVuelo.find().sort({ createdAt: -1 }).lean()
    ]);
    const libro = new ExcelJS.Workbook();
    libro.creator = 'RallyTraver';
    libro.created = new Date();
    agregarResumen(libro, reservas, alojamientos, vuelos);
    agregarReservas(libro, reservas);
    agregarAlojamientos(libro, alojamientos);
    agregarVuelos(libro, vuelos);

    const fecha = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-integral-rallytraver-${fecha}.xlsx"`);
    await libro.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error al exportar el reporte integral:', error.message);
    res.status(500).json({ error: 'No se pudo generar el reporte integral.' });
  }
});

module.exports = router;
