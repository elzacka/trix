// The setup screen: the admin ticks, chooses and drags; each change shows in the app at once, and «Lagre» writes `Oppsett.md`.

import {
  formatSetup, setupHeader, KINDS, MENU, COLORS, ICONS, PNG_ONLY, TEXTS, WINDOW, FONT_SIZE, FONT_PATTERN, OPTIONS, DEFAULT_OPTIONS,
  TOKENS, SETUP_FILE, listName, iconName,
} from './parse.js'

const $ = id => document.getElementById(id)

const KIND_NAMES = { hurtigtaster: 'Hurtigtaster', oppslag: 'Oppslag', kort: 'Kort', artikler: 'Artikler' }
const OPTION_NAMES = {
  'søk': 'Søkefelt', tasteoppslag: 'Slå opp hurtigtaster', system: 'Maskinens egne hurtigtaster', emneknagger: 'Emneknagger',
  'a–å': 'Sorter A–Å fra start',
}
const ICON_NAMES = {
  logo: 'Logo', app: 'Vinduet (Windows)', menylinje: 'Menylinjen (Mac) og oppgavelinjen (Windows)', meny: 'Flere valg', 'søk': 'Søk',
  'tøm': 'Tøm søk', tasteoppslag: 'Slå opp hurtigtast', tilbake: 'Tilbake', valgt: 'Valgt', undermeny: 'Undermeny', fjern: 'Fjern merke',
}
const FONTS = ['Syne', 'Inter', 'Georgia', 'Helvetica', 'Arial', 'Verdana', 'Times New Roman', 'Segoe UI', 'Calibri']
const GRIP = ['M8 5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0', 'M8 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0', 'M8 19a1 1 0 1 0 2 0a1 1 0 1 0 -2 0',
  'M14 5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0', 'M14 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0', 'M14 19a1 1 0 1 0 2 0a1 1 0 1 0 -2 0']
const UP = ['M12 5l0 14', 'M18 11l-6 -6', 'M6 11l6 -6']
const DOWN = ['M12 5l0 14', 'M18 13l-6 6', 'M6 13l6 6']
const REMOVE = ['M18 6l-12 12', 'M6 6l12 12']

let ctx = null
let draft = null
/** Menu items in their order, the ones left out last: { key, on }. */
let menuRows = []
let dirty = false
let discarding = false
let open = new Set(['faner'])

export function openSetup(context) {
  ctx = context
  draft = structuredClone(ctx.state.setup)
  draft.problems = []
  menuRows = [
    ...draft.menu.map(key => ({ key, on: true })),
    ...MENU.filter(key => key !== '---' && !draft.menu.includes(key)).map(key => ({ key, on: false })),
  ]
  dirty = false
  discarding = false
  ctx.state.setupOpen = true
  ctx.invoke('keep_open', { open: true })
  $('view').hidden = true
  $('setup').hidden = false
  $('setup-save').textContent = ctx.t('lagre')
  $('setup-cancel').textContent = ctx.t('avbryt')
  $('setup-problems').replaceChildren()
  render()
  $('setup-title').focus()
}

function finish() {
  ctx.state.setupOpen = false
  ctx.invoke('keep_open', { open: false })
  $('setup').hidden = true
  $('view').hidden = false
}

export async function closeSetup() {
  if (!ctx?.state.setupOpen) return
  if (dirty && !discarding) {
    discarding = true
    $('setup-cancel').textContent = ctx.t('forkast')
    return
  }
  finish()
  await ctx.restore()
}

/** Writes `Oppsett.md` through the same changed-on-disk check as the editor. */
async function write() {
  const text = formatSetup(draft, setupHeader(ctx.state.setupText))
  try {
    ctx.state.setupText = await ctx.invoke('save', { name: SETUP_FILE, original: ctx.state.setupText, text })
    dirty = false
    return true
  } catch (error) {
    show([error === 'changed' ? ctx.t('endret utenfor') : String(error)])
    return false
  }
}

