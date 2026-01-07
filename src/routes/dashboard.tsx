import { Outlet, createFileRoute } from '@tanstack/react-router'
import { DashboardLayout } from '@/components/dashboard-layout'
import { authMiddleware } from '@/middleware/auth'



export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
   server: {
    middleware: [authMiddleware],
  },
})

function Dashboard() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  )
}
