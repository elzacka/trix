import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deflateRawSync, crc32 } from 'node:zlib'
import { importText, importable, toMarkdown, replaceContent } from '../ui/import.js'
import { unzip, parseXml, PART_LIMIT } from '../ui/docx.js'
import { readRtf } from '../ui/rtf.js'
import { readCsv } from '../ui/csv.js'
import { parseEntries, parseShortcuts, mergeEntries, lead, inline } from '../ui/parse.js'

/** A zip of text parts, deflated unless `store`. */
function zip(files, store = false) {
  const locals = []
  const central = []
  let offset = 0
  for (const [name, text] of Object.entries(files)) {
    const raw = Buffer.from(text)
    const data = store ? raw : deflateRawSync(raw)
    const n = Buffer.from(name)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(store ? 0 : 8, 8)
    local.writeUInt32LE(crc32(raw), 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(raw.length, 22)
    local.writeUInt16LE(n.length, 26)
    const entry = Buffer.alloc(46)
    entry.writeUInt32LE(0x02014b50, 0)
    entry.writeUInt16LE(store ? 0 : 8, 10)
    entry.writeUInt32LE(crc32(raw), 16)
    entry.writeUInt32LE(data.length, 20)
    entry.writeUInt32LE(raw.length, 24)
    entry.writeUInt16LE(n.length, 28)
    entry.writeUInt32LE(offset, 42)
    locals.push(local, n, data)
    central.push(entry, n)
    offset += 30 + n.length + data.length
  }
  const directory = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(Object.keys(files).length, 8)
  end.writeUInt16LE(Object.keys(files).length, 10)
  end.writeUInt32LE(directory.length, 12)
  end.writeUInt32LE(offset, 16)
  return new Uint8Array(Buffer.concat([...locals, directory, end]))
}

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
const p = (text, style = '', extra = '') => `<w:p><w:pPr>${style && `<w:pStyle w:val="${style}"/>`}${extra}</w:pPr><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`
const item = (text, numId) => p(text, '', `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${numId}"/></w:numPr>`)
const cells = (...texts) => `<w:tr>${texts.map(t => `<w:tc><w:tcPr/>${p(t)}</w:tc>`).join('')}</w:tr>`

function docx(body, store) {
  return zip({
    '[Content_Types].xml': '<Types/>',
    'word/document.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n<w:document ${W}><w:body>${body}<w:sectPr/></w:body></w:document>`,
    'word/styles.xml': `<?xml version="1.0"?>\n<w:styles ${W}>
      <w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
      <w:style w:type="paragraph" w:styleId="Overskrift1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/></w:style>
      <w:style w:type="paragraph" w:styleId="Overskrift2"><w:name w:val="heading 2"/></w:style>
      <w:style w:type="paragraph" w:styleId="Egen"><w:name w:val="Min overskrift"/><w:basedOn w:val="Overskrift2"/></w:style>
      <w:style w:type="paragraph" w:styleId="Overskrift3"><w:name w:val="heading 3"/></w:style>
      <w:style w:type="paragraph" w:styleId="Tittel"><w:name w:val="Title"/></w:style>
      <w:style w:type="paragraph" w:styleId="Punktliste"><w:name w:val="List Bullet"/><w:pPr><w:numPr><w:numId w:val="1"/></w:numPr></w:pPr></w:style>
    </w:styles>`,
    'word/numbering.xml': `<w:numbering ${W}>
      <w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/></w:lvl></w:abstractNum>
      <w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/></w:lvl></w:abstractNum>
      <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
    </w:numbering>`,
    'word/_rels/document.xml.rels': '<Relationships><Relationship Id="rId9" Type="hyperlink" Target="https://www.dsb.no/" TargetMode="External"/><Relationship Id="rId10" Target="javascript:alert(1)"/></Relationships>',
  }, store)
}

const WORD = docx([
  p('Beredskap', 'Tittel'),
  p('Begreper', 'Overskrift1'),
  p('Strøm &amp; vann', 'Overskrift2'),
  '<w:p><w:r><w:t xml:space="preserve">Ha </w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>20 liter</w:t></w:r><w:r><w:rPr><w:b w:val="0"/></w:rPr><w:t xml:space="preserve"> per person, se </w:t></w:r>'
    + '<w:hyperlink r:id="rId9"><w:r><w:t>DSB</w:t></w:r></w:hyperlink><w:r><w:t xml:space="preserve"> og </w:t></w:r>'
    + '<w:hyperlink r:id="rId10"><w:r><w:rPr><w:i/></w:rPr><w:t>dette</w:t></w:r></w:hyperlink><w:del><w:r><w:delText>slettet</w:delText></w:r></w:del><w:r><w:t>.</w:t></w:r></w:p>',
  p('Gjør dette', 'Overskrift3'),
  item('Sjekk sikringsskapet', 2),
  item('Spør naboene', 2),
  p('Lommelykt', 'Punktliste'),
  p('Batterier', 'Punktliste'),
  `<w:tbl><w:tblPr/>${cells('Nødetat', 'Nummer')}${cells('Brann', '110')}${cells('A | B', '&#x2013;')}</w:tbl>`,
  p('Egen stil', 'Egen'),
  p('Også: Kort'),
  p('#vann #strøm'),
].join(''))

test('docx: heading styles become groups, entries and sub-headings; lists, links, tables', async () => {
  const text = await importText('Beredskap.docx', WORD, 'oppslag')
  assert.equal(text, [
    '## Begreper', '', '### Strøm & vann', '',
    'Ha **20 liter** per person, se [DSB](https://www.dsb.no/) og *dette*.', '',
    '#### Gjør dette', '', '1. Sjekk sikringsskapet', '2. Spør naboene', '- Lommelykt', '- Batterier', '',
    '| Nødetat | Nummer |', '| --- | --- |', '| Brann | 110 |', '| A \\| B | – |', '',
    '### Egen stil', '', 'Også: Kort', '', '#vann #strøm', '',
  ].join('\n'))
  const [section] = parseEntries(text)
  assert.equal(section.title, 'Begreper')
  assert.deepEqual(section.entries.map(e => e.title), ['Strøm & vann', 'Egen stil'])
  assert.deepEqual(section.entries[0].blocks.at(-1).rows, [['Brann', '110'], ['A | B', '–']])
  assert.deepEqual([section.entries[1].aliases, section.entries[1].tags], [['Kort'], ['vann', 'strøm']])
})

test('docx: stored parts read like deflated ones', async () => {
  const body = p('Gruppe', 'Overskrift1') + p('Navn', 'Overskrift2') + p('Tekst')
  assert.equal(await importText('a.docx', docx(body, true), 'kort'), await importText('a.docx', docx(body), 'kort'))
})

test('docx: a shortcuts table becomes lines; its column names row is left out', async () => {
  const body = p('Teams', 'Overskrift1') + `<w:tbl>${cells('Navn', 'Windows', 'Mac')}${cells('Kamera | av', 'ctrl shift O', '⌘⇧O')}${cells('Bare Mac', '', '⌘K')}</w:tbl>`
    + p('Lås skjermen | win L | ⌃⌘Q') + p('Bare tekst')
  const text = await importText('Taster.docx', docx(body), 'hurtigtaster')
  assert.equal(text, ['## Teams', '', '- Kamera \\| av | ctrl shift O | ⌘⇧O', '- Bare Mac |  | ⌘K', '- Lås skjermen | win L | ⌃⌘Q', ''].join('\n'))
  assert.deepEqual(parseShortcuts(text, 'mac')[0].items.map(i => i.title), ['Kamera | av', 'Bare Mac', 'Lås skjermen'])
})

test('docx: not a zip, not Word, too large a part: refused', async () => {
  await assert.rejects(importText('a.docx', new TextEncoder().encode('hei'), 'oppslag'), /zip/)
  await assert.rejects(importText('a.docx', zip({ 'a.txt': 'x' }), 'oppslag'), /Word/)
  await assert.rejects(unzip(zip({ big: 'a'.repeat(PART_LIMIT + 1) }), ['big']), /for stor/)
  await assert.rejects(unzip(zip({ big: 'a'.repeat(PART_LIMIT + 1) }, true), ['big']), /for stor/)
})

test('xml: entities, no DTD, linear on hostile input', () => {
  const root = parseXml('<!DOCTYPE x [<!ENTITY e "boom">]><a b="1 &lt; 2">&e; &amp; &#229;<!-- <c> --></a>')
  const a = root.children.find(c => c.name === 'a')
  assert.equal(a.attrs.b, '1 < 2')
  assert.equal(a.children.join(''), '&e; & å')
  const started = performance.now()
  parseXml('<'.repeat(200000))
  parseXml(`<a ${'b'.repeat(200000)}>`)
  parseXml('</a>'.repeat(100000))
  assert.ok(performance.now() - started < 1000)
})

const rtf = text => new TextEncoder().encode(text)

test('rtf: stylesheet headings, code page and unicode, lists, tables, links', () => {
  const text = toMarkdown(readRtf(rtf(String.raw`{\rtf1\ansi\ansicpg1252\deff0{\fonttbl{\f0 Arial;}}{\colortbl;\red0\green0\blue0;}
{\stylesheet{\ql Normal;}{\s1\outlinelevel0 heading 1;}{\s2 heading 2;}{\s3 Overskrift 3;}{\s9 Title;}{\*\cs10 Default Paragraph Font;}}
{\*\generator Riched20;}{\info{\title Skjult}}
\pard\s9 Tittel\par
\pard\s1 Gruppe\par
\pard\s2 Bl\'e5b\'e6r \u248?y\par
\pard Ha {\b fet} og {\i kursiv} tekst, \u-10179?\u-8704? se {\field{\*\fldinst{HYPERLINK "https://nrk.no/"}}{\fldrslt{\ul NRK}}}.\par
{\pict\pngblip 89504e47}
\pard\s3 Steg\par
{\listtext\pard\plain 1.\tab}\pard\ls1 F\'f8rst\par
{\listtext\pard\plain 2.\tab}\pard\ls1 Deretter\par
{\listtext\pard\plain \'b7\tab}\pard\ls2 Punkt\par
\trowd\cellx1000\cellx2000\pard\intbl A\cell B\cell\row
\trowd\cellx1000\cellx2000\pard\intbl 1\cell 2\cell\row
\pard Slutt\par
}`)), 'steg')
  assert.equal(text, [
    '## Gruppe', '', '### Blåbær øy', '', 'Ha **fet** og *kursiv* tekst, 😀 se [NRK](https://nrk.no/).', '',
    '#### Steg', '', '1. Først', '2. Deretter', '- Punkt', '', '| A | B |', '| --- | --- |', '| 1 | 2 |', '', 'Slutt', '',
  ].join('\n'))
  assert.deepEqual(parseEntries(text)[0].entries[0].blocks.map(b => b.type), ['p', 'h', 'ol', 'ul', 'table', 'p'])
})

test('rtf: TextEdit (Cocoa) list and utf-8; not RTF refused', () => {
  const text = toMarkdown(readRtf(rtf(String.raw`{\rtf1\ansi\ansicpg65001\cocoartf2822
{\*\expandedcolortbl;;}
\pard\pardirnatural\partightenfactor0
\ls1\ilvl0{\listtext	\uc0舦 	}Kaffe\
{\listtext	\uc0舦 	}Te\
\pard Vanlig}`)), 'oppslag')
  assert.equal(text, '- Kaffe\n- Te\n\nVanlig\n')
  assert.throws(() => readRtf(rtf('{\\html}')), /RTF/)
})

test('import: text files pass through; other types and large files refused', async () => {
  assert.equal(await importText('a.md', rtf('## Å\n'), 'oppslag'), '## Å\n')
  await assert.rejects(importText('a.doc', rtf('x'), 'oppslag'), /filtype/)
  await assert.rejects(importText('a.md', { length: 60 * 1024 * 1024 }, 'oppslag'), /50 MB/)
})

test('replace keeps the title and top comment unless the import has its own', () => {
  const current = '# Ordliste\n\n<!--\nFormat\n-->\n\n## Gammel\n\n### X\n'
  assert.equal(replaceContent(current, '## Ny\n'), '# Ordliste\n\n<!--\nFormat\n-->\n\n## Ny\n')
  assert.equal(replaceContent(current, '# Egen\n'), '# Egen\n')
  assert.equal(replaceContent('## Gammel\n', '## Ny\n'), '## Ny\n')
})

test('a converted file merges like a Markdown one', async () => {
  const imported = await importText('a.docx', docx(p('Begreper', 'Overskrift1') + p('Ny', 'Overskrift2') + p('Tekst')), 'oppslag')
  assert.equal(mergeEntries('## Begreper\n\n### Gammel\nTekst\n', imported), '## Begreper\n\n### Gammel\nTekst\n\n### Ny\n\nTekst\n')
})

test('heading levels count from the document: one level is entries, the top of several is groups', () => {
  const heading = (level, text) => ({ type: 'heading', level, runs: [{ text }] })
  const para = text => ({ type: 'paragraph', runs: [{ text }] })
  assert.equal(toMarkdown([heading(1, 'A'), para('a'), heading(1, 'B')], 'kort'), '### A\n\na\n\n### B\n')
  assert.equal(toMarkdown([heading(2, 'G'), heading(4, 'E'), heading(5, 'S')], 'steg'), '## G\n\n### E\n\n#### S\n')
})

const XLSX = zip({
  'xl/workbook.xml': '<?xml version="1.0"?>\n<workbook xmlns:r="r"><sheets><sheet name="Nødnumre" sheetId="1" r:id="rId1"/><sheet name="Skjult" sheetId="2" state="hidden" r:id="rId2"/><sheet name="Datoer" sheetId="3" r:id="rId3"/></sheets></workbook>',
  'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Target="/xl/worksheets/sheet3.xml"/></Relationships>',
  'xl/sharedStrings.xml': '<sst><si><t>Etat</t></si><si><t>Nummer</t></si><si><t>Brann | røyk</t></si><si><r><t xml:space="preserve">Politi </t></r><r><rPr><b/></rPr><t>nød</t></r></si><si><t>DSB</t></si></sst>',
  'xl/styles.xml': '<styleSheet><numFmts><numFmt numFmtId="164" formatCode="dd/mm/yyyy hh:mm"/></numFmts><fonts><font/><font><b/></font><font><i/></font></fonts>'
    + '<cellXfs><xf numFmtId="0" fontId="0"/><xf numFmtId="0" fontId="1"/><xf numFmtId="14" fontId="0"/><xf numFmtId="9" fontId="2"/><xf numFmtId="164" fontId="0"/></cellXfs></styleSheet>',
  'xl/worksheets/sheet1.xml': '<worksheet xmlns:r="r"><sheetData>'
    + '<row r="1"><c r="A1" t="s" s="1"><v>0</v></c><c r="B1" t="s" s="1"><v>1</v></c></row>'
    + '<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>110</v></c><c r="D2"/></row>'
    + '<row r="5"><c r="A5" t="s"><v>3</v></c><c r="B5"><v>112</v></c></row>'
    + '<row r="6"><c r="A6" t="s"><v>4</v></c><c r="B6" t="inlineStr"><is><t>2,5</t></is></c></row>'
    + '</sheetData><hyperlinks><hyperlink ref="A6" r:id="rId7"/></hyperlinks></worksheet>',
  'xl/worksheets/_rels/sheet1.xml.rels': '<Relationships><Relationship Id="rId7" Target="https://www.dsb.no/" TargetMode="External"/></Relationships>',
  'xl/worksheets/sheet2.xml': '<worksheet><sheetData><row><c t="str"><v>hemmelig</v></c></row></sheetData></worksheet>',
  'xl/worksheets/sheet3.xml': '<worksheet><sheetData><row><c><v>0.1</v></c><c s="2"><v>46284</v></c><c s="3"><v>0.205</v></c><c s="4"><v>46284.5</v></c><c t="b"><v>1</v></c></row></sheetData></worksheet>',
})

test('xlsx: each visible sheet an entry holding its table; bold, italic, links, dates, percent', async () => {
  const text = await importText('Beredskap.xlsx', XLSX, 'kort')
  assert.equal(text, [
    '### Nødnumre', '', '| Etat | Nummer |', '| --- | --- |', '| Brann \\| røyk | 110 |', '| Politi **nød** | 112 |', '| [DSB](https://www.dsb.no/) | 2,5 |', '',
    '### Datoer', '', '| 0,1 | 19.09.2026 | *20,5 %* | 19.09.2026 12.00 | SANN |', '| --- | --- | --- | --- | --- |', '',
  ].join('\n'))
  const entries = parseEntries(text)[0].entries
  assert.deepEqual(entries.map(e => [e.title, e.blocks[0].type]), [['Nødnumre', 'table'], ['Datoer', 'table']])
  assert.equal(lead(entries[0]), '')
})

test('xlsx: one sheet is named after the file; not Excel refused', async () => {
  const one = zip({
    'xl/workbook.xml': '<workbook><sheets><sheet name="Ark1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml': '<worksheet><sheetData><row><c t="inlineStr"><is><t>A</t></is></c><c t="inlineStr"><is><t>B</t></is></c></row></sheetData></worksheet>',
  })
  assert.equal(await importText('Telefonliste.xlsx', one, 'oppslag'), '### Telefonliste\n\n| A | B |\n| --- | --- |\n')
  await assert.rejects(importText('a.xlsx', WORD, 'oppslag'), /Excel/)
})

test('csv: semicolon, comma or tab; quoted fields; Windows-1252 from Excel', async () => {
  const csv = '﻿Navn;Nummer;Merknad\r\nBrann;110;"Røyk; flammer"\r\n"Politi ""nød""";112;"To\r\nlinjer"\r\n;;\r\n'
  assert.equal(await importText('Nødnumre.csv', new TextEncoder().encode(csv), 'steg'), [
    '### Nødnumre', '', '| Navn | Nummer | Merknad |', '| --- | --- | --- |', '| Brann | 110 | Røyk; flammer |', '| Politi "nød" | 112 | To linjer |', '',
  ].join('\n'))
  assert.equal(await importText('a.csv', rtf('a,b\n1,2'), 'oppslag'), '### a\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n')
  assert.equal(await importText('a.csv', rtf('a\tb\n1\t2'), 'oppslag'), '### a\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n')
  assert.equal(await importText('a.csv', new Uint8Array([0x42, 0xe5, 0x3b, 0x31]), 'oppslag'), '### a\n\n| Bå | 1 |\n| --- | --- |\n')
})

test('hurtigtaster cells: a backslash before or without a pipe reads back as written', async () => {
  // Only a backslash right before a pipe is read as an escape, as in `Oppsett.md`
  const names = ['a\\', 'a\\|b', 'x\\\\|y', '\\']
  const text = await importText('Taster.csv', rtf(`Navn;Windows\n${names.map(n => `${n};ctrl \\`).join('\n')}\n`), 'hurtigtaster')
  const items = parseShortcuts(text, 'mac')[0].items
  assert.deepEqual(items.map(i => i.title), names)
  assert.deepEqual(items.map(i => i.combos), names.map(() => parseShortcuts('- x | ctrl \\', 'mac')[0].items[0].combos))
})

test('csv in hurtigtaster: rows become shortcuts under the file name as group', async () => {
  const text = await importText('Teams.csv', rtf('Navn;Windows;Mac\nKamera;ctrl shift O;⌘⇧O\n'), 'hurtigtaster')
  assert.equal(text, '## Teams\n\n- Kamera | ctrl shift O | ⌘⇧O\n')
})

test('limits: shared unpack budget, repeated parts, wide tables, deep RTF', async () => {
  const sheet = '<worksheet><sheetData>' + '<row><c t="inlineStr"><is><t>x</t></is></c></row>'.repeat(10) + '</sheetData></worksheet>'
  const many = { 'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Id="r1" Target="worksheets/s.xml"/></Relationships>', 'xl/worksheets/s.xml': sheet }
  many['xl/workbook.xml'] = `<workbook><sheets>${'<sheet name="A" r:id="r1"/>'.repeat(4000)}</sheets></workbook>`
  assert.equal((await importText('a.xlsx', zip(many), 'oppslag')).match(/^### /gm).length, 1)
  // Six parts of 20 MB: more than one import may unpack in all.
  const big = 'a'.repeat(PART_LIMIT - 10)
  await assert.rejects(unzip(zip({ a: big, b: big, c: big, d: big, e: big, f: big }), ['a', 'b', 'c', 'd', 'e', 'f']), /for stor/)
  const wide = 'a' + ';'.repeat(2000) + '\n' + 'a\n'.repeat(2000)
  await assert.rejects(importText('a.csv', rtf(wide), 'oppslag'), /celler/)
  assert.throws(() => readRtf(rtf('{\\rtf1 ' + '{'.repeat(5000))), /nivåer/)
  assert.equal(importable('film.mov', 10), false)
  assert.equal(importable('a.docx', 60 * 1024 * 1024), false)
  assert.equal(parseXml('<a>&constructor;</a>').children[0].children[0], '&constructor;')
})

test('limits: a long value used many times; a long CSV row', async () => {
  const long = 'x'.repeat(30 * 1024 * 1024)
  const reused = zip({
    'xl/workbook.xml': '<workbook><sheets><sheet name="A" r:id="r1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Id="r1" Target="worksheets/s.xml"/></Relationships>',
    'xl/sharedStrings.xml': `<sst><si><t>${long}</t></si></sst>`,
    'xl/worksheets/s.xml': `<worksheet><sheetData>${'<row><c t="s"><v>0</v></c></row>'.repeat(5)}</sheetData></worksheet>`,
  })
  await assert.rejects(importText('a.xlsx', reused, 'oppslag'), /for stor/)
  const heading = { type: 'heading', level: 1, runs: [{ text: 'A' }] }
  const linked = text => ({ type: 'paragraph', runs: [{ text, href: `https://x.no/${'a'.repeat(3000)}` }] })
  assert.equal(toMarkdown([heading, linked('lenke')], 'oppslag'), '### A\n\nlenke\n')
  assert.throws(() => readCsv(rtf('a' + ';'.repeat(200000))), /celler/)
})

test('inline: bold around italic, links with brackets and parentheses', () => {
  assert.deepEqual(inline('**a *b* c**'), [{ type: 'strong', text: 'a *b* c' }])
  assert.deepEqual(inline('[x](https://x.no/a?b=[1])').map(s => s.type), ['link'])
  assert.deepEqual(inline('[Oslo](https://no.wikipedia.org/wiki/Oslo_(by))'), [{ type: 'link', text: 'Oslo', href: 'https://no.wikipedia.org/wiki/Oslo_(by)' }])
})

test('links: plain, one per run of the same address, within the output budget', () => {
  const heading = { type: 'heading', level: 1, runs: [{ text: 'A' }] }
  const href = 'https://x.no/'
  const split = { type: 'paragraph', runs: [{ text: 'Se ', href }, { text: 'her', bold: true, href }] }
  assert.equal(toMarkdown([heading, split], 'oppslag'), '### A\n\n[Se her](https://x.no/)\n')
  const long = `https://x.no/${'a'.repeat(2000)}`
  const many = Array.from({ length: 60000 }, () => ({ type: 'paragraph', runs: [{ text: 'x', href: long }] }))
  assert.throws(() => toMarkdown([heading, ...many], 'oppslag'), /for stor/)
})

test('cells round-trip backslashes before, after and without a pipe', () => {
  const texts = ['a\\', '\\', 'x\\|y', '|\\', 'C:\\temp | D:\\']
  const table = { type: 'table', rows: [['Navn', 'Verdi'], ...texts.map(t => [[{ text: t }], [{ text: t }]])] }
  const text = toMarkdown([{ type: 'heading', level: 1, runs: [{ text: 'A' }] }, table], 'oppslag')
  assert.deepEqual(parseEntries(text)[0].entries[0].blocks[0].rows, texts.map(t => [t, t]))
  const keys = toMarkdown([{ type: 'table', rows: [['a\\', 'ctrl \\', '⌘\\'].map(t => [{ text: t }])] }], 'hurtigtaster')
  assert.deepEqual(parseShortcuts(keys, 'mac')[0].items.map(i => i.title), ['a\\'])
})
