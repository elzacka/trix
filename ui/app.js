import {
  parseShortcuts, filterShortcuts, lookupId, lookupShortcuts, comboId, parseEntries, lead, alphabetical, sortShortcuts,
  searchEntries, formatKeys, inline, plain, mergeShortcuts, mergeEntries, parseSetup, fill, contrastProblems, SETUP_FILE, TOKENS,
} from './parse.js'
import { h, svg } from './dom.js'

const { invoke } = window.__TAURI__.core
const { listen, emitTo } = window.__TAURI__.event
/** Events sent to this window only; `listen` hears those sent to any window. */
const own = window.__TAURI__.webviewWindow.getCurrentWebviewWindow()

const hasEntries = text => parseEntries(text).length > 0

const MODULE_VIEWS = {
  hurtigtaster: { has: text => ['mac', 'windows'].some(os => parseShortcuts(text, os).length), merge: mergeShortcuts, render: renderShortcuts },
  oppslag: { has: hasEntries, merge: mergeEntries, render: renderLookup },
  kort: { has: hasEntries, merge: mergeEntries, render: renderCards },
  steg: { has: hasEntries, merge: mergeEntries, render: renderGuides },
}

const state = {
  tab: 0,
  os: 'windows',
  version: '',
  setupText: '',
  setup: parseSetup(''),
  /** The setup's modules with their file, search, order, tags and the open entry. */
  modules: [],
  hotkey: '',
  view: 'mine',
  system: '',
  importing: '',
  /** The file in the editor: { name, original }. */
  editing: null,
  discarding: false,
  recording: false,
  capturing: false,
  problems: [],
  error: '',
  /** What the app last sent to Rust, so a reload sends only changes. */
  tray: '',
  trayIcon: '',
  appIcon: '',
  size: '',
  mode: '',
  setupOpen: false,
}

const $ = id => document.getElementById(id)
const current = () => state.modules[state.tab]
const has = (tab, option) => tab?.options.includes(option)
const t = (key, values) => fill(state.setup.texts[key], { navn: state.setup.texts.navn, ...values })

/** The setup's own icons as data URLs, by name. */
const icons = new Map()

/** The setup's icon as a mask in the text colour; an image never runs script. Otherwise the built-in one. */
function icon(name, paths) {
  if (icons.has(name)) {
    const mask = `url("${icons.get(name)}")`
    const el = h('span', { class: 'icon', 'aria-hidden': 'true', 'data-icon': name })
    el.style.maskImage = mask
    el.style.webkitMaskImage = mask
    return el
  }
  const el = svg(paths)
  if (name) el.dataset.icon = name
  return el
}
const closeIcon = () => icon('fjern', ['M18 6l-12 12', 'M6 6l12 12'])
const backIcon = () => icon('tilbake', ['M5 12l14 0', 'M5 12l6 6', 'M5 12l6 -6'])
const turnIcon = () => {
  const el = icon('snu', ['M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4', 'M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4'])
  el.classList.add('turn')
  return el
}

// The built-in icons in the page, kept to swap back when the setup drops its own.
const BUILT_IN = new Map([...document.querySelectorAll('svg[data-icon]')].map(svg => [svg.dataset.icon, [...svg.children].map(p => p.getAttribute('d'))]))

async function loadIcons(setup, problems) {
  icons.clear()
  await Promise.all(Object.entries(setup.icons).filter(([name]) => name !== 'menylinje').map(async ([name, { file }]) => {
    try {
      const bytes = new Uint8Array(await invoke('read_icon', { name: file }))
      let binary = ''
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
      icons.set(name, `data:image/${/\.svg$/i.test(file) ? 'svg+xml' : 'png'};base64,${btoa(binary)}`)
    } catch (error) {
      problems.push(String(error))
    }
  }))
  $('logo').src = icons.get('logo') ?? 'icon.svg'
  document.querySelectorAll('[data-icon]').forEach(el => el.replaceWith(icon(el.dataset.icon, BUILT_IN.get(el.dataset.icon) ?? [])))
  const tray = setup.icons.menylinje
  const key = tray ? `${tray.file}|${tray.color}` : ''
  if (key !== state.trayIcon) {
    state.trayIcon = key
    await invoke('set_tray_icon', { name: tray?.file ?? null, color: tray?.color ?? false }).catch(error => problems.push(String(error)))
  }
  const app = setup.icons.app?.file ?? ''
  if (app !== state.appIcon) {
    state.appIcon = app
    await invoke('set_app_icon', { name: app || null }).catch(error => problems.push(String(error)))
  }
}

