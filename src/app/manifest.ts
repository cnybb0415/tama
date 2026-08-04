import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Back Pocket',
    short_name: 'Back Pocket',
    description: 'Raise your EXO member',
    start_url: '/select',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      { src: '/picture/icon.png', sizes: '1254x1254', type: 'image/png', purpose: 'any' },
      { src: '/picture/icon.png', sizes: '1254x1254', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
