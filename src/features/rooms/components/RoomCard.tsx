import { useState } from 'react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import type { RoomWithBuilding } from '../services/roomService'
import { QRCodeSVG } from 'qrcode.react'
import { getThumbUrl } from '@/features/settings/services/settingsService'
import {
  Users,
  Eye,
  Edit,
  Trash2,
  QrCode,
  ExternalLink,
  RotateCcw,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

interface RoomCardProps {
  room: RoomWithBuilding
  onView?: (room: RoomWithBuilding) => void
  onEdit?: (room: RoomWithBuilding) => void
  onDelete?: (room: RoomWithBuilding) => void
  onActivate?: (room: RoomWithBuilding) => void
  showActions?: boolean
}

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

const tipoLabels: Record<string, string> = {
  aula: 'Aula',
  laboratorio: 'Lab',
  auditorio: 'Audit.',
  taller: 'Taller',
  sala_reuniones: 'Reuniones',
  oficina: 'Oficina',
  biblioteca: 'Biblio.',
  medioteca: 'Medio.',
}

export function RoomCard({ room, onView, onEdit, onDelete, onActivate, showActions = true }: RoomCardProps) {
  const [showQR, setShowQR] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const hasPhotos = room.fotos && room.fotos.length > 0
  const publicUrl = `${window.location.origin}/owen/public/room/${room.id}`

  return (
    <div className={`border rounded-lg bg-card overflow-hidden hover:shadow-md transition-shadow ${!room.activo ? 'opacity-60' : ''}`}>
      <div className="flex items-stretch">
        {/* Thumbnail */}
        {hasPhotos ? (
          <button
            className="w-16 h-16 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setLightboxIndex(0)}
          >
            <img
              src={getThumbUrl(room.fotos![0])}
              alt={room.name}
              className="w-full h-full object-cover"
            />
          </button>
        ) : (
          <div className={`w-2 flex-shrink-0 ${tipoColors[room.tipo]}`} />
        )}

        {/* Contenido */}
        <div className="flex-1 min-w-0 px-3 py-2 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">{room.code}</span>
              <Badge className={`${tipoColors[room.tipo]} text-white text-[9px] px-1 py-0 leading-tight`}>
                {tipoLabels[room.tipo]}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <Users className="h-3 w-3" />{room.capacidad}
              </span>
              {!room.activo && <Badge variant="outline" className="text-[9px] px-1 py-0">Inactiva</Badge>}
            </div>
            <p className="text-xs text-muted-foreground truncate">{room.name} · P{room.piso}</p>
          </div>

          {/* Acciones */}
          {showActions && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {!room.activo && onActivate ? (
                <Button variant="outline" size="sm" className="h-6 text-[10px] text-green-700 border-green-300 hover:bg-green-50 px-2" onClick={() => onActivate(room)}>
                  <RotateCcw className="h-3 w-3 mr-1" /> Reactivar
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowQR(!showQR)}>
                    <QrCode className="h-3 w-3" />
                  </Button>
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                  {onView && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onView(room)}>
                      <Eye className="h-3 w-3" />
                    </Button>
                  )}
                  {onEdit && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(room)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDelete(room)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* QR expandible */}
      {showQR && (
        <div className="border-t p-3 text-center bg-white">
          <QRCodeSVG value={publicUrl} size={140} level="M" />
          <p className="text-[10px] text-muted-foreground mt-1 break-all">{publicUrl}</p>
        </div>
      )}

      {/* Lightbox fotos */}
      {lightboxIndex !== null && hasPhotos && (
        <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center" onClick={() => setLightboxIndex(null)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setLightboxIndex(null)}>
            <X className="h-8 w-8" />
          </button>
          <div className="absolute top-4 left-4 text-white/80 text-sm">
            {room.code} — {room.name}
          </div>
          {room.fotos!.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white"
                onClick={e => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + room.fotos!.length) % room.fotos!.length) }}
              >
                <ChevronLeft className="h-10 w-10" />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white"
                onClick={e => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % room.fotos!.length) }}
              >
                <ChevronRight className="h-10 w-10" />
              </button>
            </>
          )}
          <img
            src={room.fotos![lightboxIndex]}
            alt={`${room.name} - Foto ${lightboxIndex + 1}`}
            className="max-h-[85vh] max-w-[90vw] object-contain"
            onClick={e => e.stopPropagation()}
          />
          {room.fotos!.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
              {lightboxIndex + 1} / {room.fotos!.length}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
