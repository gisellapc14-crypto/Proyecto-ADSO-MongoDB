const API_DESTINOS = 'http://localhost:8080/api/destinos';
const API_CONTACTOS = 'http://localhost:8080/api/contactos';
const API_RESERVAS = 'http://localhost:8080/api/reservas';
let destinos = [];
let tipoCotizacion = 'Vuelos';
let tipoSolicitud = 'contacto';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

function textoSeguro(valor) {
  return String(valor || '').replace(/[&<>'"]/g, (caracter) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[caracter]);
}

function rutaImagen(ruta) {
  return 'Images/' + encodeURI(ruta || 'tour.JPG');
}

function etiquetaCategoria(categoria) {
  return ({ nacional: 'Colombia', internacional: 'Internacional', pasadia: 'Pasadía' })[categoria] || 'Experiencia';
}

function textoLista(lista, mensajeVacio) {
  return Array.isArray(lista) && lista.length
    ? lista.map((elemento) => '<li>' + textoSeguro(elemento) + '</li>').join('')
    : '<li class="rt-detail-empty">' + textoSeguro(mensajeVacio) + '</li>';
}

function resumenDuracion(destino) {
  return destino.duracion || 'Duración por confirmar';
}

function resumenModalidad(destino) {
  return destino.modalidad || 'Modalidad por confirmar';
}

function lugaresDestino(destino) {
  const lugares = Array.isArray(destino.ciudadesLugares) ? [...new Set(destino.ciudadesLugares.filter(Boolean))] : [];
  if (lugares.length) return lugares.join(', ');
  if (Number.isFinite(destino.cantidadCiudades) && destino.cantidadCiudades > 0) return destino.cantidadCiudades + ' ' + (destino.cantidadCiudades === 1 ? 'ciudad o lugar' : 'ciudades o lugares') + ' (detalle por confirmar)';
  return 'Lugares por confirmar';
}

function paisesDestino(destino) {
  const paises = Array.isArray(destino.paises) ? destino.paises.filter(Boolean) : [];
  if (paises.length) return paises.join(', ');
  if (Number.isFinite(destino.cantidadPaises) && destino.cantidadPaises > 0) return destino.cantidadPaises + ' país' + (destino.cantidadPaises === 1 ? '' : 'es') + ' (detalle por confirmar)';
  return 'País por confirmar';
}

function formatoTarifa(valor) {
  if (valor === null || valor === undefined || valor === '') return 'Por confirmar';
  return Number.isFinite(Number(valor)) ? formatoCOP.format(Number(valor)) : 'Por confirmar';
}

function tarifasTemporada(destino) {
  const tarifas = Array.isArray(destino.preciosTemporada) ? destino.preciosTemporada : [];
  if (!tarifas.length) return '<p class="rt-detail-empty">Las tarifas por temporada se confirman al solicitar la cotización.</p>';
  return '<div class="rt-season-grid">' + tarifas.map((tarifa) =>
    '<article class="rt-season-card"><strong>' + textoSeguro(tarifa.temporada || 'Temporada por confirmar') + '</strong>' +
    '<span>Triple: ' + formatoTarifa(tarifa.triple) + '</span><span>Doble: ' + formatoTarifa(tarifa.doble) + '</span><span>Individual: ' + formatoTarifa(tarifa.individual) + '</span></article>'
  ).join('') + '</div>';
}

function itinerarioDestino(destino) {
  const itinerario = Array.isArray(destino.itinerario) ? destino.itinerario.filter((parada) => parada && parada.lugar) : [];
  if (!itinerario.length) return '<p class="rt-detail-empty">El itinerario detallado se confirma al solicitar la cotización.</p>';
  return '<ol class="rt-itinerary">' + itinerario.map((parada) => {
    const noches = Number.isFinite(parada.noches) ? parada.noches + ' noche' + (parada.noches === 1 ? '' : 's') : 'Noches por confirmar';
    return '<li><strong>' + textoSeguro(parada.lugar) + '</strong><span>' + noches + '</span></li>';
  }).join('') + '</ol>';
}

function favoritos() {
  try { return JSON.parse(localStorage.getItem('rallytraverFavoritos') || '[]'); } catch { return []; }
}

function guardarFavoritos(lista) {
  localStorage.setItem('rallytraverFavoritos', JSON.stringify(lista));
}

function alternarFavorito(id) {
  const lista = favoritos();
  const indice = lista.indexOf(id);
  if (indice === -1) lista.push(id); else lista.splice(indice, 1);
  guardarFavoritos(lista);
  renderizarPaginaActual();
}

function tarjetaDestino(destino) {
  const esFavorito = favoritos().includes(destino._id);
  return '<article class="rt-card">' +
        '<div class="rt-card-media"><img src="' + rutaImagen(destino.imagen) + '" alt="' + textoSeguro(destino.nombre) + '" onerror="this.src=&quot;Images/tour.JPG&quot;">' +
    '<button class="rt-favorite ' + (esFavorito ? 'is-favorite' : '') + '" data-favorito="' + destino._id + '" type="button" aria-label="Guardar ' + textoSeguro(destino.nombre) + '">' + (esFavorito ? '♥' : '♡') + '</button></div>' +
    '<div class="rt-card-body"><span class="rt-tag">' + etiquetaCategoria(destino.categoria) + '</span><h3>' + textoSeguro(destino.nombre) + '</h3>' +
    '<div class="rt-card-meta"><span>◷ ' + textoSeguro(resumenDuracion(destino)) + '</span><span>✦ ' + textoSeguro(resumenModalidad(destino)) + '</span></div>' +
    '<p>' + textoSeguro(destino.descripcion) + '</p><span class="rt-price">Desde ' + formatoCOP.format(destino.precio || 0) + ' <small>por persona</small></span><small class="rt-card-price-note">Precio referencial</small>' +
    '<div class="rt-card-actions"><button class="rt-outline" data-detalle="' + destino._id + '" type="button">Ver detalle</button><button data-solicitar="' + destino._id + '" type="button">Cotizar</button></div></div></article>';
}

function activarBotones(contenedor) {
  contenedor.querySelectorAll('[data-favorito]').forEach((boton) => boton.addEventListener('click', () => alternarFavorito(boton.dataset.favorito)));
  contenedor.querySelectorAll('[data-detalle]').forEach((boton) => boton.addEventListener('click', () => abrirDetalle(destinos.find((destino) => destino._id === boton.dataset.detalle))));
  contenedor.querySelectorAll('[data-solicitar]').forEach((boton) => boton.addEventListener('click', () => abrirReserva(destinos.find((destino) => destino._id === boton.dataset.solicitar))));
}

function renderizarTarjetas(contenedor, lista, vacio) {
  if (!contenedor) return;
  if (!lista.length) {
    contenedor.innerHTML = '<p class="rt-empty">' + vacio + '</p>';
    return;
  }
  contenedor.innerHTML = lista.map(tarjetaDestino).join('');
  activarBotones(contenedor);
}

function abrirDetalle(destino) {
  if (!destino) return;
  const modal = document.getElementById('modal-destino');
  const detalle = document.getElementById('detalle-destino');
  if (!modal || !detalle) return;
  const galeria = (destino.galeria && destino.galeria.length ? destino.galeria : [destino.imagen]).slice(0, 3);
  const hoteles = textoLista(destino.hoteles, 'Consulta con nuestro equipo las opciones de alojamiento.');
  const incluye = textoLista(destino.incluye, 'Los servicios incluidos se confirman al solicitar la cotización.');
  const grupo = destino.grupoReferencia ? destino.grupoReferencia : 'No aplica o por confirmar';
  const salidas = destino.salidas || 'Consultar fechas disponibles.';
  const notaPrecio = destino.notaPrecio || 'Precio referencial sujeto a confirmación de disponibilidad.';
  detalle.innerHTML = '<span class="rt-tag">' + etiquetaCategoria(destino.categoria) + '</span><h2>' + textoSeguro(destino.nombre) + '</h2>' +
    '<div class="rt-detail-gallery">' + galeria.map((imagen) => '<img src="' + rutaImagen(imagen) + '" alt="' + textoSeguro(destino.nombre) + '" onerror="this.src=&quot;Images/tour.JPG&quot;">').join('') + '</div>' +
    '<p class="rt-detail-description">' + textoSeguro(destino.descripcion) + '</p><div class="rt-detail-meta"><span>⌖ ' + textoSeguro(destino.ubicacion) + '</span><span>◷ ' + textoSeguro(resumenDuracion(destino)) + '</span><span>Desde ' + formatoCOP.format(destino.precio || 0) + '</span></div>' +
    '<p class="rt-price-callout">' + textoSeguro(notaPrecio) + '</p>' +
    '<section class="rt-detail-section"><h3>Información del viaje</h3><dl class="rt-detail-facts"><div><dt>Modalidad</dt><dd>' + textoSeguro(resumenModalidad(destino)) + '</dd></div><div><dt>Países</dt><dd>' + textoSeguro(paisesDestino(destino)) + '</dd></div><div><dt>Lugares</dt><dd>' + textoSeguro(lugaresDestino(destino)) + '</dd></div><div><dt>Grupo de referencia</dt><dd>' + textoSeguro(grupo) + '</dd></div><div class="rt-detail-facts-wide"><dt>Salidas</dt><dd>' + textoSeguro(salidas) + '</dd></div></dl></section>' +
    '<section class="rt-detail-section"><h3>Hoteles sugeridos</h3><ul class="rt-detail-list">' + hoteles + '</ul></section><section class="rt-detail-section"><h3>Servicios incluidos</h3><ul class="rt-detail-list">' + incluye + '</ul></section>' +
    '<section class="rt-detail-section"><h3>Tarifas por temporada</h3>' + tarifasTemporada(destino) + '</section><section class="rt-detail-section"><h3>Itinerario</h3>' + itinerarioDestino(destino) + '</section><button class="rt-primary" id="boton-cotizar-detalle" type="button">Solicitar cotización</button>';
  detalle.querySelector('#boton-cotizar-detalle').addEventListener('click', () => { modal.close(); abrirReserva(destino); });
  modal.showModal();
}

function abrirSolicitud(destino, tipo) {
  const modal = document.getElementById('modal-solicitud');
  const titulo = document.getElementById('solicitud-titulo');
  const mensaje = document.getElementById('solicitud-mensaje');
  const tipoInput = document.getElementById('solicitud-tipo');
  if (!modal || !titulo || !mensaje) return;
  tipoSolicitud = tipo || 'contacto';
  if (tipoInput) tipoInput.value = tipoSolicitud;
  if (destino) {
    titulo.textContent = 'Cotizar ' + destino.nombre;
    mensaje.value = 'Me interesa ' + destino.nombre + '. Deseo recibir información para mi viaje.';
  } else {
    titulo.textContent = 'Solicitar cotización';
    mensaje.value = '';
  }
  const estado = modal.querySelector('.rt-status');
  if (estado) estado.textContent = '';
  modal.showModal();
}

function abrirReserva(destino) {
  if (!destino) return;
  if (typeof obtenerSesionRallyTraver !== 'function' || !obtenerSesionRallyTraver()) {
    if (typeof enviarAInicioSesion === 'function') enviarAInicioSesion();
    return;
  }

  const modal = document.getElementById('modal-reserva');
  const destinoId = document.getElementById('reserva-destino-id');
  const destinoNombre = document.getElementById('reserva-destino-nombre');
  const fecha = document.getElementById('reserva-fecha');
  const estado = document.getElementById('estado-reserva');
  if (!modal || !destinoId || !destinoNombre || !fecha) return;

  destinoId.value = destino._id;
  destinoNombre.textContent = destino.nombre + ' · Desde ' + formatoCOP.format(destino.precio || 0) + ' por persona';
  fecha.min = new Date().toISOString().slice(0, 10);
  if (estado) {
    estado.textContent = '';
    estado.style.color = '';
  }
  modal.showModal();
}

function configurarMenu() {
  document.querySelectorAll('.rt-modal-close').forEach((botonCerrar) => botonCerrar.addEventListener('click', () => botonCerrar.closest('dialog').close()));
}

function configurarCotizador() {
  document.querySelectorAll('[data-quote-type]').forEach((boton) => boton.addEventListener('click', () => {
    tipoCotizacion = boton.dataset.quoteType;
    document.querySelectorAll('[data-quote-type]').forEach((item) => item.setAttribute('aria-selected', String(item === boton)));
  }));
  document.getElementById('form-cotizacion')?.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    abrirSolicitud(null, 'contacto');
    document.getElementById('solicitud-titulo').textContent = 'Cotizar ' + tipoCotizacion;
    document.getElementById('solicitud-mensaje').value = 'Quiero cotizar ' + tipoCotizacion.toLowerCase() + ' desde ' + datos.get('origen') + ' hacia ' + datos.get('destino') + '.';
  });
}

