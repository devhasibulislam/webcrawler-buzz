(function () {
  'use strict';

  var GA_ID = 'G-NE3SYMYFJF';
  // TODO: replace with your real AdSense publisher ID once approved (format: ca-pub-XXXXXXXXXXXXXXXX)
  var ADSENSE_ID = 'ca-pub-XXXXXXXXXXXXXXXX';
  var CONSENT_KEY = 'cookie_consent';

  // ── Consent state ──────────────────────────────────────────────
  var consent = localStorage.getItem(CONSENT_KEY);

  if (consent === 'accepted') {
    loadGA();
    loadAds();
  }

  if (!consent) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner);
    } else {
      showBanner();
    }
  }

  function fireChange() {
    try { window.dispatchEvent(new CustomEvent('cookieconsentchange')); } catch (e) {}
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
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
      var name = cookies[i].split('=')[0].trim();
      if (name.indexOf('_ga') === 0) {
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + location.hostname;
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.' + location.hostname;
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
      }
    }
    var gaScript = document.getElementById('ga-script');
    if (gaScript) gaScript.remove();
    window.dataLayer = [];
  }

  // ── Load Google AdSense (only after consent) ───────────────────
  function loadAds() {
    if (!ADSENSE_ID || ADSENSE_ID.indexOf('XXXX') !== -1) return; // not configured yet
    if (document.getElementById('adsense-script')) return;

    var s = document.createElement('script');
    s.id = 'adsense-script';
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + ADSENSE_ID;
    document.head.appendChild(s);
  }

  // ── Remove AdSense cookies + script on rejection ───────────────
  function removeAds() {
    var adCookieNames = ['__gads', '__gpi', '__eoi', 'IDE', 'DSID', 'FLC', 'AID', 'TAID'];
    for (var i = 0; i < adCookieNames.length; i++) {
      var name = adCookieNames[i];
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + location.hostname;
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.' + location.hostname;
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
    }
    var adScript = document.getElementById('adsense-script');
    if (adScript) adScript.remove();
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
      '<div style="flex:1;min-width:240px;background:#1f2937;color:#f3f4f6;">' +
        '<p style="margin:0;color:#f3f4f6;background:#1f2937;">' +
          'We use cookies for <strong style="color:#ffffff;background:#1f2937;">Google Analytics</strong> (anonymous usage stats) and <strong style="color:#ffffff;background:#1f2937;">Google AdSense</strong> (ads that help keep this tool free). ' +
          'You can accept, reject, or read more in our ' +
          '<a href="/cookie-policy" style="color:#93c5fd;background:#1f2937;text-decoration:underline;">Cookie Policy</a>.' +
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

    var rejectBtn = document.getElementById('cc-reject');
    var acceptBtn = document.getElementById('cc-accept');

    rejectBtn.addEventListener('mouseenter', function () { this.style.background = '#374151'; });
    rejectBtn.addEventListener('mouseleave', function () { this.style.background = 'transparent'; });
    acceptBtn.addEventListener('mouseenter', function () { this.style.background = '#1d4ed8'; });
    acceptBtn.addEventListener('mouseleave', function () { this.style.background = '#2563eb'; });

    acceptBtn.addEventListener('click', function () {
      localStorage.setItem(CONSENT_KEY, 'accepted');
      banner.remove();
      loadGA();
      loadAds();
      fireChange();
    });

    rejectBtn.addEventListener('click', function () {
      localStorage.setItem(CONSENT_KEY, 'rejected');
      banner.remove();
      removeGA();
      removeAds();
      fireChange();
    });
  }

  window.CookieConsent = {
    reset: function () {
      localStorage.removeItem(CONSENT_KEY);
      removeGA();
      removeAds();
      fireChange();
      showBanner();
    },
    getStatus: function () {
      return localStorage.getItem(CONSENT_KEY);
    }
  };
})();
