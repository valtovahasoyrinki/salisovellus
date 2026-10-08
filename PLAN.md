# Salisovellus – PLAN.md

Lähde: [docs/SPEC.md](docs/SPEC.md) (kopio `SALISOVELLUS_PROMPT.md`:stä). Viittaukset muodossa §6.3 tarkoittavat SPEC.md:n osioita.

Kohdelaite: **iPhone 12** (390 × 844, Safari/iOS). Toinen testiprofiili: Pixel 5 (393 × 851).
Aksentti: **harmaa/teräs** (§7, täyttökohta).

---

## 1. Arkkitehtuuri

```
Käyttöliittymä (React 19 + Tailwind v4 + Motion)
        │  luku: useLiveQuery (reaktiivinen)       kirjoitus: repository-funktiot
        ▼
Repositoriot (src/db/repositories/*.ts)  ← ainoa tie tietokantaan
        ▼
Dexie 4 / IndexedDB (src/db/schema.ts, versiointi + migraatiot)

Puhdas laskenta (src/domain/*.ts) – ei React-, ei Dexie-riippuvuuksia.
UI antaa sille taulukot ja saa takaisin lukuja. 100 % yksikkötestattu.
```

Periaatteet:
- **Tietokanta on totuus.** Kirjaukset tallennetaan heti (§5, autosave); UI ei pidä omaa kopiota treenidatasta. Ainoa globaali ei-pysyvä tila on lepoajastin ja ilmoitukset (React Context).
- **Laskenta on puhdasta.** Jokainen §6.6-funktio on parametreilla kutsuttava, deterministinen ja testattu. Tämä on syy siihen, että analyysi on halpa ja testattavissa ilman selainta.
- **Kerrosten rajat:** näkymät eivät kutsu Dexietä suoraan, eivät `domain`-funktiot tunne tietokantaa.

### Teknologiavalinnat ja perustelut

| Alue | Valinta | Perustelu |
|---|---|---|
| Runko | Vite 7 + React 19 + TypeScript strict | §4 |
| Tyylit | Tailwind CSS v4 (`@tailwindcss/vite`), tokenit CSS-muuttujina `@theme`-lohkossa | v4 lukee tokenit CSS:stä → yksi totuuden lähde teemalle |
| Animaatiot | `motion` (Motion for React) | §4 |
| Tallennus | Dexie 4 + `dexie-react-hooks` `useLiveQuery` | §4 |
| Reititys | `react-router` v7, **HashRouter** | Toimii millä tahansa staattisella hostilla (GitHub Pages alipolku) ilman 404-uudelleenkirjoituksia; syvälinkit kestävät PWA:n uudelleenkäynnistyksen |
| Kaaviot | **Omat SVG-kaaviot** + Motion (`pathLength`-piirto) | Poikkeama §4:n ehdotuksista (Recharts/visx): kosketustooltip halutaan toimimaan yhdellä `pointermove`-kuulijalla ja binäärihaulla ilman komponenttipuun uudelleenrenderöintiä, 3 vuoden data desimoidaan itse, ja nipusta jää ~90 kt pois. Kaavio on tässä sovelluksessa ydintoiminto, joten se kannattaa omistaa itse. |
| Validointi | `zod` | §4 (tuonti + lomakkeet) |
| PWA | `vite-plugin-pwa` (Workbox, generateSW, precache kaikki assetit + fontit) | §4 |
| Testit | Vitest + Testing Library, Playwright (iPhone 12 / Pixel 5 -profiilit), `fake-indexeddb` yksikkötesteihin | §4, §8 |
| Fontti | **Inter Variable**, self-hosted, latin-subset; numerot `font-variant-numeric: tabular-nums` | Poikkeama §7:n "kaksi fonttia" -hengestä: Inter sisältää tasalevyiset numerot, joten yksi ~40 kt woff2 riittää → nopeampi kylmäkäynnistys (§8: alle 1 s) |
| ID:t | Oma `newId()`: aikaleima-prefix + satunnaisuus (lajiteltava) | `crypto.randomUUID()` vaatii secure contextin (puuttuu paljaalta LAN-HTTP:ltä); lajiteltava ID auttaa myös Dexie-indekseissä |
| Päivämäärät | Oma `src/lib/date.ts` (Intl + `Europe/Helsinki`) | Ei date-fns-riippuvuutta; §8 vaatii nimenomaiset DST- ja viikonvaihdetestit, jotka on helpompi omistaa itse |
| Tilanhallinta | Dexie live queries + Context (ajastin, toastit) | Ei Reduxia/zustandia: treenidatalle ei tarvita toista totuutta |

Ei backendiä, ei tilejä, ei ulkoisia kutsuja ajon aikana (§10).

---

