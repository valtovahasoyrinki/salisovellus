# Salisovellus – toteutusohje Claude Codelle

> Käyttö: tämä tiedosto projektikansion juureen, Claude Code samaan kansioon ja viesti:
> "Lue SALISOVELLUS_PROMPT.md kokonaan ja toteuta sen mukaan."

## Täytä ennen aloitusta
- Puhelin: [iPhone 12]
- Aksenttiväri (valinnainen): [Harmaa]

---

## 1. Tehtävä

Rakenna minulle henkilökohtainen salitreenisovellus puhelimeen. Ydin on yksinkertainen: kirjaan sarjat (paino × toistot) nopeasti salilla, ja sovellus piirtää niistä kehityskäyrät ja analysoi kehitystä. Kaikki muu palvelee tätä. Tavoite: minun käytössäni parempi kuin yksikään kaupallinen salisovellus – nopeampi kirjata, selkeämpi analyysi, ei mitään turhaa.

Olet projektin pääarkkitehti ja tiiminvetäjä. Käytössäsi on neljän agentin tiimi. Sinä omistat arkkitehtuurin, yhteiset sopimukset ja lopullisen laadun; agentit tekevät rajattuja työpaketteja.

## 2. Käyttäjä ja käyttötilanne

Nämä ohjaavat jokaista suunnittelupäätöstä:

- Treenaan Push / Pull / Legs -jakoa noin 4 kertaa viikossa. Jako kiertää (Push → Pull → Legs → Push …), se ei ole sidottu viikonpäiviin.
- Tavoite on voima ja lihasmassa. Seuraan työsarjojen painoja ja toistoja.
- Käytän sovellusta salilla puhelimella: yksi käsi, hikiset sormet, sarjojen välissä 1–3 min, usein huono kenttä. Kirjaamisen pitää onnistua sekunneissa ja toimia täysin offline.
- Muokkaan ohjelmaa itse: lisään, poistan, järjestän ja vaihdan liikkeitä jokaisessa treenipäivässä.
- Analysoin dataa mielelläni. Haluan nähdä, kehitynkö, missä junnaan ja mitä pitäisi muuttaa.
- Pidän suorasta, tiukasta valmentajasävystä: lyhyttä ja faktapohjaista, ei hehkutusta eikä kliseitä.
- Käyttöliittymä suomeksi (fi-FI): desimaalipilkku, viikko alkaa maanantaista, päivämäärät muodossa "ma 12.10.", aikavyöhyke Europe/Helsinki, yksikkö kg.

## 3. Työtapa

### 3.1 Vaihe 0 – tee ennen yhtään koodiriviä
1. Lue tämä tiedosto kokonaan. Kopioi se tiedostoon `docs/SPEC.md`, jotta agentit voivat viitata siihen osioittain.
2. Lue jokaisen agentin määrittely kansiosta `.claude/agents/` (tarkista myös `~/.claude/agents/`): nimi, kuvaus, työkalut, malli. Jos agentteja on eri määrä kuin neljä tai roolit poikkeavat alla ehdotetusta, sopeuta jako ja kerro siitä.
3. Kirjoita `PLAN.md`: arkkitehtuuri, tietomalli, näkymälista, vaiheet ja jokaisen vaiheen työpaketit agenteittain (kuka, mitkä tiedostot/kansiot hän omistaa, hyväksymiskriteerit).
4. Luo `CLAUDE.md`: konventiot, komennot (dev, test, build, lint, e2e), kansiorakenne ja säännöt tuleville sessioille.
5. Kysy minulta vain asiat, jotka oikeasti estävät etenemisen (enintään 3). Muissa tee järkevä oletus ja kirjaa se PLAN.md:n Oletukset-osioon.
6. Näytä tiivis yhteenveto suunnitelmasta ja odota hyväksyntääni. Hyväksynnän jälkeen etene kaikki vaiheet loppuun itsenäisesti.

