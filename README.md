# Salisovellus

Henkilökohtainen salitreenipäiväkirja ja kehitysanalyysi. Asennettava PWA: toimii iPhonessa ja Androidissa kotinäytöltä, täysin offline, ilman tilejä ja ilman palvelinta. Kaikki data on omassa puhelimessa (IndexedDB).

Ydin: sarjojen kirjaus sekunneissa salilla → kehityskäyrät ja sääntöpohjainen analyysi.

## Käynnistys paikallisesti

Vaatii Node 22 tai uudemman.

```bash
npm install
npm run dev          # http://localhost:5173
```

Muut komennot:

```bash
npm run typecheck    # TypeScript strict
npm run lint         # oxlint
npm run test         # Vitest (logiikka)
npm run test:e2e     # Playwright, iPhone 12 + Pixel 5 -emulaatio
npm run build        # tuotantonippu dist/-kansioon
npm run preview      # tuotantonipun esikatselu portissa 4173
npm run screenshots  # kuvakaappaukset päänäkymistä (vaatii preview-palvelimen)
npm run icons        # rasteroi sovellusikonit public/icons/*.svg:stä
```

## Testaus puhelimella kehityksen aikana

Service worker vaatii HTTPS:n, joten paljas LAN-osoite (`http://192.168.x.x:5173`) ei riitä asennettavaan PWA:han. Kaksi tapaa:

1. **Pelkkä käyttöliittymätestaus:** `npm run dev:host` ja avaa LAN-osoite puhelimen selaimessa. Sovellus toimii, mutta ei asennu kotinäytölle eikä toimi offline.
2. **Täysi PWA-testaus:** julkaise HTTPS-osoitteeseen (ks. alla) ja avaa se puhelimella. Tämä on suositeltu tapa – julkaisu kestää noin minuutin.

## Julkaisu

### GitHub Pages (ilmainen, valmis työnkulku)

1. Luo GitHubiin tyhjä repo ja lisää se etäpisteeksi:
   ```bash
   git remote add origin git@github.com:<käyttäjä>/<repo>.git
   git push -u origin main
   ```
2. GitHubissa: **Settings → Pages → Source = GitHub Actions**.
3. Push `main`-haaraan käynnistää työnkulun `.github/workflows/deploy.yml`, joka ajaa laatuportit ja julkaisee.
4. Osoite on `https://<käyttäjä>.github.io/<repo>/`. Alipolku toimii automaattisesti: työnkulku asettaa `BASE_PATH`-muuttujan ja sovellus käyttää hash-reititystä.

### Cloudflare Pages tai Vercel

Yhdistä repo, aseta build-komennoksi `npm run build` ja julkaisukansioksi `dist`. Juuripolulla `BASE_PATH`-muuttujaa ei tarvita.

## Asennus kotinäytölle

**iPhone (Safari):** avaa sivu Safarissa → jakokuvake alareunassa → **Lisää Koti-valikkoon** → Lisää. Sovellus avautuu omana ikkunanaan ilman selainpalkkeja. Huom: asennuksen täytyy tapahtua Safarissa, ei Chromessa.

**Android (Chrome):** avaa sivu → valikko (⋮) → **Lisää aloitusnäyttöön** / **Asenna sovellus**.

Asennuksen jälkeen sovellus käynnistyy ja toimii ilman verkkoyhteyttä.

## Varmuuskopiointi

Data on vain puhelimessa. Selain voi poistaa tallennetun datan, jos tilaa loppuu, eikä iCloud-varmuuskopio kata IndexedDB:tä luotettavasti. Siksi:

- **Asetukset → Varmuuskopio → Vie JSON** tallentaa kaiken datan yhteen tiedostoon. iPhonella jaa se iCloud Driveen, Androidilla Driveen.
- Sovellus muistuttaa kotinäkymässä, jos viimeisestä varmuuskopiosta on yli 14 päivää.
- **Tuo JSON** validoi tiedoston, näyttää esikatselun (montako treeniä ja liikettä) ja kysyy, yhdistetäänkö vai korvataanko nykyinen data.
- **Vie CSV** tuottaa sarjat litteänä taulukkona taulukkolaskentaan.
- Sovellus pyytää selaimelta pysyvää tallennustilaa (`navigator.storage.persist()`); tila näkyy asetuksissa.

## Arkkitehtuuri lyhyesti

| Kerros | Vastuu |
|---|---|
| `src/domain/` | Puhdas laskenta: e1RM, ennätykset, volyymi, progressio, trendi, junnaus, viikkosarjat, kierto, oivallukset. Ei React- eikä tietokantariippuvuuksia. |
| `src/db/` | Dexie-skeema, versiointi ja migraatiot, repositoriot, liikekirjaston siemendata, varmuuskopiot. |
| `src/features/` | Näkymät: koti, kirjaus, historia, analyysi, ohjelma, liikekirjasto, asetukset. |
| `src/components/` | Jaetut primitiivit, kaaviot, ikonit, lihaskartta. |
| `src/app/` | Runko, reititys, providerit (teema, lepoajastin, ilmoitukset). |

Yksityiskohdat: [PLAN.md](PLAN.md). Vaatimukset: [docs/SPEC.md](docs/SPEC.md). Konventiot: [CLAUDE.md](CLAUDE.md).

## Tunnetut rajoitukset iOS:ssä

- **Ei värinää.** Vibration API puuttuu Safarista, joten haptiikka toimii vain Androidilla. Lepoajastimen loppu näytetään aina myös visuaalisesti ja äänellä.
- **Ei taustailmoituksia.** Lepoajastin perustuu tallennettuun loppuaikaleimaan, joten aika on oikein, kun sovellus palaa taustalta – mutta puhelin ei ilmoita ajastimen päättymisestä, jos sovellus ei ole näkyvissä.
- **Ruudun pitäminen päällä** vaatii Screen Wake Lock -tuen (iOS 16.4+). Vanhemmilla versioilla ruutu voi sammua treenin aikana.
- **Tallennuksen pysyvyys** on Safarin päätettävissä. Varmuuskopioi säännöllisesti.
