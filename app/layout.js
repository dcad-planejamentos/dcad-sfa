import './globals.css';
export const metadata = { title: 'SFA D-CAD', description: 'Painel do Sistema de Fatiamento Automático da D-CAD', robots: { index: false, follow: false },
  icons: { icon: '/icon.svg' }, manifest: '/manifest.webmanifest' };
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#000000' };
export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700;800&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