### 3.2 Agenttitiimin käyttö
- **Sopimukset ensin.** Ennen rinnakkaista työtä toteuta ja committaa itse yhteiset perustukset: domain-tyypit, tietokantaskeema, repositoriorajapinnat, design-tokenit, reititys ja sovelluksen runko. Agentit rakentavat näiden päälle eivätkä muuta niitä ilman hyväksyntääsi.
- Jaa työ agenttien omien kuvausten mukaan. Ehdotettu jako neljälle työvirralle – sovita agenttien vahvuuksiin:
  1. **Data ja laskenta:** tietokanta, migraatiot, repositoriot, analytiikkafunktiot (e1RM, ennätykset, trendit, progressio, junnaus), vienti/tuonti, yksikkötestit.
  2. **Kirjausnäkymä:** aktiivinen treeni, sarjarivit, lepoajastin, keskeneräisen treenin palautus, yhteenveto.
  3. **Analytiikka-UI:** kaaviot, liikekohtainen analyysi, yleiskatsaus, oivalluskortit, historia.
  4. **Design ja laatu:** design-järjestelmä, komponentit, animaatiot, SVG-ikonit ja lihaskartta, PWA/offline, saavutettavuus, E2E-testit ja visuaalinen tarkistus.
- Jokainen delegointi sisältää: tavoitteen, viittauksen SPEC.md:n osioihin, tiedostot joita agentti saa muokata, sopimukset joita se ei saa muuttaa, hyväksymiskriteerit sekä vaatimuksen ajaa tyyppitarkistus ja testit ennen raportointia.
- Kaksi agenttia ei muokkaa samaa tiedostoa samaan aikaan. Jos päällekkäisyyttä ei voi välttää, käytä erillisiä git worktreeitä ja yhdistä itse.
- Aja itsenäiset työpaketit rinnakkain, riippuvaiset peräkkäin.
- Tarkista jokaisen agentin tulos itse (lue diff), integroi, aja koko testisarja ja korjaa ennen seuraavaa vaihetta.
- Jos käytössä on frontend-design-skill tai vastaava, design-työtä tekevä lukee sen ennen design-järjestelmän tekoa.

### 3.3 Git ja laatuportit
- Git-repo alusta alkaen. Pienet, kuvaavat commitit; vähintään yksi commit per valmis vaihe.
- Vaihe on valmis vasta kun typecheck, lint, yksikkötestit, E2E-testit ja build menevät läpi, ja olet katsonut näkymistä kuvakaappaukset mobiilikoossa ja korjannut havaitut ongelmat.
- Ei TODO-kommentteja, kuollutta koodia eikä mock-dataa tuotantokoodissa.

## 4. Tekninen pohja

Päätökset perusteluineen. Saat poiketa, jos löydät selvästi paremman ratkaisun – perustele poikkeama PLAN.md:ssä.

- **Sovellustyyppi: PWA**, asennettava kotinäytölle. Toimii iPhonessa ja Androidissa ilman sovelluskauppaa, yksi koodipohja, ei palvelinta.
- **Stack:** Vite + React + TypeScript (strict). Käytä kirjastojen nykyisiä vakaita versioita ja tarkista ajankohtainen API dokumentaatiosta, älä muistinvaraisesti.
- **Tyylit:** Tailwind CSS, design-tokenit CSS-muuttujina.
- **Animaatiot:** Motion (ent. Framer Motion).
- **Tallennus:** IndexedDB Dexien kautta, reaktiiviset kyselyt (esim. `useLiveQuery`). Skeeman versiointi ja migraatiot alusta alkaen.
- **Kaaviot:** valitse mobiilissa sulavin vaihtoehto (esim. Recharts, visx tai omat SVG-kaaviot). Vaatimukset: kosketuksella toimiva tooltip, animoitu piirto, hyvä suorituskyky usean vuoden datalla.
- **Validointi:** zod tuonnille ja lomakkeille.
- **PWA:** vite-plugin-pwa tai vastaava. Kaikki assetit ja fontit precachetaan; sovellus käynnistyy lentotilassa.
- **Testit:** Vitest (logiikka) + Playwright (E2E mobiiliemulaatiolla, iPhone- ja Pixel-profiilit).
- Ei backendiä, ei käyttäjätilejä, ei ulkoisia API-kutsuja ajon aikana.
- Puhelintestaus kehityksen aikana: service worker vaatii HTTPS:n, joten paljas LAN-osoite ei riitä. Ehdota helpoin tapa (esim. preview-julkaisu tai HTTPS-tunneli).

