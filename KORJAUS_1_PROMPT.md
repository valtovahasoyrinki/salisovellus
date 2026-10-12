# Salisovellus – korjauskierros 1: omat liikkeet ja laajempi liikekirjasto

> Tämä tiedosto on palautettu keskusteluun liitetystä tekstistä 12.10.2026. Alkuperäisestä
> liitteestä katkesi kymmenkunta kohtaa (tiedostopolku, pari taulukon solua ja muutama
> lauseen loppu); ne on täydennetty ja merkitty PLAN.md:n osioon "Korjauskierros 1 –
> täydennetyt kohdat". Sisältövaatimuksia ei ole muutettu.

## 1. Tehtävä

Versio 1.0 on valmis ja käytössä. Tällä kierroksella korjataan kolme asiaa:

1. **Oman liikkeen voi luoda mistä tahansa, myös kesken treenin.** Kirjoitan esim. "pec dec", valitsen lihakset ja liike on heti treenissäni. Treeni ei saa katketa: ei poistumista kirjausnäkymästä, lepoajastin jatkaa ja kaikki kirjattu säilyy.
2. **Lihakset valitaan napauttamalla lihaskarttaa** (ukkelia). Tekstilista jää varapoluksi.
3. **Liikekirjastoa laajennetaan** suosituilla puuttuvilla liikkeillä, ja haku löytää liikkeet myös englanninkielisillä ja salislangin nimillä.

Olet tiiminvetäjä. Käytä neljän agentin tiimiä (Architect, Coder, Tester, Manager) samaan tapaan kuin 1.0:ssa. Noudata `CLAUDE.md`:n sääntöjä ja konventioita kaikessa.

## 2. Lähtötilanne (testattu 11.10.2026, commit `3fafee8`)

Kaikki laatuportit menevät läpi: typecheck, lint, 232 yksikkötestiä, 34 E2E-testiä (iPhone 12 + Pixel 5) ja build. Tutkivassa testauksessa löytyi seuraavaa:

- **Oma liike onnistuu vain liikekirjastosta.** `ExerciseLibraryScreen` → "Uusi liike" → `ExerciseForm`. Treenin "Lisää liike" -paneelissa (`WorkoutScreen` → `ExercisePicker`) ei ole luontipainiketta. Tyhjä haku näyttää vain tekstin "Kokeile toista hakusanaa tai luo uusi liike kirjastossa." Kesken treenin pitäisi siis poistua kirjausnäkymästä. Sama puute on ohjelman päivänäkymässä (`DayScreen`) ja käyttöönotossa (`OnboardingScreen`).
- **Haku ei tunne salinimiä.** Nämä hakusanat antavat 0 osumaa, vaikka liike on kirjastossa: "pec dec", "pec", "peck deck", "butterfly" (= Vipunosto rintaliikelaitteessa), "lat pulldown" (= Ylätalja), "face pull" (= Kasvoveto taljassa), "hip thrust" (= Lantionnosto tangolla), "rdl" (= Romanialainen maastaveto) ja "leg press" (= Jalkaprässi). Haku on pelkkä nimen alimerkkijonovertailu (`filterExercises` tiedostossa `exerciseRepo.ts`). Tällä hetkellä "pec dec" -hakuni päättyisi siis kaksoiskappaleeseen jo olemassa olevasta liikkeestä.
- **Lihasvalinta on 18 sirun rivi kahdesti** (ensisijaiset ja toissijaiset) ja lomake on pitkä. `MuscleMap` on vain näyttökomponentti. Kaikki 18 `MuscleId`:tä on kuitenkin piirretty `bodyPaths.ts`:ään omina polkuinaan (`data-muscle`), joten kartasta saa tehtyä napautettavan.
- **Uudet kirjastoliikkeet eivät päätyisi puhelimeeni.** `seedExerciseLibrary()` lisää kirjaston vain, kun `exercises`-taulu on tyhjä. Pelkkä lisäys tiedostoon `exercises.ts` ei siis näy olemassa olevassa asennuksessa.
- Kirjastossa on nyt 79 liikettä. Välineet ovat lukittu joukko (`barbell, dumbbell, machine, cable, bodyweight, other`).

## 3. Vaatimukset

