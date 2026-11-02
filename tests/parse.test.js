import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  formatKeys, comboId, lookupId, lookupShortcuts, parseShortcuts, filterShortcuts, parseEntries, lead, alphabetical, searchEntries, inline,
  mergeShortcuts, mergeEntries, sortShortcuts, parseSetup, fill, contrast, contrastProblems, contentName, iconName, TEXTS, TOKENS, MODULES,
  formatSetup, setupHeader, CELL_LIMIT,
} from '../ui/parse.js'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')

test('keys as symbols on a Mac and words on Windows', () => {
  assert.deepEqual(formatKeys('ctrl shift S', 'windows'), ['Ctrl+Shift+S'])
  assert.deepEqual(formatKeys('ctrl+shift+s', 'mac'), ['⌃⇧S'])
  assert.deepEqual(formatKeys('⌘⇧4', 'mac'), ['⌘⇧4'])
  assert.deepEqual(formatKeys('⌃⌘ mellomrom eller fn E', 'mac'), ['⌃⌘ Mellomrom', 'fn E'])
  assert.deepEqual(formatKeys('⌘⌥ esc', 'mac'), ['⌘⌥ Esc'])
  assert.deepEqual(formatKeys('win .', 'windows'), ['Win+.'])
  assert.deepEqual(formatKeys('ctrl +', 'windows'), ['Ctrl++'])
  assert.deepEqual(formatKeys('CommandOrControl+Alt+KeyT', 'mac'), ['⌘⌥T'])
  assert.deepEqual(formatKeys('CommandOrControl+Alt+KeyT', 'windows'), ['Ctrl+Alt+T'])
})

test('one or two key columns, in file order', () => {
  const text = [
    '# Tittel', '<!--', '- Skjult | ctrl H', '-->', '## A', '- Kopier | ctrl C | ⌘C',
    '- Bare Windows | win D |', '- Felles | F1', 'Notat', '## Tom', '## B', '* Lim inn | ctrl V',
  ].join('\r\n')
  assert.deepEqual(parseShortcuts(text, 'mac'), [
    { title: 'A', items: [
      { title: 'Kopier', keys: [[{ keys: '⌘C' }]], combos: ['cmd C'] },
      { title: 'Felles', keys: [[{ keys: 'F1' }]], combos: ['F1'] },
    ] },
    { title: 'B', items: [{ title: 'Lim inn', keys: [[{ keys: '⌃V' }]], combos: ['ctrl V'] }] },
  ])
  assert.equal(parseShortcuts(text, 'windows')[0].items[1].keys[0][0].keys, 'Win+D')
  const pipe = parseShortcuts('- Loddrett strek \\| | | ⌥7\n- Omvendt skråstrek \\ | | ⌥⇧7', 'mac')[0].items
  assert.deepEqual(pipe.map(i => [i.title, i.keys[0][0].keys]), [['Loddrett strek |', '⌥7'], ['Omvendt skråstrek \\', '⌥⇧7']])
  const [held] = parseShortcuts('- Lukk | "Hold inne" ctrl W eller ctrl K «så» ctrl W | ⌘W', 'windows')[0].items
  assert.deepEqual(held.keys, [[{ text: 'Hold inne' }, { keys: 'Ctrl+W' }], [{ keys: 'Ctrl+K' }, { text: 'så' }, { keys: 'Ctrl+W' }]])
  assert.deepEqual(held.combos, ['ctrl W'])
})

test('search matches group, name and keys', () => {
  const sections = parseShortcuts('## Redigering\n- Kopier | ctrl C\n- Lim inn | ctrl V', 'windows')
  assert.equal(filterShortcuts(sections, 'redigering lim')[0].items.length, 1)
  assert.equal(filterShortcuts(sections, 'ctrl+c')[0].items[0].title, 'Kopier')
  assert.deepEqual(filterShortcuts(sections, 'finnes ikke'), [])
})

