import { createFileRoute, Link } from '@tanstack/react-router'
import { Activity, Calendar, DollarSign, Users, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useServerFn } from '@tanstack/react-start'
import { getDashboardStatsFn, getRecentConsultationsFn } from '@/server/functions/dashboard'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const Route = createFileRoute('/dashboard/')({
  component: DashboardIndex,
})

function DashboardIndex() {
  const getStats = useServerFn(getDashboardStatsFn)
  const getRecentConsultations = useServerFn(getRecentConsultationsFn)

  const [stats, setStats] = useState({
    totalPatients: 0,
    consultationsToday: 0,
    activePatients: 0,
    revenueMonth: 0,
  })
  const [recentConsultations, setRecentConsultations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, recentData] = await Promise.all([
          getStats(),
          getRecentConsultations(),
        ])
        setStats(statsData)
        setRecentConsultations(recentData)
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Dashboard</h1>
        <Button asChild>
          <Link to="/dashboard/agenda">Novo Agendamento</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Pacientes
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats.totalPatients}
            </div>
            <p className="text-xs text-muted-foreground">
              Base de pacientes cadastrados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Consultas Hoje
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats.consultationsToday}
            </div>
            <p className="text-xs text-muted-foreground">
              Agendadas para hoje
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pacientes Ativos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats.activePatients}
            </div>
            <p className="text-xs text-muted-foreground">
              Com agendamentos ativos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : formatCurrency(stats.revenueMonth)}
            </div>
            <p className="text-xs text-muted-foreground">
              Faturado neste mês
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Próximas Consultas</CardTitle>
              <CardDescription>
                Seus próximos atendimentos agendados.
              </CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1">
              <Link to="/dashboard/agenda">
                Ver Agenda
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {loading ? (
                <div className="text-center py-4 text-muted-foreground">Carregando...</div>
              ) : recentConsultations.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  Nenhuma consulta próxima agendada.
                </div>
              ) : (
                recentConsultations.map((consultation) => (
                  <div key={consultation.id} className="flex items-center">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {consultation.patientName
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .substring(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {consultation.patientName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {consultation.patientEmail || 'Sem email'}
                      </p>
                    </div>
                    <div className="ml-auto font-medium">
                      {format(new Date(consultation.date), "dd 'de' MMM, HH:mm", {
                        locale: ptBR,
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
