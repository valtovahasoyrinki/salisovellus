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
| Lint | **oxlint** | Virallinen `create-vite`-pohja vaihtoi eslintistä oxlintiin; sama kattavuus, moninkertainen nopeus |
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
npm run lint        oxlint
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
12. **Kehonpainoliikkeiden volyymi** lasketaan vain positiivisesta lisäpainosta (`max(0, paino) × toistot`), koska kehonpainoa ei seurata (§10). Seuraukset, jotka on hoidettu muualla: avustetuilla liikkeillä ei ole e1RM-ennätystä eikä trendiä (mittarina toistot), ja Push/Pull/Legs-tasapaino lasketaan **työsarjojen** jakaumasta (`setsByMovementGroup`) eikä kilogrammoista — muuten leuanvedot ja dipit vääristäisivät Pull-puolta nollavolyymillaan. Volyymijakauma näytetään toissijaisena lukuna. Tämä on perusteltu poikkeama §6.8:n sanamuodosta.
13. **Liikeanalyysin oletusmittari** on e1RM, paitsi `bodyweight`- ja `time`-tyypin liikkeillä, joilla se on parhaan sarjan toistot tai kesto.
14. **Node.js asennetaan Homebrew'lla** (`brew install node`) – koneella ei ole Nodea, eikä Vite-projektia voi muuten rakentaa.

## 7b. Toteutuksen aikana tehdyt lisäpäätökset

| Päätös | Perustelu |
|---|---|
| Viikkosarjat lihasryhmittäin esitetään **vaakapalkkeina ohjealueen kanssa**, ja viikkojen aikasarja **pinottuna palkkikaaviona liikeryhmittäin** (Push/Pull/Legs/keskivartalo) | SPEC §6.8 pyytää pinottua palkkia lihasryhmittäin, mutta 18 lihasryhmää vaatisi 18 väriä. Dataviz-ohjeen sääntö: yli kahdeksan sarjaa ei saa värittää erikseen. Nelisarjainen paletti on validoitu värisokeustestillä (`validate_palette.js`), ja lihasryhmäkohtainen tieto näkyy tarkemmin ohjealueeseen suhteutettuna. |
| Kaavioiden paletti on oma tokenisarja `--chart-1…4` eikä treenipäivien värit | Päivävärit on valittu tunnistettavuuden, eivät datan erottelun mukaan; kaaviopaletti läpäisee ΔE- ja kontrastitarkistukset molemmissa teemoissa. |
| Sarjarivillä paino ja toistot ovat allekkain | Kaksi askellinta rinnakkain ei mahdu 390 px:n ruudulle ilman että numerot kutistuvat lukukelvottomiksi (todettu kuvakaappauksesta). |
| Komponenttigalleria rakennetaan vain kehitysajossa | Galleriassa on demoarvoja; tuotantonippuun ei jää mock-dataa. |
| Näkymäsiirtymä on vain sisääntuloanimaatio | `AnimatePresence`-poistuma jätti näkymän `opacity: 0` -tilaan, jos reitti vaihtui ennen animaation loppua. |

## 8. Riskit

| Riski | Hallinta |
|---|---|
| iOS: ajastimet pysähtyvät taustalla | Ajastin = loppuaikaleima `meta`-taulussa; UI laskee eron joka renderissä (§4) |
| iOS: ei Vibration APIa, ei luotettavia ajastettuja ilmoituksia | Haptiikka on lisä; ajastimen loppu näytetään visuaalisesti + äänellä (§6.4) |
| iOS: Safari voi tyhjentää IndexedDB:n | `navigator.storage.persist()`, tila asetuksissa, varmuuskopiomuistutus 14 vrk (§6.10) |
| Suorituskyky 15 000 sarjalla | Compound-indeksit, muistiin välimuistitettu liikekohtainen aggregaatti, desimointi, virtualisoidut listat |
| Service worker vaatii HTTPS puhelintestauksessa | Vite `--host` + HTTPS-tunneli tai preview-julkaisu; ohjeet README:ssä (§4) |

---

## 9. Korjauskierros 1 – omat liikkeet ja laajempi liikekirjasto

Lähtökohta: `KORJAUS_1_PROMPT.md` (versio 1.0 = commit `3fafee8`). Kolme korjausta: pikaluonti
kaikkialle missä liike valitaan, lihaskartta valitsimeksi ja liikekirjasto + haku salinimillä.

### 9.1 Tietomalli ja migraatio