Selainrajoitukset, jotka on huomioitava (iOS mahdollinen):
- Vibration API ei toimi iOS:ssä → haptiikka on lisä, ei ainoa palaute.
- Taustalla ajastimet pysähtyvät, eikä paikallisia ajastettuja ilmoituksia saa luotettavasti ilman push-palvelinta → lepoajastin perustuu tallennettuun loppuaikaleimaan, ei laskuriin, joten aika on oikein palattaessa.
- Screen Wake Lock treenin aikana, jos tuettu; hiljainen fallback muuten.
- Pyydä `navigator.storage.persist()` ja näytä tila asetuksissa.

## 5. Tietomalli (lähtökohta)

Toteuta tämän hengessä, tarkenna tarvittaessa.

- **Exercise:** id, nimi, ensisijaiset lihasryhmät, toissijaiset lihasryhmät, väline (tanko, käsipaino, laite, talja, kehonpaino, muu), tyyppi (`weight_reps` | `bodyweight` = lisäpaino, voi olla negatiivinen avustetuissa | `time`), painonlisäys (oletus 2,5 kg; pienliikkeille 1,25 kg tai oma), oletuslepo, oletustoistoalue, muistiinpanot, oma kuva (Blob, valinnainen), archived, createdAt.
- **Program:** id, nimi, aktiivinen.
- **WorkoutDay:** id, programId, nimi (esim. Push), järjestys, väri, ikoni.
- **DayExercise:** dayId, exerciseId, järjestys, tavoitesarjat, tavoitetoistoalue (esim. 6–10), lepoaika (ohittaa liikkeen oletuksen).
- **Session:** id, dayId (valinnainen), alkoi, päättyi, muistiinpano, tila (`active` | `done`).
- **SessionExercise:** sessionId, exerciseId, järjestys, muistiinpano.
- **SetEntry:** id, sessionExerciseId, järjestys, paino, toistot, kesto (time-tyypille), lämmittely (bool), RIR (valinnainen), completedAt.
- **Settings:** viikkotavoite (oletus 4), oletuspainonlisäykset, lepoajastimen oletukset ja ääni, teema, viikkosarjojen ohjealue, viimeisin varmuuskopio.

Periaatteet:
- **Historia on pyhä.** Ohjelman muokkaus ei koskaan muuta menneitä treenejä: sessio viittaa liikkeisiin, ei pohjaan. Liikkeen poisto ohjelmasta ei poista liikettä eikä historiaa.
- Liikkeen, jolla on historiaa, voi vain arkistoida. Pysyvä poisto vaatii vahvistuksen, joka kertoo tarkalleen mitä katoaa.
- Kaikki kirjaukset tallentuvat heti (autosave). Mitään ei menetetä, vaikka sovellus suljetaan kesken sarjan.

## 6. Toiminnot

### 6.1 Käyttöönotto
- Ensimmäisellä avauksella lyhyt käyttöönotto: valmiina ohjelma, jossa kolme treenipäivää nimillä Push, Pull ja Legs (nimet muokattavissa, päiviä voi lisätä ja poistaa).
- Jokaiseen päivään lisätään liikkeitä liikekirjastosta tai luodaan oma. Kirjastossa 120–130 yleistä salilikettä suomeksi (esim. penkkipunnerrus, vinopenkki käsipainoilla, pystypunnerrus, ylätalja, kulmasoutu, takakyykky, maastaveto, romanialainen maastaveto, jalkaprässi, pohjenousu), kullakin lihasryhmät, väline ja järkevät oletukset. Haku ja suodatus lihasryhmittäin. (Korjauskierros 1: kirjasto laajeni 78 → 125 liikkeeseen.)
- Kirjasto on versioitu: sovelluksen päivitys tuo uudet kirjastoliikkeet myös olemassa olevaan asennukseen, mutta ei palauta käyttäjän poistamia tai arkistoituja liikkeitä eikä luo kaksoiskappaletta samannimiselle omalle liikkeelle.
- Haku löytää liikkeen myös englanninkielisellä nimellä ja salislangilla ("pec dec", "lat pulldown", "rdl", "hip thrust"): liikkeillä on aliakset, vertailu sietää ääkköset, väliviivat ja yhden kirjoitusvirheen. Jos osuma tuli aliaksesta, rivi kertoo sen ("myös: pec deck").
- Käyttöönoton voi ohittaa ja tehdä myöhemmin.

