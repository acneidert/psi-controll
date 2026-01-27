import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  Banknote,
  Calendar,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)
  const { data: session } = authClient.useSession()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await authClient.signOut()
    navigate({ to: '/login' })
  }

  const UserSection = () => (
    <div className="mt-auto p-4 border-t">
      <div className="flex items-center justify-between gap-2 px-2 py-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">
              {session?.user?.name?.substring(0, 2).toUpperCase() || 'US'}
            </span>
          </div>
          <div className="flex flex-col truncate max-w-[120px]">
            <span className="text-sm font-medium text-foreground truncate">
              {session?.user?.name || 'Usuário'}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {session?.user?.email || ''}
            </span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )


  return (
    <div className="flex h-screen w-full bg-background">
      {/* Sidebar - Desktop */}
      <aside className="hidden w-64 flex-col border-r bg-muted/40 md:flex">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <LayoutDashboard className="h-6 w-6" />
            <span className="">PsiControl</span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            <Link
              to="/dashboard"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary [&.active]:bg-muted [&.active]:text-primary"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              to="/dashboard/agenda"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary [&.active]:bg-muted [&.active]:text-primary"
            >
              <Calendar className="h-4 w-4" />
              Agenda
            </Link>
            <Link
              to="/dashboard/pacientes"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary [&.active]:bg-muted [&.active]:text-primary"
            >
              <Users className="h-4 w-4" />
              Pacientes
            </Link>
            <Link
              to="/dashboard/financeiro"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary [&.active]:bg-muted [&.active]:text-primary"
            >
              <Banknote className="h-4 w-4" />
              Financeiro
            </Link>
           
            <Link
              to="/dashboard/settings"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary [&.active]:bg-muted [&.active]:text-primary"
            >
              <Settings className="h-4 w-4" />
              Configurações
            </Link>
          </nav>
        </div>
        <UserSection />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <aside className="fixed inset-y-0 left-0 z-50 w-64 flex-col border-r bg-background md:hidden">
          <div className="flex h-14 items-center border-b px-4">
            <Link to="/" className="flex items-center gap-2 font-semibold">
              <LayoutDashboard className="h-6 w-6" />
              <span>PsiControl</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto"
              onClick={() => setIsSidebarOpen(false)}
            >
              <span className="sr-only">Close</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </Button>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <nav className="grid items-start px-2 text-sm font-medium">
              <Link
                to="/dashboard"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary [&.active]:bg-muted [&.active]:text-primary"
                onClick={() => setIsSidebarOpen(false)}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                to="/dashboard/agenda"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary [&.active]:bg-muted [&.active]:text-primary"
                onClick={() => setIsSidebarOpen(false)}
              >
                <Calendar className="h-4 w-4" />
                Agenda
              </Link>
              <Link
                to="/dashboard/users"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary [&.active]:bg-muted [&.active]:text-primary"
                onClick={() => setIsSidebarOpen(false)}
              >
                <Users className="h-4 w-4" />
                Pacientes
              </Link>
              <Link
                to="/dashboard/settings"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary [&.active]:bg-muted [&.active]:text-primary"
                onClick={() => setIsSidebarOpen(false)}
              >
                <Settings className="h-4 w-4" />
                Configurações
              </Link>
            </nav>
          </div>
          <UserSection />
        </aside>
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1">
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
