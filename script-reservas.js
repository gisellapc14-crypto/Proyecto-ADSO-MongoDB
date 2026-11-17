const API_ORIGEN_RESERVAS = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:8080'
  : 'https://rallytraver-api.onrender.com';
const API_RESERVAS_CLIENTE = `${API_ORIGEN_RESERVAS}/api/reservas`;
const API_SOLICITUDES_ALOJAMIENTO_CLIENTE = `${API_ORIGEN_RESERVAS}/api/solicitudes-alojamiento`;
const API_SOLICITUDES_VUELO_CLIENTE = `${API_ORIGEN_RESERVAS}/api/solicitudes-vuelo`;
const estadosReserva = ['Pendiente de confirmación', 'Confirmada', 'Cancelada'];
const formatoCOPReservas = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

function escaparHTML(valor) {
  return String(valor || '').replace(/[&<>'"]/g, (caracter) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[caracter]);
}

function fechaCorta(valor) {
  if (!valor) return 'Por confirmar';
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? 'Por confirmar' : fecha.toLocaleDateString('es-CO', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' });
}

function encabezadosAutenticados() {
  const sesion = obtenerSesionRallyTraver();
  return { Authorization: 'Bearer ' + sesion.token };
}

function validarSesion(requiereAdmin = false) {
  const sesion = obtenerSesionRallyTraver();
  if (!sesion) {
    enviarAInicioSesion();
    return null;
  }
  if (requiereAdmin && sesion.usuario.role !== 'admin') {
    window.location.href = 'paginaprincipal.html';
    return null;
  }
  return sesion;
}

async function respuestaSegura(respuesta) {
  const datos = await respuesta.json().catch(() => ({}));
  if (respuesta.status === 401) {
    localStorage.removeItem('rallytraverToken');
    localStorage.removeItem('rallytraverUsuario');
    enviarAInicioSesion();
    throw new Error('Tu sesión venció. Inicia sesión nuevamente.');
  }
  if (!respuesta.ok) throw new Error(datos.error || 'No se pudo completar la solicitud.');
  return datos;
}

function tarjetaReserva(reserva) {
  const estadoClase = reserva.estado === 'Confirmada' ? 'is-confirmed' : reserva.estado === 'Cancelada' ? 'is-cancelled' : 'is-pending';
  return '<article class="rt-reservation-card" data-solicitud-codigo="' + escaparHTML(reserva.codigo) + '"><div class="rt-reservation-card-top"><span class="rt-reservation-code">' + escaparHTML(reserva.codigo) + '</span><span class="rt-reservation-status ' + estadoClase + '">' + escaparHTML(reserva.estado) + '</span></div><h2>' + escaparHTML(reserva.destinoNombre) + '</h2><dl><div><dt>Fecha estimada</dt><dd>' + fechaCorta(reserva.fechaViaje) + '</dd></div><div><dt>Viajeros</dt><dd>' + escaparHTML(reserva.cantidadViajeros) + '</dd></div><div><dt>Precio referencial</dt><dd>' + formatoCOPReservas.format(reserva.precioReferencial || 0) + '</dd></div><div><dt>Registrada</dt><dd>' + fechaCorta(reserva.createdAt) + '</dd></div></dl>' + (reserva.comentario ? '<p class="rt-reservation-comment">' + escaparHTML(reserva.comentario) + '</p>' : '') + '</article>';
}

function tarjetaSolicitudAlojamiento(solicitud) {
  const estadoClase = solicitud.estado === 'Confirmada' ? 'is-confirmed' : solicitud.estado === 'Cancelada' ? 'is-cancelled' : 'is-pending';
  return '<article class="rt-reservation-card" data-solicitud-codigo="' + escaparHTML(solicitud.codigo) + '"><div class="rt-reservation-card-top"><span class="rt-reservation-code">' + escaparHTML(solicitud.codigo) + '</span><span class="rt-reservation-status ' + estadoClase + '">' + escaparHTML(solicitud.estado) + '</span></div><h2>' + escaparHTML(solicitud.hotelNombre) + '</h2><dl><div><dt>Destino</dt><dd>' + escaparHTML(solicitud.destino) + '</dd></div><div><dt>Entrada</dt><dd>' + fechaCorta(solicitud.fechaEntrada) + '</dd></div><div><dt>Salida</dt><dd>' + fechaCorta(solicitud.fechaSalida) + '</dd></div><div><dt>Huéspedes</dt><dd>' + escaparHTML(solicitud.cantidadHuespedes) + ' · ' + escaparHTML(solicitud.habitaciones) + ' hab.</dd></div><div><dt>Registrada</dt><dd>' + fechaCorta(solicitud.createdAt) + '</dd></div></dl>' + (solicitud.comentario ? '<p class="rt-reservation-comment">' + escaparHTML(solicitud.comentario) + '</p>' : '') + '</article>';
}

function tarjetaSolicitudVuelo(solicitud) {
  const estadoClase = solicitud.estado === 'Confirmada' ? 'is-confirmed' : solicitud.estado === 'Cancelada' ? 'is-cancelled' : 'is-pending';
  return '<article class="rt-reservation-card" data-solicitud-codigo="' + escaparHTML(solicitud.codigo) + '"><div class="rt-reservation-card-top"><span class="rt-reservation-code">' + escaparHTML(solicitud.codigo) + '</span><span class="rt-reservation-status ' + estadoClase + '">' + escaparHTML(solicitud.estado) + '</span></div><h2>' + escaparHTML(solicitud.origen) + ' → ' + escaparHTML(solicitud.destino) + '</h2><dl><div><dt>Aerolínea</dt><dd>' + escaparHTML(solicitud.aerolinea) + '</dd></div><div><dt>Salida</dt><dd>' + fechaCorta(solicitud.fechaSalida) + '</dd></div>' + (solicitud.tipoViaje === 'Ida y vuelta' ? '<div><dt>Regreso</dt><dd>' + fechaCorta(solicitud.fechaRegreso) + '</dd></div>' : '') + '<div><dt>Viajeros</dt><dd>' + escaparHTML(solicitud.cantidadViajeros) + '</dd></div><div><dt>Tarifa referencial</dt><dd>' + formatoCOPReservas.format(solicitud.precioReferencial || 0) + '</dd></div><div><dt>Registrada</dt><dd>' + fechaCorta(solicitud.createdAt) + '</dd></div></dl>' + (solicitud.comentario ? '<p class="rt-reservation-comment">' + escaparHTML(solicitud.comentario) + '</p>' : '') + '</article>';
}

function resaltarSolicitudDesdeNotificacion() {
  const codigo = decodeURIComponent(window.location.hash.slice(1));
  if (!codigo) return;
  const destino = Array.from(document.querySelectorAll('[data-solicitud-codigo]')).find((elemento) => elemento.dataset.solicitudCodigo === codigo);
  if (!destino || destino.classList.contains('is-notification-target')) return;
  destino.classList.add('is-notification-target');
  destino.scrollIntoView({ behavior: 'smooth', block: 'center' });
  window.setTimeout(() => destino.classList.remove('is-notification-target'), 5500);
}

async function cargarMisReservas() {
  const sesion = validarSesion();
  const contenedor = document.getElementById('lista-mis-reservas');
  if (!sesion || !contenedor) return;
  const saludo = document.getElementById('saludo-reservas');
  if (saludo) saludo.textContent = sesion.usuario.name + ', consulta el estado y los detalles de las experiencias que registraste.';

  try {
    const respuesta = await fetch(API_RESERVAS_CLIENTE + '/mis-reservas', { headers: encabezadosAutenticados() });
    const reservas = await respuestaSegura(respuesta);
    contenedor.innerHTML = reservas.length ? reservas.map(tarjetaReserva).join('') : '<div class="rt-empty"><h2>Aún no tienes reservas registradas.</h2><p>Explora las experiencias disponibles y registra tu próxima aventura.</p><a class="rt-primary" href="landingpage.html">Explorar destinos</a></div>';
    resaltarSolicitudDesdeNotificacion();
  } catch (error) {
    contenedor.innerHTML = '<p class="rt-empty">' + escaparHTML(error.message) + '</p>';
  }
}

async function cargarMisSolicitudesAlojamiento() {
  const sesion = validarSesion();
  const contenedor = document.getElementById('lista-mis-solicitudes-alojamiento');
  if (!sesion || !contenedor) return;
  try {
    const respuesta = await fetch(API_SOLICITUDES_ALOJAMIENTO_CLIENTE + '/mis-solicitudes', { headers: encabezadosAutenticados() });
    const solicitudes = await respuestaSegura(respuesta);
    contenedor.innerHTML = solicitudes.length ? solicitudes.map(tarjetaSolicitudAlojamiento).join('') : '<div class="rt-empty"><h2>Aún no tienes solicitudes de alojamiento.</h2><p>Explora hoteles y registra tu próxima estadía.</p><a class="rt-primary" href="hoteles.html">Explorar hoteles</a></div>';
    resaltarSolicitudDesdeNotificacion();
  } catch (error) {
    contenedor.innerHTML = '<p class="rt-empty">' + escaparHTML(error.message) + '</p>';
  }
}

async function cargarMisSolicitudesVuelo() {
  const sesion = validarSesion();
  const contenedor = document.getElementById('lista-mis-solicitudes-vuelo');
  if (!sesion || !contenedor) return;
  try {
    const respuesta = await fetch(API_SOLICITUDES_VUELO_CLIENTE + '/mis-solicitudes', { headers: encabezadosAutenticados() });
    const solicitudes = await respuestaSegura(respuesta);
    contenedor.innerHTML = solicitudes.length ? solicitudes.map(tarjetaSolicitudVuelo).join('') : '<div class="rt-empty"><h2>Aún no tienes solicitudes de vuelo.</h2><p>Explora las opciones disponibles y registra la ruta de tu próximo viaje.</p><a class="rt-primary" href="vuelos.html">Explorar vuelos</a></div>';
    resaltarSolicitudDesdeNotificacion();
  } catch (error) {
    contenedor.innerHTML = '<p class="rt-empty">' + escaparHTML(error.message) + '</p>';
  }
}

function opcionesEstado(estadoActual) {
  return estadosReserva.map((estado) => '<option value="' + escaparHTML(estado) + '"' + (estado === estadoActual ? ' selected' : '') + '>' + escaparHTML(estado) + '</option>').join('');
}

const temporizadoresMensajesAdmin = {};

function mostrarMensajeAdmin(idMensaje, texto, tipo = 'info') {
  const mensaje = document.getElementById(idMensaje);
  if (!mensaje) return;

  window.clearTimeout(temporizadoresMensajesAdmin[idMensaje]);
  mensaje.textContent = texto;
  mensaje.className = 'rt-admin-feedback is-' + tipo;

  if (tipo === 'success') {
    temporizadoresMensajesAdmin[idMensaje] = window.setTimeout(() => {
      mensaje.textContent = '';
      mensaje.className = 'rt-admin-feedback';
    }, 6500);
  }
}

function configurarBotonesEliminar(tabla, selector, api, idMensaje, recargar, etiqueta) {
  tabla.querySelectorAll(selector).forEach((boton) => {
    boton.addEventListener('click', () => eliminarSolicitudAdmin(boton, api, idMensaje, recargar, etiqueta));
  });
}

async function eliminarSolicitudAdmin(boton, api, idMensaje, recargar, etiqueta) {
  const codigo = boton.dataset.codigo || 'seleccionada';
  const confirmar = window.confirm('¿Eliminar definitivamente ' + etiqueta + ' ' + codigo + '? Esta acción no se puede deshacer.');
  if (!confirmar) return;

  boton.disabled = true;
  try {
    const respuesta = await fetch(api + '/' + encodeURIComponent(boton.dataset.id), {
      method: 'DELETE',
      headers: encabezadosAutenticados()
    });
    const resultado = await respuestaSegura(respuesta);
    await recargar();
    mostrarMensajeAdmin(idMensaje, resultado.message || etiqueta + ' eliminada correctamente.', 'success');
  } catch (error) {
    mostrarMensajeAdmin(idMensaje, error.message, 'error');
    boton.disabled = false;
  }
}

function renderizarTablaAdmin(reservas) {
  const tabla = document.getElementById('tabla-reservas');
  if (!tabla) return;
  if (!reservas.length) {
    tabla.innerHTML = '<tr><td colspan="8">No hay reservas que coincidan con los filtros.</td></tr>';
    return;
  }
  tabla.innerHTML = reservas.map((reserva) => '<tr data-solicitud-codigo="' + escaparHTML(reserva.codigo) + '"><td><strong>' + escaparHTML(reserva.codigo) + '</strong></td><td>' + escaparHTML(reserva.nombreCliente) + '<small>' + escaparHTML(reserva.emailCliente) + '</small><small>' + escaparHTML(reserva.telefonoCliente || 'Sin teléfono') + '</small></td><td>' + escaparHTML(reserva.destinoNombre) + '<small>' + formatoCOPReservas.format(reserva.precioReferencial || 0) + '</small></td><td>' + fechaCorta(reserva.fechaViaje) + '</td><td>' + escaparHTML(reserva.cantidadViajeros) + '</td><td><select data-estado-reserva="' + escaparHTML(reserva._id) + '">' + opcionesEstado(reserva.estado) + '</select></td><td>' + fechaCorta(reserva.createdAt) + '</td><td><button class="rt-admin-delete" type="button" data-id="' + escaparHTML(reserva._id) + '" data-codigo="' + escaparHTML(reserva.codigo) + '">Eliminar</button></td></tr>').join('');
  tabla.querySelectorAll('[data-estado-reserva]').forEach((selector) => selector.addEventListener('change', () => actualizarEstadoReserva(selector)));
  configurarBotonesEliminar(tabla, '.rt-admin-delete', API_RESERVAS_CLIENTE, 'admin-mensaje', cargarReservasAdmin, 'la reserva');
  resaltarSolicitudDesdeNotificacion();
}

async function cargarResumenAdmin() {
  const respuesta = await fetch(API_RESERVAS_CLIENTE + '/resumen', { headers: encabezadosAutenticados() });
  const resumen = await respuestaSegura(respuesta);
  const contenedor = document.getElementById('admin-resumen');
  if (!contenedor) return;
  contenedor.innerHTML = '<article><span>Total</span><strong>' + resumen.total + '</strong></article><article><span>Pendientes</span><strong>' + resumen['Pendiente de confirmación'] + '</strong></article><article><span>Confirmadas</span><strong>' + resumen.Confirmada + '</strong></article><article><span>Canceladas</span><strong>' + resumen.Cancelada + '</strong></article>';
}

async function cargarReservasAdmin() {
  if (!validarSesion(true)) return;
  const mensaje = document.getElementById('admin-mensaje');
  const buscar = document.getElementById('admin-buscar')?.value.trim() || '';
  const estado = document.getElementById('admin-estado')?.value || '';
  const parametros = new URLSearchParams();
  if (buscar) parametros.set('buscar', buscar);
  if (estado) parametros.set('estado', estado);
  try {
    const [respuestaReservas] = await Promise.all([
      fetch(API_RESERVAS_CLIENTE + (parametros.toString() ? '?' + parametros.toString() : ''), { headers: encabezadosAutenticados() }),
      cargarResumenAdmin()
    ]);
    const reservas = await respuestaSegura(respuestaReservas);
    renderizarTablaAdmin(reservas);
    if (mensaje) mensaje.textContent = reservas.length + ' reserva' + (reservas.length === 1 ? '' : 's') + ' encontrada' + (reservas.length === 1 ? '' : 's') + '.';
  } catch (error) {
    if (mensaje) mensaje.textContent = error.message;
    const tabla = document.getElementById('tabla-reservas');
    if (tabla) tabla.innerHTML = '<tr><td colspan="8">No se pudieron cargar las reservas.</td></tr>';
  }
}

async function actualizarEstadoReserva(selector) {
  selector.disabled = true;
  try {
    const respuesta = await fetch(API_RESERVAS_CLIENTE + '/' + selector.dataset.estadoReserva + '/estado', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...encabezadosAutenticados() },
      body: JSON.stringify({ estado: selector.value })
    });
    const resultado = await respuestaSegura(respuesta);
    mostrarMensajeAdmin('admin-mensaje', 'Reserva actualizada a ' + resultado.reserva.estado + ' correctamente.', 'success');
    await cargarResumenAdmin();
  } catch (error) {
    mostrarMensajeAdmin('admin-mensaje', error.message, 'error');
    await cargarReservasAdmin();
  } finally {
    selector.disabled = false;
  }
}

async function exportarReservasExcel() {
  const boton = document.getElementById('exportar-reservas');
  const mensaje = document.getElementById('admin-mensaje');
  boton.disabled = true;
  if (mensaje) mensaje.textContent = 'Generando archivo de Excel...';
  try {
    const respuesta = await fetch(API_RESERVAS_CLIENTE + '/exportar/excel', { headers: encabezadosAutenticados() });
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      throw new Error(datos.error || 'No se pudo generar el archivo.');
    }
    const archivo = await respuesta.blob();
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(archivo);
    enlace.download = 'reservas-rallytraver.xlsx';
    enlace.click();
    URL.revokeObjectURL(enlace.href);
    if (mensaje) mensaje.textContent = 'El archivo de reservas se descargó correctamente.';
  } catch (error) {
    if (mensaje) mensaje.textContent = error.message;
  } finally {
    boton.disabled = false;
  }
}