async function load() {
  const problems = []
  try {
    const loaded = await invoke('load')
    Object.assign(state, {
      os: loaded.os, version: loaded.version, hotkey: loaded.hotkey, view: loaded.view, setupText: loaded.setup,
    })
    state.setup = parseSetup(loaded.setup)
    problems.push(...state.setup.problems)
    const old = new Map(state.modules.map(v => [`${v.module}|${v.file}`, v]))
    state.modules = await Promise.all(state.setup.modules.map(async v => {
      const kept = old.get(`${v.module}|${v.file}`)
      let text = ''
      try {
        text = await invoke('read_content', { name: v.file, module: v.module, title: v.name })
      } catch (error) {
        problems.push(String(error))
      }
      return {
        ...v,
        text,
        query: kept?.query ?? '',
        order: kept?.order ?? (v.options.includes('a–å') ? 'az' : 'file'),
        tags: kept?.tags ?? [],
        open: kept?.open ?? null,
        reading: kept?.reading ?? null,
      }
    }))
    if (state.tab >= state.modules.length) state.tab = 0
    state.system = ''
    // Read only when shown: on a Mac this reads the system's settings.
    if (state.view !== 'mine' && state.modules.some(v => has(v, 'system'))) {
      try {
        state.system = await invoke('system_list')
      } catch (error) {
        problems.push(String(error))
      }
    }
    if (loaded.hotkeyTaken) problems.push(t('opptatt', { taster: hotkeyName() }))
    problems.push(...applySetup())
    await loadIcons(state.setup, problems)
  } catch (error) {
    problems.push(String(error))
  }
  state.problems = problems
  render()
}

// Setup: texts, menu, colours, fonts, window

function applySetup() {
  const problems = []
  const { texts, menu, colors, fonts, window: size } = state.setup
  document.title = texts.navn
  document.querySelectorAll('[data-text]').forEach(el => { el.textContent = t(el.dataset.text) })
  for (const [id, key] of [['more', 'flere valg'], ['clear', 'tøm søk'], ['capture', 'slå opp']]) {
    $(id).setAttribute('aria-label', t(key))
    $(id).title = t(key)
  }
  $('query').setAttribute('aria-label', t('søk'))
  $('tabs').setAttribute('aria-label', t('moduler'))

  const items = new Map([...document.querySelectorAll('#menu [data-item]')].map(el => [el.dataset.item, el]))
  $('menu').querySelectorAll(':scope > hr').forEach(hr => hr.remove())
  for (const el of items.values()) el.hidden = true
  for (const key of menu) {
    if (key === '---') {
      $('menu').append(h('hr'))
      continue
    }
    $('menu').append(items.get(key))
    items.get(key).hidden = false
  }

  const root = document.documentElement
  root.removeAttribute('style')
  for (const [name, { light, dark, line }] of Object.entries(colors)) {
    for (const value of new Set([light, dark])) {
      if (!CSS.supports('color', value)) problems.push(`${SETUP_FILE}, linje ${line}: «${value}» er ikke en farge`)
    }
    if (CSS.supports('color', light)) root.style.setProperty(`--${TOKENS[name]}-light`, light)
    if (CSS.supports('color', dark)) root.style.setProperty(`--${TOKENS[name]}-dark`, dark)
  }
  if (fonts.tekst) root.style.setProperty('--font-text', `"${fonts.tekst}", "Syne", "Inter", system-ui, sans-serif`)
  if (fonts.taster) root.style.setProperty('--font-keys', `"${fonts.taster}", "Inter", system-ui, sans-serif`)
  if (fonts.størrelse) root.style.setProperty('--font-size', `${fonts.størrelse}px`)
  problems.push(...contrastProblems({ lys: resolved('light'), mørk: resolved('dark') }))

  const mode = size.type ?? 'panel'
  if (mode !== state.mode) {
    state.mode = mode
    invoke('set_mode', { window: mode === 'vindu' }).catch(error => state.problems.push(String(error)))
  }
  // Only on a change: in a window the user's own size stays.
  const dimensions = [size.bredde ?? 420, size.høyde ?? 600]
  if (dimensions.join('x') !== state.size) {
    state.size = dimensions.join('x')
    invoke('set_size', { width: dimensions[0], height: dimensions[1] }).catch(error => state.problems.push(String(error)))
  }
  const tray = [texts.navn, t('åpne'), t('avslutt')]
  if (tray.join('\n') !== state.tray) {
    state.tray = tray.join('\n')
    invoke('set_tray', { name: tray[0], open: tray[1], quit: tray[2] }).catch(() => {})
  }
  return problems
}

