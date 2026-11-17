const API_ORIGEN_GESTION_USUARIOS = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:8080'
  : 'https://rallytraver-api.onrender.com';
const API_GESTION_USUARIOS = `${API_ORIGEN_GESTION_USUARIOS}/api/usuarios/gestion`;
const estadoGestionUsuarios = { pagina: 1, limite: 10, totalPaginas: 1 };

function escaparHTMLUsuarios(valor) {
  return String(valor || '').replace(/[&<>'"]/g, (caracter) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[caracter]);
}

function fechaUsuario(valor) {
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? 'No disponible' : fecha.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
}

function validarGestionUsuarios() {
  const sesion = obtenerSesionRallyTraver();
  if (!sesion) {
    enviarAInicioSesion();
    return null;
  }
  if (sesion.usuario.role !== 'superadmin') {
    window.location.href = 'paginaprincipal.html';
    return null;
  }
  return sesion;
}

function encabezadosGestionUsuarios() {
  const sesion = obtenerSesionRallyTraver();
  return { 'Content-Type': 'application/json', Authorization: 'Bearer ' + sesion.token };
}

function mostrarMensajeGestionUsuarios(texto, tipo = '') {
  const mensaje = document.getElementById('gestion-usuarios-mensaje');
  if (!mensaje) return;
  mensaje.textContent = texto;
  mensaje.className = 'rt-admin-feedback' + (tipo ? ' is-' + tipo : '');
}

function etiquetaRolUsuario(rol) {
  if (rol === 'superadmin') return 'Administradora principal';
  if (rol === 'admin') return 'Asesor';
  return 'Cliente';
}

function renderizarResumenUsuarios(resumen) {
  const contenedor = document.getElementById('gestion-usuarios-resumen');
  if (!contenedor) return;
  contenedor.innerHTML = `<article><span>Total de usuarios</span><strong>${resumen.total}</strong></article><article><span>Clientes</span><strong>${resumen.clientes}</strong></article><article><span>Equipo autorizado</span><strong>${resumen.asesores}</strong></article>`;
}

function renderizarTablaUsuarios(usuarios) {
  const tabla = document.getElementById('tabla-usuarios');
  if (!tabla) return;
  if (!usuarios.length) {
    tabla.innerHTML = '<tr><td colspan="6">No se encontraron usuarios con esos filtros.</td></tr>';
    return;
  }
  tabla.innerHTML = usuarios.map((usuario) => {
    const esPrincipal = usuario.role === 'superadmin';
    const esAsesor = usuario.role === 'admin';
    const accion = esPrincipal
      ? '<span class="rt-user-role-protected">Cuenta protegida</span>'
      : `<button class="rt-user-role-action ${esAsesor ? 'is-revoke' : ''}" type="button" data-user-id="${escaparHTMLUsuarios(usuario._id)}" data-user-name="${escaparHTMLUsuarios(usuario.name)}" data-next-role="${esAsesor ? 'cliente' : 'admin'}">${esAsesor ? 'Revocar acceso' : 'Otorgar acceso de asesor'}</button>`;
    return `<tr><td><strong>${escaparHTMLUsuarios(usuario.name)}</strong></td><td>${escaparHTMLUsuarios(usuario.email)}</td><td>${escaparHTMLUsuarios(usuario.phone || 'Sin teléfono')}</td><td><span class="rt-user-role rt-user-role-${escaparHTMLUsuarios(usuario.role)}">${etiquetaRolUsuario(usuario.role)}</span></td><td>${fechaUsuario(usuario.createdAt)}</td><td>${accion}</td></tr>`;
  }).join('');
  tabla.querySelectorAll('[data-user-id]').forEach((boton) => boton.addEventListener('click', () => actualizarRolUsuario(boton)));
}

function actualizarPaginacion(datos) {
  estadoGestionUsuarios.totalPaginas = datos.totalPaginas;
  document.getElementById('usuarios-pagina').textContent = `Página ${datos.pagina} de ${datos.totalPaginas} · ${datos.totalResultados} resultado${datos.totalResultados === 1 ? '' : 's'}`;
  document.getElementById('usuarios-anterior').disabled = datos.pagina <= 1;
  document.getElementById('usuarios-siguiente').disabled = datos.pagina >= datos.totalPaginas;
}

async function cargarGestionUsuarios() {
  if (!validarGestionUsuarios()) return;
  const buscar = document.getElementById('usuarios-buscar').value.trim();
  const rol = document.getElementById('usuarios-rol').value;
  const parametros = new URLSearchParams({ pagina: String(estadoGestionUsuarios.pagina), limite: String(estadoGestionUsuarios.limite) });
  if (buscar) parametros.set('buscar', buscar);
  if (rol) parametros.set('rol', rol);

  mostrarMensajeGestionUsuarios('Cargando usuarios...');
  try {
    const respuesta = await fetch(`${API_GESTION_USUARIOS}?${parametros.toString()}`, { headers: encabezadosGestionUsuarios() });
    const datos = await respuesta.json().catch(() => ({}));
    if (respuesta.status === 401) throw new Error('Tu sesión venció. Inicia sesión nuevamente.');
    if (respuesta.status === 403) throw new Error('No tienes permiso para gestionar usuarios.');
    if (!respuesta.ok) throw new Error(datos.error || 'No se pudo consultar la lista de usuarios.');
    estadoGestionUsuarios.pagina = datos.pagina;
    renderizarResumenUsuarios(datos.resumen);
    renderizarTablaUsuarios(datos.usuarios);
    actualizarPaginacion(datos);
    mostrarMensajeGestionUsuarios('');
  } catch (error) {
    mostrarMensajeGestionUsuarios(error.message, 'error');
    const tabla = document.getElementById('tabla-usuarios');
    if (tabla) tabla.innerHTML = '<tr><td colspan="6">No se pudo cargar la lista de usuarios.</td></tr>';
    if (/sesión venció/.test(error.message)) window.setTimeout(enviarAInicioSesion, 900);
  }
}

async function actualizarRolUsuario(boton) {
  const esAscenso = boton.dataset.nextRole === 'admin';
  const nombre = boton.dataset.userName || 'esta cuenta';
  const mensajeConfirmacion = esAscenso
    ? `¿Otorgar acceso de asesor a ${nombre}? Podrá gestionar reservas y solicitudes.`
    : `¿Revocar el acceso de asesor a ${nombre}? La cuenta conservará su información como cliente.`;
  if (!window.confirm(mensajeConfirmacion)) return;

  boton.disabled = true;
  try {
    const respuesta = await fetch(`${API_GESTION_USUARIOS}/${encodeURIComponent(boton.dataset.userId)}/rol`, {
      method: 'PATCH',
      headers: encabezadosGestionUsuarios(),
      body: JSON.stringify({ role: boton.dataset.nextRole })
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new Error(datos.error || 'No se pudo actualizar el rol de la cuenta.');
    await cargarGestionUsuarios();
    mostrarMensajeGestionUsuarios(datos.message, 'success');
  } catch (error) {
    mostrarMensajeGestionUsuarios(error.message, 'error');
    boton.disabled = false;
  }
}

function configurarGestionUsuarios() {
  if (!validarGestionUsuarios()) return;
  document.getElementById('form-filtros-usuarios').addEventListener('submit', (evento) => {
    evento.preventDefault();
    estadoGestionUsuarios.pagina = 1;
    cargarGestionUsuarios();
  });
  document.getElementById('usuarios-anterior').addEventListener('click', () => {
    if (estadoGestionUsuarios.pagina > 1) {
      estadoGestionUsuarios.pagina -= 1;
      cargarGestionUsuarios();
    }
  });
  document.getElementById('usuarios-siguiente').addEventListener('click', () => {
    if (estadoGestionUsuarios.pagina < estadoGestionUsuarios.totalPaginas) {
      estadoGestionUsuarios.pagina += 1;
      cargarGestionUsuarios();
    }
  });
  cargarGestionUsuarios();
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page === 'gestion-usuarios') configurarGestionUsuarios();
});
