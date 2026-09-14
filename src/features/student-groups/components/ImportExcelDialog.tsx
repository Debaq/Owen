import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { Asignatura } from '@/shared/types'
import { bulkCreateEstudiantes, bulkCreateInscripciones } from '../services/studentGroupService'

interface ParsedStudent {
  nombre: string
  rut?: string
  email?: string
}

interface ImportExcelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  asignaturas: Asignatura[]
  carreraId: string
  nivelId?: string
  temporadaId: string
  onImported: () => void
}

const COLUMN_ALIASES: Record<string, string[]> = {
  nombre: ['nombre', 'name', 'alumno', 'estudiante', 'nombre completo', 'nombre alumno', 'nombres', 'nombre_alumno'],
  rut: ['rut', 'run', 'cedula', 'identificacion', 'id'],
  email: ['email', 'correo', 'mail', 'e-mail', 'correo electronico'],
  asignatura: ['asignatura', 'codigo', 'code', 'codigo_asignatura', 'subject', 'cod'],
}

function detectColumn(headers: string[], aliases: string[]): number {
  const normalized = headers.map(h => h.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
  for (const alias of aliases) {
    const norm = alias.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const idx = normalized.indexOf(norm)
    if (idx !== -1) return idx
  }
  return -1
}

export function ImportExcelDialog({
  open, onOpenChange, asignaturas, carreraId, nivelId, temporadaId, onImported
}: ImportExcelDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [parsedData, setParsedData] = useState<ParsedStudent[]>([])
  const [selectedAsignatura, setSelectedAsignatura] = useState<string>('')
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [parseErrors, setParseErrors] = useState<string[]>([])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setParseErrors([])

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]

        if (json.length < 2) {
          setParseErrors(['El archivo está vacío o solo tiene encabezados'])
          return
        }

        const headers = (json[0] as unknown[]).map(h => String(h || ''))
        const nombreIdx = detectColumn(headers, COLUMN_ALIASES.nombre)
        const rutIdx = detectColumn(headers, COLUMN_ALIASES.rut)
        const emailIdx = detectColumn(headers, COLUMN_ALIASES.email)

        if (nombreIdx === -1) {
          setParseErrors([`No se encontró columna de nombre. Columnas detectadas: ${headers.join(', ')}`])
          return
        }

        const students: ParsedStudent[] = []
        const errors: string[] = []

        for (let i = 1; i < json.length; i++) {
          const row = json[i] as unknown[]
          if (!row || row.length === 0) continue

          const nombre = row[nombreIdx] ? String(row[nombreIdx]).trim() : ''
          if (!nombre) {
            errors.push(`Fila ${i + 1}: nombre vacío, omitida`)
            continue
          }

          students.push({
            nombre,
            rut: rutIdx !== -1 && row[rutIdx] ? String(row[rutIdx]).trim() : undefined,
            email: emailIdx !== -1 && row[emailIdx] ? String(row[emailIdx]).trim() : undefined,
          })
        }

        setParsedData(students)
        if (errors.length > 0) setParseErrors(errors)
      } catch {
        setParseErrors(['Error al leer el archivo. Verifique que sea un Excel válido.'])
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleImport = async () => {
    if (!selectedAsignatura) {
      toast.error('Seleccione una asignatura')
      return
    }
    if (parsedData.length === 0) {
      toast.error('No hay datos para importar')
      return
    }

    setImporting(true)
    try {
      // 1. Crear estudiantes
      const result = await bulkCreateEstudiantes({
        carrera_id: carreraId,
        nivel_id: nivelId,
        estudiantes: parsedData,
      })

      // 2. Inscribir en asignatura
      const inscResult = await bulkCreateInscripciones({
        asignatura_id: selectedAsignatura,
        temporada_id: temporadaId,
        estudiante_ids: result.ids,
      })

      toast.success(
        `Importados: ${result.created} nuevos, ${result.existing} existentes. ` +
        `Inscritos: ${inscResult.created}`
      )
      onImported()
      handleClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al importar'
      toast.error(msg)
    } finally {
      setImporting(false)
    }
  }

  const handleClose = () => {
    setParsedData([])
    setSelectedAsignatura('')
    setFileName('')
    setParseErrors([])
    if (fileInputRef.current) fileInputRef.current.value = ''
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Importar Estudiantes desde Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selector de archivo */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              {fileName || 'Seleccionar archivo Excel'}
            </Button>
            <p className="text-xs text-gray-500 mt-1">
              El archivo debe tener una columna &quot;Nombre&quot;. Opcionalmente: RUT, Email.
            </p>
          </div>

          {/* Errores de parseo */}
          {parseErrors.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-yellow-700 text-sm font-medium mb-1">
                <AlertCircle className="w-4 h-4" />
                Advertencias
              </div>
              {parseErrors.map((err, i) => (
                <p key={i} className="text-xs text-yellow-600">{err}</p>
              ))}
            </div>
          )}

          {/* Selector de asignatura */}
          {parsedData.length > 0 && (
            <>
              <div>
                <label className="text-sm font-medium mb-1 block">Asignatura destino</label>
                <Select value={selectedAsignatura} onValueChange={setSelectedAsignatura}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar asignatura..." />
                  </SelectTrigger>
                  <SelectContent>
                    {asignaturas.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Preview */}
              <div>
                <p className="text-sm font-medium mb-2">
                  Vista previa ({parsedData.length} estudiantes)
                </p>
                <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left p-2">#</th>
                        <th className="text-left p-2">Nombre</th>
                        <th className="text-left p-2">RUT</th>
                        <th className="text-left p-2">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 50).map((s, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2 text-gray-500">{i + 1}</td>
                          <td className="p-2">{s.nombre}</td>
                          <td className="p-2 text-gray-600">{s.rut || '-'}</td>
                          <td className="p-2 text-gray-600">{s.email || '-'}</td>
                        </tr>
                      ))}
                      {parsedData.length > 50 && (
                        <tr className="border-t">
                          <td colSpan={4} className="p-2 text-center text-gray-500">
                            ... y {parsedData.length - 50} más
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={parsedData.length === 0 || !selectedAsignatura || importing}
          >
            {importing ? 'Importando...' : `Importar ${parsedData.length} estudiantes`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