## 2. Tietomalli (Dexie v1)

Tyypit `src/domain/types.ts`, skeema `src/db/schema.ts`. `id` = string (`newId()`). Aikaleimat = epoch ms (indeksoitavia), lisäksi `dateKey` = `"YYYY-MM-DD"` Helsingin aikavyöhykkeessä ryhmittelyä varten.

```ts
exercises        id, name, primaryMuscles[], secondaryMuscles[], equipment,
                 kind: 'weight_reps'|'bodyweight'|'time', increment, defaultRestSec,
                 defaultRepRange {min,max}, notes, imageId?, archived, createdAt, isCustom
programs         id, name, active
workoutDays      id, programId, name, order, color, icon
dayExercises     id, dayId, exerciseId, order, targetSets, repRange?, restSec?
sessions         id, dayId?, dayName, startedAt, endedAt?, note, status: 'active'|'done', dateKey
sessionExercises id, sessionId, exerciseId, order, note, skipped
setEntries       id, sessionExerciseId, sessionId, exerciseId, order, weight, reps,
                 durationSec?, warmup, rir?, completedAt
images           id, blob            (liikkeiden omat kuvat erillään kevyistä riveistä)
settings         id: 'app'           (yksi rivi, §6.11)
meta             key, value          (skeemaversio, viimeisin varmuuskopio, kesken oleva ajastin)
```

Indeksit (analyysin suorituskyky, §8: ~15 000 sarjaa):
- `setEntries`: `id, sessionExerciseId, sessionId, [exerciseId+completedAt], completedAt`
- `sessions`: `id, startedAt, status, dayId, dateKey`
- `sessionExercises`: `id, [sessionId+order], exerciseId`
- `dayExercises`: `id, [dayId+order], exerciseId`
- `exercises`: `id, name, archived, *primaryMuscles`

**Poikkeama §5:stä:** `setEntry` kantaa myös `sessionId`- ja `exerciseId`-kentät (denormalisointi). Ilman niitä liikekohtainen käyrä vaatisi koko `sessionExercises`-taulun läpikäynnin joka kerta; compound-indeksillä `[exerciseId+completedAt]` liikkeen koko historia luetaan yhdellä range-kyselyllä. Suhde on muuttumaton (sarja ei vaihda liikettä), joten denormalisointi ei voi mennä epäsynkroniin.

**Historia on pyhä (§5):** sessio kopioi `dayName`-nimen ja omat `sessionExercises`-rivinsä. Ohjelman muokkaus ei kosketa menneisyyteen. Liike, jolla on `setEntries`-rivejä, voidaan vain arkistoida; pysyvä poisto listaa tarkat luvut ja vaatii vahvistuksen.

Migraatiot: jokainen skeemamuutos on uusi `db.version(n).stores({...}).upgrade(tx => ...)`. Testi `src/db/migrations.test.ts` kirjoittaa v1-datan, avaa uuden version ja varmistaa säilymisen (§8).

---

## 3. Näkymät ja reitit

| Reitti | Näkymä | Spec |
|---|---|---|
| `/` | Koti: seuraava treeni kierron mukaan, "Jatka treeniä" -banneri, viikkotavoite, 1–3 oivallusta, varmuuskopiomuistutus | §6.3, §6.9, §6.10 |
| `/workout/:sessionId` | Aktiivinen treeni (ydinnäkymä) + kelluva lepoajastin | §6.3, §6.4 |
| `/workout/:sessionId/summary` | Yhteenveto + ennätysjuhlinta | §6.5 |
| `/history` | Historia kuukausittain + lämpökarttakalenteri | §6.7 |
| `/history/:sessionId` | Treenin tiedot, muokkaus, poisto | §6.7 |
| `/analysis` | Yleiskatsaus (viikkosarjat, PPL-tasapaino, putki, tuoreet ennätykset) | §6.8 |
| `/analysis/exercise/:exerciseId` | Liikekohtainen analyysi: kaavio, mittarit, aikavälit, ennätykset | §6.8 |
| `/program` | Ohjelma: treenipäiväkortit, liikkeiden järjestys/lisäys/poisto | §6.2 |
| `/program/day/:dayId` | Päivän liikkeet ja päiväkohtaiset tavoitteet | §6.2 |
| `/exercises`, `/exercises/:id` | Liikekirjasto, muokkaus, arkistointi, oma kuva | §6.2 |
| `/settings`, `/settings/backup` | Asetukset, vienti/tuonti | §6.10, §6.11 |
| `/onboarding` | Käyttöönotto (ohitettavissa) | §6.1 |

Alapalkki: Koti · Historia · Analyysi · Ohjelma + korostettu "Aloita treeni", safe-area huomioitu (§7).

---

## 4. Kansiorakenne

