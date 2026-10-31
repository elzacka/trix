// Reads the two Markdown lists. Pure functions, so `node --test` runs them without the app.

const ALIASES = {
  ctrl: 'ctrl', control: 'ctrl', '⌃': 'ctrl',
  shift: 'shift', '⇧': 'shift',
  alt: 'alt', opt: 'alt', option: 'alt', '⌥': 'alt',
  cmd: 'cmd', command: 'cmd', '⌘': 'cmd',
  commandorcontrol: 'mod', cmdorctrl: 'mod', super: 'win',
  win: 'win', windows: 'win', '⊞': 'win',
  fn: 'fn',
  mellomrom: 'space', space: 'space',
  retur: 'enter', enter: 'enter', return: 'enter', '↩': 'enter',
  tab: 'tab', '⇥': 'tab',
  esc: 'esc', escape: 'esc', '⎋': 'esc',
  slett: 'backspace', backspace: 'backspace', '⌫': 'backspace',
  delete: 'delete', del: 'delete', '⌦': 'delete',
  venstre: 'left', left: 'left', arrowleft: 'left',
  høyre: 'right', right: 'right', arrowright: 'right',
  opp: 'up', up: 'up', arrowup: 'up',
  ned: 'down', down: 'down', arrowdown: 'down',
  comma: ',', period: '.', slash: '/', minus: '-', equal: '=',
}

const NAMES = {
  mac: {
    ctrl: '⌃', shift: '⇧', alt: '⌥', cmd: '⌘', win: 'Win', fn: 'fn', space: 'Mellomrom', enter: '↩',
    tab: '⇥', esc: 'Esc', backspace: '⌫', delete: '⌦', left: '←', right: '→', up: '↑', down: '↓',
  },
  windows: {
    ctrl: 'Ctrl', shift: 'Shift', alt: 'Alt', cmd: '⌘', win: 'Win', fn: 'Fn', space: 'Mellomrom',
    enter: 'Enter', tab: 'Tab', esc: 'Esc', backspace: 'Backspace', delete: 'Delete', left: '←',
    right: '→', up: '↑', down: '↓',
  },
}

const MAC_SYMBOLS = '⌘⇧⌥⌃'

function tokens(combo) {
  const out = []
  for (const chunk of combo.trim().split(/\s+/).filter(Boolean)) {
    const parts = chunk === '+' ? ['+'] : chunk.split(/\+(?=.)/).map(p => (p === '' ? '+' : p))
    for (let part of parts) {
      while (part.length > 1 && MAC_SYMBOLS.includes(part[0])) {
        out.push(part[0])
        part = part.slice(1)
      }
      if (part) out.push(part)
    }
  }
  return out
}

function keyName(token, os) {
  let id = ALIASES[token.toLowerCase()] ?? token
  if (id === 'mod') id = os === 'mac' ? 'cmd' : 'ctrl'
  const named = NAMES[os][id]
  if (named) return named
  const code = token.match(/^(?:key|digit)(\w)$/i)
  if (code) return code[1].toUpperCase()
  return token.length === 1 || /^f\d+$/i.test(token) ? token.toUpperCase() : token
}

const alternatives = text => text.split(/\s+eller\s+/i)
const QUOTED = /"([^"]+)"|«([^»]+)»/g

/** «"hold inne" ⌘W» → [{ text: 'hold inne' }, { keys: '⌘W' }]: quoted words stay text, the rest are keys. */
function keyParts(alternative, os) {
  const parts = []
  let at = 0
  for (const match of [...alternative.matchAll(QUOTED), { index: alternative.length, 0: '' }]) {
    const [keys] = formatKeys(alternative.slice(at, match.index), os)
    if (keys) parts.push({ keys })
    if (match[0]) parts.push({ text: match[1] ?? match[2] })
    at = match.index + match[0].length
  }
  return parts
}

