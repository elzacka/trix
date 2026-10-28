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
  for (const chunk of combo.trim().split(/\s+/)) {
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

/** «ctrl shift S eller F1» → ['Ctrl+Shift+S', 'F1'] on Windows, ['⌃⇧S', 'F1'] on a Mac. */
export function formatKeys(text, os) {
  return text
    .split(/\s+eller\s+/i)
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
    const [title, first = '', second] = item[1].split(/\s*\|\s*/)
    const keys = second === undefined ? first : os === 'mac' ? second : first
    if (second !== undefined && !keys) continue
    if (!sections.length) sections.push({ title: '', items: [] })
    sections.at(-1).items.push({ title: title.trim(), keys: formatKeys(keys, os) })
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
        const text = [s.title, item.title, ...item.keys].join(' ').toLocaleLowerCase('nb')
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