function renderizarTablaAlojamientos(solicitudes) {
  const tabla = document.getElementById('tabla-alojamientos');
  if (!tabla) return;
  if (!solicitudes.length) {
    tabla.innerHTML = '<tr><td colspan="8">No hay solicitudes de alojamiento registradas.</td></tr>';
    return;
  }
  tabla.innerHTML = solicitudes.map((solicitud) => '<tr data-solicitud-codigo="' + escaparHTML(solicitud.codigo) + '"><td><strong>' + escaparHTML(solicitud.codigo) + '</strong></td><td>' + escaparHTML(solicitud.nombreCliente) + '<small>' + escaparHTML(solicitud.emailCliente) + '</small><small>' + escaparHTML(solicitud.telefonoCliente || 'Sin teléfono') + '</small></td><td>' + escaparHTML(solicitud.hotelNombre) + '<small>' + escaparHTML(solicitud.destino) + '</small></td><td>' + fechaCorta(solicitud.fechaEntrada) + '<small>Salida: ' + fechaCorta(solicitud.fechaSalida) + '</small></td><td>' + escaparHTML(solicitud.cantidadHuespedes) + ' huésped(es)<small>' + escaparHTML(solicitud.habitaciones) + ' habitación(es)</small></td><td><select data-estado-alojamiento="' + escaparHTML(solicitud._id) + '">' + opcionesEstado(solicitud.estado) + '</select></td><td>' + fechaCorta(solicitud.createdAt) + '</td><td><button class="rt-admin-delete" type="button" data-id="' + escaparHTML(solicitud._id) + '" data-codigo="' + escaparHTML(solicitud.codigo) + '">Eliminar</button></td></tr>').join('');
  tabla.querySelectorAll('[data-estado-alojamiento]').forEach((selector) => selector.addEventListener('change', () => actualizarEstadoAlojamiento(selector)));
  configurarBotonesEliminar(tabla, '.rt-admin-delete', API_SOLICITUDES_ALOJAMIENTO_CLIENTE, 'admin-mensaje-alojamientos', cargarSolicitudesAlojamientoAdmin, 'la solicitud de alojamiento');
  resaltarSolicitudDesdeNotificacion();
}