/** «ctrl shift S eller F1» → ['Ctrl+Shift+S', 'F1'] on Windows, ['⌃⇧S', 'F1'] on a Mac. */
export function formatKeys(text, os) {
  return alternatives(text)
    .map(combo => tokens(combo).map(t => keyName(t, os)))
    .filter(names => names.length)
    .map(names => {
      if (os !== 'mac') return names.join('+')
      // Symbols stand together as in macOS menus; a word gets a space on each side.
      return names.reduce((all, name, i) => {
        const word = n => n.length > 1
        return i && (word(name) || word(names[i - 1])) ? `${all} ${name}` : all + name
      }, '')
    })
}

const MODIFIERS = ['ctrl', 'alt', 'shift', 'cmd', 'win', 'fn']

function keyId(token, os) {
  let id = ALIASES[token.toLowerCase()]
  if (id === 'mod' || token.toLowerCase() === 'mod') id = os === 'mac' ? 'cmd' : 'ctrl'
  if (id) return id
  const code = token.match(/^(?:key|digit)(\w)$/i)
  if (code) return code[1].toUpperCase()
  return token.length === 1 || /^f\d{1,2}$/i.test(token) ? token.toUpperCase() : null
}

/** One combination in a fixed order, so «⌘⇧4» and «shift cmd 4» are the same; null if it holds an unknown word. */
export function comboId(text, os) {
  const ids = tokens(text).map(t => keyId(t, os))
  if (!ids.length || ids.includes(null)) return null
  const keys = ids.filter(id => !MODIFIERS.includes(id))
  if (keys.length > 1) return null
  return [...MODIFIERS.filter(m => ids.includes(m)), ...keys].join(' ')
}

/** A search that reads as a combination: a modifier and one key, or an F key. */
export function lookupId(query, os) {
  const id = comboId(query, os)
  if (!id) return null
  const parts = id.split(' ')
  const key = parts.at(-1)
  return (parts.length > 1 && !MODIFIERS.includes(key)) || /^F\d+$/.test(id) ? id : null
}

/** The lines that use the combination. */
export function lookupShortcuts(sections, id) {
  return sections
    .map(s => ({ ...s, items: s.items.filter(item => item.combos.includes(id)) }))
    .filter(s => s.items.length)
}

function comments(lines) {
  let inside = false
  return lines.map(raw => {
    const line = raw.trim()
    if (inside || line.startsWith('<!--')) {
      inside = !line.includes('-->')
      return null
    }
    return line
  })
}