### 3.1 Haku: aliakset ja sietävä vertailu
- Lisää `Exercise`-tyyppiin valinnainen kenttä `aliases?: string[]` (hakusanat, ei näytetä nimenä). Tämä on sopimusmuutos: noudata `CLAUDE.md`:n sääntöä 5 (uusi `db.version(n)` + migraatiotesti). Kenttää ei indeksoida. Varmuuskopion zod-skeema hyväksyy kentän valinnaisena, ja vanhat varmuuskopiot ilman sitä tuodaan virheettä.
- Uusi puhdas hakufunktio tiedostoon `src/domain/exerciseSearch.ts` testeineen:
  - Normalisointi molemmille puolille: pienet kirjaimet (`fi`), ä→a, ö→o, å→a, väliviivat, pisteet, heittomerkit ja ylimääräiset välilyönnit pois. Näin "kasipaino" löytää "Käsipaino" ja "hack kyykky" löytää "Hack-kyykky".
  - Haku jaetaan sanoiksi. Jokaisen sanan on löydyttävä nimestä tai aliaksista ("pec dec" → aliaksesta "pec deck").
  - Vähintään 5-merkkisissä sanoissa sallitaan yksi kirjoitusvirhe (esim. "pulldwon").
  - Järjestys: nimi alkaa hakusanalla → nimi sisältää → osuma vain aliakseen → kirjoitusvirheosuma. Saman tason sisällä aakkosjärjestys (`fi`).
  - Jos osuma tuli aliaksesta, rivin alaotsikossa näkyy "myös: pec deck", jotta ymmärrän miksi liike löytyi.
- `ExercisePicker` ja `ExerciseLibraryScreen` käyttävät samaa hakufunktiota. Lisää nykyiselle liikkeelle ja kaikille uusille liikkeille englanninkieliset nimet ja yleiset salinimet aliaksiksi. Esimerkkejä nykyisille liikkeille:

| Liike | Aliakset (vähintään) |
|---|---|
| Penkkipunnerrus | bench, bench press, penkki |
| Vipunosto rintaliikelaitteessa | pec deck, pec dec, peck deck, butterfly, pec fly, rintaliikelaite |
| Ristikkäistalja | cable fly, cable crossover, crossover |
| Ylätalja | lat pulldown, pulldown, ylätaljaveto |
| Alatalja | seated cable row, cable row |
| Kulmasoutu | barbell row, bent over row |
| Leuanveto | pull up, pullup, leuka |
| Pystypunnerrus | ohp, overhead press, military press |
| Sivunostot käsipainoilla | lateral raise, side raise |
| Vipunosto taakse kumarassa | rear delt fly, reverse fly |
| Takaolkapää laitteessa | reverse pec deck, rear delt machine |
| Kasvoveto taljassa | face pull |
| Ojentajapunnerrus taljassa | pushdown, triceps pushdown |
| Ranskalainen punnerrus | skull crusher, lying triceps extension |
| Hauiskääntö Scott-penkissä | preacher curl, scott curl |
| Takakyykky | squat, back squat, kyykky |
| Romanialainen maastaveto | rdl, romanian deadlift |
| Jalkaprässi | leg press |
| Bulgarialainen askelkyykky | bulgarian split squat, bss |
| Lantionnosto tangolla | hip thrust |
| Jalkojen ojennus laitteessa | leg extension |
| Jalkojen koukistus laitteessa | leg curl, lying leg curl |
| Lonkan loitonnus laitteessa | hip abduction, abductor |
| Lähentäjälaite | adductor, hip adduction |
| Pohjenousu seisten | calf raise, standing calf raise |
| Selän ojennus penkissä | back extension, hyperextension, 45 |
| Farmarikanto | farmers walk, farmer carry |

Muille nykyisille liikkeille vastaavat (esim. Arnold press, t-bar row, shrug, hammer curl, close grip bench, dips, good morning, ab wheel, plank).

### 3.2 Liikekirjaston laajennus
Lisää alla olevat liikkeet tiedostoon `src/db/seed/exercises.ts` samoilla oletusperiaatteilla kuin nykyiset (painonlisäys, lepo ja toistoalue tiedoston alun kommentin mukaan). Lihasjaot ovat lähtökohta; korjaa, jos tiedät paremmin, ja kirjaa muutos PLAN.md:hen. Välinejoukkoa ei muuteta: Smith-laite = `machine` (ja alias "smith"), kahvakuula = `other`.

