// Word (.docx): a zip of XML parts. Only the parts named here are read; macros, images and embedded objects never are.

export const PART_LIMIT = 20 * 1024 * 1024
const ENTRY_LIMIT = 1000

const u16 = (b, at) => b[at] | (b[at + 1] << 8)
const u32 = (b, at) => (u16(b, at) | (u16(b, at + 2) << 16)) >>> 0

/** Inflates raw deflate data, refusing more than `PART_LIMIT` bytes whatever the header claims. */
async function inflate(data) {
  const reader = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader()
  const chunks = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > PART_LIMIT) {
      await reader.cancel()
      throw new Error('En del av fila er for stor')
    }
    chunks.push(value)
  }
  const out = new Uint8Array(size)
  let at = 0
  for (const chunk of chunks) {
    out.set(chunk, at)
    at += chunk.length
  }
  return out
}

/** The named parts of a zip as text, by name; a missing part is left out. Not a zip: throws. */
export async function unzip(bytes, names) {
  let end = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (u32(bytes, i) === 0x06054b50) { end = i; break }
  }
  if (end < 0) throw new Error('Ikke en zip-fil')
  const count = u16(bytes, end + 10)
  if (count > ENTRY_LIMIT) throw new Error('For mange deler i fila')
  const parts = {}
  let at = u32(bytes, end + 16)
  for (let n = 0; n < count; n++) {
    if (u32(bytes, at) !== 0x02014b50) throw new Error('Ødelagt zip-fil')
    const method = u16(bytes, at + 10)
    const size = u32(bytes, at + 20)
    const nameLength = u16(bytes, at + 28)
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLength))
    const local = u32(bytes, at + 42)
    at += 46 + nameLength + u16(bytes, at + 30) + u16(bytes, at + 32)
    if (!names.includes(name)) continue
    if (u32(bytes, local) !== 0x04034b50) throw new Error('Ødelagt zip-fil')
    const start = local + 30 + u16(bytes, local + 26) + u16(bytes, local + 28)
    const data = bytes.subarray(start, start + size)
    if (method === 0 && size > PART_LIMIT) throw new Error('En del av fila er for stor')
    if (method !== 0 && method !== 8) throw new Error(`Ukjent komprimering i ${name}`)
    parts[name] = new TextDecoder().decode(method === 0 ? data : await inflate(data))
  }
  return parts
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

function decode(text) {
  return text.replace(/&(\w+|#\d+|#x[\da-f]+);/gi, (all, name) => {
    if (name[0] !== '#') return ENTITIES[name] ?? all
    const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : Number(name.slice(1))
    return code <= 0x10ffff ? String.fromCodePoint(code) : ''
  })
}

/** `name="value"` pairs; Office writes double quotes only. indexOf keeps it linear on any input. */
function attributes(body) {
  const attrs = {}
  let at = 0
  for (;;) {
    const eq = body.indexOf('=', at)
    const open = eq < 0 ? -1 : body.indexOf('"', eq)
    const close = open < 0 ? -1 : body.indexOf('"', open + 1)
    if (close < 0) return attrs
    attrs[body.slice(at, eq).trim()] = decode(body.slice(open + 1, close))
    at = close + 1
  }
}

/** XML as a tree of `{ name, attrs, children }` and strings. No DTD, no entities beyond the five and numeric ones. */
export function parseXml(text) {
  const root = { name: '', attrs: {}, children: [] }
  const stack = [root]
  let at = 0
  while (at < text.length) {
    const open = text.indexOf('<', at)
    if (open < 0 || open > at) stack.at(-1).children.push(decode(text.slice(at, open < 0 ? text.length : open)))
    if (open < 0) break
    const comment = text.startsWith('<!--', open)
    const close = comment ? text.indexOf('-->', open) : text.indexOf('>', open)
    if (close < 0) break
    at = close + (comment ? 3 : 1)
    const tag = text.slice(open + 1, close)
    if (comment || tag[0] === '?' || tag[0] === '!') continue
    if (tag[0] === '/') {
      // Only the open element closes: a stray end tag cannot unwind the tree.
      if (stack.length > 1 && stack.at(-1).name === tag.slice(1).trim()) stack.pop()
      continue
    }
    const self = tag.endsWith('/')
    const body = self ? tag.slice(0, -1) : tag
    const space = body.search(/\s/)
    const node = { name: space < 0 ? body : body.slice(0, space), attrs: space < 0 ? {} : attributes(body.slice(space)), children: [] }
    stack.at(-1).children.push(node)
    if (!self) stack.push(node)
  }
  return root
}

export const elements = (node, name) => node.children.filter(c => typeof c !== 'string' && (!name || c.name === name))
export const child = (node, name) => node?.children.find(c => c.name === name)
export const textOf = node => node.children.map(c => (typeof c === 'string' ? c : textOf(c))).join('')
/** The document element, past the prolog and any whitespace. */
export const rootOf = xml => elements(parseXml(xml ?? ''))[0] ?? { name: '', attrs: {}, children: [] }

const on = node => node && !['0', 'false', 'off'].includes(node.attrs['w:val'])

