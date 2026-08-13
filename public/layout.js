// Global header & footer — single source of truth for all pages.
// Include on every page:  <script src="/layout.js" defer></script>
// Any existing <header> or <footer> content is replaced.
(function () {
  // ── Global polish CSS (tokens, feedback, entry, focus, reduced-motion) ──
  // Injected as a <style> so no extra network hop and no FOUC risk.
  var POLISH_CSS = [
    ':root{',
      '--ease-out:cubic-bezier(0.23,1,0.32,1);',
      '--ease-in-out:cubic-bezier(0.77,0,0.175,1);',
      '--ease-drawer:cubic-bezier(0.32,0.72,0,1);',
    '}',
    /* Press feedback: any button or button-like link. Subtle, GPU-only. */
    'button:not(:disabled),',
    'a[href][class*="rounded"]{',
      'transition:transform 160ms var(--ease-out),background-color 160ms var(--ease-out),box-shadow 160ms var(--ease-out),color 160ms var(--ease-out);',
    '}',
    'button:not(:disabled):active,',
    'a[href][class*="rounded"]:active{transform:scale(0.97);}',
    /* Focus-visible: consistent, high-contrast, keyboard only. */
    ':where(a,button,input,textarea,select,summary):focus-visible{',
      'outline:2px solid #2563eb;outline-offset:2px;border-radius:6px;',
    '}',
    /* Nav link underline sweep — subtle, hover-gated (desktop only). */
    '@media (hover:hover) and (pointer:fine){',
      'header nav a{position:relative;}',
      'header nav a::after{',
        'content:"";position:absolute;left:0;right:0;bottom:-2px;height:2px;',
        'background:currentColor;transform:scaleX(0);transform-origin:left center;',
        'transition:transform 200ms var(--ease-out);opacity:.6;',
      '}',
      'header nav a:hover::after{transform:scaleX(1);}',
    '}',
    /* Entry animation for progress/notify cards using @starting-style.
       Uses opacity + translate only — GPU-friendly, no layout thrash. */
    '#progress-section:not(.hidden),',
    '#duplicate-modal:not(.hidden){',
      'transition:opacity 260ms var(--ease-out),transform 260ms var(--ease-out);',
    '}',
    '@starting-style{',
      '#progress-section:not(.hidden),',
      '#duplicate-modal:not(.hidden){opacity:0;transform:translateY(8px);}',
    '}',
    /* Cookie banner slide-up entry (script sets it immediately, so a class-based
       entry works better than @starting-style here). */
    '#cookie-consent-banner{',
      'animation:cc-in 320ms var(--ease-out) both;',
    '}',
    '@keyframes cc-in{from{opacity:0;transform:translateY(100%);}to{opacity:1;transform:translateY(0);}}',
    /* Reduced motion: keep opacity/color hints, drop movement. */
    '@media (prefers-reduced-motion:reduce){',
      '*,*::before,*::after{',
        'animation-duration:.001ms!important;animation-iteration-count:1!important;',
        'transition-duration:200ms!important;',
      '}',
      'button:active,a:active{transform:none!important;}',
      '.float-anim,.pulse-ring:focus-within{animation:none!important;}',
    '}'
  ].join('');
  var style = document.createElement('style');
  style.id = 'polish-css';
  style.textContent = POLISH_CSS;
  (document.head || document.documentElement).appendChild(style);

  var path = (location.pathname || '/').replace(/\/+$/, '') || '/';
  function isActive(href) {
    if (href === '/') return path === '/';
    return path === href || path.indexOf(href + '/') === 0;
  }
  function navLink(href, label) {
    var cls = isActive(href) ? 'text-blue-600 font-medium' : 'hover:text-gray-800';
    return '<a href="' + href + '" class="' + cls + '">' + label + '</a>';
  }

  var headerHTML =
    '<div class="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">' +
      '<a href="/" class="flex-shrink-0" aria-label="WebCrawler.buzz home">' +
        '<picture>' +
          '<source type="image/webp" srcset="/webcrawler-logo-192.webp 1x, /webcrawler-logo-384.webp 2x">' +
          '<img src="/webcrawler-logo-192.png" srcset="/webcrawler-logo-384.png 2x" alt="WebCrawler.buzz — Free Online Web Crawler" class="h-8 sm:h-10">' +
        '</picture>' +
      '</a>' +
      '<nav class="text-sm text-gray-600 space-x-4" aria-label="Main navigation">' +
        navLink('/blogs', 'Blog') +
        navLink('/mcp', 'MCP') +
      '</nav>' +
    '</div>';

  var footerHTML =
    '<div class="flex flex-wrap justify-center items-center gap-4 mb-6">' +
      '<a href="https://www.producthunt.com/products/webcrawler-buzz/reviews/new?utm_source=badge-product_review&utm_medium=badge&utm_source=badge-webcrawler&#0045;buzz" target="_blank" rel="noopener noreferrer">' +
        '<img src="/ph-product-review.svg" alt="Review WebCrawler.buzz on Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" loading="lazy" />' +
      '</a>' +
      '<a href="https://www.producthunt.com/products/webcrawler-buzz?utm_source=badge-follow&utm_medium=badge&utm_source=badge-webcrawler&#0045;buzz" target="_blank" rel="noopener noreferrer">' +
        '<img src="/ph-follow.svg" alt="Follow WebCrawler.buzz on Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" loading="lazy" />' +
      '</a>' +
      '<a href="https://www.producthunt.com/products/webcrawler-buzz/launches/webcrawler-buzz?embed=true&amp;utm_source=badge-featured&amp;utm_medium=badge&amp;utm_campaign=badge-webcrawler-buzz" target="_blank" rel="noopener noreferrer">' +
        '<img alt="WebCrawler.buzz — Featured on Product Hunt" width="250" height="54" src="/ph-featured.svg" loading="lazy" />' +
      '</a>' +
    '</div>' +
    '&copy; 2026 Domain Crawler &middot; ' +
    '<a href="/about" class="hover:text-gray-800">About</a> &middot; ' +
    '<a href="/privacy-policy" class="hover:text-gray-800">Privacy Policy</a> &middot; ' +
    '<a href="/terms-of-service" class="hover:text-gray-800">Terms of Service</a> &middot; ' +
    '<a href="/cookie-policy" class="hover:text-gray-800">Cookie Policy</a>';

  function paint() {
    var header = document.querySelector('header');
    if (header) {
      header.className = 'bg-white shadow-sm';
      header.innerHTML = headerHTML;
    } else {
      var h = document.createElement('header');
      h.className = 'bg-white shadow-sm';
      h.innerHTML = headerHTML;
      document.body.insertBefore(h, document.body.firstChild);
    }

    var footer = document.querySelector('footer');
    if (footer) {
      footer.className = 'text-center text-gray-600 text-xs py-6';
      footer.innerHTML = footerHTML;
    } else {
      var f = document.createElement('footer');
      f.className = 'text-center text-gray-600 text-xs py-6';
      f.innerHTML = footerHTML;
      document.body.appendChild(f);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', paint);
  } else {
    paint();
  }
})();
