import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Building2, Users, GraduationCap, BookOpen } from 'lucide-react'
import type { Carrera, Nivel, Asignatura, Docente, Sala } from '@/shared/types'
import type { ReportType } from '../services/reportExportService'

const VIEW_TYPES: Array<{ type: ReportType; label: string; icon: any }> = [
  { type: 'room', label: 'Por Sala', icon: Building2 },
  { type: 'teacher', label: 'Por Docente', icon: Users },
  { type: 'level', label: 'Por Nivel', icon: GraduationCap },
  { type: 'subject', label: 'Por Asignatura', icon: BookOpen },
]

interface ReportFiltersProps {
  reportType: ReportType
  onReportTypeChange: (type: ReportType) => void
  selectedCarrera: string
  selectedNivel: string
  selectedAsignatura: string
  selectedDocente: string
  selectedSala: string
  onCarreraChange: (id: string) => void
  onNivelChange: (id: string) => void
  onAsignaturaChange: (id: string) => void
  onDocenteChange: (id: string) => void
  onSalaChange: (id: string) => void
  carreras: Carrera[]
  niveles: Nivel[]
  asignaturas: Asignatura[]
  docentes: Docente[]
  salas: Sala[]
}

export function ReportFilters({
  reportType, onReportTypeChange,
  selectedCarrera, selectedNivel, selectedAsignatura, selectedDocente, selectedSala,
  onCarreraChange, onNivelChange, onAsignaturaChange, onDocenteChange, onSalaChange,
  carreras, niveles, asignaturas, docentes, salas,
}: ReportFiltersProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Tipo de Reporte</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Botones de tipo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {VIEW_TYPES.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => onReportTypeChange(type)}
              className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                reportType === type
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-muted hover:border-primary/50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Filtros según tipo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {reportType === 'room' && (
            <div className="space-y-1.5">
              <Label>Sala</Label>
              <Select value={selectedSala} onValueChange={onSalaChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sala..." />
                </SelectTrigger>
                <SelectContent>
                  {salas.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {reportType === 'teacher' && (
            <div className="space-y-1.5">
              <Label>Docente</Label>
              <Select value={selectedDocente} onValueChange={onDocenteChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar docente..." />
                </SelectTrigger>
                <SelectContent>
                  {docentes.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(reportType === 'level' || reportType === 'subject') && (
            <>
              <div className="space-y-1.5">
                <Label>Carrera</Label>
                <Select value={selectedCarrera} onValueChange={onCarreraChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar carrera..." />
                  </SelectTrigger>
                  <SelectContent>
                    {carreras.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Nivel</Label>
                <Select value={selectedNivel} onValueChange={onNivelChange} disabled={!selectedCarrera}>
                  <SelectTrigger>
                    <SelectValue placeholder={selectedCarrera ? 'Seleccionar nivel...' : 'Primero seleccione carrera'} />
                  </SelectTrigger>
                  <SelectContent>
                    {niveles.map(n => (
                      <SelectItem key={n.id} value={n.id}>{n.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {reportType === 'subject' && (
                <div className="space-y-1.5">
                  <Label>Asignatura</Label>
                  <Select value={selectedAsignatura} onValueChange={onAsignaturaChange} disabled={!selectedNivel}>
                    <SelectTrigger>
                      <SelectValue placeholder={selectedNivel ? 'Seleccionar asignatura...' : 'Primero seleccione nivel'} />
                    </SelectTrigger>
                    <SelectContent>
                      {asignaturas.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
