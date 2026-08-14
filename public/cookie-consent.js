(function () {
  'use strict';

  var GA_ID = 'G-NE3SYMYFJF';
  var ADSENSE_ID = 'ca-pub-1290437932026379';
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
  // The element id must not match common ad/cookie-banner blocklists
  // (Brave shields, uBlock Origin easylist-cookie), which hide anything
  // matching #cookie*, #*consent*, .cookie-*. `wcb-notice-bar` sits outside
  // those patterns. Styles live in theme.css so the banner picks up light/dark
  // tokens automatically and looks like the rest of the site.
  function showBanner() {
    var existing = document.getElementById('wcb-notice-bar');
    if (existing) existing.remove();

    var banner = document.createElement('div');
    banner.id = 'wcb-notice-bar';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie preferences');
    banner.innerHTML =
      '<div class="wcb-notice-head">' +
        '<i data-lucide="cookie" aria-hidden="true"></i>' +
        '<span>Cookie preferences</span>' +
      '</div>' +
      '<p>' +
        'We use cookies for <strong>Google Analytics</strong> (anonymous usage stats) and ' +
        '<strong>Google AdSense</strong> (ads that help keep this tool free). ' +
        'Read more in our <a href="/cookie-policy">Cookie Policy</a>.' +
      '</p>' +
      '<div class="wcb-notice-actions">' +
        '<button type="button" id="cc-reject" class="btn btn-secondary">Reject</button>' +
        '<button type="button" id="cc-accept" class="btn">Accept</button>' +
      '</div>';

    document.body.appendChild(banner);
    if (window.lucide) window.lucide.createIcons();

    var rejectBtn = document.getElementById('cc-reject');
    var acceptBtn = document.getElementById('cc-accept');

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
