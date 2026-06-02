import './globals.css';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'OYE AI - Never miss another WhatsApp customer',
  description: 'The AI assistant that handles your WhatsApp messages 24/7. Automate support, capture leads, and book appointments.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white">{children}</body>
    </html>
  );
}