| Nimi | Aliakset | Ensisijaiset | Toissijaiset | Väline | Tyyppi |
|---|---|---|---|---|---|
| Vipunosto käsipainoilla | dumbbell fly, db fly | chest | front_delts | dumbbell | weight_reps |
| Vinopenkkivipunosto käsipainoilla | incline dumbbell fly | chest | front_delts | dumbbell | weight_reps |
| Ristikkäistalja alhaalta ylös | low to high cable fly | chest | front_delts | cable | weight_reps |
| Penkkipunnerrus Smith-laitteessa | smith bench, smith | chest | front_delts, triceps | machine | weight_reps |
| Vinopenkkipunnerrus Smith-laitteessa | smith incline, smith | chest, front_delts | triceps | machine | weight_reps |
| Alaviistopenkkipunnerrus | decline bench | chest | triceps | barbell | weight_reps |
| Vinorintaprässi laitteessa | incline chest press machine | chest, front_delts | triceps | machine | weight_reps |
| Rintatuettu soutu | chest supported row, seal row | upper_back, lats | rear_delts, biceps | dumbbell | weight_reps |
| Ylätalja laitteessa | machine pulldown, iso lateral pulldown | lats | biceps, upper_back | machine | weight_reps |
| Yhden käden alatalja | single arm cable row | lats, upper_back | biceps | cable | weight_reps |
| Pendlay-soutu | pendlay row | upper_back, lats | rear_delts, lower_back | barbell | weight_reps |
| Räkkiveto | rack pull | upper_back, glutes | traps, hamstrings, lower_back | barbell | weight_reps |
| Pystysoutu | upright row | side_delts, traps | biceps | barbell | weight_reps |
| Sivunosto laitteessa | lateral raise machine | side_delts | – | machine | weight_reps |
| Pystypunnerrus Smith-laitteessa | smith shoulder press, smith | front_delts | side_delts, triceps | machine | weight_reps |
| Landmine-punnerrus | landmine press | front_delts, chest | triceps | barbell | weight_reps |
| Takaolkapää ristikkäistaljassa | reverse cable fly, rear delt cable fly | rear_delts | upper_back | cable | weight_reps |
| Hauiskääntö EZ-tangolla | ez curl, ez bar curl | biceps | forearms | barbell | weight_reps |
| Hauiskääntö vinopenkillä | incline curl, incline dumbbell curl | biceps | – | dumbbell | weight_reps |
| Keskittynyt hauiskääntö | concentration curl | biceps | – | dumbbell | weight_reps |
| Vasarakääntö köydellä | rope hammer curl, cable hammer curl | biceps, forearms | – | cable | weight_reps |
| Hauiskääntö laitteessa | biceps machine, machine preacher curl | biceps | – | machine | weight_reps |
| Käänteinen hauiskääntö | reverse curl | forearms | biceps | barbell | weight_reps |
| Ranteen ojennus tangolla | wrist extension, reverse wrist curl | forearms | – | barbell | weight_reps |
| Ojentajapunnerrus köydellä | rope pushdown | triceps | – | cable | weight_reps |
| Ojentajan ojennus kumarassa | kickback, triceps kickback | triceps | – | dumbbell | weight_reps |
| Ojentajalaite | triceps machine, dip machine | triceps | chest | machine | weight_reps |
| Kyykky Smith-laitteessa | smith squat, smith | quads, glutes | hamstrings | machine | weight_reps |
| Sumomaastaveto | sumo deadlift | glutes, quads, adductors | hamstrings, lower_back | barbell | weight_reps |
| Trap bar -maastaveto | trap bar deadlift, hex bar | quads, glutes | hamstrings, upper_back, traps | other | weight_reps |
| Pendulum-kyykky | pendulum squat | quads | glutes | machine | weight_reps |
| Yhden jalan jalkaprässi | single leg press | quads, glutes | – | machine | weight_reps |
| Kävelevä askelkyykky | walking lunge | quads, glutes | hamstrings, adductors | dumbbell | weight_reps |
| Takaperin askelkyykky | reverse lunge | quads, glutes | hamstrings | dumbbell | weight_reps |
| Lantionnosto laitteessa | hip thrust machine, glute drive | glutes | hamstrings | machine | weight_reps |
| Pakarasilta | glute bridge | glutes | hamstrings | bodyweight | bodyweight |
| Seisova jalkojen koukistus | standing leg curl | hamstrings | – | machine | weight_reps |
| Nordic-takareisi | nordic curl, nordic hamstring curl | hamstrings | – | bodyweight | bodyweight |
| Kahvakuulaheilautus | kettlebell swing, kb swing | glutes, hamstrings | lower_back | other | weight_reps |
| Aasipohje | donkey calf raise | calves | – | machine | weight_reps |
| Pohjenousu Smith-laitteessa | smith calf raise, smith | calves | – | machine | weight_reps |
| Polvennosto riippuen | hanging knee raise | abs | obliques | bodyweight | bodyweight |
| Polvennosto dippitelineessä | captains chair, knee raise | abs | – | bodyweight | bodyweight |
| Vatsalaite | ab crunch machine, ab machine | abs | – | machine | weight_reps |
| Pallof-punnerrus | pallof press | obliques, abs | – | cable | weight_reps |
| Venäläinen kierto | russian twist | obliques | abs | other | weight_reps |
| Istumaannousu vinolaudalla | decline sit up, sit up | abs | – | bodyweight | bodyweight |

