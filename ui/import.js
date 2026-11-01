// Imported files as a tab's Markdown. Pure functions, so `node --test` runs them without the app.

import { readDocx } from './docx.js'
import { readRtf } from './rtf.js'

export const IMPORT_TYPES = ['.md', '.markdown', '.txt', '.rtf', '.docx']

export const FILE_LIMIT = 50 * 1024 * 1024

/** The file's content as Markdown for `module`; throws when the file is not one the app reads. */
export async function importText(name, bytes, module) {
  if (bytes.length > FILE_LIMIT) throw new Error(`${name} er større enn 50 MB`)
  const type = name.toLowerCase().match(/\.[^.]*$/)?.[0]
  if (type === '.docx') return toMarkdown(await readDocx(bytes), module)
  if (type === '.rtf') return toMarkdown(readRtf(bytes), module)
  if (IMPORT_TYPES.includes(type)) return new TextDecoder().decode(bytes)
  throw new Error(`${name}: ukjent filtype`)
}

/** Runs as inline Markdown: bold or italic around the words, spaces outside; links http(s) only. */
function inline(runs) {
  const merged = []
  for (const run of runs) {
    const last = merged.at(-1)
    if (last && last.bold === run.bold && last.italic === run.italic && last.href === run.href) last.text += run.text
    else merged.push({ ...run })
  }
  return merged.map(({ text, bold, italic, href }) => {
    const [, before, words, after] = text.replace(/\s+/g, ' ').match(/^(\s*)(.*?)(\s*)$/)
    if (!words) return before + after
    let out = /^https?:\/\//i.test(href ?? '') && !/[\s)]/.test(href) ? `[${words}](${href})` : words
    if (bold) out = `**${out}**`
    else if (italic) out = `*${out}*`
    return before + out + after
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
function entries(blocks, levels) {
  const lines = []
  let number = 0
  for (const b of blocks) {
    if (b.type !== 'item') number = 0
    if (b.type === 'heading') lines.push('', `${'#'.repeat(levels === 1 ? 3 : Math.min(b.rank, 2) + 2)} ${plainText(b.runs)}`, '')
    else if (b.type === 'paragraph') lines.push('', inline(b.runs), '')
    else if (b.type === 'item') {
      lines.push(`${b.ordered ? `${++number}.` : '-'} ${inline(b.runs)}`)
      if (!b.ordered) number = 0
    } else if (b.type === 'table' && b.rows.length) {
      const width = Math.max(...b.rows.map(r => r.length))
      const row = r => `| ${Array.from({ length: width }, (_, i) => cell(inline(r[i] ?? []))).join(' | ')} |`
      lines.push('', row(b.rows[0]), `| ${Array(width).fill('---').join(' | ')} |`, ...b.rows.slice(1).map(row), '')
    }
  }
  return lines
}

/** Blocks from `readDocx` or `readRtf`: `heading` (level 1–), `paragraph`, `item` (ordered), `table` (rows of cells); text in runs. */
export function toMarkdown(blocks, module) {
  const kept = blocks.filter(b => b.type === 'table' || plainText(b.runs))
  // Levels count from the document's own top heading: a document may start at Overskrift 2.
  const levels = [...new Set(kept.filter(b => b.type === 'heading').map(b => b.level))].sort((a, b) => a - b)
  for (const b of kept) if (b.type === 'heading') b.rank = levels.indexOf(b.level)
  const lines = module === 'hurtigtaster' ? shortcuts(kept) : entries(kept, levels.length)
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
