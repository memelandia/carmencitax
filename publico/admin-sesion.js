/* admin-sesion v1 — el admin ahora tiene sesión validada en el servidor.
   - Guarda el token que devuelve /login y lo manda (Authorization: Bearer) en cada función.
   - Si el servidor responde 401, cierra la sesión y vuelve al login.
   - Agrega el botón "🔗 Link" junto a "Copiar" para mandar el enlace con el código ya cargado. */
(function () {
  var KEY = 'ruletaAdminToken';
  var original = window.fetch.bind(window);
  function leer(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function borrarSesion() {
    try { ['adminAuthenticated', 'adminUser', KEY].forEach(function (k) { sessionStorage.removeItem(k); }); } catch (e) { /* */ }
  }
  // Sesión vieja (antes del cambio) sin token: hay que volver a entrar
  if (leer('adminAuthenticated') && !leer(KEY)) borrarSesion();

  window.fetch = async function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var esFuncion = url.indexOf('/.netlify/functions/') !== -1 || url.indexOf('/api/') === 0;
    var esLogin = /\/login(\?|$)/.test(url);
    init = init || {};
    if (esFuncion && !esLogin) {
      var t = leer(KEY);
      if (t) {
        var h = new Headers(init.headers || {});
        h.set('Authorization', 'Bearer ' + t);
        init = Object.assign({}, init, { headers: h });
      }
    }
    var resp = await original(input, init);
    if (esFuncion && esLogin && resp.ok) {
      try { var j = await resp.clone().json(); if (j && j.token) sessionStorage.setItem(KEY, j.token); } catch (e) { /* */ }
    }
    if (esFuncion && !esLogin && resp.status === 401) {
      borrarSesion();
      if (!window.__avisoSesion) {
        window.__avisoSesion = true;
        alert('Tu sesión venció o no es válida. Volvé a iniciar sesión.');
        location.reload();
      }
    }
    return resp;
  };

  // Cerrar sesión también borra el token
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[onclick*="logout"], [onclick*="cerrarSesion"], #logoutBtn, .logout-btn');
    if (b) try { sessionStorage.removeItem(KEY); } catch (err) { /* */ }
  }, true);

  // Botón "🔗 Link" con el código precargado
  function copiar(texto, aviso) {
    var ok = function () { (window.mostrarNotificacion || alert)(aviso, 'success'); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(texto).then(ok, function () { prompt('Copiá el link:', texto); });
    } else { prompt('Copiá el link:', texto); }
  }
  function agregarBotones(raiz) {
    (raiz.querySelectorAll ? raiz : document).querySelectorAll('.copy-btn[data-codigo]').forEach(function (btn) {
      if (btn.nextElementSibling && btn.nextElementSibling.classList.contains('link-btn')) return;
      var codigo = btn.getAttribute('data-codigo');
      var nuevo = document.createElement('button');
      nuevo.type = 'button';
      nuevo.className = btn.className.replace('copy-btn', 'link-btn');
      nuevo.textContent = '🔗 Link';
      nuevo.title = 'Copiar el link con el código ya cargado';
      var cs = getComputedStyle(btn);
      nuevo.style.cssText = 'background:' + cs.background + ';color:' + cs.color + ';border:' + cs.border + ';border-radius:' + cs.borderRadius + ';padding:' + cs.padding + ';font:' + cs.font + ';cursor:pointer;';
      nuevo.addEventListener('click', function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        copiar(location.origin + '/?codigo=' + encodeURIComponent(codigo), 'Link del código "' + codigo + '" copiado.');
      });
      btn.insertAdjacentElement('afterend', nuevo);
    });
  }
  new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) if (muts[i].addedNodes.length) { agregarBotones(document); break; }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
