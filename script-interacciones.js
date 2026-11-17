const API_ORIGEN_INTERACCIONES = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:8080'
  : 'https://rallytraver-api.onrender.com';
const API_CONTACTOS = `${API_ORIGEN_INTERACCIONES}/api/contactos`;

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-desplazar]').forEach((boton) => {
    boton.addEventListener('click', () => document.getElementById(boton.dataset.desplazar)?.scrollIntoView({ behavior: 'smooth' }));
  });

  document.querySelectorAll('.cerrar-modal').forEach((boton) => {
    boton.addEventListener('click', () => boton.closest('dialog')?.close());
  });

  document.querySelectorAll('.btn-reserva').forEach((boton) => {
    boton.addEventListener('click', () => {
      document.getElementById('reserva-pasadia').value = boton.dataset.pasadia;
      document.getElementById('modal-reserva').showModal();
    });
  });

  document.getElementById('form-contacto')?.addEventListener('submit', (evento) => enviarSolicitud(evento, 'contacto'));
  document.getElementById('form-reserva')?.addEventListener('submit', (evento) => enviarSolicitud(evento, 'reserva'));
});

async function enviarSolicitud(evento, tipo) {
  evento.preventDefault();
  const formulario = evento.currentTarget;
  const datos = new FormData(formulario);
  const mensaje = tipo === 'reserva'
    ? `Pasadía: ${datos.get('pasadia')}. ${datos.get('mensaje')}`
    : datos.get('mensaje');

  try {
    const respuesta = await fetch(API_CONTACTOS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: datos.get('nombre'), email: datos.get('email'), mensaje, tipo })
    });
    const resultado = await respuesta.json();
    if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo enviar la solicitud');

    formulario.reset();
    const aviso = formulario.querySelector('.mensaje-solicitud') || document.getElementById('mensaje-solicitud');
    if (aviso) aviso.textContent = tipo === 'reserva' ? 'Tu solicitud de reserva fue enviada correctamente.' : 'Tu mensaje fue enviado correctamente.';
  } catch (error) {
    const aviso = formulario.querySelector('.mensaje-solicitud') || document.getElementById('mensaje-solicitud');
    if (aviso) aviso.textContent = error.message;
    console.error('Error al enviar la solicitud:', error);
  }
}
