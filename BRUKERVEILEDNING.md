# Brukerveiledning for Trix

Sist oppdatert: 02.11.26. Om prosjektet: [README](README.md).

Trix er en oppslagsapp du setter sammen selv:

- Fire moduler, som vises som faner: Hurtigtaster, oppslag, kort og steg
- To vindustyper: «Panel ved ikonet» eller «Vanlig vindu»
- Eget utseende: Farger for lys og mørk modus, skrift og ikoner
- Eget innhold i vanlige Markdown-filer

## 1. Last ned og installer

| | Mac | Windows |
|---|---|---|
| Krav | macOS 15 eller nyere | Windows 10 eller 11 |
| Last ned | [Trix-macOS.dmg](https://github.com/elzacka/trix/releases/latest/download/Trix-macOS.dmg) | [Trix-Windows.zip](https://github.com/elzacka/trix/releases/latest/download/Trix-Windows.zip) |
| Installer | Dobbeltklikk på dmg-fila. Dra «Trix» til «Apper» | Høyreklikk på zip-fila, velg «Pakk ut alle» |
| Start | Åpne appen fra «Apper». Velg «Åpne» når macOS spør om en app fra internett: Det gjelder alle slike apper, og Apple har sjekket denne | Åpne `Trix\Trix.exe`. Første gang: «Mer informasjon», så «Kjør likevel», fordi appen ikke er signert |

Første oppstart:

- Ikonet står i menylinjen (Mac) eller ved klokka på oppgavelinjen (Windows).
- Appen lager filene sine i datamappen, se [Filene](#filene).
- Hurtigåpner: ⌘⌥U (Mac), Ctrl+Alt+U (Windows).

## 2. Bruk

| Gjør | Slik |
|---|---|
| Åpne | Klikk på ikonet, eller bruk hurtigåpneren |
| Lukke | Esc, eller klikk utenfor panelet |
| Bytte fane | Klikk, Ctrl/⌘+1–9 eller Ctrl+Tab |
| Søke | Skriv i søkefeltet, Ctrl/⌘+F |
| Slå opp en hurtigtast | Tastaturknappen i søkefeltet, trykk kombinasjonen |
| Se alt med samme emne | Trykk på en #emneknagg |
| Snu et kort | Trykk på kortet |
| Lese en veiledning | Trykk på den. Esc: Tilbake |
| Avslutte | «Avslutt Trix» i menyen, eller høyreklikk på ikonet |

Menyen («Flere valg» øverst til høyre). Oppsettet bestemmer hvilke valg den har.

| Valg | Gjør |
|---|---|
| «Visning» | Mine hurtigtaster, maskinens eller begge. Sortering: A–Å eller rekkefølgen i fila |
| «Importer/Eksporter», «Endre innhold i ‹fane›», «Åpne datamappen» | Innholdet i fanen, se [Innhold i appen](#innhold-i-appen) |
| «Tilpass appen» | Oppsettet, se [I appen](#i-appen-tilpass-appen) |
| «Endre hurtigåpner» | Trykk den nye kombinasjonen. Backspace fjerner den |

## 3. Tilpass

To deler, to måter:

| | I appen | Direkte i filene |
|---|---|---|
| Oppsett: Moduler, meny, farger, skrift, vindu, ikoner, tekster | «Tilpass appen», Ctrl+, / ⌘, | `Oppsett.md` |
| Innhold: Det som står i fanene | «Endre innhold i ‹fane›», Ctrl+E / ⌘E | Én `.md`-fil per fane |
| Vises | Oppsett: Med en gang. Innhold: Når du lagrer | Innen ett sekund etter at du lagrer fila |

Moduler. Hver fane viser én modul:

| Modul          | Passer til                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------- |
| `hurtigtaster` | Hurtigtaster for et program, med Windows- og Mac-taster. Valget «system» viser også maskinens egne |
| `oppslag`      | Ordliste, oppslagsverk, spørsmål og svar, telefonliste                                             |
| `kort`         | «Snu-kort» med forside og bakside: Tiltakskort, opplæring. Valgene «3 i bredden» og «2 i høyden» bestemmer hvor mange kort fanen viser |
| `steg`         | Veiledninger med steg                                                                              |

### I appen: «Tilpass appen»

Et eget vindu ved siden av appen. Appen viser hver endring med en gang.

| Del | Endrer |
|---|---|
| «Moduler» | Legg til, fjern, flytt. Navn, modul, fil, valg, tekst i søkefeltet, antall kort i bredden og høyden |
| «Meny» | Rekkefølge, valg av og på, skillelinjer |
| «Farger» | Lys og mørk modus. Varsel når kontrasten er lavere enn 4,5:1. «Bruk standardfargene» |
| «Skrift og vindu» | Skrift, skrift på taster, størrelse. Vindustype: «Panel ved ikonet» eller «Vanlig vindu». Bredde, høyde |
| «Ikoner» | SVG eller PNG: «Velg fil …» eller dra fila inn. «Standard» |
| «Tekster» | Alle tekstene i appen |

- «Lagre»: Skriver `Oppsett.md`.
- «Avbryt»: Ingenting lagres. Med endringer: «Forkast endringene».
- «Åpne Oppsett.md»: Fila i tekstprogrammet ditt.

### Innhold i appen

Menyen:

| Valg | Gjør |
|---|---|
| «Endre innhold i ‹fane›» | Fila i appen. «Lagre»: Ctrl+S / ⌘S. «Avbryt»: Esc |
| «Importer/Eksporter» → «Importer …» | Henter en Word-, RTF-, Excel- eller CSV-fil (`.docx`, `.rtf`, `.xlsx`, `.csv`) eller en `.md`- eller `.txt`-fil: «Slå sammen» eller «Erstatt». Resultatet åpnes i appen og lagres med «Lagre» |
| «Importer/Eksporter» → «Eksporter» | Kopi i Nedlastinger. Overskriver aldri en fil |
| «Åpne datamappen» | Mappa med fila |

Du kan også dra en fil fra Finder eller Utforsker inn på en fane. Fila havner
i den fanen, og du får de samme valgene. Dette virker med vindustypen «Vanlig
vindu». Panelet lukker seg når du klikker i Finder eller Utforsker, så bruk
«Importer …» med «Panel ved ikonet».

Word og RTF blir Markdown slik:

| I fila | I appen |
|---|---|
| Overskrift 1 | Gruppe (`##`) |
| Overskrift 2 | Oppslag, kort eller veiledning (`###`) |
| Overskrift 3 og lavere | Overskrift i teksten (`####`) |
| Avsnitt, punktliste, nummerert liste, tabell, fet, kursiv, lenke | Det samme i Markdown |
| Tittel, bilder, kommentarer | Blir ikke med |

- Hver overskrift blir et oppslag, et kort eller en veiledning hvis dokumentet
  bare har ett overskriftsnivå.
- Hurtigtaster: Tabeller med navn, Windows-taster og Mac-taster blir én
  hurtigtast per rad.
- «Erstatt» beholder tittelen og kommentaren øverst i fila.

Excel og CSV blir alltid tabeller. Hvert ark blir et oppslag, et kort eller en
veiledning med samme navn som arket. En CSV-fil, eller en Excel-fil med bare
ett ark, får navnet til fila. Fet og kursiv skrift, lenker og datoer fra Excel
blir med. Du kan skrive tekst over og under tabellen og formatere den, også inne
i cellene. I Hurtigtaster blir hver rad en hurtigtast.

Formatet står i kommentaren øverst i fila. Appen lagrer ikke hvis fila er
endret utenfor appen etter at du åpnet den: Kopier endringene dine, velg
«Avbryt» og åpne fila på nytt.

### Direkte i filene

#### Filene

| Hvor       | Mappe                                                                                 |
| ---------- | ------------------------------------------------------------------------------------- |
| Mac        | `~/Library/Application Support/Trix`                                                  |
| Windows    | `%APPDATA%\Trix`                                                                      |
| Delt mappe | `Trix-data` ved siden av appen, hvis den finnes, se [Del med andre](#4-del-med-andre) |

| Fil | Holder |
|---|---|
| `Oppsett.md` | Oppsettet |
| `‹Navn›.md` | Innholdet i en fane. Filnavnet står under `## Moduler` i `Oppsett.md` |
| `.svg`, `.png` | Ikonene under `## Ikoner` |
| `innstillinger.json` | Hurtigåpner, visning og vindustype for denne maskinen. Endres i appen |

#### Gjør mappa synlig

Mappa er skjult som standard.

| Måte | Slik |
|---|---|
| Fra appen | «Åpne datamappen». Eller «Tilpass appen» → «Åpne Oppsett.md» |
| Mac, Finder | ⇧⌘G, lim inn stien over, Retur. Skjulte filer av og på: ⇧⌘. |
| Windows | Windows-tasten+R, skriv `%APPDATA%\Trix`, Enter. Eller lim stien inn i adressefeltet i Filutforsker |

#### Endre

- Åpne fila i et tekstprogram, for eksempel TextEdit, Notisblokk eller VS Code.
- Formatet står i kommentaren øverst i hver fil.
- Lagre fila. Appen viser endringen innen ett sekund.
- `Oppsett.md` med feil: Appen viser et varsel med linjenummeret og hopper over linja.
- Slettet seksjon i `Oppsett.md`: Standardverdiene.
- Fil som mangler: Appen lager den fra malen for typen.

## 4. Del med andre

- Lag mappa `Trix-data` ved siden av appen. Appen bruker den i stedet for datamappen.
- Kopier filene dine dit. En tom mappe får standardinnholdet.
- Appen og mappa i en delt mappe: Alle ser det samme innholdet.
- Gi andre skrivetilgang bare til `Trix-data`, aldri til appen.
- `innstillinger.json` blir på hver maskin.

## 5. Ny versjon

1. Avslutt appen.
2. Last ned på nytt. Lenkene i [punkt 1](#1-last-ned-og-installer) går alltid til siste versjon.
3. Mac: Dra appen til «Apper», velg «Erstatt». Windows: Erstatt mappa `Trix`.

Filene og innstillingene dine blir. Endringer: [CHANGELOG](CHANGELOG.md).

## 6. Avinstaller

1. Avslutt appen.
2. Mac: Flytt «Trix» fra «Apper» til papirkurven. Windows: Slett mappa `Trix`.
3. Filene dine blir liggende. Slett datamappen hvis du vil fjerne dem, se [Filene](#filene). Eksporter først det du vil beholde.
