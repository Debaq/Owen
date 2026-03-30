import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Key, Copy, Trash2, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Badge } from '@/shared/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/shared/components/ui/alert-dialog'
import { api } from '@/shared/lib/api'
import type { ApiResponse, SolverApiToken } from '@/shared/types'

export function SolverTokenSettings() {
  const [tokens, setTokens] = useState<SolverApiToken[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [tokenName, setTokenName] = useState('Owen Solver')
  const [newToken, setNewToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadTokens()
  }, [])

  const loadTokens = async () => {
    setLoading(true)
    try {
      const response = await api.get<ApiResponse<SolverApiToken[]>>('/solver-tokens.php')
      setTokens(response.data.data || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const handleCreate = async () => {
    try {
      const response = await api.post<ApiResponse<SolverApiToken>>('/solver-tokens.php?action=create', {
        nombre: tokenName,
      })
      const data = response.data.data
      if (data?.token) {
        setNewToken(data.token)
        toast.success('Token creado')
        loadTokens()
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al crear token'
      toast.error(msg)
    }
  }

  const handleRevoke = async (id: string) => {
    try {
      await api.post(`/solver-tokens.php?action=revoke&id=${id}`)
      toast.success('Token revocado')
      loadTokens()
    } catch {
      toast.error('Error al revocar token')
    }
  }

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Token copiado al portapapeles')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" /> Tokens API del Solver
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Genera tokens para que Owen Solver se conecte a este servidor.
            Copia el token al crearlo, no se puede recuperar después.
          </p>
        </div>
        <Button size="sm" onClick={() => { setCreateOpen(true); setNewToken(null); setTokenName('Owen Solver') }}>
          <Plus className="w-4 h-4 mr-2" /> Nuevo token
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
        ) : tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No hay tokens creados. Genera uno para conectar Owen Solver.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último uso</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.nombre}</TableCell>
                  <TableCell>
                    <Badge variant={t.activo ? 'default' : 'outline'} className={t.activo ? 'bg-green-100 text-green-700' : 'text-red-500'}>
                      {t.activo ? 'Activo' : 'Revocado'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.last_used_at ? new Date(t.last_used_at).toLocaleString('es-CL') : 'Nunca'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString('es-CL')}
                  </TableCell>
                  <TableCell>
                    {t.activo && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revocar token</AlertDialogTitle>
                            <AlertDialogDescription>
                              El token "{t.nombre}" dejará de funcionar. Owen Solver no podrá conectarse con este token.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRevoke(t.id)}>Revocar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create token dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Token API</DialogTitle>
          </DialogHeader>

          {!newToken ? (
            <div className="space-y-4">
              <div>
                <Label>Nombre del token</Label>
                <Input value={tokenName} onChange={e => setTokenName(e.target.value)} placeholder="Ej: Owen Solver oficina" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate}>Generar token</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm font-medium text-yellow-800 mb-2">
                  Copia este token ahora. No se puede recuperar después.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border rounded p-2 text-xs font-mono break-all select-all">
                    {newToken}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => handleCopy(newToken)}>
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Pega este token en Owen Solver → URL de la API y Token.
              </p>
              <div className="flex justify-end">
                <Button onClick={() => setCreateOpen(false)}>Listo</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
