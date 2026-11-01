// Reads the setup and the lists. Pure functions, so `node --test` runs them without the app.

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

/** `## Group`, `### Entry`, then its blocks, `Også: a, b` and `#tag` lines, in file order. */
export function parseEntries(text) {
  const sections = []
  let entry = null
  let paragraph = []
  const endParagraph = () => {
    if (entry && paragraph.length) entry.blocks.push({ type: 'p', text: paragraph.join(' ') })
    paragraph = []
  }
  const listItem = (type, item) => {
    endParagraph()
    const last = entry.blocks.at(-1)
    if (last?.type === type && !last.closed) last.items.push(item)
    else entry.blocks.push({ type, items: [item] })
  }
  const closeList = () => { const last = entry?.blocks.at(-1); if (last?.items) last.closed = true }
  for (const line of comments(text.split(/\r?\n/))) {
    if (line === null) continue
    if (/^###\s/.test(line)) {
      endParagraph()
      if (!sections.length) sections.push({ title: '', entries: [] })
      entry = { id: 0, title: line.slice(4).trim(), blocks: [], aliases: [], tags: [] }
      sections.at(-1).entries.push(entry)
    } else if (/^#{1,2}\s/.test(line)) {
      endParagraph()
      entry = null
      if (line.startsWith('##')) sections.push({ title: line.slice(3).trim(), entries: [] })
    } else if (!entry) {
      continue
    } else if (/^####+\s/.test(line)) {
      endParagraph()
      entry.blocks.push({ type: 'h', text: line.replace(/^#+/, '').trim() })
    } else if (/^også:/i.test(line)) {
      endParagraph()
      entry.aliases.push(...line.slice(5).split(',').map(a => a.trim()).filter(Boolean))
    } else if (/^#[^\s#]/.test(line) && line.split(/\s+/).every(t => /^#[^\s#]/.test(t))) {
      endParagraph()
      entry.tags.push(...line.split(/\s+/).map(t => t.slice(1).toLocaleLowerCase('nb')))
    } else if (/^[-*]\s/.test(line)) {
      listItem('ul', line.slice(2).trim())
    } else if (/^\d+[.)]\s/.test(line)) {
      listItem('ol', line.replace(/^\d+[.)]\s+/, ''))
    } else if (line) {
      closeList()
      paragraph.push(line)
    } else {
      endParagraph()
    }
  }
  endParagraph()
  let id = 0
  for (const s of sections) {
    for (const e of s.entries) {
      e.id = id++
      for (const b of e.blocks) delete b.closed
    }
  }
  return sections.filter(s => s.entries.length)
}

/** The entry's first paragraph, when nothing comes before it: a card's front, an article's lead. */
export function lead(entry) {
  return entry.blocks[0]?.type === 'p' ? entry.blocks[0].text : ''
}

const blockText = b => b.text ?? b.items.join(' ')

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
export function searchEntries(sections, query, tags = []) {
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
      const text = [e.title, ...e.aliases, ...e.tags, ...e.blocks.map(blockText)].join(' ').toLocaleLowerCase('nb')
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
function entryBlocks(lines) {
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

export const mergeEntries = (current, imported) => merge(current, imported, entryBlocks, [''])

// Setup: `Oppsett.md` decides the views, the menu, the colours, the fonts, the window and the texts.

export const KINDS = ['hurtigtaster', 'oppslag', 'kort', 'artikler']

export const OPTIONS = {
  hurtigtaster: ['søk', 'tasteoppslag', 'system', 'a–å'],
  oppslag: ['søk', 'emneknagger', 'a–å'],
  kort: ['søk', 'emneknagger', 'a–å'],
  artikler: ['søk', 'emneknagger', 'a–å'],
}

export const DEFAULT_OPTIONS = {
  hurtigtaster: ['søk', 'tasteoppslag'],
  oppslag: ['søk', 'emneknagger'],
  kort: ['søk', 'emneknagger'],
  artikler: ['søk', 'emneknagger'],
}

export const SETUP_FILE = 'Oppsett.md'

const DEFAULT_VIEWS = [
  { name: 'Hurtigtaster', kind: 'hurtigtaster', file: 'Hurtigtaster.md', options: ['søk', 'tasteoppslag', 'system'], placeholder: '' },
  { name: 'Oppslag', kind: 'oppslag', file: 'Oppslag.md', options: DEFAULT_OPTIONS.oppslag, placeholder: '' },
  { name: 'Kort', kind: 'kort', file: 'Kort.md', options: DEFAULT_OPTIONS.kort, placeholder: '' },
  { name: 'Artikler', kind: 'artikler', file: 'Artikler.md', options: DEFAULT_OPTIONS.artikler, placeholder: '' },
]

export const MENU = ['visning', 'kildedata', 'oppsett', 'hurtigåpner', 'avslutt', 'versjon', '---']

const DEFAULT_MENU = ['visning', 'kildedata', '---', 'oppsett', 'hurtigåpner', '---', 'avslutt', 'versjon']

/** Icon names in the setup; `menylinje` (tray) and `app` (window and taskbar) are PNG only. */
export const ICONS = ['logo', 'app', 'menylinje', 'meny', 'søk', 'tøm', 'tasteoppslag', 'tilbake', 'valgt', 'undermeny', 'fjern', 'snu']

export const PNG_ONLY = ['app', 'menylinje']

/** An image file in the data folder, as `data_file` in `main.rs` checks it. */
export const iconName = (name, kind) => /^[^\\/:*?"<>|.][^\\/:*?"<>|]*\.(svg|png)$/i.test(name) && (!PNG_ONLY.includes(kind) || /\.png$/i.test(name))

export const COLORS = ['bakgrunn', 'flate', 'linje', 'tekst', 'dempet', 'aksent', 'på aksent', 'forside', 'på forside', 'bakside', 'på bakside']

/** The setup's colour names as the stylesheet's tokens. */
export const TOKENS = {
  bakgrunn: 'bg', flate: 'surface', linje: 'line', tekst: 'text', dempet: 'muted', aksent: 'accent', 'på aksent': 'on-accent',
  forside: 'front', 'på forside': 'on-front', bakside: 'back', 'på bakside': 'on-back',
}

export const WINDOW = { bredde: [320, 1200], høyde: [400, 1000] }

export const FONT_PATTERN = /^[\p{L}\p{N} _-]+$/u

/** Panel: opens at the tray icon and hides on a click elsewhere. Vindu: a normal window in the Dock or taskbar. */
export const WINDOW_TYPES = ['panel', 'vindu']

export const FONT_SIZE = [12, 20]

export const TEXTS = {
  'navn': 'Trix Ultra',
  'visninger': 'Visninger',
  'flere valg': 'Flere valg',
  'søk': 'Søk',
  'tøm søk': 'Tøm søk',
  'slå opp': 'Slå opp hurtigtast',
  'trykk hurtigtasten': 'Trykk hurtigtasten …',
  'treff': '{antall} treff',
  'ingen treff': 'Ingen treff på «{søk}»',
  'ikke i lista': '{taster} er ikke i lista',
  'tom': 'Lista er tom',
  'vis alt': 'Vis alt',
  'merket': '{antall} merket',
  'fjern merke': 'Fjern {emne}',
  'også': 'Også',
  'tilbake': 'Tilbake',
  'mine hurtigtaster': 'Mine hurtigtaster',
  'systemets hurtigtaster': 'Hurtigtaster i {system}',
  'begge': 'Begge',
  'a–å': 'Sorter A–Å',
  'filrekkefølge': 'Rekkefølgen i kildefila',
  'visning': 'Visning',
  'kildedata': 'Kildedata {visning}',
  'rediger': 'Se og endre i fila',
  'eksporter': 'Eksporter',
  'importer': 'Importer …',
  'åpne mappe': 'Åpne kildemappe',
  'oppsett': 'Tilpass',
  'velg hurtigåpner': 'Velg hurtigåpner',
  'endre hurtigåpner': 'Endre hurtigåpner',
  'ny hurtigtast': 'Trykk ny hurtigtast …',
  'åpner': 'Åpner {navn}',
  'åpne': 'Åpne {navn}',
  'avslutt': 'Avslutt {navn}',
  'avbryt': 'Avbryt',
  'forkast': 'Forkast endringene',
  'lagre': 'Lagre',
  'endret utenfor': 'Fila er endret utenfor {navn}. Kopier endringene dine, avbryt og åpne fila på nytt.',
  'importspørsmål': 'Vil du slå fila sammen med lista di eller erstatte lista?',
  'erstatt': 'Erstatt',
  'slå sammen': 'Slå sammen',
  'passer ikke': '{fil} passer ikke i {visning}',
  'opptatt': 'En annen app bruker {taster}',
  'kan ikke bruke': '{navn} kan ikke bruke {taster}',
}

/** «Søk i {visning}» with the values it names; a name it does not know stays as written. */
export function fill(text, values = {}) {
  return text.replace(/\{([^{}]+)\}/g, (all, key) => (key in values ? String(values[key]) : all))
}

/** A plain file name in the data folder: no folder, no hidden file. */
export const listName = name => /^[^\\/:*?"<>|.][^\\/:*?"<>|]*\.md$/i.test(name) && name.toLowerCase() !== SETUP_FILE.toLowerCase()

const key = text => text.trim().toLocaleLowerCase('nb').replace(/^a-å$/, 'a–å')

/** Sections it has replace the defaults; sections it lacks keep them. Problems name the line. */
export function parseSetup(text) {
  const setup = {
    views: [], menu: [], colors: {}, fonts: {}, window: {}, icons: {}, texts: { ...TEXTS }, problems: [],
  }
  const seen = new Set()
  let section = null
  const problem = (i, message) => setup.problems.push(`${SETUP_FILE}, linje ${i + 1}: ${message}`)
  comments(text.split(/\r?\n/)).forEach((line, i) => {
    if (line === null) return
    if (/^##\s/.test(line)) {
      section = key(line.slice(3))
      if (!['visninger', 'meny', 'farger', 'skrift', 'vindu', 'ikoner', 'tekster'].includes(section)) {
        problem(i, `«${line.slice(3).trim()}» er ikke en del av oppsettet`)
        section = null
      }
      seen.add(section)
      return
    }
    const item = line.match(/^[-*]\s+(.*)$/)
    if (!item || !section) return
    const parts = item[1].split(/\s*(?<!\\)\|\s*/).map(part => part.replace(/\\\|/g, '|').trim())
    const name = key(parts[0])
    if (section === 'visninger') {
      const [title, kind = '', file = '', options, placeholder = ''] = parts
      if (!title || !kind || !file) return problem(i, 'Skriv navn, type og fil, skilt med |')
      if (!KINDS.includes(key(kind))) return problem(i, `«${kind}» er ikke en type. Bruk hurtigtaster, oppslag, kort eller artikler.`)
      if (!listName(file)) return problem(i, `«${file}» må være et filnavn som slutter på .md`)
      const chosen = options === undefined || (!options && placeholder) ? DEFAULT_OPTIONS[key(kind)] : options.split(',').map(key).filter(Boolean)
      const wrong = chosen.find(o => !OPTIONS[key(kind)].includes(o))
      if (wrong) problem(i, `«${wrong}» passer ikke til typen ${key(kind)}`)
      setup.views.push({ name: title, kind: key(kind), file, options: chosen.filter(o => OPTIONS[key(kind)].includes(o)), placeholder })
    } else if (section === 'meny') {
      if (MENU.includes(name)) setup.menu.push(name)
      else problem(i, `«${parts[0]}» er ikke et menyvalg`)
    } else if (section === 'farger') {
      if (!COLORS.includes(name)) return problem(i, `«${parts[0]}» er ikke en farge i oppsettet`)
      if (!parts[1]) return problem(i, `Skriv en farge for ${name}`)
      setup.colors[name] = { light: parts[1], dark: parts[2] || parts[1], line: i + 1 }
    } else if (section === 'vindu' && name === 'type') {
      if (!WINDOW_TYPES.includes(key(parts[1] ?? ''))) return problem(i, 'Type må være panel eller vindu')
      setup.window.type = key(parts[1])
    } else if (section === 'vindu' || (section === 'skrift' && name === 'størrelse')) {
      const [min, max] = section === 'vindu' ? WINDOW[name] ?? [] : FONT_SIZE
      if (min === undefined) return problem(i, `«${parts[0]}» er ikke et mål i oppsettet`)
      const value = Number(parts[1])
      const label = name[0].toLocaleUpperCase('nb') + name.slice(1)
      if (!Number.isInteger(value) || value < min || value > max) return problem(i, `${label} må være et heltall fra ${min} til ${max}`)
      if (section === 'vindu') setup.window[name] = value
      else setup.fonts[name] = value
    } else if (section === 'skrift') {
      if (!['tekst', 'taster'].includes(name)) return problem(i, `«${parts[0]}» er ikke en skrift i oppsettet`)
      if (!FONT_PATTERN.test(parts[1] ?? '')) return problem(i, 'Skriv navnet på skriften, bare bokstaver, tall, mellomrom og bindestrek')
      setup.fonts[name] = parts[1]
    } else if (section === 'ikoner') {
      if (!ICONS.includes(name)) return problem(i, `«${parts[0]}» er ikke et ikon i oppsettet`)
      if (!iconName(parts[1] ?? '', name)) {
        return problem(i, PNG_ONLY.includes(name) ? 'Skriv navnet på en .png-fil i samme mappe' : 'Skriv navnet på en .svg- eller .png-fil i samme mappe')
      }
      setup.icons[name] = { file: parts[1], color: key(parts[2] ?? '') === 'farge', line: i + 1 }
    } else if (section === 'tekster') {
      if (!(name in TEXTS)) return problem(i, `«${parts[0]}» er ikke en tekst i oppsettet`)
      setup.texts[name] = parts.slice(1).join(' | ')
    }
  })
  if (!seen.has('visninger')) setup.views = DEFAULT_VIEWS.map(v => ({ ...v }))
  if (!seen.has('meny')) setup.menu = [...DEFAULT_MENU]
  if (!setup.views.length) setup.problems.push(`${SETUP_FILE} har ingen visninger`)
  return setup
}

const cell = text => String(text).replace(/\|/g, '\\|')

/** The setup as `Oppsett.md`, below `header` (the title and format comment of the file it replaces). */
export function formatSetup(setup, header) {
  const lines = (title, items) => [`## ${title}`, '', ...items.map(item => `- ${item}`), ...(items.length ? [''] : [])]
  const view = v => {
    const parts = [v.name, v.kind, v.file, v.options.join(', ')]
    if (v.placeholder) parts.push(v.placeholder)
    return parts.map(cell).join(' | ')
  }
  const color = ([name, c]) => [name, c.light, ...(c.dark !== c.light ? [c.dark] : [])].join(' | ')
  return [
    header.trimEnd(), '',
    ...lines('Visninger', setup.views.map(view)),
    ...lines('Meny', setup.menu),
    ...lines('Farger', Object.entries(setup.colors).map(color)),
    ...lines('Skrift', Object.entries(setup.fonts).map(([name, value]) => `${name} | ${value}`)),
    ...lines('Vindu', Object.entries(setup.window).map(([name, value]) => `${name} | ${value}`)),
    ...lines('Ikoner', Object.entries(setup.icons).map(([name, i]) => [name, i.file, ...(i.color ? ['farge'] : [])].join(' | '))),
    ...lines('Tekster', Object.entries(setup.texts).map(([name, text]) => `${name} | ${cell(text)}`)),
  ].join('\n').trimEnd() + '\n'
}

/** The file's title and format comment: everything before its first `##` section outside a comment. */
export function setupHeader(text) {
  const lines = text.split(/\r?\n/)
  const first = comments(lines).findIndex(line => line !== null && /^##\s/.test(line))
  return (first < 0 ? lines : lines.slice(0, first)).join('\n')
}

const channel = c => {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)

/** WCAG contrast ratio of two sRGB colours, 1 to 21. */
export function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

// Text against what it stands on: WCAG AA for normal text.
const PAIRS = [['tekst', 'bakgrunn'], ['tekst', 'flate'], ['dempet', 'bakgrunn'], ['dempet', 'flate'], ['aksent', 'flate'], ['på aksent', 'aksent'],
  ['på forside', 'forside'], ['på bakside', 'bakside']]

/** `modes` holds the colours as [r, g, b] per mode: { lys: { tekst: [...] }, mørk: {...} }. */
export function contrastProblems(modes) {
  const problems = []
  for (const [mode, colors] of Object.entries(modes)) {
    for (const [text, ground] of PAIRS) {
      const ratio = contrast(colors[text], colors[ground])
      if (ratio < 4.5) {
        const shown = ratio.toFixed(1).replace('.', ',')
        // «på aksent» names the text that stands on aksent
        const pair = text === `på ${ground}` ? `Teksten ${text}` : `${text[0].toUpperCase()}${text.slice(1)} på ${ground}`
        problems.push(`${SETUP_FILE}: ${pair} har kontrast ${shown}:1 i ${mode} modus. Den bør være minst 4,5:1.`)
      }
    }
  }
  return problems
}
