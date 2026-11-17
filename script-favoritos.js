const API_ORIGEN_FAVORITOS = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:8080'
  : 'https://rallytraver-api.onrender.com';
const API_FAVORITOS_RALLYTRAVER = `${API_ORIGEN_FAVORITOS}/api/favoritos`;
let favoritosRallyTraver = [];
let favoritosCargados = false;

function escaparFavorito(valor) {
  return String(valor || '').replace(/[&<>'"]/g, (caracter) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[caracter]);
}

function sesionFavoritos() {
  return typeof obtenerSesionRallyTraver === 'function' ? obtenerSesionRallyTraver() : null;
}

function notificarFavoritos() {
  document.dispatchEvent(new CustomEvent('rallytraverFavoritosActualizados', { detail: favoritosRallyTraver }));
}

function favoritoCoincide(tipo, elementoId) {
  return favoritosRallyTraver.some((favorito) => favorito.tipo === tipo && String(favorito.elemento?._id || favorito.elemento) === String(elementoId));
}

function obtenerFavoritosRallyTraver() {
  return favoritosRallyTraver;
}

function esFavoritoRallyTraver(tipo, elementoId) {
  return favoritoCoincide(tipo, elementoId);
}

async function respuestaFavoritos(respuesta) {
  const datos = await respuesta.json().catch(() => ({}));
  if (respuesta.status === 401) {
    localStorage.removeItem('rallytraverToken');
    localStorage.removeItem('rallytraverUsuario');
    favoritosRallyTraver = [];
    favoritosCargados = false;
    notificarFavoritos();
    throw new Error('Tu sesión venció. Inicia sesión nuevamente.');
  }
  if (!respuesta.ok) throw new Error(datos.error || 'No se pudo completar la acción.');
  return datos;
}

async function sincronizarFavoritosLocales() {
  const sesion = sesionFavoritos();
  if (!sesion) return;
  let anteriores = [];
  try { anteriores = JSON.parse(localStorage.getItem('rallytraverFavoritos') || '[]'); } catch { anteriores = []; }
  if (!Array.isArray(anteriores) || !anteriores.length) return;
  await Promise.all(anteriores.map(async (elementoId) => {
    try {
      await fetch(API_FAVORITOS_RALLYTRAVER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + sesion.token },
        body: JSON.stringify({ tipo: 'destino', elementoId })
      });
    } catch { /* La sincronización se intenta de nuevo al recargar. */ }
  }));
  localStorage.removeItem('rallytraverFavoritos');
}

async function cargarFavoritosRallyTraver() {
  const sesion = sesionFavoritos();
  if (!sesion) {
    favoritosRallyTraver = [];
    favoritosCargados = true;
    notificarFavoritos();
    return favoritosRallyTraver;
  }
  try {
    await sincronizarFavoritosLocales();
    const respuesta = await fetch(API_FAVORITOS_RALLYTRAVER, { headers: { Authorization: 'Bearer ' + sesion.token } });
    favoritosRallyTraver = await respuestaFavoritos(respuesta);
  } catch (error) {
    console.error('No se pudieron cargar los favoritos:', error.message);
    favoritosRallyTraver = [];
  } finally {
    favoritosCargados = true;
    notificarFavoritos();
  }
  return favoritosRallyTraver;
}

async function alternarFavoritoRallyTraver(tipo, elementoId) {
  const sesion = sesionFavoritos();
  if (!sesion) {
    if (typeof enviarAInicioSesion === 'function') enviarAInicioSesion();
    return false;
  }
  try {
    const guardado = favoritoCoincide(tipo, elementoId);
    const respuesta = await fetch(guardado ? API_FAVORITOS_RALLYTRAVER + '/' + encodeURIComponent(tipo) + '/' + encodeURIComponent(elementoId) : API_FAVORITOS_RALLYTRAVER, {
      method: guardado ? 'DELETE' : 'POST',
      headers: guardado ? { Authorization: 'Bearer ' + sesion.token } : { 'Content-Type': 'application/json', Authorization: 'Bearer ' + sesion.token },
      body: guardado ? undefined : JSON.stringify({ tipo, elementoId })
    });
    await respuestaFavoritos(respuesta);
    await cargarFavoritosRallyTraver();
    return !guardado;
  } catch (error) {
    window.alert(error.message || 'No se pudo actualizar el favorito.');
    return false;
  }
}

