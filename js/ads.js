/* ============================================================
   Google AdSense loader
   ------------------------------------------------------------
   HOW TO ACTIVATE (one line):
     1. Apply for AdSense:  https://adsense.google.com/start
     2. After approval you get a publisher id like  ca-pub-1234567890
     3. Paste it into PUBLISHER_ID below (keep the "ca-pub-" part).
     4. Each ad slot can optionally have a data-ad-slot="1234567890"
        value set in the HTML. Leave it out and we use a fallback
        id below — replace it once you create real ad units.

   Until PUBLISHER_ID is set, every slot renders a clearly-labeled
   placeholder box instead of ads. No broken layout, no fake ads.
   ============================================================ */
(function () {
  "use strict";

  // <--- put your publisher id here, e.g. "ca-pub-1234567890"
  var PUBLISHER_ID = "";

  // fallback ad unit id, used for any slot without data-ad-slot
  var DEFAULT_AD_SLOT = "1234567890";

  function isEnabled() {
    return /^ca-pub-/.test(PUBLISHER_ID);
  }

  function injectAdsenseScript() {
    if (document.querySelector('script[data-adslots-core]')) return;
    var s = document.createElement("script");
    s.async = true;
    s.setAttribute("data-adslots-core", "1");
    s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + PUBLISHER_ID;
    s.crossOrigin = "anonymous";
    document.head.appendChild(s);
  }

  function makePlaceholder(slot) {
    var isTall = slot.classList.contains("ad-slot--tall");
    var box = document.createElement("div");
    box.className = "ad-placeholder__box";
    box.innerHTML =
      '<span class="ad-placeholder__label">Google AdSense</span>' +
      '<span class="ad-placeholder__hint">' +
      (isTall ? "250×250 廣告位置" : "橫幅廣告位置") +
      " — 核准後自動顯示</span>";
    slot.appendChild(box);
  }

  function upgradeSlot(slot) {
    var adSlot = slot.getAttribute("data-ad-slot") || DEFAULT_AD_SLOT;
    var ins = document.createElement("ins");
    ins.className = "adsbygoogle";
    ins.style.display = "block";
    ins.setAttribute("data-ad-client", PUBLISHER_ID);
    ins.setAttribute("data-ad-slot", adSlot);
    ins.setAttribute("data-ad-format", "auto");
    ins.setAttribute("data-full-width-responsive", "true");
    slot.innerHTML = "";
    slot.appendChild(ins);
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      /* ignore — the adsense script may still be loading */
    }
  }

  function init() {
    var slots = document.querySelectorAll(".ad-slot");
    if (!slots.length) return;

    if (isEnabled()) {
      injectAdsenseScript();
      // give the adsense script a beat before pushing, if it's still loading
      slots.forEach(upgradeSlot);
    } else {
      slots.forEach(makePlaceholder);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