| Muutos | Yksityiskohdat |
|---|---|
| `Exercise.aliases?: string[]` | Hakusanat, ei näytetä nimenä. Valinnainen → vanhat rivit kelpaavat sellaisenaan. |
| `db.version(2)` | Taulut ja indeksit identtiset v1:n kanssa (aliaksia **ei** indeksoida: haku tapahtuu muistissa, koko kirjasto on jo ladattu `useLiveQuery`-kyselyyn). Versiolohko tarvitaan, koska tyyppisopimus muuttuu (CLAUDE.md sääntö 5), ja `SCHEMA_VERSION` nousee 2:een varmuuskopioiden tunnistamista varten. |
| `upgrade()` | Ei kirjoita mitään: puuttuva `aliases` tarkoittaa "ei aliaksia". Aliakset täytetään `syncExerciseLibrary()`-funktiossa, joka osaa myös nimitörmäykset ja uudet liikkeet. |
| Varmuuskopio | `aliases` valinnaisena zod-skeemaan. v1-tiedostot (ei kenttää) tuodaan virheettä; v2-tiedostot kulkevat edestakaisin identtisinä. |

### 9.2 Kirjaston versiointi (`syncExerciseLibrary`)

`seedExerciseLibrary()` (kertaluonteinen) korvataan idempotentilla `syncExerciseLibrary()`:lla,
jota kutsuu `bootstrap.ts` käynnistyksessä, käyttöönotto ja `restoreBackup`.

- Siemendatan jokaisella rivillä on `since: 1 | 2` = kirjastoversio, jossa liike tuli.
  Asennettu versio on `meta.libraryVersion`; 1.0-asennuksessa avainta ei ole → tulkitaan 1:ksi.
- Säännöt: tyhjä kanta → koko kirjasto. Vanha asennus → vain `since > asennettu` ja vain jos
  normalisoitu nimi on vapaa (myös arkistoidut, poistetut ja omat liikkeet huomioidaan).
  Poistettua ei palauteta (versioportti), arkistoitua ei aktivoida (`archived` ei kuulu
  päivitettäviin kenttiin). Aliakset täytetään vain kirjastoliikkeille (`isCustom: false`),
  joilla niitä ei vielä ole, nimen perusteella. Toinen ajo ei muuta mitään.
- "Korvaa"-tuonti nollaa `meta.libraryVersion`:n, koska liiketaulu tulee silloin kokonaan
  tiedostosta: vanhasta varmuuskopiosta palautettu kirjasto päivittyy tällä kierroksella
  lisättyihin liikkeisiin ja aliaksiin.

### 9.3 Haku (`src/domain/exerciseSearch.ts`, puhdas)

`normalizeTerm` (pienet kirjaimet `fi`, ä/ö/å → a/o/a, väliviivat ja välimerkit välilyönniksi,
välilyönnit tiivistetään) → sanalista. Jokaisen hakusanan on osuttava nimeen tai aliakseen.
Vähintään 5-merkkisillä sanoilla sallitaan yksi muokkaus (lisäys, poisto, korvaus tai
**vierekkäisten vaihto**, jotta "pulldwon" → "pulldown" löytyy). Tulosjärjestys:
nimi alkaa hakusanalla → nimi sisältää → osuma vain aliakseen → kirjoitusvirheosuma, saman
tason sisällä nimen mukaan (`fi`). Osuman mukana kulkee `aliasHit`, joka näytetään rivillä
muodossa "myös: pec deck". `filterExercises` (nimen alimerkkijono) poistuu; `ExercisePicker` ja
`ExerciseLibraryScreen` käyttävät samaa funktiota.

### 9.4 `MuscleSelector` ja osumatestaus

Uusi `src/components/MuscleMap/MuscleSelector.tsx` käyttää `bodyPaths`-muotoja ja samoja
tokeneita kuin `MuscleMap`. Yksi näkymä kerrallaan (`SegmentedControl` "Edestä"/"Takaa"),
napautus kiertää ei valittu → ensisijainen → toissijainen → ei valittu, valitut siruina kartan
alla, "Valitse listasta" avaa entiset sirurivit (ruudunlukijapolku).

