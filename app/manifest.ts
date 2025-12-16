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
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    categories: ['productivity', 'lifestyle', 'utilities'],
    lang: 'en-US',
    orientation: 'portrait',
  }
}
