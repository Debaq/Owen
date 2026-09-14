import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Trash2, Search } from 'lucide-react'
import { toast } from 'sonner'
import type { Inscripcion } from '@/shared/types'
import { deleteInscripcion } from '../services/studentGroupService'

interface StudentListProps {
  inscripciones: Inscripcion[]
  asignaturaName: string
  onChanged: () => void
  readOnly?: boolean
}

export function StudentList({ inscripciones, asignaturaName, onChanged, readOnly }: StudentListProps) {
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  const filtered = inscripciones.filter(i => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (i.estudiante_nombre || '').toLowerCase().includes(q) ||
      (i.estudiante_rut || '').toLowerCase().includes(q)
    )
  })

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      await deleteInscripcion(id)
      toast.success('Inscripción eliminada')
      onChanged()
    } catch {
      toast.error('Error al eliminar inscripción')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold">
          {asignaturaName} ({inscripciones.length} estudiantes)
        </h4>
        <div className="relative w-48">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">
          {inscripciones.length === 0 ? 'Sin estudiantes inscritos' : 'Sin resultados'}
        </p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2 font-medium">#</th>
                <th className="text-left p-2 font-medium">Nombre</th>
                <th className="text-left p-2 font-medium">RUT</th>
                <th className="text-left p-2 font-medium">Email</th>
                {!readOnly && <th className="p-2 w-10"></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((insc, i) => (
                <tr key={insc.id} className="border-t hover:bg-gray-50">
                  <td className="p-2 text-gray-500">{i + 1}</td>
                  <td className="p-2">{insc.estudiante_nombre}</td>
                  <td className="p-2 text-gray-600">{insc.estudiante_rut || '-'}</td>
                  <td className="p-2 text-gray-600">{insc.estudiante_email || '-'}</td>
                  {!readOnly && (
                    <td className="p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(insc.id)}
                        disabled={deleting === insc.id}
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
