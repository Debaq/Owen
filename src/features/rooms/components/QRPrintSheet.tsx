import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/shared/components/ui/button'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Printer, X, Loader2, Settings2, RotateCcw, Save } from 'lucide-react'
import type { RoomWithBuilding } from '../services/roomService'
import {
  getSystemConfig,
  saveSystemConfig,
  type SystemConfig,
} from '@/features/settings/services/settingsService'
import { toast } from 'sonner'

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

// --- Definiciones de elementos editables ---

type ElementKey = 'logo' | 'building' | 'code' | 'name' | 'type' | 'qr' | 'instruction'

interface ElementDef {
  key: ElementKey
  label: string
  sizeLabel: string
  sizeUnit: string
  sizeMin: number
  sizeMax: number
  sizeStep: number
  sizeDefault: number
}

const ELEMENT_DEFS: ElementDef[] = [
  { key: 'logo', label: 'Logo institucional', sizeLabel: 'Altura', sizeUnit: 'mm', sizeMin: 6, sizeMax: 30, sizeStep: 1, sizeDefault: 14 },
  { key: 'building', label: 'Edificio y piso', sizeLabel: 'Fuente', sizeUnit: 'pt', sizeMin: 8, sizeMax: 24, sizeStep: 0.5, sizeDefault: 13 },
  { key: 'code', label: 'Código de sala', sizeLabel: 'Fuente', sizeUnit: 'pt', sizeMin: 14, sizeMax: 48, sizeStep: 1, sizeDefault: 28 },
  { key: 'name', label: 'Nombre de sala', sizeLabel: 'Fuente', sizeUnit: 'pt', sizeMin: 7, sizeMax: 22, sizeStep: 0.5, sizeDefault: 11 },
  { key: 'type', label: 'Tipo de sala', sizeLabel: 'Fuente', sizeUnit: 'pt', sizeMin: 7, sizeMax: 18, sizeStep: 0.5, sizeDefault: 10 },
  { key: 'qr', label: 'Código QR', sizeLabel: 'Tamaño', sizeUnit: 'px', sizeMin: 80, sizeMax: 280, sizeStep: 5, sizeDefault: 170 },
  { key: 'instruction', label: 'Texto instrucción', sizeLabel: 'Fuente', sizeUnit: 'pt', sizeMin: 7, sizeMax: 16, sizeStep: 0.5, sizeDefault: 9 },
]

interface ElStyle {
  size: number
  y: number
}

type ElementStyles = Record<ElementKey, ElStyle>

function getDefaultStyles(): ElementStyles {
  const s = {} as ElementStyles
  for (const d of ELEMENT_DEFS) {
    s[d.key] = { size: d.sizeDefault, y: 0 }
  }
  return s
}

function parseStyles(raw?: string): ElementStyles {
  const defaults = getDefaultStyles()
  if (!raw) return defaults
  try {
    const parsed = JSON.parse(raw)
    for (const d of ELEMENT_DEFS) {
      if (parsed[d.key]) {
        defaults[d.key] = {
          size: typeof parsed[d.key].size === 'number' ? parsed[d.key].size : d.sizeDefault,
          y: typeof parsed[d.key].y === 'number' ? parsed[d.key].y : 0,
        }
      }
    }
  } catch { /* ignore */ }
  return defaults
}

