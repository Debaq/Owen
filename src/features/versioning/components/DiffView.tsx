import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Minus, ArrowRightLeft, Equal } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { getDiffByCommits } from '../services/versioningService'
import type { HorarioDiff } from '@/shared/types'

const DIAS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

interface Props {
  commitA: string
  commitB: string
  onBack: () => void
}

export function DiffView({ commitA, commitB, onBack }: Props) {
  const [diff, setDiff] = useState<HorarioDiff | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'added' | 'removed' | 'moved'>('all')

  useEffect(() => {
    loadDiff()
  }, [commitA, commitB])

  const loadDiff = async () => {
    setLoading(true)
    try {
      const data = await getDiffByCommits(commitA, commitB)
      setDiff(data)
    } catch {
      toast.error('Error al calcular diff')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-4 text-muted-foreground">Calculando diferencias...</div>
  if (!diff) return <div className="p-4 text-red-500">Error al cargar diff</div>

  const scoreDelta = (diff.score_b !== null && diff.score_a !== null)
    ? (diff.score_b! - diff.score_a!).toFixed(1)
    : null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <CardTitle className="text-lg">Diferencias</CardTitle>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-600">{diff.added_count} agregadas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Minus className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-red-600">{diff.removed_count} eliminadas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowRightLeft className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-600">{diff.moved_count} movidas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Equal className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-muted-foreground">{diff.unchanged_count} sin cambios</span>
          </div>
          {scoreDelta !== null && (
            <Badge variant="outline" className={`text-xs ${parseFloat(scoreDelta) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Score: {diff.score_a} → {diff.score_b} ({parseFloat(scoreDelta) >= 0 ? '+' : ''}{scoreDelta})
            </Badge>
          )}
        </div>

        {/* Tab filters */}
        <div className="flex gap-2 mt-3">
          {(['all', 'added', 'removed', 'moved'] as const).map(tab => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'all' ? 'Todos' : tab === 'added' ? 'Agregadas' : tab === 'removed' ? 'Eliminadas' : 'Movidas'}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Tipo</TableHead>
              <TableHead>Sesión</TableHead>
              <TableHead>Sala</TableHead>
              <TableHead>Día</TableHead>
              <TableHead>Bloque</TableHead>
              <TableHead>Docente</TableHead>
              <TableHead className="text-right">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Added */}
            {(activeTab === 'all' || activeTab === 'added') && diff.added.map(a => (
              <TableRow key={`add-${a.sesion_id}`} className="bg-green-50">
                <TableCell><Plus className="w-4 h-4 text-green-600" /></TableCell>
                <TableCell className="font-mono text-xs">{a.sesion_etiqueta || a.sesion_id?.slice(0, 8)}</TableCell>
                <TableCell>{a.sala_code || a.sala_nombre || '-'}</TableCell>
                <TableCell>{a.dia_semana !== null && a.dia_semana !== undefined ? DIAS[a.dia_semana] : '-'}</TableCell>
                <TableCell>{a.bloque_nombre || '-'}</TableCell>
                <TableCell className="text-sm">{a.docente_nombre || '-'}</TableCell>
                <TableCell className="text-right">{a.score ?? '-'}</TableCell>
              </TableRow>
            ))}

            {/* Removed */}
            {(activeTab === 'all' || activeTab === 'removed') && diff.removed.map(a => (
              <TableRow key={`rem-${a.sesion_id}`} className="bg-red-50">
                <TableCell><Minus className="w-4 h-4 text-red-600" /></TableCell>
                <TableCell className="font-mono text-xs">{a.sesion_etiqueta || a.sesion_id?.slice(0, 8)}</TableCell>
                <TableCell>{a.sala_code || a.sala_nombre || '-'}</TableCell>
                <TableCell>{a.dia_semana !== null && a.dia_semana !== undefined ? DIAS[a.dia_semana] : '-'}</TableCell>
                <TableCell>{a.bloque_nombre || '-'}</TableCell>
                <TableCell className="text-sm">{a.docente_nombre || '-'}</TableCell>
                <TableCell className="text-right">{a.score ?? '-'}</TableCell>
              </TableRow>
            ))}

            {/* Moved */}
            {(activeTab === 'all' || activeTab === 'moved') && diff.moved.map(m => (
              <TableRow key={`mov-${m.sesion_id}`} className="bg-yellow-50">
                <TableCell><ArrowRightLeft className="w-4 h-4 text-yellow-600" /></TableCell>
                <TableCell className="font-mono text-xs">{m.antes.sesion_etiqueta || m.sesion_id?.slice(0, 8)}</TableCell>
                <TableCell>
                  <span className="line-through text-red-400 text-xs">{m.antes.sala_code || '-'}</span>
                  {' → '}
                  <span className="text-green-600 text-xs font-medium">{m.despues.sala_code || '-'}</span>
                </TableCell>
                <TableCell>
                  {m.antes.dia_semana !== m.despues.dia_semana ? (
                    <>
                      <span className="line-through text-red-400">{m.antes.dia_semana !== null && m.antes.dia_semana !== undefined ? DIAS[m.antes.dia_semana] : '-'}</span>
                      {' → '}
                      <span className="text-green-600">{m.despues.dia_semana !== null && m.despues.dia_semana !== undefined ? DIAS[m.despues.dia_semana] : '-'}</span>
                    </>
                  ) : (
                    <span>{m.antes.dia_semana !== null && m.antes.dia_semana !== undefined ? DIAS[m.antes.dia_semana] : '-'}</span>
                  )}
                </TableCell>
                <TableCell>
                  {m.antes.bloque_nombre !== m.despues.bloque_nombre ? (
                    <>
                      <span className="line-through text-red-400 text-xs">{m.antes.bloque_nombre || '-'}</span>
                      {' → '}
                      <span className="text-green-600 text-xs">{m.despues.bloque_nombre || '-'}</span>
                    </>
                  ) : (
                    <span className="text-xs">{m.antes.bloque_nombre || '-'}</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">{m.despues.docente_nombre || '-'}</TableCell>
                <TableCell className="text-right">
                  {m.antes.score !== m.despues.score ? (
                    <span>{m.antes.score ?? '-'} → {m.despues.score ?? '-'}</span>
                  ) : (
                    <span>{m.despues.score ?? '-'}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}

            {diff.added_count === 0 && diff.removed_count === 0 && diff.moved_count === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Los commits son idénticos
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
