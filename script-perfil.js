const API_ORIGEN_PERFIL = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:8080'
  : 'https://rallytraver-api.onrender.com';
const API_PERFIL = `${API_ORIGEN_PERFIL}/api/usuarios/perfil`;
let fotoPerfilActual = '';

function iniciales(nombre) {
  return String(nombre || 'RallyTraver').trim().split(/\s+/).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase() || 'RT';
}

function mostrarFotoPerfil(usuario) {
  const imagen = document.getElementById('perfil-foto');
  const letras = document.getElementById('perfil-iniciales');
  const avatar = document.getElementById('perfil-avatar');
  fotoPerfilActual = usuario.fotoPerfil || '';
  letras.textContent = iniciales(usuario.name);
  if (fotoPerfilActual) {
    imagen.src = fotoPerfilActual;
    imagen.hidden = false;
    avatar.classList.add('has-photo');
  } else {
    imagen.removeAttribute('src');
    imagen.hidden = true;
    avatar.classList.remove('has-photo');
  }
}

function estadoPerfil(mensaje, esError = false) {
  const estado = document.getElementById('perfil-estado');
  estado.textContent = mensaje;
  estado.classList.toggle('is-error', esError);
}

function encabezadosPerfil() {
  const sesion = obtenerSesionRallyTraver();
  return { 'Content-Type': 'application/json', Authorization: 'Bearer ' + sesion.token };
}

function validarSesionPerfil() {
  const sesion = obtenerSesionRallyTraver();
  if (!sesion) {
    enviarAInicioSesion();
    return null;
  }
  return sesion;
}

async function cargarPerfil() {
  const sesion = validarSesionPerfil();
  if (!sesion) return;
  try {
    const respuesta = await fetch(API_PERFIL, { headers: { Authorization: 'Bearer ' + sesion.token } });
    const usuario = await respuesta.json().catch(() => ({}));
    if (respuesta.status === 401) throw new Error('Tu sesión venció. Inicia sesión nuevamente.');
    if (!respuesta.ok) throw new Error(usuario.error || 'No se pudo cargar tu perfil.');
    document.getElementById('perfil-nombre').value = usuario.name || '';
    document.getElementById('perfil-correo').value = usuario.email || '';
    document.getElementById('perfil-nacimiento').value = usuario.born || '';
    document.getElementById('perfil-telefono').value = usuario.phone || '';
    document.getElementById('perfil-nombre-resumen').textContent = usuario.name || 'Tu cuenta RallyTraver';
    document.getElementById('perfil-correo-resumen').textContent = usuario.email || '';
    document.getElementById('perfil-rol').textContent = usuario.role === 'superadmin' ? 'Administradora principal' : usuario.role === 'admin' ? 'Asesor' : 'Cliente';
    document.getElementById('perfil-admin-link').hidden = !['admin', 'superadmin'].includes(usuario.role);
    mostrarFotoPerfil(usuario);
    guardarSesionRallyTraver(sesion.token, usuario);
  } catch (error) {
    estadoPerfil(error.message, true);
    if (/sesión venció/.test(error.message)) setTimeout(enviarAInicioSesion, 900);
  }
}

function comprimirFoto(archivo) {
  return new Promise((resolve, reject) => {
    if (!archivo) return resolve('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type) || archivo.size > 1024 * 1024) {
      reject(new Error('Selecciona una imagen JPG, PNG o WEBP de máximo 1 MB.'));
      return;
    }
    const lector = new FileReader();
    lector.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    lector.onload = () => {
      const imagen = new Image();
      imagen.onerror = () => reject(new Error('La imagen no es válida.'));
      imagen.onload = () => {
        const limite = 320;
        const escala = Math.min(1, limite / Math.max(imagen.width, imagen.height));
        const lienzo = document.createElement('canvas');
        lienzo.width = Math.max(1, Math.round(imagen.width * escala));
        lienzo.height = Math.max(1, Math.round(imagen.height * escala));
        lienzo.getContext('2d').drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
        resolve(lienzo.toDataURL(archivo.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.82));
      };
      imagen.src = lector.result;
    };
    lector.readAsDataURL(archivo);
  });
}

function configurarFotoPerfil() {
  const archivo = document.getElementById('perfil-archivo');
  archivo.addEventListener('change', async () => {
    try {
      fotoPerfilActual = await comprimirFoto(archivo.files[0]);
      mostrarFotoPerfil({ name: document.getElementById('perfil-nombre').value, fotoPerfil: fotoPerfilActual });
      estadoPerfil('La foto se guardará cuando presiones “Guardar cambios”.');
    } catch (error) {
      archivo.value = '';
      estadoPerfil(error.message, true);
    }
  });
  document.getElementById('quitar-foto').addEventListener('click', () => {
    archivo.value = '';
    mostrarFotoPerfil({ name: document.getElementById('perfil-nombre').value, fotoPerfil: '' });
    estadoPerfil('La foto se eliminará cuando presiones “Guardar cambios”.');
  });
}

function configurarFormularioPerfil() {
  document.getElementById('form-perfil').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    if (!formulario.checkValidity()) {
      formulario.reportValidity();
      return;
    }
    const boton = formulario.querySelector('button[type="submit"]');
    boton.disabled = true;
    estadoPerfil('Guardando cambios...');
    try {
      const respuesta = await fetch(API_PERFIL, {
        method: 'PUT',
        headers: encabezadosPerfil(),
        body: JSON.stringify({
          name: document.getElementById('perfil-nombre').value,
          born: document.getElementById('perfil-nacimiento').value,
          phone: document.getElementById('perfil-telefono').value,
          fotoPerfil: fotoPerfilActual
        })
      });
      const resultado = await respuesta.json().catch(() => ({}));
      if (respuesta.status === 401) throw new Error('Tu sesión venció. Inicia sesión nuevamente.');
      if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo actualizar tu perfil.');
      const sesion = obtenerSesionRallyTraver();
      guardarSesionRallyTraver(sesion.token, resultado.user);
      document.getElementById('perfil-nombre-resumen').textContent = resultado.user.name;
      document.getElementById('perfil-correo-resumen').textContent = resultado.user.email;
      document.getElementById('perfil-rol').textContent = resultado.user.role === 'superadmin' ? 'Administradora principal' : resultado.user.role === 'admin' ? 'Asesor' : 'Cliente';
      mostrarFotoPerfil(resultado.user);
      estadoPerfil(resultado.message || 'Tu perfil fue actualizado correctamente.');
    } catch (error) {
      estadoPerfil(error.message, true);
      if (/sesión venció/.test(error.message)) setTimeout(enviarAInicioSesion, 900);
    } finally {
      boton.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page !== 'perfil') return;
  configurarFotoPerfil();
  configurarFormularioPerfil();
  cargarPerfil();
});
