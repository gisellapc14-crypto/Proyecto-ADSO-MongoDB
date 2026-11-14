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

function configurarMenuRallyTraver() {
  const boton = document.querySelector('.rt-menu-toggle');
  const nav = document.querySelector('.rt-nav');
  boton?.addEventListener('click', () => {
    const abierto = nav.classList.toggle('is-open');
    boton.setAttribute('aria-expanded', String(abierto));
  });
}

function configurarNavegacionSesion() {
  const nav = document.querySelector('.rt-nav');
  if (!nav) return;
  const sesion = obtenerSesionRallyTraver();
  const enlaceAcceso = nav.querySelector('.rt-login');

  if (!sesion) return;

  if (enlaceAcceso) {
    enlaceAcceso.textContent = 'Mis reservas';
    enlaceAcceso.href = 'mis-reservas.html';
  }

  if (sesion.usuario.role === 'admin' && !nav.querySelector('[data-panel-admin]')) {
    const panel = document.createElement('a');
    panel.href = 'admin.html';
    panel.textContent = 'Administración';
    panel.dataset.panelAdmin = 'true';
    nav.insertBefore(panel, enlaceAcceso || null);
  }

  if (!nav.querySelector('[data-cerrar-sesion]')) {
    const cerrar = document.createElement('button');
    cerrar.type = 'button';
    cerrar.className = 'rt-logout';
    cerrar.dataset.cerrarSesion = 'true';
    cerrar.textContent = 'Cerrar sesión';
    cerrar.addEventListener('click', cerrarSesionRallyTraver);
    nav.appendChild(cerrar);
  }
}

function configurarSesionRallyTraver() {
  configurarMenuRallyTraver();
  configurarNavegacionSesion();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', configurarSesionRallyTraver);
} else {
  configurarSesionRallyTraver();
}
