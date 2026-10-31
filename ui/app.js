import {
  parseShortcuts, filterShortcuts, lookupId, lookupShortcuts, comboId, parseCheatSheet, alphabetical, searchCheatSheet,
  formatKeys, inline, plain, mergeShortcuts,
} from './parse.js'

const { invoke } = window.__TAURI__.core
const { listen } = window.__TAURI__.event

const TABS = [
  { file: 'Hurtigtaster.md', search: 'Søk i hurtigtaster' },
  { file: 'Jukselapp.md', search: 'Søk i jukselappen' },
]

const state = {
  tab: 0,
  os: 'windows',
  files: ['', ''],
  queries: ['', ''],
  hotkey: '',
  view: 'mine',
  system: '',
  importing: '',
  tags: [],
  open: null,
  order: 'file',
  editing: false,
  discarding: false,
  recording: false,
  capturing: false,
  error: '',
}

const $ = id => document.getElementById(id)

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag)
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on')) el.addEventListener(key.slice(2), value)
    else if (key.startsWith('aria-')) el.setAttribute(key, String(value))
    else if (value !== false && value != null) el.setAttribute(key, value === true ? '' : value)
  }
  el.append(...children.flat().filter(c => c != null && c !== false))
  return el
}

const icon = paths => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')
  svg.innerHTML = paths.map(d => `<path d="${d}"/>`).join('')
  return svg
}
const closeIcon = () => icon(['M18 6l-12 12', 'M6 6l12 12'])

async function load() {
  try {
    const loaded = await invoke('load')
    Object.assign(state, {
      os: loaded.os, files: loaded.files, hotkey: loaded.hotkey, view: loaded.view, system: loaded.system, error: '',
    })
    $('version').textContent = `v${loaded.version} | elzacka`
    if (loaded.hotkeyTaken) state.error = `En annen app bruker ${hotkeyName()}`
    else if (loaded.systemError) state.error = loaded.systemError
  } catch (error) {
    state.error = String(error)
  }
  render()
}

const systemName = () => (state.os === 'mac' ? 'Hurtigtaster i macOS' : 'Hurtigtaster i Windows')

const hotkeyName = () => (state.hotkey ? formatKeys(state.hotkey, state.os)[0] : 'Ingen')

// List view

function render() {
  TABS.forEach((tab, i) => {
    const button = $(`tab-${i}`)
    button.setAttribute('aria-selected', i === state.tab)
    button.tabIndex = i === state.tab ? 0 : -1
  })
  $('view').setAttribute('aria-labelledby', `tab-${state.tab}`)
  const switchKeys = i => `${formatKeys(`mod ${i + 1}`, state.os)[0]} eller ${formatKeys('ctrl tab', state.os)[0]}`
  TABS.forEach((_, i) => { $(`tab-${i}`).title = switchKeys(i) })
  $('query').placeholder = state.capturing ? 'Trykk hurtigtasten …' : TABS[state.tab].search
  if ($('query').value !== state.queries[state.tab]) $('query').value = state.queries[state.tab]
  $('clear').hidden = !state.queries[state.tab]
  $('capture').hidden = state.tab !== 0
  $('capture').setAttribute('aria-pressed', state.capturing)
  $('error').hidden = !state.error
  $('error').textContent = state.error
  $('system-name').textContent = systemName()
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-checked', b.dataset.view === state.view))
  $('hotkey').textContent = state.recording ? 'Trykk ny hurtigtast …' : `Hurtigåpner: ${hotkeyName()}`
  if (state.tab === 0) renderShortcuts()
  else renderCheatSheet()
}

function emptyState(text) {
  return h('div', { class: 'empty' }, h('p', {}, text), h('button', { onclick: clearAll }, 'Vis alt'))
}

/** The user's list first: the shortcuts they chose themselves. */
function shownLists() {
  return [
    state.view !== 'system' && { title: 'Mine hurtigtaster', text: state.files[0] },
    state.view !== 'mine' && { title: systemName(), text: state.system },
  ].filter(Boolean)
}

