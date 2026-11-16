function configurarCarruselRallyTraver() {
  const carrusel = document.querySelector('.rt-hero-carousel');
  if (!carrusel) return;

  const diapositivas = Array.from(carrusel.querySelectorAll('.rt-hero-slide'));
  const indicadores = Array.from(carrusel.querySelectorAll('[data-carousel-dot]'));
  const anterior = carrusel.querySelector('[data-carousel-prev]');
  const siguiente = carrusel.querySelector('[data-carousel-next]');
  const pausa = carrusel.querySelector('[data-carousel-pause]');
  const movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)');
  let indiceActual = 0;
  let temporizador = null;
  let pausadoPorUsuario = movimientoReducido.matches;

  function normalizarIndice(indice) {
    return (indice + diapositivas.length) % diapositivas.length;
  }

  function mostrarDiapositiva(indice) {
    indiceActual = normalizarIndice(indice);
    diapositivas.forEach((diapositiva, posicion) => {
      const activa = posicion === indiceActual;
      diapositiva.classList.toggle('is-active', activa);
      diapositiva.setAttribute('aria-hidden', String(!activa));
      diapositiva.inert = !activa;
    });
    indicadores.forEach((indicador, posicion) => {
      const activo = posicion === indiceActual;
      indicador.classList.toggle('is-active', activo);
      indicador.setAttribute('aria-current', String(activo));
    });
  }

  function detenerReproduccion() {
    if (temporizador) window.clearInterval(temporizador);
    temporizador = null;
  }

  function iniciarReproduccion() {
    detenerReproduccion();
    if (!pausadoPorUsuario && !movimientoReducido.matches) {
      temporizador = window.setInterval(() => mostrarDiapositiva(indiceActual + 1), 6500);
    }
  }

  function reiniciarReproduccion() {
    iniciarReproduccion();
  }

  function actualizarBotonPausa() {
    if (!pausa) return;
    const etiqueta = pausadoPorUsuario ? 'Reanudar carrusel' : 'Pausar carrusel';
    const icono = pausadoPorUsuario
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 10 6-10 6z"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5.5h3.2v13H7zm6.8 0H17v13h-3.2z"/></svg>';
    pausa.setAttribute('aria-pressed', String(pausadoPorUsuario));
    pausa.setAttribute('aria-label', etiqueta);
    pausa.setAttribute('title', etiqueta);
    pausa.innerHTML = icono + '<span class="rt-visually-hidden">' + etiqueta + '</span>';
  }

  anterior?.addEventListener('click', () => {
    mostrarDiapositiva(indiceActual - 1);
    reiniciarReproduccion();
  });
  siguiente?.addEventListener('click', () => {
    mostrarDiapositiva(indiceActual + 1);
    reiniciarReproduccion();
  });
  indicadores.forEach((indicador) => indicador.addEventListener('click', () => {
    mostrarDiapositiva(Number(indicador.dataset.carouselDot));
    reiniciarReproduccion();
  }));

  pausa?.addEventListener('click', () => {
    pausadoPorUsuario = !pausadoPorUsuario;
    actualizarBotonPausa();
    iniciarReproduccion();
  });

  carrusel.addEventListener('mouseenter', detenerReproduccion);
  carrusel.addEventListener('mouseleave', iniciarReproduccion);
  carrusel.addEventListener('focusin', detenerReproduccion);
  carrusel.addEventListener('focusout', () => window.setTimeout(iniciarReproduccion, 0));
  document.addEventListener('visibilitychange', () => document.hidden ? detenerReproduccion() : iniciarReproduccion());
  movimientoReducido.addEventListener('change', () => {
    if (movimientoReducido.matches) {
      pausadoPorUsuario = true;
      actualizarBotonPausa();
    }
    iniciarReproduccion();
  });

  mostrarDiapositiva(0);
  actualizarBotonPausa();
  iniciarReproduccion();
}

document.addEventListener('DOMContentLoaded', configurarCarruselRallyTraver);
