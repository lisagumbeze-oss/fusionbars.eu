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
    _smartsupp.offsetY = window.matchMedia("(max-width: 1023px)").matches ? 96 : 24;
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
  `;

  return (
    <Script id="smartsupp-chat" strategy="afterInteractive">
      {bootstrap}
    </Script>
  );
}