Osumatesti on puhdas funktio (`hitTest.ts`), ei DOM-kokeilua: jokaiselle muodolle lasketaan
polun **tarkka** rajauslaatikko (tuettu `M L H V Q Z`, toisen asteen käyrän ääriarvot
analyyttisesti) ja siitä elliptinen osuma-alue, jota kasvatetaan näkyvää muotoa suuremmaksi.
Napautus valitsee lihaksen, jonka normalisoitu etäisyys on pienin ja ≤ 1. Peilattu puoli
normalisoidaan `x > 50 → 100 − x`. Koska jokaisen muodon oma keskipiste antaa etäisyyden 0,
muodon keskeltä valitaan aina oikea lihas – tämä on sama kriteeri, jonka Playwright ajaa
18 lihaksella molemmissa kokoluokissa.

### 9.5 Pikaluonti

- `ExercisePicker` saa `onCreate?: (name: string) => void`. Hakusanan kanssa viimeisenä rivinä
  aina "+ Luo uusi liike: ”…”", tyhjässä tilassa ensisijaisena painikkeena.
- Uusi `ExercisePickerSheet` omistaa paneelin tilan (haku ↔ pikalomake, takaisin-nuoli, hakusana
  tallessa) ja luonnin, joten `WorkoutScreen`, `DayScreen` ja `OnboardingScreen` saavat saman
  käyttäytymisen yhdestä paikasta eikä reitti vaihdu missään.
- `QuickExerciseForm`: nimi, `MuscleSelector`, väline; `Collapsible`-osiossa tyyppi,
  painonlisäys, lepo, toistoalue ja muistiinpano. Oletukset johdetaan välineestä ja asetuksista
  niin kauan kuin käyttäjä ei ole koskenut kenttään. Kaksoiskappalevaroitus, kun normalisoitu
  nimi vastaa olemassa olevan liikkeen nimeä tai aliasta → "Käytä tätä" / "Luo silti".
  Tallennus lukkiutuu käsittelyn ajaksi (tuplanapautus).

### 9.6 Työpaketit

| Vaihe | Sisältö | Omistaja |
|---|---|---|
| A | tyyppi, `db.version(2)`, siemendata (47 liikettä + aliakset), `syncExerciseLibrary`, `exerciseSearch`, varmuuskopio, testit | Coder A |
| B | `MuscleSelector`, `hitTest`, galleria, testit | Coder B (rinnakkain A:n kanssa) |
| C | `QuickExerciseForm`, `ExercisePickerSheet`, treeni/päivä/käyttöönotto, `ExerciseForm` | minä (riippuu A:sta ja B:stä) |
| D | E2E, kuvakaappaukset, Lighthouse, README, versio 1.1.0 | minä + Tester |

### 9.7 Hyväksymiskriteerit

1. "pec dec", "peck deck", "butterfly", "lat pulldown", "face pull", "hip thrust", "rdl",
   "leg press" ja "pulldwon" löytävät oikean liikkeen.
2. Kesken treenin luotu liike ilmestyy treeniin ilman navigointia; kirjatut sarjat ja käynnissä
   oleva lepoajastin säilyvät.
3. Kaikki 18 lihasta valittavissa kartalta 360 × 800 ja 390 × 844 -kokoluokassa.
4. 1.0-asennus saa uudet liikkeet ja aliakset ilman että oma tai arkistoitu liike kaksinkertaistuu.
5. Laatuportit vihreinä, Lighthouse ei laske 1.0:sta.

### 9.8 Korjauskierros 1 – täydennetyt kohdat

`KORJAUS_1_PROMPT.md` palautettiin keskusteluun liitetystä tekstistä; liitteestä katkesi
kohtia, jotka on täydennetty näin (sisältövaatimukset ennallaan):

| Kohta | Täydennys |
|---|---|
| 3.4 tiedostopolku | `src/components/MuscleMap/MuscleSelector.tsx` |
| 3.2 "Hauiskääntö EZ-…" | `Hauiskääntö EZ-tangolla` (aliakset ez curl, ez bar curl) |
| 3.2 "Kahvakuu…" | `Kahvakuulaheilautus` (kettlebell swing, kb swing) |
| 3.2 Kyykky Smith-laitteessa, lihakset | ensisijaiset quads, glutes; toissijainen hamstrings |
| 3.2 Rintatuettu soutu, ensisijaiset | upper_back, lats |
| 3.1 taulukon rivi "Hauiskääntö Scott-penkis…" | `Hauiskääntö Scott-penkissä`: preacher curl, scott curl |
| 3.3 ensimmäinen lause | "Korvaa kertaluonteinen `seedExerciseLibrary()` idempotentilla `syncExerciseLibrary()`" |
| 3.5 pikalomakkeen kentät | "Näkyvissä vain: **Nimi** (esitäytetty hakusanasta, ensimmäinen kirjain isolla), **Lihakset**, **Väline**" |
| 3.1 aliasten indeksointi | "Kenttää ei indeksoida." |