```
src/
  app/            App.tsx, router.tsx, providers (teema, ajastin, toastit), BottomNav, AppShell
  db/             schema.ts, db.ts, repositories/, seed/exercises.ts (60–80 liikettä), migrations.test.ts
  domain/         types.ts, muscles.ts, e1rm.ts, records.ts, volume.ts, progression.ts,
                  trend.ts, stagnation.ts, weeklySets.ts, rotation.ts, insights.ts  (+ *.test.ts)
  features/
    onboarding/ program/ exercises/ workout/ history/ analysis/ settings/ backup/
  components/     ui/ (Button, Sheet, NumberStepper, Toast, Skeleton, Confirm…)
                  charts/ (LineChart, StackedBarChart, Heatmap, ProgressRing)
                  icons/ (oma SVG-sarja), MuscleMap/ (edestä + takaa)
  lib/            date.ts, format.ts, id.ts, haptics.ts, wakeLock.ts, storage.ts, image.ts
  styles/         tokens.css, index.css
tests/e2e/        onboarding.spec.ts, workout.spec.ts, backup.spec.ts, analysis.spec.ts, seed.ts
scripts/          generate-test-data.ts (3 v / ~600 treeniä / ~15 000 sarjaa, §8)
public/           icons, fonts, manifest-assetit
docs/             SPEC.md, DECISIONS.md
```

---

## 5. Vaiheet, työpaketit ja omistajuus

Agenttitilanne: kansioita `.claude/agents/` tai `~/.claude/agents/` **ei ole** — `README-agenttitiimi.md` kuvaa Architect/Coder/Tester/Manager-paketin, mutta tiedostoja ei ole asennettu. Sopeutus (§3.2 sallii): käytän yleiskäyttöisiä aliagentteja SPEC §3.2:n **neljän työvirran** mukaan, koska työvirtajako antaa kiistattoman tiedosto-omistajuuden (kaksi agenttia ei koske samaan tiedostoon). README:n Tester- ja Manager-roolit toteutan omina laatuportteinani: luen jokaisen diffin, ajan koko testisarjan ja teen ship-päätöksen vaiheittain.

Työvirrat: **A = Data ja laskenta**, **B = Kirjausnäkymä**, **C = Analytiikka-UI**, **D = Design ja laatu**.

### Vaihe 0 – Suunnittelu (minä)
docs/SPEC.md, PLAN.md, CLAUDE.md. **Portti:** hyväksyntä.

### Vaihe 1 – Perusta (minä itse, ei delegointia)
Projektipohja, `domain/types.ts`, Dexie-skeema + migraatiokehikko, repositoriorajapinnat, design-tokenit, HashRouter, AppShell + alapalkki, PWA-runko, Vitest + Playwright -ympäristöt, `lib/*`.
**Sopimukset lukitaan tässä** ja commitataan ennen rinnakkaista työtä (§3.2).
**Portti:** typecheck + lint + testit + build läpi, tyhjä sovellus käynnistyy, kuvakaappaus 390 × 844.

### Vaihe 2 – Ohjelma, liikkeet ja laskenta (A ∥ D, sen jälkeen B)
- **A:** `src/domain/*` kokonaan (§6.6) + testit; `src/db/seed/exercises.ts` 60–80 suomenkielistä liikettä; repositorioiden toteutus.
- **D:** design-järjestelmä `components/ui/*`, ikonisarja, `MuscleMap`, Tailwind-tokenit. Lukee frontend-design-skillin ennen aloitusta (§3.2).
- **B (A:n ja D:n jälkeen):** `features/program/*`, `features/exercises/*`, `features/onboarding/*`.
**Portti:** laskentatestit kattavat §8:n rajatapaukset; ohjelma ja kirjasto käytettävissä; E2E: käyttöönotto.

### Vaihe 3 – Treenin kirjaus (B pääomistaja, A tukee)
`features/workout/*`: aktiivinen treeni, sarjarivit, esitäyttö progressioehdotuksella, lepoajastin (loppuaikaleima), keskeneräisen palautus, yhteenveto, ennätysten tunnistus, Wake Lock, jälkikirjaus.
**Portti:** E2E: koko treenin kirjaus + sivun päivitys kesken treenin + päätös; sarjan kuittaus < 100 ms; kuvakaappaukset.

### Vaihe 4 – Historia, analyysi ja oivallukset (C pääomistaja ∥ A:n insights-moottori)
`features/history/*`, `features/analysis/*`, `components/charts/*`, `domain/insights.ts` (§6.9).
**Portti:** kaaviot sulavia generoidulla 3 v datalla; oivallukset eivät toista itseään ilman datan muutosta; E2E: kaavio näkyy.

