// Excel (.xlsx): each visible sheet as a heading and a table. Values as Excel shows them, close enough to read.

import { unzip, rootOf, elements, child, textOf, budget, ENTRY_LIMIT } from './docx.js'

const MAIN = ['xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/sharedStrings.xml', 'xl/styles.xml']

// Excel's built-in date and percent formats, by id.
const DATE_IDS = new Set([14, 15, 16, 17, 22, 27, 30, 36, 45, 46, 47, 50, 57])
const PERCENT_IDS = new Set([9, 10])

/** `../x` and `/xl/x` as a path in the zip, from a part in `base`. */
function resolve(base, target) {
  if (target.startsWith('/')) return target.slice(1)
  const parts = base.split('/').slice(0, -1)
  for (const step of target.split('/')) step === '..' ? parts.pop() : parts.push(step)
  return parts.join('/')
}

const rels = (xml, base) => new Map(elements(rootOf(xml), 'Relationship').map(r => [r.attrs.Id, { target: resolve(base, r.attrs.Target ?? ''), external: r.attrs.TargetMode === 'External', href: r.attrs.Target }]))

const on = node => node && !['0', 'false'].includes(node.attrs.val)

/** Runs of a shared or inline string: rich text keeps bold and italic. */
function stringRuns(si) {
  const runs = elements(si, 'r')
  if (!runs.length) return [{ text: textOf(child(si, 't') ?? { children: [] }) }]
  return runs.map(r => {
    const rPr = child(r, 'rPr')
    return { text: textOf(child(r, 't') ?? { children: [] }), bold: !!on(child(rPr, 'b')), italic: !!on(child(rPr, 'i')) }
  })
}

/** Per cell style: bold, italic, and whether the number is a date or a percent. */
function readStyles(xml) {
  const root = rootOf(xml)
  const formats = new Map(elements(child(root, 'numFmts') ?? { children: [] }, 'numFmt').map(f => [Number(f.attrs.numFmtId), f.attrs.formatCode ?? '']))
  const fonts = elements(child(root, 'fonts') ?? { children: [] }, 'font').map(f => ({ bold: !!on(child(f, 'b')), italic: !!on(child(f, 'i')) }))
  return elements(child(root, 'cellXfs') ?? { children: [] }, 'xf').map(xf => {
    const id = Number(xf.attrs.numFmtId ?? 0)
    // A custom code is a date or a time when it has d, m or y outside quotes and brackets.
    const code = (formats.get(id) ?? '').replace(/"[^"]*"|\[[^\]]*\]/g, '')
    return {
      ...fonts[Number(xf.attrs.fontId ?? 0)],
      date: DATE_IDS.has(id) || /[dmy]/i.test(code),
      percent: PERCENT_IDS.has(id) || code.includes('%'),
    }
  })
}

const pad = n => String(n).padStart(2, '0')

/** A number as Norwegian Excel shows it: decimal comma, dates as 19.09.2026. */
function number(value, style) {
  const n = Number(value)
  if (!Number.isFinite(n)) return value
  if (style?.date && n > 0 && n < 2958466) {
    const date = new Date(Math.round((n - 25569) * 86400000))
    const day = `${pad(date.getUTCDate())}.${pad(date.getUTCMonth() + 1)}.${date.getUTCFullYear()}`
    const time = n % 1 ? ` ${pad(date.getUTCHours())}.${pad(date.getUTCMinutes())}` : ''
    return n < 1 ? time.trim() : day + time
  }
  const shown = style?.percent ? `${Number((n * 100).toPrecision(15))} %` : String(Number(n.toPrecision(15)))
  return shown.replace('.', ',')
}

/** `B12` → column 1. */
function column(ref) {
  let n = 0
  for (const c of ref.match(/^[A-Z]+/)?.[0] ?? '') n = n * 26 + c.charCodeAt(0) - 64
  return n - 1
}