async function cargarSolicitudesAlojamientoAdmin() {
  if (!validarSesion(true)) return;
  const mensaje = document.getElementById('admin-mensaje-alojamientos');
  try {
    const respuesta = await fetch(API_SOLICITUDES_ALOJAMIENTO_CLIENTE, { headers: encabezadosAutenticados() });
    const solicitudes = await respuestaSegura(respuesta);
    renderizarTablaAlojamientos(solicitudes);
    if (mensaje) mensaje.textContent = solicitudes.length + ' solicitud' + (solicitudes.length === 1 ? '' : 'es') + ' de alojamiento registrada' + (solicitudes.length === 1 ? '' : 's') + '.';
  } catch (error) {
    if (mensaje) mensaje.textContent = error.message;
    const tabla = document.getElementById('tabla-alojamientos');
    if (tabla) tabla.innerHTML = '<tr><td colspan="8">No se pudieron cargar las solicitudes de alojamiento.</td></tr>';
  }
}

async function actualizarEstadoAlojamiento(selector) {
  selector.disabled = true;
  try {
    const respuesta = await fetch(API_SOLICITUDES_ALOJAMIENTO_CLIENTE + '/' + selector.dataset.estadoAlojamiento + '/estado', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', ...encabezadosAutenticados() }, body: JSON.stringify({ estado: selector.value })
    });
    const resultado = await respuestaSegura(respuesta);
    mostrarMensajeAdmin('admin-mensaje-alojamientos', 'Solicitud de alojamiento actualizada a ' + resultado.solicitud.estado + ' correctamente.', 'success');
  } catch (error) {
    mostrarMensajeAdmin('admin-mensaje-alojamientos', error.message, 'error');
    await cargarSolicitudesAlojamientoAdmin();
  } finally {
    selector.disabled = false;
  }
}

