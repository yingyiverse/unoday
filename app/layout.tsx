import type { Metadata } from 'next'
import { Inter, Noto_Serif_SC } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/lib/language-context'
import DynamicTitle from '@/components/DynamicTitle'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const notoSerifSC = Noto_Serif_SC({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-noto-serif-sc'
})

export const metadata: Metadata = {
  title: 'UnoDay - Your Daily Uno',
  description: 'One day, one task. Find clarity in chaos.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="light snap-y snap-mandatory scroll-smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  if (localStorage.getItem('unoday_focus_mode') === 'true') {
                    document.documentElement.classList.add('focus-mode-active');
                    document.body && document.body.classList.add('focus-mode-active');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Bitcount+Grid+Single:wght@400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${inter.variable} ${notoSerifSC.variable} bg-background-light dark:bg-background-dark font-display text-text-light-primary dark:text-text-dark-primary antialiased`}
      >
        <LanguageProvider>
          <DynamicTitle />
          {children}
        </LanguageProvider>
        <div id="focus-ssr-overlay" className="fixed inset-0 z-40 opacity-0 pointer-events-none"></div>
      </body>
    </html>
  )
}