### 6.2 Ohjelman ja liikkeiden hallinta
- Ohjelma-näkymä: treenipäivät korteittain. Päivän sisällä liikkeiden järjestys raahaamalla (iso tartuntakahva), lisäys, poisto ja vaihto.
- Liikkeelle päiväkohtaiset tavoitesarjat, toistoalue ja lepoaika.
- Liikekirjasto: haku, suodatus, muokkaus, arkistointi ja palautus, oma kuva kameralla tai galleriasta (pakataan esim. max 1000 px, tallennetaan IndexedDB:hen).
- **Oman liikkeen voi luoda joka paikasta, jossa liike valitaan** (käyttöönotto, ohjelman päivä ja kesken treenin): hakutulosten viimeisenä rivinä on aina "Luo uusi liike: ”hakusana”", ja pikalomake avautuu samaan paneeliin ilman näkymän vaihtoa. Pikalomakkeessa näkyvät vain nimi, lihakset ja väline; muut arvot johdetaan asetuksista ja välineestä ja ne löytyvät "Lisäasetukset"-osiosta. Jos nimi osuu olemassa olevan liikkeen nimeen tai aliakseen, lomake tarjoaa olemassa olevaa liikettä ("Käytä tätä") ennen uuden luomista ("Luo silti").
- **Lihakset valitaan napauttamalla lihaskarttaa:** yksi näkymä kerrallaan (edestä/takaa), napautus kiertää ei valittu → ensisijainen → toissijainen → ei valittu, ja valitut näkyvät siruina kartan alla. Tekstilista on varapolku ja ruudunlukijapolku. Sama valitsin on käytössä sekä pikalomakkeessa että kirjaston täydessä lomakkeessa.
- Liikkeiden yhdistäminen, jos sama liike on luotu kahdesti: historia siirtyy yhdelle liikkeelle.

### 6.3 Treenin kirjaus – sovelluksen tärkein näkymä
Optimoi nopeuden ja virheettömyyden mukaan. Tavoite: tavallisen sarjan kirjaus yhdellä napautuksella.

- Kotinäkymän pääpainike ehdottaa seuraavaa treeniä kierron mukaan. Muun päivän voi valita, ja tyhjän treenin voi aloittaa.
- Treeni avautuu päivän liikkeillä. Jokaisessa liikekortissa:
  - Edellisen kerran sarjat näkyvissä ("Viimeksi 80 × 8 · 80 × 8 · 80 × 7").
  - Sarjarivit esitäytetään edellisen kerran arvoilla tai progressioehdotuksella (6.6). Ehdotus näkyy selvästi mutta ei pakota.
  - Rivillä: paino (−/+ liikkeen painonlisäyksellä; napautus avaa numeronäppäimistön `inputmode="decimal"`, pilkku ja piste käyvät), toistot (−/+) ja kuittauspainike.
  - Kuittaus tallentaa sarjan, käynnistää lepoajastimen, tarkistaa ennätykset ja antaa palautteen (animaatio, haptiikka jos tuettu).
  - Vertailu edelliskertaan näkyy heti: "+2,5 kg" tai "+1 toisto" vihreällä, heikompi tulos neutraalisti.
  - Sarjan lisäys kopioi edellisen sarjan. Pyyhkäisy poistaa (kumoa-toiminnolla). Pitkä painallus merkitsee lämmittelysarjaksi; lämmittelyt eivät näy analyysissä.
  - Muistiinpano liikkeelle tälle kerralle.
- Liikkeiden järjestystä voi muuttaa kesken treenin, liikkeen voi ohittaa, ja liikkeen voi lisätä vain tähän kertaan tai myös ohjelmaan.
- **Uuden liikkeen voi luoda kesken treenin** poistumatta kirjausnäkymästä: luotu liike lisätään heti treeniin (ja halutessa ohjelman päivään), näkymä vierittää uuteen liikekorttiin, ja kirjatut sarjat sekä käynnissä oleva lepoajastin pysyvät koskemattomina.
- Tärkeimmät toiminnot ruudun alaosassa (yhden käden käyttö). Kosketusalueet vähintään 48 px. Painonumerot isoina ja tasalevyisinä (`tabular-nums`).
- Kesken jäänyt treeni palautuu, jos sovellus suljetaan tai päivitetään ("Jatka treeniä" -banneri).
- Ruutu pysyy päällä treenin aikana (Wake Lock, jos tuettu).
- Jälkikirjaus: unohtuneen treenin voi lisätä menneelle päivälle.