async function exportarAlojamientosExcel() {
  const boton = document.getElementById('exportar-alojamientos');
  const mensaje = document.getElementById('admin-mensaje-alojamientos');
  if (!boton) return;
  boton.disabled = true;
  if (mensaje) mensaje.textContent = 'Generando archivo de Excel...';
  try {
    const respuesta = await fetch(API_SOLICITUDES_ALOJAMIENTO_CLIENTE + '/exportar/excel', { headers: encabezadosAutenticados() });
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      throw new Error(datos.error || 'No se pudo generar el archivo.');
    }
    const archivo = await respuesta.blob();
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(archivo);
    enlace.download = 'alojamientos-rallytraver.xlsx';
    enlace.click();
    URL.revokeObjectURL(enlace.href);
    if (mensaje) mensaje.textContent = 'El archivo de alojamientos se descargó correctamente.';
  } catch (error) {
    if (mensaje) mensaje.textContent = error.message;
  } finally {
    boton.disabled = false;
  }
}

function renderizarTablaVuelos(solicitudes) {
  const tabla = document.getElementById('tabla-vuelos');
  if (!tabla) return;
  if (!solicitudes.length) {
    tabla.innerHTML = '<tr><td colspan="8">No hay solicitudes de vuelo registradas.</td></tr>';
    return;
  }
  tabla.innerHTML = solicitudes.map((solicitud) => '<tr data-solicitud-codigo="' + escaparHTML(solicitud.codigo) + '"><td><strong>' + escaparHTML(solicitud.codigo) + '</strong></td><td>' + escaparHTML(solicitud.nombreCliente) + '<small>' + escaparHTML(solicitud.emailCliente) + '</small><small>' + escaparHTML(solicitud.telefonoCliente || 'Sin teléfono') + '</small></td><td>' + escaparHTML(solicitud.origen) + '<small>Destino: ' + escaparHTML(solicitud.destino) + '</small><small>' + escaparHTML(solicitud.aerolinea) + '</small></td><td>' + escaparHTML(solicitud.tipoViaje) + '<small>Salida: ' + fechaCorta(solicitud.fechaSalida) + '</small>' + (solicitud.tipoViaje === 'Ida y vuelta' ? '<small>Regreso: ' + fechaCorta(solicitud.fechaRegreso) + '</small>' : '') + '</td><td>' + escaparHTML(solicitud.cantidadViajeros) + ' viajero(s)<small>' + formatoCOPReservas.format(solicitud.precioReferencial || 0) + '</small></td><td><select data-estado-vuelo="' + escaparHTML(solicitud._id) + '">' + opcionesEstado(solicitud.estado) + '</select></td><td>' + fechaCorta(solicitud.createdAt) + '</td><td><button class="rt-admin-delete" type="button" data-id="' + escaparHTML(solicitud._id) + '" data-codigo="' + escaparHTML(solicitud.codigo) + '">Eliminar</button></td></tr>').join('');
  tabla.querySelectorAll('[data-estado-vuelo]').forEach((selector) => selector.addEventListener('change', () => actualizarEstadoVuelo(selector)));
  configurarBotonesEliminar(tabla, '.rt-admin-delete', API_SOLICITUDES_VUELO_CLIENTE, 'admin-mensaje-vuelos', cargarSolicitudesVueloAdmin, 'la solicitud de vuelo');
  resaltarSolicitudDesdeNotificacion();
}

