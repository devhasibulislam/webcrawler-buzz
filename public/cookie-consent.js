(function () {
  'use strict';

  var GA_ID = 'G-NE3SYMYFJF';
  var CONSENT_KEY = 'cookie_consent';

  // ── Consent state ──────────────────────────────────────────────
  var consent = localStorage.getItem(CONSENT_KEY);

  if (consent === 'accepted') {
    loadGA();
  }

  // Show banner only when no choice has been made
  if (!consent) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner);
    } else {
      showBanner();
    }
  }

  // ── Load Google Analytics 4 ────────────────────────────────────
  function loadGA() {
    if (document.getElementById('ga-script')) return;

    var s = document.createElement('script');
    s.id = 'ga-script';
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID);
  }

  // ── Remove GA cookies + script on rejection ────────────────────
  function removeGA() {
    // Delete known GA cookies
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
      var name = cookies[i].split('=')[0].trim();
      if (name.indexOf('_ga') === 0) {
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + location.hostname;
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.' + location.hostname;
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
      }
    }

    // Remove GA script if loaded
    var gaScript = document.getElementById('ga-script');
    if (gaScript) gaScript.remove();

    // Clear dataLayer
    window.dataLayer = [];
  }

  // ── Cookie consent banner ──────────────────────────────────────
  function showBanner() {
    var banner = document.createElement('div');
    banner.id = 'cookie-consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.style.cssText =
      'position:fixed;bottom:0;left:0;right:0;z-index:9999;' +
      'background:#1f2937;color:#f3f4f6;' +
      'padding:16px 24px;' +
      'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;' +
      'box-shadow:0 -4px 12px rgba(0,0,0,0.15);' +
      'font-family:Google Sans,system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.5;';

    banner.innerHTML =
      '<div style="flex:1;min-width:240px;">' +
        '<p style="margin:0;">' +
          'We use <strong>Google Analytics</strong> to understand how visitors use our site — anonymous page-view stats only, no personal profiling. ' +
          '<a href="/cookie-policy" style="color:#93c5fd;text-decoration:underline;">Cookie Policy</a>' +
        '</p>' +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-shrink:0;">' +
        '<button id="cc-reject" style="' +
          'padding:8px 20px;background:transparent;border:1px solid #6b7280;color:#f3f4f6;' +
          'border-radius:8px;cursor:pointer;font-size:14px;font-family:inherit;transition:background .15s;' +
        '">Reject</button>' +
        '<button id="cc-accept" style="' +
          'padding:8px 20px;background:#2563eb;border:none;color:#fff;' +
          'border-radius:8px;cursor:pointer;font-size:14px;font-family:inherit;transition:background .15s;' +
        '">Accept</button>' +
      '</div>';

    document.body.appendChild(banner);

    // Hover effects
    var rejectBtn = document.getElementById('cc-reject');
    var acceptBtn = document.getElementById('cc-accept');

    rejectBtn.addEventListener('mouseenter', function () { this.style.background = '#374151'; });
    rejectBtn.addEventListener('mouseleave', function () { this.style.background = 'transparent'; });
    acceptBtn.addEventListener('mouseenter', function () { this.style.background = '#1d4ed8'; });
    acceptBtn.addEventListener('mouseleave', function () { this.style.background = '#2563eb'; });

    // Accept
    acceptBtn.addEventListener('click', function () {
      localStorage.setItem(CONSENT_KEY, 'accepted');
      banner.remove();
      loadGA();
    });

    // Reject
    rejectBtn.addEventListener('click', function () {
      localStorage.setItem(CONSENT_KEY, 'rejected');
      banner.remove();
      removeGA();
    });
  }

  // ── Expose helper so the cookie-policy page can offer a "manage" button ──
  window.CookieConsent = {
    reset: function () {
      localStorage.removeItem(CONSENT_KEY);
      removeGA();
      showBanner();
    },
    getStatus: function () {
      return localStorage.getItem(CONSENT_KEY); // 'accepted' | 'rejected' | null
    }
  };
})();
