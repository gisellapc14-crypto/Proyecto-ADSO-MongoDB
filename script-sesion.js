const API_USUARIOS = 'http://localhost:8080/api/usuarios';

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
  if (!sesion || nav.querySelector('[data-nav-menu="cuenta"]')) return;

  const enlaceAcceso = nav.querySelector('.rt-login');
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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', configurarSesionRallyTraver);
} else {
  configurarSesionRallyTraver();
}