export function QRPrintSheet({ rooms, onClose }: QRPrintSheetProps) {
  const [config, setConfig] = useState<SystemConfig>({})
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [selectedElement, setSelectedElement] = useState<ElementKey>('code')
  const [styles, setStyles] = useState<ElementStyles>(getDefaultStyles())
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    getSystemConfig()
      .then(cfg => {
        setConfig(cfg)
        setStyles(parseStyles(cfg.qr_element_styles))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handlePrint = () => window.print()

  const handleChange = (field: 'size' | 'y', value: number) => {
    setStyles(prev => ({
      ...prev,
      [selectedElement]: { ...prev[selectedElement], [field]: value },
    }))
    setDirty(true)
  }

  const handleResetElement = () => {
    const def = ELEMENT_DEFS.find(d => d.key === selectedElement)!
    setStyles(prev => ({ ...prev, [selectedElement]: { size: def.sizeDefault, y: 0 } }))
    setDirty(true)
  }

  const handleResetAll = () => {
    setStyles(getDefaultStyles())
    setDirty(true)
  }

  const handleSaveStyles = async () => {
    setSaving(true)
    try {
      await saveSystemConfig({ qr_element_styles: JSON.stringify(styles) })
      toast.success('Diseño guardado')
      setDirty(false)
    } catch {
      toast.error('Error al guardar diseño')
    } finally {
      setSaving(false)
    }
  }

  const logoUrl = config.qr_logo_url || ''
  const showBuilding = config.qr_show_building !== '0'
  const showRoomName = config.qr_show_room_name !== '0'
  const showInstruction = config.qr_show_instruction !== '0'
  const showRoomType = config.qr_show_room_type === '1'
  const instructionText = config.qr_instruction_text || 'Escanea para ver horario y reportar'

  const selectedDef = ELEMENT_DEFS.find(d => d.key === selectedElement)!
  const current = styles[selectedElement]

  // Agrupar salas en páginas de 3
  const pages: (RoomWithBuilding | null)[][] = []
  for (let i = 0; i < rooms.length; i += 3) {
    pages.push([rooms[i] || null, rooms[i + 1] || null, rooms[i + 2] || null])
  }
  if (pages.length === 0) pages.push([null, null, null])

  if (loading) {
    return createPortal(
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>,
      document.body,
    )
  }

  return createPortal(
    <div className="qr-print-overlay fixed inset-0 z-50 bg-white flex flex-col">
      {/* Toolbar */}
      <div className="qr-print-toolbar shrink-0 flex items-center justify-between px-6 py-3 border-b bg-gray-50">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Códigos QR de Salas</h2>
          <span className="text-sm text-muted-foreground">
            {rooms.length} {rooms.length === 1 ? 'sala' : 'salas'} — {pages.length}{' '}
            {pages.length === 1 ? 'página' : 'páginas'}
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showEditor ? 'secondary' : 'outline'}
            onClick={() => setShowEditor(v => !v)}
            className="gap-2"
          >
            <Settings2 className="h-4 w-4" />
            Editar diseño
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Panel editor */}
      {showEditor && (
        <div className="qr-print-editor shrink-0 border-b bg-slate-50 px-6 py-4">
          <div className="flex items-end gap-6 flex-wrap">
            {/* Selector de elemento */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Elemento</Label>
              <Select value={selectedElement} onValueChange={v => setSelectedElement(v as ElementKey)}>
                <SelectTrigger className="w-[220px] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ELEMENT_DEFS.map(def => (
                    <SelectItem key={def.key} value={def.key}>
                      {def.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Slider tamaño */}
            <div className="space-y-1.5 min-w-[180px] max-w-[260px] flex-1">
              <Label className="text-xs font-medium text-muted-foreground">
                {selectedDef.sizeLabel}:{' '}
                <span className="font-semibold text-foreground">
                  {current.size}{selectedDef.sizeUnit}
                </span>
              </Label>
              <input
                type="range"
                min={selectedDef.sizeMin}
                max={selectedDef.sizeMax}
                step={selectedDef.sizeStep}
                value={current.size}
                onChange={e => handleChange('size', parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-full bg-gray-300 cursor-pointer"
                style={{ accentColor: 'hsl(var(--primary))' }}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{selectedDef.sizeMin}</span>
                <span>{selectedDef.sizeMax}</span>
              </div>
            </div>

            {/* Slider posición vertical */}
            <div className="space-y-1.5 min-w-[180px] max-w-[260px] flex-1">
              <Label className="text-xs font-medium text-muted-foreground">
                Posición:{' '}
                <span className="font-semibold text-foreground">
                  {current.y > 0 ? '+' : ''}{current.y}px
                </span>
              </Label>
              <input
                type="range"
                min={-300}
                max={300}
                step={1}
                value={current.y}
                onChange={e => handleChange('y', parseInt(e.target.value))}
                className="w-full h-1.5 rounded-full bg-gray-300 cursor-pointer"
                style={{ accentColor: 'hsl(var(--primary))' }}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Arriba</span>
                <span>Abajo</span>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-2 items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetElement}
                title="Restablecer este elemento"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleResetAll}>
                Restablecer todo
              </Button>
              <Button
                size="sm"
                onClick={handleSaveStyles}
                disabled={saving || !dirty}
                className="gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Contenido imprimible */}
      <div className="qr-print-content flex-1 overflow-auto p-6">
        {pages.map((pageRooms, pageIndex) => (
          <div key={pageIndex} className="qr-page mx-auto mb-8 bg-white border shadow-lg">
            <div className="qr-page-grid">
              {pageRooms.map((room, cellIndex) => {
                if (!room) {
                  return <div key={`empty-${cellIndex}`} />
                }

                const publicUrl = `${window.location.origin}/owen/public/room/${room.id}`
                return (
                  <div key={room.id} className="qr-cell">
                    {logoUrl && (
                      <div style={{ textAlign: 'center', marginBottom: 8, transform: `translateY(${styles.logo.y}px)` }}>
                        <img
                          src={logoUrl}
                          alt="Logo"
                          style={{
                            maxHeight: styles.logo.size * 3.78,
                            maxWidth: 265,
                            objectFit: 'contain' as const,
                          }}
                        />
                      </div>
                    )}

                    {showBuilding && (
                      <p className="qr-el-text" style={{ fontSize: `${styles.building.size}pt`, color: '#666', marginBottom: 6, transform: `translateY(${styles.building.y}px)` }}>
                        {room.edificio?.name || 'Sin edificio'} — Piso {room.piso}
                      </p>
                    )}

                    <h2
                      className="qr-el-text"
                      style={{
                        fontSize: `${styles.code.size}pt`,
                        fontWeight: 800,
                        marginBottom: 10,
                        letterSpacing: '1px',
                        lineHeight: 1.1,
                        transform: `translateY(${styles.code.y}px)`,
                      }}
                    >
                      {room.code}
                    </h2>

                    {showRoomName && (
                      <p className="qr-el-text" style={{ fontSize: `${styles.name.size}pt`, color: '#444', marginBottom: 6, transform: `translateY(${styles.name.y}px)` }}>
                        {room.name}
                      </p>
                    )}

                    {showRoomType && (
                      <p
                        className="qr-el-text"
                        style={{
                          fontSize: `${styles.type.size}pt`,
                          color: '#888',
                          marginBottom: 10,
                          textTransform: 'uppercase' as const,
                          letterSpacing: '0.5px',
                          transform: `translateY(${styles.type.y}px)`,
                        }}
                      >
                        {tipoLabels[room.tipo] || room.tipo}
                      </p>
                    )}

                    <div style={{ padding: 10, borderRadius: 4, transform: `translateY(${styles.qr.y}px)` }}>
                      <QRCodeSVG
                        value={publicUrl}
                        size={styles.qr.size}
                        level="M"
                        includeMargin={false}
                      />
                    </div>

                    {showInstruction && (
                      <p className="qr-el-text" style={{ fontSize: `${styles.instruction.size}pt`, color: '#999', marginTop: 10, transform: `translateY(${styles.instruction.y}px)` }}>
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

      {/* Estilos: pantalla + impresión */}
      <style>{`
        /* === PANTALLA (vista previa) === */
        .qr-page {
          max-width: 1050px;
          aspect-ratio: 297 / 210;
          padding: 30px 38px;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }
        .qr-page-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          flex: 1;
        }
        .qr-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 2px dashed #ccc;
          border-radius: 8px;
          padding: 15px;
          overflow: hidden;
        }
        .qr-el-text {
          margin: 0;
          text-align: center;
          font-family: system-ui, sans-serif;
        }

        /* === IMPRESIÓN === */
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Ocultar toda la app */
          body > *,
          #root > * {
            display: none !important;
          }

          /* Mostrar solo el overlay QR en flujo normal */
          .qr-print-overlay {
            display: block !important;
            position: static !important;
            width: auto !important;
            height: auto !important;
            overflow: visible !important;
          }
          .qr-print-toolbar,
          .qr-print-editor {
            display: none !important;
          }
          .qr-print-content {
            position: static !important;
            overflow: visible !important;
            height: auto !important;
            padding: 0 !important;
            flex: none !important;
          }

          /* Cada página = una hoja física exacta */
          .qr-page {
            width: 100% !important;
            height: 100vh !important;
            max-width: none !important;
            aspect-ratio: auto !important;
            padding: 8mm 10mm !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            page-break-after: always;
            page-break-inside: avoid;
          }
          .qr-page:last-child {
            page-break-after: auto;
          }
          .qr-page-grid {
            gap: 6mm !important;
          }
          .qr-cell {
            padding: 4mm !important;
          }
        }
      `}</style>
    </div>,
    document.body,
  )
}