function renderShortcuts() {
  const query = state.queries[0].trim()
  const id = lookupId(query, state.os)
  const combo = id && formatKeys(query, state.os)[0]
  const lists = shownLists().map(({ title, text }) => {
    const parsed = parseShortcuts(text, state.os)
    return { title, sections: id ? lookupShortcuts(parsed, id) : filterShortcuts(parsed, query) }
  })
  if (id && state.hotkey && comboId(state.hotkey, state.os) === id) {
    lists[0].sections.push({ title: 'Trix', items: [{ title: 'Åpner Trix', keys: [hotkeyName()] }] })
  }
  const sections = lists.flatMap(l => l.sections)
  const count = sections.reduce((n, s) => n + s.items.length, 0)
  $('tools').replaceChildren(...(id && count ? [h('span', {}, `${combo}: ${count} treff`)] : []))
  $('status').textContent = id ? (count ? `${combo}: ${count} treff` : `${combo} er ikke i lista`) : query ? `${count} treff` : ''
  const group = (s, heading) => h('section', {},
    s.title && h(heading, {}, s.title),
    h('div', { class: 'card' }, s.items.map(item =>
      h('div', { class: 'shortcut' },
        h('span', { class: 'name' }, item.title),
        h('span', { class: 'keys' }, item.keys.flatMap((k, i) =>
          [i > 0 && h('span', { class: 'or' }, 'eller'), h('kbd', {}, k)]))))))
  $('list').replaceChildren(
    ...(sections.length
      ? lists.length > 1
        ? lists.filter(l => l.sections.length).map(l =>
          h('div', { class: 'source' }, h('h2', {}, l.title), l.sections.map(s => group(s, 'h3'))))
        : sections.map(s => group(s, 'h2'))
      : [id ? emptyState(`${combo} er ikke i lista`)
        : query ? emptyState(`Ingen treff på «${query}»`) : h('p', { class: 'empty' }, 'Lista er tom')]),
  )
}

function renderCheatSheet() {
  const query = state.queries[1].trim()
  const parsed = parseCheatSheet(state.files[1])
  let sections
  if (query) {
    const found = searchCheatSheet(parsed, query, state.tags)
    sections = found.length ? [{ title: '', entries: found }] : []
  } else {
    const grouped = state.order === 'az' ? alphabetical(parsed) : parsed
    sections = grouped
      .map(s => ({ ...s, entries: s.entries.filter(e => state.tags.every(t => e.tags.includes(t))) }))
      .filter(s => s.entries.length)
  }
  const count = sections.reduce((n, s) => n + s.entries.length, 0)
  $('status').textContent = query || state.tags.length ? `${count} oppslag` : ''

  const orderButton = (value, label) => h('button', {
    'aria-pressed': state.order === value,
    onclick: () => { state.order = value; render() },
  }, label)
  $('tools').replaceChildren(...[
    ...(state.tags.length
      ? [h('span', {}, `${count} merket`), ...state.tags.map(tag =>
        h('button', { class: 'chip', 'aria-label': `Fjern ${tag}`, onclick: () => toggleTag(tag) }, tag, closeIcon()))]
      : []),
    h('span', { class: 'spacer' }),
    !query && h('div', { class: 'segmented', role: 'group', 'aria-label': 'Rekkefølge' },
      orderButton('file', 'Som kildefila'), orderButton('az', 'A–Å')),
  ].filter(Boolean))

  $('list').replaceChildren(
    ...(sections.length
      ? sections.map(s => h('section', {},
        s.title && h('h2', {}, s.title),
        h('div', { class: 'card' }, s.entries.map(entry))))
      : [query || state.tags.length ? emptyState(query ? `Ingen treff på «${query}»` : 'Ingen oppslag')
        : h('p', { class: 'empty' }, 'Jukselappen er tom')]),
  )
}

function rich(text) {
  return inline(text).map(seg => {
    if (seg.type === 'link') {
      return h('a', { href: seg.href, onclick: e => { e.preventDefault(); invoke('open_url', { url: seg.href }) } }, seg.text)
    }
    return seg.type === 'text' ? seg.text : h(seg.type, {}, seg.text)
  })
}

function entry(e) {
  const open = state.open === e.id
  const preview = plain(e.paragraphs[0] ?? '')
  return h('div', { class: `entry${open ? ' open' : ''}`, id: `entry-${e.id}` },
    h('button', { 'aria-expanded': open, onclick: () => { state.open = open ? null : e.id; render() } },
      h('span', { class: 'title' }, e.title),
      !open && preview && h('span', { class: 'preview' }, preview)),
    open && h('div', { class: 'body' },
      e.paragraphs.map(p => h('p', {}, rich(p))),
      e.aliases.length > 0 && h('p', { class: 'also' }, `Også: ${e.aliases.join(', ')}`),
      e.tags.length > 0 && h('div', { class: 'tags' }, e.tags.map(tag =>
        h('button', { class: 'tag', 'aria-pressed': state.tags.includes(tag), onclick: () => toggleTag(tag, e.id) }, `#${tag}`)))),
  )
}

function toggleTag(tag, keepOpen) {
  state.tags = state.tags.includes(tag) ? state.tags.filter(t => t !== tag) : [...state.tags, tag]
  render()
  if (keepOpen != null) document.getElementById(`entry-${keepOpen}`)?.scrollIntoView({ block: 'nearest' })
}