Tarkista ennen lisäystä, ettei mikään ole jo kirjastossa toisella nimellä. Jos on, lisää uusi nimi vanhan liikkeen aliakseksi äläkä luo kaksoiskappaletta.

### 3.3 Kirjaston päivitys olemassa olevaan asennukseen
- Korvaa kertaluonteinen `seedExerciseLibrary()` idempotentilla `syncExerciseLibrary()`-funktiolla, jota kutsutaan käynnistyksessä (`bootstrap.ts`). Kirjaston versio tallennetaan `meta`-tauluun (esim. `libraryVersion`), ja liikkeet merkitään siemendatassa sen kirjastoversion mukaan, jossa ne tulivat (v1 = nykyiset 79, v2 = tämän kierroksen lisäykset).
- Säännöt:
  - Tyhjä tietokanta: koko kirjasto kerralla, kuten nyt.
  - Vanha asennus (v1): lisätään vain v2-liikkeet. Ohitetaan liike, jonka normalisoitu nimi on jo olemassa (myös arkistoitu tai oma liike). Näin oma "Pec dec" -liikkeeni ei saa rinnalleen kaksoiskappaletta.
  - Aliakset täytetään kirjastoliikkeille (`isCustom: false`) nimen perusteella, jos niillä ei vielä ole aliaksia. Käyttäjän muokkaamaa nimeä tai muita kenttiä ei kosketa.
  - Poistettua kirjastoliikettä ei palauteta, eikä arkistoitua palauteta aktiiviseksi.
  - Ajo kahdesti peräkkäin ei muuta mitään.
- Varmuuskopion "korvaa"-tuonnin jälkeen ajetaan sama synkronointi.

### 3.4 Lihaskarttavalitsin (`MuscleSelector`)
Uusi komponentti `src/components/MuscleMap/MuscleSelector.tsx`, joka käyttää samoja `bodyPaths`-muotoja ja tokeneita kuin `MuscleMap`. Tämä on tärkein design-työ tällä kierroksella: lue frontend-design-skill ennen aloitusta.

- Yksi näkymä kerrallaan isona (`SegmentedControl`: "Edestä" / "Takaa"), jotta pienetkin lihakset (kyynärvarsi, vinot vatsalihakset, lähentäjät, takaolkapää) osuvat sormeen 360 px leveällä ruudulla.
- Napautus kiertää tilaa: ei valittu → ensisijainen → toissijainen → ei valittu. Värit: ensisijainen `--accent`, toissijainen `--muscle-secondary`, muu `--muscle-idle`. Selite kartan alla. Kevyt haptinen palaute Androidilla (`src/lib/haptics.ts`).
- Kosketusalue suuremmaksi kuin näkyvä muoto (läpinäkyvä leveä stroke tai erilliset osumapolut). Peilatun puolen napautus valitsee saman lihaksen.
- Kartan alla valitut lihakset siruina tekstinä ("Rinta · ensisijainen") ja poistomahdollisuus.
- **Varapolku tekstinä:** "Valitse listasta" -kohta avaa nykyiset sirurivit (ensisijaiset / toissijaiset). Tämä on myös ruudunlukijapolku. Sääntö "sama lihas ei voi olla sekä ensisijainen että toissijainen" säilyy.
- Hyväksymiskriteeri: Playwright napauttaa jokaisen 18 lihaksen muodon keskikohtaa 360×800- ja 390×844-koossa, ja oikea lihas valitaan joka kerta. Jos jokin lihas ei osu luotettavasti, kosketusaluetta korjataan. Lihasta ei hylätä kartalta.
- Valitsin korvaa sirurivit myös kirjaston "Uusi liike"- ja "Muokkaa"-lomakkeissa (`ExerciseForm`).

