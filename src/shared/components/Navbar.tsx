import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'

export default function Navbar() {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const toggleLanguage = () => {
    const newLang = i18n.language === 'es' ? 'en' : 'es'
    i18n.changeLanguage(newLang)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getRoleBadgeColor = (role: 'gestor' | 'direccion') => {
    return role === 'gestor' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
  }

  const getRoleLabel = (role: 'gestor' | 'direccion') => {
    return role === 'gestor' ? 'Gestor' : 'Dirección'
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-gray-900">
            {t('app.name')}
          </h1>
          <span className="text-sm text-gray-500">
            {t('app.description')}
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={toggleLanguage}
            className="px-3 py-1 text-sm font-medium text-gray-700 hover:text-gray-900 border rounded hover:bg-gray-50"
          >
            {i18n.language === 'es' ? 'EN' : 'ES'}
          </button>

          {user && (
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(user.role)}`}>
                  {getRoleLabel(user.role)}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1 text-sm font-medium text-red-600 hover:text-red-700 border border-red-200 rounded hover:bg-red-50 transition-colors"
              >
                {t('common.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