### Vaihe 5 – Viimeistely (D pääomistaja ∥ A: varmuuskopiot)
Animaatiot (§7), ennätysjuhlinta, lihaskartan lämpökartta, sovellusikoni + splash, varmuuskopio/vienti/tuonti (§6.10), suorituskyky, saavutettavuus, Lighthouse ≥ 90, visuaalinen tarkistus 390 × 844 ja 360 × 800 tummalla ja vaalealla.
**Portti:** kaikki §8:n vaatimukset mitattu.

### Vaihe 6 – Julkaisun valmistelu (minä)
GitHub Pages / Cloudflare Pages -konfiguraatio, README: julkaisu, asennus kotinäytölle iPhone + Android, varmuuskopiointi, HTTPS-testaus puhelimella. **En julkaise enkä luo tilejä ilman lupaa** (§9.6).

Jokainen delegointi sisältää: tavoite, SPEC-viittaukset, muokattavat tiedostot, lukitut sopimukset, hyväksymiskriteerit, vaatimus ajaa `npm run typecheck && npm run test` ennen raportointia.

---

## 6. Laatuportit (§3.3)

```
npm run typecheck   tsc --noEmit (strict)
npm run lint        eslint
npm run test        vitest run
npm run test:e2e    playwright test (iPhone 12 + Pixel 5)
npm run build       vite build
```
Vaihe on valmis vasta kun kaikki viisi menevät läpi ja olen katsonut kuvakaappaukset mobiilikoossa. Ei TODO-kommentteja, kuollutta koodia eikä mock-dataa tuotantokoodissa.

---

## 7. Oletukset

Kirjattu, koska etenin ilman erillistä kysymystä:

1. **Aksentti = harmaa/teräs** (täyttökohta). Toteutus: OLED-musta tausta, aksentti vaalea teräsharmaa, jota käytetään ensisijaisissa toiminnoissa ja edistyksessä. Vihreä varataan parannukselle ja punainen poistoille (§7), joten harmaa ei kilpaile niiden kanssa. Primaaripainike saa hierarkiansa kontrastista (vaalea pinta mustalla taustalla), ei värikyllästyksestä.
2. **Yksi fontti** (Inter Variable, tabular-nums) kahden sijaan – perustelu taulukossa §1.
3. **Omat SVG-kaaviot** kaaviokirjaston sijaan – perustelu taulukossa §1.
4. **HashRouter** – perustelu taulukossa §1.
5. **`setEntry` denormalisoi `exerciseId` ja `sessionId`** – perustelu §2.
6. Aikavyöhyke kiinnitetään `Europe/Helsinki`-muotoiluun, mutta laitteen kellon oletetaan olevan oikeassa; menneen treenin jälkikirjaus käyttää valittua päivää klo 18:00 paikallista aikaa, jos kellonaikaa ei anneta.
7. Lepoajastimen yleinen oletus 150 s, liikkeen oletus liikekirjastosta (moninivel 180 s, eristävä 90 s). Painonlisäys 2,5 kg, eristäville ja käsipainoliikkeille 1,25 kg.
8. Viikko = ISO-viikko (ma–su), viikkotavoite 4, viikkosarjojen ohjealue 10–20 (§6.8).
9. Teema: tumma oletuksena, vaalea ja järjestelmä valittavissa (§6.11).
10. Kieli vain suomi (fi-FI), ei i18n-kehystä – §2 määrittelee yhden käyttäjän ja yhden kielen.
11. Kaavioiden datapisteiden desimointi: yli 400 pisteen sarjat harvennetaan LTTB-tyylisesti piirtoa varten; tooltip ja laskenta käyttävät aina täyttä dataa.
12. **Node.js asennetaan Homebrew'lla** (`brew install node`) – koneella ei ole Nodea, eikä Vite-projektia voi muuten rakentaa.

## 8. Riskit

| Riski | Hallinta |
|---|---|
| iOS: ajastimet pysähtyvät taustalla | Ajastin = loppuaikaleima `meta`-taulussa; UI laskee eron joka renderissä (§4) |
| iOS: ei Vibration APIa, ei luotettavia ajastettuja ilmoituksia | Haptiikka on lisä; ajastimen loppu näytetään visuaalisesti + äänellä (§6.4) |
| iOS: Safari voi tyhjentää IndexedDB:n | `navigator.storage.persist()`, tila asetuksissa, varmuuskopiomuistutus 14 vrk (§6.10) |
| Suorituskyky 15 000 sarjalla | Compound-indeksit, muistiin välimuistitettu liikekohtainen aggregaatti, desimointi, virtualisoidut listat |
| Service worker vaatii HTTPS puhelintestauksessa | Vite `--host` + HTTPS-tunneli tai preview-julkaisu; ohjeet README:ssä (§4) |
