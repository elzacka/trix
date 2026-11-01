# Brukerveiledning for Trix Ultra

Sist oppdatert: 01.11.26. Om prosjektet: [README](README.md).

## 1. Last ned og installer

| | Mac | Windows |
|---|---|---|
| Krav | macOS 15 eller nyere | Windows 10 eller 11 |
| Last ned | [Trix-Ultra-macOS.dmg](https://github.com/elzacka/trix-ultra/releases/latest/download/Trix-Ultra-macOS.dmg) | [Trix-Ultra-Windows.zip](https://github.com/elzacka/trix-ultra/releases/latest/download/Trix-Ultra-Windows.zip) |
| Installer | Dobbeltklikk på dmg-fila. Dra «Trix Ultra» til «Apper» | Høyreklikk på zip-fila, velg «Pakk ut alle» |
| Start | Åpne appen fra «Apper». Velg «Åpne» når macOS spør om en app fra internett: Det gjelder alle slike apper, og Apple har sjekket denne | Åpne `Trix Ultra\Trix Ultra.exe`. Første gang: «Mer informasjon», så «Kjør likevel», fordi appen ikke er signert |

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
| Avslutte | «Avslutt Trix Ultra» i menyen, eller høyreklikk på ikonet |

Menyen («Flere valg» øverst til høyre). Oppsettet bestemmer hvilke valg den har.

| Valg | Gjør |
|---|---|
| «Visning» | Mine hurtigtaster, maskinens eller begge. Sortering: A–Å eller rekkefølgen i fila |
| «Kildedata ‹fane›» | Innholdet i fanen, se [Innhold i appen](#innhold-i-appen) |
| «Tilpass» | Oppsettet, se [I appen](#i-appen-tilpass) |
| «Endre hurtigåpner» | Trykk den nye kombinasjonen. Backspace fjerner den |

## 3. Tilpass

To deler, to måter:

| | I appen | Direkte i filene |
|---|---|---|
| Oppsett: Faner, meny, farger, skrift, vindu, ikoner, tekster | «Tilpass», Ctrl+, / ⌘, | `Oppsett.md` |
| Innhold: Det som står i fanene | «Kildedata ‹fane›», «Se og endre i fila», Ctrl+E / ⌘E | Én `.md`-fil per fane |
| Vises | Oppsett: Med en gang. Innhold: Når du lagrer | Innen ett sekund etter at du lagrer fila |

Typer faner:

| Type           | Passer til                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------- |
| `hurtigtaster` | Hurtigtaster for et program, med Windows- og Mac-taster. Valget «system» viser også maskinens egne |
| `oppslag`      | Ordliste, oppslagsverk, spørsmål og svar, telefonliste                                             |
| `kort`         | «Snu-kort» med forside og bakside: Tiltakskort, opplæring. Valgene «3 i bredden» og «2 i høyden» bestemmer hvor mange kort fanen viser |
| `steg`         | Veiledninger med steg                                                                              |

### I appen: «Tilpass»

Et eget vindu ved siden av panelet. Panelet viser hver endring med en gang.

| Del | Endrer |
|---|---|
| «Faner» | Legg til, fjern, flytt. Navn, type, fil, valg, tekst i søkefeltet, antall kort i bredden og høyden |
| «Meny» | Rekkefølge, valg av og på, skillelinjer |
| «Farger» | Lys og mørk modus. Varsel når kontrasten er lavere enn 4,5:1. «Bruk standardfargene» |
| «Skrift og vindu» | Skrift, skrift på taster, størrelse. «Panel ved ikonet» eller «Vanlig vindu», bredde, høyde |
| «Ikoner» | SVG eller PNG: «Velg fil …» eller dra fila inn. «Standard» |
| «Tekster» | Alle tekstene i appen |

- «Lagre»: Skriver `Oppsett.md`.
- «Avbryt»: Ingenting lagres. Med endringer: «Forkast endringene».
- «Åpne Oppsett.md»: Fila i tekstprogrammet ditt.

### Innhold i appen

Menyen → «Kildedata ‹fane›»:

| Valg | Gjør |
|---|---|
| «Se og endre i fila» | Fila i panelet. «Lagre»: Ctrl+S / ⌘S. «Avbryt»: Esc |
| «Importer …» | Henter en `.md`- eller `.txt`-fil: «Slå sammen» eller «Erstatt». Resultatet åpnes i panelet og lagres med «Lagre» |
| «Eksporter» | Kopi i Nedlastinger. Overskriver aldri en fil |
| «Åpne kildemappe» | Mappa med fila |

Formatet står i kommentaren øverst i fila. Appen lagrer ikke hvis fila er
endret utenfor appen etter at du åpnet den: Kopier endringene dine, velg
«Avbryt» og åpne fila på nytt.

### Direkte i filene

#### Filene

| Hvor       | Mappe                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------- |
| Mac        | `~/Library/Application Support/Trix Ultra`                                                  |
| Windows    | `%APPDATA%\Trix Ultra`                                                                      |
| Delt mappe | `Trix Ultra-data` ved siden av appen, hvis den finnes, se [Del med andre](#4-del-med-andre) |

| Fil | Holder |
|---|---|
| `Oppsett.md` | Oppsettet |
| `‹Navn›.md` | Innholdet i en fane. Filnavnet står under `## Visninger` i `Oppsett.md` |
| `.svg`, `.png` | Ikonene under `## Ikoner` |
| `innstillinger.json` | Hurtigåpner, visning og vindustype for denne maskinen. Endres i appen |

#### Gjør mappa synlig

Mappa er skjult som standard.

| Måte | Slik |
|---|---|
| Fra appen | «Kildedata ‹fane›» → «Åpne kildemappe». Eller «Tilpass» → «Åpne Oppsett.md» |
| Mac, Finder | ⇧⌘G, lim inn stien over, Retur. Skjulte filer av og på: ⇧⌘. |
| Windows | Windows-tasten+R, skriv `%APPDATA%\Trix Ultra`, Enter. Eller lim stien inn i adressefeltet i Filutforsker |

#### Endre

- Åpne fila i et tekstprogram, for eksempel TextEdit, Notisblokk eller VS Code.
- Formatet står i kommentaren øverst i hver fil.
- Lagre fila. Appen viser endringen innen ett sekund.
- `Oppsett.md` med feil: Appen viser et varsel med linjenummeret og hopper over linja.
- Slettet seksjon i `Oppsett.md`: Standardverdiene.
- Fil som mangler: Appen lager den fra malen for typen.

## 4. Del med andre

- Lag mappa `Trix Ultra-data` ved siden av appen. Appen bruker den i stedet for datamappen.
- Kopier filene dine dit. En tom mappe får standardinnholdet.
- Appen og mappa i en delt mappe: Alle ser det samme innholdet.
- Gi andre skrivetilgang bare til `Trix Ultra-data`, aldri til appen.
- `innstillinger.json` blir på hver maskin.

## 5. Ny versjon

1. Avslutt appen.
2. Last ned på nytt. Lenkene i [punkt 1](#1-last-ned-og-installer) går alltid til siste versjon.
3. Mac: Dra appen til «Apper», velg «Erstatt». Windows: Erstatt mappa `Trix Ultra`.

Filene og innstillingene dine blir. Endringer: [CHANGELOG](CHANGELOG.md).

## 6. Avinstaller

1. Avslutt appen.
2. Mac: Flytt «Trix Ultra» fra «Apper» til papirkurven. Windows: Slett mappa `Trix Ultra`.
3. Filene dine blir liggende. Slett datamappen hvis du vil fjerne dem, se [Filene](#filene). Eksporter først det du vil beholde.
