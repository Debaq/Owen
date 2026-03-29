import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { AuthProvider } from './features/auth/hooks/useAuth'
import { Toaster } from './shared/components/ui/sonner'
import './shared/lib/i18n'

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster />
    </AuthProvider>
  )
}

export default App
