import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { toast } from 'sonner'
import { useReportData } from '../hooks/useReportData'
import { ReportFilters } from '../components/ReportFilters'
import { ReportPreviewGrid } from '../components/ReportPreviewGrid'
import { ReportActions } from '../components/ReportActions'
import { buildGridData, generatePDF, generateExcel } from '../services/reportExportService'

export function ReportsView() {
  const {
    reportType, setReportType,
    selectedCarrera, setSelectedCarrera,
    selectedNivel, setSelectedNivel,
    selectedAsignatura, setSelectedAsignatura,
    selectedDocente, setSelectedDocente,
    selectedSala, setSelectedSala,
    carreras, niveles, asignaturas, docentes, salas, bloques,
    temporadaActiva,
    schedules,
    entityLabel,
    isLoading,
    isInitialLoading,
  } = useReportData()

  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (type: 'pdf' | 'excel') => {
    if (!entityLabel || schedules.length === 0) return

    setIsExporting(true)
    try {
      const data = buildGridData(
        reportType,
        schedules,
        bloques,
        entityLabel,
        temporadaActiva?.nombre || ''
      )

      if (type === 'pdf') {
        generatePDF(data)
        toast.success('PDF generado exitosamente')
      } else {
        generateExcel(data)
        toast.success('Excel generado exitosamente')
      }
    } catch (err) {
      console.error('Error generando reporte:', err)
      toast.error('Error al generar el reporte')
    } finally {
      setIsExporting(false)
    }
  }

  if (isInitialLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reportes de Horarios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Genera reportes en PDF o Excel
            {temporadaActiva && (
              <> — Temporada: <span className="font-medium">{temporadaActiva.nombre}</span></>
            )}
          </p>
        </div>
        <ReportActions
          onExportPDF={() => handleExport('pdf')}
          onExportExcel={() => handleExport('excel')}
          disabled={!entityLabel || schedules.length === 0}
          isExporting={isExporting}
        />
      </div>

      {/* Filtros */}
      <ReportFilters
        reportType={reportType}
        onReportTypeChange={setReportType}
        selectedCarrera={selectedCarrera}
        selectedNivel={selectedNivel}
        selectedAsignatura={selectedAsignatura}
        selectedDocente={selectedDocente}
        selectedSala={selectedSala}
        onCarreraChange={setSelectedCarrera}
        onNivelChange={setSelectedNivel}
        onAsignaturaChange={setSelectedAsignatura}
        onDocenteChange={setSelectedDocente}
        onSalaChange={setSelectedSala}
        carreras={carreras}
        niveles={niveles}
        asignaturas={asignaturas}
        docentes={docentes}
        salas={salas}
      />

      {/* Preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Vista Previa</CardTitle>
          <CardDescription>
            {entityLabel
              ? `${schedules.length} clase${schedules.length !== 1 ? 's' : ''} programada${schedules.length !== 1 ? 's' : ''} — ${entityLabel}`
              : 'Selecciona un filtro para ver la vista previa'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportPreviewGrid
            schedules={schedules}
            bloques={bloques}
            reportType={reportType}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  )
}