test('a combination is the same however it is written', () => {
  assert.equal(comboId('⌘⇧4', 'mac'), 'shift cmd 4')
  assert.equal(comboId('shift cmd 4', 'mac'), 'shift cmd 4')
  assert.equal(comboId('Ctrl+Shift+S', 'windows'), comboId('shift ctrl s', 'windows'))
  assert.equal(comboId('mod c', 'mac'), 'cmd C')
  assert.equal(comboId('kopier', 'mac'), null)
})

test('a search reads as a lookup only when it is a combination', () => {
  assert.equal(lookupId('cmd shift 4', 'mac'), 'shift cmd 4')
  assert.equal(lookupId('F11', 'windows'), 'F11')
  assert.equal(lookupId('lim', 'mac'), null)
  assert.equal(lookupId('tab', 'mac'), null)
  assert.equal(lookupId('shift', 'mac'), null)
  assert.equal(lookupId('', 'mac'), null)
  assert.equal(lookupId('ctrl +', 'windows'), 'ctrl +')
})

test('lookup finds every line that uses the combination, alternatives included', () => {
  const sections = parseShortcuts('## A\n- Emoji | win . | ⌃⌘ mellomrom eller fn E\n- Søk | win S | ⌘ mellomrom', 'mac')
  assert.deepEqual(lookupShortcuts(sections, lookupId('fn e', 'mac'))[0].items.map(i => i.title), ['Emoji'])
  assert.deepEqual(lookupShortcuts(sections, lookupId('cmd mellomrom', 'mac'))[0].items.map(i => i.title), ['Søk'])
  assert.deepEqual(lookupShortcuts(sections, lookupId('cmd X', 'mac')), [])
})

const sheet = [
  '# Jukselapp', '## KI', '### Benchmark', 'Første linje', 'fortsetter.', '', 'Nytt avsnitt.',
  'Også: Referansetest, evaluation suite', '#ki #Analyse', '## Personvern', '### Anonymisering',
  'Forklaring.', '#personvern', '### Åpne vekter', 'Vekter.', '#ki',
].join('\n')

test('entries with paragraphs, aliases and tags', () => {
  const [ki, personvern] = parseEntries(sheet)
  assert.equal(ki.title, 'KI')
  assert.deepEqual(ki.entries[0], {
    id: 0, title: 'Benchmark', blocks: [{ type: 'p', text: 'Første linje fortsetter.' }, { type: 'p', text: 'Nytt avsnitt.' }],
    aliases: ['Referansetest', 'evaluation suite'], tags: ['ki', 'analyse'],
  })
  assert.deepEqual(personvern.entries.map(e => e.id), [1, 2])
})

test('entries with subheadings and lists: a card\'s back, a guide\'s steps', () => {
  const text = '## G\n### Kort\nForside\n#### Hva\n- en\n\n- to\nTekst\n1. først\n2) så\n#emne'
  const [card] = parseEntries(text)[0].entries
  assert.equal(lead(card), 'Forside')
  assert.deepEqual(card.blocks, [
    { type: 'p', text: 'Forside' }, { type: 'h', text: 'Hva' }, { type: 'ul', items: ['en', 'to'] },
    { type: 'p', text: 'Tekst' }, { type: 'ol', items: ['først', 'så'] },
  ])
  assert.deepEqual(card.tags, ['emne'])
  assert.equal(lead(parseEntries('### A\n#### Steg\nTekst')[0].entries[0]), '')
  assert.deepEqual(searchEntries(parseEntries(text), 'så').map(e => e.title), ['Kort'])
})

