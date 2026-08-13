// WebCrawler.buzz — global layout + theme system.
// Injects theme.css, sets data-theme before paint, wires the toggle,
// and paints the site header + footer into every page.
(function () {
  // Pick up ?v= from our own script tag so bumping the version busts the CSS cache too.
  var ver = (document.currentScript && (document.currentScript.src.match(/[?&]v=([^&]+)/) || [])[1]) || '';
  var verQ = ver ? '?v=' + ver : '';

  // ── 1. Theme init (must happen before paint). ───────────────
  var THEME_KEY = 'theme';
  function currentTheme() {
    var saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  function applyTheme(t) { document.documentElement.setAttribute('data-theme', t); }
  applyTheme(currentTheme());

  // Load theme.css if not already present.
  if (!document.querySelector('link[data-theme-css]')) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/theme.css' + verQ;
    link.setAttribute('data-theme-css', '');
    document.head.appendChild(link);
  }

  // Load Lucide icon library (once, deferred).
  if (!document.querySelector('script[data-lucide-cdn]')) {
    var lucide = document.createElement('script');
    lucide.src = 'https://unpkg.com/lucide@latest/dist/umd/lucide.min.js';
    lucide.defer = true;
    lucide.setAttribute('data-lucide-cdn', '');
    lucide.onload = function () { if (window.lucide) window.lucide.createIcons(); };
    document.head.appendChild(lucide);
  }

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

  // ── 2. Header + footer. ─────────────────────────────────────
  var path = (location.pathname || '/').replace(/\/+$/, '') || '/';
  function isActive(href) {
    if (href === '/') return path === '/';
    return path === href || path.indexOf(href + '/') === 0;
  }
  function navLink(href, label) {
    return '<a href="' + href + '"' + (isActive(href) ? ' class="active"' : '') + '>' + label + '</a>';
  }

  // Brand mark uses Lucide `radar` — matches the crawler concept.
  var BRAND_MARK = '<i data-lucide="radar" class="brand-mark"></i>';

  var SUN_SVG = '<i data-lucide="sun" class="icon-sun"></i>';
  var MOON_SVG = '<i data-lucide="moon" class="icon-moon"></i>';

  var headerHTML =
    '<div class="inner">' +
      '<a href="/" class="brand" aria-label="WebCrawler.buzz home">' +
        BRAND_MARK +
        '<span>webcrawler</span>' +
      '</a>' +
      '<nav aria-label="Main navigation">' +
        navLink('/', 'Home') +
        navLink('/blogs', 'Blog') +
        navLink('/mcp', 'MCP') +
        navLink('/about', 'About') +
      '</nav>' +
      '<div class="actions">' +
        '<button id="theme-toggle" type="button" aria-label="Toggle theme">' +
          MOON_SVG + SUN_SVG +
        '</button>' +
      '</div>' +
    '</div>';

  var footerHTML =
    '<div class="inner">' +
      '<div class="badges">' +
        '<a href="https://www.producthunt.com/products/webcrawler-buzz/reviews/new?utm_source=badge-product_review&utm_medium=badge&utm_source=badge-webcrawler&#0045;buzz" target="_blank" rel="noopener noreferrer">' +
          '<img src="/ph-product-review.svg" alt="Review WebCrawler.buzz on Product Hunt" width="180" height="39" loading="lazy" />' +
        '</a>' +
        '<a href="https://www.producthunt.com/products/webcrawler-buzz?utm_source=badge-follow&utm_medium=badge&utm_source=badge-webcrawler&#0045;buzz" target="_blank" rel="noopener noreferrer">' +
          '<img src="/ph-follow.svg" alt="Follow WebCrawler.buzz on Product Hunt" width="180" height="39" loading="lazy" />' +
        '</a>' +
        '<a href="https://www.producthunt.com/products/webcrawler-buzz/launches/webcrawler-buzz?embed=true&amp;utm_source=badge-featured&amp;utm_medium=badge&amp;utm_campaign=badge-webcrawler-buzz" target="_blank" rel="noopener noreferrer">' +
          '<img src="/ph-featured.svg" alt="WebCrawler.buzz — Featured on Product Hunt" width="180" height="39" loading="lazy" />' +
        '</a>' +
      '</div>' +
      '<div class="links">' +
        '<span>&copy; 2026 WebCrawler.buzz</span>' +
        '<span aria-hidden="true">·</span>' +
        '<a href="/about">About</a>' +
        '<a href="/blogs">Blog</a>' +
        '<a href="/mcp">MCP</a>' +
        '<a href="/privacy-policy">Privacy</a>' +
        '<a href="/terms-of-service">Terms</a>' +
        '<a href="/cookie-policy">Cookies</a>' +
      '</div>' +
    '</div>';

  function paint() {
    var header = document.querySelector('header');
    if (header) {
      header.className = 'site-header';
      header.innerHTML = headerHTML;
    } else {
      var h = document.createElement('header');
      h.className = 'site-header';
      h.innerHTML = headerHTML;
      document.body.insertBefore(h, document.body.firstChild);
    }
    var footer = document.querySelector('footer');
    if (footer) {
      footer.className = 'site-footer';
      footer.innerHTML = footerHTML;
    } else {
      var f = document.createElement('footer');
      f.className = 'site-footer';
      f.innerHTML = footerHTML;
      document.body.appendChild(f);
    }
    // Wire the theme toggle (CSP blocks inline onclick handlers).
    var toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) toggleBtn.addEventListener('click', function () { window.ThemeToggle.toggle(); });
    // Re-render Lucide icons if the script is already loaded (in case paint runs late).
    if (window.lucide) window.lucide.createIcons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', paint);
  } else {
    paint();
  }
})();
