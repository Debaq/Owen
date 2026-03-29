import { createBrowserRouter, Navigate } from 'react-router-dom'
import Layout from './shared/components/Layout'
import { ProtectedRoute } from './features/auth/components/ProtectedRoute'
import { LoginView } from './features/auth/views/LoginView'
import { RoomsView } from './features/rooms/views/RoomsView'
import { SchedulesView } from './features/schedules/views/SchedulesView'
import { BuildingsView } from './features/buildings/views/BuildingsView'
import { HomePage } from './features/public/views/HomePage'
import { PublicRoomView } from './features/public/views/PublicRoomView'
import { PublicBuildingView } from './features/public/views/PublicBuildingView'
import { CampusGuideView } from './features/public/views/CampusGuideView'
import { DirectoresListView } from './features/public/views/DirectoresListView'
import { AgendaPublicView } from './features/public/views/AgendaPublicView'
import { AgendaView } from './features/agenda/views/AgendaView'
import { ScheduleWizardView } from './features/schedule-wizard/views/ScheduleWizardView'
import { MapView as MapViewComponent } from './features/map/views/MapView'
import { POIManagerView } from './features/map/views/POIManagerView'

// Placeholder components (to be implemented in later phases)
const Dashboard = () => <div className="p-6"><h1 className="text-2xl font-bold">Dashboard</h1></div>
import { RequestsView } from './features/requests/views/RequestsView'
const Observations = () => <div className="p-6"><h1 className="text-2xl font-bold">Observaciones</h1></div>
import { ReportsView } from './features/reports/views/ReportsView'
import CarrerasView from './features/academic/views/CarrerasView'
import DocentesView from './features/academic/views/DocentesView'
import UnidadesView from './features/academic/views/UnidadesView'
import BloquesView from './features/academic/views/BloquesView'

import { SystemSettingsView } from './features/settings/views/SystemSettingsView'

// Public views placeholders
const PublicTeacherView = () => <div className="p-6"><h1 className="text-2xl font-bold">Horario Público - Docente</h1></div>
const PublicSubjectView = () => <div className="p-6"><h1 className="text-2xl font-bold">Horario Público - Asignatura</h1></div>
const PublicLevelView = () => <div className="p-6"><h1 className="text-2xl font-bold">Horario Público - Nivel</h1></div>
const PublicObservation = () => <div className="p-6"><h1 className="text-2xl font-bold">Reportar Observación</h1></div>

// Auto-detectar basename desde la URL del script actual
const detectedBase = new URL(import.meta.url).pathname.replace(/\/assets\/.*$/, '') || '/'
const basename = detectedBase === '/' ? undefined : detectedBase

export const router = createBrowserRouter([
  // Página de inicio pública
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/login',
    element: <LoginView />,
  },
  {
    path: '/campus',
    element: <CampusGuideView />,
  },
  {
    path: '/agenda',
    element: <DirectoresListView />,
  },
  {
    path: '/agenda/:directorId',
    element: <AgendaPublicView />,
  },
  // Panel de administración (protegido)
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/admin/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'schedules',
        element: <SchedulesView />,
      },
      {
        path: 'schedule-wizard',
        element: (
          <ProtectedRoute requiredRole="gestor">
            <ScheduleWizardView />
          </ProtectedRoute>
        ),
      },
      // Gestión Física
      {
        path: 'rooms',
        element: <RoomsView />,
      },
      {
        path: 'buildings',
        element: (
          <ProtectedRoute requiredRole="gestor">
            <BuildingsView />
          </ProtectedRoute>
        ),
      },
      {
        path: 'map',
        element: <MapViewComponent />,
      },
      {
        path: 'map/poi-manager',
        element: (
          <ProtectedRoute requiredRole="gestor">
            <POIManagerView />
          </ProtectedRoute>
        ),
      },
      // Gestión Académica
      {
        path: 'academic/carreras',
        element: (
          <ProtectedRoute requiredRole={['gestor', 'direccion', 'secretaria']}>
            <CarrerasView />
          </ProtectedRoute>
        ),
      },
      {
        path: 'academic/docentes',
        element: (
          <ProtectedRoute requiredRole={['gestor', 'direccion', 'secretaria']}>
            <DocentesView />
          </ProtectedRoute>
        ),
      },
      {
        path: 'academic/unidades',
        element: (
          <ProtectedRoute requiredRole="gestor">
            <UnidadesView />
          </ProtectedRoute>
        ),
      },
      {
        path: 'system/bloques',
        element: (
          <ProtectedRoute requiredRole="gestor">
            <BloquesView />
          </ProtectedRoute>
        ),
      },
      // Sistema
      {
        path: 'requests',
        element: <RequestsView />,
      },
      {
        path: 'agenda',
        element: (
          <ProtectedRoute requiredRole={['direccion', 'secretaria']}>
            <AgendaView />
          </ProtectedRoute>
        ),
      },
      {
        path: 'observations',
        element: <Observations />,
      },
      {
        path: 'reports',
        element: (
          <ProtectedRoute requiredRole={['gestor', 'direccion', 'secretaria']}>
            <ReportsView />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute requiredRole="gestor">
            <SystemSettingsView />
          </ProtectedRoute>
        ),
      },
    ],
  },
  // Public routes (no authentication required)
  {
    path: '/public',
    children: [
      {
        path: 'room/:roomId',
        element: <PublicRoomView />,
      },
      {
        path: 'building/:buildingId',
        element: <PublicBuildingView />,
      },
      {
        path: 'teacher/:teacherId',
        element: <PublicTeacherView />,
      },
      {
        path: 'subject/:subjectId',
        element: <PublicSubjectView />,
      },
      {
        path: 'level/:carreraId/:nivelId',
        element: <PublicLevelView />,
      },
    ],
  },
  {
    path: '/report',
    element: <PublicObservation />,
  },
], { basename })
