import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'UnoDay - Mindful Productivity Timer',
    short_name: 'UnoDay',
    description: 'Focus on one task at a time with zen-inspired productivity tools',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    categories: ['productivity', 'lifestyle', 'utilities'],
    lang: 'en-US',
    orientation: 'portrait',
  }
}
