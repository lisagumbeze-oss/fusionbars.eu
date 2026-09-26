/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Host/www redirects are owned by Vercel Domains only.
  // Keeping a www↔apex redirect here caused ERR_TOO_MANY_REDIRECTS when Vercel
  // redirected the opposite direction.
  async redirects() {
    return [
      {
        source: '/track',
        destination: '/en/orders/lookup',
        permanent: true,
      },
      {
        source: '/admin/:path*',
        destination: '/en/admin/:path*',
        permanent: false,
      },
      {
        source: '/:locale(en|de|fr|es|it|nl)/track',
        destination: '/:locale/orders/lookup',
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      // Global Hardened Production Security Headers
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https: ws: wss:; frame-ancestors 'self' https:;",
          },
        ],
      },
      // Strict No-Index for Administrative, Account, Cart, Checkout, and API routes
      {
        source: '/:locale(en|de|fr|es|it|nl)?/(admin|account|cart|checkout|orders|track|api)/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' },
        ],
      },
      {
        source: '/(admin|account|cart|checkout|orders|track|api)/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' },
        ],
      },
    ];
  },
};

export default nextConfig;