async function cargarSolicitudesVueloAdmin() {
  if (!validarSesion(true)) return;
  const mensaje = document.getElementById('admin-mensaje-vuelos');
  const buscar = document.getElementById('admin-buscar')?.value.trim() || '';
  const estado = document.getElementById('admin-estado')?.value || '';
  const parametros = new URLSearchParams();
  if (buscar) parametros.set('buscar', buscar);
  if (estado) parametros.set('estado', estado);
  try {
    const respuesta = await fetch(API_SOLICITUDES_VUELO_CLIENTE + (parametros.toString() ? '?' + parametros.toString() : ''), { headers: encabezadosAutenticados() });
    const solicitudes = await respuestaSegura(respuesta);
    renderizarTablaVuelos(solicitudes);
    if (mensaje) mensaje.textContent = solicitudes.length + ' solicitud' + (solicitudes.length === 1 ? '' : 'es') + ' de vuelo registrada' + (solicitudes.length === 1 ? '' : 's') + '.';
  } catch (error) {
    if (mensaje) mensaje.textContent = error.message;
    const tabla = document.getElementById('tabla-vuelos');
    if (tabla) tabla.innerHTML = '<tr><td colspan="8">No se pudieron cargar las solicitudes de vuelo.</td></tr>';
  }
}

async function actualizarEstadoVuelo(selector) {
  selector.disabled = true;
  try {
    const respuesta = await fetch(API_SOLICITUDES_VUELO_CLIENTE + '/' + selector.dataset.estadoVuelo + '/estado', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', ...encabezadosAutenticados() }, body: JSON.stringify({ estado: selector.value })
    });
    const resultado = await respuestaSegura(respuesta);
    mostrarMensajeAdmin('admin-mensaje-vuelos', 'Solicitud de vuelo actualizada a ' + resultado.solicitud.estado + ' correctamente.', 'success');
  } catch (error) {
    mostrarMensajeAdmin('admin-mensaje-vuelos', error.message, 'error');
    await cargarSolicitudesVueloAdmin();
  } finally {
    selector.disabled = false;
  }
}