### 6.4 Lepoajastin
- Käynnistyy automaattisesti sarjan kuittauksesta. Kesto: päiväkohtainen asetus → liikkeen oletus → yleinen oletus.
- Kelluva elementti alareunassa koko treenin ajan: jäljellä oleva aika ja edistymisrengas. +15 s / −15 s / ohita.
- Perustuu loppuaikaleimaan, joten aika on oikein taustalta palatessa.
- Päättyessä selvä visuaalinen merkki, lyhyt ääni (asetuksista pois) ja värinä, jos tuettu.

### 6.5 Treenin päätös ja yhteenveto
- Yhteenveto: kesto, työsarjat, kokonaisvolyymi, vertailu saman päivän edelliseen kertaan, rikotut ennätykset ja liikekohtaiset muutokset.
- Ennätyksistä näyttävä mutta lyhyt juhlinta.
- Varoitus ennen päätöstä, jos jossain liikkeessä on kuittaamattomia sarjoja.

### 6.6 Laskenta – puhtaat funktiot, kattavat yksikkötestit
- **e1RM:** Epley `paino × (1 + toistot / 30)`, kun toistot 2–12. Toistot = 1 → e1RM = paino. Yli 12 toiston sarjoja ei käytetä e1RM-ennätyksiin (epätarkka), mutta ne näkyvät muissa mittareissa.
- **Työsarja** = ei-lämmittelysarja. Analyysi käyttää vain työsarjoja.
- **Volyymi** = Σ paino × toistot työsarjoista. Kehonpainoliikkeillä toistot ja lisäpaino erikseen.
- **Ennätystyypit liikkeittäin:** raskain paino, paras e1RM, eniten toistoja tietyllä painolla, suurin kertavolyymi.
- **Progressioehdotus (kaksoisprogressio):** jos edellisellä kerralla kaikki työsarjat saavuttivat toistoalueen ylärajan → ehdota painonlisäystä ja alarajan toistoja. Jos sarjat jäivät alarajan alle kahtena peräkkäisenä kertana → ehdota saman painon pitämistä tai noin 5–10 % kevennystä. Muuten sama paino, tavoite +1 toisto.
- **Trendi:** lineaarinen regressio e1RM:stä valitulla aikavälillä, ilmaistuna %/4 viikkoa. Näytetään vain, jos datapisteitä on vähintään 4.
- **Junnaus:** ei uutta e1RM-ennätystä viimeisellä 4 kerralla, ja ensimmäisestä näistä vähintään 3 viikkoa.
- **Viikkosarjat lihasryhmittäin:** ensisijainen lihasryhmä 1 sarja, toissijainen 0,5.
- **Kierto:** seuraava treenipäivä = viimeksi tehdyn päivän seuraaja ohjelman järjestyksessä.

### 6.7 Historia
- Treenit aikajärjestyksessä kuukausittain ryhmiteltynä. Avaus näyttää kaikki sarjat. Menneitä treenejä voi muokata ja poistaa (vahvistus).
- Kalenteri tai lämpökartta treenipäivistä.

### 6.8 Analyysi
**Liikekohtainen**
- Liikkeen valinta haulla, ryhmiteltynä treenipäivittäin.
- Iso kaavio, mittarin vaihto: e1RM (oletus), raskain sarja, kertavolyymi, parhaan sarjan toistot. Aikavälit 1 kk, 3 kk, 6 kk, 1 v, kaikki.
- Trendiviiva ja muutos-%, ennätykset merkittynä kaavioon. Pisteen napautus näyttää kerran kaikki sarjat.
- Ennätyslista ja "edellinen vs. paras" -vertailu.

