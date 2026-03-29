import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import type { BloqueHorario } from '@/shared/types'
import type { HorarioWithDetails } from '@/features/schedules/services/scheduleService'

// ==================== TIPOS ====================

export interface GridRow {
  bloqueName: string
  horaInicio: string
  horaFin: string
  orden: number
  cells: Record<number, string> // dia_semana (1-5) → texto
}

export interface ReportData {
  title: string
  entityName: string
  semester: string
  date: string
  rows: GridRow[]
  dayHeaders: string[]
}

export type ReportType = 'room' | 'teacher' | 'level' | 'subject'

const REPORT_TITLES: Record<ReportType, string> = {
  room: 'Horario por Sala',
  teacher: 'Horario por Docente',
  level: 'Horario por Nivel',
  subject: 'Horario por Asignatura',
}

const DAY_HEADERS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

// ==================== BUILD GRID ====================

function formatCell(reportType: ReportType, horarios: HorarioWithDetails[]): string {
  if (horarios.length === 0) return ''

  return horarios.map(h => {
    const parts: string[] = []

    if (reportType === 'room') {
      if (h.asignatura) parts.push(h.asignatura.code + ' - ' + h.asignatura.name)
      if (h.docente) parts.push(h.docente.name)
    } else if (reportType === 'teacher') {
      if (h.asignatura) parts.push(h.asignatura.code + ' - ' + h.asignatura.name)
      if (h.sala) parts.push('Sala: ' + h.sala.code)
    } else if (reportType === 'level') {
      if (h.asignatura) parts.push(h.asignatura.code + ' - ' + h.asignatura.name)
      if (h.docente) parts.push(h.docente.name)
      if (h.sala) parts.push('Sala: ' + h.sala.code)
    } else if (reportType === 'subject') {
      if (h.docente) parts.push(h.docente.name)
      if (h.sala) parts.push('Sala: ' + h.sala.code)
    }

    if (parts.length === 0) parts.push(h.tipo)

    return parts.join('\n')
  }).join(' / ')
}

export function buildGridData(
  reportType: ReportType,
  schedules: HorarioWithDetails[],
  bloques: BloqueHorario[],
  entityLabel: string,
  temporadaNombre: string
): ReportData {
  // Agrupar bloques por orden (mismo patrón que ScheduleGrid)
  const grouped = new Map<number, {
    nombre: string
    hora_inicio: string
    hora_fin: string
    orden: number
    byDay: Record<number, BloqueHorario>
  }>()

  bloques.forEach(b => {
    if (!grouped.has(b.orden)) {
      grouped.set(b.orden, {
        nombre: b.nombre,
        hora_inicio: b.hora_inicio,
        hora_fin: b.hora_fin,
        orden: b.orden,
        byDay: {},
      })
    }
    grouped.get(b.orden)!.byDay[b.dia_semana] = b
  })

  const sortedRows = Array.from(grouped.values()).sort((a, b) => a.orden - b.orden)

  const rows: GridRow[] = sortedRows.map(row => {
    const cells: Record<number, string> = {}

    for (let dia = 1; dia <= 5; dia++) {
      const bloque = row.byDay[dia]
      if (!bloque) {
        cells[dia] = ''
        continue
      }

      const horariosEnCelda = schedules.filter(
        s => s.dia_semana === dia && s.bloque_id === bloque.id
      )

      cells[dia] = formatCell(reportType, horariosEnCelda)
    }

    return {
      bloqueName: row.nombre,
      horaInicio: row.hora_inicio,
      horaFin: row.hora_fin,
      orden: row.orden,
      cells,
    }
  })

  return {
    title: REPORT_TITLES[reportType],
    entityName: entityLabel,
    semester: temporadaNombre,
    date: format(new Date(), 'dd/MM/yyyy'),
    rows,
    dayHeaders: DAY_HEADERS,
  }
}

// ==================== GENERAR PDF ====================

export function generatePDF(data: ReportData): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // Header
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(data.title, 14, 15)

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(data.entityName, 14, 22)

  doc.setFontSize(9)
  doc.text('Semestre: ' + data.semester, 14, 28)
  doc.text('Fecha: ' + data.date, 280, 28, { align: 'right' })

  // Tabla
  const head = [['Bloque', 'Hora', ...data.dayHeaders]]
  const body = data.rows.map(row => [
    row.bloqueName,
    row.horaInicio + ' - ' + row.horaFin,
    row.cells[1] || '',
    row.cells[2] || '',
    row.cells[3] || '',
    row.cells[4] || '',
    row.cells[5] || '',
  ])

  autoTable(doc, {
    head,
    body,
    startY: 33,
    styles: {
      fontSize: 7,
      cellPadding: 2.5,
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 24 },
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    showHead: 'everyPage',
    didDrawPage: (hookData: any) => {
      // Footer con número de página
      const pageCount = doc.getNumberOfPages()
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(
        'Página ' + hookData.pageNumber + ' de ' + pageCount,
        148, 200,
        { align: 'center' }
      )
    },
  })

  const filename = (data.title + ' - ' + data.entityName)
    .replace(/[/\\?%*:|"<>]/g, '-')
  doc.save(filename + '.pdf')
}

// ==================== GENERAR EXCEL ====================

export function generateExcel(data: ReportData): void {
  const wsData: (string | number)[][] = []

  // Encabezados
  wsData.push([data.title])
  wsData.push([data.entityName])
  wsData.push(['Semestre: ' + data.semester, '', '', '', 'Fecha: ' + data.date])
  wsData.push([]) // Fila vacía

  // Header de tabla
  wsData.push(['Bloque', 'Hora', ...data.dayHeaders])

  // Datos
  data.rows.forEach(row => {
    wsData.push([
      row.bloqueName,
      row.horaInicio + ' - ' + row.horaFin,
      row.cells[1] || '',
      row.cells[2] || '',
      row.cells[3] || '',
      row.cells[4] || '',
      row.cells[5] || '',
    ])
  })

  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Anchos de columna
  ws['!cols'] = [
    { wch: 14 },
    { wch: 16 },
    { wch: 28 },
    { wch: 28 },
    { wch: 28 },
    { wch: 28 },
    { wch: 28 },
  ]

  // Merges para título y entidad
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
  ]

  const wb = XLSX.utils.book_new()
  const sheetName = data.entityName.substring(0, 31).replace(/[/\\?*[\]]/g, '-')
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  const filename = (data.title + ' - ' + data.entityName)
    .replace(/[/\\?%*:|"<>]/g, '-')
  XLSX.writeFile(wb, filename + '.xlsx')
}
