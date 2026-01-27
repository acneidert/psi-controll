import { createFileRoute } from '@tanstack/react-router'
import { auth } from '@/lib/auth'

export const Route = createFileRoute('/api/auth/$' as any)({
  server: {
    handlers: {
      GET: ({ request }) => {
        return auth.handler(request)
      },
      POST: ({ request }) => {
        return auth.handler(request)
      },
    },
  },
})