async function save() {
  if (!(await write())) return
  finish()
  await ctx.saved()
}

function show(problems) {
  $('setup-problems').replaceChildren(...problems.map(p => ctx.h('p', {}, p)))
}

/** Each change: the app shows the draft; `again` builds the screen anew after a change in its structure. */
async function change(again) {
  dirty = true
  discarding = false
  $('setup-cancel').textContent = ctx.t('avbryt')
  if (again) render()
  show(await ctx.preview(structuredClone(draft)))
}

// Building blocks of the screen

function render() {
  const { h } = ctx
  const scroll = $('setup-body').scrollTop
  $('setup-body').replaceChildren(
    section('faner', 'Faner', views()),
    section('meny', 'Meny', menu()),
    section('farger', 'Farger', colors()),
    section('skrift', 'Skrift og vindu', fonts()),
    section('ikoner', 'Ikoner', icons()),
    section('tekster', 'Tekster', texts()),
    section('team', 'Del med teamet', team()),
    h('button', { class: 'link', onclick: editText }, 'Rediger som tekst'),
  )
  $('setup-body').scrollTop = scroll
}

function section(id, title, body) {
  const details = ctx.h('details', { open: open.has(id) }, ctx.h('summary', {}, title), ctx.h('div', { class: 'setup-section' }, body))
  details.addEventListener('toggle', () => { if (details.open) open.add(id); else open.delete(id) })
  return details
}

const field = (label, control) => ctx.h('label', { class: 'field' }, ctx.h('span', {}, label), control)

function checkbox(label, checked, onchange) {
  return ctx.h('label', { class: 'check' },
    ctx.h('input', { type: 'checkbox', checked, onchange: e => onchange(e.target.checked) }), label)
}

function iconButton(label, paths, onclick, disabled) {
  return ctx.h('button', { class: 'icon-button', 'aria-label': label, title: label, onclick, disabled }, ctx.icon('', paths))
}

