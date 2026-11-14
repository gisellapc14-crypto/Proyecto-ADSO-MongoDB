const API_CONTACTO_VUELOS = 'http://localhost:8080/api/contactos';

function prepararFormularioVuelos() {
  const formulario = document.getElementById('form-vuelos');
  if (!formulario) return;
  const sesion = typeof obtenerSesionRallyTraver === 'function' ? obtenerSesionRallyTraver() : null;
  const salida = document.getElementById('vuelo-salida');
  salida.min = new Date().toISOString().slice(0, 10);

  if (sesion) {
    document.getElementById('vuelo-nombre').value = sesion.usuario.name || '';
    document.getElementById('vuelo-email').value = sesion.usuario.email || '';
  }

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!formulario.checkValidity()) {
      formulario.reportValidity();
      return;
    }
    const datos = new FormData(formulario);
    const estado = document.getElementById('estado-vuelo');
    const boton = formulario.querySelector('button[type="submit"]');
    const regreso = datos.get('regreso') ? ` Regreso: ${datos.get('regreso')}.` : '';
    const comentario = String(datos.get('comentario') || '').trim();
    const mensaje = `Cotización de vuelo. Tipo: ${datos.get('tipoViaje')}. Origen: ${datos.get('origen')}. Destino: ${datos.get('destino')}. Salida: ${datos.get('salida')}.${regreso} Viajeros: ${datos.get('pasajeros')}.` + (comentario ? ` Comentarios: ${comentario}` : '');
    estado.textContent = 'Enviando tu solicitud...';
    estado.classList.remove('is-error');
    boton.disabled = true;
    try {
      const respuesta = await fetch(API_CONTACTO_VUELOS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: datos.get('nombre'), email: datos.get('email'), mensaje, tipo: 'vuelo' })
      });
      const resultado = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo enviar la solicitud.');
      estado.textContent = 'Tu solicitud de vuelo fue enviada correctamente. Te contactaremos pronto.';
      formulario.reset();
      document.getElementById('vuelo-pasajeros').value = 1;
      if (sesion) {
        document.getElementById('vuelo-nombre').value = sesion.usuario.name || '';
        document.getElementById('vuelo-email').value = sesion.usuario.email || '';
      }
    } catch (error) {
      estado.textContent = error.message || 'No se pudo enviar la solicitud.';
      estado.classList.add('is-error');
    } finally {
      boton.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', prepararFormularioVuelos);
