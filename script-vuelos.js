const API_VUELOS = 'http://localhost:8080/api/vuelos';
const API_SOLICITUDES_VUELO = 'http://localhost:8080/api/solicitudes-vuelo';
const formatoCOPVuelos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

let vuelosCatalogo = [];
let vueloSeleccionado = null;

function escaparHTMLVuelo(valor) {
  return String(valor || '').replace(/[&<>'"]/g, (caracter) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[caracter]);
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function tipoViajeActual() {
  return document.getElementById('vuelo-tipo')?.value || 'Ida y vuelta';
}

function precioPorTipo(vuelo, tipoViaje) {
  return tipoViaje === 'Solo ida' ? vuelo.precioSoloIda : vuelo.precioIdaVuelta;
}

function actualizarCamposRegreso() {
  const tipo = tipoViajeActual();
  const campoBusqueda = document.getElementById('campo-regreso');
  const regresoBusqueda = document.getElementById('vuelo-regreso');
  if (campoBusqueda && regresoBusqueda) {
    const idaYVuelta = tipo === 'Ida y vuelta';
    campoBusqueda.hidden = !idaYVuelta;
    regresoBusqueda.disabled = !idaYVuelta;
    if (!idaYVuelta) regresoBusqueda.value = '';
  }
}

function configurarFechas() {
  const salida = document.getElementById('vuelo-salida');
  const regreso = document.getElementById('vuelo-regreso');
  const minimo = hoyISO();
  if (salida) {
    salida.min = minimo;
    salida.addEventListener('change', () => {
      if (regreso) regreso.min = salida.value || minimo;
    });
  }
  if (regreso) regreso.min = minimo;

  const salidaSolicitud = document.getElementById('solicitud-salida');
  const regresoSolicitud = document.getElementById('solicitud-regreso');
  if (salidaSolicitud) {
    salidaSolicitud.min = minimo;
    salidaSolicitud.addEventListener('change', () => {
      if (regresoSolicitud) regresoSolicitud.min = salidaSolicitud.value || minimo;
      actualizarResumenSolicitud();
    });
  }
  if (regresoSolicitud) {
    regresoSolicitud.min = minimo;
    regresoSolicitud.addEventListener('change', actualizarResumenSolicitud);
  }
}

function llenarSelect(select, lugares, etiqueta) {
  if (!select) return;
  const seleccionado = select.value;
  select.innerHTML = '<option value="">Todos los ' + etiqueta + '</option>' + lugares.map((lugar) => '<option value="' + escaparHTMLVuelo(lugar.codigo) + '">' + escaparHTMLVuelo(lugar.ciudad) + ' (' + escaparHTMLVuelo(lugar.codigo) + ')</option>').join('');
  if ([...select.options].some((opcion) => opcion.value === seleccionado)) select.value = seleccionado;
}

function prepararFiltros(vuelos) {
  const origenes = [...new Map(vuelos.map((vuelo) => [vuelo.origen.codigo, vuelo.origen])).values()].sort((a, b) => a.ciudad.localeCompare(b.ciudad, 'es'));
  const destinos = [...new Map(vuelos.map((vuelo) => [vuelo.destino.codigo, vuelo.destino])).values()].sort((a, b) => a.ciudad.localeCompare(b.ciudad, 'es'));
  llenarSelect(document.getElementById('vuelo-origen'), origenes, 'orígenes');
  llenarSelect(document.getElementById('vuelo-destino'), destinos, 'destinos');
}

function detalleTramo(etiqueta, tramo) {
  return '<div class="rt-flight-leg"><span>' + escaparHTMLVuelo(etiqueta) + '</span><strong>' + escaparHTMLVuelo(tramo.salida) + ' <i aria-hidden="true">→</i> ' + escaparHTMLVuelo(tramo.llegada) + '</strong><small>' + escaparHTMLVuelo(tramo.duracion) + ' · ' + escaparHTMLVuelo(tramo.escalas) + '</small></div>';
}

function tarjetaVuelo(vuelo) {
  const tipo = tipoViajeActual();
  const precio = precioPorTipo(vuelo, tipo);
  const regreso = tipo === 'Ida y vuelta' ? detalleTramo('Regreso', vuelo.regreso) : '';
  const esFavorito = typeof esFavoritoRallyTraver === 'function' && esFavoritoRallyTraver('vuelo', vuelo._id);
  return '<article class="rt-flight-card">' +
    '<div class="rt-flight-card-top"><div class="rt-airline"><img src="Images/' + escaparHTMLVuelo(vuelo.logo) + '" alt="Logo de ' + escaparHTMLVuelo(vuelo.aerolinea) + '"><strong>' + escaparHTMLVuelo(vuelo.aerolinea) + '</strong></div><div class="rt-flight-card-actions"><span class="rt-flight-category">' + escaparHTMLVuelo(vuelo.categoria) + '</span><button class="rt-favorite ' + (esFavorito ? 'is-favorite' : '') + '" data-favorito-vuelo="' + escaparHTMLVuelo(vuelo._id) + '" type="button" aria-label="Guardar vuelo en favoritos">' + (esFavorito ? '♥' : '♡') + '</button></div></div>' +
    '<div class="rt-flight-route"><div><strong>' + escaparHTMLVuelo(vuelo.origen.codigo) + '</strong><span>' + escaparHTMLVuelo(vuelo.origen.ciudad) + '</span></div><b aria-hidden="true">→</b><div><strong>' + escaparHTMLVuelo(vuelo.destino.codigo) + '</strong><span>' + escaparHTMLVuelo(vuelo.destino.ciudad) + '</span></div></div>' +
    '<div class="rt-flight-legs">' + detalleTramo('Salida', vuelo.ida) + regreso + '</div>' +
    '<div class="rt-flight-features"><span>' + escaparHTMLVuelo(vuelo.cabina) + '</span><span>' + escaparHTMLVuelo(vuelo.equipaje) + '</span></div>' +
    '<div class="rt-flight-card-bottom"><div><small>Tarifa referencial' + (tipo === 'Ida y vuelta' ? ' ida y vuelta' : ' solo ida') + '</small><strong>' + formatoCOPVuelos.format(precio) + '</strong><span>por viajero</span></div><div class="rt-flight-actions"><a class="rt-outline" href="' + escaparHTMLVuelo(vuelo.enlaceAerolinea) + '" target="_blank" rel="noopener">Consultar aerolínea</a><button class="rt-primary" type="button" data-solicitar-vuelo="' + escaparHTMLVuelo(vuelo._id) + '">Solicitar cotización</button></div></div>' +
    '</article>';
}

function renderizarVuelos(vuelos, mensaje = '') {
  const lista = document.getElementById('lista-vuelos');
  const contador = document.getElementById('contador-vuelos');
  const descripcion = document.getElementById('descripcion-resultados-vuelos');
  if (!lista) return;
  if (contador) contador.textContent = vuelos.length + ' opción' + (vuelos.length === 1 ? '' : 'es');
  if (descripcion && mensaje) descripcion.textContent = mensaje;
  if (!vuelos.length) {
    lista.innerHTML = '<div class="rt-empty"><h2>No encontramos vuelos para esa búsqueda.</h2><p>Prueba otra ruta o comunícate con RallyTraver para recibir una alternativa personalizada.</p><a class="rt-primary" href="ayuda.html">Solicitar ayuda</a></div>';
    return;
  }
  lista.innerHTML = vuelos.map(tarjetaVuelo).join('');
  lista.querySelectorAll('[data-favorito-vuelo]').forEach((boton) => boton.addEventListener('click', async () => {
    if (typeof alternarFavoritoRallyTraver !== 'function') return;
    await alternarFavoritoRallyTraver('vuelo', boton.dataset.favoritoVuelo);
    filtrarVuelos();
  }));
  lista.querySelectorAll('[data-solicitar-vuelo]').forEach((boton) => boton.addEventListener('click', () => abrirSolicitudVuelo(boton.dataset.solicitarVuelo)));
}

function filtrarVuelos() {
  const origen = document.getElementById('vuelo-origen')?.value || '';
  const destino = document.getElementById('vuelo-destino')?.value || '';
  const coincidencias = vuelosCatalogo.filter((vuelo) => (!origen || vuelo.origen.codigo === origen) && (!destino || vuelo.destino.codigo === destino));
  const ruta = origen || destino ? 'Mostrando las opciones para la ruta seleccionada.' : 'Explora las rutas disponibles y elige la que más se ajuste a tu plan.';
  renderizarVuelos(coincidencias, ruta);
}

function actualizarResumenSolicitud() {
  const resumen = document.getElementById('resumen-vuelo-seleccionado');
  if (!resumen || !vueloSeleccionado) return;
  const tipo = document.getElementById('solicitud-tipo')?.value || 'Ida y vuelta';
  const viajeros = Number(document.getElementById('solicitud-pasajeros')?.value || 1);
  const precio = precioPorTipo(vueloSeleccionado, tipo) * viajeros;
  resumen.innerHTML = '<div><img src="Images/' + escaparHTMLVuelo(vueloSeleccionado.logo) + '" alt="Logo de ' + escaparHTMLVuelo(vueloSeleccionado.aerolinea) + '"><p><strong>' + escaparHTMLVuelo(vueloSeleccionado.aerolinea) + '</strong><br>' + escaparHTMLVuelo(vueloSeleccionado.origen.ciudad) + ' (' + escaparHTMLVuelo(vueloSeleccionado.origen.codigo) + ') → ' + escaparHTMLVuelo(vueloSeleccionado.destino.ciudad) + ' (' + escaparHTMLVuelo(vueloSeleccionado.destino.codigo) + ')</p></div><strong>' + formatoCOPVuelos.format(precio) + '<small> tarifa referencial total</small></strong>';
}

function actualizarCamposSolicitud() {
  const tipo = document.getElementById('solicitud-tipo')?.value || 'Ida y vuelta';
  const campoRegreso = document.getElementById('campo-solicitud-regreso');
  const regreso = document.getElementById('solicitud-regreso');
  const idaYVuelta = tipo === 'Ida y vuelta';
  if (campoRegreso) campoRegreso.hidden = !idaYVuelta;
  if (regreso) {
    regreso.disabled = !idaYVuelta;
    regreso.required = idaYVuelta;
    if (!idaYVuelta) regreso.value = '';
  }
  actualizarResumenSolicitud();
}

function abrirSolicitudVuelo(idVuelo) {
  const sesion = typeof obtenerSesionRallyTraver === 'function' ? obtenerSesionRallyTraver() : null;
  if (!sesion) {
    if (typeof enviarAInicioSesion === 'function') enviarAInicioSesion();
    return;
  }
  vueloSeleccionado = vuelosCatalogo.find((vuelo) => vuelo._id === idVuelo) || null;
  if (!vueloSeleccionado) return;
  const modal = document.getElementById('modal-solicitud-vuelo');
  const formularioBusqueda = document.getElementById('form-busqueda-vuelos');
  const salidaBusqueda = document.getElementById('vuelo-salida')?.value || '';
  const regresoBusqueda = document.getElementById('vuelo-regreso')?.value || '';
  document.getElementById('solicitud-vuelo-id').value = vueloSeleccionado._id;
  document.getElementById('solicitud-tipo').value = tipoViajeActual();
  document.getElementById('solicitud-pasajeros').value = formularioBusqueda?.elements.pasajeros.value || '1';
  document.getElementById('solicitud-salida').value = salidaBusqueda;
  document.getElementById('solicitud-regreso').value = regresoBusqueda;
  document.getElementById('estado-solicitud-vuelo').textContent = '';
  const boton = document.querySelector('#form-solicitud-vuelo button[type="submit"]');
  if (boton) { boton.disabled = false; boton.textContent = 'Registrar solicitud'; }
  actualizarCamposSolicitud();
  if (modal?.showModal) modal.showModal();
}

async function enviarSolicitudVuelo(evento) {
  evento.preventDefault();
  const formulario = evento.currentTarget;
  const estado = document.getElementById('estado-solicitud-vuelo');
  const boton = formulario.querySelector('button[type="submit"]');
  if (!formulario.checkValidity()) {
    formulario.reportValidity();
    return;
  }
  const datos = Object.fromEntries(new FormData(formulario).entries());
  if (datos.tipoViaje === 'Ida y vuelta' && datos.fechaRegreso <= datos.fechaSalida) {
    estado.textContent = 'La fecha de regreso debe ser posterior a la fecha de salida.';
    estado.classList.add('is-error');
    return;
  }
  estado.textContent = 'Registrando tu solicitud...';
  estado.classList.remove('is-error');
  boton.disabled = true;
  try {
    const sesion = obtenerSesionRallyTraver();
    const respuesta = await fetch(API_SOLICITUDES_VUELO, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + sesion.token },
      body: JSON.stringify(datos)
    });
    const resultado = await respuesta.json().catch(() => ({}));
    if (respuesta.status === 401) {
      localStorage.removeItem('rallytraverToken');
      localStorage.removeItem('rallytraverUsuario');
      enviarAInicioSesion();
      return;
    }
    if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo registrar la solicitud.');
    estado.textContent = resultado.message + ' Código: ' + resultado.solicitud.codigo + '.';
    boton.textContent = 'Solicitud registrada';
  } catch (error) {
    estado.textContent = error.message || 'No se pudo registrar la solicitud.';
    estado.classList.add('is-error');
    boton.disabled = false;
  }
}

async function cargarVuelos() {
  const lista = document.getElementById('lista-vuelos');
  try {
    const respuesta = await fetch(API_VUELOS);
    const vuelos = await respuesta.json().catch(() => []);
    if (!respuesta.ok) throw new Error('No se pudieron cargar los vuelos.');
    vuelosCatalogo = vuelos;
    prepararFiltros(vuelosCatalogo);
    renderizarVuelos(vuelosCatalogo);
  } catch (error) {
    if (lista) lista.innerHTML = '<div class="rt-empty"><h2>No pudimos cargar los vuelos.</h2><p>Verifica que el servidor de RallyTraver esté activo e inténtalo nuevamente.</p></div>';
  }
}

function prepararModuloVuelos() {
  if (document.body.dataset.page !== 'vuelos') return;
  configurarFechas();
  actualizarCamposRegreso();
  document.getElementById('vuelo-tipo')?.addEventListener('change', () => { actualizarCamposRegreso(); filtrarVuelos(); });
  document.getElementById('form-busqueda-vuelos')?.addEventListener('submit', (evento) => { evento.preventDefault(); filtrarVuelos(); });
  document.getElementById('solicitud-tipo')?.addEventListener('change', actualizarCamposSolicitud);
  document.getElementById('solicitud-pasajeros')?.addEventListener('change', actualizarResumenSolicitud);
  document.getElementById('form-solicitud-vuelo')?.addEventListener('submit', enviarSolicitudVuelo);
  document.querySelector('[data-cerrar-modal-vuelo]')?.addEventListener('click', () => document.getElementById('modal-solicitud-vuelo')?.close());
  document.getElementById('modal-solicitud-vuelo')?.addEventListener('click', (evento) => {
    if (evento.target === evento.currentTarget) evento.currentTarget.close();
  });
  cargarVuelos();
}

document.addEventListener('DOMContentLoaded', prepararModuloVuelos);
document.addEventListener('rallytraverFavoritosActualizados', () => {
  if (vuelosCatalogo.length) filtrarVuelos();
});
