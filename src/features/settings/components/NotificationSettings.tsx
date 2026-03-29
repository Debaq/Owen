import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import type { SystemConfig } from '../services/settingsService'
import { saveSystemConfig, testTelegram, testEmail } from '../services/settingsService'
import { Mail, Send, X, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  config: SystemConfig
  onChange: (config: SystemConfig) => void
}

export function NotificationSettings({ config, onChange }: Props) {
  const [newEmail, setNewEmail] = useState('')
  const [testingTg, setTestingTg] = useState(false)
  const [testingMail, setTestingMail] = useState(false)

  const emailEnabled = config.notifications_email_enabled === '1'
  const tgEnabled = config.notifications_telegram_enabled === '1'
  const recipients: string[] = JSON.parse(config.notifications_email_recipients || '[]')

  const save = async (updates: SystemConfig) => {
    const newConfig = { ...config, ...updates }
    try {
      await saveSystemConfig(updates)
      onChange(newConfig)
    } catch {
      toast.error('Error al guardar')
    }
  }

  const toggleEmail = () => save({ notifications_email_enabled: emailEnabled ? '0' : '1' })
  const toggleTg = () => save({ notifications_telegram_enabled: tgEnabled ? '0' : '1' })

  const addRecipient = () => {
    const email = newEmail.trim()
    if (!email || !email.includes('@')) { toast.error('Email invalido'); return }
    if (recipients.includes(email)) { toast.error('Ya esta en la lista'); return }
    const updated = [...recipients, email]
    setNewEmail('')
    save({ notifications_email_recipients: JSON.stringify(updated) })
  }

  const removeRecipient = (email: string) => {
    const updated = recipients.filter(e => e !== email)
    save({ notifications_email_recipients: JSON.stringify(updated) })
  }

  const handleTestTg = async () => {
    setTestingTg(true)
    try {
      const msg = await testTelegram()
      toast.success(msg)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error de conexion')
    } finally {
      setTestingTg(false)
    }
  }

  const handleTestMail = async () => {
    setTestingMail(true)
    try {
      const msg = await testEmail()
      toast.success(msg)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al enviar')
    } finally {
      setTestingMail(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Email */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" /> Notificaciones por Email
            </CardTitle>
            <button
              onClick={toggleEmail}
              className={`relative w-11 h-6 rounded-full transition-colors ${emailEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${emailEnabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </CardHeader>
        {emailEnabled && (
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm mb-2 block">Destinatarios</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  type="email"
                  placeholder="email@ejemplo.cl"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addRecipient()}
                  className="flex-1"
                />
                <Button size="sm" onClick={addRecipient}><Plus className="h-4 w-4" /></Button>
              </div>
              {recipients.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin destinatarios configurados</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {recipients.map(email => (
                    <Badge key={email} variant="secondary" className="gap-1">
                      {email}
                      <button onClick={() => removeRecipient(email)}><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleTestMail} disabled={testingMail || recipients.length === 0}>
              {testingMail ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Enviar prueba
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Telegram */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4" /> Notificaciones por Telegram
            </CardTitle>
            <button
              onClick={toggleTg}
              className={`relative w-11 h-6 rounded-full transition-colors ${tgEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${tgEnabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </CardHeader>
        {tgEnabled && (
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-sm">Bot Token</Label>
              <Input
                type="password"
                placeholder="123456:ABC-DEF..."
                value={config.notifications_telegram_bot_token || ''}
                onChange={e => save({ notifications_telegram_bot_token: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Obtenlo creando un bot con @BotFather en Telegram</p>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Chat ID</Label>
              <Input
                placeholder="-1001234567890"
                value={config.notifications_telegram_chat_id || ''}
                onChange={e => save({ notifications_telegram_chat_id: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">ID del grupo o canal donde enviar notificaciones</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleTestTg} disabled={testingTg}>
              {testingTg ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Probar conexion
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
