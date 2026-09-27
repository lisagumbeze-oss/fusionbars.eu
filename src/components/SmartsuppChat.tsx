'use client';

import Script from 'next/script';

/**
 * Smartsupp live chat. The bubble stays on the right.
 * The back-to-top control is placed on the opposite side.
 * Offset clears the mobile bottom navigation.
 */
export default function SmartsuppChat() {
  const key = process.env.NEXT_PUBLIC_SMARTSUPP_KEY?.trim();
  if (!key) return null;

  const bootstrap = `
    var _smartsupp = window._smartsupp || {};
    _smartsupp.key = ${JSON.stringify(key)};
    _smartsupp.orientation = "right";
    _smartsupp.offsetX = 16;
    _smartsupp.offsetY = window.matchMedia("(max-width: 1023px)").matches ? 88 : 24;
    window._smartsupp = _smartsupp;
    window.smartsupp || (function (d) {
      var s, c, o = smartsupp = function () { o._.push(arguments); };
      o._ = [];
      s = d.getElementsByTagName("script")[0];
      c = d.createElement("script");
      c.type = "text/javascript";
      c.charset = "utf-8";
      c.async = true;
      c.src = "https://www.smartsuppchat.com/loader.js?";
      s.parentNode.insertBefore(c, s);
    })(document);

    (function () {
      var style = document.createElement("style");
      style.id = "smartsupp-mobile-offset";
      style.textContent = "";
      document.head.appendChild(style);

      function liftChat() {
        var mobile = window.matchMedia("(max-width: 1023px)").matches;
        var nav = document.querySelector("nav[aria-label='Mobile primary navigation']");
        var lift = mobile && nav;
        style.textContent = lift
          ? "#widgetButtonFrame { bottom: calc(var(--mobile-bottom-nav-height, 4rem) + env(safe-area-inset-bottom, 0px) + 12px) !important; }"
          : "";
        var frame = document.getElementById("widgetButtonFrame");
        if (!frame) return;
        if (lift) frame.style.setProperty("bottom", "calc(var(--mobile-bottom-nav-height, 4rem) + env(safe-area-inset-bottom, 0px) + 12px)", "important");
        else frame.style.removeProperty("bottom");
      }

      var attempts = 0;
      var timer = window.setInterval(function () {
        liftChat();
        attempts += 1;
        if (attempts > 20) window.clearInterval(timer);
      }, 500);
      window.addEventListener("resize", liftChat);
    })();
  `;

  return (
    <Script id="smartsupp-chat" strategy="afterInteractive">
      {bootstrap}
    </Script>
  );
}