**Yleiskatsaus**
- Viikkotavoitteen toteuma (oletus 4 treeniä/vko) ja putki (peräkkäiset viikot tavoitteessa).
- Viikkosarjat lihasryhmittäin pinottuna palkkikaaviona, ohjealue 10–20 työsarjaa/vko lihasryhmälle (muokattavissa).
- Push / Pull / Legs -tasapaino: volyymin jakauma.
- Tuoreimmat ennätykset.

### 6.9 Oivallukset (valmentaja)
Sääntöpohjainen moottori, toimii offline, ei kielimallikutsuja. Tuottaa 1–3 tärkeintä havaintoa kotinäkymään ja liikekohtaisesti analyysiin, prioriteettijärjestyksessä. Sävy suora ja lyhyt, numerot mukana, toimintaohje lopussa. Tyyliesimerkkejä:
- "Penkki: e1RM +4,1 % kuudessa viikossa. Pidä linja."
- "Maastaveto ei ole noussut neljään kertaan. Vaihda toistoalue tai kevennä viikko."
- "Pull-volyymi on 30 % pienempi kuin Push. Lisää selkäsarjoja."
- "Kolme treeniä tällä viikolla, tavoite neljä. Yksi puuttuu."

Ei emojeja, ei kehuja ilman dataa, ei samaa havaintoa päivästä toiseen ilman muutosta datassa.

### 6.10 Varmuuskopio, vienti ja tuonti
Data on vain puhelimessa, joten tämä on kriittinen osa, ei lisäominaisuus.
- Vienti JSON:na (kaikki data + skeemaversio) ja CSV:nä (sarjat litteänä taulukkona). Jako Web Share API:lla (esim. iCloudiin tai Driveen), fallbackina lataus.
- Tuonti JSON:sta: validointi, esikatselu ("X treeniä, Y liikettä"), valinta yhdistä vs. korvaa.
- Muistutus kotinäkymässä, jos viimeisestä varmuuskopiosta on yli 14 päivää.
- E2E-testi: vienti → tuonti säilyttää datan identtisenä.

### 6.11 Asetukset
Viikkotavoite, oletuspainonlisäykset, lepoajastimen oletukset ja ääni, teema (tumma oletuksena / vaalea / järjestelmä), viikkosarjojen ohjealue, tallennuksen pysyvyys, varmuuskopiot, kaiken datan poisto (kaksoisvahvistus).

## 7. Ulkoasu, animaatiot ja kuvat

Tavoite: näyttää ja tuntua premium-sovellukselta, ei geneeriseltä templatelta. Jokaisella visuaalisella valinnalla on syy.

- **Suunta:** tumma teema oletuksena (OLED-musta tausta, luettava salin valaistuksessa), yksi vahva aksenttiväri toiminnoille ja edistykselle, hillitty muu paletti. Vihreä = parannus, neutraali = ennallaan. Punaista vain poistoissa.
- **Typografia:** luettava sans-serif käyttöliittymään ja tasalevyisillä numeroilla toimiva fontti painoille ja ajoille. Fontit self-hostataan (offline).
- **Navigaatio:** alapalkki (Koti, Historia, Analyysi, Ohjelma). Kun treeni ei ole käynnissä, korostettu "Aloita treeni". iOS:n safe area -alueet huomioitu.
- **Animaatiot (Motion):**
  - Näkymäsiirtymät ja bottom sheetit jousifysiikalla.
  - Sarjan kuittauksessa tyydyttävä mikroanimaatio (rasti piirtyy, rivi värittyy).
  - Numeroiden muutokset rullaavat (painot, volyymit, yhteenveto).
  - Kaaviot piirtyvät sisään.
  - Ennätyksessä kipinä- tai konfettiefekti ja ennätysmerkki.
  - Vain `transform` ja `opacity`; 60 fps keskitason puhelimella; `prefers-reduced-motion` kunnioitettu.
- **Kuvat ja grafiikka:**
  - Ei netistä haettuja kuvia (tekijänoikeudet, offline). Oma yhtenäinen SVG-ikonisarja lihasryhmille ja välineille.
  - Lihaskartta: tyylitelty SVG-vartalo edestä ja takaa. Liikkeen ensisijaiset lihakset aksenttivärillä, toissijaiset haaleammin. Käytetään liikkeen tiedoissa ja viikon lämpökarttana (mitä lihaksia on treenattu tällä viikolla).
  - Oma kuva liikkeelle (6.2) näytetään kortissa ikonin sijaan.
  - Treenipäivillä oma väri ja ikoni.
  - Sovellusikoni (myös maskable) ja splash screen ilmeen mukaisina.
