const API_USUARIOS = 'http://localhost:8080/api/usuarios';
const API_NOTIFICACIONES = 'http://localhost:8080/api/notificaciones';
let intervaloNotificacionesRallyTraver = null;

function obtenerSesionRallyTraver() {
  try {
    const token = localStorage.getItem('rallytraverToken');
    const usuario = JSON.parse(localStorage.getItem('rallytraverUsuario') || 'null');
    return token && usuario ? { token, usuario } : null;
  } catch {
    return null;
  }
}

function guardarSesionRallyTraver(token, usuario) {
  localStorage.setItem('rallytraverToken', token);
  localStorage.setItem('rallytraverUsuario', JSON.stringify(usuario));
}

function cerrarSesionRallyTraver() {
  localStorage.removeItem('rallytraverToken');
  localStorage.removeItem('rallytraverUsuario');
  window.location.href = 'index.html';
}

function enviarAInicioSesion() {
  sessionStorage.setItem('rallytraverRutaPendiente', window.location.href);
  window.location.href = 'index.html';
}

function crearEnlaceMenu(texto, href) {
  const enlace = document.createElement('a');
  enlace.textContent = texto;
  enlace.href = href;
  return enlace;
}

function cerrarMenusRallyTraver(excepto = null) {
  document.querySelectorAll('.rt-nav-menu.is-open').forEach((menu) => {
    if (menu !== excepto) {
      menu.classList.remove('is-open');
      const boton = menu.querySelector('.rt-nav-menu-toggle');
      const desplegable = menu.querySelector('.rt-nav-dropdown');
      if (boton) boton.setAttribute('aria-expanded', 'false');
      if (desplegable) desplegable.hidden = true;
    }
  });
}