/** Each setup colour of one mode as [r, g, b], as the web engine reads it. */
function resolved(mode) {
  const probe = h('span', { hidden: true })
  document.body.append(probe)
  const style = getComputedStyle(document.documentElement)
  const colors = Object.fromEntries(Object.entries(TOKENS).map(([name, token]) => {
    probe.style.color = style.getPropertyValue(`--${token}-${mode}`).trim()
    const color = getComputedStyle(probe).color
    const numbers = color.match(/[\d.]+/g).slice(0, 3).map(Number)
    return [name, color.startsWith('color(') ? numbers.map(n => n * 255) : numbers]
  }))
  probe.remove()
  return colors
}

const systemName = () => t('systemets hurtigtaster', { system: state.os === 'mac' ? 'macOS' : 'Windows' })

const hotkeyName = () => formatKeys(state.hotkey, state.os)[0] ?? ''

// List view

function render() {
  const tab = current()
  renderTabs()
  $('tabpanel').setAttribute('aria-labelledby', `tab-${state.tab}`)
  const reading = tab?.module === 'steg' && tab.reading != null
  $('search').hidden = !has(tab, 'søk') || reading
  $('query').placeholder = state.capturing ? t('trykk hurtigtasten') : tab?.placeholder || t('søk')
  if (tab && $('query').value !== tab.query) $('query').value = tab.query
  $('clear').hidden = !tab?.query
  $('capture').hidden = !(tab?.module === 'hurtigtaster' && has(tab, 'tasteoppslag'))
  $('capture').setAttribute('aria-pressed', state.capturing)
  const problems = [...state.problems, state.error].filter(Boolean)
  $('error').hidden = !problems.length
  $('error').replaceChildren(...problems.map(p => h('p', {}, p)))
  $('system-name').textContent = systemName()
  $('sources').hidden = !has(tab, 'system')
  for (const id of ['view-label', 'content-label']) $(id).closest('[data-item]').classList.toggle('unused', !tab)
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-checked', b.dataset.view === state.view))
  document.querySelectorAll('[data-order]').forEach(b => b.setAttribute('aria-checked', b.dataset.order === tab?.order))
  $('view-label').textContent = t('visning')
  $('content-label').textContent = t('innhold', { fane: tab?.name ?? '' })
  $('quit').textContent = t('avslutt')
  $('version').textContent = `v${state.version} | elzacka`
  $('hotkey').replaceChildren(...(state.recording ? [t('ny hurtigtast')]
    : [state.hotkey ? t('endre hurtigåpner') : t('velg hurtigåpner'), state.hotkey && h('span', { class: 'menu-keys' }, hotkeyName())].filter(Boolean)))
  $('tools').replaceChildren()
  $('status').textContent = ''
  if (tab) MODULE_VIEWS[tab.module].render(tab)
  else $('list').replaceChildren(h('p', { class: 'empty' }, t('tom')))
}

