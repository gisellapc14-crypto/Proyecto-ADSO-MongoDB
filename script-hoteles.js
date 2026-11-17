const API_ORIGEN_HOTELES = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:8080'
  : 'https://rallytraver-api.onrender.com';
const API_HOTELES = `${API_ORIGEN_HOTELES}/api/hoteles`;
const API_SOLICITUDES_ALOJAMIENTO = `${API_ORIGEN_HOTELES}/api/solicitudes-alojamiento`;
let hotelesRallyTraver = [];

function escaparHotel(valor) {
  return String(valor || '').replace(/[&<>'"]/g, (caracter) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[caracter]);
}

function rutaImagenHotel(ruta) {
  if (!ruta) return 'Images/hotel.JPG';
  return /^(https?:)?\/\//.test(ruta) || ruta.startsWith('Images/') ? ruta : 'Images/' + ruta;
}

function enlaceBooking(hotel) {
  const consulta = [hotel.nombre, hotel.ciudad, hotel.pais].filter(Boolean).join(', ');
  return 'https://www.booking.com/searchresults.es.html?ss=' + encodeURIComponent(consulta);
}

function tarjetaHotel(hotel) {
  const plan = hotel.todoIncluido ? '<span class="rt-hotel-plan">Todo incluido</span>' : '<span class="rt-hotel-plan is-basic">Consultar plan</span>';
  const esFavorito = typeof esFavoritoRallyTraver === 'function' && esFavoritoRallyTraver('hotel', hotel._id);
  return '<article class="rt-card rt-hotel-card"><div class="rt-card-media"><img src="' + rutaImagenHotel(hotel.imagen) + '" alt="' + escaparHotel(hotel.nombre) + '" onerror="this.src=&quot;Images/hotel.JPG&quot;"><button class="rt-favorite ' + (esFavorito ? 'is-favorite' : '') + '" data-favorito-hotel="' + hotel._id + '" type="button" aria-label="Guardar ' + escaparHotel(hotel.nombre) + ' en favoritos">' + (esFavorito ? '♥' : '♡') + '</button></div><div class="rt-card-body"><span class="rt-tag">' + escaparHotel(hotel.destino) + '</span><h3>' + escaparHotel(hotel.nombre) + '</h3><div class="rt-card-meta"><span>⌖ ' + escaparHotel(hotel.ubicacion) + '</span><span>✦ ' + escaparHotel(hotel.tipo) + '</span></div><p>' + escaparHotel(hotel.descripcion) + '</p>' + plan + '<span class="rt-card-price-note">Tarifa y disponibilidad por confirmar</span><div class="rt-card-actions"><button class="rt-outline" data-detalle-hotel="' + hotel._id + '" type="button">Ver detalle</button><button data-solicitar-hotel="' + hotel._id + '" type="button">Solicitar</button></div></div></article>';
}

function activarBotonesHoteles(contenedor) {
  contenedor.querySelectorAll('[data-favorito-hotel]').forEach((boton) => boton.addEventListener('click', async () => {
    if (typeof alternarFavoritoRallyTraver !== 'function') return;
    await alternarFavoritoRallyTraver('hotel', boton.dataset.favoritoHotel);
    filtrarHoteles();
  }));
  contenedor.querySelectorAll('[data-detalle-hotel]').forEach((boton) => boton.addEventListener('click', () => abrirDetalleHotel(hotelesRallyTraver.find((hotel) => hotel._id === boton.dataset.detalleHotel))));
  contenedor.querySelectorAll('[data-solicitar-hotel]').forEach((boton) => boton.addEventListener('click', () => abrirSolicitudHotel(hotelesRallyTraver.find((hotel) => hotel._id === boton.dataset.solicitarHotel))));
}

function renderizarHoteles(lista) {
  const contenedor = document.getElementById('catalogo-hoteles');
  const resultado = document.getElementById('resultado-hoteles');
  if (!contenedor) return;
  if (!lista.length) {
    contenedor.innerHTML = '<div class="rt-empty"><h2>No encontramos hoteles con estos filtros.</h2><p>Prueba otra ciudad, tipo de alojamiento o plan.</p></div>';
  } else {
    contenedor.innerHTML = lista.map(tarjetaHotel).join('');
    activarBotonesHoteles(contenedor);
  }
  if (resultado) resultado.textContent = lista.length + ' hotel' + (lista.length === 1 ? '' : 'es') + ' encontrado' + (lista.length === 1 ? '' : 's') + '.';
}

function poblarDestinosHoteles() {
  const selector = document.getElementById('hotel-destino');
  if (!selector || selector.options.length > 1) return;
  [...new Set(hotelesRallyTraver.map((hotel) => hotel.destino))].sort((a, b) => a.localeCompare(b, 'es')).forEach((destino) => {
    const opcion = document.createElement('option');
    opcion.value = destino;
    opcion.textContent = destino;
    selector.appendChild(opcion);
  });
  const destinoUrl = new URLSearchParams(window.location.search).get('destino');
  if (destinoUrl && [...selector.options].some((opcion) => opcion.value === destinoUrl)) selector.value = destinoUrl;
}

function filtrarHoteles() {
  const texto = (document.getElementById('hotel-buscar')?.value || '').trim().toLocaleLowerCase('es');
  const destino = document.getElementById('hotel-destino')?.value || '';
  const tipo = document.getElementById('hotel-tipo')?.value || '';
  const incluido = document.getElementById('hotel-incluido')?.value || '';
  const lista = hotelesRallyTraver.filter((hotel) => {
    const buscable = [hotel.nombre, hotel.destino, hotel.ciudad, hotel.pais, hotel.ubicacion, hotel.tipo, ...(hotel.caracteristicas || [])].join(' ').toLocaleLowerCase('es');
    return (!texto || buscable.includes(texto)) && (!destino || hotel.destino === destino) && (!tipo || hotel.tipo === tipo) && (!incluido || hotel.todoIncluido === true);
  });
  renderizarHoteles(lista);
}

function abrirDetalleHotel(hotel) {
  if (!hotel) return;
  const modal = document.getElementById('modal-hotel');
  const detalle = document.getElementById('detalle-hotel');
  if (!modal || !detalle) return;
  const fotos = (hotel.galeria?.length ? hotel.galeria : [hotel.imagen]).slice(0, 3);
  const caracteristicas = (hotel.caracteristicas || []).map((item) => '<li>' + escaparHotel(item) + '</li>').join('') || '<li>Consulta las características al solicitar disponibilidad.</li>';
  detalle.innerHTML = '<span class="rt-tag">' + escaparHotel(hotel.destino) + '</span><h2>' + escaparHotel(hotel.nombre) + '</h2><div class="rt-detail-gallery">' + fotos.map((foto) => '<img src="' + rutaImagenHotel(foto) + '" alt="' + escaparHotel(hotel.nombre) + '" onerror="this.src=&quot;Images/hotel.JPG&quot;">').join('') + '</div><p class="rt-detail-description">' + escaparHotel(hotel.descripcion) + '</p><div class="rt-detail-meta"><span>⌖ ' + escaparHotel(hotel.ubicacion) + '</span><span>✦ ' + escaparHotel(hotel.tipo) + '</span>' + (hotel.todoIncluido ? '<span>Todo incluido</span>' : '') + '</div><p class="rt-price-callout">La tarifa final se confirma según las fechas, el tipo de habitación y la disponibilidad del hotel.</p><section class="rt-detail-section"><h3>Características destacadas</h3><ul class="rt-detail-list">' + caracteristicas + '</ul></section><div class="rt-detail-actions"><a class="rt-secondary" href="' + enlaceBooking(hotel) + '" target="_blank" rel="noopener">Buscar en Booking</a><button class="rt-primary" id="boton-solicitar-hotel" type="button">Solicitar alojamiento</button></div>';
  detalle.querySelector('#boton-solicitar-hotel').addEventListener('click', () => { modal.close(); abrirSolicitudHotel(hotel); });
  modal.showModal();
}

function fechaMinimaHotel() {
  return new Date().toISOString().slice(0, 10);
}

function abrirSolicitudHotel(hotel) {
  if (!hotel) return;
  if (typeof obtenerSesionRallyTraver !== 'function' || !obtenerSesionRallyTraver()) {
    if (typeof enviarAInicioSesion === 'function') enviarAInicioSesion();
    return;
  }
  const modal = document.getElementById('modal-solicitud-hotel');
  const id = document.getElementById('solicitud-hotel-id');
  const nombre = document.getElementById('solicitud-hotel-nombre');
  const entrada = document.getElementById('hotel-entrada');
  const salida = document.getElementById('hotel-salida');
  const estado = document.getElementById('estado-solicitud-hotel');
  if (!modal || !id || !nombre || !entrada || !salida) return;
  const formulario = document.getElementById('form-solicitud-hotel');
  formulario?.reset();
  formulario?.querySelector('button[type="submit"]')?.removeAttribute('disabled');
  id.value = hotel._id;
  nombre.textContent = hotel.nombre + ' · ' + hotel.destino;
  entrada.min = fechaMinimaHotel();
  salida.min = fechaMinimaHotel();
  if (estado) { estado.textContent = ''; estado.style.color = ''; }
  modal.showModal();
}

function configurarFormularioHotel() {
  document.getElementById('hotel-entrada')?.addEventListener('change', (evento) => {
    const salida = document.getElementById('hotel-salida');
    if (!salida) return;
    salida.min = evento.target.value || fechaMinimaHotel();
    if (salida.value && salida.value <= evento.target.value) salida.value = '';
  });

  document.getElementById('form-solicitud-hotel')?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const sesion = typeof obtenerSesionRallyTraver === 'function' ? obtenerSesionRallyTraver() : null;
    if (!sesion) return enviarAInicioSesion();
    const formulario = evento.currentTarget;
    if (!formulario.checkValidity()) return formulario.reportValidity();
    const datos = new FormData(formulario);
    const estado = document.getElementById('estado-solicitud-hotel');
    const boton = formulario.querySelector('button[type="submit"]');
    let solicitudRegistrada = false;
    estado.textContent = 'Registrando solicitud...';
    estado.style.color = '';
    boton.disabled = true;
    try {
      const respuesta = await fetch(API_SOLICITUDES_ALOJAMIENTO, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + sesion.token }, body: JSON.stringify(Object.fromEntries(datos)) });
      const resultado = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo registrar la solicitud.');
      estado.innerHTML = '¡Solicitud registrada! Código: <strong>' + escaparHotel(resultado.solicitud.codigo) + '</strong>. Quedó pendiente de confirmación. <a href="mis-reservas.html">Ver mis reservas</a>.';
      solicitudRegistrada = true;
    } catch (error) {
      estado.textContent = error.message || 'No se pudo registrar la solicitud. Intenta nuevamente.';
      estado.style.color = '#b42318';
    } finally {
      boton.disabled = solicitudRegistrada;
    }
  });
}

async function cargarHoteles() {
  const contenedor = document.getElementById('catalogo-hoteles');
  try {
    const respuesta = await fetch(API_HOTELES);
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new Error(datos.error || 'No se pudieron cargar los hoteles.');
    hotelesRallyTraver = datos;
    poblarDestinosHoteles();
    filtrarHoteles();
  } catch (error) {
    if (contenedor) contenedor.innerHTML = '<div class="rt-empty"><h2>No pudimos cargar los hoteles.</h2><p>' + escaparHotel(error.message) + '</p></div>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.rt-modal-close').forEach((boton) => boton.addEventListener('click', () => boton.closest('dialog').close()));
  document.getElementById('form-filtros-hoteles')?.addEventListener('submit', (evento) => { evento.preventDefault(); filtrarHoteles(); });
  document.getElementById('hotel-buscar')?.addEventListener('input', filtrarHoteles);
  document.querySelectorAll('#hotel-destino, #hotel-tipo, #hotel-incluido').forEach((campo) => campo.addEventListener('change', filtrarHoteles));
  configurarFormularioHotel();
  cargarHoteles();
});

document.addEventListener('rallytraverFavoritosActualizados', () => {
  if (hotelesRallyTraver.length) filtrarHoteles();
});
