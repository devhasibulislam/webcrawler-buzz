// WebCrawler.buzz — theme + toggle + active-nav + Lucide bootstrap.
// Header + footer + theme.css link are baked into every HTML page,
// so this script does NOT rearrange any layout — it only wires interactions.
(function () {
  // ── 1. Theme init (must happen before paint). ───────────────
  var THEME_KEY = 'theme';
  function currentTheme() {
    var saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  function applyTheme(t) { document.documentElement.setAttribute('data-theme', t); }
  applyTheme(currentTheme());

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      if (!localStorage.getItem(THEME_KEY)) applyTheme(e.matches ? 'dark' : 'light');
    });
  }

  window.ThemeToggle = {
    set: function (t) { localStorage.setItem(THEME_KEY, t); applyTheme(t); },
    toggle: function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      this.set(next);
    }
  };

  // ── 2. Wire up header interactions once DOM is ready. ────────
  function wire() {
    var path = (location.pathname || '/').replace(/\/+$/, '') || '/';
    var links = document.querySelectorAll('header.site-header nav a');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href');
      var active = href === '/' ? path === '/' : path === href || path.indexOf(href + '/') === 0;
      if (active) links[i].classList.add('active');
    }
    var toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) toggleBtn.addEventListener('click', function () { window.ThemeToggle.toggle(); });

    // Mobile menu open/close.
    var menuBtn = document.getElementById('menu-toggle');
    var nav = document.getElementById('site-nav');
    if (menuBtn && nav) {
      menuBtn.addEventListener('click', function () {
        var open = nav.classList.toggle('open');
        menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      });
      // Close on link click so navigating within-page still collapses the menu.
      for (var j = 0; j < links.length; j++) {
        links[j].addEventListener('click', function () {
          nav.classList.remove('open');
          menuBtn.setAttribute('aria-expanded', 'false');
          menuBtn.setAttribute('aria-label', 'Open menu');
        });
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }

  // ── 3. Lucide icon library (once, deferred). ─────────────────
  if (!document.querySelector('script[data-lucide-cdn]')) {
    var lucide = document.createElement('script');
    lucide.src = 'https://unpkg.com/lucide@latest/dist/umd/lucide.min.js';
    lucide.defer = true;
    lucide.setAttribute('data-lucide-cdn', '');
    lucide.onload = function () { if (window.lucide) window.lucide.createIcons(); };
    document.head.appendChild(lucide);
  }
})();
