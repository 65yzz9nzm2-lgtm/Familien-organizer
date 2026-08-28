import { describe, expect, it } from 'vitest'
import { buildTransactionsCsv } from './export'

describe('buildTransactionsCsv', () => {
  it('writes a semicolon-delimited header followed by one row per transaction', () => {
    const csv = buildTransactionsCsv([
      { date: '2026-01-05', type: 'Ausgabe', category: 'Lebensmittel', amountCents: 4870, note: 'Supermarkt' },
      { date: '2026-01-01', type: 'Einnahme', category: 'Gehalt', amountCents: 380000, note: '' },
    ])
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('Datum;Typ;Kategorie;Betrag (EUR);Notiz')
    expect(lines[1]).toBe('2026-01-05;Ausgabe;Lebensmittel;48,70;Supermarkt')
    expect(lines[2]).toBe('2026-01-01;Einnahme;Gehalt;3800,00;')
  })

  it('quotes fields that contain the delimiter, a quote, or a newline', () => {
    const csv = buildTransactionsCsv([
      { date: '2026-01-05', type: 'Ausgabe', category: 'Sonstiges', amountCents: 100, note: 'Enthält; ein Semikolon' },
      { date: '2026-01-06', type: 'Ausgabe', category: 'Sonstiges', amountCents: 100, note: 'Sagt "Hallo"' },
    ])
    const lines = csv.split('\r\n')
    expect(lines[1]).toContain('"Enthält; ein Semikolon"')
    expect(lines[2]).toContain('"Sagt ""Hallo"""')
  })

  it('returns just the header for an empty transaction list', () => {
    expect(buildTransactionsCsv([])).toBe('Datum;Typ;Kategorie;Betrag (EUR);Notiz')
  })
})
