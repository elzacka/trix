import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  formatKeys, comboId, lookupId, lookupShortcuts, parseShortcuts, filterShortcuts, parseCheatSheet, alphabetical, searchCheatSheet, inline,
  mergeShortcuts, mergeCheatSheet, sortShortcuts,
} from '../ui/parse.js'

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
  const [ki, personvern] = parseCheatSheet(sheet)
  assert.equal(ki.title, 'KI')
  assert.deepEqual(ki.entries[0], {
    id: 0, title: 'Benchmark', paragraphs: ['Første linje fortsetter.', 'Nytt avsnitt.'],
    aliases: ['Referansetest', 'evaluation suite'], tags: ['ki', 'analyse'],
  })
  assert.deepEqual(personvern.entries.map(e => e.id), [1, 2])
})

test('A–Å groups by first letter with Å last', () => {
  assert.deepEqual(alphabetical(parseCheatSheet(sheet)).map(s => s.title), ['A', 'B', 'Å'])
})

test('search: one letter, words, tags', () => {
  const sections = parseCheatSheet(sheet)
  assert.deepEqual(searchCheatSheet(sections, 'b').map(e => e.title), ['Benchmark'])
  assert.deepEqual(searchCheatSheet(sections, 'referansetest').map(e => e.title), ['Benchmark'])
  assert.deepEqual(searchCheatSheet(sections, 'vekter').map(e => e.title), ['Åpne vekter'])
  assert.deepEqual(searchCheatSheet(sections, '', ['ki']).map(e => e.title), ['Benchmark', 'Åpne vekter'])
})

test('inline Markdown', () => {
  assert.deepEqual(inline('Se **fet** og [side](https://example.no).'), [
    { type: 'text', text: 'Se ' }, { type: 'strong', text: 'fet' }, { type: 'text', text: ' og ' },
    { type: 'link', text: 'side', href: 'https://example.no' }, { type: 'text', text: '.' },
  ])
  assert.deepEqual(inline('[x](javascript:alert(1))'), [{ type: 'text', text: '[x](javascript:alert(1))' }])
})

test('the seed files parse', () => {
  const shortcuts = readFileSync(new URL('../seed/Hurtigtaster.md', import.meta.url), 'utf8')
  const cheat = readFileSync(new URL('../seed/Jukselapp.md', import.meta.url), 'utf8')
  assert.equal(parseShortcuts(shortcuts, 'windows').length, 2)
  assert.equal(parseShortcuts(shortcuts, 'mac').flatMap(s => s.items).every(i => i.keys.length), true)
  assert.equal(parseCheatSheet(cheat).flatMap(s => s.entries).length, 6)
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
  assert.equal(mergeCheatSheet(current, imported), [
    '# Jukselapp', '', '## A', '', '### Avvik', 'Tekst.', '', 'Mer.', '#tag', '', '### Arkiv', 'Lagring.', '', 'Også: Lager',
    '', '## B', '', '### Bit', 'En.', '', '## C', '', '### Cache', 'Mellomlager.', '',
  ].join('\n'))
  assert.equal(mergeCheatSheet('## B\n### C\nc', '### A\na'), '### A\na\n\n## B\n### C\nc\n')
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
