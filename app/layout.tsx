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
  title: {
    default: 'UnoDay - Focus on Your Daily Uno | Mindful Productivity Timer',
    template: '%s | UnoDay'
  },
  description: 'UnoDay helps you focus on one task at a time with mindful productivity tools. Zen-inspired pomodoro timer, distraction drawer, and daily focus tracking. Stay present, let go, achieve more.',
  keywords: [
    'focus app',
    'productivity tool',
    'pomodoro timer',
    'time management',
    'mindfulness productivity',
    'zen focus',
    'deep work timer',
    'distraction management',
    'daily task planner',
    'one task focus',
    'concentration app',
    'work timer',
    'focus timer',
    'productivity tracker',
    '专注应用',
    '番茄钟',
    '正念生产力'
  ],
  authors: [{ name: 'UnoDay Team' }],
  creator: 'UnoDay',
  publisher: 'UnoDay',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://unoday.app'),
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/en',
      'zh-CN': '/zh',
    },
  },
  openGraph: {
    title: 'UnoDay - Focus on Your Daily Uno',
    description: 'Mindful productivity app. One day, one task. Stay present in chaos.',
    url: 'https://unoday.app',
    siteName: 'UnoDay',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'UnoDay - Mindful Productivity Timer',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UnoDay - Focus on Your Daily Uno',
    description: 'Mindful productivity app. One day, one task. Stay present.',
    images: ['/og-image.png'],
    creator: '@unoday',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
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