### 3.5 Pikaluonti kaikkialla, missä liike valitaan
- `ExercisePicker` saa propin `onCreate`. Kun se on annettu:
  - Kun haussa on tekstiä, tulosten viimeisenä rivinä on aina "+ Luo uusi liike: ”pec dec”", myös silloin kun osumia löytyy. Tyhjässä tilassa sama toiminto on ensisijainen painike.
  - Painike avaa pikalomakkeen samassa paneelissa (sisältö vaihtuu, takaisin-nuoli palaa hakuun hakusana tallessa). Reitti ei vaihdu.
- **Pikalomake** (uusi komponentti `QuickExerciseForm`, jakaa validoinnin `exerciseSchema.ts`:n kanssa):
  - Näkyvissä vain: **Nimi** (esitäytetty hakusanasta, ensimmäinen kirjain isolla), **Lihakset** (`MuscleSelector`) ja **Väline** (sirut).
  - "Lisäasetukset" (`Collapsible`, oletuksena kiinni): tyyppi, painonlisäys, lepo, toistoalue ja muistiinpano. Oletukset johdetaan: painonlisäys `settings.increments[väline]`, lepo `settings.defaultRestSec`, toistot 8–12 ja tyyppi `bodyweight`, jos väline on kehonpaino, muuten `weight_reps`.
  - Pakolliset: nimi ja vähintään yksi ensisijainen lihas. Virheet suomeksi kentän alla.
  - **Kaksoiskappalevaroitus:** jos nimi osuu hakufunktiolla olemassa olevan liikkeen nimeen tai aliakseen, lomakkeessa näkyy "Kirjastossa on jo: Vipunosto rintaliikelaitteessa" ja painikkeet "Käytä tätä" sekä "Luo silti". Täsmälleen samaa nimeä ei voi luoda (nykyinen sääntö säilyy).
  - Tallennuspainike on alhaalla peukalon ulottuvilla. Teksti kertoo, mitä tapahtuu: treenissä "Luo ja lisää treeniin", päivänäkymässä "Luo ja lisää päivään".
  - Tuplanapautus ei saa luoda kahta liikettä (painike lukittuu tallennuksen ajaksi).
- **Treenin aikana** (`WorkoutScreen`):
  - Luotu liike lisätään heti treeniin `addExerciseToSession`-funktiolla. Jos "Lisää myös ohjelmaan" on päällä, se lisätään myös ohjelman päivään (kuten valitulle liikkeelle nyt).
  - Paneeli sulkeutuu, näkymä vierittää uuteen liikekorttiin ja ilmoitus kertoo "Pec dec luotu ja lisätty treeniin".
  - Aktiivinen treeni, kirjatut sarjat ja käynnissä oleva lepoajastin pysyvät koskemattomina. Jos suljen paneelin kesken lomakkeen, mitään ei luoda.
  - Ei mitään, mikä hidastaa sarjan kirjaamista (`CLAUDE.md` sääntö 6).
- Sama pikaluonti `DayScreen`- ja `OnboardingScreen`-valitsimiin: luotu liike lisätään kyseiseen päivään.
- Luotu liike on tavallinen oma liike (`isCustom: true`): se näkyy kirjastossa, ja sitä voi myöhemmin muokata, arkistoida ja yhdistää (merge) kuten muitakin.

## 4. Testit

Yksikkötestit (`describe`/`it` suomeksi):
- `exerciseSearch`: normalisointi (ä/ö, väliviiva, välilyönnit), monisanahaku, alias-osuma, kirjoitusvirhe, järjestys ja se, että lähtötilanteen nollaosumahaut löytävät oikean liikkeen.
- Siemendata: jokaisella liikkeellä on kelvolliset lihakset, nimet ovat uniikkeja (normalisoituna), alias ei ole toisen liikkeen nimi, ja kaikki kentät ovat kelvollisia.
- `syncExerciseLibrary`: tyhjä kanta, v1-kanta käyttäjän datalla, nimitörmäys omaan liikkeeseen, poistettu ja arkistoitu kirjastoliike, idempotenssi (kaksi ajoa) ja tuonti + synkronointi.
- Migraatio v1 → v2 oikealla datalla: sessiot, sarjat ja ohjelma säilyvät identtisinä.
- Varmuuskopio: edestakainen vienti ja tuonti aliasten kanssa, ja vanha varmuuskopio ilman aliaksia.
- Pikalomakkeen validointi ja johdetut oletukset välineen mukaan.