function configurarFormularioSolicitud() {
  document.getElementById('form-solicitud')?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const estado = formulario.querySelector('.rt-status');
    const boton = formulario.querySelector('button[type="submit"]');
    const datos = new FormData(formulario);
    estado.textContent = 'Enviando solicitud...';
    boton.disabled = true;
    try {
      const respuesta = await fetch(API_CONTACTOS, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: datos.get('nombre'), email: datos.get('email'), mensaje: datos.get('mensaje'), tipo: tipoSolicitud === 'reserva' ? 'reserva' : 'contacto' }) });
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo enviar la solicitud.');
      estado.textContent = 'Tu solicitud fue enviada correctamente. Te contactaremos pronto.';
      formulario.reset();
    } catch (error) {
      estado.textContent = error.message || 'No se pudo enviar la solicitud. Intenta nuevamente.';
      estado.style.color = '#b42318';
    } finally {
      boton.disabled = false;
    }
  });
}

function configurarFormularioReserva() {
  document.getElementById('form-reserva')?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const sesion = typeof obtenerSesionRallyTraver === 'function' ? obtenerSesionRallyTraver() : null;
    if (!sesion) {
      if (typeof enviarAInicioSesion === 'function') enviarAInicioSesion();
      return;
    }

    const formulario = evento.currentTarget;
    if (!formulario.checkValidity()) {
      formulario.reportValidity();
      return;
    }
    const datos = new FormData(formulario);
    const estado = document.getElementById('estado-reserva');
    const boton = formulario.querySelector('button[type="submit"]');
    estado.textContent = 'Registrando tu reserva...';
    estado.style.color = '';
    boton.disabled = true;

    try {
      const respuesta = await fetch(API_RESERVAS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + sesion.token },
        body: JSON.stringify({
          destinoId: datos.get('destinoId'),
          fechaViaje: datos.get('fechaViaje'),
          cantidadViajeros: Number(datos.get('cantidadViajeros')),
          comentario: datos.get('comentario')
        })
      });
      const resultado = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo registrar la reserva.');

      estado.innerHTML = 'Reserva registrada exitosamente. Código: <strong>' + textoSeguro(resultado.reserva.codigo) + '</strong>. Estado: ' + textoSeguro(resultado.reserva.estado) + '. <a href="mis-reservas.html">Ver mis reservas</a>';
      formulario.querySelectorAll('input:not([type="hidden"]), textarea').forEach((campo) => { if (campo.type !== 'number') campo.value = ''; });
      document.getElementById('reserva-viajeros').value = 1;
    } catch (error) {
      estado.textContent = error.message || 'No se pudo registrar la reserva. Intenta nuevamente.';
      estado.style.color = '#b42318';
    } finally {
      boton.disabled = false;
    }
  });
}