test('tables: header, alignment, rows; a pipe inside a cell; searchable', () => {
  const text = '### Kort\nForside\n| Hvem | Nummer |\n| :-- | --: |\n| Brann | 110 |\n| a \\| b | 112\nEtter'
  const [card] = parseEntries(text)[0].entries
  assert.deepEqual(card.blocks, [
    { type: 'p', text: 'Forside' },
    { type: 'table', head: ['Hvem', 'Nummer'], align: ['', 'right'], rows: [['Brann', '110'], ['a | b', '112']] },
    { type: 'p', text: 'Etter' },
  ])
  assert.deepEqual(parseEntries('### A\n| x |\n| y |\n\n| z |')[0].entries[0].blocks, [
    { type: 'table', head: ['x'], align: [], rows: [['y']] },
    { type: 'table', head: ['z'], align: [], rows: [] },
  ])
  assert.deepEqual(searchEntries(parseEntries(text), '110').map(e => e.title), ['Kort'])
  // Rows are padded to the header's width when shown: a wide header times many short rows stops at the limit
  const wide = parseEntries(`### A\n${'|'.repeat(1001)}\n${'|\n'.repeat(1000)}`)[0].entries[0].blocks[0]
  assert.equal(wide.head.length * wide.rows.length, CELL_LIMIT)
})

test('A–Å groups by first letter with Å last', () => {
  assert.deepEqual(alphabetical(parseEntries(sheet)).map(s => s.title), ['A', 'B', 'Å'])
})

test('search: one letter, words, tags', () => {
  const sections = parseEntries(sheet)
  assert.deepEqual(searchEntries(sections, 'b').map(e => e.title), ['Benchmark'])
  assert.deepEqual(searchEntries(sections, 'referansetest').map(e => e.title), ['Benchmark'])
  assert.deepEqual(searchEntries(sections, 'vekter').map(e => e.title), ['Åpne vekter'])
  assert.deepEqual(searchEntries(sections, '', ['ki']).map(e => e.title), ['Benchmark', 'Åpne vekter'])
})

test('inline Markdown', () => {
  assert.deepEqual(inline('Se **fet** og [side](https://example.no).'), [
    { type: 'text', text: 'Se ' }, { type: 'strong', text: 'fet' }, { type: 'text', text: ' og ' },
    { type: 'link', text: 'side', href: 'https://example.no' }, { type: 'text', text: '.' },
  ])
  assert.deepEqual(inline('[x](javascript:alert(1))'), [{ type: 'text', text: '[x](javascript:alert(1))' }])
})