- **Tyhjät tilat:** selkeä ohje ja toimintopainike, ei pelkkää tyhjää ruutua.
- **Lataustilat:** skeletonit, ei spinneriä keskellä ruutua.

## 8. Laatuvaatimukset
- Käynnistys kotinäkymään alle 1 s asennettuna. Sarjan kuittaus tuntuu välittömältä (optimistinen UI).
- Suorituskyky testattu generoidulla datalla: 3 vuotta, noin 600 treeniä, noin 15 000 sarjaa. Kaaviot ja listat pysyvät sulavina.
- Lighthouse mobiili: Performance ja Accessibility ≥ 90.
- Saavutettavuus: kontrastit WCAG AA, painikkeille nimet ruudunlukijalle, järkevä fokusjärjestys.
- Yksikkötestit kaikille laskentafunktioille. Rajatapaukset: tyhjä historia, yksi sarja, pelkät lämmittelyt, kehonpainoliike, negatiivinen lisäpaino, viikonvaihde ja kesäaikasiirtymä Helsingin aikavyöhykkeellä.
- Migraatiotesti: vanhan skeeman data säilyy päivityksessä.
- E2E-polku mobiiliemulaatiolla: käyttöönotto → liikkeen lisäys → koko treenin kirjaus → sivun päivitys kesken treenin ja jatko → päätös ja yhteenveto → kaavio näkyy → vienti ja tuonti.
- Visuaalinen tarkistus: kuvakaappaus jokaisesta päänäkymästä koossa 390 × 844 ja 360 × 800, tummalla ja vaalealla teemalla. Katso kuvat ja korjaa asettelu-, kontrasti- ja ylivuotovirheet.

## 9. Vaiheet
Jokaisen vaiheen lopussa laatuportit (3.3) ja commit.

0. **Suunnittelu:** SPEC.md, PLAN.md, CLAUDE.md, agenttijako → odota hyväksyntää.
1. **Perusta (sinä itse):** projektipohja, tyypit, tietokanta ja migraatiot, repositoriot, design-tokenit, reititys, alapalkki, PWA-runko, testiympäristöt.
2. **Ohjelma ja liikkeet:** liikekirjasto, ohjelman hallinta, käyttöönotto. Rinnakkain: laskentamoduuli ja sen testit.
3. **Treenin kirjaus:** aktiivinen treeni, lepoajastin, palautus, yhteenveto, ennätysten tunnistus.
4. **Historia, analyysi ja oivallukset.**
5. **Viimeistely:** animaatiot, lihaskartta ja ikonit, ennätysjuhlinta, varmuuskopiot, suorituskyky testidatalla, saavutettavuus, sovellusikoni.
6. **Julkaisu:** valmistele julkaisu ilmaiseen HTTPS-hostingiin (esim. GitHub Pages, Cloudflare Pages tai Vercel) ja kirjoita README:hen vaiheittaiset ohjeet: julkaisu, asennus kotinäytölle iPhonessa ja Androidissa, varmuuskopiointi. Älä julkaise äläkä luo tilejä puolestani ilman lupaa.

## 10. Rajaukset – älä tee
- Ei käyttäjätilejä, backendiä, pilvisynkronointia, mainoksia eikä sosiaalisia ominaisuuksia.
- Ei kielimalli- tai muita ulkoisia API-kutsuja ajon aikana.
- Ei kalori-, ravinto- eikä kehonpainoseurantaa.
- Ei valmiita treeniohjelmia eikä ohjelmageneraattoria – ohjelman teen itse.
- Ei mitään, mikä hidastaa sarjan kirjaamista.

## 11. Loppuraportti
Kun kaikki on valmis, kerro lyhyesti:
- mitä rakennettiin ja miten käynnistän sen paikallisesti
- julkaisun ja kotinäytölle asennuksen ohjeet (myös README:ssä)
- tehdyt oletukset ja poikkeamat tästä ohjeesta
- tunnetut rajoitukset (erityisesti iOS)
- 3–5 seuraavaa parannusehdotusta perusteluineen
