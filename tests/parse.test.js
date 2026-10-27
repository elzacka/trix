import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  formatKeys, parseShortcuts, filterShortcuts, parseCheatSheet, alphabetical, searchCheatSheet, inline,
} from '../ui/parse.js'

test('keys as symbols on a Mac and words on Windows', () => {
  assert.deepEqual(formatKeys('ctrl shift S', 'windows'), ['Ctrl+Shift+S'])
  assert.deepEqual(formatKeys('ctrl+shift+s', 'mac'), ['⌃⇧S'])
  assert.deepEqual(formatKeys('⌘⇧4', 'mac'), ['⌘⇧4'])
  assert.deepEqual(formatKeys('⌃⌘ mellomrom eller fn E', 'mac'), ['⌃⌘ Mellomrom', 'fn E'])
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
    { title: 'A', items: [{ title: 'Kopier', keys: ['⌘C'] }, { title: 'Felles', keys: ['F1'] }] },
    { title: 'B', items: [{ title: 'Lim inn', keys: ['⌃V'] }] },
  ])
  assert.equal(parseShortcuts(text, 'windows')[0].items[1].keys[0], 'Win+D')
})

test('search matches group, name and keys', () => {
  const sections = parseShortcuts('## Redigering\n- Kopier | ctrl C\n- Lim inn | ctrl V', 'windows')
  assert.equal(filterShortcuts(sections, 'redigering lim')[0].items.length, 1)
  assert.equal(filterShortcuts(sections, 'ctrl+c')[0].items[0].title, 'Kopier')
  assert.deepEqual(filterShortcuts(sections, 'finnes ikke'), [])
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
