function configurarMenuExplorarPublico() {
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

document.addEventListener('DOMContentLoaded', configurarMenuExplorarPublico);
