import { Outlet, createFileRoute } from '@tanstack/react-router'
import { authMiddleware } from '@/middleware/auth'

export const Route = createFileRoute('/print' as any)({
  component: RouteComponent,
   server: {
      middleware: [authMiddleware],
    },
})

function RouteComponent() {
  return <Outlet />
}