function filtrarCatalogo() {
  const texto = (document.getElementById('buscar')?.value || '').trim().toLowerCase();
  const categoria = document.getElementById('filtro-categoria')?.value || '';
  const maximo = Number(document.getElementById('filtro-precio')?.value || 0);
  const soloHoteles = new URLSearchParams(window.location.search).get('hoteles') === 'true';
  const lista = destinos.filter((destino) => {
    const consulta = [destino.nombre, destino.descripcion, destino.ubicacion, destino.modalidad, destino.duracion, ...(destino.paises || []), ...(destino.ciudadesLugares || [])].filter(Boolean).join(' ').toLowerCase();
    return destino.activo !== false && (!texto || consulta.includes(texto)) && (!categoria || destino.categoria === categoria) && (!maximo || destino.precio <= maximo) && (!soloHoteles || (destino.hoteles || []).length);
  });
  renderizarTarjetas(document.getElementById('catalogo-destinos'), lista, 'No encontramos experiencias con esos filtros. Prueba una selección diferente.');
  const resultado = document.getElementById('resultado-catalogo');
  if (resultado) resultado.textContent = lista.length + ' experiencia' + (lista.length === 1 ? '' : 's') + ' encontrada' + (lista.length === 1 ? '' : 's') + '.';
}

function configurarCatalogo() {
  const parametros = new URLSearchParams(window.location.search);
  const categoria = parametros.get('categoria');
  if (categoria && document.getElementById('filtro-categoria')) document.getElementById('filtro-categoria').value = categoria;
  document.getElementById('form-filtros')?.addEventListener('submit', (evento) => { evento.preventDefault(); filtrarCatalogo(); });
  document.getElementById('buscar')?.addEventListener('input', filtrarCatalogo);
  document.getElementById('filtro-categoria')?.addEventListener('change', filtrarCatalogo);
  document.getElementById('filtro-precio')?.addEventListener('change', filtrarCatalogo);
}

function renderizarPaginaActual() {
  const pagina = document.body.dataset.page;
  if (pagina === 'inicio') renderizarTarjetas(document.getElementById('destinos-destacados'), destinos.filter((destino) => destino.destacado).slice(0, 4), 'No hay destinos destacados en este momento.');
  if (pagina === 'catalogo') filtrarCatalogo();
}

async function iniciar() {
  configurarMenu();
  configurarCotizador();
  configurarFormularioSolicitud();
  configurarFormularioReserva();
  configurarCatalogo();
  try {
    const respuesta = await fetch(API_DESTINOS);
    if (!respuesta.ok) throw new Error('No se pudo obtener el catálogo.');
    destinos = await respuesta.json();
    renderizarPaginaActual();
  } catch (error) {
    const mensaje = 'No se pudo cargar el catálogo. Verifica que el servidor Node.js esté encendido.';
    renderizarTarjetas(document.getElementById('destinos-destacados'), [], mensaje);
    renderizarTarjetas(document.getElementById('catalogo-destinos'), [], mensaje);
    const resultado = document.getElementById('resultado-catalogo');
    if (resultado) resultado.textContent = mensaje;
    console.error(error);
  }
}

document.addEventListener('DOMContentLoaded', iniciar);
