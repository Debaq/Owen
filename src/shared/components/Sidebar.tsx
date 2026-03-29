import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Calendar,
  CalendarPlus,
  DoorOpen,
  Building,
  Building2,
  Map,
  FileText,
  MessageSquare,
  BarChart3,
  Settings,
  GraduationCap,
  Users,
  CalendarClock,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useAuth } from '@/features/auth/hooks/useAuth'

interface NavigationItem {
  name: string
  href: string
  icon: React.ElementType
  roles?: string[] // si no se define, visible para todos
}

interface NavigationSection {
  title?: string
  items: NavigationItem[]
}

const navigation: NavigationSection[] = [
  {
    items: [
      { name: 'navigation.dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      { name: 'navigation.schedules', href: '/admin/schedules', icon: Calendar },
      { name: 'Asistente Horarios', href: '/admin/schedule-wizard', icon: CalendarPlus, roles: ['gestor'] },
    ]
  },
  {
    title: 'Gestión Física',
    items: [
      { name: 'navigation.buildings', href: '/admin/buildings', icon: Building, roles: ['gestor'] },
      { name: 'navigation.rooms', href: '/admin/rooms', icon: DoorOpen },
      { name: 'navigation.map', href: '/admin/map', icon: Map },
    ]
  },
  {
    title: 'Gestión Académica',
    items: [
      { name: 'Carreras', href: '/admin/academic/carreras', icon: GraduationCap },
      { name: 'Unidades', href: '/admin/academic/unidades', icon: Building2, roles: ['gestor'] },
      { name: 'Docentes', href: '/admin/academic/docentes', icon: Users },
    ]
  },
  {
    title: 'Sistema',
    items: [
      { name: 'Bloques Horarios', href: '/admin/system/bloques', icon: Calendar, roles: ['gestor'] },
      { name: 'navigation.requests', href: '/admin/requests', icon: FileText },
      { name: 'Agenda', href: '/admin/agenda', icon: CalendarClock, roles: ['direccion', 'secretaria'] },
      { name: 'navigation.observations', href: '/admin/observations', icon: MessageSquare },
      { name: 'navigation.reports', href: '/admin/reports', icon: BarChart3 },
      { name: 'navigation.settings', href: '/admin/settings', icon: Settings, roles: ['gestor'] },
    ]
  }
]

export default function Sidebar() {
  const { t } = useTranslation()
  const location = useLocation()
  const { user } = useAuth()
  const userRole = user?.role || ''

  return (
    <aside className="w-20 md:w-64 bg-white shadow-sm border-r min-h-[calc(100vh-65px)] overflow-y-auto flex-shrink-0 transition-all duration-300">
      <nav className="p-2 md:p-4 space-y-6">
        {navigation.map((section, index) => {
          const visibleItems = section.items.filter(item =>
            !item.roles || item.roles.includes(userRole)
          )
          if (visibleItems.length === 0) return null

          return (
          <div key={index} className="space-y-2">
            {section.title && (
              <h3 className="hidden md:block px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.title}
              </h3>
            )}
            <div className="space-y-1">
              {visibleItems.map((item) => {
                const isActive = location.pathname.startsWith(item.href)
                const Icon = item.icon

                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'flex items-center justify-center md:justify-start gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    )}
                    title={t(item.name)}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="hidden md:block truncate font-semibold">
                        {t(item.name) !== item.name ? t(item.name) : item.name}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
          )
        })}
      </nav>
    </aside>
  )
}