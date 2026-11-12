// Mejora progresiva sin dependencias: menú móvil, header que se oculta al
// bajar, popup/botón de WhatsApp y envío del formulario de contacto.
// Todo usa delegación de eventos en `document`, así sigue funcionando tras
// la navegación del lado del cliente de Next (el layout no se vuelve a
// montar, pero el contenido de <main> sí cambia).
const SCRIPT = `
(function () {
  if (window.__g3Enhanced) return; window.__g3Enhanced = true;
  var doc = document, root = doc.documentElement;
  function store(key, val) {
    try { return val === undefined ? sessionStorage.getItem(key) : sessionStorage.setItem(key, val); } catch (e) { return null; }
  }
  function closeMenu() {
    var m = doc.querySelector('details.mobile-menu');
    if (m && m.open) m.open = false;
  }

  // ---------- Menú móvil: se cierra al elegir opción, al tocar fuera o con Esc ----------
  doc.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('.menu-panel a')) { closeMenu(); return; }
    if (!t.closest('details.mobile-menu')) closeMenu();
  });

  // ---------- WhatsApp ----------
  function pop() { return doc.getElementById('wa-pop'); }
  function setPop(open) {
    var p = pop(), tg = doc.querySelector('[data-wa-toggle]');
    if (!p) return;
    p.hidden = !open;
    if (tg) tg.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) store('g3-wa-seen', '1');
  }
  doc.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('[data-wa-close]')) { setPop(false); return; }
    var tg = t.closest('[data-wa-toggle]');
    if (tg) {
      var p = pop();
      if (p && p.hidden) { e.preventDefault(); setPop(true); }
      else setPop(false);
    }
  });
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { setPop(false); closeMenu(); }
  });
  // Auto-abrir solo en pantallas amplias: en móvil un popup que tapa el
  // contenido estorba más de lo que ayuda (el botón flotante ya está visible).
  if (!store('g3-wa-seen') && window.matchMedia('(min-width: 768px)').matches) {
    setTimeout(function () { var p = pop(); if (p && p.hidden) setPop(true); }, 8000);
  }

  // ---------- Al hacer scroll: header que se oculta en móvil + botón WA ----------
  var lastY = window.scrollY, ticking = false;
  var narrow = window.matchMedia('(max-width: 767px)');
  function onScroll() {
    ticking = false;
    var y = window.scrollY, header = doc.querySelector('header.site');
    var menuOpen = doc.querySelector('details.mobile-menu[open]');
    if (header) {
      var hide = narrow.matches && !menuOpen && y > lastY && y > header.offsetHeight;
      header.classList.toggle('site--hidden', hide);
    }
    lastY = y;
    // El botón flotante se esconde mientras el formulario está en pantalla:
    // junto al formulario ya hay un enlace a WhatsApp y el botón taparía campos.
    var wa = doc.querySelector('.wa');
    if (wa) {
      var f = doc.querySelector('[data-contact-form]'), over = false;
      if (f) {
        var r = f.getBoundingClientRect();
        over = r.top < window.innerHeight && r.bottom > 0;
      }
      // En móvil el botón aparece tras el primer scroll para no tapar el hero.
      if (narrow.matches && y < 240) over = true;
      wa.classList.toggle('wa--away', over);
    }
  }
  requestAnimationFrame(onScroll);
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  // Tras navegar del lado del cliente, recalcular con el contenido nuevo.
  new MutationObserver(function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } })
    .observe(doc.querySelector('main') || doc.body, { childList: true, subtree: true });
  doc.addEventListener('focusin', function (e) {
    if (e.target.closest('[data-contact-form]')) { var wa = doc.querySelector('.wa'); if (wa) wa.classList.add('wa--away'); }
  });

  // ---------- Formulario de contacto ----------
  function say(form, msg, kind) {
    var s = form.querySelector('[data-form-status]');
    if (!s) return;
    s.textContent = msg;
    s.className = 'form__status' + (kind ? ' form__status--' + kind : '');
  }
  doc.addEventListener('submit', function (e) {
    var form = e.target.closest('[data-contact-form]');
    if (!form) return;
    e.preventDefault();
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      say(form, 'Revisa los campos marcados con *.', 'error');
      var bad = form.querySelector(':invalid');
      if (bad) bad.focus();
      return;
    }
    var data = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (el.name && el.value) data[el.name] = el.value.trim();
    });
    if (data.website) return; // honeypot
    var endpoint = form.getAttribute('data-endpoint');
    if (endpoint) {
      say(form, 'Enviando…');
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        form.reset(); form.classList.remove('was-validated');
        say(form, '¡Gracias! Recibimos tu solicitud y te contactaremos pronto.', 'ok');
      }).catch(function () {
        say(form, 'No pudimos enviar el formulario. Intenta de nuevo o escríbenos por WhatsApp.', 'error');
      });
      return;
    }
    var lines = [
      'Hola G3 Logistics, quiero cotizar un servicio.', '',
      'Nombre: ' + data.nombre,
      'Empresa: ' + data.empresa,
      'Correo: ' + data.correo,
      'Teléfono: ' + data.telefono,
      'Servicio: ' + data.servicio
    ];
    if (data.origen || data.destino) lines.push('Ruta: ' + (data.origen || '¿?') + ' → ' + (data.destino || '¿?'));
    if (data.carga) lines.push('Carga: ' + data.carga);
    if (data.frecuencia) lines.push('Frecuencia: ' + data.frecuencia);
    if (data.mensaje) lines.push('', data.mensaje);
    window.open('https://wa.me/' + form.getAttribute('data-wa') + '?text=' + encodeURIComponent(lines.join('\\n')), '_blank', 'noopener');
    form.classList.remove('was-validated');
    say(form, 'Abrimos WhatsApp con tu solicitud lista para enviar.', 'ok');
  });
})();
`;

export function Enhance() {
  return <script id="g3-enhance" dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
