# Oppsett

<!--
Appen lager fanene, menyen, fargene, skriftene og tekstene sine ut fra denne fila.
Du kan endre fila her eller i «Tilpass» i menyen (Ctrl+, eller ⌘,).
Appen viser endringene med en gang du lagrer fila. I «Tilpass» ser du dem før du lagrer.
En seksjon du sletter, får standardverdiene tilbake.

## Moduler
- Én linje per modul. Hver modul vises som en fane, i samme rekkefølge som linjene: Navn | modul | fil | valg | tekst i søkefeltet
- Moduler du kan velge:
  - hurtigtaster: Handlinger med tastene for Windows og Mac. Du kan slå opp en tastekombinasjon.
  - oppslag: Ord og begreper med forklaring, andre navn og emneknagger. Til ordliste, jukselapp og spørsmål og svar.
  - kort: Kort med forside og bakside. Trykk på kortet for å snu det.
  - steg: Veiledninger delt i steg. Til «slik gjør du».
- Samme modul flere ganger: Gi hver linje sin egen fil.
- Fil: Et filnavn som slutter på .md, i samme mappe som denne fila. Appen lager fila fra malen for modulen hvis den mangler.
- Valg, skilt med komma. Uten valg får hurtigtaster søk og tasteoppslag, de andre søk og emneknagger.
  - søk: Søkefelt
  - tasteoppslag: Slår opp en hurtigtast du trykker eller skriver, og viser knappen med tastaturet i søkefeltet (hurtigtaster)
  - system: Viser også maskinens egne hurtigtaster (hurtigtaster)
  - emneknagger: Trykk på en #emneknagg for å se alt med samme emne (oppslag, kort, steg)
  - a–å: Sorterer alfabetisk når appen starter
  - 3 i bredden, 2 i høyden: Antall kort ved siden av og under hverandre, 1–6. Kortene deler plassen i fanen, og et kort med mye tekst blir høyere. Uten tall viser appen så mange kort i bredden som det er plass til (kort)
- Tekst i søkefeltet: Står i feltet før du skriver. Uten tekst: «søk» under Tekster.
- Eksempel: - Telefonliste | oppslag | Telefonliste.md | søk | Søk etter navn eller nummer

## Meny
- Valgene i menyen, i rekkefølge: visning, innhold, rediger, åpne mappe, oppsett, hurtigåpner, brukerveiledning, avslutt, versjon
- ---: Skillelinje
- Slett en linje for å skjule valget.

## Farger
- Navn | lys modus | mørk modus. Én farge: Den samme i begge.
- flate: Lister og felt. aksent: Knapper og lenker. forside og bakside: Kortene. «på …»: Teksten på den fargen.
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
- Navn: logo, app, menylinje, meny, søk, tøm, tasteoppslag, tilbake, til toppen, valgt, undermeny, fjern, snu
- Ikonene i appen får tekstfargen. Det er bare formen i bildet som teller.
- logo: Vises i sine egne farger.
- app: Ikonet på vinduet og oppgavelinjen i Windows, bare .png.
- menylinje: Ikonet i menylinjen (Mac) eller ved klokka på oppgavelinjen (Windows), bare .png. På Mac blir det svart eller hvitt som de andre ikonene der. Skriv | farge etter filnavnet for å beholde fargene.
- Ikonet i Finder og Utforsker hører til selve appen. Du endrer det når du bygger appen selv, se README.

## Tekster
- Nøkkel | tekst. Ord i {klammer} fyller appen inn.
-->

## Moduler

- Hurtigtaster | hurtigtaster | Hurtigtaster.md | søk, tasteoppslag, system
- Oppslag | oppslag | Oppslag.md | søk, emneknagger
- Kort | kort | Kort.md | søk, emneknagger
- Steg | steg | Steg.md | søk, emneknagger

## Meny

- visning
- innhold
- ---
- rediger
- åpne mappe
- oppsett
- hurtigåpner
- ---
- brukerveiledning
- avslutt
- versjon

## Farger

- bakgrunn | #f8fafc | #111418
- flate | #ffffff | #1a1e23
- linje | #e2e8f0 | #2b3138
- tekst | #1e293b | #e5e7eb
- dempet | #5a687c | #9aa3ae
- aksent | #00466a | #7598ad
- på aksent | #ffffff | #0b1218
- forside | #1e293b | #1a1e23
- på forside | #ffffff | #e5e7eb
- bakside | #00466a | #7598ad
- på bakside | #ffffff | #0b1218

## Skrift

- tekst | Syne
- taster | Inter
- størrelse | 14

## Vindu

- bredde | 420
- høyde | 600

## Ikoner

## Tekster

- navn | Trix
- moduler | Moduler
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
- til toppen | Til toppen
- mine hurtigtaster | Mine hurtigtaster
- systemets hurtigtaster | Hurtigtaster i {system}
- begge | Begge
- a–å | Sorter A–Å
- filrekkefølge | Rekkefølgen i fila
- visning | Visning
- innhold | Importer/Eksporter
- rediger | Endre innhold i {fane}
- eksporter | Eksporter
- importer | Importer …
- åpne mappe | Åpne datamappen
- oppsett | Tilpass appen
- brukerveiledning | Brukerveiledning
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
- passer ikke | {fil} passer ikke i {fane}
- opptatt | En annen app bruker {taster}
- kan ikke bruke | {navn} kan ikke bruke {taster}