function imagenFavorito(favorito) {
  const elemento = favorito.elemento || {};
  if (favorito.tipo === 'vuelo') return 'Images/' + (elemento.logo || 'aerolineas/avianca.png');
  return 'Images/' + (elemento.imagen || 'tour.JPG');
}

function tituloFavorito(favorito) {
  const elemento = favorito.elemento || {};
  if (favorito.tipo === 'vuelo') return (elemento.origen?.ciudad || '') + ' → ' + (elemento.destino?.ciudad || '');
  return elemento.nombre || 'Elemento guardado';
}

function descripcionFavorito(favorito) {
  const elemento = favorito.elemento || {};
  if (favorito.tipo === 'vuelo') return (elemento.aerolinea || 'Aerolínea') + ' · ' + (elemento.origen?.codigo || '') + ' → ' + (elemento.destino?.codigo || '');
  if (favorito.tipo === 'hotel') return (elemento.destino || '') + ' · ' + (elemento.ubicacion || 'Alojamiento');
  return elemento.descripcion || 'Experiencia seleccionada para tu próximo viaje.';
}

function enlaceFavorito(favorito) {
  return favorito.tipo === 'hotel' ? 'hoteles.html' : favorito.tipo === 'vuelo' ? 'vuelos.html' : 'landingpage.html';
}

function etiquetaFavorito(tipo) {
  return ({ destino: 'Experiencia', hotel: 'Hotel', vuelo: 'Vuelo' })[tipo] || 'Favorito';
}

function tarjetaMisFavoritos(favorito) {
  return '<article class="rt-card rt-favorite-card rt-favorite-' + escaparFavorito(favorito.tipo) + '"><div class="rt-card-media"><img src="' + escaparFavorito(imagenFavorito(favorito)) + '" alt="' + escaparFavorito(tituloFavorito(favorito)) + '" onerror="this.src=&quot;Images/tour.JPG&quot;"><button class="rt-favorite is-favorite" type="button" data-quitar-favorito="' + escaparFavorito(favorito.tipo) + '" data-elemento-favorito="' + escaparFavorito(favorito.elemento?._id || favorito.elemento) + '" aria-label="Quitar de favoritos">♥</button></div><div class="rt-card-body"><span class="rt-tag">' + escaparFavorito(etiquetaFavorito(favorito.tipo)) + '</span><h3>' + escaparFavorito(tituloFavorito(favorito)) + '</h3><p>' + escaparFavorito(descripcionFavorito(favorito)) + '</p><div class="rt-card-actions"><a class="rt-outline" href="' + enlaceFavorito(favorito) + '">Ver opciones</a><button type="button" class="rt-secondary" data-quitar-favorito="' + escaparFavorito(favorito.tipo) + '" data-elemento-favorito="' + escaparFavorito(favorito.elemento?._id || favorito.elemento) + '">Quitar</button></div></div></article>';
}

function renderizarMisFavoritos() {
  const contenedor = document.getElementById('lista-favoritos');
  const contador = document.getElementById('contador-favoritos');
  if (!contenedor) return;
  if (contador) contador.textContent = favoritosRallyTraver.length + ' favorito' + (favoritosRallyTraver.length === 1 ? '' : 's');
  if (!favoritosRallyTraver.length) {
    contenedor.innerHTML = '<div class="rt-empty"><h2>Aún no has guardado favoritos.</h2><p>Explora destinos, paquetes, hoteles o vuelos y usa el corazón para reunir tus opciones preferidas.</p><a class="rt-primary" href="paginaprincipal.html">Explorar RallyTraver</a></div>';
    return;
  }
  contenedor.innerHTML = favoritosRallyTraver.map(tarjetaMisFavoritos).join('');
  contenedor.querySelectorAll('[data-quitar-favorito]').forEach((boton) => boton.addEventListener('click', async () => {
    await alternarFavoritoRallyTraver(boton.dataset.quitarFavorito, boton.dataset.elementoFavorito);
    renderizarMisFavoritos();
  }));
}

document.addEventListener('rallytraverFavoritosActualizados', () => {
  if (document.body.dataset.page === 'favoritos') renderizarMisFavoritos();
});

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page === 'favoritos' && !sesionFavoritos()) {
    if (typeof enviarAInicioSesion === 'function') enviarAInicioSesion();
    return;
  }
  cargarFavoritosRallyTraver();
});
