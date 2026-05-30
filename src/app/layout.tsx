import type { Metadata } from 'next';
import { Outfit, Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import { LanguageProvider } from '@/components/LanguageContext';
import { Locale, DEFAULT_LOCALE } from '@/lib/i18n';
import './globals.css';

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Oye AI | Empleado de IA para WhatsApp',
  description: 'Automatiza tus ventas, agenda citas y atiende clientes por WhatsApp con Inteligencia Artificial autónoma. Diseñado para negocios hispanos.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read cookie to avoid layout flash on load
  const cookieStore = await cookies();
  const langCookie = cookieStore.get('oye_lang')?.value as Locale;
  const initialLocale: Locale = langCookie || DEFAULT_LOCALE;

  return (
    <html
      lang={initialLocale}
      className={`${outfit.variable} ${inter.variable} dark antialiased h-full`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full bg-[#080b11] text-gray-100 flex flex-col font-sans">
        <LanguageProvider initialLocale={initialLocale}>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