/** Rows that move by dragging the grip or with the buttons beside them. */
function rows(items, row, apply) {
  const { h } = ctx
  const list = h('ol', { class: 'rows' }, items.map((item, i) => h('li', { class: 'row', 'data-index': i },
    h('span', { class: 'handle' }, ctx.icon('', GRIP)),
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
  const { h } = ctx
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
  const { h } = ctx
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
      // A new tab's file follows its name until the admin names the file.
      const stem = v.name.replace(/[\\/:*?"<>|]/g, '').trim().replace(/^\.+/, '')
      if (v.fresh && stem) { v.file = `${stem}.md`; file.value = v.file }
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
    v.options.includes('søk') && field('Tekst i søkefeltet', h('input', {
      value: v.placeholder, placeholder: ctx.t('søk'), oninput: e => { v.placeholder = e.target.value.trim(); change() },
    })),
    field('Fil', file),
  ]
}

function menuLabel(key) {
  const labels = {
    visning: ctx.t('visning'), kildedata: ctx.t('kildedata', { visning: '' }).trim(), oppsett: ctx.t('oppsett'),
    hurtigåpner: ctx.t('endre hurtigåpner'), avslutt: ctx.t('avslutt'), versjon: 'Versjon', '---': 'Skillelinje',
  }
  return labels[key]
}

function menu() {
  const { h } = ctx
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
  const probe = ctx.h('span', { hidden: true })
  document.body.append(probe)
  probe.style.color = value
  const color = getComputedStyle(probe).color
  probe.remove()
  const numbers = color.match(/[\d.]+/g).slice(0, 3).map(Number)
  const rgb = color.startsWith('color(') ? numbers.map(n => n * 255) : numbers
  return `#${rgb.map(n => Math.round(n).toString(16).padStart(2, '0')).join('')}`
}

function colors() {
  const { h } = ctx
  const input = (name, mode) => h('input', {
    type: 'color', value: hex(name, mode), 'aria-label': `${name}, ${mode === 'light' ? 'lys' : 'mørk'} modus`,
    oninput: e => {
      draft.colors[name] = { light: hex(name, 'light'), dark: hex(name, 'dark'), [mode]: e.target.value }
      change()
    },
  })
  return [
    h('table', { class: 'colors' },
      h('thead', {}, h('tr', {}, h('th', {}), h('th', {}, 'Lys'), h('th', {}, 'Mørk'))),
      h('tbody', {}, COLORS.map(name => h('tr', {},
        h('th', { scope: 'row' }, name[0].toLocaleUpperCase('nb') + name.slice(1)), h('td', {}, input(name, 'light')), h('td', {}, input(name, 'dark')))))),
    h('div', { class: 'add' }, h('button', { class: 'button', onclick: () => { draft.colors = {}; change(true) } }, 'Bruk standardfargene')),
  ]
}

function fonts() {
  const { h } = ctx
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
    const file = await ctx.invoke('add_icon', { name, bytes: Array.from(new Uint8Array(bytes)) })
    draft.icons[key] = { file, color: draft.icons[key]?.color ?? false }
    change(true)
  } catch (error) {
    show([String(error)])
  }
}

function icons() {
  const { h } = ctx
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
  const { h } = ctx
  return Object.keys(TEXTS).map(key => field(key, h('input', {
    value: draft.texts[key] === TEXTS[key] ? '' : draft.texts[key], placeholder: TEXTS[key],
    oninput: e => { draft.texts[key] = e.target.value || TEXTS[key]; change() },
  })))
}

/** The files a team's copy needs: the setup, each view's file, each icon. */
const files = () => [SETUP_FILE, ...draft.views.map(v => v.file), ...Object.values(draft.icons).map(i => i.file)]

function team() {
  const { h } = ctx
  const target = h('input', { id: 'setup-target', value: ctx.state.publishTo, placeholder: 'Slipp mappen her', spellcheck: 'false' })
  const status = h('p', { class: 'status', role: 'status' })
  const run = async (command, args, done) => {
    if (dirty && !(await write())) return false
    await ctx.saved()
    try {
      await ctx.invoke(command, { files: files(), ...args })
      status.textContent = done
      return true
    } catch (error) {
      status.textContent = String(error)
      return false
    }
  }
  return [
    h('div', { 'data-drop': 'folder' }, field('Mappen til teamet', target)),
    h('div', { class: 'add' },
      h('button', {
        class: 'button primary',
        onclick: async () => { if (await run('publish', { target: target.value }, `Publisert til ${target.value}`)) ctx.state.publishTo = target.value },
      }, 'Publiser'),
      h('button', { class: 'button', onclick: () => run('export_team', { name: draft.texts.navn }, 'Zip-fila ligger i Nedlastinger') }, 'Lag zip')),
    status,
  ]
}

async function editText() {
  finish()
  await ctx.restore()
  ctx.editText()
}

/** Files and folders dropped from Finder or Explorer: an icon on its row, a folder on the team field. */
export async function dropped({ type, paths, position }) {
  if (!ctx?.state.setupOpen) return
  document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'))
  if (type === 'leave') return
  const at = position && document.elementFromPoint(position.x / devicePixelRatio, position.y / devicePixelRatio)?.closest('[data-drop]')
  if (type === 'over' || type === 'enter') {
    at?.classList.add('drop-target')
    return
  }
  if (type !== 'drop' || !at || !paths?.length) return
  const path = paths[0]
  const [what, key] = at.dataset.drop.split(':')
  if (what === 'folder') {
    $('setup-target').value = path
    return
  }
  try {
    const bytes = await ctx.invoke('read_dropped', { path })
    await addIcon(key, path.split(/[\\/]/).pop(), bytes)
  } catch (error) {
    show([String(error)])
  }
}

$('setup-save').addEventListener('click', save)
$('setup-cancel').addEventListener('click', closeSetup)
