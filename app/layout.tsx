import type { Metadata } from 'next';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import Header from './components/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '麻雀スコア管理',
  description: '麻雀のスコアを管理するアプリケーション',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('jongreco.theme');if(!t){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}var r=document.documentElement;r.setAttribute('data-theme',t);r.setAttribute('data-bs-theme',t);}catch(e){}})();`,
          }}
        />
      </head>
      <body className={inter.className}>
        <Providers>
          <Header />
          <main>{children}</main>
        </Providers>
        <script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"
          async
        />
      </body>
    </html>
  );
} 