function clearAll() {
  state.queries[state.tab] = ''
  state.tags = []
  render()
  $('query').focus()
}

function selectTab(tab) {
  state.tab = tab
  state.open = null
  closeMenu()
  render()
  $('query').focus()
}

// Editor

function openEditor(text = state.files[state.tab]) {
  closeMenu()
  state.editing = true
  state.discarding = false
  $('editor-title').textContent = TABS[state.tab].file
  $('text').value = text
  $('editor-error').hidden = true
  $('cancel').textContent = 'Avbryt'
  $('view').hidden = true
  document.querySelector('.bar').hidden = true
  $('editor').hidden = false
  $('text').focus()
  $('text').setSelectionRange(0, 0)
  $('text').scrollTop = 0
}

function closeEditor() {
  state.editing = false
  $('editor').hidden = true
  $('view').hidden = false
  document.querySelector('.bar').hidden = false
  render()
  $('query').focus()
}

const dirty = () => $('text').value !== state.files[state.tab].replace(/\r\n/g, '\n')

function cancelEdit() {
  if (dirty() && !state.discarding) {
    state.discarding = true
    $('cancel').textContent = 'Forkast endringene'
    return
  }
  closeEditor()
}

async function saveEdit() {
  try {
    state.files[state.tab] = await invoke('save', {
      name: TABS[state.tab].file, original: state.files[state.tab], text: $('text').value,
    })
    closeEditor()
  } catch (error) {
    $('editor-error').hidden = false
    $('editor-error').textContent = error === 'changed'
      ? 'Fila er endret utenfor Trix. Kopier endringene dine, avbryt og åpne fila på nytt.'
      : String(error)
  }
}

// Menu and hotkey

function closeMenu() {
  $('menu').hidden = true
  $('more').setAttribute('aria-expanded', 'false')
  state.recording = false
}

function toggleMenu() {
  const opening = $('menu').hidden
  closeMenu()
  if (!opening) return
  render()
  $('menu').hidden = false
  $('more').setAttribute('aria-expanded', 'true')
  $('menu').querySelector('button').focus()
}

async function setView(view) {
  closeMenu()
  try {
    await invoke('set_view', { view })
  } catch (error) {
    state.error = String(error)
    return render()
  }
  state.tab = 0
  await load()
}

async function exportList() {
  closeMenu()
  try {
    await invoke('export_list')
  } catch (error) {
    state.error = String(error)
    render()
  }
}

// Import: the result opens in the editor, and the file changes only on «Lagre».

async function chooseImport() {
  closeMenu()
  await invoke('hold')
  $('import-file').value = ''
  $('import-file').click()
}

async function readImport(file) {
  const text = await file.text()
  if (!['mac', 'windows'].some(os => parseShortcuts(text, os).length)) {
    state.error = `${file.name} har ingen hurtigtaster`
    return render()
  }
  selectTab(0)
  // An empty list keeps its format comment.
  if (!parseShortcuts(state.files[0], state.os).length) return openEditor(mergeShortcuts(state.files[0], text))
  state.importing = text
  $('import-dialog').returnValue = ''
  $('import-dialog').showModal()
}

function finishImport() {
  const choice = $('import-dialog').returnValue
  if (choice === 'merge') openEditor(mergeShortcuts(state.files[0], state.importing))
  else if (choice === 'replace') openEditor(state.importing)
  state.importing = ''
}

const MODIFIERS = ['Meta', 'Control', 'Alt', 'Shift']

// Lookup by key press

const NAMED_KEYS = {
  Space: 'mellomrom', Enter: 'retur', Tab: 'tab', Escape: 'esc', Backspace: 'slett', Delete: 'delete',
  ArrowLeft: 'venstre', ArrowRight: 'høyre', ArrowUp: 'opp', ArrowDown: 'ned',
}
// With ⇧ or ⌥ the character changes, so the key's place decides
const PUNCTUATION = {
  Period: '.', Comma: ',', Minus: '-', Equal: '=', Slash: '/', Backslash: '\\', Semicolon: ';', Quote: "'",
  BracketLeft: '[', BracketRight: ']', Backquote: '`', IntlBackslash: '<',
}

function eventKey(e) {
  if (/^(Key[A-Z]|Digit\d)$/.test(e.code)) return e.code.at(-1)
  if (/^F\d+$/.test(e.code)) return e.code
  if (NAMED_KEYS[e.code]) return NAMED_KEYS[e.code]
  if (e.key.length === 1 && !e.shiftKey && !e.altKey) return e.key
  return PUNCTUATION[e.code] ?? null
}

function startCapture() {
  state.capturing = !state.capturing
  render()
}

