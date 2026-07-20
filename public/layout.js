// Global header & footer — single source of truth for all pages.
// Include on every page:  <script src="/layout.js" defer></script>
// Any existing <header> or <footer> content is replaced.
(function () {
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
          '<img src="/webcrawler-logo-192.png" srcset="/webcrawler-logo-384.png 2x" alt="WebCrawler.buzz — Free Online Web Crawler" class="h-8 sm:h-10" width="192" height="40">' +
        '</picture>' +
      '</a>' +
      '<nav class="text-xs sm:text-sm text-gray-600 space-x-3 sm:space-x-4" aria-label="Main navigation">' +
        navLink('/', 'Home') +
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
    '<a href="/" class="hover:text-gray-800">Home</a> &middot; ' +
    '<a href="/about" class="hover:text-gray-800">About</a> &middot; ' +
    '<a href="/mcp" class="hover:text-gray-800">MCP</a> &middot; ' +
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