async function exportarVuelosExcel() {
  const boton = document.getElementById('exportar-vuelos');
  const mensaje = document.getElementById('admin-mensaje-vuelos');
  if (!boton) return;
  boton.disabled = true;
  if (mensaje) mensaje.textContent = 'Generando archivo de Excel...';
  try {
    const respuesta = await fetch(API_SOLICITUDES_VUELO_CLIENTE + '/exportar/excel', { headers: encabezadosAutenticados() });
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      throw new Error(datos.error || 'No se pudo generar el archivo.');
    }
    const archivo = await respuesta.blob();
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(archivo);
    enlace.download = 'vuelos-rallytraver.xlsx';
    enlace.click();
    URL.revokeObjectURL(enlace.href);
    if (mensaje) mensaje.textContent = 'El archivo de vuelos se descargó correctamente.';
  } catch (error) {
    if (mensaje) mensaje.textContent = error.message;
  } finally {
    boton.disabled = false;
  }
}

function configurarPanelAdmin() {
  if (!validarSesion(true)) return;
  document.getElementById('form-filtros-admin')?.addEventListener('submit', (evento) => {
    evento.preventDefault();
    cargarReservasAdmin();
    cargarSolicitudesAlojamientoAdmin();
    cargarSolicitudesVueloAdmin();
  });
  document.getElementById('exportar-reservas')?.addEventListener('click', exportarReservasExcel);
  document.getElementById('exportar-alojamientos')?.addEventListener('click', exportarAlojamientosExcel);
  document.getElementById('exportar-vuelos')?.addEventListener('click', exportarVuelosExcel);
  cargarReservasAdmin();
  cargarSolicitudesAlojamientoAdmin();
  cargarSolicitudesVueloAdmin();
}

document.addEventListener('DOMContentLoaded', () => {
  const pagina = document.body.dataset.page;
  if (pagina === 'mis-reservas') {
    cargarMisReservas();
    cargarMisSolicitudesAlojamiento();
    cargarMisSolicitudesVuelo();
  }
  if (pagina === 'admin') configurarPanelAdmin();
});