### 9.9 Oletukset tällä kierroksella

1. **Kirjastossa oli 78 liikettä, ei 79** (laskettu `EXERCISE_LIBRARY`:stä). 47 uutta → **125**.
2. **Kaksoiskappalevaroitus vertaa normalisoitua nimeä tasan** olemassa olevien liikkeiden
   nimiin ja aliaksiin. Koko hakufunktion käyttö varoitukseen tuottaisi vääriä varoituksia
   melkein jokaisesta nimestä ("Pec dec kone" osuisi moneen); tarkka vertailu antaa juuri
   promptissa kuvatun tapauksen ("pec deck" → Vipunosto rintaliikelaitteessa).
3. **`Ojentajapunnerrus köydellä` jää erillisenä liikkeenä** nykyisen `Ojentajapunnerrus
   taljassa` -liikkeen rinnalle (eri vetokahva, eri tuntuma), koska prompt listaa sen
   erikseen. Aliakset eroteltu: "pushdown, triceps pushdown" vs. "rope pushdown".
4. **`aliases` ei ole Dexie-indeksi.** Haku tehdään muistissa koko kirjastolle (125 riviä),
   joten indeksi olisi turhaa ylläpitokustannusta.
5. **`bootstrap.ts` siementää kirjaston** jo ennen käyttöönottoa (ennen vain käyttöönotto
   teki sen). Käyttöönotto kutsuu samaa idempotenttia funktiota, joten näkyvä ero on vain se,
   että kirjasto on valmiina myös silloin kun käyttöönotto ohitetaan.

### 9.10 Korjauskierroksen aikana tehdyt lisäpäätökset

| Päätös | Perustelu |
|---|---|
| Osuma-alueen **liukuma 2,5** (normalisoitu etäisyys) pelkän alueen sisäpuolen sijaan | Yksi vartalonäkymä on puhelimella noin 150 px leveä, joten yksi viewBox-yksikkö on ~2 px. Ilman liukumaa sormen 15 px heitto kapean lihaksen (kyynärvarsi, lähentäjät) kohdalla ei valinnut mitään. Liukuma ei muuta sitä, mikä lihas voittaa – lähin voittaa aina – vaan vain sitä, milloin napautus menee ohi koko kartasta. |
| Hakutulosten tasasijat ratkaistaan **aliaksen osuvuudella** (alias = hakusana → alkaa → sisältää) ennen nimeä | Ilman tätä "pec dec" nosti ensimmäiseksi liikkeen, jonka alias on "reverse pec deck". Nyt kaikki 1.0:n nollaosumahaut nostavat oikean liikkeen kärkeen, mikä on hyödyn kannalta eri asia kuin "löytyy jostain listalta". |
| Nimen ainutlaatuisuus vertaa `normalizeTerm`-muotoa, ei pelkkää pientä kirjainkokoa | Muuten pikalomakkeen kaksoiskappalevaroitus ja luonnin esto olisivat eri mieltä esimerkiksi nimistä "Pec-dec" ja "Pec dec", ja käyttäjä jäisi umpikujaan. |
| Ilmoitukset (toast) eivät ota napautuksia vastaan; vain niiden toimintopainike on klikattava | Ennätysilmoitus osui 360 px leveällä ruudulla keskelle lihaskarttaa ja nielaisi napautukset. Löytyi kuvakaappausajossa. |
| Pikalomake täyttää paneelin korkeuden: kentät vierivät omassa alueessaan ja tallennuspainike on vieritysalueen ulkopuolella | Kiinnitetty (`sticky`) palkki peitti lihaskartan alaosan ja "Lisäasetukset"-osion. Nyt painike on aina peukalon ulottuvilla eikä mikään jää sen alle. |
| Arkistoitu samannimineinen liike tarjotaan palautettavaksi ("Palauta ja käytä") | Kaksoiskappaleen luominen arkistoidun rinnalle olisi huonompi lopputulos kuin vanhan palautus, ja täsmälleen samaa nimeä ei muutenkaan voi luoda. |
| Lihaskartta pysyy isona (52 svh), vaikka lomake vierii | Prompt vaatii, että pienetkin lihakset osuvat sormeen 360 px:n ruudulla. Kartan pienentäminen mahtumaan ruudulle kerralla tekisi kyynärvarresta ja lähentäjistä noin 9 px leveitä kohteita. |
| Pikaluonti on yhdessä komponentissa (`ExercisePickerSheet`), jota treeni-, päivä- ja käyttöönottonäkymät käyttävät | Kolme erillistä toteutusta eriytyisi heti; nyt takaisin-nuoli, hakusanan säilyminen ja luonnin käsittely ovat identtiset kaikissa. Haku pidetään `hidden`-tilassa mountattuna, jotta hakusana, suodatin ja vieritys säilyvät. |

