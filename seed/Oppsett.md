# Oppsett

<!--
Appen lager fanene, menyen, fargene, skriftene og tekstene sine ut fra denne fila.
Du kan endre fila her eller i «Endre oppsettet» i menyen (Ctrl+, eller ⌘,), som skriver den samme fila.
En seksjon du sletter, får standardverdiene tilbake.

## Visninger
- Én linje per fane, i den rekkefølgen fanene skal stå: Navn | type | fil | valg | tekst i søkefeltet
- Typer:
  - hurtigtaster: Handlinger med tastene for Windows og Mac. Du kan slå opp en tastekombinasjon.
  - oppslag: Ord og begreper med forklaring, andre navn og emneknagger. Til ordliste, jukselapp og spørsmål og svar.
  - kort: Kort med forside og bakside. Trykk på kortet for å snu det.
  - artikler: Lengre tekster delt i steg. Til veiledninger og «slik gjør du».
- Samme type flere ganger: Gi hver fane sin egen fil.
- Fil: Et filnavn som slutter på .md, i samme mappe som denne fila. Appen lager fila fra malen for typen hvis den mangler.
- Valg, skilt med komma. Uten valg får hurtigtaster søk og tasteoppslag, de andre søk og emneknagger.
  - søk: Søkefelt
  - tasteoppslag: Slår opp en hurtigtast du trykker eller skriver, og viser knappen med tastaturet i søkefeltet (hurtigtaster)
  - system: Viser også maskinens egne hurtigtaster (hurtigtaster)
  - emneknagger: Trykk på en #emneknagg for å se alt med samme emne (oppslag, kort, artikler)
  - a–å: Sorterer alfabetisk når appen starter
- Tekst i søkefeltet: Står i feltet før du skriver. Uten tekst: «søk» under Tekster.
- Eksempel: - Telefonliste | oppslag | Telefonliste.md | søk | Søk etter navn eller nummer

## Meny
- Valgene i menyen, i rekkefølge: visning, kildedata, oppsett, hurtigåpner, avslutt, versjon
- ---: Skillelinje
- Slett en linje for å skjule valget.

## Farger
- Navn | lys modus | mørk modus. Én farge: Den samme i begge.
- Farger som #1e293b, rgb(30 41 59) eller navy
- Appen sier fra hvis kontrasten mellom tekst og bakgrunn er lavere enn 4,5:1 (WCAG AA).

## Skrift
- tekst og taster: Syne og Inter følger med appen. Du kan også skrive navnet på en skrift som er installert på maskinen.
- størrelse: 12–20

## Vindu
- type: panel (åpnes ved ikonet i menylinjen eller på oppgavelinjen) eller vindu (et vanlig vindu i Dock eller på oppgavelinjen)
- bredde: 320–1200, høyde: 400–1000

## Ikoner
- Navn | fil: Et .svg- eller .png-bilde i samme mappe som denne fila
- Navn: logo, app, menylinje, meny, søk, tøm, tasteoppslag, tilbake, valgt, undermeny, fjern
- Ikonene i appen får tekstfargen. Det er bare formen i bildet som teller.
- logo: Vises i sine egne farger.
- app: Ikonet på vinduet og oppgavelinjen i Windows, bare .png.
- menylinje: Ikonet i menylinjen (Mac) eller ved klokka på oppgavelinjen (Windows), bare .png. På Mac blir det svart eller hvitt som de andre ikonene der. Skriv | farge etter filnavnet for å beholde fargene.
- Ikonet i Finder og Utforsker hører til selve appen. Du endrer det når du bygger appen selv, se README.

## Tekster
- Nøkkel | tekst. Ord i {klammer} fyller appen inn.
-->

## Visninger

- Hurtigtaster | hurtigtaster | Hurtigtaster.md | søk, tasteoppslag, system
- Oppslag | oppslag | Oppslag.md | søk, emneknagger
- Kort | kort | Kort.md | søk, emneknagger
- Artikler | artikler | Artikler.md | søk, emneknagger

## Meny

- visning
- kildedata
- ---
- oppsett
- hurtigåpner
- ---
- avslutt
- versjon

## Farger

- bakgrunn | #f8fafc | #111418
- flate | #ffffff | #1a1e23
- linje | #e2e8f0 | #2b3138
- tekst | #1e293b | #e5e7eb
- dempet | #64748b | #9aa3ae
- aksent | #00466a | #6f93a8
- på aksent | #ffffff | #0b1218

## Skrift

- tekst | Syne
- taster | Inter
- størrelse | 14

## Vindu

- bredde | 420
- høyde | 600

## Ikoner

## Tekster

- navn | Trix Ultra
- visninger | Visninger
- flere valg | Flere valg
- søk | Søk
- tøm søk | Tøm søk
- slå opp | Slå opp hurtigtast
- trykk hurtigtasten | Trykk hurtigtasten …
- treff | {antall} treff
- ingen treff | Ingen treff på «{søk}»
- ikke i lista | {taster} er ikke i lista
- tom | Lista er tom
- vis alt | Vis alt
- merket | {antall} merket
- fjern merke | Fjern {emne}
- også | Også
- tilbake | Tilbake
- mine hurtigtaster | Mine hurtigtaster
- systemets hurtigtaster | Hurtigtaster i {system}
- begge | Begge
- a–å | Sorter A–Å
- filrekkefølge | Rekkefølgen i kildefila
- visning | Visning
- kildedata | Kildedata {visning}
- rediger | Se og endre i fila
- eksporter | Eksporter
- importer | Importer …
- åpne mappe | Åpne kildemappe
- oppsett | Endre oppsettet
- velg hurtigåpner | Velg hurtigåpner
- endre hurtigåpner | Endre hurtigåpner
- ny hurtigtast | Trykk ny hurtigtast …
- åpner | Åpner {navn}
- åpne | Åpne {navn}
- avslutt | Avslutt {navn}
- avbryt | Avbryt
- forkast | Forkast endringene
- lagre | Lagre
- endret utenfor | Fila er endret utenfor {navn}. Kopier endringene dine, avbryt og åpne fila på nytt.
- importspørsmål | Vil du slå fila sammen med lista di eller erstatte lista?
- erstatt | Erstatt
- slå sammen | Slå sammen
- passer ikke | {fil} passer ikke i {visning}
- opptatt | En annen app bruker {taster}
- kan ikke bruke | {navn} kan ikke bruke {taster}
