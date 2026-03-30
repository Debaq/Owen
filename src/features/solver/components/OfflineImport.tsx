import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Upload, FileJson } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { api } from '@/shared/lib/api'
import type { ApiResponse } from '@/shared/types'

interface Props {
  onImported: () => void
}

export function OfflineImport({ onImported }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<{ sesiones: number; score: number } | null>(null)
  const [fileData, setFileData] = useState<unknown>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        setFileData(data)

        // Extraer preview
        const res = data.resultado || data
        setPreview({
          sesiones: res.sesiones_asignadas || res.asignaciones?.length || 0,
          score: res.score_global || 0,
        })
      } catch {
        toast.error('El archivo no es un JSON válido')
      }
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!fileData) return
    setLoading(true)

    try {
      const response = await api.post<ApiResponse<{ branch_id: string; commit_id: string; total_asignaciones: number }>>('/solver-import.php', fileData)
      const d = response.data.data
      toast.success(`Importado: ${d?.total_asignaciones} asignaciones en branch ${d?.branch_id?.slice(0, 8)}`)
      setOpen(false)
      setFileData(null)
      setPreview(null)
      onImported()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al importar'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
        <Upload className="w-4 h-4 mr-2" /> Importar resultado
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="w-5 h-5" /> Importar resultado del solver
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sube el archivo JSON generado por Owen Solver en modo offline.
            </p>

            <input
              ref={fileRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />

            {preview && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p><strong>Sesiones asignadas:</strong> {preview.sesiones}</p>
                <p><strong>Score global:</strong> {preview.score.toFixed(1)}</p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleImport} disabled={!fileData || loading}>
                {loading ? 'Importando...' : 'Importar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