E2E (molemmat profiilit):
- Kesken treenin: kuittaa sarja → "Lisää liike" → hae "pec dec" → "Vipunosto rintaliikelaitteessa" löytyy.
- Kesken treenin: hae nimi, jota ei ole → "Luo uusi liike" → napauta lihakset kartalta → valitse väline → "Luo ja lisää treeniin" → kortti näkyy treenissä → kirjaa sarja → sivun päivitys → löytyy kirjastosta.
- Sama "Lisää myös ohjelmaan" päällä → liike on ohjelman päivässä.
- Kaksoiskappalevaroitus "pec deck" -nimellä → "Käytä tätä" lisää olemassa olevan liikkeen.
- Kaikki 18 lihasta valittavissa kartalta (osio 3.4) ja listasta.
- Päivänäkymän pikaluonti.
- Offline: pikaluonti toimii service workerin varassa ilman verkkoa.

Tester-agentin erityiset rikkomisyritykset: tuplanapautus tallennuksessa, 60-merkkinen nimi, pelkät välilyönnit, Escape tai paluuele kesken lomakkeen, luonti lepoajastimen ollessa käynnissä, sivun päivitys lomake auki, arkistoidun liikkeen nimi uudelle liikkeelle, tumma ja vaalea teema sekä 360 px leveys.

## 5. Työtapa ja vaiheet

1. **Architect:** lukee tämän, `CLAUDE.md`:n, `PLAN.md`:n ja `docs/SPEC.md`:n. Lisää `PLAN.md`:hen osion "Korjauskierros 1" (tietomallimuutos, migraatio, komponentit, työpaketit ja hyväksymiskriteerit) ja päivittää `docs/SPEC.md`:n kohdat §6.1–§6.3. Kysy minulta vain se, mikä oikeasti estää etenemisen; muuten tee oletus ja kirjaa se. Näytä tiivis suunnitelma ja odota hyväksyntääni.
2. **Vaihe A – data ja haku:** tyyppi, `db.version(2)`, siemendata (aliakset ja uudet liikkeet), `syncExerciseLibrary`, `exerciseSearch` ja varmuuskopio. Testit.
3. **Vaihe B – `MuscleSelector`:** komponentti, galleriaan (`/#/dev/gallery`) ja kosketustesti.
4. **Vaihe C – pikaluonti:** `QuickExerciseForm`, `ExercisePicker.onCreate`, treeni-, päivä- ja käyttöönottopolut sekä `ExerciseForm` valitsimella.
5. **Vaihe D – laatu:** E2E, kuvakaappaukset 360×800 ja 390×844 molemmilla teemoilla (valitsin hakutuloksineen ja luontirivi, pikalomake, kartta edestä ja takaa, kaksoiskappalevaroitus, treeni uuden liikkeen jälkeen), Lighthouse-tarkistus (ei saa laskea 1.0:sta) sekä README:n testimäärät.
6. **Manager:** vertaa suunnitelmaa, toteutusta ja Testerin löydöksiä tähän promptiin, nostaa 1–3 tärkeintä puutetta ja antaa ship-päätöksen.

A ja B voivat kulkea rinnakkain (eri tiedostot). C riippuu molemmista.

Laatuportti jokaisen vaiheen lopussa: `npm run typecheck && npm run lint && npm run test && npm run test:e2e && npm run build` ja kuvakaappausten tarkistus. Vähintään yksi commit per vaihe. Nosta `package.json`-versio lopuksi 1.1.0:aan.

## 6. Rajaukset – älä tee

- Älä muuta välinejoukkoa (`Equipment`) tai lihasjoukkoa (`MuscleId`).
- Älä muuta menneitä sessioita tai sarjoja (historia on pyhä).
- Älä lisää verkkokutsuja, ulkoisia kuvia tai kielimallikutsuja. Aliakset ovat staattista dataa.
- Älä koske kirjausnäkymän sarjarivien toimintaan tämän kierroksen ulkopuolella.

## 7. Hyväksytyt lisäkorjaukset

(Ei vielä. Lisätään tähän, kun hyväksyn ehdotukset.)

## 8. Loppuraportti

Lyhyesti: mitä muuttui, montako liikettä kirjastossa on nyt, mitkä oletukset tehtiin, testimäärät ennen ja jälkeen, kuvakaappausten polut sekä mahdolliset avoimet asiat. Ei hehkutusta.
