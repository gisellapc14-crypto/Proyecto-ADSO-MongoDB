const API_ORIGEN_REGISTRO = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:8080'
  : 'https://rallytraver-api.onrender.com';

function configurarMenuExplorar() {
  const menu = document.querySelector('.platform-menu');
  const boton = document.getElementById('menu-explorar');
  const opciones = document.getElementById('opciones-explorar');
  if (!menu || !boton || !opciones) return;

  const cerrarMenu = () => {
    opciones.hidden = true;
    boton.setAttribute('aria-expanded', 'false');
  };

  boton.addEventListener('click', () => {
    const seAbrira = opciones.hidden;
    opciones.hidden = !seAbrira;
    boton.setAttribute('aria-expanded', String(seAbrira));
  });

  document.addEventListener('click', (evento) => {
    if (!menu.contains(evento.target)) cerrarMenu();
  });
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') cerrarMenu();
  });
}

function configurarVisibilidadContrasena() {
  document.querySelectorAll('.password-toggle').forEach((boton) => {
    boton.addEventListener('click', () => {
      const campo = boton.closest('.password-container')?.querySelector('input');
      if (!campo) return;
      const visible = campo.type === 'password';
      campo.type = visible ? 'text' : 'password';
      boton.textContent = visible ? '🙈' : '👁️';
      boton.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
    });
  });
}

function mostrarEstado(elemento, mensaje, esError = false) {
  elemento.textContent = mensaje;
  elemento.classList.toggle('is-error', esError);
}

function configurarRegistro() {
  const formulario = document.getElementById('form-registro');
  const estado = document.getElementById('estado-registro');
  if (!formulario || !estado) return;

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!formulario.checkValidity()) {
      mostrarEstado(estado, 'Revisa los campos obligatorios antes de continuar.', true);
      formulario.reportValidity();
      return;
    }

    const name = document.getElementById('nombre').value.trim();
    const email = document.getElementById('correo').value.trim();
    const password = document.getElementById('password').value;
    const born = `${document.getElementById('dia').value} ${document.getElementById('mes').value} ${document.getElementById('anio').value}`;
    const phone = `${document.getElementById('codigo').value} ${document.getElementById('celular').value.trim()}`;
    const boton = formulario.querySelector('button[type="submit"]');
    mostrarEstado(estado, 'Creando tu cuenta...');
    boton.disabled = true;

    try {
      const respuesta = await fetch(`${API_ORIGEN_REGISTRO}/api/usuarios/registrese`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, born, phone })
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.error || 'No fue posible crear la cuenta.');

      mostrarEstado(estado, 'Cuenta creada correctamente. Redireccionando al inicio de sesión...');
      window.setTimeout(() => { window.location.href = 'index.html'; }, 900);
    } catch (error) {
      mostrarEstado(estado, error.message || 'Error al conectar con el servidor.', true);
    } finally {
      boton.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  configurarMenuExplorar();
  configurarVisibilidadContrasena();
  configurarRegistro();
});