function captureKey(e) {
  e.preventDefault()
  if (MODIFIERS.includes(e.key)) return
  const plain = !(e.metaKey || e.ctrlKey || e.altKey || e.shiftKey)
  if (e.key === 'Escape' && plain) {
    state.capturing = false
    return render()
  }
  const key = eventKey(e)
  if (!key) return
  // The order Trix and macOS menus use: ⌘⌃⌥⇧, and Win+Ctrl+Alt+Shift on Windows
  const meta = e.metaKey && (state.os === 'mac' ? 'cmd' : 'win')
  const text = [meta, e.ctrlKey && 'ctrl', e.altKey && 'alt', e.shiftKey && 'shift', key].filter(Boolean).join(' ')
  state.queries[0] = formatKeys(text, state.os)[0]
  state.capturing = false
  render()
  $('query').focus()
}

function recordHotkey(e) {
  e.preventDefault()
  if (e.key === 'Escape') return closeMenu()
  if (e.key === 'Backspace' && !e.metaKey && !e.ctrlKey && !e.altKey) return setHotkey('')
  if (MODIFIERS.includes(e.key) || !(e.metaKey || e.ctrlKey)) return
  const parts = [e.metaKey && (state.os === 'mac' ? 'Command' : 'Super'), e.ctrlKey && 'Control', e.altKey && 'Alt', e.shiftKey && 'Shift', e.code]
  setHotkey(parts.filter(Boolean).join('+'))
}

async function setHotkey(hotkey) {
  try {
    await invoke('set_hotkey', { hotkey })
    state.hotkey = hotkey
    state.error = ''
  } catch {
    state.error = `Trix kan ikke bruke ${formatKeys(hotkey, state.os)[0]}`
  }
  closeMenu()
  render()
}

// Events

TABS.forEach((_, i) => $(`tab-${i}`).addEventListener('click', () => selectTab(i)))
$('query').addEventListener('input', e => {
  state.queries[state.tab] = e.target.value
  state.open = null
  render()
})
$('clear').addEventListener('click', clearAll)
$('capture').addEventListener('click', startCapture)
$('edit').addEventListener('click', () => openEditor())
$('more').addEventListener('click', toggleMenu)
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)))
$('import').addEventListener('click', chooseImport)
$('import-file').addEventListener('change', e => { if (e.target.files[0]) readImport(e.target.files[0]) })
$('import-dialog').addEventListener('close', finishImport)
$('export').addEventListener('click', exportList)
$('reveal-file').addEventListener('click', () => { closeMenu(); invoke('reveal_file', { name: TABS[state.tab].file }) })
$('hotkey').addEventListener('click', () => { state.recording = true; render() })
$('quit').addEventListener('click', () => invoke('quit'))
$('cancel').addEventListener('click', cancelEdit)
$('save').addEventListener('click', saveEdit)
$('text').addEventListener('input', () => { state.discarding = false; $('cancel').textContent = 'Avbryt' })

document.addEventListener('click', e => {
  if (!$('menu').hidden && !e.target.closest('.menu-anchor')) closeMenu()
})

// The web engine's own menu (Reload, Open Link) is not Trix's; text fields keep copy and paste.
document.addEventListener('contextmenu', e => {
  if (!e.target.closest('input, textarea')) e.preventDefault()
})

document.addEventListener('keydown', e => {
  if ($('import-dialog').open) return
  const mod = state.os === 'mac' ? e.metaKey : e.ctrlKey
  if (state.recording) return recordHotkey(e)
  if (state.capturing) return captureKey(e)
  if (state.editing) {
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveEdit() }
    else if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
    return
  }
  if (mod && (e.key === '1' || e.key === '2')) { e.preventDefault(); selectTab(Number(e.key) - 1) }
  else if (e.ctrlKey && e.key === 'Tab') { e.preventDefault(); selectTab(1 - state.tab) }
  else if (mod && e.key.toLowerCase() === 'e') { e.preventDefault(); openEditor() }
  else if (mod && e.key.toLowerCase() === 'f') { e.preventDefault(); $('query').select() }
  else if (e.key === 'Escape') {
    e.preventDefault()
    if (!$('menu').hidden) { closeMenu(); $('more').focus() }
    else if (state.open != null) { state.open = null; render() }
    else if (state.tags.length) { state.tags = []; render() }
    else if (state.queries[state.tab]) clearAll()
    else invoke('hide')
  } else if (e.target.getAttribute('role') === 'tab' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    selectTab(1 - state.tab)
    $(`tab-${state.tab}`).focus()
  }
})

// The files are the user's: read them again each time Trix comes forward.
window.addEventListener('focus', () => { if (!state.editing) load() })
listen('opened', () => { if (!state.editing) $('query').select() })

load().then(() => $('query').focus())
