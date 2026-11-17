const API_ORIGEN_RESTABLECER = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:8080'
  : 'https://rallytraver-api.onrender.com';

function mostrarEstadoRestablecimiento(mensaje, esError = false) {
  const estado = document.getElementById('mensaje-restablecimiento');
  if (!estado) return;
  estado.textContent = mensaje;
  estado.classList.toggle('is-error', esError);
}

function configurarRestablecimientoContrasena() {
  const formulario = document.getElementById('restablecer-form');
  const token = new URLSearchParams(window.location.search).get('token') || '';
  const tokenValido = /^[a-f\d]{64}$/i.test(token);
  if (!formulario) return;

  if (!tokenValido) {
    formulario.querySelectorAll('input, button').forEach((elemento) => { elemento.disabled = true; });
    mostrarEstadoRestablecimiento('Este enlace no es válido. Solicita un enlace nuevo desde “¿Olvidaste tu contraseña?”.', true);
    return;
  }

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const password = document.getElementById('password').value;
    const confirmacion = document.getElementById('confirmacion').value;
    const boton = formulario.querySelector('button[type="submit"]');

    if (!formulario.checkValidity()) {
      mostrarEstadoRestablecimiento('La contraseña debe tener entre 8 y 72 caracteres.', true);
      formulario.reportValidity();
      return;
    }
    if (password !== confirmacion) {
      mostrarEstadoRestablecimiento('Las contraseñas no coinciden.', true);
      return;
    }

    boton.disabled = true;
    mostrarEstadoRestablecimiento('Actualizando contraseña...');
    try {
      const respuesta = await fetch(`${API_ORIGEN_RESTABLECER}/api/usuarios/restablecer-contrasena`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.error || 'No fue posible actualizar la contraseña.');

      formulario.reset();
      formulario.querySelectorAll('input').forEach((elemento) => { elemento.disabled = true; });
      mostrarEstadoRestablecimiento(datos.message || 'Contraseña actualizada. Ya puedes iniciar sesión.');
      window.setTimeout(() => { window.location.href = 'index.html'; }, 1800);
    } catch (error) {
      mostrarEstadoRestablecimiento(error.message || 'No fue posible conectar con el servidor.', true);
      boton.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', configurarRestablecimientoContrasena);
