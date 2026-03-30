import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/shared/components/ui/button'
import { Printer, X, Loader2 } from 'lucide-react'
import type { RoomWithBuilding } from '../services/roomService'
import { getSystemConfig, type SystemConfig } from '@/features/settings/services/settingsService'

interface QRPrintSheetProps {
  rooms: RoomWithBuilding[]
  onClose: () => void
}

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

export function QRPrintSheet({ rooms, onClose }: QRPrintSheetProps) {
  const [config, setConfig] = useState<SystemConfig>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSystemConfig()
      .then(setConfig)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handlePrint = () => {
    window.print()
  }

  const logoUrl = config.qr_logo_url || ''
  const showBuilding = config.qr_show_building !== '0'
  const showRoomName = config.qr_show_room_name !== '0'
  const showInstruction = config.qr_show_instruction !== '0'
  const showRoomType = config.qr_show_room_type === '1'
  const instructionText = config.qr_instruction_text || 'Escanea para ver horario y reportar'

  // Siempre 3 por página, con placeholders si faltan
  const pages: (RoomWithBuilding | null)[][] = []
  for (let i = 0; i < rooms.length; i += 3) {
    const page: (RoomWithBuilding | null)[] = [
      rooms[i] || null,
      rooms[i + 1] || null,
      rooms[i + 2] || null,
    ]
    pages.push(page)
  }
  if (pages.length === 0) pages.push([null, null, null])

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-white">
      {/* Toolbar */}
      <div className="print:hidden flex items-center justify-between px-6 py-3 border-b bg-gray-50">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Códigos QR de Salas</h2>
          <span className="text-sm text-muted-foreground">
            {rooms.length} {rooms.length === 1 ? 'sala' : 'salas'} — {pages.length} {pages.length === 1 ? 'página' : 'páginas'}
          </span>
        </div>
        <div className="flex gap-2">
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Contenido imprimible */}
      <div className="print:p-0 p-6 overflow-auto print:overflow-visible" style={{ height: 'calc(100vh - 57px)' }}>
        {pages.map((pageRooms, pageIndex) => (
          <div
            key={pageIndex}
            className="qr-page mx-auto mb-8 print:mb-0 bg-white border print:border-0 print:shadow-none shadow-lg"
            style={{
              width: '297mm',
              height: '210mm',
              padding: '8mm 10mm',
              pageBreakAfter: pageIndex < pages.length - 1 ? 'always' : 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Logo centrado arriba */}
            {logoUrl && (
              <div style={{ textAlign: 'center', marginBottom: '4mm', flexShrink: 0 }}>
                <img
                  src={logoUrl}
                  alt="Logo"
                  style={{ maxHeight: '18mm', maxWidth: '80mm', objectFit: 'contain' }}
                />
              </div>
            )}

            {/* Grid de 3 columnas */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6mm',
                flex: 1,
              }}
            >
              {pageRooms.map((room, cellIndex) => {
                if (!room) {
                  // Placeholder vacío del mismo tamaño
                  return <div key={`empty-${cellIndex}`} style={{ borderRadius: '8px' }} />
                }

                const publicUrl = `${window.location.origin}/owen/public/room/${room.id}`
                return (
                  <div
                    key={room.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px dashed #ccc',
                      borderRadius: '8px',
                      padding: '4mm',
                    }}
                  >
                    {/* Edificio + piso */}
                    {showBuilding && (
                      <p
                        style={{
                          fontSize: '13pt',
                          color: '#666',
                          margin: '0 0 2mm 0',
                          textAlign: 'center',
                          fontFamily: 'system-ui, sans-serif',
                        }}
                      >
                        {room.edificio?.name || 'Sin edificio'} — Piso {room.piso}
                      </p>
                    )}

                    {/* Código de sala (siempre visible) */}
                    <h2
                      style={{
                        fontSize: '28pt',
                        fontWeight: 800,
                        margin: '0 0 3mm 0',
                        textAlign: 'center',
                        letterSpacing: '1px',
                        fontFamily: 'system-ui, sans-serif',
                        lineHeight: 1.1,
                      }}
                    >
                      {room.code}
                    </h2>

                    {/* Nombre descriptivo */}
                    {showRoomName && (
                      <p
                        style={{
                          fontSize: '11pt',
                          color: '#444',
                          margin: '0 0 2mm 0',
                          textAlign: 'center',
                          fontFamily: 'system-ui, sans-serif',
                        }}
                      >
                        {room.name}
                      </p>
                    )}

                    {/* Tipo de sala */}
                    {showRoomType && (
                      <p
                        style={{
                          fontSize: '10pt',
                          color: '#888',
                          margin: '0 0 3mm 0',
                          textAlign: 'center',
                          fontFamily: 'system-ui, sans-serif',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {tipoLabels[room.tipo] || room.tipo}
                      </p>
                    )}

                    {/* QR Code */}
                    <div style={{ background: 'white', padding: '3mm', borderRadius: '4px' }}>
                      <QRCodeSVG
                        value={publicUrl}
                        size={170}
                        level="M"
                        includeMargin={false}
                      />
                    </div>

                    {/* Instrucción */}
                    {showInstruction && (
                      <p
                        style={{
                          fontSize: '9pt',
                          color: '#999',
                          margin: '3mm 0 0 0',
                          textAlign: 'center',
                          fontFamily: 'system-ui, sans-serif',
                        }}
                      >
                        {instructionText}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Estilos de impresión */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .qr-page {
            page-break-inside: avoid;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}
