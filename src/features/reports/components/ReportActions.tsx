import { Button } from '@/shared/components/ui/button'
import { FileText, FileSpreadsheet, Loader2 } from 'lucide-react'

interface ReportActionsProps {
  onExportPDF: () => void
  onExportExcel: () => void
  disabled: boolean
  isExporting: boolean
}

export function ReportActions({ onExportPDF, onExportExcel, disabled, isExporting }: ReportActionsProps) {
  return (
    <div className="flex gap-2">
      <Button onClick={onExportPDF} disabled={disabled || isExporting}>
        {isExporting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <FileText className="h-4 w-4 mr-2" />
        )}
        Exportar PDF
      </Button>
      <Button variant="outline" onClick={onExportExcel} disabled={disabled || isExporting}>
        {isExporting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-4 w-4 mr-2" />
        )}
        Exportar Excel
      </Button>
    </div>
  )
}