/** The sheet's cells as rows of runs; empty rows and columns left out. */
function readSheet(xml, sheetRels, strings, styles, limits) {
  const data = child(rootOf(xml), 'sheetData')
  if (!data) return []
  const links = new Map()
  for (const h of elements(child(rootOf(xml), 'hyperlinks') ?? { children: [] }, 'hyperlink')) {
    const rel = sheetRels.get(h.attrs['r:id'])
    if (rel?.external) links.set(h.attrs.ref, rel.href)
  }
  const rows = []
  const used = new Set()
  for (const row of elements(data, 'row')) {
    const cells = new Map()
    let next = 0
    for (const c of elements(row, 'c')) {
      const at = c.attrs.r ? column(c.attrs.r) : next
      next = at + 1
      const style = styles[Number(c.attrs.s ?? 0)]
      const value = textOf(child(c, 'v') ?? { children: [] })
      const type = c.attrs.t
      let runs
      if (type === 's') {
        runs = (strings[Number(value)] ?? []).map(r => ({ ...r }))
        // One shared string can fill many cells: each use counts, as if unpacked again.
        limits.bytes -= runs.reduce((n, r) => n + r.text.length, 0)
        if (limits.bytes < 0) throw new Error('Fila er for stor')
      }
      else if (type === 'inlineStr') runs = stringRuns(child(c, 'is') ?? { children: [] })
      else if (type === 'b') runs = [{ text: value === '1' ? 'SANN' : 'USANN' }]
      else if (type === 'str' || type === 'e') runs = [{ text: value }]
      else runs = value ? [{ text: number(value, style) }] : []
      if (!runs.some(r => r.text.trim())) continue
      const href = links.get(c.attrs.r)
      cells.set(at, runs.map(r => ({ ...r, bold: r.bold || style?.bold, italic: r.italic || style?.italic, href })))
      used.add(at)
    }
    if (cells.size) rows.push(cells)
  }
  const columns = [...used].sort((a, b) => a - b)
  limits.cells -= rows.length * columns.length
  if (limits.cells < 0) throw new Error('For mange celler')
  return rows.map(cells => columns.map(i => cells.get(i) ?? []))
}

/** Blocks for `toMarkdown`: per visible sheet a heading, its name or `title` when there is one sheet, and its table. */
export async function readXlsx(bytes, title) {
  const limits = budget()
  const parts = await unzip(bytes, MAIN, limits)
  if (!parts['xl/workbook.xml']) throw new Error('Ikke en Excel-fil')
  const book = rels(parts['xl/_rels/workbook.xml.rels'], 'xl/workbook.xml')
  const strings = elements(rootOf(parts['xl/sharedStrings.xml']), 'si').map(stringRuns)
  const styles = readStyles(parts['xl/styles.xml'])
  const seen = new Set()
  const sheets = elements(child(rootOf(parts['xl/workbook.xml']), 'sheets') ?? { children: [] }, 'sheet')
    .filter(s => !s.attrs.state || s.attrs.state === 'visible')
    .map(s => ({ name: s.attrs.name ?? '', path: book.get(s.attrs['r:id'])?.target }))
    // One table per part: many sheet entries may point at the same one.
    .filter(s => s.path && !seen.has(s.path) && seen.add(s.path))
    .slice(0, ENTRY_LIMIT)
  const relsPath = path => path.replace(/([^/]+)$/, '_rels/$1.rels')
  const sheetParts = await unzip(bytes, sheets.flatMap(s => [s.path, relsPath(s.path)]), limits)
  const blocks = []
  for (const s of sheets) {
    const rows = readSheet(sheetParts[s.path] ?? '', rels(sheetParts[relsPath(s.path)], s.path), strings, styles, limits)
    if (!rows.length) continue
    blocks.push({ type: 'heading', level: 1, runs: [{ text: sheets.length === 1 ? title : s.name }] }, { type: 'table', rows })
  }
  return blocks
}
