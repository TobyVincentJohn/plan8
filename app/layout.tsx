import './globals.css';
import type { Metadata } from 'next';
import localFont from 'next/font/local';

// Local font configuration - you can upload your font files to public/fonts/
const customFont = localFont({
  src: [
    {
      path: '../public/fonts/font-regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/font-medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../public/fonts/font-semibold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../public/fonts/font-bold.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../public/fonts/font-extrabold.woff2',
      weight: '800',
      style: 'normal',
    },
  ],
  variable: '--font-custom',
  fallback: ['system-ui', 'arial'],
});

export const metadata: Metadata = {
  title: 'a2b.ai - Collaborative Travel Planning',
  description: 'Trips made social, plans made easy. Plan your perfect journey with friends and family.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${customFont.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}