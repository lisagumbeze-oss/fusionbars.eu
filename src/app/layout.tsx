import type { Metadata, Viewport } from 'next';
import './globals.css';

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
  alternates: {
    canonical: 'https://fusionbars.eu',
    languages: {
      'en': 'https://fusionbars.eu/en',
      'de': 'https://fusionbars.eu/de',
      'fr': 'https://fusionbars.eu/fr',
      'es': 'https://fusionbars.eu/es',
      'it': 'https://fusionbars.eu/it',
      'nl': 'https://fusionbars.eu/nl',
    },
  },
  openGraph: {
    title: 'Fusion Mushroom Bars EU | Gourmet Artisan Botanical Chocolates',
    description:
      'Gourmet Belgian couverture chocolate bars and vegan fruit pectin gummies infused with certified European functional botanicals. Discreet dispatch from NL, ES, DE, FR.',
    url: 'https://fusionbars.eu',
    siteName: 'Fusion Mushroom Bars EU',
    locale: 'en_EU',
    type: 'website',
    images: [
      {
        url: 'https://fusionbars.eu/images/products/chocolate-bar.png',
        width: 1200,
        height: 630,
        alt: 'Fusion Mushroom Bars EU - Artisan European Confections',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fusion Mushroom Bars EU | European Botanical Confections',
    description:
      'Gourmet Belgian chocolate bars, fruit pectin gummies, and collector boxes with discreet European courier delivery.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#FBFBF9] text-[#121212] antialiased min-h-screen selection:bg-[#4A5D4E] selection:text-white">
        {children}
      </body>
    </html>
  );
}