function renderTabs() {
  const tabs = $('tabs')
  tabs.hidden = state.modules.length < 2
  const switchKeys = i => [i < 9 && formatKeys(`mod ${i + 1}`, state.os)[0], formatKeys('ctrl tab', state.os)[0]].filter(Boolean).join(' / ')
  tabs.replaceChildren(...state.modules.map((v, i) => h('button', {
    role: 'tab', id: `tab-${i}`, 'aria-controls': 'tabpanel', 'aria-selected': i === state.tab, tabindex: i === state.tab ? 0 : -1,
    title: switchKeys(i), onclick: () => selectTab(i),
  }, v.name)))
}

function emptyState(text) {
  return h('div', { class: 'empty' }, h('p', {}, text), h('button', { onclick: clearAll }, t('vis alt')))
}

/** The user's list first: the shortcuts they chose themselves. */
function shownLists(tab) {
  const system = has(tab, 'system') ? state.view : 'mine'
  return [
    system !== 'system' && { title: t('mine hurtigtaster'), text: tab.text },
    system !== 'mine' && { title: systemName(), text: state.system },
  ].filter(Boolean)
}

function renderShortcuts(tab) {
  const query = tab.query.trim()
  const id = has(tab, 'tasteoppslag') ? lookupId(query, state.os) : null
  const combo = id && formatKeys(query, state.os)[0]
  const lists = shownLists(tab).map(({ title, text }) => {
    const parsed = parseShortcuts(text, state.os)
    if (tab.order === 'az') sortShortcuts(parsed)
    return { title, sections: id ? lookupShortcuts(parsed, id) : filterShortcuts(parsed, query) }
  })
  if (id && state.hotkey && comboId(state.hotkey, state.os) === id) {
    lists[0].sections.push({ title: state.setup.texts.navn, items: [{ title: t('åpner'), keys: [[{ keys: hotkeyName() }]] }] })
  }
  const sections = lists.flatMap(l => l.sections)
  const count = sections.reduce((n, s) => n + s.items.length, 0)
  const found = t('treff', { antall: count })
  $('tools').replaceChildren(...(id && count ? [h('span', {}, `${combo}: ${found}`)] : []))
  $('status').textContent = id ? (count ? `${combo}: ${found}` : t('ikke i lista', { taster: combo })) : query ? found : ''
  const group = (s, heading) => h('section', {},
    s.title && h(heading, {}, s.title),
    h('div', { class: 'card' }, s.items.map(item =>
      h('div', { class: 'shortcut' },
        h('span', { class: 'name' }, item.title),
        h('span', { class: 'keys' }, item.keys.flatMap((k, i) =>
          [i > 0 && h('span', { class: 'or' }, 'eller'), ...k.map(p => (p.keys ? h('kbd', {}, p.keys) : h('span', { class: 'or' }, p.text)))]))))))
  $('list').replaceChildren(
    ...(sections.length
      ? lists.length > 1
        ? lists.filter(l => l.sections.length).map(l =>
          h('div', { class: 'source' }, h('h2', {}, l.title), l.sections.map(s => group(s, 'h3'))))
        : sections.map(s => group(s, 'h2'))
      : [id ? emptyState(t('ikke i lista', { taster: combo }))
        : query ? emptyState(t('ingen treff', { søk: query })) : h('p', { class: 'empty' }, t('tom'))]),
  )
}

/** Oppslag, kort and steg: groups or A–Å, narrowed by the search and the chosen tags. */
function entrySections(tab) {
  const parsed = parseEntries(tab.text)
  const tags = has(tab, 'emneknagger') ? tab.tags : []
  const query = tab.query.trim()
  let sections
  if (query) {
    const found = searchEntries(parsed, query, tags)
    sections = found.length ? [{ title: '', entries: found }] : []
  } else {
    sections = (tab.order === 'az' ? alphabetical(parsed) : parsed)
      .map(s => ({ ...s, entries: s.entries.filter(e => tags.every(tag => e.tags.includes(tag))) }))
      .filter(s => s.entries.length)
  }
  const count = sections.reduce((n, s) => n + s.entries.length, 0)
  $('status').textContent = query || tags.length ? t('treff', { antall: count }) : ''
  $('tools').replaceChildren(...(tags.length
    ? [h('span', {}, t('merket', { antall: count })), ...tags.map(tag =>
      h('button', { class: 'chip', 'aria-label': t('fjern merke', { emne: tag }), onclick: () => toggleTag(tab, tag) }, tag, closeIcon()))]
    : []))
  return sections
}

