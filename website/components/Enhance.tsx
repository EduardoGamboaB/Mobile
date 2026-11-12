// Mejora progresiva sin dependencias: popup de WhatsApp y envío del
// formulario de contacto. Va inline para que funcione igual en el sitio
// estático exportado y sin depender del runtime de React en el cliente.
const SCRIPT = `
(function () {
  function store(get, key, val) {
    try { return get ? sessionStorage.getItem(key) : sessionStorage.setItem(key, val); } catch (e) { return null; }
  }

  // ---------- WhatsApp popup ----------
  var pop = document.getElementById('wa-pop');
  var toggle = document.querySelector('[data-wa-toggle]');
  if (pop && toggle) {
    var open = function (v) {
      pop.hidden = !v;
      toggle.setAttribute('aria-expanded', v ? 'true' : 'false');
    };
    toggle.addEventListener('click', function (e) {
      if (pop.hidden) { e.preventDefault(); open(true); store(false, 'g3-wa-seen', '1'); }
      else { open(false); }
    });
    var close = pop.querySelector('[data-wa-close]');
    if (close) close.addEventListener('click', function () { open(false); store(false, 'g3-wa-seen', '1'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') open(false); });
    if (!store(true, 'g3-wa-seen')) {
      setTimeout(function () { if (pop.hidden) { open(true); store(false, 'g3-wa-seen', '1'); } }, 7000);
    }
  }

  // ---------- Formulario de contacto ----------
  var forms = document.querySelectorAll('[data-contact-form]');
  Array.prototype.forEach.call(forms, function (form) {
    var status = form.querySelector('[data-form-status]');
    var say = function (msg, kind) {
      if (!status) return;
      status.textContent = msg;
      status.className = 'form__status' + (kind ? ' form__status--' + kind : '');
    };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        var bad = form.querySelector(':invalid');
        say('Revisa los campos marcados con *.', 'error');
        if (bad) bad.focus();
        form.classList.add('was-validated');
        return;
      }
      var data = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (el.name && el.value) data[el.name] = el.value.trim();
      });
      if (data.website) return; // honeypot
      var endpoint = form.getAttribute('data-endpoint');
      if (endpoint) {
        say('Enviando…');
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(data)
        }).then(function (r) {
          if (!r.ok) throw new Error(r.status);
          form.reset(); form.classList.remove('was-validated');
          say('¡Gracias! Recibimos tu solicitud y te contactaremos pronto.', 'ok');
        }).catch(function () {
          say('No pudimos enviar el formulario. Intenta de nuevo o escríbenos por WhatsApp.', 'error');
        });
        return;
      }
      var lines = [
        'Hola G3 Logistics, quiero cotizar un servicio.',
        '',
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
      var url = 'https://wa.me/' + form.getAttribute('data-wa') + '?text=' + encodeURIComponent(lines.join('\\n'));
      window.open(url, '_blank', 'noopener');
      say('Abrimos WhatsApp con tu solicitud lista para enviar.', 'ok');
    });
  });
})();
`;

export function Enhance() {
  return <script id="g3-enhance" dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
