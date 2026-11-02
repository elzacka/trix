// Imported files as a tab's Markdown. Pure functions, so `node --test` runs them without the app.

import { readDocx } from './docx.js'
import { readRtf } from './rtf.js'
import { readXlsx } from './xlsx.js'
import { readCsv } from './csv.js'
import { inline, CELL_LIMIT } from './parse.js'

export const IMPORT_TYPES = ['.md', '.markdown', '.txt', '.rtf', '.docx', '.xlsx', '.csv']

export const FILE_LIMIT = 50 * 1024 * 1024
// Characters one import may write: a short file can repeat a link once per run.
const OUTPUT_LIMIT = 2 * FILE_LIMIT

const typeOf = name => name.toLowerCase().match(/\.[^.]*$/)?.[0]

/** A file the app reads, by name and size: checked before the file is read. */
export const importable = (name, size) => IMPORT_TYPES.includes(typeOf(name)) && size <= FILE_LIMIT

/** The file's content as Markdown for `module`; throws when the file is not one the app reads. */
export async function importText(name, bytes, module) {
  if (!importable(name, bytes.length)) throw new Error(`${name}: ukjent filtype eller større enn 50 MB`)
  const type = typeOf(name)
  if (type === '.docx') return toMarkdown(await readDocx(bytes), module)
  if (type === '.rtf') return toMarkdown(readRtf(bytes), module)
  // A sheet or a CSV file is an entry named after it, holding the table.
  const title = name.replace(/\.[^.]*$/, '')
  if (type === '.xlsx') return toMarkdown(await readXlsx(bytes, title), module)
  if (type === '.csv') return toMarkdown(readCsv(bytes, title), module)
  return new TextDecoder().decode(bytes)
}

/** A link the app shows as one, short enough that repeating it cannot blow up the text. */
function link(words, href) {
  const out = `[${words}](${href})`
  const parts = href?.length <= 2048 ? inline(out) : []
  return parts.length === 1 && parts[0].type === 'link' ? out : words
}

/** Runs as inline Markdown: bold or italic around the words, spaces outside; links as the app reads them, plain. */
function markdown(runs, spend) {
  const merged = []
  for (const run of runs) {
    // The app shows a link inside bold as text, and one link split by formatting repeats its address.
    const linked = /^https?:\/\//.test(run.href ?? '') && run.href.length <= 2048
    const r = linked ? { ...run, bold: false, italic: false } : { ...run, href: undefined }
    const last = merged.at(-1)
    if (last && last.bold === r.bold && last.italic === r.italic && last.href === r.href) last.text += r.text
    else merged.push({ ...r })
  }
  return merged.map(({ text, bold, italic, href }) => {
    const [, before, words, after] = text.replace(/\s+/g, ' ').match(/^(\s*)(.*?)(\s*)$/)
    if (!words) return before + after
    let out = link(words, href)
    if (bold) out = `**${out}**`
    else if (italic) out = `*${out}*`
    return spend(before + out + after)
  }).join('').trim()
}

const plainText = runs => runs.map(r => r.text).join('').replace(/\s+/g, ' ').trim()

const cell = text => text.replace(/\|/g, '\\|')

// A table's first row names its columns when it holds one of these words.
const COLUMN_NAMES = ['navn', 'handling', 'windows', 'mac', 'macos', 'taster', 'hurtigtast', 'hurtigtaster', 'snarvei']

/** `## Group` from the document's top two heading levels; `- Name | keys[ | Mac keys]` from table rows and lines already in that form. */
function shortcuts(blocks) {
  const lines = []
  for (const b of blocks) {
    if (b.type === 'heading' && b.rank <= 1) lines.push('', `## ${plainText(b.runs)}`, '')
    else if ((b.type === 'paragraph' || b.type === 'item') && /(?<!\\)\|/.test(plainText(b.runs))) lines.push(`- ${plainText(b.runs).replace(/^[-*]\s+/, '')}`)
    else if (b.type === 'table') {
      const rows = b.rows.map(row => row.map(plainText))
      if (rows[0]?.some(c => COLUMN_NAMES.includes(c.toLocaleLowerCase('nb')))) rows.shift()
      for (const [name, ...keys] of rows) {
        if (name && keys.some(Boolean)) lines.push(`- ${[name, ...keys.slice(0, 2)].map(cell).join(' | ')}`)
      }
    }
  }
  return lines
}

/** `##` groups, `###` entries, `####` sub-headings, paragraphs, lists and tables. One heading level in the document: entries. */
function entries(blocks, levels, spend) {
  const lines = []
  let number = 0
  for (const b of blocks) {
    if (b.type !== 'item') number = 0
    if (b.type === 'heading') lines.push('', `${'#'.repeat(levels === 1 ? 3 : Math.min(b.rank, 2) + 2)} ${plainText(b.runs)}`, '')
    else if (b.type === 'paragraph') lines.push('', markdown(b.runs, spend), '')
    else if (b.type === 'item') {
      lines.push(`${b.ordered ? `${++number}.` : '-'} ${markdown(b.runs, spend)}`)
      if (!b.ordered) number = 0
    } else if (b.type === 'table' && b.rows.length) {
      const width = widthOf(b)
      const row = r => `| ${Array.from({ length: width }, (_, i) => cell(markdown(r[i] ?? [], spend))).join(' | ')} |`
      // The header row is bold already; bold on top of it reads heavier and breaks words.
      const head = b.rows[0].map(runs => runs.map(r => ({ ...r, bold: false })))
      lines.push('', row(head), `| ${Array(width).fill('---').join(' | ')} |`, ...b.rows.slice(1).map(row), '')
    }
  }
  return lines
}

const widthOf = table => table.rows.reduce((max, r) => Math.max(max, r.length), 0)

/** Blocks from the readers: `heading` (level 1–), `paragraph`, `item` (ordered), `table` (rows of cells); text in runs. */
export function toMarkdown(blocks, module) {
  const kept = blocks.filter(b => b.type === 'table' || plainText(b.runs))
  const cells = kept.reduce((n, b) => n + (b.type === 'table' ? b.rows.length * widthOf(b) : 0), 0)
  if (cells > CELL_LIMIT) throw new Error('For mange celler')
  // Levels count from the document's own top heading: a document may start at Overskrift 2.
  const levels = [...new Set(kept.filter(b => b.type === 'heading').map(b => b.level))].sort((a, b) => a - b)
  for (const b of kept) if (b.type === 'heading') b.rank = levels.indexOf(b.level)
  let left = OUTPUT_LIMIT
  const spend = text => {
    left -= text.length
    if (left < 0) throw new Error('Fila er for stor')
    return text
  }
  const lines = module === 'hurtigtaster' ? shortcuts(kept) : entries(kept, levels.length, spend)
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

/** The tab's content with its body replaced; its title and top comment stay unless the import brings its own. */
export function replaceContent(current, imported) {
  if (/^\s*(#\s|<!--)/.test(imported)) return imported
  const lines = current.replace(/\r\n/g, '\n').split('\n')
  let inside = false
  let end = 0
  for (const [i, raw] of lines.entries()) {
    const line = raw.trim()
    if (inside || line.startsWith('<!--')) inside = !line.includes('-->')
    else if (line && !/^#\s/.test(line)) break
    end = i + 1
  }
  const head = lines.slice(0, end).join('\n').trim()
  return head ? `${head}\n\n${imported}` : imported
}