/** Heading level and list format per style id, following `basedOn`. */
function readStyles(xml) {
  const styles = new Map()
  for (const s of elements(rootOf(xml), 'w:style')) {
    const name = child(s, 'w:name')?.attrs['w:val'] ?? ''
    const pPr = child(s, 'w:pPr')
    const heading = name.match(/^(?:heading|overskrift)\s*(\d)$/i)
    const outline = child(pPr, 'w:outlineLvl')?.attrs['w:val']
    styles.set(s.attrs['w:styleId'], {
      level: heading ? Number(heading[1]) : outline != null && Number(outline) < 9 ? Number(outline) + 1 : 0,
      title: /^title$/i.test(name),
      numId: child(child(pPr, 'w:numPr'), 'w:numId')?.attrs['w:val'],
      basedOn: child(s, 'w:basedOn')?.attrs['w:val'],
    })
  }
  const resolve = (id, key, depth = 0) => {
    const style = styles.get(id)
    if (!style || depth > 10) return undefined
    return style[key] || resolve(style.basedOn, key, depth + 1)
  }
  return resolve
}

/** Ordered or not per list and level; `none` is no list. */
function readNumbering(xml) {
  const root = rootOf(xml)
  const abstract = new Map(elements(root, 'w:abstractNum').map(a => [a.attrs['w:abstractNumId'],
    new Map(elements(a, 'w:lvl').map(l => [l.attrs['w:ilvl'], child(l, 'w:numFmt')?.attrs['w:val'] ?? 'decimal']))]))
  const nums = new Map(elements(root, 'w:num').map(n => [n.attrs['w:numId'], abstract.get(child(n, 'w:abstractNumId')?.attrs['w:val'])]))
  return (numId, level) => (numId && numId !== '0' ? nums.get(numId)?.get(level ?? '0') ?? 'bullet' : 'none')
}

function readRels(xml) {
  const root = rootOf(xml)
  return new Map(elements(root, 'Relationship').map(r => [r.attrs.Id, r.attrs.Target]))
}

/** Runs of a paragraph, through links, insertions, content controls and fields; deleted text left out. */
function runs(paragraph, rels) {
  const out = []
  let field = null
  const walk = (node, href) => {
    for (const c of elements(node)) {
      if (c.name === 'w:r') run(c, href)
      else if (c.name === 'w:hyperlink') walk(c, rels.get(c.attrs['r:id']) ?? href)
      else if (['w:ins', 'w:smartTag', 'w:customXml', 'w:fldSimple', 'w:sdt', 'w:sdtContent'].includes(c.name)) walk(c, href)
    }
  }
  const run = (r, href) => {
    const rPr = child(r, 'w:rPr')
    const style = { bold: !!on(child(rPr, 'w:b')), italic: !!on(child(rPr, 'w:i')) }
    for (const c of elements(r)) {
      if (c.name === 'w:fldChar') {
        const type = c.attrs['w:fldCharType']
        if (type === 'begin') field = { code: '', result: false }
        else if (type === 'separate' && field) field.result = true
        else if (type === 'end') field = null
      } else if (c.name === 'w:instrText' && field) field.code += textOf(c)
      else if (field && !field.result) continue
      else if (c.name === 'w:t') out.push({ text: textOf(c), ...style, href: field?.code.match(/HYPERLINK\s+"([^"]+)"/)?.[1] ?? href })
      else if (['w:tab', 'w:br', 'w:cr'].includes(c.name)) out.push({ text: ' ', ...style, href })
      else if (c.name === 'w:noBreakHyphen') out.push({ text: '-', ...style, href })
    }
  }
  walk(paragraph)
  return out
}

/** The document body as blocks for `toMarkdown`. */
export async function readDocx(bytes) {
  const parts = await unzip(bytes, ['word/document.xml', 'word/styles.xml', 'word/numbering.xml', 'word/_rels/document.xml.rels'])
  if (!parts['word/document.xml']) throw new Error('Ikke et Word-dokument')
  const style = readStyles(parts['word/styles.xml'])
  const format = readNumbering(parts['word/numbering.xml'])
  const rels = readRels(parts['word/_rels/document.xml.rels'])
  const body = child(child(parseXml(parts['word/document.xml']), 'w:document'), 'w:body')
  if (!body) throw new Error('Ikke et Word-dokument')
  const blocks = []
  const paragraph = p => {
    const pPr = child(p, 'w:pPr')
    const id = child(pPr, 'w:pStyle')?.attrs['w:val']
    if (style(id, 'title')) return
    const outline = child(pPr, 'w:outlineLvl')?.attrs['w:val']
    const level = outline != null && Number(outline) < 9 ? Number(outline) + 1 : style(id, 'level')
    const numPr = child(pPr, 'w:numPr')
    const list = format(child(numPr, 'w:numId')?.attrs['w:val'] ?? style(id, 'numId'), child(numPr, 'w:ilvl')?.attrs['w:val'])
    const r = runs(p, rels)
    if (level) blocks.push({ type: 'heading', level, runs: r })
    else if (list !== 'none') blocks.push({ type: 'item', ordered: list !== 'bullet', runs: r })
    else blocks.push({ type: 'paragraph', runs: r })
  }
  const cellRuns = node => elements(node).flatMap(c =>
    c.name === 'w:p' ? [...runs(c, rels), { text: ' ' }] : ['w:tbl', 'w:tr', 'w:tc', 'w:sdt', 'w:sdtContent'].includes(c.name) ? cellRuns(c) : [])
  const walk = node => {
    for (const c of elements(node)) {
      if (c.name === 'w:p') paragraph(c)
      else if (c.name === 'w:tbl') {
        blocks.push({ type: 'table', rows: elements(c, 'w:tr').map(tr => elements(tr, 'w:tc').map(cellRuns)) })
      } else if (c.name === 'w:sdt' || c.name === 'w:sdtContent') walk(c)
    }
  }
  walk(body)
  return blocks
}