/** `## Group` and `- Name | keys` or `- Name | Windows keys | Mac keys`, in file order. */
export function parseShortcuts(text, os) {
  const sections = []
  for (const line of comments(text.split(/\r?\n/))) {
    if (line === null) continue
    if (/^##(?!#)/.test(line)) {
      sections.push({ title: line.replace(/^#+/, '').trim(), items: [] })
      continue
    }
    const item = line.match(/^[-*]\s+(.*)$/)
    if (!item) continue
    // `\|` is the character itself, as in Markdown tables
    const [title, first = '', second] = item[1].split(/\s*(?<!\\)\|\s*/).map(part => part.replace(/\\\|/g, '|'))
    const keys = second === undefined ? first : os === 'mac' ? second : first
    if (second !== undefined && !keys) continue
    if (!sections.length) sections.push({ title: '', items: [] })
    sections.at(-1).items.push({
      title: title.trim(),
      keys: alternatives(keys).map(k => keyParts(k, os)).filter(parts => parts.length),
      combos: alternatives(keys).map(k => comboId(k.replace(QUOTED, ' '), os)).filter(Boolean),
    })
  }
  return sections.filter(s => s.items.length)
}

/** Every word in the group, the name or the keys. */
export function filterShortcuts(sections, query) {
  const words = query.toLocaleLowerCase('nb').split(/\s+/).filter(Boolean)
  if (!words.length) return sections
  return sections
    .map(s => ({
      ...s,
      items: s.items.filter(item => {
        const text = [s.title, item.title, ...item.keys.flat().map(p => p.keys ?? p.text)].join(' ').toLocaleLowerCase('nb')
        return words.every(w => text.includes(w))
      }),
    }))
    .filter(s => s.items.length)
}

/** `## Group`, `### Entry`, text, `Også: a, b` and `#tag` lines, in file order. */
export function parseCheatSheet(text) {
  const sections = []
  let entry = null
  let paragraph = []
  const endParagraph = () => {
    if (entry && paragraph.length) entry.paragraphs.push(paragraph.join(' '))
    paragraph = []
  }
  for (const line of comments(text.split(/\r?\n/))) {
    if (line === null) continue
    if (/^###\s/.test(line)) {
      endParagraph()
      if (!sections.length) sections.push({ title: '', entries: [] })
      entry = { id: 0, title: line.slice(4).trim(), paragraphs: [], aliases: [], tags: [] }
      sections.at(-1).entries.push(entry)
    } else if (/^#{1,2}\s/.test(line)) {
      endParagraph()
      entry = null
      if (line.startsWith('##')) sections.push({ title: line.slice(3).trim(), entries: [] })
    } else if (!entry) {
      continue
    } else if (/^også:/i.test(line)) {
      endParagraph()
      entry.aliases.push(...line.slice(5).split(',').map(a => a.trim()).filter(Boolean))
    } else if (/^#[^\s#]/.test(line) && line.split(/\s+/).every(t => /^#[^\s#]/.test(t))) {
      endParagraph()
      entry.tags.push(...line.split(/\s+/).map(t => t.slice(1).toLocaleLowerCase('nb')))
    } else if (line) {
      paragraph.push(line)
    } else {
      endParagraph()
    }
  }
  endParagraph()
  let id = 0
  for (const s of sections) for (const e of s.entries) e.id = id++
  return sections.filter(s => s.entries.length)
}

const collator = new Intl.Collator('nb')

/** Groups A–Å with their lines A–Å; lines without a group stay first. In place. */
export function sortShortcuts(sections) {
  for (const s of sections) s.items.sort((a, b) => collator.compare(a.title, b.title))
  return sections.sort((a, b) => (b.title === '') - (a.title === '') || collator.compare(a.title, b.title))
}

/** One section per first letter, A–Å. */
export function alphabetical(sections) {
  const groups = new Map()
  for (const e of sections.flatMap(s => s.entries).sort((a, b) => collator.compare(a.title, b.title))) {
    const letter = e.title.charAt(0).toLocaleUpperCase('nb')
    if (!groups.has(letter)) groups.set(letter, [])
    groups.get(letter).push(e)
  }
  return [...groups].map(([title, entries]) => ({ title, entries }))
}

/** One letter: titles that start with it. Otherwise every word, titles first. Tags narrow both. */
export function searchCheatSheet(sections, query, tags = []) {
  const all = sections.flatMap(s => s.entries).filter(e => tags.every(t => e.tags.includes(t)))
  const q = query.trim().toLocaleLowerCase('nb')
  if (q.length === 1) {
    return all
      .filter(e => e.title.toLocaleLowerCase('nb').startsWith(q))
      .sort((a, b) => collator.compare(a.title, b.title))
  }
  const words = q.split(/\s+/)
  const rank = e => {
    const title = e.title.toLocaleLowerCase('nb')
    if (title.startsWith(q)) return 0
    if (title.includes(q)) return 1
    if (e.aliases.some(a => a.toLocaleLowerCase('nb').includes(q))) return 2
    return 3
  }
  return all
    .filter(e => {
      const text = [e.title, ...e.aliases, ...e.tags, ...e.paragraphs].join(' ').toLocaleLowerCase('nb')
      return words.every(w => text.includes(w))
    })
    .map(e => [rank(e), e])
    .sort((a, b) => a[0] - b[0])
    .map(([, e]) => e)
}

/** **bold**, *italic*, `code` and [text](url) as segments; everything else is plain text. */
export function inline(text) {
  const out = []
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g
  let last = 0
  for (const m of text.matchAll(pattern)) {
    if (m.index > last) out.push({ type: 'text', text: text.slice(last, m.index) })
    if (m[1]) out.push({ type: 'strong', text: m[1] })
    else if (m[2]) out.push({ type: 'em', text: m[2] })
    else if (m[3]) out.push({ type: 'code', text: m[3] })
    else out.push({ type: 'link', text: m[4], href: m[5] })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) })
  return out
}

/** The text without Markdown marks, for the one-line preview. */
export function plain(text) {
  return inline(text).map(s => s.text).join('')
}

/** Groups and their item lines with the line numbers they end at; outside the format comment. */
function shortcutBlocks(lines) {
  const groups = []
  comments(lines).forEach((line, i) => {
    if (line === null) return
    if (/^##(?!#)/.test(line)) groups.push({ title: line.replace(/^#+/, '').trim(), heading: i, end: i, items: [] })
    const item = line.match(/^[-*]\s+(.*)$/)
    if (!item) return
    if (!groups.length) groups.push({ title: '', heading: -1, end: i, items: [] })
    const group = groups.at(-1)
    group.items.push({ name: item[1].split(/\s*(?<!\\)\|/)[0].trim().toLocaleLowerCase('nb'), lines: [line] })
    group.end = i
  })
  return groups
}

/** Groups and their entries with all their lines, like `shortcutBlocks`. */
function cheatBlocks(lines) {
  const groups = []
  let entry = null
  comments(lines).forEach((line, i) => {
    if (line === null) return
    if (/^#{1,3}\s/.test(line)) entry = null
    if (/^##\s/.test(line)) groups.push({ title: line.slice(3).trim(), heading: i, end: i, items: [] })
    else if (/^###\s/.test(line)) {
      if (!groups.length) groups.push({ title: '', heading: -1, end: i, items: [] })
      entry = { name: line.slice(4).trim().toLocaleLowerCase('nb'), lines: [] }
      groups.at(-1).items.push(entry)
    }
    if (!entry) return
    entry.lines.push(line)
    if (line) groups.at(-1).end = i
  })
  for (const group of groups) for (const item of group.items) while (!item.lines.at(-1)) item.lines.pop()
  return groups
}

/** The current list with the imported groups and items it lacks; an item whose name is already in its group stays as it is. */
function merge(current, imported, blocks, gap) {
  const lines = current.replace(/\r\n/g, '\n').replace(/\n+$/, '').split('\n')
  const groups = blocks(lines)
  const after = new Map()
  const before = new Map()
  const added = []
  for (const group of blocks(imported.split(/\r?\n/))) {
    const key = group.title.toLocaleLowerCase('nb')
    const target = groups.find(g => g.title.toLocaleLowerCase('nb') === key)
    const names = new Set(target?.items.map(i => i.name))
    const fresh = group.items.filter(i => !names.has(i.name) && names.add(i.name)).flatMap(i => [...gap, ...i.lines])
    if (!fresh.length) continue
    if (target) after.set(target.end, [...(after.get(target.end) ?? []), ...fresh])
    // Items without a group stay above the first group, where the parser reads them as ungrouped.
    else if (!group.title && groups.length) before.set(groups[0].heading, [...fresh.slice(gap.length), ''])
    else added.push('', ...(group.title ? [`## ${group.title}`, ''] : []), ...fresh.slice(gap.length))
  }
  const merged = lines.flatMap((line, i) => [...(before.get(i) ?? []), line, ...(after.get(i) ?? [])])
  return [...merged, ...added].join('\n').replace(/^\n+/, '') + '\n'
}

export const mergeShortcuts = (current, imported) => merge(current, imported, shortcutBlocks, [])

export const mergeCheatSheet = (current, imported) => merge(current, imported, cheatBlocks, [''])
