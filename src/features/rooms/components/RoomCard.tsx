import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import type { RoomWithBuilding } from '../services/roomService'
import { QRCodeSVG } from 'qrcode.react'
import {
  Users,
  Projector,
  Monitor,
  Wind,
  Eye,
  Edit,
  Trash2,
  Building2,
  Settings,
  Image as ImageIcon,
  QrCode,
  ExternalLink,
} from 'lucide-react'

interface RoomCardProps {
  room: RoomWithBuilding
  onView?: (room: RoomWithBuilding) => void
  onEdit?: (room: RoomWithBuilding) => void
  onDelete?: (room: RoomWithBuilding) => void
  showActions?: boolean
}

// Mapeo de tipos a colores de badge
const tipoColors: Record<string, string> = {
  aula: 'bg-blue-500',
  laboratorio: 'bg-purple-500',
  auditorio: 'bg-orange-500',
  taller: 'bg-green-500',
  sala_reuniones: 'bg-cyan-500',
  oficina: 'bg-slate-500',
  biblioteca: 'bg-indigo-500',
  medioteca: 'bg-rose-500',
}

// Mapeo de tipos a nombres en español
const tipoLabels: Record<string, string> = {
  aula: 'Aula',
  laboratorio: 'Laboratorio',
  auditorio: 'Auditorio',
  taller: 'Taller',
  sala_reuniones: 'Sala de Reuniones',
  oficina: 'Oficina',
  biblioteca: 'Biblioteca',
  medioteca: 'Medioteca',
}

// Iconos para equipamiento común
const equipmentIcons: Record<string, React.ReactNode> = {
  proyector: <Projector className="h-4 w-4" />,
  computador: <Monitor className="h-4 w-4" />,
  aire_acondicionado: <Wind className="h-4 w-4" />,
}

export function RoomCard({ room, onView, onEdit, onDelete, showActions = true }: RoomCardProps) {
  const [showQR, setShowQR] = useState(false)
  const featuredEquipment = room.equipamiento.slice(0, 3)
  const remainingEquipment = room.equipamiento.length - 3
  const hasPhotos = room.fotos && room.fotos.length > 0
  const publicUrl = `${window.location.origin}/public/room/${room.id}`

  return (
    <Card className="hover:shadow-lg transition-shadow overflow-hidden flex flex-col">
      {/* Miniatura de la sala */}
      <div className="relative h-32 bg-muted flex items-center justify-center">
        {hasPhotos ? (
          <img 
            src={room.fotos![0]} 
            alt={room.name} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center opacity-20">
            <ImageIcon className="h-8 w-8 mb-1" />
            <span className="text-[10px] uppercase font-bold tracking-tighter">Sin imagen</span>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Badge className={`${tipoColors[room.tipo]} text-white text-[10px] px-1.5 py-0`}>
            {tipoLabels[room.tipo]}
          </Badge>
        </div>
        {!room.activo && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
            <Badge variant="outline" className="bg-white text-gray-500">Inactiva</Badge>
          </div>
        )}
      </div>

      <CardHeader className="pb-2 pt-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 truncate">
            <CardTitle className="text-lg truncate">{room.code}</CardTitle>
            <CardDescription className="text-xs truncate">{room.name}</CardDescription>
          </div>

          {showActions && (
            <div className="flex gap-0.5">
              {onView && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onView(room)}>
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              )}
              {onEdit && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(room)}>
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(room)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2 pb-4">
        {/* Ubicación */}
        <div className="flex items-center gap-2 text-xs">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="truncate">
            {room.edificio?.name || 'Sin edificio'} - P{room.piso}
          </span>
        </div>

        {/* Gestión */}
        <div className="flex items-center gap-2 text-xs">
          <Settings className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-blue-600 font-medium italic">
            {room.tipo_gestion === 'central' && 'Gestión Central'}
            {room.tipo_gestion === 'carrera' && 'Gestión Carrera'}
            {room.tipo_gestion === 'unidad' && 'Gestión Unidad'}
          </span>
        </div>

        {/* Capacidad */}
        <div className="flex items-center gap-2 text-xs">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{room.capacidad} personas</span>
        </div>

        {/* Equipamiento */}
        {featuredEquipment.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {featuredEquipment.map((equipo, index) => (
              <Badge key={index} variant="secondary" className="text-[9px] px-1 py-0 h-4">
                <span className="flex items-center gap-1">
                  {equipmentIcons[equipo.toLowerCase()]}
                  <span className="capitalize">{equipo.replace(/_/g, ' ')}</span>
                </span>
              </Badge>
            ))}
            {remainingEquipment > 0 && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">+{remainingEquipment}</Badge>
            )}
          </div>
        )}

        {/* QR y Link Público */}
        <div className="pt-2 border-t flex items-center justify-between">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowQR(!showQR)}>
            <QrCode className="h-3 w-3" /> QR
          </Button>
          <a href={publicUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
              <ExternalLink className="h-3 w-3" /> Ver publico
            </Button>
          </a>
        </div>

        {/* QR Code expandible */}
        {showQR && (
          <div className="border rounded-lg p-4 text-center bg-white">
            <QRCodeSVG value={publicUrl} size={160} level="M" />
            <p className="text-[10px] text-muted-foreground mt-2 break-all">{publicUrl}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}