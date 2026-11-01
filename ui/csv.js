// CSV as one table: comma, semicolon (Norwegian Excel) or tab, and quoted fields.

import { CELL_LIMIT } from './docx.js'

/** UTF-8, or Windows-1252 as Excel saves «CSV (semikolondelt)» on Windows. */
function decode(bytes) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

/** Blocks for `toMarkdown`: a heading with `title` and the table. */
export function readCsv(bytes, title) {
  const text = decode(bytes)
  // The first line, as far as needed to tell the separator.
  const first = text.slice(0, Math.min(text.search(/\r?\n|$/), 65536)).replace(/"[^"]*"/g, '')
  const separator = [';', '\t', ','].reduce((best, s) => (first.split(s).length > first.split(best).length ? s : best), ',')
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  let cells = 0
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"' && !field) quoted = true
    else if (c === separator) {
      // Counted while reading: one long row of separators would otherwise fill memory first.
      if (++cells > CELL_LIMIT) throw new Error('For mange celler')
      row.push(field)
      field = ''
    }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      if (++cells > CELL_LIMIT) throw new Error('For mange celler')
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field || row.length) rows.push([...row, field])
  const kept = rows.filter(r => r.some(f => f.trim()))
  if (!kept.length) return []
  return [{ type: 'heading', level: 1, runs: [{ text: title }] }, { type: 'table', rows: kept.map(r => r.map(f => [{ text: f.trim() }])) }]
}