function renderEntries(tab, sections, list) {
  const filtered = tab.query.trim() || (has(tab, 'emneknagger') && tab.tags.length)
  $('list').replaceChildren(...(sections.length
    ? sections.map(s => h('section', {}, s.title && h('h2', {}, s.title), list(s.entries)))
    : [filtered ? emptyState(tab.query.trim() ? t('ingen treff', { søk: tab.query.trim() }) : t('tom'))
      : h('p', { class: 'empty' }, t('tom'))]))
}

function renderLookup(tab) {
  renderEntries(tab, entrySections(tab), entries => h('div', { class: 'card' }, entries.map(e => entry(tab, e))))
}

/** Inline Markdown as elements; with `links` false, a link is its text. */
function rich(text, links = true) {
  return inline(text).map(seg => {
    if (seg.type === 'link') {
      return !links ? seg.text : h('a', { href: seg.href, onclick: e => { e.preventDefault(); e.stopPropagation(); invoke('open_url', { url: seg.href }) } }, seg.text)
    }
    return seg.type === 'text' ? seg.text : h(seg.type, {}, seg.text)
  })
}

/** Paragraphs, headings at `level`, lists and tables. */
function blocks(list, level) {
  return list.map(b => {
    if (b.type === 'p') return h('p', {}, rich(b.text))
    if (b.type === 'h') return h(`h${level}`, { class: 'subheading' }, rich(b.text))
    if (b.type === 'table') {
      return h('table', {},
        h('thead', {}, h('tr', {}, b.head.map((c, i) => tableCell('th', c, b.align[i])))),
        h('tbody', {}, b.rows.map(row => h('tr', {}, b.head.map((_, i) => tableCell('td', row[i] ?? '', b.align[i]))))))
    }
    return h(b.type, {}, b.items.map(item => h('li', {}, rich(item))))
  })
}

/** Alignment through CSSOM: the CSP has no 'unsafe-inline'. */
function tableCell(tag, text, align) {
  const el = h(tag, tag === 'th' ? { scope: 'col' } : {}, rich(text))
  if (align) el.style.textAlign = align
  return el
}

function tagButtons(tab, e) {
  return !has(tab, 'emneknagger') || !e.tags.length ? null
    : h('div', { class: 'tags' }, e.tags.map(tag =>
      h('button', { class: 'tag', 'aria-pressed': tab.tags.includes(tag), onclick: () => toggleTag(tab, tag, e.id) }, `#${tag}`)))
}

function entry(tab, e) {
  const open = tab.open === e.id
  const preview = plain(lead(e))
  return h('div', { class: `entry${open ? ' open' : ''}`, id: `entry-${e.id}` },
    h('button', { 'aria-expanded': open, onclick: () => { tab.open = open ? null : e.id; render() } },
      h('span', { class: 'title' }, e.title),
      !open && preview && h('span', { class: 'preview' }, preview)),
    open && h('div', { class: 'body' },
      blocks(e.blocks, 3),
      e.aliases.length > 0 && h('p', { class: 'also' }, `${t('også')}: ${e.aliases.join(', ')}`),
      tagButtons(tab, e)),
  )
}

// Cards: the front is the name and the first paragraph, the back is the rest.

function renderCards(tab) {
  renderEntries(tab, entrySections(tab), entries => {
    const cards = h('div', { class: 'cards' }, entries.map(e => flipCard(tab, e)))
    if (tab.columns) cards.style.gridTemplateColumns = `repeat(${tab.columns}, minmax(0, 1fr))`
    return cards
  })
  fitCards(tab)
}

