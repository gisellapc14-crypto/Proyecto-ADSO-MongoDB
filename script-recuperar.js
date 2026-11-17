const API_ORIGEN_RECUPERACION = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:8080'
  : 'https://rallytraver-api.onrender.com';

function mostrarEstadoRecuperacion(mensaje, esError = false) {
  const estado = document.getElementById('mensaje-confirmacion');
  if (!estado) return;
  estado.textContent = mensaje;
  estado.classList.toggle('is-error', esError);
}

function configurarRecuperacionContrasena() {
  const formulario = document.getElementById('recuperar-form');
  if (!formulario) return;

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const campoCorreo = document.getElementById('email');
    const boton = formulario.querySelector('button[type="submit"]');
    const email = campoCorreo?.value.trim() || '';

    if (!formulario.checkValidity()) {
      mostrarEstadoRecuperacion('Escribe un correo electrónico válido.', true);
      formulario.reportValidity();
      return;
    }

    boton.disabled = true;
    mostrarEstadoRecuperacion('Enviando enlace de recuperación...');
    try {
      const respuesta = await fetch(`${API_ORIGEN_RECUPERACION}/api/usuarios/recuperar-contrasena`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.error || 'No fue posible enviar el enlace.');

      formulario.reset();
      mostrarEstadoRecuperacion(datos.message || 'Revisa tu correo para continuar con la recuperación.');
    } catch (error) {
      mostrarEstadoRecuperacion(error.message || 'No fue posible conectar con el servidor.', true);
    } finally {
      boton.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', configurarRecuperacionContrasena);
