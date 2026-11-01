// «Tilpass»: a window of its own. Each change shows in the open panel at once, and «Lagre» writes `Oppsett.md`.

import {
  parseSetup, formatSetup, setupHeader, fill, KINDS, MENU, COLORS, ICONS, PNG_ONLY, TEXTS, WINDOW, FONT_SIZE, FONT_PATTERN, OPTIONS,
  DEFAULT_OPTIONS, TOKENS, CARD_COUNT, listName, iconName,
} from './parse.js'
import { h, svg } from './dom.js'

const { invoke } = window.__TAURI__.core
const { listen, emitTo } = window.__TAURI__.event
const win = window.__TAURI__.webviewWindow.getCurrentWebviewWindow()

const $ = id => document.getElementById(id)

const KIND_NAMES = { hurtigtaster: 'Hurtigtaster', oppslag: 'Oppslag', kort: 'Kort', steg: 'Steg' }
const OPTION_NAMES = {
  'søk': 'Søkefelt', tasteoppslag: 'Slå opp hurtigtaster', system: 'Maskinens egne hurtigtaster', emneknagger: 'Emneknagger',
  'a–å': 'Sorter A–Å fra start',
}
const ICON_NAMES = {
  logo: 'Logo', app: 'Vinduet (Windows)', menylinje: 'Menylinjen (Mac) og oppgavelinjen (Windows)', meny: 'Flere valg', 'søk': 'Søk',
  'tøm': 'Tøm søk', tasteoppslag: 'Slå opp hurtigtast', tilbake: 'Tilbake', valgt: 'Valgt', undermeny: 'Undermeny', fjern: 'Fjern merke',
  snu: 'Snu kortet',
}
const FONTS = ['Syne', 'Inter', 'Georgia', 'Helvetica', 'Arial', 'Verdana', 'Times New Roman', 'Segoe UI', 'Calibri']
const GRIP = ['M8 5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0', 'M8 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0', 'M8 19a1 1 0 1 0 2 0a1 1 0 1 0 -2 0',
  'M14 5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0', 'M14 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0', 'M14 19a1 1 0 1 0 2 0a1 1 0 1 0 -2 0']
const UP = ['M12 5l0 14', 'M18 11l-6 -6', 'M6 11l6 -6']
const DOWN = ['M12 5l0 14', 'M18 13l-6 6', 'M6 13l6 6']
const REMOVE = ['M18 6l-12 12', 'M6 6l12 12']

/** `Oppsett.md` as last read or written, for the changed-on-disk check. */
let original = ''
let draft = null
/** Menu items in their order, the ones left out last: { key, on }. */
let menuRows = []
let dirty = false
let discarding = false
let open = new Set(['faner'])

const t = (key, values) => fill(draft.texts[key], { navn: draft.texts.navn, ...values })
const mod = e => (/Mac/.test(navigator.userAgent) ? e.metaKey : e.ctrlKey)

async function start() {
  original = await invoke('read_setup')
  draft = parseSetup(original)
  const problems = draft.problems
  draft.problems = []
  menuRows = [
    ...draft.menu.map(key => ({ key, on: true })),
    ...MENU.filter(key => key !== '---' && !draft.menu.includes(key)).map(key => ({ key, on: false })),
  ]
  dirty = false
  discarding = false
  document.title = `${t('oppsett')}: ${draft.texts.navn}`
  win.setTitle(document.title)
  $('setup-title').textContent = t('oppsett')
  $('setup-save').textContent = t('lagre')
  $('setup-cancel').textContent = t('avbryt')
  show(problems)
  render()
}

/** Closes the window; the panel reads the files again. A first try with unsaved changes asks to discard them. */
function close() {
  if (dirty && !discarding) {
    discarding = true
    $('setup-cancel').textContent = t('forkast')
    $('setup-cancel').focus()
    return
  }
  dirty = false
  win.close()
}

/** Writes `Oppsett.md` through the same changed-on-disk check as the editor. */
async function save() {
  const text = formatSetup(draft, setupHeader(original))
  try {
    original = await invoke('save_setup', { original, text })
    dirty = false
    win.close()
  } catch (error) {
    show([error === 'changed' ? t('endret utenfor') : String(error)])
  }
}

