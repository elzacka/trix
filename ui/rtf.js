// RTF (TextEdit, WordPad, Word): groups, control words and text, read in one pass.

// Groups whose text is not content; `\*` marks others, unknown ones included.
const SKIP = new Set([
  'fonttbl', 'colortbl', 'info', 'pict', 'object', 'header', 'headerl', 'headerr', 'headerf', 'footer', 'footerl', 'footerr',
  'footerf', 'footnote', 'annotation', 'listtable', 'listoverridetable', 'rsidtbl', 'generator', 'themedata', 'pn',
  'colorschememapping', 'latentstyles', 'datastore', 'xmlnstbl', 'mmathPr', 'expandedcolortbl', 'shp', 'nonshppict',
])

const SYMBOLS = {
  emdash: '—', endash: '–', bullet: '•', lquote: '‘', rquote: '’', ldblquote: '“', rdblquote: '”',
  emspace: ' ', enspace: ' ', qmspace: ' ', tab: ' ', line: ' ',
}

function decoder(page) {
  try {
    return new TextDecoder(page === 65001 ? 'utf-8' : `windows-${page}`)
  } catch {
    return new TextDecoder('windows-1252')
  }
}

/** The document as blocks for `toMarkdown`; not RTF: throws. */
export function readRtf(bytes) {
  let start = 0
  while (start < bytes.length && (bytes[start] <= 0x20 || bytes[start] >= 0xef)) start++
  const text = String.fromCharCode(...bytes.subarray(start, start + 5))
  if (text !== '{\\rtf') throw new Error('Ikke en RTF-fil')

  let decode = decoder(1252)
  const blocks = []
  // Heading level per style number, read from the stylesheet; -1 is the title.
  const styles = new Map()
  let para = { style: 0, outline: 0, list: false, marker: null, table: false }
  let runs = []
  let pending = []
  let row = null
  let cell = []
  let table = null
  let state = { bold: false, italic: false, skip: false, uc: 1, href: undefined, field: null, collect: null, dest: '' }
  const stack = []
  let skipChars = 0

  const flushBytes = () => {
    if (!pending.length) return
    const text = decode.decode(new Uint8Array(pending), { stream: true })
    pending = []
    addText(text)
  }
  const addText = text => {
    if (state.collect) state.collect.text += text
    else if (!state.skip) (para.table ? cell : runs).push({ text, bold: state.bold, italic: state.italic, href: state.href })
  }
  const endTable = () => {
    if (table?.length) blocks.push({ type: 'table', rows: table })
    table = null
  }
  const endParagraph = () => {
    flushBytes()
    if (para.table) {
      cell.push({ text: ' ' })
      return
    }
    endTable()
    const level = para.outline || (styles.get(para.style) ?? 0)
    if (level === -1) {
      runs = []
      return
    }
    if (level) blocks.push({ type: 'heading', level, runs })
    else if (para.list || para.marker != null) blocks.push({ type: 'item', ordered: /\d|^[a-z][.)]/i.test(para.marker ?? ''), runs })
    else blocks.push({ type: 'paragraph', runs })
    runs = []
    para.marker = null
  }

  const word = (name, param) => {
    if (state.collect || state.skip) {
      // Inside skipped or collected text only characters count; `\pard` in `\listtext` must not reset the paragraph.
      if (name === 'u') {
        flushBytes()
        addText(String.fromCharCode(param < 0 ? param + 65536 : param))
        skipChars = state.uc
      } else if (name === 's' && state.dest === 'style') state.collect.style = param ?? 0
      else if (name === 'outlinelevel' && state.dest === 'style') state.collect.outline = (param ?? 0) + 1
      return
    }
    flushBytes()
    const flag = param == null || param !== 0
    switch (name) {
      case 'ansicpg': decode = decoder(param); break
      case 'par': endParagraph(); break
      case 'pard': Object.assign(para, { style: 0, outline: 0, list: false, table: false }); break
      case 'plain': Object.assign(state, { bold: false, italic: false }); break
      case 'b': state.bold = flag; break
      case 'i': state.italic = flag; break
      case 'uc': state.uc = param ?? 1; break
      case 'u': addText(String.fromCharCode(param < 0 ? param + 65536 : param)); skipChars = state.uc; break
      case 's': para.style = param ?? 0; break
      case 'outlinelevel': para.outline = (param ?? 0) + 1; break
      case 'ls': para.list = true; break
      case 'intbl': para.table = true; break
      case 'cell': case 'nestcell':
        row ??= []
        row.push(cell)
        cell = []
        break
      case 'row': case 'nestrow':
        if (row) (table ??= []).push(row)
        row = null
        break
      case 'field': state.field = { href: undefined }; break
      case 'fldrslt': state.href = state.field?.href; break
      default:
        if (SYMBOLS[name]) addText(SYMBOLS[name])
    }
  }

  /** A group's first control word may make it a destination: skipped, collected or read as styles. */
  const destination = (name, param, ignorable) => {
    if (name === 'stylesheet') return Object.assign(state, { skip: true, dest: 'stylesheet' })
    if (state.dest === 'stylesheet') return Object.assign(state, { collect: { text: '', style: name === 's' ? param ?? 0 : 0, outline: 0 }, dest: 'style' })
    if (name === 'fldinst') return Object.assign(state, { collect: { text: '' }, dest: 'fldinst' })
    if (name === 'listtext' || name === 'pntext') return Object.assign(state, { collect: { text: '' }, dest: 'marker' })
    if (ignorable || SKIP.has(name)) return Object.assign(state, { skip: true, collect: null, dest: name })
  }

  const endGroup = () => {
    flushBytes()
    const { dest, collect } = state
    state = stack.pop() ?? state
    if (dest === 'fldinst' && state.field) state.field.href = collect.text.match(/HYPERLINK\s+"([^"]+)"/)?.[1]
    else if (dest === 'marker') para.marker = collect.text.trim()
    else if (dest === 'style') {
      const name = collect.text.replace(/;\s*$/, '').trim()
      const heading = name.match(/^(?:heading|overskrift)\s*(\d)$/i)
      const level = collect.outline || (heading ? Number(heading[1]) : /^title$/i.test(name) ? -1 : 0)
      if (level) styles.set(collect.style, level)
    }
  }

  let groupStart = false
  let ignorable = false
  let at = start
  while (at < bytes.length) {
    const c = bytes[at]
    if (c === 0x7b) {
      flushBytes()
      stack.push(state)
      state = { ...state, dest: state.dest === 'stylesheet' ? 'stylesheet' : '' }
      groupStart = true
      at++
      continue
    }
    if (c === 0x7d) {
      endGroup()
      groupStart = false
      at++
      continue
    }
    if (c === 0x5c) {
      const next = bytes[at + 1]
      if ((next >= 0x61 && next <= 0x7a) || (next >= 0x41 && next <= 0x5a)) {
        let end = at + 1
        while (end < bytes.length && end - at <= 32 && ((bytes[end] >= 0x61 && bytes[end] <= 0x7a) || (bytes[end] >= 0x41 && bytes[end] <= 0x5a))) end++
        const name = String.fromCharCode(...bytes.subarray(at + 1, end))
        let numberEnd = end
        if (bytes[numberEnd] === 0x2d) numberEnd++
        while (numberEnd < bytes.length && bytes[numberEnd] >= 0x30 && bytes[numberEnd] <= 0x39 && numberEnd - end < 11) numberEnd++
        const param = numberEnd > end && bytes[numberEnd - 1] !== 0x2d ? Number(String.fromCharCode(...bytes.subarray(end, numberEnd))) : null
        at = numberEnd > end && param != null ? numberEnd : end
        if (bytes[at] === 0x20) at++
        if (name === 'bin') {
          at += Math.max(param ?? 0, 0)
          continue
        }
        if (groupStart) {
          groupStart = false
          if (destination(name, param, ignorable)) {
            ignorable = false
            continue
          }
        }
        ignorable = false
        if (skipChars && name !== 'u') skipChars = 0
        word(name, param)
        continue
      }
      at += 2
      if (next === 0x2a) {
        ignorable = true
        continue
      }
      groupStart = false
      if (next === 0x27) {
        const byte = parseInt(String.fromCharCode(bytes[at], bytes[at + 1]), 16)
        at += 2
        if (skipChars) skipChars--
        else if (!Number.isNaN(byte)) pending.push(byte)
      } else if (next === 0x0a || next === 0x0d) word('par')
      else if (next === 0x7b || next === 0x7d || next === 0x5c) {
        if (skipChars) skipChars--
        else pending.push(next)
      } else if (next === 0x7e) addText(' ')
      else if (next === 0x5f) addText('-')
      continue
    }
    at++
    groupStart = false
    if (c === 0x0a || c === 0x0d) continue
    if (skipChars) skipChars--
    else if (pending.push(c) > 0xffff) flushBytes()
  }
  flushBytes()
  if (runs.length) endParagraph()
  if (row?.length) (table ??= []).push(row)
  endTable()
  return blocks
}
