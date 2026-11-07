# Brukerveiledning

## Bruk

| Gjør | Slik |
|---|---|
| Åpne | Klikk på ikonet, eller bruk hurtigåpneren: ⌘⌥U (Mac), Ctrl+Alt+U (Windows) |
| Lukke | Esc, eller klikk utenfor panelet |
| Bytte fane | Klikk, Ctrl/⌘+1–9 eller Ctrl+Tab |
| Søke | Skriv i søkefeltet, Ctrl/⌘+F |
| Slå opp en hurtigtast | Tastaturknappen i søkefeltet, trykk kombinasjonen |
| Se alt med samme emne | Trykk på en #emneknagg |
| Snu et kort | Trykk på kortet |
| Lese en veiledning | Trykk på den. Esc: Tilbake |
| Følge en lenke | Trykk på den. En nettside åpnes i nettleseren. En krysslenke går til stedet i appen, og «Tilbake til ‹sted›» eller Esc tar deg tilbake. Se [Lenker](#lenker) |
| Avslutte | «Avslutt Trix» i menyen, eller høyreklikk på ikonet |

Menyen er «Flere valg» øverst til høyre. Oppsettet bestemmer hvilke valg den har:

| Valg | Gjør |
|---|---|
| «Visning» | Mine hurtigtaster, maskinens eller begge. Sortering: A–Å eller rekkefølgen i fila |
| «Importer/Eksporter», «Endre innhold i ‹fane›», «Åpne datamappen» | Innholdet i fanen, se [Innhold i appen](#innhold-i-appen) |
| «Tilpass appen» | Oppsettet, se [I appen](#i-appen-tilpass-appen) |
| «Endre hurtigåpner» | Trykk den nye kombinasjonen. Backspace fjerner den |
| «Brukerveiledning» | Denne veiledningen, i appen. Esc: Tilbake |

## Tilpass

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

Et eget vindu ved siden av appen. Du ser endringene i sanntid.

| Del | Endrer |
|---|---|
| «Moduler» | Legg til, fjern, flytt. Navn, modul, fil, valg, tekst i søkefeltet, antall kort i bredden og høyden |
| «Meny» | Rekkefølge, valg av og på, skillelinjer |
| «Farger» | Lys og mørk modus. Varsel når kontrasten er lavere enn 4,5:1. «Bruk standardfargene» |
| «Skrift og vindu» | Skrift, skrift på taster, størrelse. Vindustype: «Panel ved ikonet» eller «Vanlig vindu». Bredde, høyde |
| «Ikoner» | SVG eller PNG: «Velg fil …» eller dra fila inn. Krysset gir standardikonet tilbake |
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

Med vindustypen «Vanlig vindu» kan du også dra en fil fra Finder eller
Utforsker inn på en fane. Fila havner i den fanen, og du får de samme valgene.
Panelet lukker seg når du klikker utenfor det, så med «Panel ved ikonet» bruker
du «Importer …».

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

Excel og CSV blir tabeller:

- Hvert ark blir et oppslag, et kort eller en veiledning med samme navn som
  arket. En CSV-fil, eller en Excel-fil med bare ett ark, får navnet til fila.
- Fet og kursiv skrift, lenker og datoer fra Excel blir med.
- Hurtigtaster: Hver rad blir én hurtigtast.

Appen lagrer ikke hvis noen har endret fila utenfor appen etter at du åpnet den.
Kopier da endringene dine, velg «Avbryt» og åpne fila på nytt.

### Lenker

Du skriver lenker i innholdet, med «Endre innhold i ‹fane›» eller direkte i fila.
En lenke har to deler: `[teksten som vises](hvor lenken går)`.

- Lenker virker i tekst, lister og tabeller, men ikke i titler og grupper (`###` og `##`).
- I Hurtigtaster skriver du lenken i navnet: `- [Kamera](Oppslag.md#kamera) | ctrl K | ⌘K`.
- På et kort virker lenken bare på baksiden, fordi et trykk på forsiden snur kortet.

#### Lenker til nettsider

Skriv hele adressen: `[DSB](https://www.dsb.no/)`.

- Lenken åpnes i nettleseren din, og appen blir stående der den er.
- Adressen må begynne med `https://` eller `http://`. Ellers viser appen teksten slik du skrev den.
- Appen sjekker ikke om nettsiden finnes.

#### Krysslenker mellom innhold

En krysslenke går til et sted i innholdet i appen. Den virker på samme måte i
alle moduler, og mellom alle moduler:

| Lenken går til | Skriv |
|---|---|
| Et sted i samme fane | `[Se listen](#husk)` |
| Et sted i en annen fane, med samme eller en annen modul | `[Se rutinen](Steg.md#forbered-deg-på-ekombortfall)` |
| Toppen av en annen fane | `[Alle rutinene](Steg.md)` |

Hver fane har sin egen fil. Du lenker derfor mellom to faner med modulen `kort`
på samme måte som fra et kort til en veiledning.

Slik lager du en krysslenke:

1. Finn filnavnet til fanen du vil lenke til. Det står under «Moduler» i «Tilpass appen».
2. Finn navnet på stedet, og skriv det med små bokstaver og bindestrek for mellomrom. Ta bort tegn som `?`, `,` og `:`. «Forbered deg på ekombortfall» blir `forbered-deg-på-ekombortfall`.
3. Skriv lenken og lagre. Appen viser et varsel med fil og linje hvis den ikke finner stedet. Det samme skjer hvis du senere endrer navnet på stedet.

Dette kan en krysslenke gå til:

| Modul | Stedet kan være | Når du følger lenken |
|---|---|---|
| `oppslag` | Et oppslag, en overskrift i et oppslag, en gruppe | Oppslaget åpner seg |
| `kort` | Et kort, en overskrift på baksiden, en gruppe | Kortet snur seg |
| `steg` | En veiledning, en overskrift i en veiledning, en gruppe | Veiledningen åpner seg |
| `hurtigtaster` | En hurtigtast, en gruppe | Appen viser hurtigtasten eller gruppen |

- Appen tømmer søket og fjerner merkene i fanen du kommer til, slik at du ser stedet.
- Lenken går til det første stedet hvis to steder har samme navn. En tittel kommer foran en overskrift.
- I et filnavn skriver du `%20` for mellomrom: `[Rutiner](Mine%20rutiner.md)`.

Når du følger en krysslenke, står «Tilbake til ‹sted›» nederst i vinduet:

- Knappen eller Esc: Du kommer tilbake til samme fane og samme sted, med søket og det åpne kortet eller oppslaget slik det var. Hver krysslenke du følger videre, får sitt eget steg tilbake.
- Krysset: Du blir der du er, og knappen forsvinner.

### Filene

| Hvor       | Mappe                                                                                    |
| ---------- | ---------------------------------------------------------------------------------------- |
| Mac        | `~/Library/Application Support/Trix`                                                     |
| Windows    | `%APPDATA%\Trix`                                                                         |
| Delt mappe | `Trix-data` i samme mappe som appen, hvis den finnes, se [Del med andre](#del-med-andre) |

| Fil | Holder |
|---|---|
| `Oppsett.md` | Oppsettet |
| `‹Navn›.md` | Innholdet i en fane. Filnavnet står under `## Moduler` i `Oppsett.md` |
| `.svg`, `.png` | Ikonene under `## Ikoner` |
| `innstillinger.json` | Hurtigåpner, visning og vindustype for denne maskinen. Endres i appen |

#### Finn mappa

Mappa er skjult som standard.

| Måte | Slik |
|---|---|
| Fra appen | «Åpne datamappen». Eller «Tilpass appen» → «Åpne Oppsett.md» |
| Mac, Finder | ⇧⌘G, lim inn stien over, Retur. Skjulte filer av og på: ⇧⌘. |
| Windows | Windows-tasten+R, skriv `%APPDATA%\Trix`, Enter. Eller lim stien inn i adressefeltet i Filutforsker |

#### Endre en fil

- Åpne fila i et tekstprogram, for eksempel TextEdit, Notisblokk eller VS Code.
  Formatet står i kommentaren øverst i fila.
- `Oppsett.md` med feil: Appen viser et varsel med linjenummeret og hopper over linja.
- En seksjon du sletter i `Oppsett.md`, får standardverdiene.
- Appen lager en fil som mangler, fra malen for modulen.

## Del med andre

Flere kan bruke det samme innholdet og oppsettet hvis de åpner appen fra en felles mappe.

1. Legg appen i en mappe som alle har tilgang til, for eksempel en delt mappe på nettverket. På Windows legger du hele mappa `Trix` der.
2. Lag en mappe med navnet `Trix-data` i samme mappe som appen. På Windows lager du den inne i mappa `Trix`, ved siden av `Trix.exe`. Appen bruker `Trix-data` i stedet for datamappen.
3. Kopier filene fra datamappen din til `Trix-data`, se [Filene](#filene). Appen lager standardfilene hvis mappa er tom.

- Gi de andre skrivetilgang bare til `Trix-data`, ikke til appen. Den som kan endre appen, kan bytte den ut med et annet program.
- Hurtigåpner, visning og vindustype blir lagret på hver maskin, ikke i `Trix-data`.

## Ny versjon

1. Avslutt appen.
2. Last ned siste versjon, se [Last ned og installer](INSTALLERING.md).
3. Mac: Dra appen til «Apper», velg «Erstatt». Windows: Erstatt mappa `Trix`.

Filene og innstillingene dine blir. Endringer: [CHANGELOG](CHANGELOG.md).

## Avinstaller

1. Avslutt appen.
2. Mac: Flytt «Trix» fra «Apper» til papirkurven. Windows: Slett mappa `Trix`.
3. Filene dine blir liggende. Slett datamappen hvis du vil fjerne dem, se [Filene](#filene). Eksporter først det du vil beholde.