function show(problems) {
  $('setup-problems').replaceChildren(...problems.map(p => h('p', {}, p)))
}

/** Each change: the panel shows the draft; `again` builds the screen anew after a change in its structure. */
function change(again) {
  dirty = true
  discarding = false
  $('setup-cancel').textContent = t('avbryt')
  if (again) render()
  emitTo('main', 'preview', draft)
}

// Building blocks of the screen

function render() {
    const scroll = $('setup-body').scrollTop
  $('setup-body').replaceChildren(
    section('faner', 'Faner', views()),
    section('meny', 'Meny', menu()),
    section('farger', 'Farger', colors()),
    section('skrift', 'Skrift og vindu', fonts()),
    section('ikoner', 'Ikoner', icons()),
    section('tekster', 'Tekster', texts()),
    h('button', { class: 'link', onclick: () => invoke('open_setup_file').catch(e => show([String(e)])) }, 'Åpne Oppsett.md'),
  )
  $('setup-body').scrollTop = scroll
}

function section(id, title, body) {
  const details = h('details', { open: open.has(id) }, h('summary', {}, title), h('div', { class: 'setup-section' }, body))
  details.addEventListener('toggle', () => { if (details.open) open.add(id); else open.delete(id) })
  return details
}

const field = (label, control) => h('label', { class: 'field' }, h('span', {}, label), control)

function checkbox(label, checked, onchange) {
  return h('label', { class: 'check' },
    h('input', { type: 'checkbox', checked, onchange: e => onchange(e.target.checked) }), label)
}

function iconButton(label, paths, onclick, disabled) {
  return h('button', { class: 'icon-button', 'aria-label': label, title: label, onclick, disabled }, svg(paths))
}

