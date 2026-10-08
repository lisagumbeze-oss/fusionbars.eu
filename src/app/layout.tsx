import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import Script from 'next/script';
import './globals.css';
import ScrollToTop from '@/components/ScrollToTop';
import { INDEXABLE_LOCALE } from '@/lib/search-indexing';
import { OG_IMAGE } from '@/lib/page-metadata';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FBFBF9',
};

export const metadata: Metadata = {
  title: 'Fusion Mushroom Bars EU | European Artisan Botanical Confections',
  description:
    'Official European storefront for Fusion Mushroom Bars. Gourmet Belgian couverture chocolate bars, fruit pectin gummies, and curator boxes. Temperature-controlled discreet European dispatch from NL, ES, DE, FR.',
  metadataBase: new URL('https://fusionbars.eu'),
  openGraph: {
    title: 'Fusion Mushroom Bars EU | Gourmet Artisan Botanical Chocolates',
    description:
      'Gourmet Belgian couverture chocolate bars and vegan fruit pectin gummies infused with certified European functional botanicals. Discreet dispatch from NL, ES, DE, FR.',
    url: 'https://fusionbars.eu/en',
    siteName: 'Fusion Mushroom Bars EU',
    locale: 'en_EU',
    type: 'website',
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fusion Mushroom Bars EU | European Botanical Confections',
    description:
      'Gourmet Belgian chocolate bars, fruit pectin gummies, and collector boxes with discreet European courier delivery.',
    images: [OG_IMAGE.url],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const requested = headerList.get('x-locale') || INDEXABLE_LOCALE;
  const lang = ['en', 'de', 'fr', 'es', 'it', 'nl'].includes(requested) ? requested : INDEXABLE_LOCALE;

  return (
    <html lang={lang}>
      <body className="bg-[#FBFBF9] text-[#121212] antialiased min-h-screen selection:bg-[#4A5D4E] selection:text-white">
        <Script id="scroll-restoration" strategy="beforeInteractive">
          {`if('scrollRestoration' in history){history.scrollRestoration='manual';}window.scrollTo(0,0);`}
        </Script>
        <ScrollToTop />
        {children}
      </body>
    </html>
  );
}
