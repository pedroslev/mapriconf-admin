import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: false,
  },
  // Proxy to local API only when no external API URL is configured (e.g. tunnel sessions)
  ...(!process.env.NEXT_PUBLIC_API_URL && {
    async rewrites() {
      return [
        {
          source: '/api/:path*',
          destination: 'http://127.0.0.1:3001/api/:path*',
        },
      ]
    },
  }),
}

export default nextConfig