/** «N i høyden»: N rows fill the tab below the search; a card with more text grows past its share. */
function fitCards(tab) {
  const main = $('tabpanel')
  const all = [...main.querySelectorAll('.cards')]
  if (!tab.rows || !all.length) return
  const top = all[0].getBoundingClientRect().top - main.getBoundingClientRect().top - main.clientTop + main.scrollTop
  const style = getComputedStyle(main)
  const gap = parseFloat(getComputedStyle(all[0]).rowGap)
  const free = main.clientHeight - top - parseFloat(style.paddingBottom) - gap * (tab.rows - 1)
  for (const cards of all) cards.style.setProperty('--card-height', `${Math.max(free / tab.rows, 0)}px`)
}

new ResizeObserver(() => { if (current()?.module === 'kort') fitCards(current()) }).observe($('tabpanel'))

function flipCard(tab, e) {
  const flipped = tab.open === e.id
  const front = lead(e)
  return h('div', { class: `flip${flipped ? ' flipped' : ''}`, id: `entry-${e.id}` },
    h('button', { class: 'flip-toggle', 'aria-pressed': flipped, onclick: () => { tab.open = flipped ? null : e.id; render() } },
      h('span', { class: 'sr-only' }, front ? `${e.title}. ${plain(front)}` : e.title)),
    h('div', { class: 'face front', 'aria-hidden': 'true' },
      h('span', { class: 'title' }, e.title),
      front && h('span', { class: 'lead' }, rich(front, false)),
      turnIcon()),
    h('div', { class: 'face back', inert: !flipped },
      h('p', { class: 'title', 'aria-hidden': 'true' }, e.title),
      blocks(e.blocks.slice(front ? 1 : 0), 3),
      tagButtons(tab, e),
      turnIcon()),
  )
}

// Steg: a list of guides, title and lead; one opens to read in the tab.

function renderGuides(tab) {
  const sections = entrySections(tab)
  const reading = sections.flatMap(s => s.entries).find(e => e.id === tab.reading)
    ?? parseEntries(tab.text).flatMap(s => s.entries).find(e => e.id === tab.reading)
  if (reading) {
    $('tools').replaceChildren()
    $('list').replaceChildren(h('article', { class: 'guide' },
      h('button', { class: 'back-link', onclick: () => closeGuide(tab) }, backIcon(), t('tilbake')),
      h('h1', { tabindex: -1, id: 'guide-title' }, reading.title),
      blocks(reading.blocks, 2),
      tagButtons(tab, reading)))
    return
  }
  tab.reading = null
  renderEntries(tab, sections, entries => h('div', { class: 'card' }, entries.map(e => {
    const preview = plain(lead(e))
    return h('div', { class: 'entry' }, h('button', { id: `entry-${e.id}`, onclick: () => openGuide(tab, e.id) },
      h('span', { class: 'title' }, e.title),
      preview && h('span', { class: 'preview' }, preview)))
  })))
}

function openGuide(tab, id) {
  tab.reading = id
  render()
  $('tabpanel').scrollTop = 0
  $('guide-title')?.focus()
}

function closeGuide(tab) {
  const id = tab.reading
  tab.reading = null
  render()
  document.getElementById(`entry-${id}`)?.focus()
}

function toggleTag(tab, tag, keepOpen) {
  tab.tags = tab.tags.includes(tag) ? tab.tags.filter(x => x !== tag) : [...tab.tags, tag]
  tab.reading = null
  render()
  if (keepOpen != null) document.getElementById(`entry-${keepOpen}`)?.scrollIntoView({ block: 'nearest' })
}

function clearAll() {
  const tab = current()
  tab.query = ''
  tab.tags = []
  render()
  $('query').focus()
}

function focusTab() {
  if (!$('search').hidden) $('query').focus()
  else $(`tab-${state.tab}`)?.focus()
}

function selectTab(i) {
  if (!state.modules[i]) return
  state.tab = i
  closeMenu()
  render()
  focusTab()
}

// Editor

function openEditor(name, original, text = original) {
  closeMenu()
  state.editing = { name, original }
  state.discarding = false
  $('editor-title').textContent = name
  $('text').value = text
  $('editor-error').hidden = true
  $('cancel').textContent = t('avbryt')
  $('tabpanel').hidden = true
  document.querySelector('.bar').hidden = true
  $('editor').hidden = false
  $('text').focus()
  $('text').setSelectionRange(0, 0)
  $('text').scrollTop = 0
}