test('the templates parse', () => {
  const shortcuts = read('../seed/maler/hurtigtaster.md')
  assert.equal(parseShortcuts(shortcuts, 'windows').length, 2)
  assert.equal(parseShortcuts(shortcuts, 'mac').flatMap(s => s.items).every(i => i.keys.length), true)
  assert.equal(parseEntries(read('../seed/maler/oppslag.md')).flatMap(s => s.entries).length, 9)
  for (const module of ['kort', 'steg']) {
    const entries = parseEntries(read(`../seed/maler/${module}.md`)).flatMap(s => s.entries)
    assert.ok(entries.length > 1 && entries.every(e => lead(e) && e.blocks.length > 1), module)
  }
  for (const module of MODULES) assert.match(read(`../seed/maler/${module}.md`), /^# \{navn\}\n/)
})

test('the seed setup is the default setup, with every text', () => {
  const seed = parseSetup(read('../seed/Oppsett.md'))
  const defaults = parseSetup('')
  assert.deepEqual(seed.problems, [])
  assert.deepEqual(seed.modules, defaults.modules)
  assert.deepEqual(seed.menu, defaults.menu)
  assert.deepEqual(seed.texts, TEXTS)
  const listed = read('../seed/Oppsett.md').split('## Tekster').at(-1).match(/^- [^|]+/gm).map(l => l.slice(2).trim())
  assert.deepEqual(listed, Object.keys(TEXTS))
})

test('the seed colours, fonts and window are the stylesheet\'s and the config\'s', () => {
  const seed = parseSetup(read('../seed/Oppsett.md'))
  const css = read('../ui/style.css')
  assert.deepEqual(Object.keys(seed.colors), Object.keys(TOKENS))
  for (const [name, { light, dark }] of Object.entries(seed.colors)) {
    assert.ok(css.includes(`--${TOKENS[name]}-light: ${light};`) && css.includes(`--${TOKENS[name]}-dark: ${dark};`), name)
  }
  assert.ok(css.includes(`--font-text: "${seed.fonts.tekst}"`) && css.includes(`--font-keys: "${seed.fonts.taster}"`))
  assert.ok(css.includes(`--font-size: ${seed.fonts.størrelse}px;`))
  const [main] = JSON.parse(read('../src-tauri/tauri.conf.json')).app.windows
  assert.deepEqual([main.width, main.height], [seed.window.bredde, seed.window.høyde])
})

test('setup: modules in order, options, the same module twice', () => {
  const setup = parseSetup([
    '## Visninger', '- Ordliste | Oppslag | Ordliste.md', '- Taster | hurtigtaster | Taster.md | søk, system',
    '- Spørsmål | oppslag | Spørsmål og svar.md | søk, A-Å', '- Telefonliste | oppslag | Telefonliste.md | søk | Navn eller nummer',
    '- Lenker | oppslag | Lenker.md | | Finn en lenke', '- Liste | oppslag | Liste.md |', '## Meny', '- avslutt', '- ---', '- versjon',
  ].join('\n'))
  assert.deepEqual(setup.problems, [])
  assert.deepEqual(setup.modules.map(v => [v.name, v.module, v.file, v.options, v.placeholder]), [
    ['Ordliste', 'oppslag', 'Ordliste.md', ['søk', 'emneknagger'], ''],
    ['Taster', 'hurtigtaster', 'Taster.md', ['søk', 'system'], ''],
    ['Spørsmål', 'oppslag', 'Spørsmål og svar.md', ['søk', 'a–å'], ''],
    ['Telefonliste', 'oppslag', 'Telefonliste.md', ['søk'], 'Navn eller nummer'],
    ['Lenker', 'oppslag', 'Lenker.md', ['søk', 'emneknagger'], 'Finn en lenke'],
    ['Liste', 'oppslag', 'Liste.md', [], ''],
  ])
  assert.deepEqual(setup.menu, ['avslutt', '---', 'versjon'])
})

test('setup: cards across and down', () => {
  const setup = parseSetup('## Visninger\n- Kort | kort | Kort.md | søk, 3 i bredden, 2 I HØYDEN\n- Auto | kort | Auto.md | søk')
  assert.deepEqual(setup.problems, [])
  assert.deepEqual(setup.modules.map(v => [v.options, v.columns, v.rows]), [[['søk'], 3, 2], [['søk'], undefined, undefined]])
  assert.match(formatSetup(setup, '# Oppsett'), /- Kort \| kort \| Kort\.md \| søk, 3 i bredden, 2 i høyden\n- Auto \| kort \| Auto\.md \| søk\n/)
  assert.deepEqual(parseSetup('## Visninger\n- K | kort | K.md | 7 i bredden\n- O | oppslag | O.md | 2 i høyden').problems, [
    'Oppsett.md, linje 2: Antall kort i bredden må være et heltall fra 1 til 6',
    'Oppsett.md, linje 3: «2 i høyden» passer ikke til modulen oppslag',
  ])
})

test('setup: colours, fonts, window, icons and texts', () => {
  const setup = parseSetup([
    '## Farger', '- Aksent | #c00 | #f88', '- tekst | navy', '## Skrift', '- tekst | Georgia', '- størrelse | 16',
    '## Vindu', '- bredde | 600', '## Ikoner', '- logo | logo.svg', '- menylinje | prikk.png | farge', '## Tekster', '- navn | Verktøykassa',
    '- søk | Finn \\| filtrer',
  ].join('\n'))
  assert.deepEqual(setup.problems, [])
  assert.deepEqual(setup.colors, { aksent: { light: '#c00', dark: '#f88', line: 2 }, tekst: { light: 'navy', dark: 'navy', line: 3 } })
  assert.deepEqual(setup.fonts, { tekst: 'Georgia', størrelse: 16 })
  assert.deepEqual(setup.window, { bredde: 600 })
  assert.deepEqual(setup.icons, { logo: { file: 'logo.svg', color: false, line: 10 }, menylinje: { file: 'prikk.png', color: true, line: 11 } })
  assert.equal(setup.texts.navn, 'Verktøykassa')
  assert.equal(setup.texts['søk'], 'Finn | filtrer')
  assert.equal(setup.texts.lagre, 'Lagre')
})

test('setup problems name the line, and a bad line is left out', () => {
  const setup = parseSetup([
    '## Visninger', '- Kart | kart | Kart.md', '- Hemmelig | oppslag | ../hemmelig.md', '- Halv | oppslag',
    '- Taster | oppslag | Taster.md | tasteoppslag', '## Meny', '- slett alt', '## Farger', '- rosa | pink',
    '## Skrift', '- tekst | "x"; }', '## Vindu', '- bredde | 5000', '## Ikoner', '- menylinje | ikon.svg', '## Tema',
  ].join('\n'))
  assert.deepEqual(setup.problems, [
    'Oppsett.md, linje 2: «kart» er ikke en modul. Bruk hurtigtaster, oppslag, kort eller steg.',
    'Oppsett.md, linje 3: «../hemmelig.md» må være et filnavn som slutter på .md',
    'Oppsett.md, linje 4: Skriv navn, modul og fil, skilt med |',
    'Oppsett.md, linje 5: «tasteoppslag» passer ikke til modulen oppslag',
    'Oppsett.md, linje 7: «slett alt» er ikke et menyvalg',
    'Oppsett.md, linje 9: «rosa» er ikke en farge i oppsettet',
    'Oppsett.md, linje 11: Skriv navnet på skriften, bare bokstaver, tall, mellomrom og bindestrek',
    'Oppsett.md, linje 13: Bredde må være et heltall fra 320 til 1200',
    'Oppsett.md, linje 15: Skriv navnet på en .png-fil i samme mappe',
    'Oppsett.md, linje 16: «Tema» er ikke en del av oppsettet',
  ])
  assert.deepEqual(setup.modules.map(v => [v.name, v.options]), [['Taster', []]])
  assert.deepEqual(parseSetup('## Moduler\n').problems, ['Oppsett.md har ingen moduler'])
})

test('setup: the older names Visninger, kildedata and {visning} still read', () => {
  const setup = parseSetup('## Visninger\n- K | kort | K.md\n## Meny\n- kildedata\n## Tekster\n- visninger | Lister\n- kildedata | Fila {visning}')
  assert.deepEqual([setup.modules.map(v => v.name), setup.menu, setup.texts.moduler, setup.texts.innhold, setup.problems], [['K'], ['innhold'], 'Lister', 'Fila {fane}', []])
  assert.match(formatSetup(setup, '# Oppsett'), /\n## Moduler\n\n- K \| kort \| K\.md/)
})

test('file names stay in the data folder', () => {
  for (const name of ['Ordliste.md', 'Slik gjør du.md']) assert.ok(contentName(name), name)
  for (const name of ['../a.md', 'a/b.md', 'a\\b.md', 'C:a.md', '.a.md', 'a.txt', 'Oppsett.md']) assert.ok(!contentName(name), name)
  assert.ok(iconName('logo.svg') && iconName('ikon.PNG', 'menylinje'))
  assert.ok(!iconName('logo.svg', 'menylinje') && !iconName('../logo.png') && !iconName('logo.gif'))
})

test('the setup screen writes what the parser reads, under the file\'s own comment', () => {
  const seed = read('../seed/Oppsett.md')
  assert.equal(formatSetup(parseSetup(seed), setupHeader(seed)), seed)
  const text = [
    '# Oppsett', '<!--', '## Visninger', '- Ikke | en | linje.md', '-->', '', '## Visninger', '- Telefon \\| SMS | oppslag | Telefon.md | søk | Navn eller nummer',
    '## Vindu', '- type | vindu', '- bredde | 700', '## Farger', '- aksent | #c00', '## Ikoner', '- menylinje | prikk.png | farge', '- app | app.png',
    '## Tekster', '- søk | Finn \\| filtrer',
  ].join('\n')
  const setup = parseSetup(text)
  assert.deepEqual(setup.problems, [])
  assert.equal(setupHeader(text), '# Oppsett\n<!--\n## Visninger\n- Ikke | en | linje.md\n-->\n')
  const again = parseSetup(formatSetup(setup, setupHeader(text)))
  for (const part of ['modules', 'menu', 'fonts', 'window', 'texts']) assert.deepEqual(again[part], setup[part], part)
  assert.deepEqual(again.modules[0].name, 'Telefon | SMS')
  // A backslash needs no escape of its own: only one right before a pipe is read as one
  for (const name of ['a\\', 'a\\|b', 'x\\\\|y', '\\']) {
    const back = parseSetup(formatSetup({ ...setup, modules: [{ ...setup.modules[0], name }], texts: { søk: name } }, '# Oppsett'))
    assert.deepEqual([back.modules[0].name, back.texts.søk], [name, name], name)
  }
  assert.deepEqual(again.window, { type: 'vindu', bredde: 700 })
  assert.deepEqual(Object.keys(again.icons), ['menylinje', 'app'])
  assert.equal(again.icons.menylinje.color, true)
  assert.deepEqual(parseSetup('## Vindu\n- type | flytende').problems, ['Oppsett.md, linje 2: Vindustype må være panel eller vindu'])
  assert.deepEqual(parseSetup('## Ikoner\n- app | app.svg').problems, ['Oppsett.md, linje 2: Skriv navnet på en .png-fil i samme mappe'])
})

test('placeholders', () => {
  assert.equal(fill('Søk i {visning}, {ukjent}', { visning: 'Ordliste' }), 'Søk i Ordliste, {ukjent}')
})

test('contrast: WCAG ratio, problems below 4.5:1', () => {
  assert.equal(contrast([0, 0, 0], [255, 255, 255]), 21)
  assert.equal(contrast([255, 255, 255], [255, 255, 255]), 1)
  const good = { tekst: [0, 0, 0], bakgrunn: [255, 255, 255], flate: [255, 255, 255], dempet: [80, 80, 80], aksent: [0, 70, 106], 'på aksent': [255, 255, 255],
    forside: [255, 255, 255], 'på forside': [0, 0, 0], bakside: [0, 70, 106], 'på bakside': [255, 255, 255] }
  assert.deepEqual(contrastProblems({ lys: good }), [])
  assert.deepEqual(contrastProblems({ mørk: { ...good, dempet: [170, 170, 170] } }), [
    'Oppsett.md: Dempet tekst på bakgrunnen har kontrast 2,3:1 i mørk modus. Den bør være minst 4,5:1.',
    'Oppsett.md: Dempet tekst på lister og felt har kontrast 2,0:1 i mørk modus. Den bør være minst 4,5:1.',
  ])
  assert.deepEqual(contrastProblems({ lys: { ...good, 'på bakside': [0, 0, 0] } }), [
    'Oppsett.md: Tekst på baksiden av kort har kontrast 2,0:1 i lys modus. Den bør være minst 4,5:1.',
  ])
  // 4.8:1 on flate itself, 4.0:1 on the accent-tinted shade an open entry has
  assert.deepEqual(contrastProblems({ lys: { ...good, tekst: [30, 41, 59], dempet: [100, 116, 139] } }), [
    'Oppsett.md: Dempet tekst på lister og felt har kontrast 4,0:1 i lys modus. Den bør være minst 4,5:1.',
  ])
})

test('the default colours pass AA in both modes', () => {
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
  const { colors } = parseSetup(read('../seed/Oppsett.md'))
  const mode = side => Object.fromEntries(Object.entries(colors).map(([k, v]) => [k, hex(v[side])]))
  assert.deepEqual(contrastProblems({ lys: mode('light'), mørk: mode('dark') }), [])
})

test('merge adds missing groups and lines, keeps the user\'s lines', () => {
  const current = '# Hurtigtaster\r\n\r\n<!--\r\n## Ikke en gruppe\r\n-->\r\n\r\n## Redigering\r\n\r\n- Kopier | ctrl C\r\n- Lim inn | ctrl V\r\n\r\n## Trix\r\n\r\n- Søk | ctrl F\r\n'
  const imported = '## redigering\n- kopier | ctrl shift C\n- Angre | ctrl Z\n## Ikke en gruppe\n- Ny | ctrl N\n- Ny | ctrl M\n## Trix\n- Søk | ctrl F\n'
  assert.equal(mergeShortcuts(current, imported), [
    '# Hurtigtaster', '', '<!--', '## Ikke en gruppe', '-->', '', '## Redigering', '', '- Kopier | ctrl C', '- Lim inn | ctrl V',
    '- Angre | ctrl Z', '', '## Trix', '', '- Søk | ctrl F', '', '## Ikke en gruppe', '', '- Ny | ctrl N', '',
  ].join('\n'))
  assert.equal(mergeShortcuts('', '- A | F1\n## B\n- C | F2'), '- A | F1\n\n## B\n\n- C | F2\n')
  assert.equal(mergeShortcuts('## B\n- C | F2', '- A | F1'), '- A | F1\n\n## B\n- C | F2\n')
  assert.equal(mergeShortcuts('- A | F1\n## B', '- D | F3'), '- A | F1\n- D | F3\n## B\n')
})

test('merge adds missing entries with all their lines, keeps the user\'s entries', () => {
  const current = '# Jukselapp\n\n## A\n\n### Avvik\nTekst.\n\nMer.\n#tag\n\n## B\n\n### Bit\nEn.\n'
  const imported = '## a\n### avvik\nAnnen.\n### Arkiv\nLagring.\n\nOgså: Lager\n\n# Slutt\nIkke med.\n## C\n### Cache\nMellomlager.\n'
  assert.equal(mergeEntries(current, imported), [
    '# Jukselapp', '', '## A', '', '### Avvik', 'Tekst.', '', 'Mer.', '#tag', '', '### Arkiv', 'Lagring.', '', 'Også: Lager',
    '', '## B', '', '### Bit', 'En.', '', '## C', '', '### Cache', 'Mellomlager.', '',
  ].join('\n'))
  assert.equal(mergeEntries('## B\n### C\nc', '### A\na'), '### A\na\n\n## B\n### C\nc\n')
})

test('the Windows list parses whole', () => {
  const text = readFileSync(new URL('../system/Windows.md', import.meta.url), 'utf8')
  const sections = parseShortcuts(text, 'windows')
  const lines = text.split('\n').filter(l => l.startsWith('- ')).length
  assert.equal(sections.reduce((n, s) => n + s.items.length, 0), lines)
  for (const s of sections) assert.equal(new Set(s.items.map(i => i.title)).size, s.items.length, s.title)
})

test('shortcuts A–Å: groups and their lines, ungrouped lines first', () => {
  const sorted = sortShortcuts(parseShortcuts('- Ånd | F3\n- Bord | F4\n## Øvrig\n- B | F1\n- A | F2\n## Chrome\n- Å | F5', 'mac'))
  assert.deepEqual(sorted.map(s => [s.title, s.items.map(i => i.title)]), [
    ['', ['Bord', 'Ånd']], ['Chrome', ['Å']], ['Øvrig', ['A', 'B']],
  ])
})

test('inline: linear on a long line of unclosed marks', () => {
  const started = performance.now()
  for (const c of ['[', '*', '`', '**a', '[a](', '[a](https://x']) inline(c.repeat(200000))
  assert.ok(performance.now() - started < 1000)
  assert.deepEqual(inline('**a** *b* `c` [d](https://e.no)').map(s => s.type), ['strong', 'text', 'em', 'text', 'code', 'text', 'link'])
})