function escaparNotificacionRallyTraver(valor) {
  return String(valor || '').replace(/[&<>'"]/g, (caracter) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[caracter]);
}

function fechaNotificacionRallyTraver(valor) {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return 'Ahora';
  return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) + ' · ' + fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function encabezadosNotificacionesRallyTraver() {
  const sesion = obtenerSesionRallyTraver();
  return sesion ? { Authorization: 'Bearer ' + sesion.token } : {};
}

function renderizarNotificacionesRallyTraver(notificaciones) {
  const centro = document.querySelector('[data-nav-menu="notificaciones"]');
  if (!centro) return;

  const boton = centro.querySelector('.rt-notifications-toggle');
  const contador = centro.querySelector('.rt-notifications-count');
  const lista = centro.querySelector('.rt-notifications-list');
  const marcarTodas = centro.querySelector('.rt-notifications-read-all');
  const noLeidas = notificaciones.filter((notificacion) => !notificacion.leida).length;

  if (contador) {
    contador.textContent = noLeidas > 99 ? '99+' : String(noLeidas);
    contador.hidden = noLeidas === 0;
  }
  if (boton) boton.setAttribute('aria-label', noLeidas ? `Notificaciones: ${noLeidas} sin leer` : 'Notificaciones');
  if (marcarTodas) marcarTodas.hidden = noLeidas === 0;
  if (!lista) return;

  if (!notificaciones.length) {
    lista.innerHTML = '<p class="rt-notifications-empty">No tienes notificaciones por ahora.</p>';
    return;
  }

  lista.innerHTML = notificaciones.map((notificacion) => `
    <button class="rt-notification-item${notificacion.leida ? '' : ' is-unread'}" type="button" data-notification-id="${escaparNotificacionRallyTraver(notificacion._id)}" data-notification-link="${escaparNotificacionRallyTraver(notificacion.enlace)}">
      <span class="rt-notification-item-title">${escaparNotificacionRallyTraver(notificacion.titulo)}</span>
      <span class="rt-notification-item-message">${escaparNotificacionRallyTraver(notificacion.mensaje)}</span>
      <span class="rt-notification-item-date">${fechaNotificacionRallyTraver(notificacion.createdAt)}</span>
    </button>
  `).join('');

  lista.querySelectorAll('[data-notification-id]').forEach((item) => {
    item.addEventListener('click', () => abrirNotificacionRallyTraver(item));
  });
}

async function cargarNotificacionesRallyTraver() {
  const sesion = obtenerSesionRallyTraver();
  if (!sesion || !document.querySelector('[data-nav-menu="notificaciones"]')) return;

  try {
    const respuesta = await fetch(API_NOTIFICACIONES, { headers: encabezadosNotificacionesRallyTraver() });
    if (respuesta.status === 401) return cerrarSesionRallyTraver();
    if (!respuesta.ok) throw new Error('No se pudieron cargar las notificaciones.');
    renderizarNotificacionesRallyTraver(await respuesta.json());
  } catch (error) {
    const lista = document.querySelector('.rt-notifications-list');
    if (lista && !lista.children.length) lista.innerHTML = '<p class="rt-notifications-empty">Las notificaciones estarán disponibles cuando el servidor esté conectado.</p>';
  }
}

async function abrirNotificacionRallyTraver(item) {
  const id = item.dataset.notificationId;
  const enlace = item.dataset.notificationLink || 'mis-reservas.html';
  item.disabled = true;

  try {
    await fetch(`${API_NOTIFICACIONES}/${encodeURIComponent(id)}/leer`, {
      method: 'PATCH',
      headers: encabezadosNotificacionesRallyTraver()
    });
  } finally {
    window.location.href = enlace;
  }
}

async function marcarTodasLeidasRallyTraver(boton) {
  boton.disabled = true;
  try {
    const respuesta = await fetch(`${API_NOTIFICACIONES}/marcar-leidas`, {
      method: 'PATCH',
      headers: encabezadosNotificacionesRallyTraver()
    });
    if (!respuesta.ok) throw new Error();
    await cargarNotificacionesRallyTraver();
  } finally {
    boton.disabled = false;
  }
}

function crearCentroNotificacionesRallyTraver() {
  const contenedor = document.createElement('div');
  contenedor.className = 'rt-nav-menu rt-notifications-menu';
  contenedor.dataset.navMenu = 'notificaciones';

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'rt-nav-menu-toggle rt-notifications-toggle';
  boton.setAttribute('aria-haspopup', 'true');
  boton.setAttribute('aria-expanded', 'false');
  boton.setAttribute('aria-controls', 'notificaciones-opciones');
  boton.setAttribute('aria-label', 'Notificaciones');
  boton.innerHTML = '<span class="rt-notifications-icon" aria-hidden="true">🔔</span><span class="rt-notifications-count" hidden>0</span>';

  const desplegable = document.createElement('div');
  desplegable.className = 'rt-nav-dropdown rt-notifications-dropdown';
  desplegable.id = 'notificaciones-opciones';
  desplegable.hidden = true;
  desplegable.innerHTML = '<div class="rt-notifications-heading"><strong>Notificaciones</strong><button class="rt-notifications-read-all" type="button" hidden>Marcar leídas</button></div><div class="rt-notifications-list" aria-live="polite"><p class="rt-notifications-empty">Cargando notificaciones...</p></div>';

  boton.addEventListener('click', (evento) => {
    evento.stopPropagation();
    const abrir = !contenedor.classList.contains('is-open');
    cerrarMenusRallyTraver(contenedor);
    contenedor.classList.toggle('is-open', abrir);
    boton.setAttribute('aria-expanded', String(abrir));
    desplegable.hidden = !abrir;
    if (abrir) cargarNotificacionesRallyTraver();
  });

  desplegable.querySelector('.rt-notifications-read-all').addEventListener('click', (evento) => {
    evento.stopPropagation();
    marcarTodasLeidasRallyTraver(evento.currentTarget);
  });

  contenedor.append(boton, desplegable);
  return contenedor;
}

function crearMenuRallyTraver(id, etiqueta, elementos) {
  const contenedor = document.createElement('div');
  contenedor.className = 'rt-nav-menu';
  contenedor.dataset.navMenu = id;

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'rt-nav-menu-toggle';
  boton.setAttribute('aria-haspopup', 'true');
  boton.setAttribute('aria-expanded', 'false');
  boton.setAttribute('aria-controls', id + '-opciones');
  boton.innerHTML = etiqueta + ' <span aria-hidden="true">⌄</span>';

  const desplegable = document.createElement('div');
  desplegable.className = 'rt-nav-dropdown';
  desplegable.id = id + '-opciones';
  desplegable.setAttribute('role', 'menu');
  desplegable.hidden = true;
  elementos.forEach((elemento) => desplegable.appendChild(elemento));

  boton.addEventListener('click', (evento) => {
    evento.stopPropagation();
    const abrir = !contenedor.classList.contains('is-open');
    cerrarMenusRallyTraver(contenedor);
    contenedor.classList.toggle('is-open', abrir);
    boton.setAttribute('aria-expanded', String(abrir));
    desplegable.hidden = !abrir;
  });

  contenedor.append(boton, desplegable);
  return contenedor;
}

function configurarMenuRallyTraver() {
  const boton = document.querySelector('.rt-menu-toggle');
  const nav = document.querySelector('.rt-nav');
  boton?.addEventListener('click', () => {
    const abierto = nav.classList.toggle('is-open');
    boton.setAttribute('aria-expanded', String(abierto));
  });
}

function compactarMenuExplorar(nav) {
  if (nav.querySelector('[data-nav-menu="explorar"]')) return;
  const destinos = nav.querySelector('a[href="landingpage.html"]');
  const paquetes = nav.querySelector('a[href="landingpage.html?categoria=internacional"]');
  const hoteles = nav.querySelector('a[href="hoteles.html"], a[href="landingpage.html?hoteles=true"]');
  if (!destinos || !paquetes || !hoteles) return;

  const explorar = crearMenuRallyTraver('explorar', 'Explorar', [
    crearEnlaceMenu('Destinos', 'landingpage.html'),
    crearEnlaceMenu('Vuelos', 'vuelos.html'),
    crearEnlaceMenu('Paquetes', 'landingpage.html?paquetes=true'),
    crearEnlaceMenu('Hoteles', 'hoteles.html')
  ]);
  nav.insertBefore(explorar, destinos);
  destinos.remove();
  paquetes.remove();
  hoteles.remove();
}

function crearMenuCuenta(sesion) {
  const elementos = [
    crearEnlaceMenu('Mi perfil', 'perfil.html'),
    crearEnlaceMenu('Mis favoritos', 'favoritos.html'),
    crearEnlaceMenu('Mis reservas', 'mis-reservas.html')
  ];
  if (sesion.usuario.role === 'admin') elementos.push(crearEnlaceMenu('Administración', 'admin.html'));

  const cerrar = document.createElement('button');
  cerrar.type = 'button';
  cerrar.className = 'rt-nav-dropdown-logout';
  cerrar.textContent = 'Cerrar sesión';
  cerrar.addEventListener('click', cerrarSesionRallyTraver);
  elementos.push(cerrar);
  return crearMenuRallyTraver('cuenta', 'Mi cuenta', elementos);
}

function configurarNavegacionSesion() {
  const nav = document.querySelector('.rt-nav');
  if (!nav) return;
  compactarMenuExplorar(nav);
  const sesion = obtenerSesionRallyTraver();
  if (!sesion) return;

  const enlaceAcceso = nav.querySelector('.rt-login');
  if (!nav.querySelector('[data-nav-menu="notificaciones"]')) {
    const notificaciones = crearCentroNotificacionesRallyTraver();
    if (enlaceAcceso) {
      nav.insertBefore(notificaciones, enlaceAcceso);
    } else {
      nav.appendChild(notificaciones);
    }
  }
  if (nav.querySelector('[data-nav-menu="cuenta"]')) return;

  const cuenta = crearMenuCuenta(sesion);
  if (enlaceAcceso) {
    nav.insertBefore(cuenta, enlaceAcceso);
    enlaceAcceso.remove();
  } else {
    nav.appendChild(cuenta);
  }
}

function configurarCierreDeMenus() {
  document.addEventListener('click', () => cerrarMenusRallyTraver());
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') cerrarMenusRallyTraver();
  });
}

function configurarSesionRallyTraver() {
  configurarMenuRallyTraver();
  configurarNavegacionSesion();
  configurarCierreDeMenus();
  cargarNotificacionesRallyTraver();
  if (!intervaloNotificacionesRallyTraver) {
    intervaloNotificacionesRallyTraver = window.setInterval(cargarNotificacionesRallyTraver, 30000);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', configurarSesionRallyTraver);
} else {
  configurarSesionRallyTraver();
}
