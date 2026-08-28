export interface CsvTransactionRow {
  date: string
  type: 'Ausgabe' | 'Einnahme'
  category: string
  amountCents: number
  note: string
}

// German locale spreadsheets (Excel, Numbers) expect ';' as the field
// separator, since ',' is the decimal separator there.
const CSV_DELIMITER = ';'

function escapeCsvField(value: string): string {
  if (/["\n;]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function buildTransactionsCsv(rows: CsvTransactionRow[]): string {
  const header = ['Datum', 'Typ', 'Kategorie', 'Betrag (EUR)', 'Notiz']
  const lines = [header.join(CSV_DELIMITER)]

  for (const row of rows) {
    lines.push(
      [
        row.date,
        row.type,
        escapeCsvField(row.category),
        (row.amountCents / 100).toFixed(2).replace('.', ','),
        escapeCsvField(row.note),
      ].join(CSV_DELIMITER),
    )
  }

  return lines.join('\r\n')
}

/** Triggers a browser download of the given CSV content. UTF-8 BOM so Excel/Numbers render umlauts correctly. */
export function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
