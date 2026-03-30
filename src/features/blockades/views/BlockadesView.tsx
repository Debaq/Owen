import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { LevelBlockadeGrid } from '../components/LevelBlockadeGrid'
import { InstitutionalList } from '../components/InstitutionalList'
import { api } from '@/shared/lib/api'
import type { ApiResponse } from '@/shared/types'

interface Temporada {
  id: string
  nombre: string
  activa: boolean
}

export function BlockadesView() {
  const [temporadas, setTemporadas] = useState<Temporada[]>([])
  const [selectedTemporada, setSelectedTemporada] = useState<string>('')

  useEffect(() => {
    loadTemporadas()
  }, [])

  const loadTemporadas = async () => {
    try {
      const response = await api.get<ApiResponse<Temporada[]>>('/temporadas.php')
      const temps = response.data.data || []
      setTemporadas(temps)
      const activa = temps.find((t: Temporada) => t.activa)
      if (activa) setSelectedTemporada(activa.id)
      else if (temps.length > 0) setSelectedTemporada(temps[0].id)
    } catch { /* ignore */ }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bloqueos</h1>
          <p className="text-muted-foreground">
            Gestiona los bloqueos de horario por nivel y los eventos institucionales.
          </p>
        </div>
        <div className="w-64">
          <Select value={selectedTemporada} onValueChange={setSelectedTemporada}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar temporada" />
            </SelectTrigger>
            <SelectContent>
              {temporadas.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.nombre} {t.activa ? '(activa)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedTemporada && (
        <Tabs defaultValue="nivel">
          <TabsList>
            <TabsTrigger value="nivel">Por Nivel</TabsTrigger>
            <TabsTrigger value="institucional">Eventos Institucionales</TabsTrigger>
          </TabsList>
          <TabsContent value="nivel" className="mt-4">
            <LevelBlockadeGrid temporadaId={selectedTemporada} />
          </TabsContent>
          <TabsContent value="institucional" className="mt-4">
            <InstitutionalList temporadaId={selectedTemporada} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
