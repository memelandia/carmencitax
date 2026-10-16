/* ruleta-servidor v1 — el giro lo decide el servidor (PostgreSQL), no el navegador.
   - __girarEnServidor(): pide el giro con un requestId único; si se corta la conexión reintenta con el MISMO id
     (el servidor no descuenta dos veces). Si falla del todo, el id queda guardado y el próximo clic lo reutiliza.
   - __historialDesdeServidor(data): el historial de premios viene del servidor (sobrevive a recargas y a otros
     dispositivos). Los códigos que ya habían girado antes de la migración conservan lo del navegador.
   - Enlaces con código: /?codigo=XXXX valida solo. */
(function () {
  var EN = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
  var TXT = EN
    ? { conexion: 'Connection error. Please check your internet and try again.' }
    : { conexion: 'Error de conexión. Revisá tu internet e intentá de nuevo.' };

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }
  function clavePendiente() { return 'giro_pendiente_' + codigoActual; }
  function leer(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function guardar(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { /* modo privado */ } }
  var espera = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  window.__girarEnServidor = async function () {
    var id = leer(clavePendiente());
    if (!id) { id = uuid(); guardar(clavePendiente(), id); }
    for (var i = 0; i < 4; i++) {
      try {
        var r = await fetch('/.netlify/functions/girar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codigoId: codigoActual, requestId: id, excluir: window.__ganadosPrevios || [] }),
        });
        if (r.status >= 500) throw new Error('HTTP ' + r.status);
        var j = await r.json();
        guardar(clavePendiente(), null);
        return j;
      } catch (e) {
        await espera(700 * (i + 1));
      }
    }
    return { success: false, error: 'conexion', message: TXT.conexion };
  };

  window.__giroFallido = function (res) {
    try { soundSpin.pause(); soundSpin.currentTime = 0; } catch (e) { /* sin sonido */ }
    var b = document.getElementById('girarBtn');
    var notificar = window.mostrarNotificacion || window.showNotification;
    var mensaje = window.mostrarMensaje || window.showMessage;
    var msg = (res && res.message) || TXT.conexion;
    var err = res && res.error;
    if (err === 'sin_tiradas' || err === 'no_encontrado') { try { tiradasRestantes = 0; } catch (e) { /* */ } }
    if (b) {
      b.disabled = err === 'sin_tiradas' || err === 'todos_ganados' || err === 'no_encontrado';
      if (window.__labelGirar) b.textContent = window.__labelGirar;
    }
    if (notificar) notificar(msg, err === 'todos_ganados' ? 'success' : 'error');
    if (mensaje) mensaje((err === 'todos_ganados' ? '🎉 ' : '❌ ') + msg);
  };

  window.__historialDesdeServidor = function (d) {
    window.__historialServidor = null; window.__ganadosPrevios = [];
    // al validar, el historial del servidor ya incluye cualquier giro que se haya cortado: no reusar ese id
    guardar(clavePendiente(), null);
    try {
      var k = 'historial_' + codigoActual;
      var local = [];
      try { local = JSON.parse(localStorage.getItem(k) || '[]') || []; } catch (e) { local = []; }
      var premiosCodigo = (d && d.premios) || [];
      var fmt = function (ts) {
        return new Date(ts).toLocaleString(EN ? 'en-US' : 'es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      };
      var lista = ((d && d.historial) || []).map(function (h) { return { nombre: h.nombre, fecha: fmt(h.timestamp), timestamp: h.timestamp }; });
      if (d && d.ganadosPrevios > 0) {
        var previos = local.filter(function (x) { return x && premiosCodigo.indexOf(x.nombre) !== -1; }).slice(0, d.ganadosPrevios);
        window.__ganadosPrevios = previos.map(function (x) { return x.nombre; });
        previos.forEach(function (x) {
          if (!lista.some(function (y) { return y.nombre === x.nombre; })) lista.push({ nombre: x.nombre, fecha: x.fecha || fmt(x.timestamp || Date.now()), timestamp: x.timestamp || 0 });
        });
      }
      lista.sort(function (a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });
      lista.forEach(function (x, i) { x.id = lista.length - i; });
      window.__historialServidor = lista;
      try { localStorage.setItem(k, JSON.stringify(lista)); } catch (e) { /* modo privado: queda en memoria */ }
    } catch (e) { console.error('historial', e); }
  };

  // Los sonidos sin interacción previa (p. ej. al validar desde un link) rechazan play(): no es un error real.
  var playOriginal = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    var p = playOriginal.apply(this, arguments);
    if (p && typeof p.catch === 'function') p.catch(function () { /* autoplay bloqueado */ });
    return p;
  };

  // mismo texto que la página pone en el botón después de cada giro
  window.__labelGirar = EN ? '✨ Spin the Wheel ✨' : '✨ Girar Ruleta ✨';

  function alCargar() {
    var p = new URLSearchParams(location.search);
    var c = (p.get('codigo') || p.get('code') || '').trim();
    if (!c) return;
    var validar = window.validarCodigo || window.validateCode;
    var n = 0;
    (function intentar() {
      var listos = false;
      try { listos = Array.isArray(premiosDisponibles) && premiosDisponibles.length > 0; } catch (e) { listos = false; }
      if (listos || n++ > 60) {
        // la página reconstruye el formulario al cargar: se busca el campo recién al validar
        setTimeout(function () {
          var input = document.getElementById('codigo');
          if (!input || input.disabled || typeof validar !== 'function') return;
          input.value = c.toUpperCase();
          validar();
        }, 300);
      } else setTimeout(intentar, 150);
    })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', alCargar); else alCargar();
})();