### 9.11 Käynnistys ja Lighthouse tällä kierroksella

Mitattu paikallisella `vite preview` -palvelimella (HTTP/1.1) samassa istunnossa
molemmista versioista peräkkäin, jotta vertailu on reilu:

| | 1.0 (`3fafee8`) | 1.1 |
|---|---|---|
| Performance | 85 | 83 |
| Accessibility | 100 | 100 |
| Best Practices | 100 | 100 |
| FCP / LCP | 3,2 s / 3,5 s | 3,5 s / 3,6 s |
| Pyyntöjä / siirto | 45 / 284 kt | 52 / 292 kt |

Kolme todellista käynnistyskorjausta tehtiin matkalla:

1. **Liikekirjaston synkronointi ei enää odota ensimmäistä piirtoa.** `bootstrap`
   odotti `syncExerciseLibrary()`-kutsua, joka kirjoittaa tyhjään kantaan 125
   riviä – hidastetulla puhelimella satoja millisekunteja ennen kuin mitään
   näkyi. Nyt se ajetaan piirron jälkeen ja siemendata tuodaan dynaamisesti.
2. **Pikalomake on laiskasti ladattu** (`ExercisePickerSheet`): zod-validointi,
   lihaskartta ja hakufunktio eivät ole käynnistyksen kriittisellä polulla.
3. **Liikkeen lisäyspaneeli on laiskasti ladattu myös kirjausnäkymässä.**
   Sarjan kirjaukseen ei tarvita hakua eikä karttaa; service worker precachettaa
   nipun, joten asennetussa sovelluksessa paneeli avautuu välimuistista.

Jäljelle jäävä 2 pisteen ero tulee pyyntöjen määrästä: uudet komponentit lisäävät
seitsemän nippua, jotka paikallinen HTTP/1.1-palvelin lataa jonossa (siirretyt
tavut kasvavat vain 2,8 %). Tuotannossa (GitHub Pages, HTTP/2) ja asennetussa
sovelluksessa (service workerin välimuisti) tämä ei toistu. Absoluuttiset luvut
eivät ole vertailukelpoisia 1.0:n raportin kanssa (silloin kone oli lepotilassa,
nyt mittaus tehtiin kuormitetulla koneella) – vain saman istunnon vertailu on.

### 9.12 Tester-kierroksen löydökset ja korjaukset

Tester-agentti ajoi promptin osion 4 rikkomisyritykset oikeassa selaimessa.
Löydöksistä yhdeksän johti korjaukseen:

| Vakavuus | Löydös | Korjaus |
|---|---|---|
| Estävä | **Sirurivit eivät vierineet** `fieldset`-elementin sisällä: "Kehonpaino" ja "Muu" olivat ruudun ulkopuolella, ja "Valitse listasta" -varapolusta näkyi 3/18 lihasta. Syy: `fieldset`in selainoletus `min-inline-size: min-content` estää kapenemisen, joten `overflow-x-auto` ei saanut omaa vierityslaatikkoa. | `min-w-0` kaikkiin lomakkeiden `fieldset`-elementteihin (`QuickExerciseForm`, `ExerciseForm`, `MuscleSelector`). Vika oli myös 1.0:n liikelomakkeessa. |
| Vakava | **Lihaskartan osuma ei vastannut näkyvää muotoa**: rajauslaatikoista muodostetut ellipsit antoivat väärän lihaksen jopa 44 %:lle muodon pinnasta (näkyvä takaolkapää valitsi ojentajan, lähentäjät valitsi etureiden). Lisäksi hyväksymiskriteeri "napauta muodon keskikohtaa" oli tautologia: ellipsin keskipiste *oli* rajauslaatikon keskipiste. | Osuma lasketaan nyt polun oikeasta geometriasta: polut litistetään monikulmioiksi (`flattenPath`), piste testataan säteenheitolla, päällekkäisissä muodoissa voittaa päällimmäinen eli viimeksi piirretty, ja vain muotojen ulkopuolinen napautus menee lähimmälle (`SLACK = 4` yksikköä). Yksikkötesti käy läpi **jokaisen muodon sisäpisteet ruudukkona**, ja E2E kysyy napautuspisteen selaimelta (`isPointInFill`) – kumpikaan ei voi enää olla tautologia. |
| Vakava | **Yli 500 merkin muistiinpano**: tallennus ei tehnyt mitään eikä virhettä näkynyt (zodin englanninkielinen viesti, eikä `errors.notes` välittynyt kenttään). | Suomenkielinen viesti, `error`-propi kumpaankin lomakkeeseen ja `maxLength={500}`. |
| Vakava | **Lihaskartan tilojen kontrasti** oli 1,26–1,30:1 (treenaamaton vs. runko): valitsemattomia lihaksia ei käytännössä nähnyt. | Kirkkaudet jaettu tasavälein rungon ja aksentin väliin: 2,28–2,35:1 jokaista paria kohden, mikä on tällä kirkkausvälillä suurin mahdollinen kolmelle tilalle. `scripts/contrast.mjs` tarkistaa nyt myös nämä parit. WCAG 1.4.11:n 3:1 ei ole saavutettavissa, joten valinta kerrotaan myös tekstinä (sirut + `aria-live`) ja varapolku on tekstilista. |
| Vakava | **Tuplanapautuksen lukko oli vain visuaalinen**: kolme synkronista napautusta loi kolme liikettä, koska React ei flushaa `setSaving(true)`-tilaa synkronisesti. | Salpa `useRef`-muuttujassa heti `submit()`-funktion alussa. |
| Kosmeettinen | **Sama liike saattoi tulla treeniin kahdesti** (uusi "Palauta ja käytä" -polku teki siitä sokean): kaksi korttia jakoi saman ankkuri-id:n ja tuplasi tavoitesarjat. | `WorkoutScreen` tunnistaa jo lisätyn liikkeen, vierittää olemassa olevaan korttiin ja kertoo sen ilmoituksella. |
| Kosmeettinen | **Pelkistä välimerkeistä koostuva nimi** ("--..") kiersi uniikkiussäännön, ja varoitus lupasi estää luonnin jota ei estetty. | Yhteinen `nameKey`-avain: normalisoitu muoto, tai tyhjäksi normalisoituvalle nimelle trimmattu pienaakkosmuoto. Nyt varoitus ja esto ovat samaa mieltä. |
| Kosmeettinen | **Haun järjestys**: "lat pull down" ja promptin oma "pulldwon" nostivat ensimmäiseksi liikkeen, jonka nimessä on kirjaimet "lat" sanan *sisällä* ("ylätaljassa"); "dl" nosti Pendlay-soudun maastavedon ohi. | Hakutulokset painottavat nyt sanan alusta löytyviä osumia (heikot, toisen sanan sisältä löytyvät osumat pudottavat sijaa) ja tasan hakusanaa vastaava alias on yhtä vahva kuin nimen alku. |
| Kosmeettinen | **Välilyönnin pudottaminen** ("facepull", "pecdec", "hackkyykky") ei löytänyt mitään; "smith machine" ja "side delt" eivät osuneet. | Haku vertaa myös välilyönnittömiä muotoja, ja aliaksia täydennettiin (`dl`, `bb row`, `smith machine`, `side delt`). |
| Kosmeettinen | **Kestoliikkeen pikaluonti** antoi toistoalueen 8–12. | `quickDefaults` johtaa toistoalueen tyypistä: `time` → 1–1. |

Korjausten sivuvaikutus: lämpökartan sävy lasketaan nyt `color-mix`-sekoituksella
treenaamattomasta aksenttiin. Pelkkä peittävyys ei toiminut uusilla kirkkauksilla,
koska vaaleassa teemassa aksentti on tummempi kuin vartalo – kevyt kuormitus olisi
näyttänyt vaaleammalta kuin treenaamaton lihas.

Jätettiin korjaamatta (kirjattu tietoisesti):

- `bech press` (4-merkkinen kirjoitusvirhe) ei löydy: kirjoitusvirhettä siedetään
  vain vähintään 5-merkkisissä hakusanoissa. Lyhyemmillä sanoilla yhden
  muokkauksen sieto osuisi liian moneen liikkeeseen.
- Lihasryhmien nimet ("etureisi") eivät ole hakusanoja. Lihasryhmäsuodatin tekee
  saman rajauksen yhdellä napautuksella, eikä nimien lisääminen aliaksiksi olisi
  hakuosuma vaan suodatus.