const editContent = (text) => { const tab = current(); if (tab) openEditor(tab.file, tab.text, text) }

/** «Tilpass» opens in a window of its own; the main window shows each change it sends. */
function editSetup() {
  closeMenu()
  invoke('open_setup').catch(error => { state.problems = [String(error)]; render() })
}

/** Counts previews, so a slower one that finishes late does not show an older draft's warnings. */
let previews = 0

own.listen('preview', async ({ payload: setup }) => {
  const n = ++previews
  state.setupOpen = true
  state.setup = setup
  const loaded = new Map(state.modules.map(v => [v.file, v]))
  state.modules = setup.modules.map(v => ({ text: '', query: '', order: 'file', tags: [], open: null, reading: null, ...loaded.get(v.file), ...v }))
  if (state.tab >= state.modules.length) state.tab = 0
  const problems = applySetup()
  await loadIcons(setup, problems)
  if (n !== previews) return
  render()
  emitTo('tilpass', 'problems', problems)
})

// «Tilpass» closed, saved or not: the files decide again.
own.listen('restore', () => { state.setupOpen = false; load() })

function closeEditor() {
  state.editing = null
  $('editor').hidden = true
  $('tabpanel').hidden = false
  document.querySelector('.bar').hidden = false
  render()
  focusTab()
}

const dirty = () => $('text').value !== state.editing.original.replace(/\r\n/g, '\n')

function cancelEdit() {
  if (dirty() && !state.discarding) {
    state.discarding = true
    $('cancel').textContent = t('forkast')
    return
  }
  closeEditor()
}

async function saveEdit() {
  try {
    await invoke('save', { name: state.editing.name, original: state.editing.original, text: $('text').value })
    state.editing = null
    await load()
    closeEditor()
  } catch (error) {
    $('editor-error').hidden = false
    $('editor-error').textContent = error === 'changed' ? t('endret utenfor') : String(error)
  }
}

// Menu and hotkey

function closeMenu() {
  $('menu').hidden = true
  $('more').setAttribute('aria-expanded', 'false')
  document.querySelectorAll('.submenu-toggle').forEach(b => setSubmenu(b, false))
  state.recording = false
}

function setSubmenu(toggle, open) {
  toggle.setAttribute('aria-expanded', open)
  $(toggle.getAttribute('aria-controls')).hidden = !open
}

function toggleMenu() {
  const opening = $('menu').hidden
  closeMenu()
  if (!opening) return
  render()
  $('menu').hidden = false
  $('more').setAttribute('aria-expanded', 'true')
  $('menu').querySelector('[data-item]:not([hidden]):not(.unused) button, button[data-item]:not([hidden])')?.focus()
}

async function setView(view) {
  closeMenu()
  try {
    await invoke('set_view', { view })
  } catch (error) {
    state.error = String(error)
    return render()
  }
  await load()
}

async function exportList() {
  closeMenu()
  try {
    await invoke('export_content', { name: current().file })
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
  const tab = current()
  const views = MODULE_VIEWS[tab.module]
  const text = await file.text()
  if (!views.has(text)) {
    state.error = t('passer ikke', { fil: file.name, fane: tab.name })
    return render()
  }
  // An empty list keeps its format comment.
  if (!views.has(tab.text)) return editContent(views.merge(tab.text, text))
  state.importing = text
  $('import-dialog').returnValue = ''
  $('import-dialog').showModal()
}

function finishImport() {
  const choice = $('import-dialog').returnValue
  const tab = current()
  if (choice === 'merge') editContent(MODULE_VIEWS[tab.module].merge(tab.text, state.importing))
  else if (choice === 'replace') editContent(state.importing)
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
  const unmodified = !(e.metaKey || e.ctrlKey || e.altKey || e.shiftKey)
  if (e.key === 'Escape' && unmodified) {
    state.capturing = false
    return render()
  }
  const key = eventKey(e)
  if (!key) return
  // The order macOS menus use: ⌘⌃⌥⇧, and Win+Ctrl+Alt+Shift on Windows
  const meta = e.metaKey && (state.os === 'mac' ? 'cmd' : 'win')
  const text = [meta, e.ctrlKey && 'ctrl', e.altKey && 'alt', e.shiftKey && 'shift', key].filter(Boolean).join(' ')
  current().query = formatKeys(text, state.os)[0]
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
    state.error = t('kan ikke bruke', { taster: formatKeys(hotkey, state.os)[0] })
  }
  closeMenu()
  render()
}