/** Rows that move by dragging the grip or with the buttons beside them. */
function rows(items, row, apply) {
    const list = h('ol', { class: 'rows' }, items.map((item, i) => h('li', { class: 'row', 'data-index': i },
    h('span', { class: 'handle' }, svg(GRIP)),
    h('div', { class: 'row-main' }, row(item, i)),
    h('div', { class: 'row-buttons' },
      iconButton('Flytt opp', UP, () => apply(swap(items, i, i - 1)), i === 0),
      iconButton('Flytt ned', DOWN, () => apply(swap(items, i, i + 1)), i === items.length - 1)))))
  list.addEventListener('pointerdown', e => {
    const handle = e.target.closest('.handle')
    if (!handle) return
    e.preventDefault()
    const dragged = handle.closest('li')
    handle.setPointerCapture(e.pointerId)
    dragged.classList.add('dragging')
    const move = ev => {
      const after = [...list.children].filter(r => r !== dragged).find(r => {
        const box = r.getBoundingClientRect()
        return ev.clientY < box.top + box.height / 2
      })
      list.insertBefore(dragged, after ?? null)
    }
    const end = () => {
      handle.removeEventListener('pointermove', move)
      dragged.classList.remove('dragging')
      const order = [...list.children].map(r => Number(r.dataset.index))
      if (order.some((n, i) => n !== i)) apply(order.map(n => items[n]))
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', end, { once: true })
    handle.addEventListener('pointercancel', end, { once: true })
  })
  return list
}

function swap(items, a, b) {
  const copy = [...items];
  [copy[a], copy[b]] = [copy[b], copy[a]]
  return copy
}

function unique(base, taken) {
  let name = base
  for (let n = 2; taken.includes(name.toLocaleLowerCase('nb')); n++) name = `${base} ${n}`
  return name
}

function views() {
    const list = rows(draft.views, view, order => { draft.views = order; change(true) })
  const kind = h('select', { 'aria-label': 'Type' }, KINDS.map(k => h('option', { value: k }, KIND_NAMES[k])))
  const add = () => {
    const name = unique(KIND_NAMES[kind.value], draft.views.map(v => v.name.toLocaleLowerCase('nb')))
    const file = unique(name, draft.views.map(v => v.file.toLocaleLowerCase('nb').replace(/\.md$/, '')))
    draft.views.push({ name, kind: kind.value, file: `${file}.md`, options: [...DEFAULT_OPTIONS[kind.value]], placeholder: '', fresh: true })
    change(true)
  }
  return [list, h('div', { class: 'add' }, kind, h('button', { class: 'button', onclick: add }, 'Legg til fane'))]
}

function view(v, i) {
    const file = h('input', {
    value: v.file, 'aria-label': 'Fil', spellcheck: 'false',
    onchange: e => {
      const ok = listName(e.target.value.trim())
      e.target.setAttribute('aria-invalid', !ok)
      if (ok) { v.file = e.target.value.trim(); delete v.fresh; change() }
    },
  })
  const name = h('input', {
    value: v.name, 'aria-label': 'Navn på fanen',
    oninput: e => {
      v.name = e.target.value
      // A new tab's file follows its name until the user names the file.
      const stem = v.name.replace(/[\\/:*?"<>|]/g, '').trim().replace(/^\.+/, '')
      if (v.fresh && stem && listName(`${stem}.md`)) { v.file = `${stem}.md`; file.value = v.file }
      if (v.name.trim()) change()
    },
  })
  return [
    h('div', { class: 'row-line' },
      name,
      h('select', {
        'aria-label': 'Type',
        onchange: e => { v.kind = e.target.value; v.options = [...DEFAULT_OPTIONS[v.kind]]; change(true) },
      }, KINDS.map(k => h('option', { value: k, selected: k === v.kind }, KIND_NAMES[k]))),
      iconButton(`Fjern ${v.name}`, REMOVE, () => { draft.views.splice(i, 1); change(true) })),
    h('div', { class: 'checks' }, OPTIONS[v.kind].map(o => checkbox(OPTION_NAMES[o], v.options.includes(o), on => {
      v.options = OPTIONS[v.kind].filter(x => (x === o ? on : v.options.includes(x)))
      change(o === 'søk')
    }))),
    ...(v.kind !== 'kort' ? [] : [['columns', 'Kort i bredden'], ['rows', 'Kort i høyden']]).map(([prop, label]) => field(label, h('select', {
      // null, not undefined: the preview event is JSON, and «Automatisk» must reach the panel
      onchange: e => { v[prop] = Number(e.target.value) || null; change() },
    }, h('option', { value: '' }, 'Automatisk'), Array.from({ length: CARD_COUNT[1] - CARD_COUNT[0] + 1 }, (_, n) => n + CARD_COUNT[0])
      .map(n => h('option', { value: n, selected: v[prop] === n }, String(n)))))),
    v.options.includes('søk') && field('Tekst i søkefeltet', h('input', {
      value: v.placeholder, placeholder: t('søk'), oninput: e => { v.placeholder = e.target.value.trim(); change() },
    })),
    field('Fil', file),
  ]
}

function menuLabel(key) {
  const labels = {
    visning: t('visning'), kildedata: t('kildedata', { visning: '' }).trim(), oppsett: t('oppsett'),
    hurtigåpner: t('endre hurtigåpner'), avslutt: t('avslutt'), versjon: 'Versjon', '---': 'Skillelinje',
  }
  return labels[key]
}

function menu() {
    const apply = order => {
    menuRows = order
    draft.menu = menuRows.filter(r => r.on || r.key === '---').map(r => r.key)
    change(true)
  }
  const list = rows(menuRows, (r, i) => [h('div', { class: 'row-line' },
    r.key === '---'
      ? [h('span', { class: 'separator' }, menuLabel(r.key)), iconButton('Fjern skillelinjen', REMOVE, () => apply(menuRows.filter((_, n) => n !== i)))]
      : checkbox(menuLabel(r.key), r.on, on => { r.on = on; apply(menuRows) }))], apply)
  return [list, h('div', { class: 'add' }, h('button', { class: 'button', onclick: () => apply([...menuRows, { key: '---', on: true }]) }, 'Legg til skillelinje'))]
}

/** The colour as #rrggbb for a colour field: the setup's, or the stylesheet's own. */
function hex(name, mode) {
  const value = draft.colors[name]?.[mode === 'light' ? 'light' : 'dark']
    ?? getComputedStyle(document.documentElement).getPropertyValue(`--${TOKENS[name]}-${mode}`).trim()
  const probe = h('span', { hidden: true })
  document.body.append(probe)
  probe.style.color = value
  const color = getComputedStyle(probe).color
  probe.remove()
  const numbers = color.match(/[\d.]+/g).slice(0, 3).map(Number)
  const rgb = color.startsWith('color(') ? numbers.map(n => n * 255) : numbers
  return `#${rgb.map(n => Math.round(n).toString(16).padStart(2, '0')).join('')}`
}

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

function colors() {
    // A picker and its hex code: either one sets the colour and shows in the other.
  const input = (name, mode) => {
    const label = `${name}, ${mode === 'light' ? 'lys' : 'mørk'} modus`
    const set = value => {
      draft.colors[name] = { light: hex(name, 'light'), dark: hex(name, 'dark'), [mode]: value }
      change()
    }
    const picker = h('input', {
      type: 'color', value: hex(name, mode), 'aria-label': label,
      oninput: e => { code.value = e.target.value; code.removeAttribute('aria-invalid'); set(e.target.value) },
    })
    const code = h('input', {
      class: 'hex', value: picker.value, maxlength: 7, spellcheck: 'false', 'aria-label': `${label}, hex-kode`,
      oninput: e => {
        const match = e.target.value.trim().match(HEX)
        e.target.setAttribute('aria-invalid', !match)
        if (!match) return
        const digits = match[1].toLowerCase()
        picker.value = `#${digits.length === 3 ? [...digits].map(d => d + d).join('') : digits}`
        set(picker.value)
      },
      onchange: e => { e.target.value = picker.value; e.target.removeAttribute('aria-invalid') },
    })
    return h('span', { class: 'color' }, picker, code)
  }
  return [
    h('table', { class: 'colors' },
      h('thead', {}, h('tr', {}, h('th', {}), h('th', {}, 'Lys'), h('th', {}, 'Mørk'))),
      h('tbody', {}, COLORS.map(name => h('tr', {},
        h('th', { scope: 'row' }, name[0].toLocaleUpperCase('nb') + name.slice(1)), h('td', {}, input(name, 'light')), h('td', {}, input(name, 'dark')))))),
    h('div', { class: 'add' }, h('button', { class: 'button', onclick: () => { draft.colors = {}; change(true) } }, 'Bruk standardfargene')),
  ]
}

function fonts() {
    const font = key => h('input', {
    value: draft.fonts[key] ?? '', list: 'setup-fonts', placeholder: key === 'tekst' ? 'Syne' : 'Inter', spellcheck: 'false',
    oninput: e => {
      const value = e.target.value.trim()
      e.target.setAttribute('aria-invalid', Boolean(value) && !FONT_PATTERN.test(value))
      if (!value) delete draft.fonts[key]
      else if (FONT_PATTERN.test(value)) draft.fonts[key] = value
      else return
      change()
    },
  })
  const number = (target, key, [min, max], fallback) => h('input', {
    type: 'number', min, max, value: target[key] ?? fallback,
    onchange: e => {
      const value = Number(e.target.value)
      const ok = Number.isInteger(value) && value >= min && value <= max
      e.target.setAttribute('aria-invalid', !ok)
      if (ok) { target[key] = value; change() }
    },
  })
  const type = draft.window.type ?? 'panel'
  const radio = (value, label) => h('label', { class: 'check' }, h('input', {
    type: 'radio', name: 'setup-window', checked: type === value, onchange: () => { draft.window.type = value; change() },
  }), label)
  return [
    h('datalist', { id: 'setup-fonts' }, FONTS.map(f => h('option', { value: f }))),
    field('Skrift', font('tekst')),
    field('Skrift på taster', font('taster')),
    field('Størrelse', number(draft.fonts, 'størrelse', FONT_SIZE, 14)),
    h('div', { class: 'checks', role: 'radiogroup', 'aria-label': 'Vindu' }, radio('panel', 'Panel ved ikonet'), radio('vindu', 'Vanlig vindu')),
    field('Bredde', number(draft.window, 'bredde', WINDOW.bredde, 420)),
    field('Høyde', number(draft.window, 'høyde', WINDOW.høyde, 600)),
  ]
}

async function addIcon(key, name, bytes) {
  if (!iconName(name, key)) {
    show([PNG_ONLY.includes(key) ? `${name}: Velg en .png-fil` : `${name}: Velg en .svg- eller .png-fil`])
    return
  }
  try {
    const file = await invoke('add_icon', { name, bytes: Array.from(new Uint8Array(bytes)) })
    draft.icons[key] = { file, color: draft.icons[key]?.color ?? false }
    change(true)
  } catch (error) {
    show([String(error)])
  }
}

function icons() {
    return h('ul', { class: 'rows' }, ICONS.map(key => {
    const chooser = h('input', {
      type: 'file', hidden: true, accept: PNG_ONLY.includes(key) ? '.png' : '.svg,.png',
      onchange: async e => { const f = e.target.files[0]; if (f) addIcon(key, f.name, await f.arrayBuffer()) },
    })
    const set = draft.icons[key]
    return h('li', { class: 'row icon-row', 'data-drop': `icon:${key}` },
      h('div', { class: 'row-main' },
        h('div', { class: 'row-line' },
          h('span', { class: 'icon-name' }, ICON_NAMES[key], h('span', { class: 'icon-file' }, set?.file ?? 'Standard')),
          chooser,
          h('button', { class: 'button', onclick: () => chooser.click() }, 'Velg fil …'),
          set && iconButton(`Bruk standard for ${ICON_NAMES[key]}`, REMOVE, () => { delete draft.icons[key]; change(true) })),
        set && key === 'menylinje' && checkbox('Behold fargene', set.color, on => { set.color = on; change() })))
  }))
}

function texts() {
    return Object.keys(TEXTS).map(key => field(key, h('input', {
    value: draft.texts[key] === TEXTS[key] ? '' : draft.texts[key], placeholder: TEXTS[key],
    oninput: e => { draft.texts[key] = e.target.value || TEXTS[key]; change() },
  })))
}

/** Files dropped from Finder or Explorer: an icon on its row. */
async function dropped({ type, paths, position }) {
  document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'))
  if (type === 'leave') return
  const at = position && document.elementFromPoint(position.x / devicePixelRatio, position.y / devicePixelRatio)?.closest('[data-drop]')
  if (type === 'over' || type === 'enter') {
    at?.classList.add('drop-target')
    return
  }
  if (type !== 'drop' || !at || !paths?.length) return
  const path = paths[0]
  const key = at.dataset.drop.split(':')[1]
  try {
    const bytes = await invoke('read_dropped', { path })
    await addIcon(key, path.split(/[\\/]/).pop(), bytes)
  } catch (error) {
    show([String(error)])
  }
}

$('setup-save').addEventListener('click', save)
$('setup-cancel').addEventListener('click', close)

document.addEventListener('keydown', e => {
  if (mod(e) && e.key.toLowerCase() === 's') { e.preventDefault(); save() }
  else if ((mod(e) && e.key.toLowerCase() === 'w') || (e.key === 'Escape' && !e.target.closest('input, select'))) { e.preventDefault(); close() }
})

document.addEventListener('contextmenu', e => {
  if (!e.target.closest('input, textarea')) e.preventDefault()
})

win.onCloseRequested(e => {
  if (dirty && !discarding) {
    e.preventDefault()
    close()
  }
})

// The panel's warnings for the draft: contrast and icons it could not read.
win.listen('problems', e => show(e.payload))
// `Oppsett.md` changed in an editor: shown here too, unless this window holds changes of its own.
listen('files-changed', () => { if (!dirty) start() })
window.__TAURI__.webview.getCurrentWebview().onDragDropEvent(event => dropped(event.payload))

start()