// Events

$('query').addEventListener('input', e => {
  const tab = current()
  tab.query = e.target.value
  tab.open = null
  render()
})
$('clear').addEventListener('click', clearAll)
$('capture').addEventListener('click', startCapture)
$('more').addEventListener('click', toggleMenu)
document.querySelectorAll('.submenu-toggle').forEach(b => b.addEventListener('click', () => setSubmenu(b, b.getAttribute('aria-expanded') !== 'true')))
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)))
document.querySelectorAll('[data-order]').forEach(b => b.addEventListener('click', () => { current().order = b.dataset.order; closeMenu(); render() }))
$('edit-file').addEventListener('click', () => editContent())
$('edit-setup').addEventListener('click', editSetup)
$('import').addEventListener('click', chooseImport)
$('import-file').addEventListener('change', e => { if (e.target.files[0]) readImport(e.target.files[0]) })
$('import-dialog').addEventListener('close', finishImport)
$('export').addEventListener('click', exportList)
$('reveal-file').addEventListener('click', () => { closeMenu(); invoke('reveal_file', { name: current().file }) })
$('hotkey').addEventListener('click', () => { state.recording = true; render() })
$('quit').addEventListener('click', () => invoke('quit'))
$('cancel').addEventListener('click', cancelEdit)
$('save').addEventListener('click', saveEdit)
$('text').addEventListener('input', () => { state.discarding = false; $('cancel').textContent = t('avbryt') })

document.addEventListener('click', e => {
  if (!$('menu').hidden && !e.target.closest('.menu-anchor')) closeMenu()
})

// The web engine's own menu (Reload, Open Link) is not the app's; text fields keep copy and paste.
document.addEventListener('contextmenu', e => {
  if (!e.target.closest('input, textarea')) e.preventDefault()
})

function step(by) {
  const count = state.modules.length
  if (count) selectTab((state.tab + by + count) % count)
}

document.addEventListener('keydown', e => {
  if ($('import-dialog').open) return
  const mod = state.os === 'mac' ? e.metaKey : e.ctrlKey
  const tab = current()
  if (state.recording) return recordHotkey(e)
  if (state.capturing) return captureKey(e)
  if (state.editing) {
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveEdit() }
    else if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
    return
  }
  if (mod && /^[1-9]$/.test(e.key)) { e.preventDefault(); selectTab(Number(e.key) - 1) }
  else if (e.ctrlKey && e.key === 'Tab') { e.preventDefault(); step(e.shiftKey ? -1 : 1) }
  else if (mod && e.key.toLowerCase() === 'e') { e.preventDefault(); editContent() }
  else if (mod && e.key === ',') { e.preventDefault(); editSetup() }
  else if (mod && e.key.toLowerCase() === 'f') { e.preventDefault(); if (!$('search').hidden) $('query').select() }
  else if (e.key === 'Escape') {
    e.preventDefault()
    if (!$('menu').hidden) { closeMenu(); $('more').focus() }
    else if (tab?.reading != null) closeGuide(tab)
    else if (tab?.open != null) { tab.open = null; render() }
    else if (tab?.tags.length) { tab.tags = []; render() }
    else if (tab?.query) clearAll()
    else invoke('hide')
  } else if (e.target.getAttribute('role') === 'tab' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    step(e.key === 'ArrowLeft' ? -1 : 1)
    $(`tab-${state.tab}`).focus()
  }
})

// The files are the user's: read them again each time the app comes forward, and when one changes on disk.
const reload = () => { if (!state.editing && !state.setupOpen && !state.importing) load() }
window.addEventListener('focus', reload)
listen('files-changed', reload)
listen('opened', () => { if (!state.editing && !$('search').hidden) $('query').select() })

load().then(focusTab)
